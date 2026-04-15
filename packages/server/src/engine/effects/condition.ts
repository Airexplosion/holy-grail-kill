/**
 * 条件/标记类效果模块
 * setFlag, checkFlag, conditional, vision, stealth, move,
 * immuneToScout, scoutReveal,
 * damageReduction(passive), damageBonus(passive), modifyPriority(passive), mpReduction(passive)
 */

import { registerEffect } from '../effect-pipeline.js'

registerEffect('setFlag', (ctx, params) => {
  const target = ctx.playerStates.get(params.target === 'self' ? ctx.sourceId : ctx.targetId)
  if (!target) return { effectType: 'setFlag', targetId: ctx.targetId, success: false, description: '目标不存在' }
  target.flags.set(params.flag as string, params.flagValue ?? true)
  return { effectType: 'setFlag', targetId: ctx.sourceId, success: true, value: 0, description: `标记: ${params.flag}` }
})

registerEffect('checkFlag', (ctx, params) => {
  const target = ctx.playerStates.get(params.target === 'self' ? ctx.sourceId : ctx.targetId)
  if (!target) return { effectType: 'checkFlag', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  const value = target.flags.get(params.flag as string)
  const expected = params.expected ?? true
  const matches = value === expected
  return { effectType: 'checkFlag', targetId: ctx.sourceId, success: matches, description: matches ? '条件满足' : '条件不满足' }
})

registerEffect('conditional', (ctx, params) => {
  const target = ctx.playerStates.get(params.checkTarget === 'self' ? ctx.sourceId : ctx.targetId)
  if (!target) return { effectType: 'conditional', targetId: ctx.targetId, success: false, description: '目标不存在' }
  const flag = params.flag as string
  const value = target.flags.get(flag)
  const expected = params.expected ?? true
  if (value === expected) {
    return { effectType: 'conditional', targetId: ctx.sourceId, success: true, value: 0, description: `条件 ${flag} 满足` }
  }
  return { effectType: 'conditional', targetId: ctx.sourceId, success: false, description: `条件 ${flag} 不满足` }
})

registerEffect('vision', (ctx, params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (source) {
    // Set flag for service layer to reveal target info
    source.flags.set('visionTarget', ctx.targetId)
    source.flags.set('visionReveal', params.reveal || 'basic')
  }
  ctx.events.push({ type: 'vision', playerId: ctx.sourceId, description: '获得侦查信息', data: { reveal: params.reveal, targetId: ctx.targetId } })
  return { effectType: 'vision', targetId: ctx.targetId, success: true, description: '侦查成功' }
})

registerEffect('stealth', (ctx, _params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'stealth', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  target.flags.set('stealth', true)
  ctx.events.push({ type: 'stealth', playerId: ctx.sourceId, description: '进入隐匿状态' })
  return { effectType: 'stealth', targetId: ctx.sourceId, success: true, description: '进入隐匿' }
})

registerEffect('move', (ctx, params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (source) {
    // Set flag for service layer to process the move
    source.flags.set('pendingMove', params.type || 'normal')
  }
  ctx.events.push({ type: 'move', playerId: ctx.sourceId, description: '移动到新区域', data: { moveType: params.type } })
  return { effectType: 'move', targetId: ctx.sourceId, success: true, description: '移动成功' }
})

registerEffect('immuneToScout', (ctx, _params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'immuneToScout', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  target.flags.set('immuneToScout', true)
  return { effectType: 'immuneToScout', targetId: ctx.sourceId, success: true, value: 0, description: '免疫侦查' }
})

registerEffect('scoutReveal', (ctx, params) => {
  ctx.events.push({
    type: 'scoutReveal', playerId: ctx.sourceId,
    description: `侦查获取信息`,
    data: { targetId: ctx.targetId, reveals: params.reveals },
  })
  return { effectType: 'scoutReveal', targetId: ctx.sourceId, success: true, value: 0, description: '侦查信息获取' }
})

// 被动效果 — 设置 flags 供伤害计算器/战斗引擎/技能执行器读取
registerEffect('damageReduction', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (target) {
    const value = (params.value as number) || 0
    const current = (target.flags.get('damageReduction') as number) || 0
    target.flags.set('damageReduction', current + value)
  }
  return { effectType: 'damageReduction', targetId: ctx.sourceId, success: true, description: `减伤被动 +${(params.value as number) || 0}` }
})

registerEffect('damageBonus', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (target) {
    const value = (params.value as number) || 0
    const current = (target.flags.get('damageBonus') as number) || 0
    target.flags.set('damageBonus', current + value)
  }
  return { effectType: 'damageBonus', targetId: ctx.sourceId, success: true, description: `伤害加成 +${(params.value as number) || 0}` }
})

registerEffect('modifyPriority', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (target) {
    const value = (params.value as number) || 0
    const current = (target.flags.get('priorityModifier') as number) || 0
    target.flags.set('priorityModifier', current + value)
  }
  return { effectType: 'modifyPriority', targetId: ctx.sourceId, success: true, description: `优先级 +${(params.value as number) || 0}` }
})

registerEffect('mpReduction', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (target) {
    target.flags.set('mpReduction', true)
    if (params.value !== undefined) {
      target.flags.set('mpReductionValue', params.value)
    }
  }
  return { effectType: 'mpReduction', targetId: ctx.sourceId, success: true, description: 'MP消耗减少已激活' }
})
