/**
 * 战斗类效果模块
 * damage, heal, shield, removeShield, reflect, freeStrike, negateEffect
 */

import { registerEffect } from '../effect-pipeline.js'

registerEffect('damage', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.targetId)
  if (!target) return { effectType: 'damage', targetId: ctx.targetId, success: false, description: '目标不存在' }

  let dmg = (params.value as number) || 0
  const pierceShield = (params.pierceShield as number) || 0

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
  const tid = (params.target === 'self') ? ctx.sourceId : ctx.targetId
  const target = ctx.playerStates.get(tid)
  if (!target) return { effectType: 'heal', targetId: tid, success: false, description: '目标不存在' }

  const value = (params.value as number) || 0
  const healed = Math.min(value, target.hpMax - target.hp)
  target.hp += healed

  ctx.events.push({ type: 'heal', playerId: tid, description: `回复 ${healed} 点HP` })
  return { effectType: 'heal', targetId: tid, success: true, value: healed, description: `回复 ${healed} HP` }
})

registerEffect('shield', (ctx, params) => {
  const tid = (params.target === 'self') ? ctx.sourceId : ctx.targetId
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

registerEffect('reflect', (ctx, params) => {
  const value = (params.value as number) || 0
  const attackerId = ctx.targetId
  const attackerState = ctx.playerStates.get(attackerId)
  if (attackerState) {
    attackerState.hp = Math.max(0, attackerState.hp - value)
    ctx.events.push({ type: 'reflect', playerId: attackerId, description: `被反弹 ${value} 点伤害` })
  }
  return { effectType: 'reflect', targetId: attackerId, success: true, value, description: `反弹 ${value} 伤害` }
})

registerEffect('freeStrike', (ctx, params) => {
  ctx.events.push({
    type: 'freeStrike', playerId: ctx.sourceId,
    description: `发动免费攻击`,
    data: { color: params.color, targetId: ctx.targetId },
  })
  return { effectType: 'freeStrike', targetId: ctx.sourceId, success: true, value: 0, description: '免费攻击' }
})

registerEffect('negateEffect', (ctx, params) => {
  ctx.events.push({
    type: 'negateEffect', playerId: ctx.sourceId,
    description: `无效化效果: ${params.effectDescription || ''}`,
    data: { negatedType: params.negatedType },
  })
  return { effectType: 'negateEffect', targetId: ctx.sourceId, success: true, value: 0, description: '效果被无效化' }
})

registerEffect('modifyResponseDifficulty', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'modifyResponseDifficulty', targetId: ctx.sourceId, success: false, description: '目标不存在' }

  const current = (target.flags.get('responseDifficulty') as number) || 0
  target.flags.set('responseDifficulty', current + ((params.value as number) || 0))
  return { effectType: 'modifyResponseDifficulty', targetId: ctx.sourceId, success: true, value: 0, description: `响应难度 +${params.value}` }
})
