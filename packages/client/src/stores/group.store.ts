import { create } from 'zustand'
import type { Group, GroupPublicInfo, GroupStatus } from 'shared'

interface PendingGroupRequest {
  readonly fromId: string
  readonly fromName: string
  readonly fromRole: 'master' | 'servant'
}

interface GroupState {
  /** 本组信息（完整视图） */
  readonly myGroup: Group | null
  /** 所有组的公开信息 */
  readonly groups: readonly GroupPublicInfo[]
  /** 已就绪的组ID列表 */
  readonly readyGroupIds: readonly string[]
  /** 存活组数量 */
  readonly aliveGroupCount: number
  /** 待处理的组队请求（收到的） */
  readonly pendingRequests: readonly PendingGroupRequest[]

  setMyGroup: (group: Group | null) => void
  setGroups: (groups: readonly GroupPublicInfo[]) => void
  updateGroupStatus: (groupId: string, status: GroupStatus) => void
  setReadyStatus: (readyGroupIds: readonly string[], aliveGroupCount: number) => void
  setGroupReady: (groupId: string, ready: boolean) => void
  addPendingRequest: (request: PendingGroupRequest) => void
  clearPendingRequests: () => void
  reset: () => void
}

export const useGroupStore = create<GroupState>((set) => ({
  myGroup: null,
  groups: [],
  readyGroupIds: [],
  aliveGroupCount: 0,
  pendingRequests: [],

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

  addPendingRequest: (request) => set((state) => ({
    pendingRequests: [
      ...state.pendingRequests.filter(r => r.fromId !== request.fromId),
      request,
    ],
  })),

  clearPendingRequests: () => set({ pendingRequests: [] }),

  reset: () => set({
    myGroup: null,
    groups: [],
    readyGroupIds: [],
    aliveGroupCount: 0,
    pendingRequests: [],
  }),
}))
