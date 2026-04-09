/**
 * 胜利条件和阿克夏之钥系统
 *
 * 当3名幻身退场时，阿克夏之钥在随机地点生成。
 * 携带钥匙→连续注入魔力→完成许愿→获胜。
 * 注入所需行动点：剩余4组=16, 3组=12, 2组=8, 1组=4
 */

/** 阿克夏之钥状态 */
export interface AkashaKeyState {
  /** 是否已生成 */
  readonly spawned: boolean
  /** 钥匙所在区域ID（null=被携带中） */
  readonly regionId: string | null
  /** 携带钥匙的组ID（null=在地上） */
  readonly carrierGroupId: string | null
  /** 当前注入魔力进度（已消耗的行动点） */
  readonly channelProgress: number
  /** 注入魔力所需总行动点 */
  readonly channelRequired: number
}

/** 钥匙生成需要的幻身退场数 */
export const KEY_SPAWN_ELIMINATIONS = 3

/** 根据剩余存活组数计算注入所需行动点 */
export function getChannelCost(aliveGroupCount: number): number {
  if (aliveGroupCount >= 4) return 16
  if (aliveGroupCount === 3) return 12
  if (aliveGroupCount === 2) return 8
  return 4
}

/** 胜利事件 */
export interface VictoryEvent {
  readonly winnerGroupId: string
  readonly type: 'akasha_key_channeled' | 'last_standing'
  readonly timestamp: number
}

// ── 秘钥系统 ──

/** 秘钥使用类型 */
export type SecretKeyUseType =
  | 'prevent_fatal'      // 防止致命伤害/HP流失
  | 'restore_mp'         // 回复所有MP
  | 'discard_draw'       // 弃抽（补满手牌）
  | 'recall_servant'     // 召回幻身到篡者身边
  | 'group_move'         // 整组移动一次（非被宣战状态）
  | 'forced_retreat'     // 强制撤退（战斗第二轮后可用）
  | 'release_skill'      // 释放强力连携技能的消耗

/** 秘钥使用记录 */
export interface SecretKeyUsage {
  readonly id: string
  readonly groupId: string
  readonly useType: SecretKeyUseType
  readonly turnNumber: number
  readonly timestamp: number
}

/** 秘钥中文标签 */
export const SECRET_KEY_USE_LABELS: Record<SecretKeyUseType, string> = {
  prevent_fatal: '防止致命伤害',
  restore_mp: '回复所有MP',
  discard_draw: '弃抽补满手牌',
  recall_servant: '召回幻身',
  group_move: '整组移动',
  forced_retreat: '强制撤退',
  release_skill: '释放连携技能',
}

// ── 残灵系统 ──

/** 残灵类型 */
export type SpiritType = 'normal' | 'grand'

/** 残灵（幻身退场后或初始刷新在地图上） */
export interface SpiritRemnant {
  readonly id: string
  readonly roomId: string
  readonly regionId: string
  readonly type: SpiritType
  /** 来源幻身ID（初始残灵为null） */
  readonly sourceServantId: string | null
  readonly absorbed: boolean
  readonly absorbedByGroupId: string | null
}

// ── 击杀奖励 ──

/** 击杀奖励选项 */
export type KillRewardOption =
  | 'clear_cooldowns'     // ①清除3项CD3+技能各3点CD
  | 'reshuffle_deck'      // ②重洗牌堆
  | 'restore_hp'          // ③回复HP至上限
  | 'attribute_boost'     // ④非法参战者专属：幻身+2属性

export const KILL_REWARD_LABELS: Record<KillRewardOption, string> = {
  clear_cooldowns: '清除3项技能CD',
  reshuffle_deck: '重洗牌堆',
  restore_hp: '回复HP至上限',
  attribute_boost: '属性提升+2',
}

// ── 宣战/遭遇系统 ──

/** 宣战状态 */
export type WarDeclarationStatus = 'pending_response' | 'accepted' | 'fled' | 'forced'

/** 宣战响应 */
export type WarResponse = 'fight' | 'flee'

/** 宣战记录 */
export interface WarDeclaration {
  readonly id: string
  readonly roomId: string
  readonly attackerGroupId: string
  readonly defenderGroupId: string
  readonly regionId: string
  readonly status: WarDeclarationStatus
  readonly turnNumber: number
  readonly actionPointIndex: number
  readonly timestamp: number
}

/** 强制宣战条件：同一地点连续2行动点共存 */
export const FORCED_WAR_COEXIST_THRESHOLD = 2
