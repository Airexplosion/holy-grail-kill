import { create } from 'zustand'
import type { SoloStage, SoloGameResult } from 'shared'

interface AiOpponent {
  readonly groupId: string
  readonly servantId: string
  readonly templateName: string
}

interface SoloState {
  readonly stage: SoloStage
  readonly aiOpponents: readonly AiOpponent[]
  readonly result: SoloGameResult | null
  readonly isCreating: boolean
  readonly error: string | null

  setStage: (stage: SoloStage) => void
  setAiOpponents: (opponents: readonly AiOpponent[]) => void
  setResult: (result: SoloGameResult | null) => void
  setCreating: (v: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useSoloStore = create<SoloState>((set) => ({
  stage: 'setup',
  aiOpponents: [],
  result: null,
  isCreating: false,
  error: null,

  setStage: (stage) => set({ stage }),
  setAiOpponents: (aiOpponents) => set({ aiOpponents }),
  setResult: (result) => set({ result }),
  setCreating: (isCreating) => set({ isCreating }),
  setError: (error) => set({ error }),
  reset: () => set({ stage: 'setup', aiOpponents: [], result: null, isCreating: false, error: null }),
}))
