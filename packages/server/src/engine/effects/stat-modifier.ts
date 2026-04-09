/**
 * 属性修改类效果模块
 * gainAC, modifyAgility, modifyActions, modifyScoutRange, modifyActionPoints,
 * amplify, superAmplify, damageReductionGain, overrideDamageType, hpForMp,
 * preventDeath, hpThresholdTrigger, modifyOutpostLimit
 */

import { registerEffect } from '../effect-pipeline.js'

function num(v: unknown, fallback: number = 0): number {
  return typeof v === 'number' ? v : fallback
}

registerEffect('gainAC', (ctx, params) => {
  const target = ctx.playerStates.get(params.target === 'self' ? ctx.sourceId : ctx.targetId)
  if (!target) return { effectType: 'gainAC', targetId: ctx.targetId, success: false, description: '目标不存在' }

  const value = num(params.value)
  const currentAC = num(target.flags.get('ac'))
  const maxAC = num(params.max, 999)
  target.flags.set('ac', Math.min(currentAC + value, maxAC))

  return { effectType: 'gainAC', targetId: ctx.sourceId, success: true, value, description: `获得 ${value} AC` }
})

registerEffect('modifyAgility', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'modifyAgility', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  target.flags.set('agilityModifier', params.value)
  return { effectType: 'modifyAgility', targetId: ctx.sourceId, success: true, value: 0, description: `敏捷修正: ${params.value}` }
})

registerEffect('modifyActions', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'modifyActions', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  const bonus = num(params.value)
  const current = num(target.flags.get('actionBonus'))
  target.flags.set('actionBonus', current + bonus)
  return { effectType: 'modifyActions', targetId: ctx.sourceId, success: true, value: bonus, description: `动作数 +${bonus}` }
})

registerEffect('modifyScoutRange', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'modifyScoutRange', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  target.flags.set('scoutRangeBonus', num(params.value))
  return { effectType: 'modifyScoutRange', targetId: ctx.sourceId, success: true, value: 0, description: `侦查距离 +${params.value}` }
})

registerEffect('modifyActionPoints', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'modifyActionPoints', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  target.flags.set('actionPointsBonus', num(params.value))
  return { effectType: 'modifyActionPoints', targetId: ctx.sourceId, success: true, value: 0, description: `行动点 +${params.value}` }
})

registerEffect('amplify', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'amplify', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  const value = num(params.value)
  const current = num(target.flags.get('amplification'))
  target.flags.set('amplification', current + value)
  return { effectType: 'amplify', targetId: ctx.sourceId, success: true, value, description: `增伤 +${value}` }
})

registerEffect('superAmplify', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'superAmplify', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  const value = num(params.value)
  const current = num(target.flags.get('superAmplification'))
  target.flags.set('superAmplification', current + value)
  return { effectType: 'superAmplify', targetId: ctx.sourceId, success: true, value, description: `超级增伤 +${value}` }
})

registerEffect('damageReductionGain', (ctx, params) => {
  const target = ctx.playerStates.get(params.target === 'self' ? ctx.sourceId : ctx.targetId)
  if (!target) return { effectType: 'damageReductionGain', targetId: ctx.targetId, success: false, description: '目标不存在' }
  const value = num(params.value)
  const current = num(target.flags.get('reduction'))
  target.flags.set('reduction', current + value)
  return { effectType: 'damageReductionGain', targetId: ctx.sourceId, success: true, value, description: `减伤 +${value}` }
})

registerEffect('overrideDamageType', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'overrideDamageType', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  target.flags.set('damageTypeOverride', params.damageType)
  return { effectType: 'overrideDamageType', targetId: ctx.sourceId, success: true, value: 0, description: `伤害类型覆盖: ${params.damageType}` }
})

registerEffect('hpForMp', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'hpForMp', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  target.flags.set('hpForMpRatio', num(params.ratio, 3))
  return { effectType: 'hpForMp', targetId: ctx.sourceId, success: true, value: 0, description: `HP替代MP (1:${params.ratio})` }
})

registerEffect('preventDeath', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'preventDeath', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  if (target.hp <= 0) {
    const setHp = num(params.setHp, 8)
    target.hp = Math.min(setHp, target.hpMax)
    target.hpMax = Math.max(target.hpMax, setHp)
    return { effectType: 'preventDeath', targetId: ctx.sourceId, success: true, value: setHp, description: `HP调整至 ${setHp}` }
  }
  return { effectType: 'preventDeath', targetId: ctx.sourceId, success: false, description: 'HP未归零' }
})

registerEffect('hpThresholdTrigger', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'hpThresholdTrigger', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  const threshold = num(params.threshold)
  const hpPercent = (target.hp / target.hpMax) * 100
  const triggered = hpPercent <= threshold
  if (triggered) target.flags.set('hpThresholdTriggered', true)
  return { effectType: 'hpThresholdTrigger', targetId: ctx.sourceId, success: triggered, description: triggered ? '低HP触发' : '未达阈值' }
})

registerEffect('modifyOutpostLimit', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'modifyOutpostLimit', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  target.flags.set('outpostLimitBonus', num(params.value))
  return { effectType: 'modifyOutpostLimit', targetId: ctx.sourceId, success: true, value: 0, description: `据点上限 +${params.value}` }
})
