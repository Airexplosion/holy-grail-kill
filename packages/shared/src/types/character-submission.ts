/**
 * 角色提交系统
 *
 * 玩家创建角色（1来源名 + 4A + 2B = 6技能），提交GM审核。
 * 角色是 account 级别的，跨房间复用。
 */

import type { SkillType, SkillTriggerTiming } from './skill.js'
import type { CardColor } from './strike-card.js'

/** 角色审核状态 */
export type CharacterStatus = 'draft' | 'pending' | 'approved' | 'rejected'

/** 角色内的单个技能定义 */
export interface CharacterSkillDef {
  readonly id: string
  readonly name: string
  readonly skillClass: 'A' | 'B'
  readonly rarity: 'normal' | 'rare'
  readonly type: SkillType | 'card'
  readonly triggerTiming?: SkillTriggerTiming
  readonly description: string
  readonly cost?: string
  readonly cardCount?: number
  readonly cardColor?: CardColor
}

/** 玩家创建的角色 */
export interface PlayerCharacter {
  readonly id: string
  readonly accountId: string
  readonly sourceName: string
  readonly status: CharacterStatus
  readonly reviewNotes: string | null
  readonly skills: readonly CharacterSkillDef[]
  readonly createdAt: number
  readonly updatedAt: number
}

/** 角色状态中文标签 */
export const CHARACTER_STATUS_LABELS: Record<CharacterStatus, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
}

/** 每角色技能数 */
export const SKILLS_PER_CHARACTER = 6
/** A级技能数 */
export const A_CLASS_COUNT = 4
/** B级技能数 */
export const B_CLASS_COUNT = 2
