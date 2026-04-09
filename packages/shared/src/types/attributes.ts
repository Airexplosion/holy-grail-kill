/**
 * 属性等级系统
 * E → D → C → B → A → A+ → A++
 * 幻身16点分配，篡者由规则/范型决定
 */

/** 属性等级 */
export type AttributeRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'A+' | 'A++'

/** 等级排序（用于比较） */
export const RANK_ORDER: readonly AttributeRank[] = ['E', 'D', 'C', 'B', 'A', 'A+', 'A++']

/** 升一级所需点数（从前一级升到该级） */
export const RANK_UPGRADE_COST: Record<AttributeRank, number> = {
  'E': 0,     // 初始等级，不消耗
  'D': 1,
  'C': 2,
  'B': 3,
  'A': 4,
  'A+': 5,    // 需解锁
  'A++': 6,   // 需解锁
}

/** 累计消耗（从E升到该级的总点数） */
export const RANK_TOTAL_COST: Record<AttributeRank, number> = {
  'E': 0,
  'D': 1,
  'C': 3,
  'B': 6,
  'A': 10,
  'A+': 15,
  'A++': 21,
}

/** A+ 和 A++ 需要特殊解锁（通过范型等） */
export const RANK_REQUIRES_UNLOCK: Record<AttributeRank, boolean> = {
  'E': false,
  'D': false,
  'C': false,
  'B': false,
  'A': false,
  'A+': true,
  'A++': true,
}

// ── 幻身属性 (Servant) ──

/** 幻身五维属性 */
export interface ServantAttributes {
  readonly str: AttributeRank   // 筋力 → 基础伤害
  readonly end: AttributeRank   // 耐久 → HP
  readonly agi: AttributeRank   // 敏捷 → 动作数 + 先攻
  readonly mag: AttributeRank   // 魔力 → MP上限
  readonly luk: AttributeRank   // 幸运 → 手牌上限
}

/** 幻身属性分配总点数 */
export const SERVANT_ATTRIBUTE_POINTS = 16

/** 幻身 筋力→基础伤害 */
export const SERVANT_STR_TABLE: Record<AttributeRank, number> = {
  'E': 2, 'D': 3, 'C': 3, 'B': 4, 'A': 4, 'A+': 5, 'A++': 6,
}

/** 幻身 耐久→HP */
export const SERVANT_END_TABLE: Record<AttributeRank, number> = {
  'E': 24, 'D': 28, 'C': 32, 'B': 36, 'A': 40, 'A+': 44, 'A++': 48,
}

/** 幻身 敏捷→动作数 */
export const SERVANT_AGI_TABLE: Record<AttributeRank, number> = {
  'E': 2, 'D': 3, 'C': 3, 'B': 4, 'A': 4, 'A+': 5, 'A++': 6,
}

/** 幻身 魔力→MP上限 */
export const SERVANT_MAG_TABLE: Record<AttributeRank, number> = {
  'E': 2, 'D': 3, 'C': 3, 'B': 4, 'A': 4, 'A+': 5, 'A++': 6,
}

/** 幻身 幸运→手牌上限 */
export const SERVANT_LUK_TABLE: Record<AttributeRank, number> = {
  'E': 5, 'D': 6, 'C': 6, 'B': 7, 'A': 7, 'A+': 8, 'A++': 9,
}

// ── 篡者属性 (Master) ──

/** 篡者四维属性 */
export interface MasterAttributes {
  readonly str: AttributeRank        // 筋力 → 基础伤害
  readonly end: AttributeRank        // 耐久 → HP
  readonly mag: AttributeRank        // 魔力 → MP上限
  readonly actionPower: AttributeRank // 行动力 → 手牌上限
}

/** 篡者 筋力→基础伤害 */
export const MASTER_STR_TABLE: Record<AttributeRank, number> = {
  'E': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'A+': 5, 'A++': 6,
}

/** 篡者 耐久→HP */
export const MASTER_END_TABLE: Record<AttributeRank, number> = {
  'E': 20, 'D': 25, 'C': 30, 'B': 35, 'A': 40, 'A+': 45, 'A++': 50,
}

/** 篡者 魔力→MP上限 */
export const MASTER_MAG_TABLE: Record<AttributeRank, number> = {
  'E': 1, 'D': 2, 'C': 3, 'B': 4, 'A': 5, 'A+': 6, 'A++': 7,
}

/** 篡者 行动力→手牌上限 */
export const MASTER_ACTION_POWER_TABLE: Record<AttributeRank, number> = {
  'E': 1, 'D': 2, 'C': 3, 'B': 4, 'A': 5, 'A+': 6, 'A++': 7,
}

// ── 中文标签 ──

export const RANK_LABELS: Record<AttributeRank, string> = {
  'E': 'E', 'D': 'D', 'C': 'C', 'B': 'B', 'A': 'A', 'A+': 'A+', 'A++': 'A++',
}

export const SERVANT_ATTR_LABELS: Record<keyof ServantAttributes, string> = {
  str: '筋力', end: '耐久', agi: '敏捷', mag: '魔力', luk: '幸运',
}

export const MASTER_ATTR_LABELS: Record<keyof MasterAttributes, string> = {
  str: '筋力', end: '耐久', mag: '魔力', actionPower: '行动力',
}
