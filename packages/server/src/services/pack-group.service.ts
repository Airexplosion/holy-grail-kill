/**
 * 技能包组服务
 *
 * 每4个角色组成1个包组（24技能）。
 * 轮抓时选2个包组参与。Admin 管理。
 */

import { v4 as uuid } from 'uuid'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { skillPackGroups } from '../db/schema.js'
import { SKILL_LIBRARY } from 'shared'
import type { SkillPackGroup, SkillLibraryEntry } from 'shared'

export function createPackGroup(name: string, characterSourceNames: string[]) {
  const db = getDb()
  const now = Date.now()
  const id = uuid()

  db.insert(skillPackGroups).values({
    id,
    name,
    characterSourceNames: JSON.stringify(characterSourceNames),
    createdAt: now,
    updatedAt: now,
  }).run()

  return parseGroup(db.select().from(skillPackGroups).where(eq(skillPackGroups.id, id)).get()!)
}

export function updatePackGroup(id: string, updates: { name?: string; characterSourceNames?: string[] }) {
  const db = getDb()
  const existing = db.select().from(skillPackGroups).where(eq(skillPackGroups.id, id)).get()
  if (!existing) return null

  const setObj: Record<string, unknown> = { updatedAt: Date.now() }
  if (updates.name) setObj.name = updates.name
  if (updates.characterSourceNames) setObj.characterSourceNames = JSON.stringify(updates.characterSourceNames)

  db.update(skillPackGroups).set(setObj).where(eq(skillPackGroups.id, id)).run()
  return parseGroup(db.select().from(skillPackGroups).where(eq(skillPackGroups.id, id)).get()!)
}

export function deletePackGroup(id: string) {
  const db = getDb()
  db.delete(skillPackGroups).where(eq(skillPackGroups.id, id)).run()
}

export function getAllPackGroups(): SkillPackGroup[] {
  const db = getDb()
  return db.select().from(skillPackGroups).all().map(parseGroup)
}

export function getPackGroupById(id: string): SkillPackGroup | null {
  const db = getDb()
  const row = db.select().from(skillPackGroups).where(eq(skillPackGroups.id, id)).get()
  return row ? parseGroup(row) : null
}

/**
 * 获取包组中的所有技能（4角色 × 6技能 = 24）
 * 从 SKILL_LIBRARY 中按 flavorText 匹配角色
 */
export function getSkillsForPackGroup(groupId: string): SkillLibraryEntry[] {
  const group = getPackGroupById(groupId)
  if (!group) return []

  return getSkillsBySourceNames(group.characterSourceNames)
}

/**
 * 按来源名获取技能（从预设库中匹配 flavorText）
 */
export function getSkillsBySourceNames(sourceNames: readonly string[]): SkillLibraryEntry[] {
  const nameSet = new Set(sourceNames)
  return SKILL_LIBRARY.filter(s => s.flavorText && nameSet.has(s.flavorText))
}

/**
 * 预设种子：从 SKILL_LIBRARY 的 16 个角色中创建 4 个包组
 */
export function seedDefaultPackGroups() {
  const db = getDb()
  const existing = db.select().from(skillPackGroups).all()
  if (existing.length > 0) return existing.map(parseGroup)

  // 收集所有角色名（从 flavorText 去重，排除通用）
  const sourceNames = [...new Set(
    SKILL_LIBRARY
      .map(s => s.flavorText)
      .filter((f): f is string => !!f),
  )]

  // 每4个一组
  const groups: SkillPackGroup[] = []
  for (let i = 0; i < sourceNames.length; i += 4) {
    const batch = sourceNames.slice(i, i + 4)
    if (batch.length < 4) break // 不够4个不建组

    const groupName = `技能包组 ${Math.floor(i / 4) + 1}`
    const created = createPackGroup(groupName, batch)
    groups.push(created)
  }

  return groups
}

function parseGroup(row: any): SkillPackGroup {
  return {
    ...row,
    characterSourceNames: JSON.parse(row.characterSourceNames || '[]'),
  }
}
