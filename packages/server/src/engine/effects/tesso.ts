/**
 * 铁鼠（阴阳师：百闻牌）专属效果
 *
 * - luckyDraw: 幸运钱币骰子摸牌
 */

import { registerEffect } from '../effect-pipeline.js'

/**
 * 幸运摸牌：投骰子，达到阈值摸牌，达到更高阈值额外摸
 * params: { dice: 'd6', threshold: 4, bonusThreshold: 6 }
 */
registerEffect('luckyDraw', (ctx, params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!source) return { effectType: 'luckyDraw', targetId: ctx.sourceId, success: false, description: '目标不存在' }

  const diceSides = parseInt((params.dice as string || 'd6').replace('d', '')) || 6
  const threshold = (params.threshold as number) || 4
  const bonusThreshold = (params.bonusThreshold as number) || 6

  const roll = Math.floor(Math.random() * diceSides) + 1
  let drawCount = 0

  if (roll >= threshold) drawCount++
  if (roll >= bonusThreshold) drawCount++

  if (drawCount > 0) {
    ctx.events.push({
      type: 'luckyDraw', playerId: ctx.sourceId,
      description: `幸运钱币: 掷出${roll}，摸${drawCount}张牌`,
      data: { roll, drawCount },
    })
  } else {
    ctx.events.push({
      type: 'luckyDraw', playerId: ctx.sourceId,
      description: `幸运钱币: 掷出${roll}，未触发`,
      data: { roll, drawCount: 0 },
    })
  }

  return {
    effectType: 'luckyDraw', targetId: ctx.sourceId,
    success: drawCount > 0, value: drawCount,
    description: `掷${roll}${drawCount > 0 ? `，摸${drawCount}张` : '，未触发'}`,
    data: { roll, drawCount },
  }
})
