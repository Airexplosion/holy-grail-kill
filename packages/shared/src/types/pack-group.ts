/**
 * 技能包组
 *
 * 每4个角色组成1个技能包组（24技能）。
 * 轮抓时选2个包组 = 48技能作为底池基础。
 * Admin 管理，存储在 DB 中。
 */

/** 技能包组 */
export interface SkillPackGroup {
  readonly id: string
  readonly name: string
  /** 4个角色的来源名（sourceName / flavorText） */
  readonly characterSourceNames: readonly string[]
  readonly createdAt: number
  readonly updatedAt: number
}

/** 每个包组的角色数 */
export const CHARACTERS_PER_GROUP = 4
/** 每个包组的技能数 (4角色 × 6技能) */
export const SKILLS_PER_GROUP = 24
/** 轮抓时选取的包组数 */
export const PACK_GROUPS_PER_DRAFT = 2
