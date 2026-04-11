/**
 * 奈亚子（潜行吧！奈亚子）专属效果模块
 *
 * 注册效果：
 * - trueDamage          — 真实伤害（无视护盾/AC）
 * - addTempCardByKills  — 按击杀数生成临时牌
 * - lockMajorityColorResponse — 锁定目标手中最多颜色的响应
 * - crawlingChaosRandom — 伏行之混沌随机能力
 */

import { registerEffect } from '../effect-pipeline.js'

// ── 真实伤害 ──
// params: { multiplier: number, basedOn: 'baseDamage' }
// 无视护盾和AC，直接扣HP
registerEffect('trueDamage', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.targetId)
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!target || !source) {
    return { effectType: 'trueDamage', targetId: ctx.targetId, success: false, description: '目标不存在' }
  }

  const baseDamage = (source.flags.get('baseDamage') as number) || 10
  const multiplier = (params.multiplier as number) || 1
  const totalDamage = baseDamage * multiplier

  target.hp = Math.max(0, target.hp - totalDamage)

  ctx.events.push({
    type: 'trueDamage',
    playerId: ctx.targetId,
    description: `受到 ${totalDamage} 点真实伤害 (基准${baseDamage}×${multiplier})`,
    data: { baseDamage, multiplier, totalDamage },
  })

  return {
    effectType: 'trueDamage',
    targetId: ctx.targetId,
    success: true,
    value: totalDamage,
    description: `造成 ${totalDamage} 点真实伤害`,
  }
})

// ── 按击杀数生成临时牌 ──
// params: { color: string, baseCount: number, erased: boolean }
// 生成数量 = 已击杀从者数(flags.killCount) + baseCount
registerEffect('addTempCardByKills', (ctx, params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!source) {
    return { effectType: 'addTempCardByKills', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  }

  const killCount = (source.flags.get('killCount') as number) || 0
  const baseCount = (params.baseCount as number) || 1
  const count = killCount + baseCount
  const color = (params.color as string) || 'colorless'
  const erased = params.erased !== false

  ctx.events.push({
    type: 'addTempCardByKills',
    playerId: ctx.sourceId,
    description: `生成 ${count} 张${erased ? '[临时][抹消]' : '[临时]'}${color === 'colorless' ? '无色' : color}普通牌 (击杀${killCount}+基础${baseCount})`,
    data: { count, color, erased, killCount },
  })

  return {
    effectType: 'addTempCardByKills',
    targetId: ctx.sourceId,
    success: true,
    value: count,
    description: `获得 ${count} 张临时牌`,
    data: { count, color, erased },
  }
})

// ── 锁定目标最多颜色响应 ──
// 无色攻击指定唯一目标后，该目标不能使用手中颜色最多的牌进行响应
// 实际生效时：combat-engine 在响应阶段检查此 flag
registerEffect('lockMajorityColorResponse', (ctx, _params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!source) {
    return { effectType: 'lockMajorityColorResponse', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  }

  // 标记来源玩家拥有此被动
  source.flags.set('lockMajorityColorResponse', true)

  ctx.events.push({
    type: 'lockMajorityColorResponse',
    playerId: ctx.sourceId,
    description: '被动激活：无色攻击时锁定目标最多颜色的响应牌',
  })

  return {
    effectType: 'lockMajorityColorResponse',
    targetId: ctx.sourceId,
    success: true,
    description: '被动已激活：锁定目标多数颜色响应',
  }
})

// ── 伏行之混沌随机能力 ──
// 行动阶段开始时，若独处则随机获得4种能力之一
// 调用方需设置 flags.isAloneInRegion
registerEffect('crawlingChaosRandom', (ctx, _params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!source) {
    return { effectType: 'crawlingChaosRandom', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  }

  const isAlone = source.flags.get('isAloneInRegion') as boolean
  if (!isAlone) {
    return {
      effectType: 'crawlingChaosRandom',
      targetId: ctx.sourceId,
      success: false,
      description: '当前地点有其他组角色，能力未触发',
    }
  }

  const roll = Math.floor(Math.random() * 4) + 1
  let desc: string

  switch (roll) {
    case 1:
      source.flags.set('extraAdjacentMove', true)
      desc = '本回合内可额外进行一次相邻移动'
      break
    case 2:
      source.flags.set('immuneToScout', true)
      desc = '本回合内侦查中视为不存在'
      break
    case 3:
      source.flags.set('scoutRangeBonus', 2)
      source.flags.set('actionPointPenalty', 1)
      desc = '侦查范围+2，但行动点-1'
      break
    case 4:
      source.flags.set('standbyFreeAttack', true)
      source.flags.set('standbyFreeAttackDifficulty', 1)
      desc = '备战开始时可进行1次无色普通攻击(响应难度1)'
      break
    default:
      desc = '未知效果'
  }

  ctx.events.push({
    type: 'crawlingChaosRandom',
    playerId: ctx.sourceId,
    description: `伏行之混沌: ${desc}`,
    data: { roll, ability: desc },
  })

  return {
    effectType: 'crawlingChaosRandom',
    targetId: ctx.sourceId,
    success: true,
    value: roll,
    description: desc,
    data: { roll },
  }
})
