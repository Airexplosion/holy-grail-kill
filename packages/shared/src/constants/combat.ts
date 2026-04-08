import type { StrikeColor } from '../types/strike-card.js'

/**
 * 响应关系：哪种颜色可以响应哪种攻击
 * red attacks → blue responds
 * blue attacks → green responds
 * green attacks → red responds
 */
export const RESPONSE_MAP: Record<StrikeColor, StrikeColor> = {
  red: 'blue',
  blue: 'green',
  green: 'red',
}

/** 战斗回合内阶段顺序 */
export const COMBAT_TURN_PHASES = ['play', 'respond', 'resolve', 'end_turn'] as const

/** 响应时间窗口（毫秒） */
export const COMBAT_TIMING_WINDOW_MS = 30000

/** 出牌链最大深度 */
export const MAX_CHAIN_DEPTH = 10
