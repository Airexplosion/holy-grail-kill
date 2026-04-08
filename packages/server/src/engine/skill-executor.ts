/**
 * 技能执行器 — 技能调用入口
 *
 * - canUseSkill: 检查 CD/MP/charges
 * - executeSkill: 执行效果链
 * - triggerPassiveSkills: 扫描匹配 timing 的被动/触发技能
 * - processCooldowns: 回合结束 CD-1
 */

import type { SkillLibraryEntry, SkillTriggerTiming } from 'shared'
import { executeEffectChain, type EffectContext, type EffectResult } from './effect-pipeline.js'

/** 玩家运行时技能状态 */
export interface RuntimeSkill {
  readonly entry: SkillLibraryEntry
  cooldownRemaining: number
  chargesRemaining: number | null
  enabled: boolean
}

/** 检查技能是否可用 */
export function canUseSkill(
  skill: RuntimeSkill,
  playerMp: number,
  hasMpReduction: boolean,
): { usable: boolean; reason?: string } {
  if (!skill.enabled) return { usable: false, reason: '技能已禁用' }
  if (skill.cooldownRemaining > 0) return { usable: false, reason: `冷却中 (${skill.cooldownRemaining}回合)` }
  if (skill.chargesRemaining !== null && skill.chargesRemaining <= 0) return { usable: false, reason: '使用次数已耗尽' }

  const mpCost = getEffectiveMpCost(skill.entry, hasMpReduction)
  if (mpCost > playerMp) return { usable: false, reason: `MP不足 (需要${mpCost}, 当前${playerMp})` }

  return { usable: true }
}

/** 获取实际 MP 消耗（考虑节能回路） */
export function getEffectiveMpCost(skill: SkillLibraryEntry, hasMpReduction: boolean): number {
  const baseCost = skill.cost?.mp || 0
  if (!hasMpReduction || baseCost === 0) return baseCost
  return Math.max(1, baseCost - 1)
}

/** 执行主动技能 */
export function executeSkill(
  skill: RuntimeSkill,
  ctx: EffectContext,
  hasMpReduction: boolean,
): { results: EffectResult[]; mpCost: number } {
  const mpCost = getEffectiveMpCost(skill.entry, hasMpReduction)

  // Deduct MP
  const source = ctx.playerStates.get(ctx.sourceId)
  if (source) source.mp -= mpCost

  // Execute effect chain
  const results = executeEffectChain(skill.entry.effects, ctx)

  // Apply cooldown
  if (skill.entry.cooldown > 0) {
    skill.cooldownRemaining = skill.entry.cooldown
  }

  // Consume charge
  if (skill.chargesRemaining !== null) {
    skill.chargesRemaining--
  }

  ctx.events.push({
    type: 'skill_use',
    playerId: ctx.sourceId,
    description: `使用技能: ${skill.entry.name}`,
    data: { skillId: skill.entry.id, mpCost },
  })

  return { results, mpCost }
}

/** 扫描并触发匹配 timing 的被动/触发技能 */
export function triggerPassiveSkills(
  timing: SkillTriggerTiming,
  playerId: string,
  playerSkills: RuntimeSkill[],
  ctx: EffectContext,
  maxDepth: number = 3,
): EffectResult[] {
  if (maxDepth <= 0) return []

  const results: EffectResult[] = []
  for (const skill of playerSkills) {
    if (!skill.enabled) continue
    if (skill.entry.type === 'active') continue
    if (skill.entry.triggerTiming !== timing) continue
    if (skill.cooldownRemaining > 0) continue
    if (skill.chargesRemaining !== null && skill.chargesRemaining <= 0) continue

    const effectResults = executeEffectChain(skill.entry.effects, ctx)
    results.push(...effectResults)

    if (skill.entry.cooldown > 0) {
      skill.cooldownRemaining = skill.entry.cooldown
    }
    if (skill.chargesRemaining !== null) {
      skill.chargesRemaining--
    }

    ctx.events.push({
      type: 'skill_trigger',
      playerId,
      description: `触发技能: ${skill.entry.name}`,
      data: { skillId: skill.entry.id, timing },
    })
  }
  return results
}

/** 回合结束：所有技能 CD-1 */
export function processCooldowns(skills: RuntimeSkill[]) {
  for (const skill of skills) {
    if (skill.cooldownRemaining > 0) {
      skill.cooldownRemaining--
    }
  }
}

/** 从技能库条目创建运行时技能 */
export function createRuntimeSkill(entry: SkillLibraryEntry): RuntimeSkill {
  return {
    entry,
    cooldownRemaining: 0,
    chargesRemaining: entry.charges ?? null,
    enabled: true,
  }
}

/** 检查玩家是否有节能回路 (b07) */
export function hasMpReductionPassive(skills: RuntimeSkill[]): boolean {
  return skills.some(s =>
    s.enabled && s.entry.effects.some(e => e.effectType === 'mpReduction'),
  )
}
