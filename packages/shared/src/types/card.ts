export interface Card {
  readonly id: string
  readonly roomId: string
  readonly playerId: string
  readonly name: string
  readonly type: CardType
  readonly description: string
  readonly metadata: CardMetadata
  readonly location: CardLocation
  readonly position: number
  readonly createdAt: number
}

export type CardLocation = 'deck' | 'hand' | 'discard'

export type CardType = 'normal' | 'skill' | 'equipment' | 'special' | 'event' | string

export interface CardMetadata {
  readonly [key: string]: unknown
  readonly skillEffect?: SkillEffectRef
  readonly cost?: number
  readonly tags?: readonly string[]
}

export interface SkillEffectRef {
  readonly effectId: string
  readonly params: Record<string, unknown>
}

export interface CardOperationResult {
  readonly success: boolean
  readonly cards?: readonly Card[]
  readonly error?: string
}

export type CardOperation =
  | { type: 'draw'; count: number }
  | { type: 'discard'; cardIds: readonly string[] }
  | { type: 'draw_specific'; cardId: string }
  | { type: 'retrieve_from_discard'; cardId: string }
  | { type: 'shuffle_deck' }
  | { type: 'view_deck' }
  | { type: 'insert'; card: Omit<Card, 'id' | 'roomId' | 'playerId' | 'createdAt'>; location: CardLocation; position: number }
  | { type: 'transfer'; fromPlayerId: string; toPlayerId: string; cardIds: readonly string[] }
