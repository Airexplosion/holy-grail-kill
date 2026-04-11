/**
 * 地图池服务 (Skill Pool / Map Pool)
 *
 * 核心职责：
 * 1. 轮抓结束后将弃牌+未选技能入池，生成全员可见快照
 * 2. 战斗结束后触发抽取（随机2张）
 * 3. 管理技能替换（基础2次 + 击杀奖励）
 */

import { v4 as uuid } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { skillPool, skillPoolSnapshot, playerReplaceTrackers, playerSkills } from '../db/schema.js'
import { BASE_REPLACEMENT_COUNT, POOL_DRAW_COUNT } from 'shared'
import type { PoolSkillEntry, PoolSnapshotEntry, PoolDrawResult, SkillReplaceResult, PlayerReplaceTracker } from 'shared'

// ── 入池 ──

/**
 * 将技能批量加入地图池（轮抓结束后调用）
 * @param skills 要入池的技能列表
 */
export function addSkillsToPool(roomId: string, skills: readonly {
  skillId: string
  name: string
  skillClass: string
  description: string
  sourceName: string
}[]) {
  const db = getDb()
  const now = Date.now()

  for (const skill of skills) {
    db.insert(skillPool).values({
      id: uuid(),
      roomId,
      skillId: skill.skillId,
      name: skill.name,
      skillClass: skill.skillClass,
      description: skill.description,
      sourceName: skill.sourceName,
      drawn: false,
      drawnByPlayerId: null,
      enteredAt: now,
    }).run()
  }
}

/**
 * 生成地图池快照（入池后立即调用，冻结当前状态）
 * 快照内容全员可见，后续被抽走不影响快照展示
 */
export function createSnapshot(roomId: string) {
  const db = getDb()
  const poolEntries = db.select().from(skillPool)
    .where(eq(skillPool.roomId, roomId))
    .all()

  const snapshotSkills: PoolSnapshotEntry[] = poolEntries.map(e => ({
    skillId: e.skillId,
    name: e.name,
    skillClass: e.skillClass as any,
    description: e.description,
    sourceName: e.sourceName,
  }))

  const id = uuid()
  db.insert(skillPoolSnapshot).values({
    id,
    roomId,
    skills: JSON.stringify(snapshotSkills),
    createdAt: Date.now(),
  }).run()

  return { id, skills: snapshotSkills }
}

/**
 * 获取地图池快照（全员可见）
 */
export function getSnapshot(roomId: string): PoolSnapshotEntry[] {
  const db = getDb()
  const row = db.select().from(skillPoolSnapshot)
    .where(eq(skillPoolSnapshot.roomId, roomId))
    .get()

  if (!row) return []
  return JSON.parse(row.skills)
}

// ── 抽取 ──

/**
 * 战斗结束后随机抽取技能
 * 从池中未被抽走的技能里随机选 POOL_DRAW_COUNT 个
 */
export function drawFromPool(roomId: string, playerId: string): PoolDrawResult {
  const db = getDb()
  const available = db.select().from(skillPool)
    .where(and(eq(skillPool.roomId, roomId), eq(skillPool.drawn, false)))
    .all()

  // 随机选取
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  const drawn = shuffled.slice(0, POOL_DRAW_COUNT)

  const tracker = getOrCreateTracker(roomId, playerId)

  const drawnSkills: PoolSkillEntry[] = drawn.map(d => ({
    id: d.id,
    skillId: d.skillId,
    name: d.name,
    skillClass: d.skillClass as any,
    description: d.description,
    sourceName: d.sourceName,
    drawn: false,
    drawnByPlayerId: null,
    enteredAt: d.enteredAt,
  }))

  return {
    playerId,
    drawnSkills,
    replacementsRemaining: tracker.remaining,
  }
}

// ── 替换 ──

/**
 * 执行技能替换
 * @param newSkillPoolEntryId 地图池中的条目ID（从抽到的2张中选的那个）
 * @param oldPlayerSkillId 玩家当前装备的要替换掉的技能ID
 */
export function replaceSkill(
  roomId: string,
  playerId: string,
  newSkillPoolEntryId: string,
  oldPlayerSkillId: string,
): SkillReplaceResult {
  const db = getDb()
  const tracker = getOrCreateTracker(roomId, playerId)

  if (tracker.remaining <= 0) {
    return { success: false, playerId, newSkillId: '', oldSkillId: oldPlayerSkillId, replacementsRemaining: 0, error: '替换次数已用完' }
  }

  // 验证池中技能存在且未被抽走
  const poolEntry = db.select().from(skillPool)
    .where(and(eq(skillPool.id, newSkillPoolEntryId), eq(skillPool.roomId, roomId)))
    .get()

  if (!poolEntry || poolEntry.drawn) {
    return { success: false, playerId, newSkillId: '', oldSkillId: oldPlayerSkillId, replacementsRemaining: tracker.remaining, error: '该技能已不在池中' }
  }

  // 验证旧技能存在于玩家技能列表
  const oldSkill = db.select().from(playerSkills)
    .where(and(eq(playerSkills.id, oldPlayerSkillId), eq(playerSkills.playerId, playerId)))
    .get()

  if (!oldSkill) {
    return { success: false, playerId, newSkillId: poolEntry.skillId, oldSkillId: oldPlayerSkillId, replacementsRemaining: tracker.remaining, error: '要替换的技能不存在' }
  }

  // 检查旧技能是否标记为不可替换
  const oldMeta = JSON.parse(oldSkill.metadata || '{}')
  if (oldMeta.flags?.skillIrreplaceable) {
    return { success: false, playerId, newSkillId: poolEntry.skillId, oldSkillId: oldPlayerSkillId, replacementsRemaining: tracker.remaining, error: '该技能无法被替换' }
  }

  // 执行替换：标记池中技能为已抽
  db.update(skillPool)
    .set({ drawn: true, drawnByPlayerId: playerId })
    .where(eq(skillPool.id, newSkillPoolEntryId))
    .run()

  // 更新玩家技能：替换旧技能为新技能
  db.update(playerSkills)
    .set({
      skillId: poolEntry.skillId,
      name: poolEntry.name,
      type: 'active', // 可以从池条目推断
      metadata: JSON.stringify({ sourceName: poolEntry.sourceName }),
    })
    .where(eq(playerSkills.id, oldPlayerSkillId))
    .run()

  // 扣除替换次数
  db.update(playerReplaceTrackers)
    .set({ usedCount: tracker.usedCount + 1 })
    .where(and(eq(playerReplaceTrackers.playerId, playerId), eq(playerReplaceTrackers.roomId, roomId)))
    .run()

  return {
    success: true,
    playerId,
    newSkillId: poolEntry.skillId,
    oldSkillId: oldPlayerSkillId,
    replacementsRemaining: tracker.remaining - 1,
  }
}

/**
 * 跳过替换（放弃本次抽取）
 */
export function skipDraw(roomId: string, playerId: string) {
  // 不需要做什么，只是确认玩家放弃了
  const tracker = getOrCreateTracker(roomId, playerId)
  return { playerId, replacementsRemaining: tracker.remaining }
}

// ── 击杀奖励 ──

/**
 * 击杀幻身后增加替换次数
 */
export function addKillBonus(roomId: string, killerPlayerId: string) {
  const db = getDb()
  const tracker = getOrCreateTracker(roomId, killerPlayerId)

  db.update(playerReplaceTrackers)
    .set({ killBonusCount: tracker.killBonusCount + 1 })
    .where(and(eq(playerReplaceTrackers.playerId, killerPlayerId), eq(playerReplaceTrackers.roomId, roomId)))
    .run()
}

// ── 替换次数管理 ──

/**
 * 获取或创建玩家的替换次数追踪器
 */
function getOrCreateTracker(roomId: string, playerId: string): PlayerReplaceTracker {
  const db = getDb()
  let row = db.select().from(playerReplaceTrackers)
    .where(and(eq(playerReplaceTrackers.playerId, playerId), eq(playerReplaceTrackers.roomId, roomId)))
    .get()

  if (!row) {
    const id = uuid()
    db.insert(playerReplaceTrackers).values({
      id,
      playerId,
      roomId,
      baseCount: BASE_REPLACEMENT_COUNT,
      killBonusCount: 0,
      usedCount: 0,
    }).run()
    row = { id, playerId, roomId, baseCount: BASE_REPLACEMENT_COUNT, killBonusCount: 0, usedCount: 0 }
  }

  return {
    playerId: row.playerId,
    baseCount: row.baseCount,
    killBonusCount: row.killBonusCount,
    usedCount: row.usedCount,
    remaining: row.baseCount + row.killBonusCount - row.usedCount,
  }
}

/**
 * 获取玩家替换追踪信息
 */
export function getTracker(roomId: string, playerId: string): PlayerReplaceTracker {
  return getOrCreateTracker(roomId, playerId)
}

/**
 * 初始化房间内所有幻身的替换追踪器（轮抓结束后调用）
 */
export function initTrackersForRoom(roomId: string, servantPlayerIds: readonly string[]) {
  for (const pid of servantPlayerIds) {
    getOrCreateTracker(roomId, pid)
  }
}
