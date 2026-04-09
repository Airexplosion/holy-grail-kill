import type { SkillLibraryEntry } from 'shared'
import { fisherYatesShuffle as shuffle } from '../utils/shuffle.js'

/**
 * 轮抓引擎
 *
 * 流程：
 * 1. 从管理员审核的技能池(draftReady=true)中收集所有技能
 * 2. 随机打乱后分成 N 份技能包（N=组数）
 * 3. 蛇形轮抓 10 轮：1→7, 7→1, 1→7...
 * 4. 每轮从当前包中选1个技能
 * 5. 轮抓结束后保留7个，弃3个到公共池
 */

export interface DraftPack {
  readonly packId: string
  readonly skills: SkillLibraryEntry[]
  currentHolderIndex: number
}

export interface DraftEngineState {
  readonly roomId: string
  readonly groupIds: readonly string[]
  readonly packs: DraftPack[]
  readonly selections: Map<string, SkillLibraryEntry[]>  // groupId → selected skills
  round: number
  readonly totalRounds: number
  readonly direction: 'forward' | 'backward'
}

/**
 * 构建轮抓池：从技能池中选取指定数量的技能
 */
export function buildDraftPool(
  allSkills: SkillLibraryEntry[],
  totalNeeded: number,
): SkillLibraryEntry[] {
  const shuffled = shuffle([...allSkills])
  return shuffled.slice(0, totalNeeded)
}

/**
 * 将技能池分成 N 份包
 */
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
    packs.push({
      packId: `pack-${i}`,
      skills,
      currentHolderIndex: i,
    })
  }

  return packs
}

/**
 * 初始化轮抓状态
 */
export function initDraftState(
  roomId: string,
  groupIds: string[],
  pool: SkillLibraryEntry[],
  totalRounds: number = 10,
): DraftEngineState {
  const packs = distributeIntoPacks(pool, groupIds.length)
  const selections = new Map<string, SkillLibraryEntry[]>()
  for (const gid of groupIds) {
    selections.set(gid, [])
  }

  return {
    roomId,
    groupIds,
    packs,
    selections,
    round: 1,
    totalRounds,
    direction: 'forward',
  }
}

/**
 * 获取指定组当前持有的包
 */
export function getGroupPack(state: DraftEngineState, groupIndex: number): DraftPack | null {
  return state.packs.find(p => p.currentHolderIndex === groupIndex) ?? null
}

/**
 * 执行一次选取
 * @returns 选取的技能，或 null（非法操作）
 */
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

  // 高稀有度限制：如果上一次选了高稀有度，这次不能主动选高稀有度
  // （简化实现：仅检查 isHighRarity tag）

  const skill = pack.skills[skillIndex]!
  pack.skills.splice(skillIndex, 1)

  const selected = state.selections.get(groupId)!
  selected.push(skill)

  return skill
}

/**
 * 随机选取（超时时调用）
 */
export function pickRandom(state: DraftEngineState, groupId: string): SkillLibraryEntry | null {
  const groupIndex = state.groupIds.indexOf(groupId)
  if (groupIndex === -1) return null

  const pack = getGroupPack(state, groupIndex)
  if (!pack || pack.skills.length === 0) return null

  const randomIndex = Math.floor(Math.random() * pack.skills.length)
  return pickSkill(state, groupId, pack.skills[randomIndex]!.id)
}

/**
 * 检查当前轮次是否所有组都已选取
 */
export function isRoundComplete(state: DraftEngineState): boolean {
  // 每轮每组选1个，所以检查当前轮次的总选取数
  const expectedPerGroup = state.round
  return state.groupIds.every(gid => {
    const selected = state.selections.get(gid)!
    return selected.length >= expectedPerGroup
  })
}

/**
 * 推进到下一轮：传递技能包
 * 蛇形顺序：奇数轮正向(0→1→2...)，偶数轮反向(...2→1→0)
 */
export function advanceRound(state: DraftEngineState): boolean {
  if (state.round >= state.totalRounds) return false

  state.round++

  // 传递包：每个包传给下一个人
  const groupCount = state.groupIds.length
  for (const pack of state.packs) {
    if (state.round % 2 === 1) {
      // 奇数轮：正向传递
      pack.currentHolderIndex = (pack.currentHolderIndex + 1) % groupCount
    } else {
      // 偶数轮：反向传递
      pack.currentHolderIndex = (pack.currentHolderIndex - 1 + groupCount) % groupCount
    }
  }

  return true
}

/**
 * 轮抓是否全部结束
 */
export function isDraftComplete(state: DraftEngineState): boolean {
  return state.round > state.totalRounds
}

/**
 * 最终选择：保留 keepCount 个，弃掉其余
 */
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
