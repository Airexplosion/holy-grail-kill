/**
 * 轮抓模拟器服务
 *
 * 纯内存运行，不写DB，不需要房间。
 * 模拟7组完整round-robin轮抓流程。
 */

import { v4 as uuid } from 'uuid'
import { buildDraftPool, distributeIntoPacks, initDraftState, pickSkill, pickRandom, isRoundComplete, advanceRound, isDraftComplete, finalizeSelection } from '../engine/draft-engine.js'
import * as draftService from './draft.service.js'
import * as aiBrain from './ai-brain.service.js'
import { AI_TEMPLATES } from 'shared'
import type { SkillLibraryEntry, AiTemplate } from 'shared'

interface SimGroup {
  id: string
  name: string
  isHuman: boolean
  template: AiTemplate | null
}

interface DraftSimSession {
  id: string
  state: ReturnType<typeof initDraftState>
  groups: SimGroup[]
  humanGroupId: string
  finalized: boolean
}

const sessions = new Map<string, DraftSimSession>()

/**
 * 创建模拟会话
 */
export function createSession(playerName: string): {
  sessionId: string
  groups: Array<{ id: string; name: string; isHuman: boolean }>
  round: number
  totalRounds: number
  currentPack: SkillLibraryEntry[]
} {
  const sessionId = uuid()

  // 7组：1人类 + 6AI
  const humanGroupId = uuid()
  const groups: SimGroup[] = [
    { id: humanGroupId, name: playerName, isHuman: true, template: null },
  ]

  const selectedTemplates = [...AI_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 6)
  for (const t of selectedTemplates) {
    groups.push({ id: uuid(), name: t.displayName, isHuman: false, template: t })
  }

  // 构建技能池
  const allSkills = draftService.getDraftReadySkills()
  const poolSize = 7 * 12 // 7组 × (10轮 + 2余量)
  const pool = buildDraftPool(allSkills, poolSize)

  // 初始化轮抓引擎
  const groupIds = groups.map(g => g.id)
  const state = initDraftState(sessionId, groupIds, pool, 10)

  const session: DraftSimSession = {
    id: sessionId,
    state,
    groups,
    humanGroupId,
    finalized: false,
  }
  sessions.set(sessionId, session)

  // 返回人类的第一个包
  const humanPack = getGroupPack(state, groupIds.indexOf(humanGroupId))

  return {
    sessionId,
    groups: groups.map(g => ({ id: g.id, name: g.name, isHuman: g.isHuman })),
    round: state.round,
    totalRounds: state.totalRounds,
    currentPack: humanPack,
  }
}

/**
 * 人类选技能 → AI全部自动选 → 推进轮次
 */
export function pick(sessionId: string, skillId: string): {
  success: boolean
  error?: string
  pickedSkill?: SkillLibraryEntry
  aiPicks?: Array<{ groupName: string; skillName: string }>
  round: number
  totalRounds: number
  draftComplete: boolean
  currentPack: SkillLibraryEntry[]
  selectionCounts: Record<string, number>
} {
  const session = sessions.get(sessionId)
  if (!session) return { success: false, error: '会话不存在', round: 0, totalRounds: 0, draftComplete: false, currentPack: [], selectionCounts: {} }

  const { state, groups, humanGroupId } = session

  // 人类选
  const picked = pickSkill(state, humanGroupId, skillId)
  if (!picked) return { success: false, error: '选取失败', round: state.round, totalRounds: state.totalRounds, draftComplete: false, currentPack: [], selectionCounts: {} }

  // AI 全部选
  const aiPicks: Array<{ groupName: string; skillName: string }> = []
  for (const group of groups) {
    if (group.isHuman) continue
    const groupIdx = groups.findIndex(g => g.id === group.id)
    const pack = getGroupPack(state, groupIdx)
    if (pack.length === 0) continue

    const template = group.template || AI_TEMPLATES[0]!
    const chosen = aiBrain.pickDraftSkill(pack, template)
    if (chosen) {
      const result = pickSkill(state, group.id, chosen.id)
      if (result) {
        aiPicks.push({ groupName: group.name, skillName: result.name })
      }
    } else {
      const fallback = pickRandom(state, group.id)
      if (fallback) {
        aiPicks.push({ groupName: group.name, skillName: fallback.name })
      }
    }
  }

  // 推进轮次
  if (isRoundComplete(state)) {
    advanceRound(state)
  }

  const draftComplete = isDraftComplete(state)
  const humanIdx = groups.findIndex(g => g.id === humanGroupId)
  const currentPack = draftComplete ? [] : getGroupPack(state, humanIdx)

  const selectionCounts: Record<string, number> = {}
  for (const group of groups) {
    selectionCounts[group.name] = state.selections.get(group.id)?.length || 0
  }

  return {
    success: true,
    pickedSkill: picked,
    aiPicks,
    round: state.round,
    totalRounds: state.totalRounds,
    draftComplete,
    currentPack,
    selectionCounts,
  }
}

/**
 * 获取所有人的选取结果
 */
export function getResults(sessionId: string): {
  groups: Array<{
    name: string
    isHuman: boolean
    selections: SkillLibraryEntry[]
  }>
  remainingPool: SkillLibraryEntry[]
} | null {
  const session = sessions.get(sessionId)
  if (!session) return null

  const { state, groups } = session

  const results = groups.map(group => ({
    name: group.name,
    isHuman: group.isHuman,
    selections: state.selections.get(group.id) || [],
  }))

  // 剩余技能池 = 所有包中未被选的技能
  const remaining: SkillLibraryEntry[] = []
  for (const pack of state.packs) {
    remaining.push(...pack.skills)
  }

  return { groups: results, remainingPool: remaining }
}

/**
 * 人类定稿：保留7弃3
 */
export function finalize(sessionId: string, keepIds: string[]): {
  success: boolean
  kept: SkillLibraryEntry[]
  discarded: SkillLibraryEntry[]
  mapPool: SkillLibraryEntry[]
  allResults: Array<{ name: string; isHuman: boolean; kept: SkillLibraryEntry[] }>
} | null {
  const session = sessions.get(sessionId)
  if (!session) return null

  const { state, groups, humanGroupId } = session

  // 人类定稿
  const humanResult = finalizeSelection(state, humanGroupId, keepIds, 7)

  // AI 自动定稿
  const allResults: Array<{ name: string; isHuman: boolean; kept: SkillLibraryEntry[] }> = []
  const allDiscarded: SkillLibraryEntry[] = [...humanResult.discarded]

  allResults.push({
    name: groups.find(g => g.id === humanGroupId)!.name,
    isHuman: true,
    kept: humanResult.kept,
  })

  for (const group of groups) {
    if (group.isHuman) continue
    const selections = state.selections.get(group.id) || []
    const aiKeepIds = selections.slice(0, 7).map(s => s.id)
    const aiResult = finalizeSelection(state, group.id, aiKeepIds, 7)
    allResults.push({ name: group.name, isHuman: false, kept: aiResult.kept })
    allDiscarded.push(...aiResult.discarded)
  }

  // 包中剩余的也入池
  for (const pack of state.packs) {
    allDiscarded.push(...pack.skills)
  }

  session.finalized = true

  return {
    success: true,
    kept: humanResult.kept,
    discarded: humanResult.discarded,
    mapPool: allDiscarded,
    allResults,
  }
}

/**
 * 获取会话状态
 */
export function getSession(sessionId: string) {
  const session = sessions.get(sessionId)
  if (!session) return null
  return {
    groups: session.groups.map(g => ({ id: g.id, name: g.name, isHuman: g.isHuman })),
    round: session.state.round,
    totalRounds: session.state.totalRounds,
    finalized: session.finalized,
  }
}

/**
 * 清理会话
 */
export function deleteSession(sessionId: string) {
  sessions.delete(sessionId)
}

// ── 内部 ──

function getGroupPack(state: ReturnType<typeof initDraftState>, groupIndex: number): SkillLibraryEntry[] {
  const pack = state.packs.find(p => p.currentHolderIndex === groupIndex)
  return pack ? [...pack.skills] : []
}
