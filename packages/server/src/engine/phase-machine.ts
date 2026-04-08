import type { GamePhase } from 'shared'
import { PHASE_ORDER } from 'shared'

export function getNextPhase(current: GamePhase): GamePhase | null {
  const idx = PHASE_ORDER.indexOf(current)
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return null
  return PHASE_ORDER[idx + 1]!
}

export function isLastPhase(phase: GamePhase): boolean {
  return phase === 'round_end'
}

export function isActionPhase(phase: GamePhase): boolean {
  return phase === 'action'
}

export function validatePhaseTransition(from: GamePhase, to: GamePhase): boolean {
  const fromIdx = PHASE_ORDER.indexOf(from)
  const toIdx = PHASE_ORDER.indexOf(to)
  return toIdx === fromIdx + 1
}
