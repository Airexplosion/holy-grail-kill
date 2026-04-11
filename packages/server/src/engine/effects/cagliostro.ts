/**
 * 亚历山德罗·迪·卡利奥斯特罗 专属效果
 *
 * - healByMpMax: 按MP上限倍率回血
 * - conditionalRedraw: 条件弃抽（唯一AC持有者时）
 * - globalUnknownAttack: 宝具全体颜色不明攻击（1D4响应难度 + 1D10 HP流失）
 */

import { registerEffect } from '../effect-pipeline.js'

/** 按MP上限回血: HP += mpMax * multiplier */
registerEffect('healByMpMax', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.sourceId)
  if (!target) return { effectType: 'healByMpMax', targetId: ctx.sourceId, success: false, description: '目标不存在' }

  const multiplier = (params.multiplier as number) || 5
  const healAmount = target.mpMax * multiplier
  target.hp = Math.min(target.hpMax, target.hp + healAmount)

  ctx.events.push({ type: 'healByMpMax', playerId: ctx.sourceId, description: `回复 ${healAmount} HP (MP上限${target.mpMax}×${multiplier})` })
  return { effectType: 'healByMpMax', targetId: ctx.sourceId, success: true, value: healAmount, description: `回复 ${healAmount} HP` }
})

/** 条件弃抽：满足条件时弃1抽1 */
registerEffect('conditionalRedraw', (ctx, params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!source) return { effectType: 'conditionalRedraw', targetId: ctx.sourceId, success: false, description: '目标不存在' }

  const condition = params.condition as string
  if (condition === 'soleACHolder') {
    // 检查是否是场上唯一有AC的角色
    let acHolderCount = 0
    for (const [, state] of ctx.playerStates) {
      const ac = (state.flags.get('ac') as number) || 0
      if (ac > 0) acHolderCount++
    }

    if (acHolderCount > 1) {
      return { effectType: 'conditionalRedraw', targetId: ctx.sourceId, success: false, description: '不是唯一AC持有者' }
    }
  }

  const count = (params.count as number) || 1
  ctx.events.push({ type: 'conditionalRedraw', playerId: ctx.sourceId, description: `弃抽 ${count} 张牌`, data: { count } })
  return { effectType: 'conditionalRedraw', targetId: ctx.sourceId, success: true, value: count, description: `弃抽 ${count} 张` }
})

/**
 * 宝具：全体颜色不明攻击
 * 每个目标分别投掷响应难度(1D4)和HP流失(1D10)
 */
registerEffect('globalUnknownAttack', (ctx, params) => {
  const results: Array<{ targetId: string; responseDifficulty: number; hpLoss: number }> = []

  for (const [playerId, state] of ctx.playerStates) {
    if (playerId === ctx.sourceId) continue

    const responseDifficulty = Math.floor(Math.random() * 4) + 1 // 1D4
    const hpLoss = Math.floor(Math.random() * 10) + 1 // 1D10

    // 模拟攻击（简化：直接判定命中并扣血）
    state.hp = Math.max(0, state.hp - hpLoss)
    results.push({ targetId: playerId, responseDifficulty, hpLoss })

    ctx.events.push({
      type: 'globalUnknownAttack', playerId,
      description: `受到颜色不明攻击 (响应难度${responseDifficulty}, 流失${hpLoss}HP)`,
      data: { responseDifficulty, hpLoss },
    })
  }

  return {
    effectType: 'globalUnknownAttack', targetId: ctx.sourceId, success: true,
    value: results.length, description: `对 ${results.length} 个目标发动颜色不明攻击`,
    data: { results },
  }
})
