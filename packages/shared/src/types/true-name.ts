import type { AttributeRank } from './attributes.js'

/** 真名猜测的3选1候选项 */
export interface TrueNameCandidate {
  /** 目标玩家ID */
  readonly targetPlayerId: string
  /** 目标显示名 */
  readonly targetDisplayName: string
  /** 3个候选真名（含1个正确+2个干扰） */
  readonly candidates: readonly string[]
  /** 是否已猜过（已猜过不能再猜） */
  readonly alreadyGuessed: boolean
}

/** 真名猜测结果 */
export interface TrueNameGuessResult {
  readonly targetPlayerId: string
  readonly guessedName: string
  readonly correct: boolean
  /** 猜中时返回五维属性 */
  readonly attributes?: RevealedAttributes
}

/** 被揭示的五维属性 */
export interface RevealedAttributes {
  readonly str: AttributeRank
  readonly end: AttributeRank
  readonly agi: AttributeRank
  readonly mag: AttributeRank
  readonly luk: AttributeRank
}

/** 已揭示真名的记录（持久化） */
export interface TrueNameReveal {
  readonly id: string
  /** 猜测者玩家ID */
  readonly guesserPlayerId: string
  /** 被猜中的目标玩家ID */
  readonly targetPlayerId: string
  /** 目标的真名 */
  readonly trueName: string
  /** 猜中时刻 */
  readonly revealedAt: number
}
