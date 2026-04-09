import { v4 as uuid } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { actionQueue, players } from '../db/schema.js'
import * as gameService from './game.service.js'
import * as playerService from './player.service.js'
import * as mapService from './map.service.js'
import * as outpostService from './outpost.service.js'
import { canTraverse, getAdjacentRegions } from '../engine/visibility.js'
import type { ActionType, ActionResult, Adjacency } from 'shared'
import * as akashaKeyService from './akasha-key.service.js'
import * as spiritService from './spirit.service.js'
import * as groupService from './group.service.js'

export function submitAction(
  roomId: string,
  playerId: string,
  actionType: ActionType,
  payload: Record<string, unknown>,
) {
  const db = getDb()
  const room = gameService.getRoom(roomId)
  if (!room) throw new Error('房间不存在')

  const player = playerService.getPlayer(playerId)
  if (!player) throw new Error('玩家不存在')
  if (player.actionPoints <= 0) throw new Error('行动点不足')

  const existing = db.select().from(actionQueue)
    .where(and(
      eq(actionQueue.roomId, roomId),
      eq(actionQueue.playerId, playerId),
      eq(actionQueue.turnNumber, room.turnNumber),
      eq(actionQueue.actionPointIndex, room.currentActionPointIndex),
    ))
    .get()

  if (existing) throw new Error('本行动点已提交过行动')

  const id = uuid()
  db.insert(actionQueue).values({
    id,
    roomId,
    playerId,
    turnNumber: room.turnNumber,
    actionPointIndex: room.currentActionPointIndex,
    actionType,
    payload: JSON.stringify(payload),
    status: 'pending',
    submittedAt: Date.now(),
  }).run()

  // 分头行动：不再自动复制行动给绑定玩家
  // Master 和 Servant 可以独立提交不同的行动
  // 但共享行动点（由组级别管理）

  return { id, actionType, payload }
}

export function getSubmissionStatus(roomId: string) {
  const room = gameService.getRoom(roomId)
  if (!room) return { allSubmitted: false, submitted: [], pending: [] }

  const nonGmPlayers = playerService.getNonGmPlayers(roomId)
  const db = getDb()
  const submissions = db.select().from(actionQueue)
    .where(and(
      eq(actionQueue.roomId, roomId),
      eq(actionQueue.turnNumber, room.turnNumber),
      eq(actionQueue.actionPointIndex, room.currentActionPointIndex),
    ))
    .all()

  const submittedIds = new Set(submissions.map(s => s.playerId))
  const submitted = nonGmPlayers.filter(p => submittedIds.has(p.id))
  const pending = nonGmPlayers.filter(p => !submittedIds.has(p.id))

  return {
    allSubmitted: pending.length === 0,
    submitted: submitted.map(p => ({ id: p.id, name: p.displayName })),
    pending: pending.map(p => ({ id: p.id, name: p.displayName })),
    actions: submissions.map(s => ({
      ...s,
      payload: JSON.parse(s.payload),
    })),
  }
}

/**
 * 结算行动 — 使用 ACTION_RESOLUTION_ORDER，支持全部11种行动类型
 * 规则书结算顺序: 侦查→据点移动→使用能力→阵地作成→相邻移动→指定移动→阵地破坏→残灵吸收→获取钥匙→注入魔力→跳过
 */
export function resolveActions(roomId: string, actionPointIndex: number): ActionResult[] {
  const room = gameService.getRoom(roomId)
  if (!room) return []

  const db = getDb()
  const submissions = db.select().from(actionQueue)
    .where(and(
      eq(actionQueue.roomId, roomId),
      eq(actionQueue.turnNumber, room.turnNumber),
      eq(actionQueue.actionPointIndex, actionPointIndex),
      eq(actionQueue.status, 'pending'),
    ))
    .all()
    .map(s => ({ ...s, payload: JSON.parse(s.payload) }))

  const adjacencyList = mapService.getRoomAdjacencies(roomId) as Adjacency[]
  const results: ActionResult[] = []

  // 使用规则书定义的结算顺序
  const order: ActionType[] = [
    'scout', 'move_to_outpost', 'use_ability', 'place_outpost',
    'move_adjacent', 'move_designated',
    'destroy_outpost', 'absorb_spirit', 'obtain_key', 'channel_magic',
    'skip', 'consume', 'declare_war',
  ]

  for (const actionType of order) {
    const batch = submissions.filter(s => s.actionType === actionType)

    for (const action of batch) {
      const player = playerService.getPlayer(action.playerId)
      if (!player) continue

      const result = resolveOneAction(roomId, action.playerId, actionType, action.payload, player, adjacencyList)
      results.push(result)

      // 扣减AP（宣战和跳过不消耗）
      const apCost = actionType === 'declare_war' || actionType === 'skip' ? 0 : 1
      if (apCost > 0) {
        playerService.updatePlayerStats(action.playerId, {
          actionPoints: Math.max(0, (player.actionPoints || 0) - apCost),
        })
      }

      db.update(actionQueue)
        .set({ status: 'executed', resolvedAt: Date.now() })
        .where(eq(actionQueue.id, action.id))
        .run()
    }
  }

  return results
}

function resolveOneAction(
  roomId: string,
  playerId: string,
  actionType: ActionType,
  payload: any,
  player: any,
  adjacencyList: Adjacency[],
): ActionResult {
  const r = (success: boolean, details: string, data?: Record<string, unknown>): ActionResult =>
    ({ playerId, actionType, success, details, data })

  switch (actionType) {
    case 'scout': {
      if (!player.regionId) return r(false, '不在任何区域')
      const adjacent = getAdjacentRegions(player.regionId, adjacencyList)
      const canScout = payload.targetRegionId === player.regionId || adjacent.includes(payload.targetRegionId)
      if (!canScout) return r(false, '目标不在侦查范围内')

      const playersInRegion = playerService.getRoomPlayers(roomId)
        .filter((p: any) => p.regionId === payload.targetRegionId && !p.isGm && p.id !== playerId)
        .map((p: any) => ({ id: p.id, name: p.displayName }))
      outpostService.discoverOutpostsInRegion(playerId, payload.targetRegionId, roomId)
      return r(true, `侦查到 ${playersInRegion.length} 名玩家`, { players: playersInRegion })
    }

    case 'move_adjacent': {
      if (!player.regionId || !canTraverse(player.regionId, payload.targetRegionId, adjacencyList)) {
        return r(false, '无法移动到该区域')
      }
      playerService.updatePlayerRegion(playerId, payload.targetRegionId)
      return r(true, '移动成功', { regionId: payload.targetRegionId })
    }

    case 'move_designated': {
      const region = mapService.getRegion(payload.targetRegionId)
      if (!region) return r(false, '目标区域不存在')
      // TODO: 验证地点牌并消耗
      playerService.updatePlayerRegion(playerId, payload.targetRegionId)
      return r(true, '指定移动成功', { regionId: payload.targetRegionId })
    }

    case 'move_to_outpost': {
      const outposts = outpostService.getPlayerOutposts(roomId, playerId)
      const target = outposts.find((o: any) => o.regionId === payload.targetRegionId)
      if (!target) return r(false, '该区域没有你的据点')
      playerService.updatePlayerRegion(playerId, payload.targetRegionId)
      return r(true, '据点移动成功', { regionId: payload.targetRegionId })
    }

    case 'place_outpost': {
      if (!player.regionId) return r(false, '不在任何区域')
      const newOutpost = outpostService.placeOutpost(roomId, playerId, player.regionId, player.color)
      const witnesses = playerService.getRoomPlayers(roomId)
        .filter((p: any) => p.regionId === player.regionId && !p.isGm && p.id !== playerId)
        .map((p: any) => p.id)
      outpostService.discoverOutpostForPlayersInRegion(newOutpost, player.displayName, witnesses)
      return r(true, '阵地作成成功')
    }

    case 'destroy_outpost': {
      if (!player.regionId) return r(false, '不在任何区域')
      if (player.regionId !== payload.targetRegionId) return r(false, '必须在目标区域')
      const outpost = outpostService.getOutpost(payload.targetOutpostId)
      if (!outpost || outpost.regionId !== payload.targetRegionId) return r(false, '目标阵地不存在')
      if (outpost.playerId === playerId) return r(false, '不能破坏自己的阵地')
      outpostService.destroyOutpost(payload.targetOutpostId)
      outpostService.clearKnownOutpost(playerId, payload.targetOutpostId)
      return r(true, '阵地破坏成功', { outpostId: payload.targetOutpostId })
    }

    case 'use_ability':
      // 技能使用在战斗外由行动点触发
      // 具体效果由 effect-pipeline 执行（需要技能ID查找效果链）
      return r(true, `使用能力: ${payload.abilityId}`, { abilityId: payload.abilityId })

    case 'absorb_spirit': {
      const group = groupService.getPlayerGroup(playerId)
      if (!group) return r(false, '你不属于任何组')

      // 检查是否是继续吸收
      const progress = spiritService.continueAbsorption(roomId, group.id)
      if (progress) {
        if (progress.complete) {
          return r(true, '残灵吸收完成！选择提升的属性', { spiritId: progress.spiritId, complete: true })
        }
        return r(true, `残灵吸收中 (${progress.apSpent}/3)`, { apSpent: progress.apSpent })
      }

      // 开始新的吸收
      if (!payload.spiritId || !player.regionId) return r(false, '需要指定残灵')
      const spirit = spiritService.getSpirit(roomId, payload.spiritId)
      if (!spirit || spirit.absorbed) return r(false, '残灵不存在或已被吸收')
      if (spirit.regionId !== player.regionId) return r(false, '残灵不在你的区域')

      spiritService.startAbsorption(roomId, group.id, payload.spiritId, player.regionId)
      return r(true, '开始残灵吸收 (1/3)', { apSpent: 1 })
    }

    case 'obtain_key': {
      const group = groupService.getPlayerGroup(playerId)
      if (!group) return r(false, '你不属于任何组')

      if (payload.action === 'pick_up') {
        if (!player.regionId) return r(false, '你不在任何区域')
        const pickResult = akashaKeyService.pickUpKey(roomId, group.id, player.regionId)
        if (!pickResult.success) return r(false, pickResult.error!)
        return r(true, '携带阿克夏之钥')
      } else {
        if (!player.regionId) return r(false, '你不在任何区域')
        const putResult = akashaKeyService.putDownKey(roomId, group.id, player.regionId)
        if (!putResult.success) return r(false, putResult.error!)
        return r(true, '放置阿克夏之钥')
      }
    }

    case 'channel_magic': {
      const group = groupService.getPlayerGroup(playerId)
      if (!group) return r(false, '你不属于任何组')

      const channelResult = akashaKeyService.channelMagic(roomId, group.id)
      if (!channelResult.success) return r(false, channelResult.error!)

      if (channelResult.victory) {
        return r(true, '许愿完成！获得胜利！', { victory: true, progress: channelResult.progress })
      }
      return r(true, `注入魔力 (${channelResult.progress}/${channelResult.required})`, {
        progress: channelResult.progress, required: channelResult.required,
      })
    }

    case 'declare_war':
      // 宣战由 encounter-engine 处理，此处仅记录
      return r(true, `对 ${payload.targetGroupId} 宣战`)

    case 'skip':
    case 'consume':
    default:
      return r(true, '放弃行动')
  }
}
