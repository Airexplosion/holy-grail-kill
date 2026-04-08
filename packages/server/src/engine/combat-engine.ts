/**
 * 战斗引擎 — 出牌→响应→结算 核心逻辑
 *
 * 战斗流程：
 * 1. initCombat: 创建战斗状态，确定回合顺序
 * 2. 每轮：所有参与者依次行动
 * 3. 每个人的回合：出牌/使用技能 → 对手响应 → 结算
 * 4. 轮结束：AP 刷新，MP 不恢复，CD-1
 *
 * 击牌克制：红→蓝响应，蓝→绿响应，绿→红响应
 */

import { v4 as uuid } from 'uuid'
import { RESPONSE_MAP, MAX_CHAIN_DEPTH } from 'shared'
import type { StrikeColor, CombatTurnPhase, PlayChainEntry, CombatAction } from 'shared'
import {
  type EffectContext,
  type EffectResult,
  type PlayerCombatState,
  type CombatEventLog,
  executeEffect,
} from './effect-pipeline.js'
import {
  type RuntimeSkill,
  canUseSkill,
  executeSkill,
  triggerPassiveSkills,
  processCooldowns,
  hasMpReductionPassive,
} from './skill-executor.js'

/** 服务端完整战斗状态（内存中） */
export interface CombatEngineState {
  roomId: string
  roundNumber: number
  turnIndex: number
  turnOrder: string[]
  phase: CombatTurnPhase
  activePlayerId: string | null
  playChain: PlayChainEntry[]
  isActive: boolean
  /** 每个玩家的战斗状态 */
  playerStates: Map<string, PlayerCombatState>
  /** 每个玩家的运行时技能 */
  playerSkills: Map<string, RuntimeSkill[]>
  /** 每个玩家的击牌手牌（颜色→数量） */
  playerHands: Map<string, Map<StrikeColor, number>>
  /** 战斗日志 */
  events: CombatEventLog[]
}

/** 初始化战斗 */
export function initCombat(
  roomId: string,
  participants: Array<{
    id: string
    hp: number; hpMax: number
    mp: number; mpMax: number
    skills: RuntimeSkill[]
    hand: Map<StrikeColor, number>
  }>,
): CombatEngineState {
  const turnOrder = participants.map(p => p.id)
  // TODO: sort by priority (先手之利 b03)
  const priorityBonuses = new Map<string, number>()
  for (const p of participants) {
    let bonus = 0
    for (const s of p.skills) {
      if (s.entry.effects.some(e => e.effectType === 'modifyPriority')) {
        bonus += (s.entry.effects.find(e => e.effectType === 'modifyPriority')?.params.value as number) || 0
      }
    }
    priorityBonuses.set(p.id, bonus)
  }
  turnOrder.sort((a, b) => (priorityBonuses.get(b) || 0) - (priorityBonuses.get(a) || 0))

  const playerStates = new Map<string, PlayerCombatState>()
  const playerSkills = new Map<string, RuntimeSkill[]>()
  const playerHands = new Map<string, Map<StrikeColor, number>>()

  for (const p of participants) {
    playerStates.set(p.id, {
      hp: p.hp,
      hpMax: p.hpMax,
      mp: p.mp,
      mpMax: p.mpMax,
      shield: 0,
      handCount: Array.from(p.hand.values()).reduce((a, b) => a + b, 0),
      flags: new Map(),
    })
    playerSkills.set(p.id, p.skills)
    playerHands.set(p.id, new Map(p.hand))
  }

  const state: CombatEngineState = {
    roomId,
    roundNumber: 1,
    turnIndex: 0,
    turnOrder,
    phase: 'play',
    activePlayerId: turnOrder[0] || null,
    playChain: [],
    isActive: true,
    playerStates,
    playerSkills,
    playerHands,
    events: [],
  }

  state.events.push({ type: 'combat_start', playerId: '', description: '战斗开始' })

  // Trigger combat_before skills
  for (const pid of turnOrder) {
    const skills = playerSkills.get(pid) || []
    const ctx = makeContext(state, pid, pid)
    triggerPassiveSkills('combat_before', pid, skills, ctx)
  }

  return state
}

/** 处理玩家出牌 */
export function handlePlayStrike(
  state: CombatEngineState,
  playerId: string,
  cardColor: StrikeColor,
  targetId: string,
): { success: boolean; error?: string } {
  if (state.phase !== 'play') return { success: false, error: '当前不是出牌阶段' }
  if (state.activePlayerId !== playerId) return { success: false, error: '不是你的回合' }

  // Check hand
  const hand = state.playerHands.get(playerId)
  if (!hand || (hand.get(cardColor) || 0) <= 0) {
    return { success: false, error: `没有${cardColor}击可打` }
  }

  // Consume card
  hand.set(cardColor, (hand.get(cardColor) || 0) - 1)

  state.playChain.push({
    id: uuid(),
    playerId,
    type: 'play',
    cardColor,
    targetId,
    timestamp: Date.now(),
  })

  state.events.push({
    type: 'play_strike',
    playerId,
    description: `打出 ${cardColor}击 攻击`,
    data: { cardColor, targetId },
  })

  // Check if target can respond
  const responseColor = RESPONSE_MAP[cardColor]
  const targetHand = state.playerHands.get(targetId)
  const canRespond = targetHand && (targetHand.get(responseColor) || 0) > 0

  if (canRespond) {
    state.phase = 'respond'
  } else {
    state.phase = 'resolve'
  }

  return { success: true }
}

/** 处理使用技能 */
export function handleUseSkill(
  state: CombatEngineState,
  playerId: string,
  skillId: string,
  targetId?: string,
): { success: boolean; error?: string; results?: EffectResult[] } {
  if (state.phase !== 'play') return { success: false, error: '当前不是出牌阶段' }
  if (state.activePlayerId !== playerId) return { success: false, error: '不是你的回合' }

  const skills = state.playerSkills.get(playerId) || []
  const skill = skills.find(s => s.entry.id === skillId)
  if (!skill) return { success: false, error: '你没有这个技能' }

  const playerState = state.playerStates.get(playerId)
  if (!playerState) return { success: false, error: '玩家状态不存在' }

  const hasMpReduce = hasMpReductionPassive(skills)
  const check = canUseSkill(skill, playerState.mp, hasMpReduce)
  if (!check.usable) return { success: false, error: check.reason }

  const actualTarget = targetId || playerId
  const ctx = makeContext(state, playerId, actualTarget)
  const { results } = executeSkill(skill, ctx, hasMpReduce)

  // Skill doesn't enter play chain for response — resolves immediately
  state.events.push({
    type: 'use_skill',
    playerId,
    description: `使用技能: ${skill.entry.name}`,
    data: { skillId, targetId: actualTarget },
  })

  return { success: true, results }
}

/** 处理响应 */
export function handleRespond(
  state: CombatEngineState,
  playerId: string,
  cardColor?: StrikeColor,
): { success: boolean; error?: string } {
  if (state.phase !== 'respond') return { success: false, error: '当前不是响应阶段' }

  // The responder is the target of the last play
  const lastPlay = state.playChain[state.playChain.length - 1]
  if (!lastPlay) return { success: false, error: '无出牌可响应' }
  if (lastPlay.targetId !== playerId) return { success: false, error: '你不是本次攻击的目标' }

  if (!cardColor) {
    // Pass response
    state.phase = 'resolve'
    state.events.push({ type: 'pass_respond', playerId, description: '选择不响应' })
    return { success: true }
  }

  // Validate response color
  const attackColor = lastPlay.cardColor
  if (!attackColor) return { success: false, error: '无效的攻击' }
  const expectedResponse = RESPONSE_MAP[attackColor]
  if (cardColor !== expectedResponse) {
    return { success: false, error: `${attackColor}击只能用${expectedResponse}击响应` }
  }

  // Check hand
  const hand = state.playerHands.get(playerId)
  if (!hand || (hand.get(cardColor) || 0) <= 0) {
    return { success: false, error: `没有${cardColor}击可响应` }
  }

  // Consume card
  hand.set(cardColor, (hand.get(cardColor) || 0) - 1)

  state.playChain.push({
    id: uuid(),
    playerId,
    type: 'respond',
    cardColor,
    timestamp: Date.now(),
  })

  state.events.push({
    type: 'respond_strike',
    playerId,
    description: `用 ${cardColor}击 响应`,
    data: { cardColor },
  })

  // Chain depth check
  if (state.playChain.length >= MAX_CHAIN_DEPTH) {
    state.phase = 'resolve'
    return { success: true }
  }

  // After response, resolve (no counter-response for now)
  state.phase = 'resolve'
  return { success: true }
}

/** 处理 pass（结束回合） */
export function handlePass(state: CombatEngineState, playerId: string): { success: boolean; error?: string } {
  if (state.activePlayerId !== playerId) return { success: false, error: '不是你的回合' }

  state.events.push({ type: 'pass', playerId, description: '结束回合' })
  state.playChain = []
  state.phase = 'end_turn'
  return { success: true }
}

/** 结算出牌链 */
export function resolveChain(state: CombatEngineState): EffectResult[] {
  if (state.playChain.length === 0) return []

  const lastEntry = state.playChain[state.playChain.length - 1]!
  const firstEntry = state.playChain[0]!

  // If last entry is a response, the attack is blocked
  if (lastEntry.type === 'respond') {
    state.events.push({ type: 'chain_blocked', playerId: lastEntry.playerId, description: '攻击被响应抵消' })
    state.playChain = []
    state.phase = 'play'
    return []
  }

  // Attack goes through — apply damage
  const attackerId = firstEntry.playerId
  const defenderId = firstEntry.targetId || ''
  const cardColor = firstEntry.cardColor
  if (!cardColor || !defenderId) {
    state.playChain = []
    state.phase = 'play'
    return []
  }

  // Base damage from strike card (10)
  let damage = 10

  // Check damage bonus (地利之势 b05 etc.)
  const attackerSkills = state.playerSkills.get(attackerId) || []
  for (const s of attackerSkills) {
    if (s.enabled && s.entry.effects.some(e => e.effectType === 'damageBonus')) {
      const bonus = s.entry.effects.find(e => e.effectType === 'damageBonus')
      if (bonus) damage += (bonus.params.value as number) || 0
    }
  }

  // Apply damage via effect pipeline
  const ctx = makeContext(state, attackerId, defenderId)
  const results = [executeEffect('damage', ctx, { value: damage })]

  // Trigger on_damage skills for defender
  const defenderSkills = state.playerSkills.get(defenderId) || []
  const defCtx = makeContext(state, defenderId, attackerId) // source=defender, target=attacker for reflect
  const triggerResults = triggerPassiveSkills('on_damage', defenderId, defenderSkills, defCtx)
  results.push(...triggerResults)

  state.events.push({
    type: 'chain_resolved',
    playerId: attackerId,
    description: `${cardColor}击命中，造成 ${damage} 伤害`,
    data: { damage, attackerId, defenderId },
  })

  state.playChain = []
  state.phase = 'play'
  return results
}

/** 推进到下一个人的回合 */
export function nextTurn(state: CombatEngineState): { newRound: boolean } {
  state.turnIndex++
  state.playChain = []

  if (state.turnIndex >= state.turnOrder.length) {
    // End of round
    return endRound(state)
  }

  state.activePlayerId = state.turnOrder[state.turnIndex] || null
  state.phase = 'play'
  return { newRound: false }
}

/** 结束当前轮 */
function endRound(state: CombatEngineState): { newRound: boolean } {
  // Trigger round_end skills
  for (const pid of state.turnOrder) {
    const skills = state.playerSkills.get(pid) || []
    const ctx = makeContext(state, pid, pid)
    triggerPassiveSkills('round_end', pid, skills, ctx)
  }

  // Process cooldowns
  for (const skills of state.playerSkills.values()) {
    processCooldowns(skills)
  }

  // AP refreshes (handled by combat service), MP does NOT recover

  state.roundNumber++
  state.turnIndex = 0
  state.activePlayerId = state.turnOrder[0] || null
  state.phase = 'play'

  state.events.push({ type: 'round_end', playerId: '', description: `第 ${state.roundNumber - 1} 轮结束` })

  // Trigger round_start skills for new round
  for (const pid of state.turnOrder) {
    const skills = state.playerSkills.get(pid) || []
    const ctx = makeContext(state, pid, pid)
    triggerPassiveSkills('round_start', pid, skills, ctx)
  }

  return { newRound: true }
}

/** 结束战斗 */
export function endCombat(state: CombatEngineState) {
  state.isActive = false
  state.events.push({ type: 'combat_end', playerId: '', description: '战斗结束' })
}

/** 获取可序列化的状态快照（发送给客户端） */
export function getSnapshot(state: CombatEngineState) {
  return {
    roomId: state.roomId,
    roundNumber: state.roundNumber,
    turnIndex: state.turnIndex,
    turnOrder: state.turnOrder,
    phase: state.phase,
    activePlayerId: state.activePlayerId,
    playChain: state.playChain,
    isActive: state.isActive,
    participants: Array.from(state.playerStates.entries()).map(([id, ps]) => ({
      id,
      hp: ps.hp,
      hpMax: ps.hpMax,
      mp: ps.mp,
      mpMax: ps.mpMax,
      shield: ps.shield,
    })),
  }
}

// ===== Helpers =====

function makeContext(state: CombatEngineState, sourceId: string, targetId: string): EffectContext {
  return {
    sourceId,
    targetId,
    roomId: state.roomId,
    playerStates: state.playerStates,
    events: state.events,
  }
}
