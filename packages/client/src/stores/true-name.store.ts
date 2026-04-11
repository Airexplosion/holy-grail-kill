import { create } from 'zustand'
import type { TrueNameCandidate, TrueNameGuessResult, RevealedAttributes } from 'shared'

interface TrueNameState {
  /** 可猜测的目标列表 */
  readonly candidates: readonly TrueNameCandidate[]
  /** 最近一次猜测结果（用于展示反馈） */
  readonly lastResult: TrueNameGuessResult | null
  /** 已揭示的目标五维 Map<targetPlayerId, attributes> */
  readonly revealed: ReadonlyMap<string, RevealedAttributes>
  /** 当前正在猜测的目标（打开弹窗时设置） */
  readonly guessingTarget: TrueNameCandidate | null

  setCandidates: (candidates: readonly TrueNameCandidate[]) => void
  setLastResult: (result: TrueNameGuessResult | null) => void
  setRevealed: (list: readonly { targetPlayerId: string; attributes: RevealedAttributes }[]) => void
  setGuessingTarget: (target: TrueNameCandidate | null) => void
  getAttributes: (targetPlayerId: string) => RevealedAttributes | undefined
  reset: () => void
}

export const useTrueNameStore = create<TrueNameState>((set, get) => ({
  candidates: [],
  lastResult: null,
  revealed: new Map(),
  guessingTarget: null,

  setCandidates: (candidates) => set({ candidates }),
  setLastResult: (lastResult) => set({ lastResult }),
  setRevealed: (list) => {
    const map = new Map<string, RevealedAttributes>()
    for (const item of list) {
      map.set(item.targetPlayerId, item.attributes)
    }
    set({ revealed: map })
  },
  setGuessingTarget: (guessingTarget) => set({ guessingTarget }),
  getAttributes: (targetPlayerId) => get().revealed.get(targetPlayerId),
  reset: () => set({ candidates: [], lastResult: null, revealed: new Map(), guessingTarget: null }),
}))
