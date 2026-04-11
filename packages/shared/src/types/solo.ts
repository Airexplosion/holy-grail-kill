/**
 * 单机模式类型定义
 *
 * 完整游戏流程，其他玩家全部是AI：
 * 角色创建 → 完整round-robin轮抓 → 组卡 → 地图/行动/战斗回合循环
 */

import type { AttributeRank } from './attributes.js'

/** 单机游戏阶段 */
export type SoloStage =
  | 'setup'        // 自动创建房间和AI
  | 'draft'        // 完整round-robin轮抓
  | 'deck_build'   // 组卡
  | 'playing'      // 正式游戏（含地图/行动/战斗）
  | 'result'       // 游戏结束

/** 单机模式配置 */
export interface SoloConfig {
  /** AI对手组数（默认6，加上玩家共7组） */
  readonly aiGroupCount: number
  /** 是否启用地图（默认true） */
  readonly enableMap: boolean
  /** 地图区域数量（默认7） */
  readonly mapRegionCount: number
  /** 默认行动点 */
  readonly defaultActionPoints: number
  /** 轮抓总轮数 */
  readonly draftRounds: number
  /** 每人提交基础技能数 */
  readonly baseSkillsPerPlayer: number
  /** 每人提交连携技能数 */
  readonly linkSkillsPerPlayer: number
}

export const DEFAULT_SOLO_CONFIG: SoloConfig = {
  aiGroupCount: 6,
  enableMap: true,
  mapRegionCount: 7,
  defaultActionPoints: 4,
  draftRounds: 10,
  baseSkillsPerPlayer: 4,
  linkSkillsPerPlayer: 2,
}

/** AI 模板 — 决定AI的属性分配、职阶偏好和行为风格 */
export interface AiTemplate {
  readonly id: string
  readonly name: string
  readonly displayName: string
  /** 五维属性预设 */
  readonly attributes: {
    readonly str: AttributeRank
    readonly end: AttributeRank
    readonly agi: AttributeRank
    readonly mag: AttributeRank
    readonly luk: AttributeRank
  }
  /** 偏好职阶ID */
  readonly preferredClassId: string
  /** 技能选择偏好标签（轮抓时优先选这些标签的技能） */
  readonly skillPreferenceTags: readonly string[]
  /** 击牌颜色分配比例 [红, 蓝, 绿] 总和=24 */
  readonly strikeCardRatio: readonly [number, number, number]
  /** 行动风格 */
  readonly actionStyle: AiActionStyle
}

/** AI 行动风格 — 影响行动阶段决策 */
export type AiActionStyle = 'aggressive' | 'defensive' | 'explorer' | 'balanced'

/** 预设AI模板库 */
export const AI_TEMPLATES: readonly AiTemplate[] = [
  {
    id: 'ai_aggressive',
    name: '狂战士',
    displayName: '狂战AI',
    attributes: { str: 'A', end: 'C', agi: 'B', mag: 'D', luk: 'E' },
    preferredClassId: 'berserker',
    skillPreferenceTags: ['true_damage', 'attack_modifier', 'damage'],
    strikeCardRatio: [10, 8, 6],
    actionStyle: 'aggressive',
  },
  {
    id: 'ai_defensive',
    name: '守护者',
    displayName: '守护AI',
    attributes: { str: 'D', end: 'A', agi: 'C', mag: 'C', luk: 'B' },
    preferredClassId: 'shielder',
    skillPreferenceTags: ['shield', 'heal', 'damage_reduction'],
    strikeCardRatio: [6, 10, 8],
    actionStyle: 'defensive',
  },
  {
    id: 'ai_balanced',
    name: '剑士',
    displayName: '均衡AI',
    attributes: { str: 'B', end: 'B', agi: 'C', mag: 'C', luk: 'C' },
    preferredClassId: 'saber',
    skillPreferenceTags: [],
    strikeCardRatio: [8, 8, 8],
    actionStyle: 'balanced',
  },
  {
    id: 'ai_explorer',
    name: '游侠',
    displayName: '探索AI',
    attributes: { str: 'C', end: 'C', agi: 'A', mag: 'D', luk: 'B' },
    preferredClassId: 'rider',
    skillPreferenceTags: ['action_bonus', 'movement'],
    strikeCardRatio: [6, 6, 12],
    actionStyle: 'explorer',
  },
  {
    id: 'ai_caster',
    name: '术士',
    displayName: '术士AI',
    attributes: { str: 'D', end: 'C', agi: 'C', mag: 'A', luk: 'B' },
    preferredClassId: 'caster',
    skillPreferenceTags: ['card_generation', 'mp_related'],
    strikeCardRatio: [6, 12, 6],
    actionStyle: 'balanced',
  },
  {
    id: 'ai_assassin',
    name: '暗杀者',
    displayName: '暗杀AI',
    attributes: { str: 'B', end: 'D', agi: 'A', mag: 'C', luk: 'C' },
    preferredClassId: 'assassin',
    skillPreferenceTags: ['response_lock', 'stealth'],
    strikeCardRatio: [8, 6, 10],
    actionStyle: 'aggressive',
  },
]

/** 单机战斗结果 */
export interface SoloCombatResult {
  readonly winner: 'player' | 'ai' | 'draw'
  readonly roundsSurvived: number
  readonly damageDealt: number
  readonly damageReceived: number
  readonly skillsUsed: number
}

/** 单机游戏最终结果 */
export interface SoloGameResult {
  readonly stage: 'result'
  readonly combatsWon: number
  readonly combatsLost: number
  readonly totalRounds: number
  readonly eliminatedAiCount: number
  readonly playerSurvived: boolean
}
