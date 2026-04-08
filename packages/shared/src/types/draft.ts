import type { SkillLibraryEntry } from './skill.js'

// TODO: 轮抓阶段 — 仅接口定义，实现待后续

/** 轮抓池 */
export interface DraftPool {
  readonly skills: readonly SkillLibraryEntry[]
}

/** 轮抓状态 */
export interface DraftState {
  readonly roomId: string
  readonly roundNumber: number
  readonly currentPickerIndex: number
  readonly pickOrder: readonly string[]
  readonly picks: readonly DraftPick[]
  readonly pool: DraftPool
}

/** 单次选取 */
export interface DraftPick {
  readonly playerId: string
  readonly skillId: string
  readonly roundNumber: number
  readonly pickNumber: number
}

/** 轮抓配置 */
export interface DraftConfig {
  readonly roundCount: number
  readonly picksPerRound: number
  readonly rarityDistribution: { readonly normal: number; readonly rare: number }
}
