/** 击牌颜色 */
export type StrikeColor = 'red' | 'blue' | 'green'

/** 击牌颜色中文标签 */
export const STRIKE_COLOR_LABELS: Record<StrikeColor, string> = {
  red: '红击',
  blue: '蓝击',
  green: '绿击',
}

/**
 * 克制关系：每种颜色既能攻击也能防御
 * 红击 → 被蓝击响应
 * 蓝击 → 被绿击响应
 * 绿击 → 被红击响应
 */
export const STRIKE_COUNTER: Record<StrikeColor, StrikeColor> = {
  red: 'blue',    // 蓝击可响应红击
  blue: 'green',  // 绿击可响应蓝击
  green: 'red',   // 红击可响应绿击
}

/** 击牌模板（可扩展特殊效果） */
export interface StrikeCardTemplate {
  readonly id: string
  readonly color: StrikeColor
  readonly name: string
  readonly baseDamage: number
  readonly description: string
  /** 扩展点：特殊效果类型 */
  readonly effectType?: string
  /** 扩展点：特殊效果参数 */
  readonly effectParams?: Record<string, unknown>
}

/** 玩家选择的击牌（组卡用） */
export interface PlayerStrikeSelection {
  readonly red: number
  readonly blue: number
  readonly green: number
}

/** 组卡约束 */
export const STRIKE_CARD_TOTAL = 24
