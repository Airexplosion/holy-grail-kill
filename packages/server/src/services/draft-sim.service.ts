/**
 * 轮抓模拟器服务 — 纯内存运行，不写DB
 */

import { v4 as uuid } from 'uuid'
import { buildDraftPool, initDraftState, pickSkill, pickRandom, isRoundComplete, advanceRound, isDraftComplete, finalizeSelection, getRemainingPoolSkills } from '../engine/draft-engine.js'
import * as aiBrain from './ai-brain.service.js'
import * as packGroupService from './pack-group.service.js'
import { AI_TEMPLATES, SKILL_LIBRARY } from 'shared'
import type { SkillLibraryEntry, AiTemplate } from 'shared'

interface SimGroup { id: string; name: string; isHuman: boolean; template: AiTemplate | null }
interface RoundPick { round: number; groupName: string; skillName: string; skillId: string; rarity: string }
interface DraftSimSession { id: string; state: ReturnType<typeof initDraftState>; groups: SimGroup[]; humanGroupId: string; finalized: boolean; poolSkills: SkillLibraryEntry[]; pickHistory: RoundPick[] }

const sessions = new Map<string, DraftSimSession>()

/**
 * 创建模拟会话 — 返回底池信息和第一个包
 * @param packGroupIds — 可选，2个包组ID。传入时走"选包"逻辑，不传走旧的随机15角色逻辑。
 */
export function createSession(playerName: string, packGroupIds?: string[]) {
  const sessionId = uuid()

  const humanGroupId = uuid()
  const groups: SimGroup[] = [
    { id: humanGroupId, name: playerName, isHuman: true, template: null },
  ]

  const selectedTemplates = [...AI_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 6)
  for (const t of selectedTemplates) {
    groups.push({ id: uuid(), name: t.displayName, isHuman: false, template: t })
  }

  // ── 底池构建：按完整角色入池 ──
  // 1. 按角色分组
  const allSkills = [...SKILL_LIBRARY] as SkillLibraryEntry[]
  const characterMap = new Map<string, SkillLibraryEntry[]>()
  for (const s of allSkills) {
    const src = s.flavorText || '通用'
    if (!characterMap.has(src)) characterMap.set(src, [])
    characterMap.get(src)!.push(s)
  }

  // 排除"通用"（无角色来源的技能）
  const characterNames = [...characterMap.keys()].filter(n => n !== '通用')

  let selectedCharNames: string[]
  let packGroup1Name: string | undefined
  let packGroup2Name: string | undefined
  let poolSkills: SkillLibraryEntry[]
  let randomRareSkill: SkillLibraryEntry | null = null

  if (packGroupIds && packGroupIds.length === 2) {
    // ── 选包逻辑：2个包组(8角色=48技能) + 随机7角色(42技能) + 1高稀有 ──
    const group1 = packGroupService.getPackGroupById(packGroupIds[0]!)
    const group2 = packGroupService.getPackGroupById(packGroupIds[1]!)
    if (!group1 || !group2) throw new Error('包组不存在')

    packGroup1Name = group1.name
    packGroup2Name = group2.name

    // 包组角色名
    const packCharNames = [...group1.characterSourceNames, ...group2.characterSourceNames]
    const packSkills = packGroupService.getSkillsBySourceNames(packCharNames)

    // 从剩余角色中随机选7个
    const packCharSet = new Set(packCharNames)
    const remainingChars = characterNames
      .filter(n => !packCharSet.has(n))
      .sort(() => Math.random() - 0.5)
    const randomCharNames = remainingChars.slice(0, 7)

    const randomCharSkills: SkillLibraryEntry[] = []
    for (const name of randomCharNames) {
      randomCharSkills.push(...(characterMap.get(name) || []))
    }

    selectedCharNames = [...packCharNames, ...randomCharNames]
    poolSkills = [...packSkills, ...randomCharSkills]

    // 从剩余角色（排除包组+随机7）中随机1个高稀有度技能
    const allUsedChars = new Set([...packCharNames, ...randomCharNames])
    const leftoverChars = characterNames
      .filter(n => !allUsedChars.has(n))
      .sort(() => Math.random() - 0.5)

    for (const name of leftoverChars) {
      const charSkills = characterMap.get(name) || []
      const rares = charSkills.filter(s => s.rarity === 'rare')
      if (rares.length > 0) {
        randomRareSkill = rares[Math.floor(Math.random() * rares.length)]!
        poolSkills.push(randomRareSkill)
        break
      }
    }
    if (!randomRareSkill) {
      const genericRares = (characterMap.get('通用') || []).filter(s => s.rarity === 'rare')
      if (genericRares.length > 0) {
        randomRareSkill = genericRares[Math.floor(Math.random() * genericRares.length)]!
        poolSkills.push(randomRareSkill)
      }
    }
  } else {
    // ── 旧逻辑：随机15角色 ──
    const shuffledChars = characterNames.sort(() => Math.random() - 0.5)

    selectedCharNames = shuffledChars.slice(0, 15)
    poolSkills = []
    for (const name of selectedCharNames) {
      poolSkills.push(...(characterMap.get(name) || []))
    }

    const remainingChars = shuffledChars.slice(15)
    for (const name of remainingChars) {
      const charSkills = characterMap.get(name) || []
      const rares = charSkills.filter(s => s.rarity === 'rare')
      if (rares.length > 0) {
        randomRareSkill = rares[Math.floor(Math.random() * rares.length)]!
        poolSkills.push(randomRareSkill)
        break
      }
    }
    if (!randomRareSkill) {
      const genericRares = (characterMap.get('通用') || []).filter(s => s.rarity === 'rare')
      if (genericRares.length > 0) {
        randomRareSkill = genericRares[Math.floor(Math.random() * genericRares.length)]!
        poolSkills.push(randomRareSkill)
      }
    }
  }

  const groupIds = groups.map(g => g.id)
  const state = initDraftState(sessionId, groupIds, poolSkills, 10)

  const session: DraftSimSession = { id: sessionId, state, groups, humanGroupId, finalized: false, poolSkills, pickHistory: [] }
  sessions.set(sessionId, session)

  return {
    sessionId,
    groups: groups.map(g => ({ id: g.id, name: g.name, isHuman: g.isHuman })),
    round: state.round,
    totalRounds: state.totalRounds,
    currentPack: getGroupPackSkills(state, groupIds.indexOf(humanGroupId)),
    poolInfo: {
      totalSkills: poolSkills.length,
      selectedCharacters: selectedCharNames,
      packGroup1Name,
      packGroup2Name,
      publicCharacters: selectedCharNames,
      randomRareSkill: randomRareSkill ? { name: randomRareSkill.name, sourceName: randomRareSkill.flavorText || '未知', description: randomRareSkill.description } : null,
      skillsBySource: selectedCharNames.map(name => ({
        name,
        count: (characterMap.get(name) || []).length,
      })),
    },
  }
}

/**
 * 选技能 → AI跟选 → 推进轮次
 * 10轮后自动标记完成
 */
export function pick(sessionId: string, skillId: string) {
  const session = sessions.get(sessionId)
  if (!session) return { success: false, error: '会话不存在', round: 0, totalRounds: 0, draftComplete: false, currentPack: [] as SkillLibraryEntry[], selectionCounts: {} as Record<string, number> }

  const { state, groups, humanGroupId } = session

  // 10轮已满不能再选
  const humanSelections = state.selections.get(humanGroupId)!
  if (humanSelections.length >= state.totalRounds) {
    return { success: false, error: '10轮已完成', round: state.round, totalRounds: state.totalRounds, draftComplete: true, currentPack: [] as SkillLibraryEntry[], selectionCounts: getSelectionCounts(groups, state) }
  }

  const currentRound = state.round
  const picked = pickSkill(state, humanGroupId, skillId)
  if (!picked) {
    const skill = state.packs.flatMap(p => p.skills).find(s => s.id === skillId)
    const errorMsg = skill?.rarity === 'rare' ? '不能连续两轮选择高稀有度' : '选取失败'
    return { success: false, error: errorMsg, round: state.round, totalRounds: state.totalRounds, draftComplete: false, currentPack: getGroupPackSkills(state, groups.findIndex(g => g.id === humanGroupId)), selectionCounts: getSelectionCounts(groups, state) }
  }

  // 记录人类选取
  const humanGroup = groups.find(g => g.id === humanGroupId)!
  session.pickHistory.push({ round: currentRound, groupName: humanGroup.name, skillName: picked.name, skillId: picked.id, rarity: picked.rarity })

  // AI 全部选
  const aiPicks: Array<{ groupName: string; skillName: string }> = []
  for (const group of groups) {
    if (group.isHuman) continue
    const idx = groups.findIndex(g => g.id === group.id)
    const aiPack = getGroupPackSkills(state, idx)
    if (aiPack.length === 0) continue

    const template = group.template || AI_TEMPLATES[0]!
    const chosen = aiBrain.pickDraftSkill(aiPack, template)
    let aiPicked: SkillLibraryEntry | null = null
    if (chosen) {
      aiPicked = pickSkill(state, group.id, chosen.id)
      if (!aiPicked) aiPicked = pickRandom(state, group.id)
    } else {
      aiPicked = pickRandom(state, group.id)
    }
    if (aiPicked) {
      aiPicks.push({ groupName: group.name, skillName: aiPicked.name })
      session.pickHistory.push({ round: currentRound, groupName: group.name, skillName: aiPicked.name, skillId: aiPicked.id, rarity: aiPicked.rarity })
    }
  }

  // 推进轮次
  if (isRoundComplete(state)) {
    advanceRound(state)
  }

  // 10轮选完？
  const allDone = humanSelections.length >= state.totalRounds
  const humanIdx = groups.findIndex(g => g.id === humanGroupId)

  return {
    success: true,
    pickedSkill: picked,
    aiPicks,
    round: Math.min(state.round, state.totalRounds),
    totalRounds: state.totalRounds,
    draftComplete: allDone,
    currentPack: allDone ? [] : getGroupPackSkills(state, humanIdx),
    selectionCounts: getSelectionCounts(groups, state),
  }
}

/**
 * 获取所有人的选取结果（10轮结束后可调用）
 */
export function getResults(sessionId: string) {
  const session = sessions.get(sessionId)
  if (!session) return null
  const { state, groups } = session

  return {
    groups: groups.map(group => ({
      name: group.name,
      isHuman: group.isHuman,
      selections: state.selections.get(group.id) || [],
    })),
    remainingPool: getRemainingPoolSkills(state),
  }
}

/**
 * 定稿：保7弃3，AI自动定稿，返回地图池和全员复盘
 */
export function finalize(sessionId: string, keepIds: string[]) {
  const session = sessions.get(sessionId)
  if (!session) return null
  const { state, groups, humanGroupId } = session

  const humanResult = finalizeSelection(state, humanGroupId, keepIds, 7)

  const allResults: Array<{ name: string; isHuman: boolean; kept: SkillLibraryEntry[]; discarded: SkillLibraryEntry[] }> = []
  allResults.push({ name: groups.find(g => g.id === humanGroupId)!.name, isHuman: true, kept: humanResult.kept, discarded: humanResult.discarded })

  for (const group of groups) {
    if (group.isHuman) continue
    const selections = state.selections.get(group.id) || []
    const aiKeepIds = selections.slice(0, 7).map(s => s.id)
    const aiResult = finalizeSelection(state, group.id, aiKeepIds, 7)
    allResults.push({ name: group.name, isHuman: false, kept: aiResult.kept, discarded: aiResult.discarded })
  }

  // 地图池 = 所有弃牌 + 包中剩余
  const mapPool = [
    ...allResults.flatMap(r => r.discarded),
    ...getRemainingPoolSkills(state),
  ]

  session.finalized = true

  // 按轮次整理选取历史
  const pickHistory = session.pickHistory

  return { success: true, kept: humanResult.kept, discarded: humanResult.discarded, mapPool, allResults, pickHistory }
}

export function getSession(sessionId: string) {
  const s = sessions.get(sessionId)
  if (!s) return null
  return { groups: s.groups.map(g => ({ id: g.id, name: g.name, isHuman: g.isHuman })), round: s.state.round, totalRounds: s.state.totalRounds, finalized: s.finalized }
}

export function deleteSession(sessionId: string) { sessions.delete(sessionId) }

// ── 内部 ──

function getGroupPackSkills(state: ReturnType<typeof initDraftState>, groupIndex: number): SkillLibraryEntry[] {
  const pack = state.packs.find(p => p.currentHolderIndex === groupIndex)
  return pack ? [...pack.skills] : []
}

function getSelectionCounts(groups: SimGroup[], state: ReturnType<typeof initDraftState>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const g of groups) counts[g.name] = state.selections.get(g.id)?.length || 0
  return counts
}
