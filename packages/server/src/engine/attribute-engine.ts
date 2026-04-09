import type { AttributeRank, ServantAttributes, MasterAttributes } from 'shared'
import {
  RANK_ORDER, RANK_TOTAL_COST, RANK_REQUIRES_UNLOCK,
  SERVANT_ATTRIBUTE_POINTS,
  SERVANT_STR_TABLE, SERVANT_END_TABLE, SERVANT_AGI_TABLE, SERVANT_MAG_TABLE, SERVANT_LUK_TABLE,
  MASTER_STR_TABLE, MASTER_END_TABLE, MASTER_MAG_TABLE, MASTER_ACTION_POWER_TABLE,
} from 'shared'

// ── 属性等级比较 ──

export function rankIndex(rank: AttributeRank): number {
  return RANK_ORDER.indexOf(rank)
}

export function compareRanks(a: AttributeRank, b: AttributeRank): number {
  return rankIndex(a) - rankIndex(b)
}

// ── 幻身属性派生 ──

export interface ServantDerivedStats {
  readonly baseDamage: number
  readonly hp: number
  readonly actions: number
  readonly mp: number
  readonly handSize: number
}

export function deriveServantStats(attrs: ServantAttributes): ServantDerivedStats {
  return {
    baseDamage: SERVANT_STR_TABLE[attrs.str],
    hp: SERVANT_END_TABLE[attrs.end],
    actions: SERVANT_AGI_TABLE[attrs.agi],
    mp: SERVANT_MAG_TABLE[attrs.mag],
    handSize: SERVANT_LUK_TABLE[attrs.luk],
  }
}

// ── 篡者属性派生 ──

export interface MasterDerivedStats {
  readonly baseDamage: number
  readonly hp: number
  readonly mp: number
  readonly handSize: number
}

export function deriveMasterStats(attrs: MasterAttributes): MasterDerivedStats {
  return {
    baseDamage: MASTER_STR_TABLE[attrs.str],
    hp: MASTER_END_TABLE[attrs.end],
    mp: MASTER_MAG_TABLE[attrs.mag],
    handSize: MASTER_ACTION_POWER_TABLE[attrs.actionPower],
  }
}

// ── 幻身属性分配验证 ──

export interface AllocationValidation {
  readonly valid: boolean
  readonly totalCost: number
  readonly remaining: number
  readonly errors: readonly string[]
}

/**
 * 验证幻身16点属性分配
 * @param attrs 属性等级
 * @param totalPoints 总点数（默认16，七骑之首Saber+2=18）
 * @param unlockHighRanks 是否解锁A+/A++（某些范型提供）
 */
export function validateServantAllocation(
  attrs: ServantAttributes,
  totalPoints: number = SERVANT_ATTRIBUTE_POINTS,
  unlockHighRanks: boolean = false,
): AllocationValidation {
  const errors: string[] = []
  const attrEntries: [string, AttributeRank][] = [
    ['str', attrs.str], ['end', attrs.end], ['agi', attrs.agi],
    ['mag', attrs.mag], ['luk', attrs.luk],
  ]

  let totalCost = 0
  for (const [name, rank] of attrEntries) {
    const cost = RANK_TOTAL_COST[rank]
    totalCost += cost

    if (!unlockHighRanks && RANK_REQUIRES_UNLOCK[rank]) {
      errors.push(`${name}: ${rank} 需要解锁高等级属性`)
    }
  }

  if (totalCost > totalPoints) {
    errors.push(`属性点超出上限: 已用 ${totalCost}/${totalPoints}`)
  }

  return {
    valid: errors.length === 0,
    totalCost,
    remaining: totalPoints - totalCost,
    errors,
  }
}

/**
 * 验证篡者属性分配
 * 篡者属性由GM/系统设置，此处只验证是否需要解锁
 */
export function validateMasterAllocation(
  attrs: MasterAttributes,
  unlockHighRanks: boolean = false,
): AllocationValidation {
  const errors: string[] = []
  const attrEntries: [string, AttributeRank][] = [
    ['str', attrs.str], ['end', attrs.end],
    ['mag', attrs.mag], ['actionPower', attrs.actionPower],
  ]

  let totalCost = 0
  for (const [name, rank] of attrEntries) {
    totalCost += RANK_TOTAL_COST[rank]
    if (!unlockHighRanks && RANK_REQUIRES_UNLOCK[rank]) {
      errors.push(`${name}: ${rank} 需要解锁高等级属性`)
    }
  }

  return {
    valid: errors.length === 0,
    totalCost,
    remaining: 0,
    errors,
  }
}
