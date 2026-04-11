/**
 * 缇妲妮娅（仲夏夜之梦）专属效果
 *
 * - mpSpendHeal: MP消耗回血（非攻击方式）
 * - colorBranchAttack: 按攻击颜色分支触发不同效果
 * - conditionalExtraMp: 条件获得额外MP
 * - pullToCombat: 拉远处角色入战斗
 * - noDamageStrike: 攻击不造成伤害
 * - aoeForceDiscardToOne: 全场弃牌至1张
 */

import { registerEffect } from '../effect-pipeline.js'

/** MP消耗回血：每消耗1MP回复ratio点HP，每回合有上限 */
registerEffect('mpSpendHeal', (ctx, params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!source) return { effectType: 'mpSpendHeal', targetId: ctx.sourceId, success: false, description: '目标不存在' }

  source.flags.set('mpSpendHealRatio', (params.ratio as number) || 1)
  source.flags.set('mpSpendHealCapBase', params.capBasedOn || 'baseDamage')
  source.flags.set('mpSpendHealCapMul', (params.capMultiplier as number) || 1)
  source.flags.set('mpSpendHealUsed', 0) // 本回合已回复量

  ctx.events.push({ type: 'mpSpendHeal', playerId: ctx.sourceId, description: '被动激活：MP消耗回血' })
  return { effectType: 'mpSpendHeal', targetId: ctx.sourceId, success: true, description: '芥子被动已激活' }
})

/** 按颜色分支触发不同效果（蛛丝用） */
registerEffect('colorBranchAttack', (ctx, params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!source) return { effectType: 'colorBranchAttack', targetId: ctx.sourceId, success: false, description: '目标不存在' }

  const attackColor = source.flags.get('currentAttackColor') as string || 'colorless'
  const branches = params as Record<string, any>

  let desc = ''
  if (attackColor === 'colorless' && branches.colorless) {
    const b = branches.colorless
    if (b.piercing) source.flags.set('piercingDamage', true)
    if (b.responseDifficultyBonus) {
      const cur = (source.flags.get('responseDifficulty') as number) || 0
      source.flags.set('responseDifficulty', cur + b.responseDifficultyBonus)
    }
    desc = '无色分支：贯穿+响应难度+1'
  } else if (attackColor === 'blue' && branches.blue) {
    const b = branches.blue
    const target = ctx.playerStates.get(ctx.targetId)
    if (target && b.applyDebuff === 'spiderWeb') {
      const current = (target.flags.get('spiderWeb') as number) || 0
      target.flags.set('spiderWeb', current + (b.stacks || 2))
      desc = `蓝色分支：目标获得${b.stacks}层蛛网缠绕`
    }
  } else if (branches.other) {
    const b = branches.other
    if (b.drawAfter) {
      ctx.events.push({ type: 'draw', playerId: ctx.sourceId, description: `摸 ${b.drawAfter} 张牌`, data: { count: b.drawAfter } })
    }
    desc = `其他颜色分支：摸${branches.other.drawAfter}张牌`
  }

  ctx.events.push({ type: 'colorBranchAttack', playerId: ctx.sourceId, description: desc || '颜色分支触发' })
  return { effectType: 'colorBranchAttack', targetId: ctx.sourceId, success: true, description: desc }
})

/** 条件获得额外MP（第一回合除外，无额外MP时获得） */
registerEffect('conditionalExtraMp', (ctx, params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!source) return { effectType: 'conditionalExtraMp', targetId: ctx.sourceId, success: false, description: '目标不存在' }

  // 通过flag判断是否第一回合和是否有额外MP
  const roundNumber = (source.flags.get('roundNumber') as number) || 1
  const skipFirst = params.skipFirstRound as boolean
  if (skipFirst && roundNumber <= 1) {
    return { effectType: 'conditionalExtraMp', targetId: ctx.sourceId, success: false, description: '第一回合跳过' }
  }

  const extraMp = (source.flags.get('extraMp') as number) || 0
  if (extraMp > 0) {
    return { effectType: 'conditionalExtraMp', targetId: ctx.sourceId, success: false, description: '已有额外MP' }
  }

  source.flags.set('extraMp', (params.value as number) || 1)
  ctx.events.push({ type: 'conditionalExtraMp', playerId: ctx.sourceId, description: '获得1点额外MP' })
  return { effectType: 'conditionalExtraMp', targetId: ctx.sourceId, success: true, value: 1, description: '豌豆花：+1额外MP' }
})

/** 拉远处角色入战斗 */
registerEffect('pullToCombat', (ctx, params) => {
  const maxLocations = (params.maxLocations as number) || 3
  ctx.events.push({
    type: 'pullToCombat', playerId: ctx.sourceId,
    description: `指定至多${maxLocations}处地点的角色加入战斗`,
    data: { maxLocations, noStandby: params.noStandby },
  })
  return { effectType: 'pullToCombat', targetId: ctx.sourceId, success: true, description: `拉${maxLocations}处角色入战斗` }
})

/** 攻击不造成伤害标记 */
registerEffect('noDamageStrike', (ctx, _params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (source) source.flags.set('noDamageStrike', true)
  return { effectType: 'noDamageStrike', targetId: ctx.sourceId, success: true, description: '本次攻击不造成伤害' }
})

/** 全场弃牌至1张（需额外消耗10MP） */
registerEffect('aoeForceDiscardToOne', (ctx, params) => {
  const mpCost = (params.mpCost as number) || 10
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!source || source.mp < mpCost) {
    return { effectType: 'aoeForceDiscardToOne', targetId: ctx.sourceId, success: false, description: `MP不足(需${mpCost})` }
  }

  source.mp -= mpCost
  let affected = 0

  for (const [playerId, state] of ctx.playerStates) {
    if (playerId === ctx.sourceId) continue
    if (state.handCount <= 1) continue
    const discardCount = state.handCount - 1
    state.handCount = 1
    affected++
    ctx.events.push({
      type: 'aoeForceDiscardToOne', playerId,
      description: `随机弃置${discardCount}张手牌至剩1张`,
    })
  }

  return { effectType: 'aoeForceDiscardToOne', targetId: ctx.sourceId, success: true, value: affected, description: `全场${affected}人弃牌至1张` }
})
