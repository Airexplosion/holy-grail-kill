/**
 * AI 决策引擎
 *
 * 为单机模式中的AI角色提供决策能力：
 * - 轮抓选技能
 * - 组卡（击牌颜色分配 + 技能选择）
 * - 行动阶段决策（移动/侦查/放据点/宣战）
 * - 战斗出牌和响应
 *
 * 设计原则：简单优先，基于模板偏好 + 随机性
 */

import type { AiTemplate, AiActionStyle } from 'shared'
import type { SkillLibraryEntry } from 'shared'
import type { ActionType } from 'shared'

// ── 轮抓 ──

/**
 * AI 从可选技能中选1个
 * 策略：优先选匹配偏好标签的技能，否则随机
 */
export function pickDraftSkill(
  availableSkills: readonly SkillLibraryEntry[],
  template: AiTemplate,
): SkillLibraryEntry | null {
  if (availableSkills.length === 0) return null

  // 按偏好标签评分
  const scored = availableSkills.map(skill => {
    const tags = skill.tags || []
    let score = 0
    for (const pref of template.skillPreferenceTags) {
      if (tags.includes(pref)) score += 10
    }
    // 高稀有度加分
    if (skill.rarity === 'rare') score += 5
    // 加随机扰动（0~3）避免完全确定性
    score += Math.random() * 3
    return { skill, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.skill || availableSkills[0]!
}

// ── 组卡 ──

/**
 * AI 自动组卡
 * 返回击牌分配和技能选择
 */
export function buildDeck(
  ownedSkillIds: readonly string[],
  template: AiTemplate,
): { strikeCards: { red: number; blue: number; green: number }; skillIds: string[] } {
  const [red, blue, green] = template.strikeCardRatio
  return {
    strikeCards: { red: red!, blue: blue!, green: green! },
    skillIds: [...ownedSkillIds],
  }
}

// ── 行动阶段 ──

/**
 * AI 决定行动阶段的行动
 *
 * @param style AI行动风格
 * @param currentRegionId 当前所在区域
 * @param adjacentRegionIds 可达的相邻区域
 * @param allRegionIds 所有区域
 * @param hasOutpostInRegion 当前区域是否已有自己的据点
 * @param outpostCount 当前据点数
 * @param maxOutposts 据点上限
 * @param knownEnemyRegions 已知有敌人的区域
 */
export function decideAction(params: {
  style: AiActionStyle
  currentRegionId: string | null
  adjacentRegionIds: readonly string[]
  allRegionIds: readonly string[]
  hasOutpostInRegion: boolean
  outpostCount: number
  maxOutposts: number
  knownEnemyRegions: readonly string[]
  actionPointsRemaining: number
}): { actionType: ActionType; payload: Record<string, unknown> } {
  const {
    style, currentRegionId, adjacentRegionIds, allRegionIds,
    hasOutpostInRegion, outpostCount, maxOutposts,
    knownEnemyRegions, actionPointsRemaining,
  } = params

  if (actionPointsRemaining <= 0 || !currentRegionId) {
    return { actionType: 'skip', payload: {} }
  }

  const roll = Math.random()

  // 激进型：优先移动到有敌人的区域/宣战
  if (style === 'aggressive') {
    const enemyAdjacent = adjacentRegionIds.filter(id => knownEnemyRegions.includes(id))
    if (enemyAdjacent.length > 0 && roll < 0.7) {
      const target = enemyAdjacent[Math.floor(Math.random() * enemyAdjacent.length)]!
      return { actionType: 'move_adjacent', payload: { targetRegionId: target } }
    }
  }

  // 探索型：优先移动和侦查
  if (style === 'explorer') {
    if (roll < 0.4 && adjacentRegionIds.length > 0) {
      const target = adjacentRegionIds[Math.floor(Math.random() * adjacentRegionIds.length)]!
      return { actionType: 'scout', payload: { targetRegionId: target } }
    }
    if (roll < 0.8 && adjacentRegionIds.length > 0) {
      const target = adjacentRegionIds[Math.floor(Math.random() * adjacentRegionIds.length)]!
      return { actionType: 'move_adjacent', payload: { targetRegionId: target } }
    }
  }

  // 防御型：优先放据点
  if (style === 'defensive') {
    if (!hasOutpostInRegion && outpostCount < maxOutposts && roll < 0.5) {
      return { actionType: 'place_outpost', payload: { regionId: currentRegionId } }
    }
  }

  // 通用逻辑
  // 30% 侦查
  if (roll < 0.3 && adjacentRegionIds.length > 0) {
    const target = adjacentRegionIds[Math.floor(Math.random() * adjacentRegionIds.length)]!
    return { actionType: 'scout', payload: { targetRegionId: target } }
  }

  // 40% 移动
  if (roll < 0.7 && adjacentRegionIds.length > 0) {
    const target = adjacentRegionIds[Math.floor(Math.random() * adjacentRegionIds.length)]!
    return { actionType: 'move_adjacent', payload: { targetRegionId: target } }
  }

  // 20% 放据点
  if (!hasOutpostInRegion && outpostCount < maxOutposts) {
    return { actionType: 'place_outpost', payload: { regionId: currentRegionId } }
  }

  // 兜底：跳过
  return { actionType: 'skip', payload: {} }
}

// ── 战斗 ──

/**
 * AI 决定战斗中的出牌
 *
 * 优先级：
 * 1. 有可用主动技能且MP足够 → 使用技能
 * 2. 有击牌 → 打数量最多的颜色
 * 3. pass
 */
export function decideCombatAction(params: {
  hand: readonly { id: string; color: string; type: string }[]
  mp: number
  skills: readonly { id: string; cost?: { mp?: number }; type: string; cooldownRemaining: number }[]
  targetIds: readonly string[]
}): { type: 'strike'; cardId: string; targetId: string }
   | { type: 'skill'; skillId: string; targetId?: string }
   | { type: 'pass' } {

  const { hand, mp, skills, targetIds } = params
  if (targetIds.length === 0) return { type: 'pass' }

  const target = targetIds[Math.floor(Math.random() * targetIds.length)]!

  // 尝试使用主动技能（30%概率）
  if (Math.random() < 0.3) {
    const usableSkill = skills.find(s =>
      s.type === 'active' &&
      s.cooldownRemaining <= 0 &&
      (!s.cost?.mp || mp >= s.cost.mp),
    )
    if (usableSkill) {
      return { type: 'skill', skillId: usableSkill.id, targetId: target }
    }
  }

  // 打击牌
  const strikeCards = hand.filter(c => c.type === 'strike' || ['red', 'blue', 'green', 'colorless'].includes(c.color))
  if (strikeCards.length > 0) {
    // 数各颜色数量，打最多的
    const colorCounts = new Map<string, typeof strikeCards>()
    for (const card of strikeCards) {
      const list = colorCounts.get(card.color) || []
      list.push(card)
      colorCounts.set(card.color, list)
    }

    let bestColor = ''
    let bestCount = 0
    for (const [color, cards] of colorCounts) {
      if (cards.length > bestCount) {
        bestCount = cards.length
        bestColor = color
      }
    }

    const chosen = colorCounts.get(bestColor)?.[0]
    if (chosen) {
      return { type: 'strike', cardId: chosen.id, targetId: target }
    }
  }

  return { type: 'pass' }
}

/**
 * AI 决定是否响应攻击
 *
 * 策略：有对应颜色的牌 → 70%概率响应
 */
export function decideResponse(params: {
  attackColor: string
  hand: readonly { id: string; color: string }[]
  requiredResponseColor: string
}): { respond: boolean; cardId?: string } {
  const { hand, requiredResponseColor } = params

  const responseCards = hand.filter(c => c.color === requiredResponseColor)
  if (responseCards.length === 0) return { respond: false }

  // 70% 响应
  if (Math.random() < 0.7) {
    return { respond: true, cardId: responseCards[0]!.id }
  }

  return { respond: false }
}

// ── 技能提交（轮抓前）──

/**
 * AI 自动生成轮抓用的技能提交
 * 从技能库中随机选取符合模板偏好的技能作为"提交"
 */
export function generateSkillSubmission(
  allSkills: readonly SkillLibraryEntry[],
  template: AiTemplate,
  baseCount: number,
  linkCount: number,
): { baseSkills: SkillLibraryEntry[]; linkSkills: SkillLibraryEntry[] } {
  const shuffled = [...allSkills].sort(() => Math.random() - 0.5)

  // 偏好优先
  const preferred = shuffled.filter(s =>
    (s.tags || []).some(t => template.skillPreferenceTags.includes(t)),
  )
  const others = shuffled.filter(s =>
    !(s.tags || []).some(t => template.skillPreferenceTags.includes(t)),
  )

  const pool = [...preferred, ...others]

  const aSkills = pool.filter(s => s.skillClass === 'A')
  const bSkills = pool.filter(s => s.skillClass === 'B')

  return {
    baseSkills: aSkills.slice(0, baseCount),
    linkSkills: bSkills.slice(0, linkCount),
  }
}
