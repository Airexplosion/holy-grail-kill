import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { adminSkillLibrary } from '../db/schema.js'
import type { SkillLibraryEntry, DraftPhase } from 'shared'
import { DEFAULT_DRAFT_CONFIG } from 'shared'
import * as groupService from './group.service.js'
import * as adminLibraryService from './admin-library.service.js'
import {
  initDraftState, pickSkill, pickRandom,
  isRoundComplete, advanceRound, isDraftComplete,
  finalizeSelection, getGroupPack,
  type DraftEngineState,
} from '../engine/draft-engine.js'

// 内存中维护每个房间的轮抓状态
const roomDraftStates = new Map<string, DraftEngineState>()
const roomDraftPhases = new Map<string, DraftPhase>()

/**
 * 获取轮抓就绪的技能（管理员标记 draftReady=true 的）
 */
export function getDraftReadySkills(): SkillLibraryEntry[] {
  const db = getDb()
  const rows = db.select().from(adminSkillLibrary)
    .where(eq(adminSkillLibrary.draftReady, true))
    .all()

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    skillClass: row.skillClass as any,
    rarity: row.rarity as any,
    type: row.type as any,
    triggerTiming: row.triggerTiming as any,
    description: row.description,
    flavorText: row.flavorText || undefined,
    cost: JSON.parse(row.cost),
    cooldown: row.cooldown,
    charges: row.charges ?? undefined,
    targetType: row.targetType as any,
    effects: JSON.parse(row.effects),
    tags: JSON.parse(row.tags),
  }))
}

/**
 * 初始化轮抓（管理员或自动触发）
 */
export function startDraft(roomId: string): {
  success: boolean
  error?: string
  groupCount?: number
  skillCount?: number
} {
  const groups = groupService.getAliveGroups(roomId)
  if (groups.length < 2) {
    return { success: false, error: '至少需要2组才能开始轮抓' }
  }

  const draftSkills = getDraftReadySkills()
  // 如果管理员没标记够，也用所有启用的技能作为后备
  const allSkills = draftSkills.length > 0 ? draftSkills : adminLibraryService.getAllSkills()

  const groupIds = groups.map(g => g.id)
  const config = DEFAULT_DRAFT_CONFIG

  // 需要的技能总量：每组每轮选1个，共10轮，所以每包至少10个技能
  const minPerPack = config.totalRounds
  const totalNeeded = groupIds.length * (minPerPack + 2) // 多给2个余量

  if (allSkills.length < totalNeeded) {
    return {
      success: false,
      error: `技能池不足: 需要 ${totalNeeded} 个，当前仅 ${allSkills.length} 个`,
    }
  }

  const state = initDraftState(roomId, groupIds, allSkills, config.totalRounds)
  roomDraftStates.set(roomId, state)
  roomDraftPhases.set(roomId, 'drafting')

  return {
    success: true,
    groupCount: groupIds.length,
    skillCount: allSkills.length,
  }
}

/**
 * 获取轮抓状态
 */
export function getDraftState(roomId: string): {
  phase: DraftPhase
  round: number
  totalRounds: number
  groupSelectionCounts: Record<string, number>
} | null {
  const state = roomDraftStates.get(roomId)
  const phase = roomDraftPhases.get(roomId) || 'submitting'
  if (!state) return { phase, round: 0, totalRounds: 0, groupSelectionCounts: {} }

  const counts: Record<string, number> = {}
  for (const [gid, skills] of state.selections) {
    counts[gid] = skills.length
  }

  return {
    phase,
    round: state.round,
    totalRounds: state.totalRounds,
    groupSelectionCounts: counts,
  }
}

/**
 * 获取指定组当前持有的技能包
 */
export function getGroupCurrentPack(roomId: string, groupId: string): SkillLibraryEntry[] {
  const state = roomDraftStates.get(roomId)
  if (!state) return []

  const groupIndex = state.groupIds.indexOf(groupId)
  if (groupIndex === -1) return []

  const pack = getGroupPack(state, groupIndex)
  return pack ? [...pack.skills] : []
}

/**
 * 执行选取
 */
export function draftPick(
  roomId: string,
  groupId: string,
  skillId: string,
): { success: boolean; skill?: SkillLibraryEntry; roundComplete?: boolean; draftComplete?: boolean; error?: string } {
  const state = roomDraftStates.get(roomId)
  if (!state) return { success: false, error: '轮抓未开始' }

  const skill = pickSkill(state, groupId, skillId)
  if (!skill) return { success: false, error: '无效的选取' }

  const roundComplete = isRoundComplete(state)
  let draftComplete = false

  if (roundComplete) {
    const advanced = advanceRound(state)
    if (!advanced) {
      draftComplete = true
      roomDraftPhases.set(roomId, 'selecting')
    }
  }

  return { success: true, skill, roundComplete, draftComplete }
}

/**
 * 超时随机选取
 */
export function draftPickRandom(roomId: string, groupId: string): SkillLibraryEntry | null {
  const state = roomDraftStates.get(roomId)
  if (!state) return null
  return pickRandom(state, groupId)
}

/**
 * 获取指定组已选取的技能列表
 */
export function getGroupSelections(roomId: string, groupId: string): SkillLibraryEntry[] {
  const state = roomDraftStates.get(roomId)
  if (!state) return []
  return state.selections.get(groupId) || []
}

/**
 * 最终确认（保留7弃3）
 */
export function finalizeDraft(
  roomId: string,
  groupId: string,
  keepIds: string[],
): { success: boolean; kept?: SkillLibraryEntry[]; discarded?: SkillLibraryEntry[]; error?: string } {
  const state = roomDraftStates.get(roomId)
  if (!state) return { success: false, error: '轮抓未开始' }

  if (keepIds.length !== DEFAULT_DRAFT_CONFIG.keepCount) {
    return { success: false, error: `必须保留 ${DEFAULT_DRAFT_CONFIG.keepCount} 个技能` }
  }

  const result = finalizeSelection(state, groupId, keepIds, DEFAULT_DRAFT_CONFIG.keepCount)
  return { success: true, kept: result.kept, discarded: result.discarded }
}

/**
 * 检查所有组是否都完成了最终选择
 */
export function isAllFinalized(roomId: string): boolean {
  const state = roomDraftStates.get(roomId)
  if (!state) return false

  return state.groupIds.every(gid => {
    const selections = state.selections.get(gid)!
    return selections.length === DEFAULT_DRAFT_CONFIG.keepCount
  })
}

/**
 * 完成轮抓，清理状态
 */
export function completeDraft(roomId: string): void {
  roomDraftPhases.set(roomId, 'complete')
}

/**
 * 清理房间的轮抓状态
 */
export function cleanupDraft(roomId: string): void {
  roomDraftStates.delete(roomId)
  roomDraftPhases.delete(roomId)
}
