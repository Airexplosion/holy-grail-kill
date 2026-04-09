// ── 基础三色 ──

/** 基础击牌颜色（红蓝绿三色） */
export type BaseStrikeColor = 'red' | 'blue' | 'green'

/** 特殊颜色 */
export type SpecialColor = 'colorless' | 'rainbow' | 'unknown' | 'black' | 'white'

/** 所有卡牌颜色（基础 + 特殊） */
export type CardColor = BaseStrikeColor | SpecialColor

/** 兼容旧类型 */
export type StrikeColor = BaseStrikeColor

// ── 颜色标签 ──

export const BASE_COLOR_LABELS: Record<BaseStrikeColor, string> = {
  red: '红(猛击)',
  blue: '蓝(技击)',
  green: '绿(迅击)',
}

export const STRIKE_COLOR_LABELS: Record<StrikeColor, string> = {
  red: '红击',
  blue: '蓝击',
  green: '绿击',
}

export const CARD_COLOR_LABELS: Record<CardColor, string> = {
  red: '红色',
  blue: '蓝色',
  green: '绿色',
  colorless: '无色',
  rainbow: '万色',
  unknown: '颜色不明',
  black: '黑色',
  white: '白色',
}

// ── 克制关系 ──

/**
 * 基础三色循环克制（攻击 → 被谁响应）
 * 红击 → 被蓝击响应（绿闪红）→ 实际：红攻→绿响应
 *
 * 规则书原文循环: 红 → 绿 → 蓝 → 红 (响应方向)
 * 即: 红(闪)响应绿(杀), 绿(闪)响应蓝(杀), 蓝(闪)响应红(杀)
 */
export const STRIKE_COUNTER: Record<BaseStrikeColor, BaseStrikeColor> = {
  red: 'blue',    // 蓝击可响应红击
  blue: 'green',  // 绿击可响应蓝击
  green: 'red',   // 红击可响应绿击
}

/**
 * 特殊颜色的攻击/响应规则
 */
export const SPECIAL_COLOR_RULES: Record<SpecialColor, {
  /** 攻击时可被哪些颜色响应 */
  readonly respondableBy: readonly CardColor[] | 'any' | 'special'
  /** 响应时可响应哪些颜色 */
  readonly canRespond: readonly CardColor[] | 'none' | 'special'
  /** 额外占用手牌上限 */
  readonly extraHandSlots: number
  /** 是否始终揭示 */
  readonly alwaysRevealed: boolean
}> = {
  colorless: {
    respondableBy: 'any',               // 可被任一颜色响应
    canRespond: ['colorless'],           // 只能响应无色
    extraHandSlots: 0,
    alwaysRevealed: false,
  },
  rainbow: {
    respondableBy: 'any',               // 声明为三色之一后遵循对应规则
    canRespond: 'special',              // 声明为三色之一后可响应对应颜色
    extraHandSlots: 0,
    alwaysRevealed: false,
  },
  unknown: {
    respondableBy: 'special',           // 需要特殊响应模式
    canRespond: 'none',                 // 不触发颜色相关效果
    extraHandSlots: 0,
    alwaysRevealed: false,
  },
  black: {
    respondableBy: ['black', 'colorless'],  // 只能被黑色或无色响应
    canRespond: ['black'],                  // 只能响应黑色或万色指定颜色
    extraHandSlots: 2,                      // 额外占用2手牌上限
    alwaysRevealed: false,
  },
  white: {
    respondableBy: 'any',               // 可被黑色和无色以外的牌响应
    canRespond: 'special',              // 不能响应黑色和万色指定颜色
    extraHandSlots: 0,
    alwaysRevealed: true,               // 始终揭示
  },
}

// ── 卡牌模板 ──

/** 击牌模板（可扩展特殊效果） */
export interface StrikeCardTemplate {
  readonly id: string
  readonly color: CardColor
  readonly name: string
  readonly baseDamage: number
  readonly description: string
  readonly effectType?: string
  readonly effectParams?: Record<string, unknown>
  /** 虚色卡牌：实质为多色（标注颜色+无色） */
  readonly isVirtualColor?: boolean
}

/** 玩家选择的击牌（组卡用） */
export interface PlayerStrikeSelection {
  readonly red: number
  readonly blue: number
  readonly green: number
}

/** 组卡约束 */
export const STRIKE_CARD_TOTAL = 24
/** 每种颜色最少保留张数 */
export const STRIKE_COLOR_MINIMUM = 6
