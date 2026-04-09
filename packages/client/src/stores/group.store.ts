import { create } from 'zustand'
import type { Group, GroupPublicInfo, GroupStatus } from 'shared'

interface GroupState {
  /** 本组信息（完整视图） */
  readonly myGroup: Group | null
  /** 所有组的公开信息 */
  readonly groups: readonly GroupPublicInfo[]
  /** 已就绪的组ID列表 */
  readonly readyGroupIds: readonly string[]
  /** 存活组数量 */
  readonly aliveGroupCount: number

  setMyGroup: (group: Group | null) => void
  setGroups: (groups: readonly GroupPublicInfo[]) => void
  updateGroupStatus: (groupId: string, status: GroupStatus) => void
  setReadyStatus: (readyGroupIds: readonly string[], aliveGroupCount: number) => void
  setGroupReady: (groupId: string, ready: boolean) => void
  reset: () => void
}

export const useGroupStore = create<GroupState>((set) => ({
  myGroup: null,
  groups: [],
  readyGroupIds: [],
  aliveGroupCount: 0,

  setMyGroup: (myGroup) => set({ myGroup }),

  setGroups: (groups) => set({ groups }),

  updateGroupStatus: (groupId, status) => set((state) => ({
    groups: state.groups.map(g =>
      g.id === groupId ? { ...g, status } : g
    ),
  })),

  setReadyStatus: (readyGroupIds, aliveGroupCount) =>
    set({ readyGroupIds, aliveGroupCount }),

  setGroupReady: (groupId, ready) => set((state) => ({
    readyGroupIds: ready
      ? [...state.readyGroupIds.filter(id => id !== groupId), groupId]
      : state.readyGroupIds.filter(id => id !== groupId),
  })),

  reset: () => set({
    myGroup: null,
    groups: [],
    readyGroupIds: [],
    aliveGroupCount: 0,
  }),
}))
