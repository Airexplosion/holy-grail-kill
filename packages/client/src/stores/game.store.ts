import { create } from 'zustand'
import type { GamePhase } from 'shared'

interface GameState {
  readonly phase: GamePhase
  readonly turnNumber: number
  readonly currentActionPointIndex: number
  readonly actionPoints: number
  readonly actionPointsMax: number
  readonly actionSubmitted: boolean
  setPhase: (phase: GamePhase) => void
  setTurnNumber: (turn: number) => void
  setActionPointIndex: (index: number) => void
  setActionPoints: (ap: number, max: number) => void
  setActionSubmitted: (submitted: boolean) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'round_start',
  turnNumber: 0,
  currentActionPointIndex: 0,
  actionPoints: 4,
  actionPointsMax: 4,
  actionSubmitted: false,

  setPhase: (phase) => set({ phase }),
  setTurnNumber: (turnNumber) => set({ turnNumber }),
  setActionPointIndex: (currentActionPointIndex) =>
    set({ currentActionPointIndex, actionSubmitted: false }),
  setActionPoints: (actionPoints, actionPointsMax) =>
    set({ actionPoints, actionPointsMax }),
  setActionSubmitted: (actionSubmitted) => set({ actionSubmitted }),
  reset: () => set({
    phase: 'round_start',
    turnNumber: 0,
    currentActionPointIndex: 0,
    actionPoints: 4,
    actionPointsMax: 4,
    actionSubmitted: false,
  }),
}))
