/**
 * 效果管道 — 可扩展的效果注册与执行系统
 *
 * 核心职责：
 * 1. 提供 registerEffect() 注册接口
 * 2. 提供 executeEffect() / executeEffectChain() 执行接口
 * 3. 定义 EffectContext / PlayerCombatState 等共享类型
 *
 * 效果注册分散在 effects/ 目录的各模块文件中：
 * - effects/combat.ts      — 战斗类（damage/heal/shield/reflect/freeStrike...）
 * - effects/stat-modifier.ts — 属性修改（gainAC/amplify/damageReduction/preventDeath...）
 * - effects/card-ops.ts    — 卡牌操作（draw/discard/addTempCard/chargeGain...）
 * - effects/condition.ts   — 条件/标记（setFlag/checkFlag/conditional/stealth/vision...）
 *
 * 新增效果：在 effects/ 下创建文件，import 到 effects/index.ts 即可
 */

export interface EffectContext {
  readonly sourceId: string
  readonly targetId: string
  readonly roomId: string
  /** 可变的玩家状态快照，效果处理器可修改 */
  playerStates: Map<string, PlayerCombatState>
  /** 战斗事件记录 */
  events: CombatEventLog[]
}

export interface PlayerCombatState {
  hp: number
  hpMax: number
  mp: number
  mpMax: number
  shield: number
  handCount: number
  /** 运行时状态标记（存储 AC、增伤、减伤、CD 等动态数据） */
  flags: Map<string, unknown>
}

export interface EffectResult {
  readonly effectType: string
  readonly targetId: string
  readonly success: boolean
  readonly value?: number
  readonly description: string
  readonly data?: Record<string, unknown>
}

export interface CombatEventLog {
  readonly type: string
  readonly playerId: string
  readonly description: string
  readonly data?: Record<string, unknown>
}

type EffectHandler = (ctx: EffectContext, params: Record<string, unknown>) => EffectResult

const registry = new Map<string, EffectHandler>()

/** 注册效果处理器 */
export function registerEffect(effectType: string, handler: EffectHandler) {
  registry.set(effectType, handler)
}

/** 执行单个效果 */
export function executeEffect(effectType: string, ctx: EffectContext, params: Record<string, unknown>): EffectResult {
  const handler = registry.get(effectType)
  if (!handler) {
    return {
      effectType,
      targetId: ctx.targetId,
      success: false,
      description: `未知效果类型: ${effectType}`,
    }
  }
  return handler(ctx, params)
}

/** 执行效果链 */
export function executeEffectChain(
  effects: readonly { effectType: string; params: Record<string, unknown> }[],
  ctx: EffectContext,
): EffectResult[] {
  return effects.map(e => executeEffect(e.effectType, ctx, e.params))
}

/** 获取已注册的效果类型列表（调试用） */
export function getRegisteredEffectTypes(): string[] {
  return [...registry.keys()]
}

// 效果模块在 server 入口 (index.ts) 中加载：
// import './engine/effects/index.js'
// 不在此处 import 以避免 ESM 循环依赖
