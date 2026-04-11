/**
 * 轮抓引擎
 *
 * 底池构建：2包组(48) + 7人提交(42) + 1随机高稀有(1) = 91技能
 * 91技能 → 7个包(每包13个) → 线性正向传递10轮
 * 连续两轮不能选高稀有（除非包里只剩高稀有）
 * 10轮后保7弃3 → 剩余全部入地图池
 */

import type { SkillLibraryEntry } from 'shared'
import { fisherYatesShuffle as shuffle } from '../utils/shuffle.js'

export interface DraftPack {
  readonly packId: string
  readonly skills: SkillLibraryEntry[]
  currentHolderIndex: number
}

export interface DraftEngineState {
  readonly roomId: string
  readonly groupIds: readonly string[]
  readonly packs: DraftPack[]
  readonly selections: Map<string, SkillLibraryEntry[]>
  /** 每组上一轮是否选了高稀有度 */
  readonly lastPickWasRare: Map<string, boolean>
  round: number
  readonly totalRounds: number
}

/** 构建轮抓池 */
export function buildDraftPool(
  allSkills: SkillLibraryEntry[],
  totalNeeded: number,
): SkillLibraryEntry[] {
  const shuffled = shuffle([...allSkills])
  return shuffled.slice(0, totalNeeded)
}

/** 将技能池分成 N 份包 */
export function distributeIntoPacks(
  pool: SkillLibraryEntry[],
  groupCount: number,
): DraftPack[] {
  const shuffled = shuffle([...pool])
  const packs: DraftPack[] = []
  const perPack = Math.ceil(shuffled.length / groupCount)

  for (let i = 0; i < groupCount; i++) {
    const start = i * perPack
    const skills = shuffled.slice(start, start + perPack)
    packs.push({ packId: `pack-${i}`, skills, currentHolderIndex: i })
  }

  return packs
}

/** 初始化轮抓状态 */
export function initDraftState(
  roomId: string,
  groupIds: string[],
  pool: SkillLibraryEntry[],
  totalRounds: number = 10,
): DraftEngineState {
  const packs = distributeIntoPacks(pool, groupIds.length)
  const selections = new Map<string, SkillLibraryEntry[]>()
  const lastPickWasRare = new Map<string, boolean>()
  for (const gid of groupIds) {
    selections.set(gid, [])
    lastPickWasRare.set(gid, false)
  }

  return { roomId, groupIds, packs, selections, lastPickWasRare, round: 1, totalRounds }
}

/** 获取指定组当前持有的包 */
export function getGroupPack(state: DraftEngineState, groupIndex: number): DraftPack | null {
  return state.packs.find(p => p.currentHolderIndex === groupIndex) ?? null
}

/** 执行一次选取 */
export function pickSkill(
  state: DraftEngineState,
  groupId: string,
  skillId: string,
): SkillLibraryEntry | null {
  const groupIndex = state.groupIds.indexOf(groupId)
  if (groupIndex === -1) return null

  const pack = getGroupPack(state, groupIndex)
  if (!pack) return null

  const skillIndex = pack.skills.findIndex(s => s.id === skillId)
  if (skillIndex === -1) return null

  const skill = pack.skills[skillIndex]!

  // 连续高稀有限制
  if (skill.rarity === 'rare' && state.lastPickWasRare.get(groupId)) {
    const hasNormal = pack.skills.some(s => s.rarity !== 'rare')
    if (hasNormal) return null
  }

  pack.skills.splice(skillIndex, 1)
  state.selections.get(groupId)!.push(skill)
  state.lastPickWasRare.set(groupId, skill.rarity === 'rare')

  return skill
}

/** 随机选取（超时/AI用） */
export function pickRandom(state: DraftEngineState, groupId: string): SkillLibraryEntry | null {
  const groupIndex = state.groupIds.indexOf(groupId)
  if (groupIndex === -1) return null

  const pack = getGroupPack(state, groupIndex)
  if (!pack || pack.skills.length === 0) return null

  const lastWasRare = state.lastPickWasRare.get(groupId) || false
  let candidates = pack.skills
  if (lastWasRare) {
    const normals = pack.skills.filter(s => s.rarity !== 'rare')
    if (normals.length > 0) candidates = normals
  }

  const randomIndex = Math.floor(Math.random() * candidates.length)
  return pickSkill(state, groupId, candidates[randomIndex]!.id)
}

/** 当前轮次是否所有组都已选取 */
export function isRoundComplete(state: DraftEngineState): boolean {
  const expectedPerGroup = state.round
  return state.groupIds.every(gid => state.selections.get(gid)!.length >= expectedPerGroup)
}

/**
 * 推进到下一轮 — 线性正向传递
 * 每个包始终传给下一个人: (holder + 1) % groupCount
 */
export function advanceRound(state: DraftEngineState): boolean {
  if (state.round >= state.totalRounds) return false

  state.round++
  const groupCount = state.groupIds.length
  for (const pack of state.packs) {
    pack.currentHolderIndex = (pack.currentHolderIndex + 1) % groupCount
  }

  return true
}

/** 轮抓是否全部结束 */
export function isDraftComplete(state: DraftEngineState): boolean {
  return state.round > state.totalRounds
}

/** 保留 keepCount 个，弃掉其余 */
export function finalizeSelection(
  state: DraftEngineState,
  groupId: string,
  keepIds: string[],
  keepCount: number = 7,
): { kept: SkillLibraryEntry[]; discarded: SkillLibraryEntry[] } {
  const selected = state.selections.get(groupId)!
  const kept = selected.filter(s => keepIds.includes(s.id)).slice(0, keepCount)
  const discarded = selected.filter(s => !keepIds.includes(s.id))
  state.selections.set(groupId, kept)
  return { kept, discarded }
}

/** 检查某技能对指定组是否可选（前端灰掉） */
export function canPickSkill(state: DraftEngineState, groupId: string, skill: SkillLibraryEntry): boolean {
  if (skill.rarity !== 'rare') return true
  if (!state.lastPickWasRare.get(groupId)) return true
  const groupIndex = state.groupIds.indexOf(groupId)
  const pack = getGroupPack(state, groupIndex)
  if (!pack) return false
  return !pack.skills.some(s => s.rarity !== 'rare')
}

/** 获取所有包中剩余技能（入地图池用） */
export function getRemainingPoolSkills(state: DraftEngineState): SkillLibraryEntry[] {
  const remaining: SkillLibraryEntry[] = []
  for (const pack of state.packs) {
    remaining.push(...pack.skills)
  }
  return remaining
}
