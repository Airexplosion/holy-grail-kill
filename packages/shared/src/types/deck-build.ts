import type { PlayerStrikeSelection } from './strike-card.js'

/** 玩家组卡配置 */
export interface DeckBuild {
  readonly id: string
  readonly roomId: string
  readonly playerId: string
  readonly strikeCards: PlayerStrikeSelection
  readonly skillIds: readonly string[]
  readonly isLocked: boolean
  readonly createdAt: number
  readonly updatedAt: number
}

/** 组卡校验结果 */
export interface DeckBuildValidation {
  readonly valid: boolean
  readonly errors: readonly string[]
}
