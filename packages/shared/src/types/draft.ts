/**
 * 技能轮抓系统
 *
 * 流程：
 * 1. 每位幻身pl提交 4个基础技能 + 2个连携技能（来源同一角色）
 * 2. GM(系统)从备选池额外加入8个NPC幻身的技能
 * 3. 所有技能充分随机化后分成7份技能包
 * 4. 7位幻身pl进行10轮round-robin轮抓
 * 5. 每轮：从包中选1个 → 传递给下一位
 * 6. 轮抓结束后保留7个，弃3个入场内池
 * 7. 然后设计卡牌并指定职业
 */

/** 技能提交（玩家创建的技能） */
export interface SkillSubmission {
  readonly id: string
  readonly roomId: string
  readonly groupId: string
  readonly servantPlayerId: string
  /** 来源（神话历史典故或英灵名） */
  readonly sourceName: string
  /** 提交的基础技能（4个） */
  readonly baseSkills: readonly DraftSkillDef[]
  /** 提交的连携技能（2个） */
  readonly linkSkills: readonly DraftSkillDef[]
  readonly submittedAt: number
}

/** 轮抓用的技能定义（玩家自创） */
export interface DraftSkillDef {
  readonly id: string
  readonly name: string
  /** 类型标识 */
  readonly skillType: DraftSkillType
  /** 颜色（卡牌类技能有颜色） */
  readonly color?: string
  /** 消耗描述 */
  readonly cost?: string
  /** 效果描述（纯文本，由规则书格式定义） */
  readonly description: string
  /** 来源角色名 */
  readonly sourceName: string
  /** 是否高稀有度 */
  readonly isHighRarity: boolean
  /** 卡牌数量（卡牌类技能） */
  readonly cardCount?: number
}

/** 轮抓技能类型 */
export type DraftSkillType =
  | 'active'     // 主动基础技能（支付消耗发动）
  | 'passive'    // 被动基础技能（常驻）
  | 'card'       // 卡牌基础技能（加入牌堆）
  | 'link'       // 连携技能

/** 轮抓技能包 */
export interface DraftPack {
  readonly packId: string
  readonly skills: readonly DraftSkillDef[]
  /** 当前持有此包的组ID */
  readonly currentHolderGroupId: string
}

/** 轮抓大阶段 */
export type DraftPhase =
  | 'character_select' // 玩家选择提交哪个角色
  | 'submitting'      // 技能提交中（旧，保留兼容）
  | 'pool_building'   // 系统构建池
  | 'drafting'        // 轮抓进行中
  | 'selecting'       // 保留7弃3阶段
  | 'complete'        // 轮抓完成

/** 底池构成信息（全员可见部分） */
export interface DraftPoolInfo {
  /** 选中的2个技能包组名称 */
  readonly selectedPackGroupNames: readonly string[]
  /** 包组贡献的技能数（48） */
  readonly packGroupSkillCount: number
  /** 玩家提交的角色贡献的技能数（42） */
  readonly playerCharacterSkillCount: number
  /** 随机高稀有度技能 */
  readonly randomRareSkill: { readonly name: string; readonly sourceName: string; readonly description: string } | null
  /** 总技能数（91） */
  readonly totalSkills: number
}

/** 玩家选角提交记录 */
export interface DraftCharacterSelection {
  readonly playerId: string
  readonly characterId: string
  readonly sourceName: string
}

/** 轮抓状态 */
export interface DraftState {
  readonly roomId: string
  readonly phase: DraftPhase
  /** 当前轮次（1-10） */
  readonly roundNumber: number
  /** 轮抓顺序（组ID列表，蛇形） */
  readonly pickOrder: readonly string[]
  /** 已完成选取的记录 */
  readonly picks: readonly DraftPick[]
  /** 各组当前持有的技能包 */
  readonly packs: readonly DraftPack[]
  /** 提交状态 */
  readonly submissions: readonly SkillSubmission[]
  /** 每组已选取的技能ID列表 */
  readonly groupSelections: Record<string, readonly string[]>
}

/** 单次选取记录 */
export interface DraftPick {
  readonly groupId: string
  readonly skillId: string
  readonly roundNumber: number
  readonly timestamp: number
}

/** 轮抓配置 */
export interface DraftConfig {
  /** 轮抓总轮数 */
  readonly totalRounds: number
  /** 每次选取超时（秒） */
  readonly pickTimeoutSeconds: number
  /** 保留技能数 */
  readonly keepCount: number
  /** 弃置技能数 */
  readonly discardCount: number
  /** NPC技能数量 */
  readonly npcSkillCount: number
  /** 每人提交基础技能数 */
  readonly baseSkillsPerPlayer: number
  /** 每人提交连携技能数 */
  readonly linkSkillsPerPlayer: number
}

/** 默认轮抓配置 */
export const DEFAULT_DRAFT_CONFIG: DraftConfig = {
  totalRounds: 10,
  pickTimeoutSeconds: 30,
  keepCount: 7,
  discardCount: 3,
  npcSkillCount: 8,
  baseSkillsPerPlayer: 4,
  linkSkillsPerPlayer: 2,
}

/** 轮抓阶段中文标签 */
export const DRAFT_PHASE_LABELS: Record<DraftPhase, string> = {
  character_select: '选择角色',
  submitting: '技能提交',
  pool_building: '构建技能池',
  drafting: '轮抓进行中',
  selecting: '最终选择',
  complete: '轮抓完成',
}
