import type { StrikeColor } from './strike-card.js'

/** 战斗回合阶段 */
export type CombatTurnPhase = 'play' | 'respond' | 'resolve' | 'end_turn'

/** 战斗状态 */
export interface CombatState {
  readonly roomId: string
  readonly roundNumber: number
  readonly turnIndex: number
  readonly turnOrder: readonly string[]
  readonly phase: CombatTurnPhase
  readonly activePlayerId: string | null
  readonly playChain: readonly PlayChainEntry[]
  readonly isActive: boolean
}

/** 出牌链条目 */
export interface PlayChainEntry {
  readonly id: string
  readonly playerId: string
  readonly type: 'play' | 'respond'
  readonly cardColor?: StrikeColor
  readonly skillId?: string
  readonly targetId?: string
  readonly timestamp: number
}

/** 战斗动作（玩家提交） */
export type CombatAction =
  | { readonly type: 'play_strike'; readonly cardColor: StrikeColor; readonly targetId: string }
  | { readonly type: 'use_skill'; readonly skillId: string; readonly targetId?: string; readonly params?: Record<string, unknown> }
  | { readonly type: 'respond'; readonly cardColor?: StrikeColor; readonly skillId?: string }
  | { readonly type: 'pass' }

/** 战斗结算结果 */
export interface CombatResult {
  readonly attackerId: string
  readonly defenderId: string
  readonly damage: number
  readonly blocked: boolean
  readonly effects: readonly CombatEffectResult[]
}

/** 效果结算结果 */
export interface CombatEffectResult {
  readonly effectType: string
  readonly targetId: string
  readonly value: number
  readonly description: string
}

/** 战斗事件（日志用） */
export interface CombatEvent {
  readonly type: string
  readonly playerId: string
  readonly description: string
  readonly data?: Record<string, unknown>
  readonly timestamp: number
}

/** 战斗常量 */
export const COMBAT_TIMING_WINDOW_MS = 30000
export const MAX_CHAIN_DEPTH = 10
