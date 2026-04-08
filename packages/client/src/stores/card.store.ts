import { create } from 'zustand'
import type { Card } from 'shared'

interface CardState {
  readonly hand: readonly Card[]
  readonly deckCount: number
  readonly discardCount: number
  readonly menuUnlocked: boolean
  readonly viewingDeck: readonly Card[]
  setHand: (hand: readonly Card[]) => void
  setDeckCount: (count: number) => void
  setDiscardCount: (count: number) => void
  setMenuUnlocked: (unlocked: boolean) => void
  setViewingDeck: (cards: readonly Card[]) => void
  reset: () => void
}

export const useCardStore = create<CardState>((set) => ({
  hand: [],
  deckCount: 0,
  discardCount: 0,
  menuUnlocked: false,
  viewingDeck: [],

  setHand: (hand) => set({ hand }),
  setDeckCount: (deckCount) => set({ deckCount }),
  setDiscardCount: (discardCount) => set({ discardCount }),
  setMenuUnlocked: (menuUnlocked) => set({ menuUnlocked }),
  setViewingDeck: (viewingDeck) => set({ viewingDeck }),
  reset: () => set({
    hand: [],
    deckCount: 0,
    discardCount: 0,
    menuUnlocked: false,
    viewingDeck: [],
  }),
}))
