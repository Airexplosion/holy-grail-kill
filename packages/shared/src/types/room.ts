export interface Room {
  readonly id: string
  readonly code: string
  readonly name: string
  /** @deprecated 保留兼容，新模式中无GM */
  readonly gmPlayerId: string | null
  /** 房主玩家ID（用于开始游戏等权限） */
  readonly ownerPlayerId: string | null
  readonly config: RoomConfig
  readonly phase: GamePhase
  readonly turnNumber: number
  readonly currentActionPointIndex: number
  readonly status: RoomStatus
  /** 已标记就绪的组ID列表 */
  readonly readyGroupIds: readonly string[]
  /** 当前游戏阶段（lobby→character_create→draft→playing→finished） */
  readonly gameStage: GameStage
  readonly createdAt: number
  readonly updatedAt: number
}

export type RoomStatus = 'waiting' | 'active' | 'paused' | 'finished'

/** 游戏大阶段：控制整体流程 */
export type GameStage =
  | 'lobby'             // 大厅等待
  | 'character_create'  // 角色创建（属性分配、职业/范型选择）
  | 'draft'             // 技能轮抓
  | 'deck_build'        // 组卡（分配击牌颜色比例）
  | 'playing'           // 正式游戏中
  | 'finished'          // 游戏结束

/** 回合内阶段 */
export type GamePhase =
  | 'round_start'
  | 'preparation'
  | 'action'
  | 'standby'
  | 'combat'
  | 'round_end'

export interface RoomConfig {
  readonly maxOutpostsPerGroup: number
  readonly defaultActionPoints: number
  readonly minGroups: number
  readonly maxGroups: number
  /** 阶段自动推进超时（秒），0表示不超时 */
  readonly phaseTimeoutSeconds: number
  /** 行动点提交超时（秒） */
  readonly actionTimeoutSeconds: number
  /** 轮抓每次选取超时（秒） */
  readonly draftPickTimeoutSeconds: number
  /** 是否启用冠位系统 */
  readonly enableGrandSystem: boolean
  readonly customRules: Record<string, unknown>

  /** @deprecated 保留兼容 */
  readonly maxOutpostsPerPlayer: number
  readonly defaultHp: number
  readonly defaultHpMax: number
  readonly defaultMp: number
  readonly defaultMpMax: number
  readonly minPlayers: number
  readonly maxPlayers: number
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  maxOutpostsPerGroup: 2,
  defaultActionPoints: 4,
  minGroups: 3,
  maxGroups: 14,
  phaseTimeoutSeconds: 120,
  actionTimeoutSeconds: 60,
  draftPickTimeoutSeconds: 30,
  enableGrandSystem: false,
  customRules: {},

  // deprecated compat
  maxOutpostsPerPlayer: 3,
  defaultHp: 100,
  defaultHpMax: 100,
  defaultMp: 50,
  defaultMpMax: 50,
  minPlayers: 7,
  maxPlayers: 28,
}

export const GAME_STAGE_LABELS: Record<GameStage, string> = {
  lobby: '等待中',
  character_create: '角色创建',
  draft: '技能轮抓',
  deck_build: '组卡阶段',
  playing: '游戏进行中',
  finished: '游戏结束',
}
