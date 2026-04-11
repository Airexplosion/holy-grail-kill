/**
 * 真名系统服务
 *
 * 核心机制：
 * 1. 遭遇记录：同区域时自动记录（由行动结算/移动触发）
 * 2. 3选1猜测：遭遇过的对手可随时猜真名
 * 3. 猜中后永久可见对方五维属性（仅猜中者可见，对方不知道）
 */

import { v4 as uuid } from 'uuid'
import { eq, and, or } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { encounters, trueNameReveals, players, skillSubmissions } from '../db/schema.js'
import type { TrueNameCandidate, TrueNameGuessResult, RevealedAttributes } from 'shared'

// ── 遭遇管理 ──

/**
 * 记录两个玩家的遭遇（同区域时调用）
 * 幂等：已有记录不会重复插入
 */
export function recordEncounter(roomId: string, playerIdA: string, playerIdB: string) {
  if (playerIdA === playerIdB) return

  const db = getDb()
  const [idA, idB] = playerIdA < playerIdB ? [playerIdA, playerIdB] : [playerIdB, playerIdA]

  const existing = db.select().from(encounters)
    .where(and(eq(encounters.playerIdA, idA), eq(encounters.playerIdB, idB)))
    .get()

  if (!existing) {
    try {
      db.insert(encounters).values({
        id: uuid(),
        roomId,
        playerIdA: idA,
        playerIdB: idB,
        firstMetAt: Date.now(),
      }).run()
    } catch {
      // unique constraint — already exists, ignore
    }
  }
}

/**
 * 当玩家进入区域时，与该区域所有非GM玩家记录遭遇
 */
export function recordEncountersInRegion(roomId: string, playerId: string, regionId: string) {
  const db = getDb()
  const regionPlayers = db.select().from(players)
    .where(and(eq(players.roomId, roomId), eq(players.regionId, regionId), eq(players.isGm, false)))
    .all()

  for (const p of regionPlayers) {
    if (p.id !== playerId) {
      recordEncounter(roomId, playerId, p.id)
    }
  }
}

/**
 * 获取某玩家遇到过的所有对手ID
 */
function getEncounteredPlayerIds(playerId: string): string[] {
  const db = getDb()
  const rows = db.select().from(encounters)
    .where(or(eq(encounters.playerIdA, playerId), eq(encounters.playerIdB, playerId)))
    .all()

  const ids: string[] = []
  for (const r of rows) {
    ids.push(r.playerIdA === playerId ? r.playerIdB : r.playerIdA)
  }
  return ids
}

// ── 真名猜测 ──

/**
 * 获取某玩家可以猜测的目标列表（遭遇过 + 未猜中过）
 * 每个目标返回3选1的候选项
 */
export function getCandidates(playerId: string, roomId: string): TrueNameCandidate[] {
  const encounteredIds = getEncounteredPlayerIds(playerId)
  if (encounteredIds.length === 0) return []

  const db = getDb()
  const alreadyRevealed = db.select().from(trueNameReveals)
    .where(eq(trueNameReveals.guesserPlayerId, playerId))
    .all()
  const revealedTargetIds = new Set(alreadyRevealed.map(r => r.targetPlayerId))

  // 获取所有房间内非GM从者玩家（用于生成干扰项）
  const allServants = db.select().from(players)
    .where(and(eq(players.roomId, roomId), eq(players.isGm, false), eq(players.role, 'servant')))
    .all()

  // 收集所有不同的 sourceName（来自 flavorText/技能提交）
  const allSourceNames = collectAllSourceNames(roomId, allServants)

  const result: TrueNameCandidate[] = []

  for (const targetId of encounteredIds) {
    const target = allServants.find(p => p.id === targetId)
    if (!target) continue

    const alreadyGuessed = revealedTargetIds.has(targetId)
    const trueName = getPlayerTrueName(target)

    // 生成3选1：1个正确 + 2个干扰
    const candidates = generate3Choices(trueName, allSourceNames)

    result.push({
      targetPlayerId: targetId,
      targetDisplayName: target.displayName,
      candidates,
      alreadyGuessed,
    })
  }

  return result
}

/**
 * 执行猜测
 */
export function guess(guesserPlayerId: string, targetPlayerId: string, guessedName: string): TrueNameGuessResult {
  const db = getDb()

  // 检查是否已猜中过
  const existing = db.select().from(trueNameReveals)
    .where(and(
      eq(trueNameReveals.guesserPlayerId, guesserPlayerId),
      eq(trueNameReveals.targetPlayerId, targetPlayerId),
    ))
    .get()

  if (existing) {
    return { targetPlayerId, guessedName, correct: false }
  }

  // 检查是否遭遇过
  const [idA, idB] = guesserPlayerId < targetPlayerId
    ? [guesserPlayerId, targetPlayerId]
    : [targetPlayerId, guesserPlayerId]

  const encounter = db.select().from(encounters)
    .where(and(eq(encounters.playerIdA, idA), eq(encounters.playerIdB, idB)))
    .get()

  if (!encounter) {
    return { targetPlayerId, guessedName, correct: false }
  }

  // 获取目标真名
  const target = db.select().from(players).where(eq(players.id, targetPlayerId)).get()
  if (!target) {
    return { targetPlayerId, guessedName, correct: false }
  }

  const trueName = getPlayerTrueName(target)
  const correct = guessedName === trueName

  if (correct) {
    // 写入揭示记录
    db.insert(trueNameReveals).values({
      id: uuid(),
      guesserPlayerId,
      targetPlayerId,
      trueName,
      revealedAt: Date.now(),
    }).run()

    const attributes: RevealedAttributes = {
      str: (target.str || 'E') as any,
      end: (target.end || 'E') as any,
      agi: (target.agi || 'E') as any,
      mag: (target.mag || 'E') as any,
      luk: (target.luk || 'E') as any,
    }

    return { targetPlayerId, guessedName, correct: true, attributes }
  }

  return { targetPlayerId, guessedName, correct: false }
}

/**
 * 获取某玩家已揭示的所有目标五维（用于可见性引擎）
 */
export function getRevealedAttributes(guesserPlayerId: string): Map<string, RevealedAttributes> {
  const db = getDb()
  const reveals = db.select().from(trueNameReveals)
    .where(eq(trueNameReveals.guesserPlayerId, guesserPlayerId))
    .all()

  const result = new Map<string, RevealedAttributes>()

  for (const r of reveals) {
    const target = db.select().from(players).where(eq(players.id, r.targetPlayerId)).get()
    if (target) {
      result.set(r.targetPlayerId, {
        str: (target.str || 'E') as any,
        end: (target.end || 'E') as any,
        agi: (target.agi || 'E') as any,
        mag: (target.mag || 'E') as any,
        luk: (target.luk || 'E') as any,
      })
    }
  }

  return result
}

// ── 内部工具 ──

/**
 * 获取玩家的真名（来源角色名）
 * 从技能提交的 sourceName 读取，回退到 displayName
 */
function getPlayerTrueName(player: { id: string; displayName: string; [key: string]: any }): string {
  const db = getDb()
  const submission = db.select().from(skillSubmissions)
    .where(eq(skillSubmissions.playerId, player.id))
    .get()

  return submission?.sourceName || player.displayName
}

/**
 * 收集房间内所有可能的真名（用于生成干扰项）
 * 优先用房间内实际提交的 sourceName，不足时补预设名
 */
function collectAllSourceNames(roomId: string, allServants: any[]): string[] {
  const db = getDb()
  const names = new Set<string>()

  // 从技能提交表收集真名
  const submissions = db.select().from(skillSubmissions)
    .where(eq(skillSubmissions.roomId, roomId))
    .all()
  for (const s of submissions) {
    names.add(s.sourceName)
  }

  // 兜底：用玩家 displayName
  for (const p of allServants) {
    names.add(p.displayName)
  }

  // 不足3个时补预设名
  const fallbackNames = [
    '阿尔托莉雅', '吉尔伽美什', '库丘林', '美狄亚', '美杜莎',
    '赫拉克勒斯', '迪卢木多', '伊斯坎达尔', '诸葛孔明',
    '莫德雷德', '尼禄', '玉藻前', '斯卡哈', '梅林',
    '贞德', '冲田总司', '岩窟王', '奈亚子', '两仪式',
  ]
  if (names.size < 3) {
    for (const n of fallbackNames) {
      names.add(n)
      if (names.size >= 10) break
    }
  }

  return [...names]
}

/**
 * 生成3选1候选项：1个正确 + 2个随机干扰
 */
function generate3Choices(trueName: string, allNames: string[]): string[] {
  const distractors = allNames.filter(n => n !== trueName)

  // 随机选2个干扰项
  const shuffled = [...distractors].sort(() => Math.random() - 0.5)
  const picked = shuffled.slice(0, 2)

  // 合并并打乱顺序
  const choices = [trueName, ...picked]
  return choices.sort(() => Math.random() - 0.5)
}
