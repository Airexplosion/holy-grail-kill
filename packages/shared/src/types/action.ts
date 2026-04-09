export interface ActionSubmission {
  readonly id: string
  readonly roomId: string
  /** 提交行动的组ID（替代playerId） */
  readonly groupId: string
  /** @deprecated 保留兼容 */
  readonly playerId: string
  readonly turnNumber: number
  readonly actionPointIndex: number
  readonly actionType: ActionType
  readonly payload: ActionPayload
  readonly status: ActionStatus
  readonly submittedAt: number
  readonly resolvedAt: number | null
}

export type ActionType =
  // 移动类
  | 'move_adjacent'       // 通路相邻移动（每回合限一次）
  | 'move_designated'     // 使用地点牌移动
  | 'move_to_outpost'     // 移动至据点所在地
  // 侦查
  | 'scout'               // 侦查相邻或当前地点
  // 据点
  | 'place_outpost'       // 建立据点（打出地点牌）
  | 'destroy_outpost'     // 摧毁已知据点
  // 战斗
  | 'declare_war'         // 宣战（不消耗行动点）
  // 技能/卡牌
  | 'use_ability'         // 使用需要行动点的能力或卡牌
  // 残灵/钥匙
  | 'absorb_spirit'       // 残灵吸收（需连续3行动点）
  | 'obtain_key'          // 携带/放置阿克夏之钥
  | 'channel_magic'       // 对阿克夏之钥注入魔力
  // 其他
  | 'skip'                // 放弃行动
  // 兼容旧类型
  | 'consume'             // @deprecated → use absorb_spirit / channel_magic

/** 行动状态（去掉GM审批，改为自动验证） */
export type ActionStatus = 'pending' | 'validated' | 'invalid' | 'executed'

export type ActionPayload =
  | MovePayload
  | ScoutPayload
  | PlaceOutpostPayload
  | DestroyOutpostPayload
  | DeclareWarPayload
  | UseAbilityPayload
  | AbsorbSpiritPayload
  | ObtainKeyPayload
  | ChannelMagicPayload
  | SkipPayload

export interface MovePayload {
  readonly targetRegionId: string
  /** 使用的地点牌ID（指定移动时需要） */
  readonly locationCardId?: string
}

export interface ScoutPayload {
  readonly targetRegionId: string
}

export interface PlaceOutpostPayload {
  readonly regionId: string
  /** 使用的地点牌ID */
  readonly locationCardId: string
}

export interface DestroyOutpostPayload {
  readonly targetRegionId: string
  readonly targetOutpostId: string
}

export interface DeclareWarPayload {
  readonly targetGroupId: string
}

export interface UseAbilityPayload {
  readonly abilityId: string
  readonly targetId?: string
  readonly params?: Record<string, unknown>
}

export interface AbsorbSpiritPayload {
  readonly regionId: string
  readonly spiritId: string
}

export interface ObtainKeyPayload {
  /** 'pick_up' 或 'put_down' */
  readonly action: 'pick_up' | 'put_down'
}

export interface ChannelMagicPayload {}

export interface SkipPayload {}

export interface ActionResult {
  /** 新模式使用 groupId */
  readonly groupId?: string
  /** 旧模式使用 playerId */
  readonly playerId?: string
  readonly actionType: ActionType
  readonly success: boolean
  readonly details: string
  readonly data?: Record<string, unknown>
}

/**
 * 行动点消耗表
 * declare_war 不消耗行动点（特殊）
 */
export const ACTION_AP_COST: Record<ActionType, number> = {
  move_adjacent: 1,
  move_designated: 1,
  move_to_outpost: 1,
  scout: 1,
  place_outpost: 1,
  destroy_outpost: 1,
  declare_war: 0,      // 宣战不消耗行动点
  use_ability: 1,
  absorb_spirit: 1,    // 每点1AP，需连续3点
  obtain_key: 1,
  channel_magic: 1,    // 每点1AP，总需 16/12/8/4 点
  skip: 0,
  consume: 1,          // @deprecated
}

export const ACTION_LABELS: Record<ActionType, string> = {
  move_adjacent: '相邻移动',
  move_designated: '指定移动',
  move_to_outpost: '据点移动',
  scout: '侦查',
  place_outpost: '阵地作成',
  destroy_outpost: '阵地破坏',
  declare_war: '宣战',
  use_ability: '使用能力',
  absorb_spirit: '残灵吸收',
  obtain_key: '获取/放置钥匙',
  channel_magic: '注入魔力',
  skip: '放弃行动',
  consume: '消耗',     // @deprecated
}

/**
 * 行动结算顺序（从上到下依次结算）
 * 规则书原文顺序
 */
export const ACTION_RESOLUTION_ORDER: readonly ActionType[] = [
  'scout',
  'move_to_outpost',
  'use_ability',
  'place_outpost',
  'move_adjacent',
  'move_designated',
  'destroy_outpost',
  'absorb_spirit',
  'obtain_key',
  'channel_magic',
  'skip',
]
