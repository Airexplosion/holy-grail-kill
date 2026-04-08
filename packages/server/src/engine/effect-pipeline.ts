/**
 * 效果管道 — 可扩展的效果注册与执行系统
 *
 * 所有技能和击牌效果通过此管道执行。
 * 新增效果类型：调用 registerEffect() 注册处理器。
 * 技能的 effects[] 数组按顺序依次执行。
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
  /** 运行时状态标记 */
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

// ===== 内置效果处理器 =====

function getTarget(ctx: EffectContext, params: Record<string, unknown>): PlayerCombatState | undefined {
  const id = (params.target === 'self') ? ctx.sourceId : ctx.targetId
  return ctx.playerStates.get(id)
}

function getTargetId(ctx: EffectContext, params: Record<string, unknown>): string {
  return (params.target === 'self') ? ctx.sourceId : ctx.targetId
}

registerEffect('damage', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.targetId)
  if (!target) return { effectType: 'damage', targetId: ctx.targetId, success: false, description: '目标不存在' }

  let dmg = (params.value as number) || 0
  const pierceShield = (params.pierceShield as number) || 0

  // Apply shield
  const effectiveShield = Math.max(0, target.shield - pierceShield)
  if (effectiveShield > 0) {
    const blocked = Math.min(effectiveShield, dmg)
    target.shield -= blocked
    dmg -= blocked
  }

  target.hp = Math.max(0, target.hp - dmg)

  ctx.events.push({ type: 'damage', playerId: ctx.targetId, description: `受到 ${(params.value as number) || 0} 点伤害` })
  return { effectType: 'damage', targetId: ctx.targetId, success: true, value: dmg, description: `造成 ${dmg} 点伤害` }
})

registerEffect('heal', (ctx, params) => {
  const tid = getTargetId(ctx, params)
  const target = ctx.playerStates.get(tid)
  if (!target) return { effectType: 'heal', targetId: tid, success: false, description: '目标不存在' }

  const value = (params.value as number) || 0
  const healed = Math.min(value, target.hpMax - target.hp)
  target.hp += healed

  ctx.events.push({ type: 'heal', playerId: tid, description: `回复 ${healed} 点HP` })
  return { effectType: 'heal', targetId: tid, success: true, value: healed, description: `回复 ${healed} HP` }
})

registerEffect('shield', (ctx, params) => {
  const tid = getTargetId(ctx, params)
  const target = ctx.playerStates.get(tid)
  if (!target) return { effectType: 'shield', targetId: tid, success: false, description: '目标不存在' }

  const value = (params.value as number) || 0
  target.shield += value

  ctx.events.push({ type: 'shield', playerId: tid, description: `获得 ${value} 点护盾` })
  return { effectType: 'shield', targetId: tid, success: true, value, description: `获得 ${value} 护盾` }
})

registerEffect('removeShield', (ctx, _params) => {
  const target = ctx.playerStates.get(ctx.targetId)
  if (!target) return { effectType: 'removeShield', targetId: ctx.targetId, success: false, description: '目标不存在' }

  const removed = target.shield
  target.shield = 0

  ctx.events.push({ type: 'removeShield', playerId: ctx.targetId, description: `护盾被移除 (${removed})` })
  return { effectType: 'removeShield', targetId: ctx.targetId, success: true, value: removed, description: `移除 ${removed} 护盾` }
})

registerEffect('draw', (ctx, params) => {
  const tid = getTargetId(ctx, params)
  const target = ctx.playerStates.get(tid)
  if (!target) return { effectType: 'draw', targetId: tid, success: false, description: '目标不存在' }

  const count = (params.count as number) || 1
  // Actual card draw is handled by combat service; here we just record intent
  ctx.events.push({ type: 'draw', playerId: tid, description: `抽 ${count} 张牌`, data: { count } })
  return { effectType: 'draw', targetId: tid, success: true, value: count, description: `抽 ${count} 张牌` }
})

registerEffect('discard', (ctx, params) => {
  const tid = getTargetId(ctx, params)
  const count = (params.count as number) || 1
  ctx.events.push({ type: 'discard', playerId: tid, description: `弃 ${count} 张牌`, data: { count, choice: params.choice } })
  return { effectType: 'discard', targetId: tid, success: true, value: count, description: `弃 ${count} 张牌` }
})

registerEffect('vision', (ctx, params) => {
  ctx.events.push({ type: 'vision', playerId: ctx.sourceId, description: '获得侦查信息', data: { reveal: params.reveal, targetId: ctx.targetId } })
  return { effectType: 'vision', targetId: ctx.targetId, success: true, description: '侦查成功' }
})

registerEffect('reflect', (ctx, params) => {
  const attacker = ctx.playerStates.get(ctx.sourceId)
  if (!attacker) return { effectType: 'reflect', targetId: ctx.sourceId, success: false, description: '来源不存在' }

  // ctx.sourceId is the one being hit, ctx.targetId (in trigger context) is the attacker
  // For reflect, we damage the attacker
  const value = (params.value as number) || 0
  const attackerId = ctx.targetId
  const attackerState = ctx.playerStates.get(attackerId)
  if (attackerState) {
    attackerState.hp = Math.max(0, attackerState.hp - value)
    ctx.events.push({ type: 'reflect', playerId: attackerId, description: `被反弹 ${value} 点伤害` })
  }
  return { effectType: 'reflect', targetId: attackerId, success: true, value, description: `反弹 ${value} 伤害` }
})

registerEffect('stealth', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'stealth', targetId: ctx.sourceId, success: false, description: '目标不存在' }

  target.flags.set('stealth', true)
  ctx.events.push({ type: 'stealth', playerId: ctx.sourceId, description: '进入隐匿状态' })
  return { effectType: 'stealth', targetId: ctx.sourceId, success: true, description: '进入隐匿' }
})

registerEffect('move', (ctx, params) => {
  ctx.events.push({ type: 'move', playerId: ctx.sourceId, description: '移动到新区域', data: { moveType: params.type } })
  return { effectType: 'move', targetId: ctx.sourceId, success: true, description: '移动成功' }
})

registerEffect('damageReduction', (_ctx, _params) => {
  // Passive — applied as a modifier during damage calculation, not executed directly
  return { effectType: 'damageReduction', targetId: _ctx.sourceId, success: true, description: '减伤被动已激活' }
})

registerEffect('damageBonus', (_ctx, _params) => {
  // Passive — applied as a modifier during damage calculation
  return { effectType: 'damageBonus', targetId: _ctx.sourceId, success: true, description: '伤害加成已激活' }
})

registerEffect('modifyPriority', (_ctx, _params) => {
  return { effectType: 'modifyPriority', targetId: _ctx.sourceId, success: true, description: '优先级已调整' }
})

registerEffect('mpReduction', (_ctx, _params) => {
  return { effectType: 'mpReduction', targetId: _ctx.sourceId, success: true, description: 'MP消耗减少' }
})

registerEffect('retrieveDiscard', (ctx, params) => {
  const tid = ctx.sourceId
  const count = (params.count as number) || 1
  ctx.events.push({ type: 'retrieveDiscard', playerId: tid, description: `从弃牌堆回收 ${count} 张牌`, data: { count, random: params.random } })
  return { effectType: 'retrieveDiscard', targetId: tid, success: true, value: count, description: `回收 ${count} 张` }
})
