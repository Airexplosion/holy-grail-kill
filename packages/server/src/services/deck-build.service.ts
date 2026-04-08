import { v4 as uuid } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { deckBuilds } from '../db/schema.js'
import { STRIKE_CARD_TOTAL, SKILL_SLOTS } from 'shared'
import type { PlayerStrikeSelection, DeckBuildValidation, SkillLibraryEntry } from 'shared'
import * as skillLibraryService from './skill-library.service.js'

export function getDeckBuild(roomId: string, playerId: string) {
  const db = getDb()
  const existing = db.select().from(deckBuilds)
    .where(and(eq(deckBuilds.roomId, roomId), eq(deckBuilds.playerId, playerId)))
    .get()

  if (existing) {
    return {
      ...existing,
      strikeCards: JSON.parse(existing.strikeCards) as PlayerStrikeSelection,
      skillIds: JSON.parse(existing.skillIds) as string[],
    }
  }

  // Auto-create empty build
  const now = Date.now()
  const id = uuid()
  db.insert(deckBuilds).values({
    id,
    roomId,
    playerId,
    createdAt: now,
    updatedAt: now,
  }).run()

  return {
    id, roomId, playerId,
    strikeCards: { red: 0, blue: 0, green: 0 } as PlayerStrikeSelection,
    skillIds: [] as string[],
    isLocked: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function submitDeckBuild(
  roomId: string,
  playerId: string,
  strikeCards: PlayerStrikeSelection,
  skillIds: string[],
): DeckBuildValidation {
  const validation = validateBuild(strikeCards, skillIds)
  if (!validation.valid) return validation

  const build = getDeckBuild(roomId, playerId)
  if (build.isLocked) {
    return { valid: false, errors: ['配置已锁定，无法修改'] }
  }

  const db = getDb()
  db.update(deckBuilds)
    .set({
      strikeCards: JSON.stringify(strikeCards),
      skillIds: JSON.stringify(skillIds),
      updatedAt: Date.now(),
    })
    .where(and(eq(deckBuilds.roomId, roomId), eq(deckBuilds.playerId, playerId)))
    .run()

  return { valid: true, errors: [] }
}

export function lockDeckBuild(roomId: string, playerId: string): DeckBuildValidation {
  const build = getDeckBuild(roomId, playerId)
  const validation = validateBuild(build.strikeCards, build.skillIds)
  if (!validation.valid) return validation

  const db = getDb()
  db.update(deckBuilds)
    .set({ isLocked: true, updatedAt: Date.now() })
    .where(and(eq(deckBuilds.roomId, roomId), eq(deckBuilds.playerId, playerId)))
    .run()

  return { valid: true, errors: [] }
}

export function unlockDeckBuild(roomId: string, playerId: string) {
  const db = getDb()
  db.update(deckBuilds)
    .set({ isLocked: false, updatedAt: Date.now() })
    .where(and(eq(deckBuilds.roomId, roomId), eq(deckBuilds.playerId, playerId)))
    .run()
}

export function getAllBuilds(roomId: string) {
  const db = getDb()
  return db.select().from(deckBuilds)
    .where(eq(deckBuilds.roomId, roomId))
    .all()
    .map(b => ({
      ...b,
      strikeCards: JSON.parse(b.strikeCards) as PlayerStrikeSelection,
      skillIds: JSON.parse(b.skillIds) as string[],
    }))
}

export function areAllBuildsLocked(roomId: string, playerIds: string[]): boolean {
  const builds = getAllBuilds(roomId)
  return playerIds.every(pid => builds.some(b => b.playerId === pid && b.isLocked))
}

export function validateBuild(strikeCards: PlayerStrikeSelection, skillIds: string[]): DeckBuildValidation {
  const errors: string[] = []

  // Strike card validation
  const total = strikeCards.red + strikeCards.blue + strikeCards.green
  if (total !== STRIKE_CARD_TOTAL) {
    errors.push(`击牌总数必须为${STRIKE_CARD_TOTAL}张，当前${total}张`)
  }
  if (strikeCards.red < 0 || strikeCards.blue < 0 || strikeCards.green < 0) {
    errors.push('击牌数量不能为负数')
  }

  // Use runtime skill library (DB-first, not static constants)
  const liveSkills = skillLibraryService.getAllSkills()
  const liveMap = new Map<string, SkillLibraryEntry>(liveSkills.map(s => [s.id, s]))

  // Skill validation
  const aClassIds = skillIds.filter(id => liveMap.get(id)?.skillClass === 'A')
  const bClassIds = skillIds.filter(id => liveMap.get(id)?.skillClass === 'B')

  if (aClassIds.length !== SKILL_SLOTS.A) {
    errors.push(`需要选择${SKILL_SLOTS.A}个A级技能，当前${aClassIds.length}个`)
  }
  if (bClassIds.length !== SKILL_SLOTS.B) {
    errors.push(`需要选择${SKILL_SLOTS.B}个B级技能，当前${bClassIds.length}个`)
  }

  // Check duplicates
  if (new Set(skillIds).size !== skillIds.length) {
    errors.push('不能选择重复的技能')
  }

  // Check all skills exist in live library
  for (const id of skillIds) {
    if (!liveMap.has(id)) {
      errors.push(`技能 ${id} 不存在或已被禁用`)
    }
  }

  return { valid: errors.length === 0, errors }
}
