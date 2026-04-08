import type { GamePhase } from './room.js'

export interface OperationLog {
  readonly id: string
  readonly roomId: string
  readonly playerId: string | null
  readonly actionType: string
  readonly description: string
  readonly details: Record<string, unknown>
  readonly phase: GamePhase
  readonly turnNumber: number
  readonly createdAt: number
}

export type LogCategory =
  | 'auth'
  | 'room'
  | 'phase'
  | 'action'
  | 'card'
  | 'skill'
  | 'map'
  | 'chat'
  | 'gm'
  | 'system'
