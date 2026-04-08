import type { GamePhase } from '../types/room.js'

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

export function getNextPhase(current: GamePhase): GamePhase | null {
  const idx = PHASE_ORDER.indexOf(current)
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null
  return PHASE_ORDER[idx + 1] ?? null
}

export function isValidPhaseTransition(from: GamePhase, to: GamePhase): boolean {
  const fromIdx = PHASE_ORDER.indexOf(from)
  const toIdx = PHASE_ORDER.indexOf(to)
  return toIdx === fromIdx + 1
}
