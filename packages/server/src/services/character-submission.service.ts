/**
 * 角色提交服务
 *
 * 玩家创建角色（来源名+6技能），提交GM审核。
 * 角色是 account 级别的，跨房间复用。
 */

import { v4 as uuid } from 'uuid'
import { eq, and, desc } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { playerCharacters, accounts } from '../db/schema.js'
import { AppError } from '../middleware/error-handler.js'
import type { PlayerCharacter, CharacterSkillDef } from 'shared'

export function createCharacter(accountId: string, sourceName: string, skills: CharacterSkillDef[]) {
  const db = getDb()
  const now = Date.now()

  // 给每个技能生成ID
  const skillsWithIds = skills.map(s => ({ ...s, id: s.id || uuid() }))

  const id = uuid()
  db.insert(playerCharacters).values({
    id,
    accountId,
    sourceName,
    status: 'draft',
    skills: JSON.stringify(skillsWithIds),
    createdAt: now,
    updatedAt: now,
  }).run()

  return parseCharacter(db.select().from(playerCharacters).where(eq(playerCharacters.id, id)).get()!)
}

export function updateCharacter(characterId: string, accountId: string, sourceName: string, skills: CharacterSkillDef[]) {
  const db = getDb()
  const existing = db.select().from(playerCharacters).where(eq(playerCharacters.id, characterId)).get()

  if (!existing) throw new AppError(404, '角色不存在')
  if (existing.accountId !== accountId) throw new AppError(403, '无权编辑他人角色')
  if (existing.status !== 'draft' && existing.status !== 'rejected') {
    throw new AppError(400, '只能编辑草稿或被驳回的角色')
  }

  const skillsWithIds = skills.map(s => ({ ...s, id: s.id || uuid() }))

  db.update(playerCharacters).set({
    sourceName,
    skills: JSON.stringify(skillsWithIds),
    status: 'draft',
    reviewNotes: null,
    updatedAt: Date.now(),
  }).where(eq(playerCharacters.id, characterId)).run()

  return parseCharacter(db.select().from(playerCharacters).where(eq(playerCharacters.id, characterId)).get()!)
}

export function submitForReview(characterId: string, accountId: string) {
  const db = getDb()
  const existing = db.select().from(playerCharacters).where(eq(playerCharacters.id, characterId)).get()

  if (!existing) throw new AppError(404, '角色不存在')
  if (existing.accountId !== accountId) throw new AppError(403, '无权操作')
  if (existing.status !== 'draft' && existing.status !== 'rejected') {
    throw new AppError(400, '只能提交草稿或被驳回的角色')
  }

  db.update(playerCharacters).set({ status: 'pending', updatedAt: Date.now() })
    .where(eq(playerCharacters.id, characterId)).run()
}

export function reviewCharacter(characterId: string, status: 'approved' | 'rejected', reviewNotes?: string) {
  const db = getDb()
  const existing = db.select().from(playerCharacters).where(eq(playerCharacters.id, characterId)).get()
  if (!existing) throw new AppError(404, '角色不存在')

  db.update(playerCharacters).set({
    status,
    reviewNotes: reviewNotes || null,
    updatedAt: Date.now(),
  }).where(eq(playerCharacters.id, characterId)).run()
}

export function getMyCharacters(accountId: string): PlayerCharacter[] {
  const db = getDb()
  return db.select().from(playerCharacters)
    .where(eq(playerCharacters.accountId, accountId))
    .orderBy(desc(playerCharacters.updatedAt))
    .all()
    .map(parseCharacter)
}

export function getApprovedCharacters(accountId: string): PlayerCharacter[] {
  const db = getDb()
  return db.select().from(playerCharacters)
    .where(and(eq(playerCharacters.accountId, accountId), eq(playerCharacters.status, 'approved')))
    .all()
    .map(parseCharacter)
}

export function getCharacterById(characterId: string): PlayerCharacter | null {
  const db = getDb()
  const row = db.select().from(playerCharacters).where(eq(playerCharacters.id, characterId)).get()
  return row ? parseCharacter(row) : null
}

export function getAllSubmittedCharacters(statusFilter?: string): (PlayerCharacter & { accountName?: string })[] {
  const db = getDb()
  let rows
  if (statusFilter) {
    rows = db.select().from(playerCharacters)
      .where(eq(playerCharacters.status, statusFilter))
      .orderBy(desc(playerCharacters.createdAt))
      .all()
  } else {
    rows = db.select().from(playerCharacters)
      .orderBy(desc(playerCharacters.createdAt))
      .all()
  }

  return rows.map(row => {
    const char = parseCharacter(row)
    const account = db.select().from(accounts).where(eq(accounts.id, row.accountId)).get()
    return { ...char, accountName: account?.displayName || account?.username || '未知' }
  })
}

export function getCharactersBySourceNames(sourceNames: readonly string[]): PlayerCharacter[] {
  const db = getDb()
  return db.select().from(playerCharacters)
    .where(eq(playerCharacters.status, 'approved'))
    .all()
    .filter(row => sourceNames.includes(row.sourceName))
    .map(parseCharacter)
}

function parseCharacter(row: any): PlayerCharacter {
  return {
    ...row,
    skills: JSON.parse(row.skills || '[]'),
  }
}
