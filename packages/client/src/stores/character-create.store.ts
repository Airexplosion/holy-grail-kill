import { create } from 'zustand'
import type { AttributeRank, ServantAttributes, MasterAttributes } from 'shared'
import {
  RANK_TOTAL_COST, SERVANT_ATTRIBUTE_POINTS,
  SERVANT_STR_TABLE, SERVANT_END_TABLE, SERVANT_AGI_TABLE, SERVANT_MAG_TABLE, SERVANT_LUK_TABLE,
} from 'shared'

type ServantAttrKey = keyof ServantAttributes

interface CharacterCreateState {
  // ── 幻身属性 ──
  readonly servantAttrs: ServantAttributes
  readonly servantPointsUsed: number
  readonly servantPointsTotal: number

  // ── 选择 ──
  readonly selectedClassId: string | null
  readonly selectedArchetypeId: string | null
  readonly selectedTacticalStyle: 'red' | 'blue' | 'green' | null

  // ── 状态 ──
  readonly confirmed: boolean
  readonly isSubmitting: boolean

  // ── 动作 ──
  setServantAttr: (attr: ServantAttrKey, rank: AttributeRank) => void
  setClassId: (classId: string) => void
  setArchetypeId: (archetypeId: string) => void
  setTacticalStyle: (color: 'red' | 'blue' | 'green') => void
  setConfirmed: (confirmed: boolean) => void
  setSubmitting: (submitting: boolean) => void
  setServantPointsTotal: (total: number) => void
  reset: () => void
}

function calcPointsUsed(attrs: ServantAttributes): number {
  return (
    RANK_TOTAL_COST[attrs.str] +
    RANK_TOTAL_COST[attrs.end] +
    RANK_TOTAL_COST[attrs.agi] +
    RANK_TOTAL_COST[attrs.mag] +
    RANK_TOTAL_COST[attrs.luk]
  )
}

const DEFAULT_ATTRS: ServantAttributes = {
  str: 'E', end: 'E', agi: 'E', mag: 'E', luk: 'E',
}

export const useCharacterCreateStore = create<CharacterCreateState>((set) => ({
  servantAttrs: DEFAULT_ATTRS,
  servantPointsUsed: 0,
  servantPointsTotal: SERVANT_ATTRIBUTE_POINTS,
  selectedClassId: null,
  selectedArchetypeId: null,
  selectedTacticalStyle: null,
  confirmed: false,
  isSubmitting: false,

  setServantAttr: (attr, rank) => set((state) => {
    const newAttrs = { ...state.servantAttrs, [attr]: rank }
    return {
      servantAttrs: newAttrs,
      servantPointsUsed: calcPointsUsed(newAttrs),
    }
  }),

  setClassId: (classId) => set({ selectedClassId: classId }),
  setArchetypeId: (archetypeId) => set({ selectedArchetypeId: archetypeId }),
  setTacticalStyle: (color) => set({ selectedTacticalStyle: color }),
  setConfirmed: (confirmed) => set({ confirmed }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setServantPointsTotal: (total) => set({ servantPointsTotal: total }),
  reset: () => set({
    servantAttrs: DEFAULT_ATTRS,
    servantPointsUsed: 0,
    servantPointsTotal: SERVANT_ATTRIBUTE_POINTS,
    selectedClassId: null,
    selectedArchetypeId: null,
    selectedTacticalStyle: null,
    confirmed: false,
    isSubmitting: false,
  }),
}))

/** 计算派生属性预览 */
export function getServantPreview(attrs: ServantAttributes) {
  return {
    baseDamage: SERVANT_STR_TABLE[attrs.str],
    hp: SERVANT_END_TABLE[attrs.end],
    actions: SERVANT_AGI_TABLE[attrs.agi],
    mp: SERVANT_MAG_TABLE[attrs.mag],
    handSize: SERVANT_LUK_TABLE[attrs.luk],
  }
}
