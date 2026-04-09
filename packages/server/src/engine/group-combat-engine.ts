/**
 * Group vs Group 战斗引擎
 *
 * 规则：
 * - 战斗由宣战触发，参与者为组(Group)
 * - 每组内 Master+Servant 各自有独立状态
 * - 行动顺序按幻身敏捷(AGI)排序，相同则宣战方优先
 * - 每轮所有组依次行动，每组行动一圈=一个战斗轮
 * - 战斗持续条件：每轮有有色攻击造成≥1伤害
 * - 战斗结束时可选择战术撤离
 */

import { v4 as uuid } from 'uuid'
import type { StrikeColor, CombatTurnPhase, PlayChainEntry, DamageType } from 'shared'
import { RESPONSE_MAP, MAX_CHAIN_DEPTH } from 'shared'
import { calcStrikeDamage, type DamageResult } from './damage-calculator.js'

// ── 类型定义 ──

/** 单个角色的战斗状态 */
export interface CharacterCombatState {
  readonly playerId: string
  readonly role: 'master' | 'servant'
  readonly groupId: string
  hp: number
  readonly hpMax: number
  mp: number
  readonly mpMax: number
  ac: number
  readonly baseDamage: number
  /** 增伤（临时，每轮可变） */
  amplification: number
  /** 超级增伤（所有伤害类型均享受） */
  superAmplification: number
  /** 减伤 */
  reduction: number
  shield: number
  /** 动作数（幻身的敏捷派生） */
  actions: number
  readonly actionsMax: number
  /** 本轮剩余动作 */
  actionsRemaining: number
  /** 是否存活 */
  alive: boolean
  /** 默认伤害类型（狂化等覆盖） */
  defaultDamageType: DamageType
}

/** 组的战斗状态 */
export interface GroupCombatState {
  readonly groupId: string
  readonly attackerSide: boolean  // true=宣战方
  servant: CharacterCombatState
  master: CharacterCombatState
  /** 战术风格（篡者）：每回合可用一次 */
  tacticalStyleUsed: boolean
  tacticalStyleColor: StrikeColor | null
  /** 本轮是否造成了有色伤害 */
  dealtColoredDamageThisRound: boolean
  /** 击牌手牌（颜色→数量） */
  hand: Map<StrikeColor, number>
}

/** 战斗事件日志 */
export interface CombatLogEntry {
  readonly type: string
  readonly groupId?: string
  readonly playerId?: string
  readonly description: string
  readonly data?: Record<string, unknown>
  readonly timestamp: number
}

/** Group 战斗引擎状态 */
export interface GroupCombatEngineState {
  readonly combatId: string
  readonly roomId: string
  readonly regionId: string
  roundNumber: number
  turnIndex: number
  /** 行动顺序（groupId列表，按AGI排序） */
  turnOrder: string[]
  phase: CombatTurnPhase
  activeGroupId: string | null
  playChain: PlayChainEntry[]
  isActive: boolean
  /** 各组战斗状态 */
  groupStates: Map<string, GroupCombatState>
  /** 日志 */
  events: CombatLogEntry[]
  /** 是否有任何有色攻击造成过伤害（用于判断战斗结束） */
  anyColoredDamageThisRound: boolean
}

// ── 初始化 ──

export interface GroupCombatParticipant {
  readonly groupId: string
  readonly isAttacker: boolean
  readonly servant: {
    playerId: string
    hp: number; hpMax: number
    mp: number; mpMax: number
    baseDamage: number
    actions: number
    ac: number
    agiRank: number  // 用于排序
  }
  readonly master: {
    playerId: string
    hp: number; hpMax: number
    mp: number; mpMax: number
    baseDamage: number
    ac: number
  }
  readonly tacticalStyleColor: StrikeColor | null
  readonly hand: Map<StrikeColor, number>
}

export function initGroupCombat(
  roomId: string,
  regionId: string,
  participants: GroupCombatParticipant[],
): GroupCombatEngineState {
  const groupStates = new Map<string, GroupCombatState>()

  for (const p of participants) {
    groupStates.set(p.groupId, {
      groupId: p.groupId,
      attackerSide: p.isAttacker,
      servant: {
        playerId: p.servant.playerId,
        role: 'servant',
        groupId: p.groupId,
        hp: p.servant.hp, hpMax: p.servant.hpMax,
        mp: p.servant.mp, mpMax: p.servant.mpMax,
        ac: p.servant.ac,
        baseDamage: p.servant.baseDamage,
        amplification: 0, superAmplification: 0, reduction: 0, shield: 0,
        actions: p.servant.actions, actionsMax: p.servant.actions,
        actionsRemaining: p.servant.actions,
        alive: true,
        defaultDamageType: 'normal',
      },
      master: {
        playerId: p.master.playerId,
        role: 'master',
        groupId: p.groupId,
        hp: p.master.hp, hpMax: p.master.hpMax,
        mp: p.master.mp, mpMax: p.master.mpMax,
        ac: p.master.ac,
        baseDamage: p.master.baseDamage,
        amplification: 0, superAmplification: 0, reduction: 0, shield: 0,
        actions: 0, actionsMax: 0, actionsRemaining: 0,
        alive: true,
        defaultDamageType: 'normal',
      },
      tacticalStyleUsed: false,
      tacticalStyleColor: p.tacticalStyleColor,
      dealtColoredDamageThisRound: false,
      hand: new Map(p.hand),
    })
  }

  // 按幻身AGI排序（高→低），相同则宣战方优先
  const turnOrder = participants
    .sort((a, b) => {
      const agiDiff = b.servant.agiRank - a.servant.agiRank
      if (agiDiff !== 0) return agiDiff
      return (a.isAttacker ? -1 : 0) - (b.isAttacker ? -1 : 0)
    })
    .map(p => p.groupId)

  const combatId = uuid()
  const state: GroupCombatEngineState = {
    combatId, roomId, regionId,
    roundNumber: 1,
    turnIndex: 0,
    turnOrder,
    phase: 'play',
    activeGroupId: turnOrder[0] ?? null,
    playChain: [],
    isActive: true,
    groupStates,
    events: [],
    anyColoredDamageThisRound: false,
  }

  state.events.push({ type: 'combat_start', description: '战斗开始', timestamp: Date.now() })

  return state
}

// ── 出牌/响应/结算 ──

export function handleGroupPlayStrike(
  state: GroupCombatEngineState,
  groupId: string,
  cardColor: StrikeColor,
  targetGroupId: string,
): { success: boolean; error?: string; needsResponse?: boolean } {
  if (state.phase !== 'play') return { success: false, error: '当前不是出牌阶段' }
  if (state.activeGroupId !== groupId) return { success: false, error: '不是你的回合' }

  const group = state.groupStates.get(groupId)
  if (!group) return { success: false, error: '组状态不存在' }

  // 检查手牌
  const count = group.hand.get(cardColor) || 0
  if (count <= 0) return { success: false, error: `没有${cardColor}击` }

  // 检查幻身动作数
  if (group.servant.actionsRemaining <= 0) return { success: false, error: '动作数不足' }

  // 消耗手牌和MP
  group.hand.set(cardColor, count - 1)
  if (group.servant.mp > 0) {
    group.servant.mp -= 1
  }
  group.servant.actionsRemaining -= 1

  state.playChain.push({
    id: uuid(),
    playerId: group.servant.playerId,
    type: 'play',
    cardColor,
    targetId: targetGroupId,
    timestamp: Date.now(),
  })

  state.events.push({
    type: 'play_strike', groupId,
    description: `打出 ${cardColor}击`,
    data: { cardColor, targetGroupId },
    timestamp: Date.now(),
  })

  // 检查对手能否响应
  const target = state.groupStates.get(targetGroupId)
  if (!target) { state.phase = 'resolve'; return { success: true, needsResponse: false } }

  const responseColor = RESPONSE_MAP[cardColor]
  const targetCount = target.hand.get(responseColor) || 0
  if (targetCount > 0) {
    state.phase = 'respond'
    return { success: true, needsResponse: true }
  }

  state.phase = 'resolve'
  return { success: true, needsResponse: false }
}

export function handleGroupRespond(
  state: GroupCombatEngineState,
  groupId: string,
  cardColor?: StrikeColor,
): { success: boolean; error?: string } {
  if (state.phase !== 'respond') return { success: false, error: '当前不是响应阶段' }

  const lastPlay = state.playChain[state.playChain.length - 1]
  if (!lastPlay?.targetId) return { success: false, error: '无出牌可响应' }
  if (lastPlay.targetId !== groupId) return { success: false, error: '你不是攻击目标' }

  if (!cardColor) {
    // pass 响应
    state.phase = 'resolve'
    state.events.push({ type: 'pass_respond', groupId, description: '选择不响应', timestamp: Date.now() })
    return { success: true }
  }

  const attackColor = lastPlay.cardColor
  if (!attackColor) return { success: false, error: '无效攻击' }

  const expectedResponse = RESPONSE_MAP[attackColor]
  if (cardColor !== expectedResponse) {
    return { success: false, error: `${attackColor}击只能用${expectedResponse}击响应` }
  }

  const group = state.groupStates.get(groupId)
  if (!group) return { success: false, error: '组不存在' }

  const count = group.hand.get(cardColor) || 0
  if (count <= 0) return { success: false, error: `没有${cardColor}击可响应` }

  group.hand.set(cardColor, count - 1)

  state.playChain.push({
    id: uuid(),
    playerId: group.servant.playerId,
    type: 'respond',
    cardColor,
    timestamp: Date.now(),
  })

  state.events.push({
    type: 'respond_strike', groupId,
    description: `用 ${cardColor}击 响应`,
    timestamp: Date.now(),
  })

  if (state.playChain.length >= MAX_CHAIN_DEPTH) {
    state.phase = 'resolve'
    return { success: true }
  }

  state.phase = 'resolve'
  return { success: true }
}

export function handleGroupPass(
  state: GroupCombatEngineState,
  groupId: string,
): { success: boolean; error?: string } {
  if (state.activeGroupId !== groupId) return { success: false, error: '不是你的回合' }

  state.events.push({ type: 'pass', groupId, description: '结束回合', timestamp: Date.now() })
  state.playChain = []
  state.phase = 'end_turn'
  return { success: true }
}

// ── 结算 ──

export function resolveGroupChain(state: GroupCombatEngineState): DamageResult | null {
  if (state.playChain.length === 0) { state.phase = 'play'; return null }

  const lastEntry = state.playChain[state.playChain.length - 1]!
  const firstEntry = state.playChain[0]!

  // 被响应 → 攻击被抵消
  if (lastEntry.type === 'respond') {
    state.events.push({ type: 'chain_blocked', description: '攻击被响应抵消', timestamp: Date.now() })
    state.playChain = []
    state.phase = 'play'
    return null
  }

  // 攻击命中
  const attackerGroupId = findGroupByPlayerId(state, firstEntry.playerId)
  const defenderGroupId = firstEntry.targetId
  if (!attackerGroupId || !defenderGroupId) {
    state.playChain = []
    state.phase = 'play'
    return null
  }

  const attacker = state.groupStates.get(attackerGroupId)
  const defender = state.groupStates.get(defenderGroupId)
  if (!attacker || !defender) {
    state.playChain = []
    state.phase = 'play'
    return null
  }

  // 计算伤害：攻击目标是对方幻身
  const target = defender.servant.alive ? defender.servant : defender.master
  const dmgResult = calcStrikeDamage(
    attacker.servant.baseDamage,
    attacker.servant.amplification,
    attacker.servant.superAmplification,
    target.reduction,
    target.ac,
    attacker.servant.defaultDamageType,
  )

  // 应用伤害
  target.hp = Math.max(0, target.hp - dmgResult.finalDamage)
  if (target.hp <= 0) target.alive = false

  // 标记有色攻击造成了伤害
  if (firstEntry.cardColor && dmgResult.finalDamage >= 1) {
    attacker.dealtColoredDamageThisRound = true
    state.anyColoredDamageThisRound = true
  }

  state.events.push({
    type: 'chain_resolved',
    groupId: attackerGroupId,
    description: `${firstEntry.cardColor}击命中，造成 ${dmgResult.finalDamage} 伤害`,
    data: {
      damage: dmgResult.finalDamage,
      damageType: dmgResult.actualType,
      acAbsorbed: dmgResult.acAbsorbed,
      targetHp: target.hp,
    },
    timestamp: Date.now(),
  })

  state.playChain = []
  state.phase = 'play'
  return dmgResult
}

// ── 轮次推进 ──

export function nextGroupTurn(state: GroupCombatEngineState): { newRound: boolean } {
  state.turnIndex++
  state.playChain = []

  // 跳过已淘汰的组
  while (state.turnIndex < state.turnOrder.length) {
    const gid = state.turnOrder[state.turnIndex]!
    const gs = state.groupStates.get(gid)
    if (gs && gs.servant.alive) break
    state.turnIndex++
  }

  if (state.turnIndex >= state.turnOrder.length) {
    return endGroupRound(state)
  }

  state.activeGroupId = state.turnOrder[state.turnIndex] ?? null
  state.phase = 'play'

  // 刷新当前组幻身的动作数
  const gs = state.groupStates.get(state.activeGroupId!)
  if (gs) gs.servant.actionsRemaining = gs.servant.actionsMax

  return { newRound: false }
}

function endGroupRound(state: GroupCombatEngineState): { newRound: boolean } {
  state.events.push({
    type: 'round_end',
    description: `第 ${state.roundNumber} 轮结束`,
    timestamp: Date.now(),
  })

  // 检查战斗是否应该结束：本轮没有有色攻击造成伤害 → 结束
  if (!state.anyColoredDamageThisRound && state.roundNumber > 1) {
    endGroupCombat(state)
    return { newRound: false }
  }

  // 检查是否只剩一方存活
  const aliveGroups = [...state.groupStates.values()].filter(g => g.servant.alive)
  if (aliveGroups.length <= 1) {
    endGroupCombat(state)
    return { newRound: false }
  }

  // 新轮开始
  state.roundNumber++
  state.turnIndex = 0
  state.anyColoredDamageThisRound = false

  // 重置各组本轮状态
  for (const gs of state.groupStates.values()) {
    gs.dealtColoredDamageThisRound = false
    gs.tacticalStyleUsed = false
    gs.servant.actionsRemaining = gs.servant.actionsMax
  }

  // 跳到第一个存活组
  while (state.turnIndex < state.turnOrder.length) {
    const gid = state.turnOrder[state.turnIndex]!
    const gs = state.groupStates.get(gid)
    if (gs && gs.servant.alive) break
    state.turnIndex++
  }

  state.activeGroupId = state.turnOrder[state.turnIndex] ?? null
  state.phase = 'play'

  state.events.push({
    type: 'round_start',
    description: `第 ${state.roundNumber} 轮开始`,
    timestamp: Date.now(),
  })

  return { newRound: true }
}

export function endGroupCombat(state: GroupCombatEngineState): void {
  state.isActive = false
  state.events.push({ type: 'combat_end', description: '战斗结束', timestamp: Date.now() })
}

// ── 查询 ──

export function getGroupCombatSnapshot(state: GroupCombatEngineState) {
  return {
    combatId: state.combatId,
    roomId: state.roomId,
    regionId: state.regionId,
    roundNumber: state.roundNumber,
    turnIndex: state.turnIndex,
    turnOrder: state.turnOrder,
    phase: state.phase,
    activeGroupId: state.activeGroupId,
    playChain: state.playChain,
    isActive: state.isActive,
    groups: [...state.groupStates.entries()].map(([gid, gs]) => ({
      groupId: gid,
      attackerSide: gs.attackerSide,
      servant: { playerId: gs.servant.playerId, hp: gs.servant.hp, hpMax: gs.servant.hpMax, mp: gs.servant.mp, alive: gs.servant.alive, ac: gs.servant.ac, actionsRemaining: gs.servant.actionsRemaining },
      master: { playerId: gs.master.playerId, hp: gs.master.hp, hpMax: gs.master.hpMax, mp: gs.master.mp, alive: gs.master.alive, ac: gs.master.ac },
      handCount: [...gs.hand.values()].reduce((a, b) => a + b, 0),
      tacticalStyleUsed: gs.tacticalStyleUsed,
    })),
  }
}

export function isGroupCombatOver(state: GroupCombatEngineState): boolean {
  return !state.isActive
}

export function getWinnerGroupId(state: GroupCombatEngineState): string | null {
  const alive = [...state.groupStates.values()].filter(g => g.servant.alive)
  if (alive.length === 1) return alive[0]!.groupId
  return null
}

export function getEliminatedGroupIds(state: GroupCombatEngineState): string[] {
  return [...state.groupStates.values()]
    .filter(g => !g.servant.alive)
    .map(g => g.groupId)
}

// ── 工具 ──

function findGroupByPlayerId(state: GroupCombatEngineState, playerId: string): string | null {
  for (const [gid, gs] of state.groupStates) {
    if (gs.servant.playerId === playerId || gs.master.playerId === playerId) return gid
  }
  return null
}
