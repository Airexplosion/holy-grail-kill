import { v4 as uuid } from 'uuid'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { adminSkillLibrary, adminStrikeLibrary } from '../db/schema.js'
import { SKILL_LIBRARY, STRIKE_CARD_TEMPLATES } from 'shared'
import type { SkillLibraryEntry, StrikeCardTemplate } from 'shared'

// ===== Skill Library =====

function rowToSkill(row: any): SkillLibraryEntry {
  return {
    id: row.id,
    name: row.name,
    skillClass: row.skillClass,
    rarity: row.rarity,
    type: row.type,
    triggerTiming: row.triggerTiming,
    description: row.description,
    flavorText: row.flavorText || undefined,
    cost: JSON.parse(row.cost),
    cooldown: row.cooldown,
    charges: row.charges ?? undefined,
    targetType: row.targetType,
    effects: JSON.parse(row.effects),
    tags: JSON.parse(row.tags),
  }
}

/** Get all skills: DB entries override constants by ID */
export function getAllSkills(): SkillLibraryEntry[] {
  const db = getDb()
  const dbRows = db.select().from(adminSkillLibrary).all()
  if (dbRows.length === 0) return [...SKILL_LIBRARY]

  const dbMap = new Map(dbRows.map(r => [r.id, r]))
  const result: SkillLibraryEntry[] = []

  // DB skills first (includes overrides of constants)
  for (const row of dbRows) {
    if (row.enabled) result.push(rowToSkill(row))
  }

  // Constants not overridden by DB
  for (const skill of SKILL_LIBRARY) {
    if (!dbMap.has(skill.id)) result.push(skill)
  }

  return result
}

/** Get all skills including disabled (admin view) */
export function getAllSkillsAdmin() {
  const db = getDb()
  const dbRows = db.select().from(adminSkillLibrary).all()

  // Merge: DB entries + constants not in DB
  const dbMap = new Map(dbRows.map(r => [r.id, r]))
  const result: Array<SkillLibraryEntry & { enabled: boolean; source: 'db' | 'constant' }> = []

  for (const row of dbRows) {
    result.push({ ...rowToSkill(row), enabled: row.enabled, source: 'db' })
  }
  for (const skill of SKILL_LIBRARY) {
    if (!dbMap.has(skill.id)) {
      result.push({ ...skill, enabled: true, source: 'constant' })
    }
  }

  return result
}

export function upsertSkill(data: Omit<SkillLibraryEntry, 'effects' | 'tags' | 'cost'> & {
  effects: any[]; tags?: string[]; cost?: Record<string, number>; enabled?: boolean
}) {
  const db = getDb()
  const now = Date.now()
  const existing = db.select().from(adminSkillLibrary).where(eq(adminSkillLibrary.id, data.id)).get()

  const values = {
    id: data.id,
    name: data.name,
    skillClass: data.skillClass,
    rarity: data.rarity,
    type: data.type,
    triggerTiming: data.triggerTiming,
    description: data.description,
    flavorText: data.flavorText || null,
    cost: JSON.stringify(data.cost || {}),
    cooldown: data.cooldown,
    charges: data.charges ?? null,
    targetType: data.targetType,
    effects: JSON.stringify(data.effects),
    tags: JSON.stringify(data.tags || []),
    enabled: data.enabled !== false,
    updatedAt: now,
  }

  if (existing) {
    db.update(adminSkillLibrary).set(values).where(eq(adminSkillLibrary.id, data.id)).run()
  } else {
    db.insert(adminSkillLibrary).values({ ...values, createdAt: now }).run()
  }
}

export function deleteSkill(id: string) {
  const db = getDb()
  db.delete(adminSkillLibrary).where(eq(adminSkillLibrary.id, id)).run()
}

export function toggleSkill(id: string, enabled: boolean) {
  const db = getDb()
  const existing = db.select().from(adminSkillLibrary).where(eq(adminSkillLibrary.id, id)).get()
  if (existing) {
    db.update(adminSkillLibrary).set({ enabled, updatedAt: Date.now() }).where(eq(adminSkillLibrary.id, id)).run()
  } else {
    // Copy from constants to DB as disabled
    const constant = SKILL_LIBRARY.find(s => s.id === id)
    if (constant) {
      upsertSkill({ ...constant, effects: [...constant.effects], tags: constant.tags ? [...constant.tags] : [], cost: constant.cost ? { ...constant.cost } : undefined, enabled })
    }
  }
}

/** Seed DB from constants — safe to re-run (upsert semantics) */
export function seedSkillsFromConstants() {
  for (const skill of SKILL_LIBRARY) {
    upsertSkill({
      ...skill,
      effects: [...skill.effects],
      tags: skill.tags ? [...skill.tags] : [],
      cost: skill.cost ? { ...skill.cost } : undefined,
      enabled: true,
    })
  }
}

// ===== Strike Card Library =====

function rowToStrike(row: any): StrikeCardTemplate & { enabled: boolean } {
  return {
    id: row.id,
    color: row.color,
    name: row.name,
    baseDamage: row.baseDamage,
    description: row.description,
    effectType: row.effectType || undefined,
    effectParams: row.effectParams ? JSON.parse(row.effectParams) : undefined,
    enabled: row.enabled,
  }
}

export function getAllStrikeCards(): StrikeCardTemplate[] {
  const db = getDb()
  const dbRows = db.select().from(adminStrikeLibrary).all()
  if (dbRows.length === 0) return [...STRIKE_CARD_TEMPLATES]

  const dbMap = new Map(dbRows.map(r => [r.id, r]))
  const result: StrikeCardTemplate[] = []

  for (const row of dbRows) {
    if (row.enabled) result.push(rowToStrike(row))
  }
  for (const card of STRIKE_CARD_TEMPLATES) {
    if (!dbMap.has(card.id)) result.push(card)
  }

  return result
}

export function getAllStrikeCardsAdmin() {
  const db = getDb()
  const dbRows = db.select().from(adminStrikeLibrary).all()
  const dbMap = new Map(dbRows.map(r => [r.id, r]))
  const result: Array<StrikeCardTemplate & { enabled: boolean; source: 'db' | 'constant' }> = []

  for (const row of dbRows) {
    result.push({ ...rowToStrike(row), source: 'db' })
  }
  for (const card of STRIKE_CARD_TEMPLATES) {
    if (!dbMap.has(card.id)) {
      result.push({ ...card, enabled: true, source: 'constant' })
    }
  }

  return result
}

export function upsertStrikeCard(data: StrikeCardTemplate & { enabled?: boolean }) {
  const db = getDb()
  const now = Date.now()
  const existing = db.select().from(adminStrikeLibrary).where(eq(adminStrikeLibrary.id, data.id)).get()

  const values = {
    id: data.id,
    color: data.color,
    name: data.name,
    baseDamage: data.baseDamage,
    description: data.description,
    effectType: data.effectType || null,
    effectParams: JSON.stringify(data.effectParams || {}),
    enabled: data.enabled !== false,
    updatedAt: now,
  }

  if (existing) {
    db.update(adminStrikeLibrary).set(values).where(eq(adminStrikeLibrary.id, data.id)).run()
  } else {
    db.insert(adminStrikeLibrary).values({ ...values, createdAt: now }).run()
  }
}

export function deleteStrikeCard(id: string) {
  const db = getDb()
  db.delete(adminStrikeLibrary).where(eq(adminStrikeLibrary.id, id)).run()
}
