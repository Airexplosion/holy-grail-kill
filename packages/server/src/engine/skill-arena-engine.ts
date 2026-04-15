/**
 * 技能沙盒引擎 v2 — 完全可观测，支持响应、技能、正确的战斗轮
 *
 * 战斗轮流程：
 * 1. 玩家行动阶段：可出牌(→等待响应)/用技能/pass
 * 2. 木头人行动阶段：自动出牌(→玩家可响应)/pass
 * 3. 轮结束：检查战斗持续条件，进入下一轮
 *
 * 响应：被攻击方可以打对应克制色的牌来抵消攻击
 */

import { v4 as uuid } from 'uuid'
import type {
  ArenaCharacterState, ArenaCardZones, ArenaCard,
  ArenaLogEntry, ArenaSnapshot, ArenaSkillState,
  DamageBreakdown, EffectStepTrace, DummyBehavior,
} from 'shared'
import { calcStrikeDamage } from './damage-calculator.js'
import { STRIKE_COUNTER } from 'shared'
import type { DamageType, StrikeColor } from 'shared'
import { fisherYatesShuffle } from '../utils/shuffle.js'

// ── 类型 ──

type Phase = 'player_action' | 'player_respond' | 'dummy_action' | 'dummy_respond' | 'round_end' | 'ended'

export interface ArenaSession {
  id: string
  accountId: string
  round: number
  phase: Phase
  /** 待结算的攻击（出牌后等待响应） */
  pendingStrike: { attackerIsPlayer: boolean; color: string; damage: number } | null
  player: MutableCharState
  dummy: MutableCharState
  dummyBehavior: DummyBehavior
  playerDeck: ArenaCard[]; playerHand: ArenaCard[]; playerDiscard: ArenaCard[]
  dummyDeck: ArenaCard[]; dummyHand: ArenaCard[]; dummyDiscard: ArenaCard[]
  skills: ArenaSkillRuntime[]
  logs: ArenaLogEntry[]
  /** 本轮是否有有色攻击造成伤害（战斗持续条件） */
  colorDamageThisRound: boolean
  createdAt: number
}

interface MutableCharState {
  name: string; hp: number; hpMax: number; mp: number; mpMax: number
  ac: number; baseDamage: number; amplification: number; superAmplification: number
  reduction: number; shield: number; actions: number; actionsMax: number; actionsRemaining: number
}

interface ArenaSkillRuntime {
  id: string; name: string; type: string; cooldown: number; cooldownRemaining: number
  description: string; effects: { effectType: string; params: Record<string, unknown> }[]
  cost?: { mp?: number; hp?: number }
}

// ── 会话管理 ──

const sessions = new Map<string, ArenaSession>()

export function createSession(
  accountId: string,
  config: {
    dummyName?: string; dummyHp?: number; dummyMp?: number; dummyAc?: number; dummyDamage?: number
    dummyBehavior?: DummyBehavior
    playerHp?: number; playerMp?: number; playerAc?: number; playerDamage?: number
    strikeCards?: { red: number; blue: number; green: number }
    skills?: ArenaSkillRuntime[]
  },
): ArenaSession {
  const id = uuid()
  const strikes = config.strikeCards || { red: 8, blue: 8, green: 8 }

  const playerDeck = buildDeck(strikes)

  // [卡牌N] 类技能：在创建时就把卡加入牌库
  if (config.skills) {
    for (const skill of config.skills) {
      for (const eff of skill.effects) {
        if (eff.effectType === 'addTempCard') {
          const count = (eff.params.count as number) || 1
          const color = (eff.params.color as string) || 'colorless'
          const cardName = (eff.params.name as string) || skill.name
          for (let i = 0; i < count; i++) {
            playerDeck.push({ id: uuid(), name: cardName, color, source: 'skill', sourceSkillName: skill.name })
          }
        }
      }
    }
  }

  const shuffledP = fisherYatesShuffle(playerDeck)
  const dummyDeck = buildDeck({ red: 8, blue: 8, green: 8 })
  const shuffledD = fisherYatesShuffle(dummyDeck)

  const session: ArenaSession = {
    id, accountId, round: 1, phase: 'player_action', pendingStrike: null,
    player: {
      name: '玩家', hp: config.playerHp ?? 40, hpMax: config.playerHp ?? 40,
      mp: config.playerMp ?? 4, mpMax: config.playerMp ?? 4,
      ac: config.playerAc ?? 0, baseDamage: config.playerDamage ?? 4,
      amplification: 0, superAmplification: 0, reduction: 0, shield: 0,
      actions: 4, actionsMax: 4, actionsRemaining: 4,
    },
    dummy: {
      name: config.dummyName || '木头人', hp: config.dummyHp ?? 100, hpMax: config.dummyHp ?? 100,
      mp: config.dummyMp ?? 4, mpMax: config.dummyMp ?? 4,
      ac: config.dummyAc ?? 0, baseDamage: config.dummyDamage ?? 3,
      amplification: 0, superAmplification: 0, reduction: 0, shield: 0,
      actions: 3, actionsMax: 3, actionsRemaining: 3,
    },
    dummyBehavior: config.dummyBehavior || 'aggressive',
    playerDeck: shuffledP.slice(5), playerHand: shuffledP.slice(0, 5), playerDiscard: [],
    dummyDeck: shuffledD.slice(5), dummyHand: shuffledD.slice(0, 5), dummyDiscard: [],
    skills: config.skills || [], logs: [], colorDamageThisRound: false, createdAt: Date.now(),
  }
  session.logs.push(log(session, 'player', 'phase', `第 ${session.round} 轮开始 — 你的行动`))
  sessions.set(id, session)
  return session
}

export function getSession(id: string): ArenaSession | null { return sessions.get(id) ?? null }
export function deleteSession(id: string): void { sessions.delete(id) }

// ── 玩家行动 ──

export function playStrike(session: ArenaSession, color: string): { snapshot: ArenaSnapshot; breakdown?: DamageBreakdown } {
  assertPhase(session, 'player_action')
  const card = removeCard(session.playerHand, color)
  if (!card) throw new Error(`没有${color}牌`)
  if (session.player.mp <= 0) throw new Error('MP不足')
  session.playerDiscard.push(card)
  session.player.mp -= 1
  session.player.actionsRemaining -= 1

  session.logs.push(log(session, 'player', 'strike', `打出 ${card.name}`))

  // 检查木头人能否响应
  const responseColor = STRIKE_COUNTER[color as StrikeColor]
  const canRespond = responseColor && session.dummyHand.some(c => c.color === responseColor)

  if (canRespond && session.dummyBehavior !== 'passive') {
    // 木头人自动响应（aggressive/random会响应，defensive也会）
    const respCard = removeCard(session.dummyHand, responseColor!)
    if (respCard) {
      session.dummyDiscard.push(respCard)
      session.logs.push(log(session, 'dummy', 'respond', `木头人用 ${respCard.name} 响应，攻击被抵消`))
      return { snapshot: getSnapshot(session) }
    }
  }

  // 未响应 → 造成伤害
  const breakdown = applyStrikeDamage(session, session.player, session.dummy, color)
  checkDeath(session)
  return { snapshot: getSnapshot(session), breakdown }
}

export function useSkill(session: ArenaSession, skillId: string): { snapshot: ArenaSnapshot; trace?: EffectStepTrace[] } {
  assertPhase(session, 'player_action')
  const skill = session.skills.find(s => s.id === skillId)
  if (!skill) throw new Error('技能不存在')
  if (skill.cooldownRemaining > 0) throw new Error(`技能冷却中 (${skill.cooldownRemaining}轮)`)

  // 消耗
  const mpCost = skill.cost?.mp || 0
  const hpCost = skill.cost?.hp || 0
  if (session.player.mp < mpCost) throw new Error('MP不足')
  session.player.mp -= mpCost
  session.player.hp -= hpCost
  session.player.actionsRemaining -= 1
  skill.cooldownRemaining = skill.cooldown

  // 执行效果链（简化版：逐个应用）
  const trace: EffectStepTrace[] = []
  for (let i = 0; i < skill.effects.length; i++) {
    const eff = skill.effects[i]!
    const before = { hp: session.dummy.hp, mp: session.dummy.mp, shield: session.dummy.shield, ac: session.dummy.ac }

    const result = applyEffect(session, eff.effectType, eff.params)

    const after = { hp: session.dummy.hp, mp: session.dummy.mp, shield: session.dummy.shield, ac: session.dummy.ac }
    trace.push({ stepIndex: i, effectType: eff.effectType, params: eff.params, result, stateBefore: before, stateAfter: after })
  }

  session.logs.push(log(session, 'player', 'skill', `使用技能: ${skill.name}`, trace))
  checkDeath(session)
  return { snapshot: getSnapshot(session), trace }
}

export function playerPass(session: ArenaSession): ArenaSnapshot {
  assertPhase(session, 'player_action')
  session.logs.push(log(session, 'player', 'pass', '结束本轮行动'))
  session.phase = 'dummy_action'
  executeDummyActions(session)
  return getSnapshot(session)
}

/** 玩家响应木头人的攻击 */
export function playerRespond(session: ArenaSession, color?: string): { snapshot: ArenaSnapshot; breakdown?: DamageBreakdown } {
  assertPhase(session, 'player_respond')
  const strike = session.pendingStrike
  if (!strike) throw new Error('没有待响应的攻击')

  if (color) {
    const expectedResp = STRIKE_COUNTER[strike.color as StrikeColor]
    if (color !== expectedResp) throw new Error(`${strike.color}击只能用${expectedResp}响应`)
    const card = removeCard(session.playerHand, color)
    if (!card) throw new Error(`没有${color}牌`)
    session.playerDiscard.push(card)
    session.logs.push(log(session, 'player', 'respond', `用 ${card.name} 响应，攻击被抵消`))
    session.pendingStrike = null
    session.phase = 'dummy_action'
    continueDummyActions(session)
    return { snapshot: getSnapshot(session) }
  }

  // 不响应 → 受到伤害
  session.logs.push(log(session, 'player', 'respond', '选择不响应'))
  const breakdown = applyStrikeDamage(session, session.dummy, session.player, strike.color)
  session.pendingStrike = null
  checkDeath(session)
  if (session.phase !== 'ended') {
    session.phase = 'dummy_action'
    continueDummyActions(session)
  }
  return { snapshot: getSnapshot(session), breakdown }
}

/** 手动推进到下一轮（round_end 时调用） */
export function advanceRound(session: ArenaSession): ArenaSnapshot {
  assertPhase(session, 'round_end')
  session.round++
  session.player.actionsRemaining = session.player.actionsMax
  session.dummy.actionsRemaining = session.dummy.actionsMax
  session.colorDamageThisRound = false

  // MP恢复（+1，不超上限）
  session.player.mp = Math.min(session.player.mp + 1, session.player.mpMax)
  session.dummy.mp = Math.min(session.dummy.mp + 1, session.dummy.mpMax)

  // 抽牌
  drawTo(session.playerDeck, session.playerHand, session.playerDiscard, 1)
  drawTo(session.dummyDeck, session.dummyHand, session.dummyDiscard, 1)

  // CD-1
  for (const s of session.skills) {
    if (s.cooldownRemaining > 0) s.cooldownRemaining--
  }

  session.phase = 'player_action'
  session.logs.push(log(session, 'player', 'phase', `第 ${session.round} 轮开始 — 你的行动`))
  return getSnapshot(session)
}

// ── 木头人AI ──

function executeDummyActions(session: ArenaSession) {
  if (session.dummyBehavior === 'passive') {
    session.logs.push(log(session, 'dummy', 'pass', '木头人不行动'))
    endRound(session)
    return
  }
  continueDummyActions(session)
}

function continueDummyActions(session: ArenaSession) {
  const d = session.dummy
  if (session.phase === 'ended') return

  while (d.actionsRemaining > 0 && d.mp > 0 && session.dummyHand.length > 0) {
    // 选一张牌攻击
    const card = session.dummyHand[0]!
    session.dummyHand.splice(0, 1)
    session.dummyDiscard.push(card)
    d.mp -= 1
    d.actionsRemaining -= 1

    session.logs.push(log(session, 'dummy', 'strike', `木头人打出 ${card.name}`))

    // 检查玩家能否响应
    const responseColor = STRIKE_COUNTER[card.color as StrikeColor]
    const playerCanRespond = responseColor && session.playerHand.some(c => c.color === responseColor)

    if (playerCanRespond) {
      // 等待玩家响应
      session.pendingStrike = { attackerIsPlayer: false, color: card.color, damage: d.baseDamage }
      session.phase = 'player_respond'
      session.logs.push(log(session, 'dummy', 'phase', `等待你的响应 (${responseColor}击可抵消)`))
      return // 暂停，等玩家操作
    }

    // 玩家无法响应 → 直接造成伤害
    applyStrikeDamage(session, d, session.player, card.color)
    if (checkDeath(session)) return

    if (session.dummyBehavior === 'defensive') break
  }

  session.logs.push(log(session, 'dummy', 'pass', '木头人行动结束'))
  endRound(session)
}

function endRound(session: ArenaSession) {
  session.logs.push(log(session, 'player', 'phase', `第 ${session.round} 轮结束`))
  session.phase = 'round_end'
}

// ── 伤害/效果 ──

function applyStrikeDamage(session: ArenaSession, attacker: MutableCharState, defender: MutableCharState, color: string): DamageBreakdown {
  const dmg = calcStrikeDamage(
    attacker.baseDamage, attacker.amplification, attacker.superAmplification,
    defender.reduction, defender.ac, 'normal' as DamageType,
  )
  defender.hp = Math.max(0, defender.hp - dmg.finalDamage)
  session.colorDamageThisRound = true

  const breakdown: DamageBreakdown = {
    baseDamage: attacker.baseDamage, amplification: dmg.amplified,
    superAmplification: attacker.superAmplification,
    reduction: dmg.reduced, shieldAbsorbed: dmg.shieldAbsorbed, acAbsorbed: dmg.acAbsorbed,
    finalDamage: dmg.finalDamage, damageType: 'normal',
    formula: `${attacker.baseDamage}基础 +${dmg.amplified}增伤 -${dmg.reduced}减伤 -${dmg.shieldAbsorbed}护盾 -${dmg.acAbsorbed}AC = ${dmg.finalDamage}`,
  }
  session.logs.push(log(session, attacker === session.player ? 'player' : 'dummy', 'damage', breakdown.formula, breakdown))
  return breakdown
}

function applyEffect(session: ArenaSession, effectType: string, params: Record<string, unknown>): { success: boolean; value?: number; description: string } {
  const value = (params.value as number) || 0
  const target = (params.target === 'self') ? session.player : session.dummy

  switch (effectType) {
    case 'damage': target.hp = Math.max(0, target.hp - value); return { success: true, value, description: `造成 ${value} 伤害` }
    case 'heal': { const h = Math.min(value, target.hpMax - target.hp); target.hp += h; return { success: true, value: h, description: `回复 ${h} HP` } }
    case 'shield': target.shield += value; return { success: true, value, description: `获得 ${value} 护盾` }
    case 'gainAC': target.ac += value; return { success: true, value, description: `获得 ${value} AC` }
    case 'amplify': { const ampVal = (params.multiplier as number) || value || 0; session.player.amplification += ampVal; return { success: true, value: ampVal, description: `增伤 +${ampVal}` } }
    case 'damageReductionGain': session.player.reduction += value; return { success: true, value, description: `减伤 +${value}` }
    case 'draw': { const drawN = (params.count as number) || value || 1; drawTo(session.playerDeck, session.playerHand, session.playerDiscard, drawN); return { success: true, value: drawN, description: `抽 ${drawN} 张牌` } }
    case 'discard': { const discN = (params.count as number) || value || 1; const removed = session.playerHand.splice(0, discN); session.playerDiscard.push(...removed); return { success: true, value: removed.length, description: `弃置 ${removed.length} 张牌` } }
    case 'removeShield': { const s = target.shield; target.shield = 0; return { success: true, value: s, description: `移除 ${s} 护盾` } }
    case 'addTempCard': {
      const count = (params.count as number) || 1
      const color = (params.color as string) || 'colorless'
      const cardName = (params.name as string) || `${color}牌`
      const toHand = params.toHand === true
      for (let i = 0; i < count; i++) {
        const card: ArenaCard = { id: uuid(), name: cardName, color, source: 'skill', sourceSkillName: params.sourceSkillName as string }
        if (toHand) { session.playerHand.push(card) } else { session.playerDeck.unshift(card) }
      }
      const dest = toHand ? '手牌' : '牌库顶部'
      return { success: true, value: count, description: `加入 ${count} 张 ${cardName} 到${dest}` }
    }
    case 'retrieveDiscard': {
      const count2 = (params.count as number) || 1
      const recovered = session.playerDiscard.splice(0, count2)
      session.playerHand.push(...recovered.map(c => ({ ...c, source: 'recovered' as const })))
      return { success: true, value: recovered.length, description: `从弃牌堆回收 ${recovered.length} 张` }
    }
    case 'forceDiscard': {
      const fc = (params.count as number) || 1
      const tgt = params.target === 'self' ? session.playerHand : session.dummyHand
      const tgtDiscard = params.target === 'self' ? session.playerDiscard : session.dummyDiscard
      const fd = tgt.splice(0, fc)
      tgtDiscard.push(...fd)
      return { success: true, value: fd.length, description: `强制弃置 ${fd.length} 张` }
    }
    case 'freeStrike': {
      // 免费攻击一次
      const fColor = (params.color as string) || 'red'
      const fDmg = calcStrikeDamage(session.player.baseDamage, session.player.amplification, session.player.superAmplification, session.dummy.reduction, session.dummy.ac, 'normal' as DamageType)
      session.dummy.hp = Math.max(0, session.dummy.hp - fDmg.finalDamage)
      return { success: true, value: fDmg.finalDamage, description: `免费${fColor}击，造成 ${fDmg.finalDamage} 伤害` }
    }
    case 'overrideDamageType': { session.player.amplification += 0; return { success: true, description: `伤害类型覆盖: ${params.damageType}` } }
    case 'modifyActions': { session.player.actionsRemaining += value; session.player.actionsMax += value; return { success: true, value, description: `动作数 +${value}` } }
    case 'modifyResponseDifficulty': return { success: true, description: `响应难度修改` }
    case 'setFlag': return { success: true, description: `标记: ${params.flag}` }
    case 'conditional': return { success: true, description: `条件检查: ${params.flag}` }
    case 'hpThresholdTrigger': return { success: true, description: `HP阈值检查` }
    case 'negateEffect': return { success: true, description: `无效化效果` }
    case 'chargeGain': return { success: true, description: `充能 +${value}` }
    case 'superAmplify': { session.player.superAmplification += value; return { success: true, value, description: `超级增伤 +${value}` } }
    case 'reflect': { session.dummy.hp = Math.max(0, session.dummy.hp - value); return { success: true, value, description: `反弹 ${value} 伤害` } }
    case 'stealth': return { success: true, description: '进入隐匿' }
    case 'preventDeath': return { success: true, description: '防止死亡' }
    case 'immuneToScout': return { success: true, description: '免疫侦查' }

    // ── 以下为补全的19种效果处理 ──

    case 'trueDamage': {
      // 真实伤害：无视护盾/AC/减伤，直接扣HP
      const multiplier = (params.multiplier as number) || 1
      const fixedVal = (params.fixedValue as number) || 0
      const targetSelf = params.targetSelf === true
      const tgt = targetSelf ? session.player : session.dummy
      const baseDmg = session.player.baseDamage
      const totalDmg = fixedVal > 0 ? fixedVal : baseDmg * multiplier
      tgt.hp = Math.max(0, tgt.hp - totalDmg)
      return { success: true, value: totalDmg, description: `真实伤害 ${totalDmg}` }
    }
    case 'addTempCardByKills': {
      // 按击杀数生成临时牌（沙盒中击杀数=0，只生成baseCount张）
      const baseCount = (params.baseCount as number) || 1
      const color = (params.color as string) || 'colorless'
      for (let i = 0; i < baseCount; i++) {
        session.playerHand.push({ id: uuid(), name: `临时${color}牌`, color, source: 'skill' })
      }
      return { success: true, value: baseCount, description: `生成 ${baseCount} 张临时牌 (击杀0+基础${baseCount})` }
    }
    case 'lockMajorityColorResponse': {
      // 被动：锁定目标最多颜色响应（沙盒标记）
      return { success: true, description: '被动激活：锁定目标多数颜色响应' }
    }
    case 'crawlingChaosRandom': {
      // 伏行之混沌：随机4选1能力（沙盒中简化模拟）
      const roll = Math.floor(Math.random() * 4) + 1
      const descs = ['额外相邻移动', '侦查隐匿', '侦查+2/行动-1', '备战免费无色攻击(响应难度1)']
      return { success: true, value: roll, description: `伏行之混沌: ${descs[roll - 1]}` }
    }
    case 'healByMpMax': {
      // 按MP上限倍率回血
      const mult = (params.multiplier as number) || 5
      const healAmt = session.player.mpMax * mult
      const healed = Math.min(healAmt, session.player.hpMax - session.player.hp)
      session.player.hp += healed
      return { success: true, value: healed, description: `回复 ${healed} HP (MP上限${session.player.mpMax}×${mult})` }
    }
    case 'conditionalRedraw': {
      // 条件弃抽
      const cnt = (params.count as number) || 1
      const removed = session.playerHand.splice(0, cnt)
      session.playerDiscard.push(...removed)
      drawTo(session.playerDeck, session.playerHand, session.playerDiscard, cnt)
      return { success: true, value: cnt, description: `弃抽 ${cnt} 张` }
    }
    case 'globalUnknownAttack': {
      // 全体颜色不明攻击（沙盒中对木头人1次）
      const hpLoss = Math.floor(Math.random() * 10) + 1
      session.dummy.hp = Math.max(0, session.dummy.hp - hpLoss)
      return { success: true, value: hpLoss, description: `颜色不明攻击，流失 ${hpLoss} HP` }
    }
    case 'mpSpendHeal': {
      // MP消耗回血（被动标记）
      return { success: true, description: '被动激活：MP消耗回血' }
    }
    case 'colorBranchAttack': {
      // 按颜色分支（沙盒中简化：造成普通伤害）
      const branchDmg = calcStrikeDamage(session.player.baseDamage, session.player.amplification, session.player.superAmplification, session.dummy.reduction, session.dummy.ac, 'normal' as DamageType)
      session.dummy.hp = Math.max(0, session.dummy.hp - branchDmg.finalDamage)
      return { success: true, value: branchDmg.finalDamage, description: `颜色分支攻击，造成 ${branchDmg.finalDamage} 伤害` }
    }
    case 'conditionalExtraMp': {
      // 条件获得额外MP
      const mpVal = (params.value as number) || 1
      session.player.mp = Math.min(session.player.mp + mpVal, session.player.mpMax + mpVal)
      return { success: true, value: mpVal, description: `获得 ${mpVal} 额外MP` }
    }
    case 'pullToCombat': {
      // 拉远处角色入战斗（沙盒中无意义，标记即可）
      const maxLoc = (params.maxLocations as number) || 3
      return { success: true, description: `拉至多${maxLoc}处角色入战斗` }
    }
    case 'noDamageStrike': {
      // 攻击不造成伤害标记
      return { success: true, description: '本次攻击不造成伤害' }
    }
    case 'aoeForceDiscardToOne': {
      // 全场弃牌至1张（沙盒中对木头人执行）
      const mpCost = (params.mpCost as number) || 10
      if (session.player.mp < mpCost) {
        return { success: false, description: `MP不足(需${mpCost})` }
      }
      session.player.mp -= mpCost
      const discardN = Math.max(0, session.dummyHand.length - 1)
      const discarded = session.dummyHand.splice(0, discardN)
      session.dummyDiscard.push(...discarded)
      return { success: true, value: discardN, description: `消耗${mpCost}MP，木头人弃置${discardN}张至剩1张` }
    }
    case 'luckyDraw': {
      // 幸运摸牌
      const diceSides = parseInt(((params.dice as string) || 'd6').replace('d', '')) || 6
      const threshold = (params.threshold as number) || 4
      const bonusThreshold = (params.bonusThreshold as number) || 6
      const roll = Math.floor(Math.random() * diceSides) + 1
      let drawCount = 0
      if (roll >= threshold) drawCount++
      if (roll >= bonusThreshold) drawCount++
      if (drawCount > 0) drawTo(session.playerDeck, session.playerHand, session.playerDiscard, drawCount)
      return { success: drawCount > 0, value: drawCount, description: `掷${roll}${drawCount > 0 ? `，摸${drawCount}张` : '，未触发'}` }
    }
    case 'hpForMp': {
      // HP替代MP消耗标记
      return { success: true, description: `HP替代MP (${params.hpCost}HP省${params.mpSaved}MP)` }
    }
    case 'modifyAgility': {
      // 敏捷修正（沙盒中标记即可）
      return { success: true, description: `敏捷修正 +${params.value}` }
    }
    case 'modifyActionPoints': {
      // 行动点修正
      session.player.actionsRemaining += value
      session.player.actionsMax += value
      return { success: true, value, description: `行动点 +${value}` }
    }
    case 'move': {
      // 移动（沙盒中无地图，标记即可）
      return { success: true, description: `移动: ${params.type}` }
    }
    case 'vision': {
      // 侦查（沙盒中标记即可）
      return { success: true, description: `侦查: ${params.reveal}` }
    }

    default: return { success: true, description: `${effectType} (未实现沙盒效果)` }
  }
}

function checkDeath(session: ArenaSession): boolean {
  if (session.dummy.hp <= 0) { session.phase = 'ended'; session.logs.push(log(session, 'player', 'phase', '木头人被击败！')); return true }
  if (session.player.hp <= 0) { session.phase = 'ended'; session.logs.push(log(session, 'dummy', 'phase', '你被击败！')); return true }
  return false
}

// ── 工具 ──

function buildDeck(strikes: { red: number; blue: number; green: number }): ArenaCard[] {
  const cards: ArenaCard[] = []
  for (let i = 0; i < strikes.red; i++) cards.push({ id: uuid(), name: '红击', color: 'red', source: 'initial' })
  for (let i = 0; i < strikes.blue; i++) cards.push({ id: uuid(), name: '蓝击', color: 'blue', source: 'initial' })
  for (let i = 0; i < strikes.green; i++) cards.push({ id: uuid(), name: '绿击', color: 'green', source: 'initial' })
  return cards
}

function removeCard(hand: ArenaCard[], color: string): ArenaCard | null {
  const idx = hand.findIndex(c => c.color === color)
  if (idx === -1) return null
  return hand.splice(idx, 1)[0]!
}

function drawTo(deck: ArenaCard[], hand: ArenaCard[], discard: ArenaCard[], count: number) {
  for (let i = 0; i < count; i++) {
    if (deck.length === 0) deck.push(...fisherYatesShuffle(discard.splice(0)))
    if (deck.length > 0) hand.push(deck.shift()!)
  }
}

function log(session: ArenaSession, actor: 'player' | 'dummy', type: ArenaLogEntry['type'], message: string, details?: any): ArenaLogEntry {
  return { id: uuid(), timestamp: Date.now(), round: session.round, actor, type, message, details }
}

function assertPhase(session: ArenaSession, expected: Phase) {
  if (session.phase !== expected) throw new Error(`当前阶段是 ${session.phase}，不是 ${expected}`)
}

export function getSnapshot(session: ArenaSession): ArenaSnapshot {
  return {
    sessionId: session.id, round: session.round,
    phase: session.phase as any,
    player: { ...session.player }, dummy: { ...session.dummy },
    playerCards: { hand: [...session.playerHand], deck: [...session.playerDeck], discard: [...session.playerDiscard], nextDraw: session.playerDeck[0] ?? null },
    dummyCards: { hand: [...session.dummyHand], deck: [...session.dummyDeck], discard: [...session.dummyDiscard], nextDraw: session.dummyDeck[0] ?? null },
    playerSkills: session.skills.map(s => ({ ...s, usable: s.cooldownRemaining === 0 && session.player.mp >= (s.cost?.mp || 0), effects: s.effects })),
    logs: session.logs.slice(-80),
    lastTrace: undefined, lastDamageBreakdown: undefined,
  }
}
