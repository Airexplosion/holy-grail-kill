export interface Room {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly gmPlayerId: string | null
  readonly config: RoomConfig
  readonly phase: GamePhase
  readonly turnNumber: number
  readonly currentActionPointIndex: number
  readonly status: RoomStatus
  readonly createdAt: number
  readonly updatedAt: number
}

export type RoomStatus = 'waiting' | 'active' | 'paused' | 'finished'

export type GamePhase =
  | 'round_start'
  | 'preparation'
  | 'action'
  | 'standby'
  | 'combat'
  | 'round_end'

export interface RoomConfig {
  readonly maxOutpostsPerPlayer: number
  readonly defaultActionPoints: number
  readonly defaultHp: number
  readonly defaultHpMax: number
  readonly defaultMp: number
  readonly defaultMpMax: number
  readonly minPlayers: number
  readonly maxPlayers: number
  readonly customRules: Record<string, unknown>
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  maxOutpostsPerPlayer: 3,
  defaultActionPoints: 4,
  defaultHp: 100,
  defaultHpMax: 100,
  defaultMp: 50,
  defaultMpMax: 50,
  minPlayers: 7,
  maxPlayers: 28,
  customRules: {},
}
