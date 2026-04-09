import type { ServantAttributes, MasterAttributes } from './attributes.js'

/**
 * 组 (Group) — 游戏的基本单位
 * 每组 = 1 篡者(Master) + 1 幻身(Servant)
 */

/** 角色类型 */
export type CharacterRole = 'master' | 'servant'

/** 组状态 */
export type GroupStatus = 'alive' | 'servant_eliminated' | 'eliminated'

/** 组 */
export interface Group {
  readonly id: string
  readonly roomId: string
  readonly name: string
  readonly color: string
  readonly masterPlayerId: string
  readonly servantPlayerId: string
  readonly secretKeysRemaining: number
  readonly status: GroupStatus
  /** 是否持有阿克夏之钥 */
  readonly akashaKeyHolder: boolean
  /** 当前注入魔力进度（0表示未开始） */
  readonly magicChannelProgress: number
  /** 行动阶段就绪标记 */
  readonly isReady: boolean
  readonly createdAt: number
  readonly updatedAt: number
}

/** 初始秘钥数量 */
export const INITIAL_SECRET_KEYS = 3

/** 组的公开信息（其他组可见） */
export interface GroupPublicInfo {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly status: GroupStatus
  readonly servantClassId: string | null
  readonly masterArchetypeId: string | null
}

/** 组的自身视图（本组可见的全部信息） */
export interface GroupSelfView {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly status: GroupStatus
  readonly masterPlayerId: string
  readonly servantPlayerId: string
  readonly secretKeysRemaining: number
  readonly akashaKeyHolder: boolean
  readonly magicChannelProgress: number
  readonly isReady: boolean
}

export const CHARACTER_ROLE_LABELS: Record<CharacterRole, string> = {
  master: '篡者',
  servant: '幻身',
}

export const GROUP_STATUS_LABELS: Record<GroupStatus, string> = {
  alive: '存活',
  servant_eliminated: '幻身退场',
  eliminated: '淘汰',
}
