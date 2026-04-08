import { v4 as uuid } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { actionQueue, players } from '../db/schema.js'
import * as gameService from './game.service.js'
import * as playerService from './player.service.js'
import * as mapService from './map.service.js'
import * as outpostService from './outpost.service.js'
import { canTraverse, getAdjacentRegions } from '../engine/visibility.js'
import type { ActionType, ActionResult } from 'shared'

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

  // Handle bound player
  if (player.boundToPlayerId) {
    const boundExisting = db.select().from(actionQueue)
      .where(and(
        eq(actionQueue.roomId, roomId),
        eq(actionQueue.playerId, player.boundToPlayerId),
        eq(actionQueue.turnNumber, room.turnNumber),
        eq(actionQueue.actionPointIndex, room.currentActionPointIndex),
      ))
      .get()

    if (!boundExisting) {
      db.insert(actionQueue).values({
        id: uuid(),
        roomId,
        playerId: player.boundToPlayerId,
        turnNumber: room.turnNumber,
        actionPointIndex: room.currentActionPointIndex,
        actionType,
        payload: JSON.stringify(payload),
        status: 'pending',
        submittedAt: Date.now(),
      }).run()
    }
  }

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

  const adjacencyList = mapService.getRoomAdjacencies(roomId)
  const results: ActionResult[] = []

  // Resolution order: moves → scouts → outposts → consumes
  const order: ActionType[] = ['move_adjacent', 'move_designated', 'scout', 'place_outpost', 'consume']

  for (const actionType of order) {
    const batch = submissions.filter(s => s.actionType === actionType)

    for (const action of batch) {
      const player = playerService.getPlayer(action.playerId)
      if (!player) continue

      let result: ActionResult

      switch (actionType) {
        case 'move_adjacent': {
          const targetId = action.payload.targetRegionId
          if (!player.regionId || !canTraverse(player.regionId, targetId, adjacencyList)) {
            result = { playerId: action.playerId, actionType, success: false, details: '无法移动到该区域' }
          } else {
            playerService.updatePlayerRegion(action.playerId, targetId)
            result = { playerId: action.playerId, actionType, success: true, details: '移动成功', data: { regionId: targetId } }
          }
          break
        }
        case 'move_designated': {
          const targetId = action.payload.targetRegionId
          const region = mapService.getRegion(targetId)
          if (!region) {
            result = { playerId: action.playerId, actionType, success: false, details: '目标区域不存在' }
          } else {
            playerService.updatePlayerRegion(action.playerId, targetId)
            result = { playerId: action.playerId, actionType, success: true, details: '指定移动成功', data: { regionId: targetId } }
          }
          break
        }
        case 'scout': {
          const targetId = action.payload.targetRegionId
          if (!player.regionId) {
            result = { playerId: action.playerId, actionType, success: false, details: '不在任何区域' }
            break
          }
          const adjacent = getAdjacentRegions(player.regionId, adjacencyList)
          if (!adjacent.includes(targetId)) {
            result = { playerId: action.playerId, actionType, success: false, details: '目标不是相邻区域' }
          } else {
            const playersInRegion = playerService.getRoomPlayers(roomId)
              .filter(p => p.regionId === targetId && !p.isGm)
              .map(p => ({ id: p.id, name: p.displayName }))
            result = {
              playerId: action.playerId, actionType, success: true,
              details: `侦查到 ${playersInRegion.length} 名玩家`,
              data: { players: playersInRegion },
            }
          }
          break
        }
        case 'place_outpost': {
          if (!player.regionId) {
            result = { playerId: action.playerId, actionType, success: false, details: '不在任何区域' }
          } else {
            outpostService.placeOutpost(roomId, action.playerId, player.regionId, player.color)
            result = { playerId: action.playerId, actionType, success: true, details: '据点放置成功' }
          }
          break
        }
        case 'consume':
        default:
          result = { playerId: action.playerId, actionType: 'consume', success: true, details: '行动点已消耗' }
          break
      }

      results.push(result)

      // Deduct AP
      playerService.updatePlayerStats(action.playerId, {
        actionPoints: Math.max(0, (player.actionPoints || 0) - 1),
      })

      // Mark as executed
      db.update(actionQueue)
        .set({ status: 'executed', resolvedAt: Date.now() })
        .where(eq(actionQueue.id, action.id))
        .run()
    }
  }

  return results
}
