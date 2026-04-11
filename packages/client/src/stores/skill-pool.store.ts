import { create } from 'zustand'
import type { PoolSnapshotEntry, PoolSkillEntry, SkillReplaceResult } from 'shared'

interface SkillPoolState {
  /** 地图池快照（全员可见，冻结状态） */
  readonly snapshot: readonly PoolSnapshotEntry[]
  /** 当前抽取结果（战后弹窗用） */
  readonly drawnSkills: readonly PoolSkillEntry[]
  /** 剩余替换次数 */
  readonly replacementsRemaining: number
  /** 是否显示抽取弹窗 */
  readonly showDrawModal: boolean
  /** 最近替换结果（反馈用） */
  readonly lastReplaceResult: SkillReplaceResult | null

  setSnapshot: (skills: readonly PoolSnapshotEntry[]) => void
  setDrawResult: (skills: readonly PoolSkillEntry[], remaining: number) => void
  setShowDrawModal: (show: boolean) => void
  setReplaceResult: (result: SkillReplaceResult | null) => void
  updateRemaining: (remaining: number) => void
  reset: () => void
}

export const useSkillPoolStore = create<SkillPoolState>((set) => ({
  snapshot: [],
  drawnSkills: [],
  replacementsRemaining: 2,
  showDrawModal: false,
  lastReplaceResult: null,

  setSnapshot: (snapshot) => set({ snapshot }),
  setDrawResult: (drawnSkills, replacementsRemaining) =>
    set({ drawnSkills, replacementsRemaining, showDrawModal: true }),
  setShowDrawModal: (showDrawModal) => set({ showDrawModal }),
  setReplaceResult: (lastReplaceResult) => set({ lastReplaceResult }),
  updateRemaining: (replacementsRemaining) => set({ replacementsRemaining }),
  reset: () => set({ snapshot: [], drawnSkills: [], replacementsRemaining: 2, showDrawModal: false, lastReplaceResult: null }),
}))
