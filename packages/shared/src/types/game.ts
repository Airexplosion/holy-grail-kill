import type { GamePhase, RoomConfig } from './room.js'
import type { MapState } from './map.js'

export interface GameState {
  readonly roomId: string
  readonly phase: GamePhase
  readonly turnNumber: number
  readonly currentActionPointIndex: number
  readonly config: RoomConfig
  readonly map: MapState
}

export interface PhaseTransition {
  readonly from: GamePhase
  readonly to: GamePhase
  readonly turnNumber: number
  readonly timestamp: number
}

export const PHASE_ORDER: readonly GamePhase[] = [
  'round_start',
  'preparation',
  'action',
  'standby',
  'combat',
  'round_end',
]

export const PHASE_LABELS: Record<GamePhase, string> = {
  round_start: '回合开始',
  preparation: '准备阶段',
  action: '行动阶段',
  standby: '备战阶段',
  combat: '战斗阶段',
  round_end: '回合结束',
}
