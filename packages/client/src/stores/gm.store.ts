import { create } from 'zustand'
import type { OperationLog, Card, CardLocation } from 'shared'

interface ActionSubmission {
  readonly playerId: string
  readonly actionType: string
  readonly payload: Record<string, unknown>
}

interface OperationFeedback {
  readonly success: boolean
  readonly message: string
}

interface GmState {
  readonly logs: readonly OperationLog[]
  readonly pendingActions: readonly ActionSubmission[]
  readonly allSubmitted: boolean
  readonly viewingPlayerCards: readonly Card[]
  readonly viewingPlayerId: string | null
  readonly viewingCardLocation: CardLocation | 'all'
  readonly selectedCardIds: ReadonlySet<string>
  readonly cardFeedback: OperationFeedback | null
  addLog: (log: OperationLog) => void
  setLogs: (logs: readonly OperationLog[]) => void
  setPendingActions: (actions: readonly ActionSubmission[]) => void
  setAllSubmitted: (v: boolean) => void
  setViewingPlayerCards: (cards: readonly Card[], playerId: string | null) => void
  setViewingCardLocation: (location: CardLocation | 'all') => void
  toggleCardSelection: (cardId: string) => void
  clearCardSelection: () => void
  setCardFeedback: (feedback: OperationFeedback | null) => void
  reset: () => void
}

export const useGmStore = create<GmState>((set) => ({
  logs: [],
  pendingActions: [],
  allSubmitted: false,
  viewingPlayerCards: [],
  viewingPlayerId: null,
  viewingCardLocation: 'all',
  selectedCardIds: new Set<string>(),
  cardFeedback: null,

  addLog: (log) => set((s) => ({ logs: [log, ...s.logs].slice(0, 200) })),
  setLogs: (logs) => set({ logs }),
  setPendingActions: (pendingActions) => set({ pendingActions }),
  setAllSubmitted: (allSubmitted) => set({ allSubmitted }),
  setViewingPlayerCards: (viewingPlayerCards, viewingPlayerId) =>
    set({ viewingPlayerCards, viewingPlayerId }),
  setViewingCardLocation: (viewingCardLocation) => set({ viewingCardLocation }),
  toggleCardSelection: (cardId) => set((s) => {
    if (s.selectedCardIds.has(cardId)) {
      return { selectedCardIds: new Set([...s.selectedCardIds].filter(id => id !== cardId)) }
    }
    return { selectedCardIds: new Set([...s.selectedCardIds, cardId]) }
  }),
  clearCardSelection: () => set({ selectedCardIds: new Set<string>() }),
  setCardFeedback: (cardFeedback) => set({ cardFeedback }),
  reset: () => set({
    logs: [],
    pendingActions: [],
    allSubmitted: false,
    viewingPlayerCards: [],
    viewingPlayerId: null,
    viewingCardLocation: 'all',
    selectedCardIds: new Set<string>(),
    cardFeedback: null,
  }),
}))
