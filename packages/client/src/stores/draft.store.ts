import { create } from 'zustand'
import type { SkillLibraryEntry, DraftPhase } from 'shared'

interface DraftState {
  readonly phase: DraftPhase
  readonly round: number
  readonly totalRounds: number
  /** 当前包中的技能 */
  readonly currentPack: readonly SkillLibraryEntry[]
  /** 已选取的技能 */
  readonly selectedSkills: readonly SkillLibraryEntry[]
  /** 各组选取数量 */
  readonly groupSelectionCounts: Record<string, number>
  /** 最终保留的技能ID */
  readonly finalizedKeepIds: readonly string[]
  readonly isFinalized: boolean

  setPhase: (phase: DraftPhase) => void
  setRound: (round: number, totalRounds: number) => void
  setCurrentPack: (skills: readonly SkillLibraryEntry[]) => void
  addSelectedSkill: (skill: SkillLibraryEntry) => void
  setGroupSelectionCounts: (counts: Record<string, number>) => void
  toggleKeepId: (skillId: string) => void
  setFinalized: (finalized: boolean) => void
  reset: () => void
}

export const useDraftStore = create<DraftState>((set) => ({
  phase: 'submitting',
  round: 0,
  totalRounds: 10,
  currentPack: [],
  selectedSkills: [],
  groupSelectionCounts: {},
  finalizedKeepIds: [],
  isFinalized: false,

  setPhase: (phase) => set({ phase }),
  setRound: (round, totalRounds) => set({ round, totalRounds }),
  setCurrentPack: (currentPack) => set({ currentPack }),
  addSelectedSkill: (skill) => set((state) => ({
    selectedSkills: [...state.selectedSkills, skill],
  })),
  setGroupSelectionCounts: (groupSelectionCounts) => set({ groupSelectionCounts }),

  toggleKeepId: (skillId) => set((state) => {
    const has = state.finalizedKeepIds.includes(skillId)
    if (has) {
      return { finalizedKeepIds: state.finalizedKeepIds.filter(id => id !== skillId) }
    }
    if (state.finalizedKeepIds.length >= 7) return state
    return { finalizedKeepIds: [...state.finalizedKeepIds, skillId] }
  }),

  setFinalized: (isFinalized) => set({ isFinalized }),

  reset: () => set({
    phase: 'submitting',
    round: 0,
    totalRounds: 10,
    currentPack: [],
    selectedSkills: [],
    groupSelectionCounts: {},
    finalizedKeepIds: [],
    isFinalized: false,
  }),
}))
