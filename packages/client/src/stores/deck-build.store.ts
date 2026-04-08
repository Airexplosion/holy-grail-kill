import { create } from 'zustand'
import type { PlayerStrikeSelection, DeckBuildValidation, SkillLibraryEntry } from 'shared'

interface DeckBuildState {
  readonly strikeCards: PlayerStrikeSelection
  readonly selectedSkillIds: readonly string[]
  readonly isLocked: boolean
  readonly deckBuildId: string | null
  readonly validation: DeckBuildValidation | null
  readonly skillLibrary: readonly SkillLibraryEntry[]
  readonly shareCode: string | null

  setStrikeCards: (cards: PlayerStrikeSelection) => void
  setStrikeColorCount: (color: keyof PlayerStrikeSelection, count: number) => void
  setSelectedSkillIds: (ids: readonly string[]) => void
  toggleSkill: (skillId: string, skillClass: 'A' | 'B') => void
  setLocked: (locked: boolean) => void
  setDeckBuildId: (id: string | null) => void
  setValidation: (v: DeckBuildValidation | null) => void
  setSkillLibrary: (skills: readonly SkillLibraryEntry[]) => void
  setShareCode: (code: string | null) => void
  loadFromServer: (data: {
    id: string
    strikeCards: PlayerStrikeSelection
    skillIds: readonly string[]
    isLocked: boolean
  }) => void
  reset: () => void
}

export const useDeckBuildStore = create<DeckBuildState>((set, get) => ({
  strikeCards: { red: 0, blue: 0, green: 0 },
  selectedSkillIds: [],
  isLocked: false,
  deckBuildId: null,
  validation: null,
  skillLibrary: [],
  shareCode: null,

  setStrikeCards: (strikeCards) => set({ strikeCards }),
  setStrikeColorCount: (color, count) => set((s) => ({
    strikeCards: { ...s.strikeCards, [color]: Math.max(0, count) },
  })),
  setSelectedSkillIds: (selectedSkillIds) => set({ selectedSkillIds }),
  toggleSkill: (skillId, skillClass) => set((s) => {
    if (s.selectedSkillIds.includes(skillId)) {
      return { selectedSkillIds: s.selectedSkillIds.filter(id => id !== skillId) }
    }
    // Check slot limit
    const maxSlots = skillClass === 'A' ? 4 : 2
    const currentClassCount = s.selectedSkillIds.filter(id => {
      const skill = s.skillLibrary.find(sk => sk.id === id)
      return skill?.skillClass === skillClass
    }).length
    if (currentClassCount >= maxSlots) return {}
    return { selectedSkillIds: [...s.selectedSkillIds, skillId] }
  }),
  setLocked: (isLocked) => set({ isLocked }),
  setDeckBuildId: (deckBuildId) => set({ deckBuildId }),
  setValidation: (validation) => set({ validation }),
  setSkillLibrary: (skillLibrary) => set({ skillLibrary }),
  setShareCode: (shareCode) => set({ shareCode }),
  loadFromServer: (data) => set({
    deckBuildId: data.id,
    strikeCards: data.strikeCards,
    selectedSkillIds: data.skillIds,
    isLocked: data.isLocked,
  }),
  reset: () => set({
    strikeCards: { red: 0, blue: 0, green: 0 },
    selectedSkillIds: [],
    isLocked: false,
    deckBuildId: null,
    validation: null,
    skillLibrary: [],
    shareCode: null,
  }),
}))
