import { create } from 'zustand'
import type { OperationLog, Card } from 'shared'

interface ActionSubmission {
  readonly playerId: string
  readonly actionType: string
  readonly payload: Record<string, unknown>
}

interface GmState {
  readonly logs: readonly OperationLog[]
  readonly pendingActions: readonly ActionSubmission[]
  readonly allSubmitted: boolean
  readonly viewingPlayerCards: readonly Card[]
  readonly viewingPlayerId: string | null
  addLog: (log: OperationLog) => void
  setLogs: (logs: readonly OperationLog[]) => void
  setPendingActions: (actions: readonly ActionSubmission[]) => void
  setAllSubmitted: (v: boolean) => void
  setViewingPlayerCards: (cards: readonly Card[], playerId: string | null) => void
  reset: () => void
}

export const useGmStore = create<GmState>((set) => ({
  logs: [],
  pendingActions: [],
  allSubmitted: false,
  viewingPlayerCards: [],
  viewingPlayerId: null,

  addLog: (log) => set((s) => ({ logs: [log, ...s.logs].slice(0, 200) })),
  setLogs: (logs) => set({ logs }),
  setPendingActions: (pendingActions) => set({ pendingActions }),
  setAllSubmitted: (allSubmitted) => set({ allSubmitted }),
  setViewingPlayerCards: (viewingPlayerCards, viewingPlayerId) =>
    set({ viewingPlayerCards, viewingPlayerId }),
  reset: () => set({ logs: [], pendingActions: [], allSubmitted: false, viewingPlayerCards: [], viewingPlayerId: null }),
}))
