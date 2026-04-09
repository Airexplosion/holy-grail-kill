/**
 * 遭遇/宣战引擎
 *
 * 规则：
 * - 行动阶段每个AP结算后扫描：同一区域是否有多个组
 * - 宣战不消耗行动点，立即终止该地点所有角色当前AP的行动
 * - 被宣战方选择：迎战 或 逃离
 * - 逃离：弃置所有地点牌，移动到指定地点或据点
 * - 同一地点连续2AP共存 → 强制宣战（强制迎战）
 */

import { v4 as uuid } from 'uuid'
import type { WarDeclarationStatus, WarResponse } from 'shared'
import { FORCED_WAR_COEXIST_THRESHOLD } from 'shared'

export interface Encounter {
  readonly regionId: string
  readonly groupIds: string[]
}

export interface WarDeclarationRecord {
  readonly id: string
  readonly roomId: string
  readonly regionId: string
  readonly attackerGroupId: string
  readonly defenderGroupId: string
  status: WarDeclarationStatus
  readonly turnNumber: number
  readonly actionPointIndex: number
  readonly timestamp: number
  response?: WarResponse
}

/** 每个房间的遭遇追踪状态 */
interface RoomEncounterState {
  /** 各区域的组共存计数（regionId → Map<groupId, 连续AP数>） */
  coexistCounters: Map<string, Map<string, number>>
  /** 活跃的宣战记录 */
  activeWars: WarDeclarationRecord[]
}

const roomStates = new Map<string, RoomEncounterState>()

function getState(roomId: string): RoomEncounterState {
  let state = roomStates.get(roomId)
  if (!state) {
    state = { coexistCounters: new Map(), activeWars: [] }
    roomStates.set(roomId, state)
  }
  return state
}

/**
 * 扫描同一区域有多个组的情况
 * @param regionGroups 每个区域当前的组ID列表
 */
export function detectEncounters(
  regionGroups: Map<string, string[]>,
): Encounter[] {
  const encounters: Encounter[] = []
  for (const [regionId, groupIds] of regionGroups) {
    if (groupIds.length >= 2) {
      encounters.push({ regionId, groupIds })
    }
  }
  return encounters
}

/**
 * 更新共存计数（每个AP结算后调用）
 * 返回需要强制宣战的区域和组
 */
export function updateCoexistCounters(
  roomId: string,
  regionGroups: Map<string, string[]>,
): Array<{ regionId: string; groupIds: string[] }> {
  const state = getState(roomId)
  const forcedWars: Array<{ regionId: string; groupIds: string[] }> = []

  // 更新计数
  const newCounters = new Map<string, Map<string, number>>()
  for (const [regionId, groupIds] of regionGroups) {
    if (groupIds.length < 2) continue

    const oldRegion = state.coexistCounters.get(regionId) || new Map()
    const newRegion = new Map<string, number>()

    for (const gid of groupIds) {
      const prev = oldRegion.get(gid) || 0
      newRegion.set(gid, prev + 1)
    }
    newCounters.set(regionId, newRegion)

    // 检查是否有组共存超过阈值
    const coexistGroups = groupIds.filter(gid => (newRegion.get(gid) || 0) >= FORCED_WAR_COEXIST_THRESHOLD)
    if (coexistGroups.length >= 2) {
      // 检查是否已有活跃宣战
      const hasActiveWar = state.activeWars.some(w =>
        w.regionId === regionId &&
        coexistGroups.includes(w.attackerGroupId) &&
        coexistGroups.includes(w.defenderGroupId) &&
        w.status !== 'fled'
      )
      if (!hasActiveWar) {
        forcedWars.push({ regionId, groupIds: coexistGroups })
      }
    }
  }

  state.coexistCounters = newCounters
  return forcedWars
}

/**
 * 创建宣战记录
 */
export function declareWar(
  roomId: string,
  attackerGroupId: string,
  defenderGroupId: string,
  regionId: string,
  turnNumber: number,
  actionPointIndex: number,
  forced: boolean = false,
): WarDeclarationRecord {
  const state = getState(roomId)
  const record: WarDeclarationRecord = {
    id: uuid(),
    roomId,
    regionId,
    attackerGroupId,
    defenderGroupId,
    status: forced ? 'forced' : 'pending_response',
    turnNumber,
    actionPointIndex,
    timestamp: Date.now(),
    response: forced ? 'fight' : undefined,
  }
  state.activeWars.push(record)
  return record
}

/**
 * 处理宣战响应
 */
export function respondToWar(
  roomId: string,
  warId: string,
  response: WarResponse,
): WarDeclarationRecord | null {
  const state = getState(roomId)
  const war = state.activeWars.find(w => w.id === warId)
  if (!war || war.status !== 'pending_response') return null

  war.status = response === 'fight' ? 'accepted' : 'fled'
  war.response = response
  return war
}

/**
 * 获取需要进入战斗的宣战（状态为 accepted 或 forced）
 */
export function getPendingCombats(roomId: string): WarDeclarationRecord[] {
  const state = getState(roomId)
  return state.activeWars.filter(w => w.status === 'accepted' || w.status === 'forced')
}

/**
 * 获取指定组的待响应宣战
 */
export function getPendingWarForGroup(roomId: string, groupId: string): WarDeclarationRecord | null {
  const state = getState(roomId)
  return state.activeWars.find(w =>
    w.defenderGroupId === groupId && w.status === 'pending_response'
  ) ?? null
}

/**
 * 处理逃离效果
 * - 弃置所有地点牌
 * - 移动到指定地点或据点
 * - 直至下回合结束无法使用/消耗任何牌
 */
export interface FleeResult {
  readonly groupId: string
  readonly targetRegionId: string | null
  readonly cardsDiscarded: number
  /** 逃离后直到下回合结束的禁用标记 */
  readonly disabledUntilTurn: number
}

export function processFlee(
  roomId: string,
  groupId: string,
  targetRegionId: string | null,
  currentTurn: number,
): FleeResult {
  const state = getState(roomId)

  // 标记逃离状态（禁用牌到下回合结束 = currentTurn + 1）
  return {
    groupId,
    targetRegionId,
    cardsDiscarded: 0, // 实际弃牌由调用方处理（需要访问卡牌服务）
    disabledUntilTurn: currentTurn + 1,
  }
}

/**
 * 处理战术撤离（战斗结束后可选）
 * 移动到相邻地点（对手可得知方向）
 */
export interface TacticalRetreatResult {
  readonly groupId: string
  readonly targetRegionId: string
  readonly visibleToOpponents: boolean
}

export function processTacticalRetreat(
  groupId: string,
  targetRegionId: string,
): TacticalRetreatResult {
  return {
    groupId,
    targetRegionId,
    visibleToOpponents: true,  // 对手可得知撤离方向
  }
}

/**
 * 清除已结算的宣战
 */
export function clearResolvedWars(roomId: string): void {
  const state = getState(roomId)
  state.activeWars = state.activeWars.filter(w => w.status === 'pending_response')
}

/**
 * 清理房间状态
 */
export function cleanupEncounters(roomId: string): void {
  roomStates.delete(roomId)
}

/**
 * 重置回合开始时的共存计数
 */
export function resetCoexistCounters(roomId: string): void {
  const state = getState(roomId)
  state.coexistCounters.clear()
}
