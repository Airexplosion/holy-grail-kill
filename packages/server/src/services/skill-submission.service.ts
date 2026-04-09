/**
 * 玩家技能提交服务
 * 玩家提交技能概念（文本），GM审核后实现为可执行技能
 */

import { v4 as uuid } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { skillSubmissions } from '../db/schema.js'

export interface SkillSubmissionData {
  roomId: string
  playerId: string
  playerName: string
  sourceName: string
  skillName: string
  skillType: 'active' | 'passive' | 'triggered' | 'card'
  skillCategory: 'base' | 'link'
  description: string
  costDescription?: string
}

export function submitSkill(data: SkillSubmissionData) {
  const db = getDb()
  const id = uuid()
  db.insert(skillSubmissions).values({
    id,
    roomId: data.roomId,
    playerId: data.playerId,
    playerName: data.playerName,
    sourceName: data.sourceName,
    skillName: data.skillName,
    skillType: data.skillType,
    skillCategory: data.skillCategory,
    description: data.description,
    costDescription: data.costDescription || null,
    status: 'pending',
    adminSkillId: null,
    createdAt: Date.now(),
  }).run()
  return { id }
}

export function getPlayerSubmissions(roomId: string, playerId: string) {
  const db = getDb()
  return db.select().from(skillSubmissions)
    .where(and(eq(skillSubmissions.roomId, roomId), eq(skillSubmissions.playerId, playerId)))
    .all()
}

export function getRoomSubmissions(roomId: string) {
  const db = getDb()
  return db.select().from(skillSubmissions)
    .where(eq(skillSubmissions.roomId, roomId))
    .all()
}

export function getAllPendingSubmissions() {
  const db = getDb()
  return db.select().from(skillSubmissions)
    .where(eq(skillSubmissions.status, 'pending'))
    .all()
}

export function approveSubmission(submissionId: string, adminSkillId: string) {
  const db = getDb()
  db.update(skillSubmissions).set({
    status: 'approved',
    adminSkillId,
  }).where(eq(skillSubmissions.id, submissionId)).run()
}

export function rejectSubmission(submissionId: string) {
  const db = getDb()
  db.update(skillSubmissions).set({
    status: 'rejected',
  }).where(eq(skillSubmissions.id, submissionId)).run()
}

export function getSubmissionCounts(roomId: string, playerId: string): { base: number; link: number } {
  const subs = getPlayerSubmissions(roomId, playerId)
  return {
    base: subs.filter(s => s.skillCategory === 'base').length,
    link: subs.filter(s => s.skillCategory === 'link').length,
  }
}
