/**
 * 技能沙盒引擎 — 完全可观测的战斗会话
 */

import { v4 as uuid } from 'uuid'
import type {
  ArenaCharacterState, ArenaCardZones, ArenaCard,
  ArenaLogEntry, ArenaSnapshot, ArenaSkillState,
  DamageBreakdown, EffectStepTrace, DummyBehavior,
} from 'shared'
import { calcStrikeDamage } from './damage-calculator.js'
import type { DamageType } from 'shared'
import { fisherYatesShuffle } from '../utils/shuffle.js'

export interface ArenaSession {
  id: string
  accountId: string
  round: number
  phase: 'player_turn' | 'dummy_turn' | 'resolve' | 'round_end' | 'ended'
  player: MutableCharState
  dummy: MutableCharState
  dummyBehavior: DummyBehavior
  playerDeck: ArenaCard[]
  playerHand: ArenaCard[]
  playerDiscard: ArenaCard[]
  dummyDeck: ArenaCard[]
  dummyHand: ArenaCard[]
  dummyDiscard: ArenaCard[]
  skills: ArenaSkillRuntime[]
  logs: ArenaLogEntry[]
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
  const shuffled = fisherYatesShuffle(playerDeck)
  const hand = shuffled.slice(0, 5)
  const deck = shuffled.slice(5)

  const dummyDeck = buildDeck({ red: 8, blue: 8, green: 8 })
  const dummyShuffled = fisherYatesShuffle(dummyDeck)

  const session: ArenaSession = {
    id, accountId, round: 1,
    phase: 'player_turn',
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
    playerDeck: deck, playerHand: hand, playerDiscard: [],
    dummyDeck: dummyShuffled.slice(5), dummyHand: dummyShuffled.slice(0, 5), dummyDiscard: [],
    skills: config.skills || [],
    logs: [],
    createdAt: Date.now(),
  }

  session.logs.push(makeLog(session, 'player', 'phase', '沙盒战斗开始'))
  sessions.set(id, session)
  return session
}

export function getSession(sessionId: string): ArenaSession | null {
  return sessions.get(sessionId) ?? null
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId)
}

// ── 行动处理 ──

export function playStrike(session: ArenaSession, color: string): { snapshot: ArenaSnapshot; breakdown?: DamageBreakdown } {
  if (session.phase !== 'player_turn') throw new Error('不是玩家回合')

  // 找手牌中该颜色的牌
  const cardIdx = session.playerHand.findIndex(c => c.color === color)
  if (cardIdx === -1) throw new Error(`手牌中没有${color}牌`)
  if (session.player.mp <= 0) throw new Error('MP不足')

  const card = session.playerHand.splice(cardIdx, 1)[0]!
  session.playerDiscard.push(card)
  session.player.mp -= 1
  session.player.actionsRemaining -= 1

  // 伤害计算
  const dmg = calcStrikeDamage(
    session.player.baseDamage,
    session.player.amplification,
    session.player.superAmplification,
    session.dummy.reduction,
    session.dummy.ac,
    'normal' as DamageType,
  )

  session.dummy.hp = Math.max(0, session.dummy.hp - dmg.finalDamage)

  const breakdown: DamageBreakdown = {
    baseDamage: session.player.baseDamage,
    amplification: dmg.amplified,
    superAmplification: session.player.superAmplification,
    reduction: dmg.reduced,
    shieldAbsorbed: dmg.shieldAbsorbed,
    acAbsorbed: dmg.acAbsorbed,
    finalDamage: dmg.finalDamage,
    damageType: 'normal',
    formula: `${session.player.baseDamage} + ${dmg.amplified}增伤 - ${dmg.reduced}减伤 - ${dmg.shieldAbsorbed}护盾 - ${dmg.acAbsorbed}AC = ${dmg.finalDamage}`,
  }

  session.logs.push(makeLog(session, 'player', 'strike', `打出 ${color}击，造成 ${dmg.finalDamage} 伤害`))
  session.logs.push(makeLog(session, 'player', 'damage', breakdown.formula, breakdown))

  if (session.dummy.hp <= 0) {
    session.phase = 'ended'
    session.logs.push(makeLog(session, 'player', 'phase', '木头人被击败！'))
  } else if (session.player.actionsRemaining <= 0) {
    switchToDummy(session)
  }

  return { snapshot: getSnapshot(session), breakdown }
}

export function playerPass(session: ArenaSession): ArenaSnapshot {
  if (session.phase !== 'player_turn') throw new Error('不是玩家回合')
  session.logs.push(makeLog(session, 'player', 'pass', '结束回合'))
  switchToDummy(session)
  return getSnapshot(session)
}

export function advanceRound(session: ArenaSession): ArenaSnapshot {
  session.round++
  session.player.actionsRemaining = session.player.actionsMax
  session.dummy.actionsRemaining = session.dummy.actionsMax
  session.player.mp = Math.min(session.player.mp + 1, session.player.mpMax)
  session.dummy.mp = Math.min(session.dummy.mp + 1, session.dummy.mpMax)

  // 抽牌
  drawCards(session.playerDeck, session.playerHand, session.playerDiscard, 1, '玩家')
  drawCards(session.dummyDeck, session.dummyHand, session.dummyDiscard, 1, '木头人')

  // CD减少
  for (const s of session.skills) {
    if (s.cooldownRemaining > 0) s.cooldownRemaining--
  }

  session.phase = 'player_turn'
  session.logs.push(makeLog(session, 'player', 'phase', `第 ${session.round} 轮开始`))
  return getSnapshot(session)
}

// ── 木头人AI ──

function switchToDummy(session: ArenaSession) {
  session.phase = 'dummy_turn'
  executeDummyTurn(session)
}

function executeDummyTurn(session: ArenaSession) {
  const dummy = session.dummy
  if (session.dummyBehavior === 'passive') {
    session.logs.push(makeLog(session, 'dummy', 'pass', '木头人保持沉默'))
    endRound(session)
    return
  }

  // 木头人攻击
  while (dummy.actionsRemaining > 0 && dummy.mp > 0 && session.dummyHand.length > 0) {
    const card = session.dummyHand[0]!
    session.dummyHand.splice(0, 1)
    session.dummyDiscard.push(card)
    dummy.mp -= 1
    dummy.actionsRemaining -= 1

    const dmg = calcStrikeDamage(
      dummy.baseDamage, dummy.amplification, dummy.superAmplification,
      session.player.reduction, session.player.ac, 'normal' as DamageType,
    )

    session.player.hp = Math.max(0, session.player.hp - dmg.finalDamage)

    session.logs.push(makeLog(session, 'dummy', 'strike', `木头人打出 ${card.color}击，造成 ${dmg.finalDamage} 伤害`))

    if (session.player.hp <= 0) {
      session.phase = 'ended'
      session.logs.push(makeLog(session, 'dummy', 'phase', '玩家被击败！'))
      return
    }

    if (session.dummyBehavior === 'defensive') break // 防守型只打一次
  }

  endRound(session)
}

function endRound(session: ArenaSession) {
  session.logs.push(makeLog(session, 'player', 'phase', `第 ${session.round} 轮结束`))
  session.phase = 'round_end'
}

// ── 工具函数 ──

function buildDeck(strikes: { red: number; blue: number; green: number }): ArenaCard[] {
  const cards: ArenaCard[] = []
  for (let i = 0; i < strikes.red; i++) cards.push({ id: uuid(), name: '红击', color: 'red', source: 'initial' })
  for (let i = 0; i < strikes.blue; i++) cards.push({ id: uuid(), name: '蓝击', color: 'blue', source: 'initial' })
  for (let i = 0; i < strikes.green; i++) cards.push({ id: uuid(), name: '绿击', color: 'green', source: 'initial' })
  return cards
}

function drawCards(deck: ArenaCard[], hand: ArenaCard[], discard: ArenaCard[], count: number, _who: string) {
  for (let i = 0; i < count; i++) {
    if (deck.length === 0) {
      // 洗牌
      deck.push(...fisherYatesShuffle(discard.splice(0)))
    }
    if (deck.length > 0) {
      hand.push(deck.shift()!)
    }
  }
}

function makeLog(session: ArenaSession, actor: 'player' | 'dummy', type: ArenaLogEntry['type'], message: string, details?: any): ArenaLogEntry {
  return { id: uuid(), timestamp: Date.now(), round: session.round, actor, type, message, details }
}

export function getSnapshot(session: ArenaSession): ArenaSnapshot {
  return {
    sessionId: session.id,
    round: session.round,
    phase: session.phase,
    player: { ...session.player },
    dummy: { ...session.dummy },
    playerCards: {
      hand: [...session.playerHand],
      deck: [...session.playerDeck],
      discard: [...session.playerDiscard],
      nextDraw: session.playerDeck[0] ?? null,
    },
    dummyCards: {
      hand: [...session.dummyHand],
      deck: [...session.dummyDeck],
      discard: [...session.dummyDiscard],
      nextDraw: session.dummyDeck[0] ?? null,
    },
    playerSkills: session.skills.map(s => ({
      ...s, usable: s.cooldownRemaining === 0, effects: s.effects,
    })),
    logs: session.logs.slice(-50),
  }
}
