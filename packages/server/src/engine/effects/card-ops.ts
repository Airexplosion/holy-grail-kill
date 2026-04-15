/**
 * 卡牌操作类效果模块
 * draw, discard, forceDiscard, addTempCard, retrieveDiscard,
 * revealHandRandom, chargeGain
 */

import { registerEffect } from '../effect-pipeline.js'

registerEffect('draw', (ctx, params) => {
  const tid = (params.target === 'self') ? ctx.sourceId : ctx.targetId
  const count = (params.count as number) || 1
  const target = ctx.playerStates.get(tid)
  if (target) {
    target.handCount += count
  }
  ctx.events.push({ type: 'draw', playerId: tid, description: `抽 ${count} 张牌`, data: { count } })
  return { effectType: 'draw', targetId: tid, success: true, value: count, description: `抽 ${count} 张牌` }
})

registerEffect('discard', (ctx, params) => {
  const tid = (params.target === 'self') ? ctx.sourceId : ctx.targetId
  const count = (params.count as number) || 1
  const target = ctx.playerStates.get(tid)
  if (target) {
    target.handCount = Math.max(0, target.handCount - count)
  }
  ctx.events.push({ type: 'discard', playerId: tid, description: `弃 ${count} 张牌`, data: { count, choice: params.choice } })
  return { effectType: 'discard', targetId: tid, success: true, value: count, description: `弃 ${count} 张牌` }
})

registerEffect('forceDiscard', (ctx, params) => {
  const targetId = params.target === 'self' ? ctx.sourceId : ctx.targetId
  const count = (params.count as number) || 1
  const target = ctx.playerStates.get(targetId)
  if (target) {
    target.handCount = Math.max(0, target.handCount - count)
  }
  ctx.events.push({
    type: 'forceDiscard', playerId: targetId,
    description: `被迫弃置 ${count} 张牌`,
    data: { count, random: params.random },
  })
  return { effectType: 'forceDiscard', targetId, success: true, value: count, description: `弃置 ${count} 张` }
})

registerEffect('addTempCard', (ctx, params) => {
  const count = (params.count as number) || 1
  const target = ctx.playerStates.get(ctx.sourceId)
  if (target) {
    // Cards added to hand increase handCount; cards added to deck do not
    const toHand = params.toHand === true
    if (toHand) {
      target.handCount += count
    }
  }
  ctx.events.push({
    type: 'addTempCard', playerId: ctx.sourceId,
    description: `获得 ${count} 张临时牌`,
    data: { color: params.color, count, temporary: true, erased: params.erased, toHand: params.toHand },
  })
  return { effectType: 'addTempCard', targetId: ctx.sourceId, success: true, value: count, description: `获得 ${count} 张临时牌` }
})

registerEffect('retrieveDiscard', (ctx, params) => {
  const tid = ctx.sourceId
  const count = (params.count as number) || 1
  const target = ctx.playerStates.get(tid)
  if (target) {
    target.handCount += count
  }
  ctx.events.push({ type: 'retrieveDiscard', playerId: tid, description: `从弃牌堆回收 ${count} 张牌`, data: { count, random: params.random } })
  return { effectType: 'retrieveDiscard', targetId: tid, success: true, value: count, description: `回收 ${count} 张` }
})

registerEffect('revealHandRandom', (ctx, params) => {
  const count = (params.count as number) || 1
  const target = ctx.playerStates.get(ctx.targetId)
  if (target) {
    // Set flag so the service layer knows which cards to reveal
    target.flags.set('revealHandRandom', count)
    if (params.makeColorless) {
      target.flags.set('makeColorless', count)
    }
  }
  ctx.events.push({
    type: 'revealHandRandom', playerId: ctx.targetId,
    description: `随机展示 ${count} 张手牌`,
    data: { count, makeColorless: params.makeColorless },
  })
  return { effectType: 'revealHandRandom', targetId: ctx.targetId, success: true, value: count, description: `展示 ${count} 张` }
})

registerEffect('chargeGain', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'chargeGain', targetId: ctx.sourceId, success: false, description: '目标不存在' }

  const skillId = params.skillId as string
  const value = (params.value as number) || 1
  const currentCharges = (target.flags.get(`charge:${skillId}`) as number) || 0
  const max = (params.max as number) || 999
  target.flags.set(`charge:${skillId}`, Math.min(currentCharges + value, max))
  return { effectType: 'chargeGain', targetId: ctx.sourceId, success: true, value, description: `充能 +${value}` }
})
