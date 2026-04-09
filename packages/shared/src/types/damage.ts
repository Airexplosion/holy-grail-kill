/**
 * 伤害类型系统
 *
 * 6种伤害类型，各自与 AC(伤害吸收值) 的交互规则不同：
 * - normal（通常）: 可被AC吸收, 可防止, 可增伤, 可减伤
 * - true（真实）:   不可被AC吸收, 不可防止, 可增伤, 不可减伤
 * - hp_loss（流失）: 不视为伤害, 不触发伤害相关效果, 直接扣HP
 * - fixed（固定）:   可被AC吸收, 可防止, 不可增伤, 不可减伤
 * - blunt（钝性）:   可被AC吸收, 可防止, 不可增伤, 可减伤
 * - piercing（贯穿）: 不可被AC吸收, 可防止, 可增伤, 可减伤
 */

/** 伤害类型 */
export type DamageType = 'normal' | 'true' | 'hp_loss' | 'fixed' | 'blunt' | 'piercing'

/** 伤害类型与各机制的交互规则 */
export interface DamageTypeRules {
  /** 是否可被AC吸收 */
  readonly acAbsorbable: boolean
  /** 是否可被防止（护盾等） */
  readonly preventable: boolean
  /** 是否可被增伤影响 */
  readonly amplifiable: boolean
  /** 是否可被减伤影响 */
  readonly reducible: boolean
  /** 是否视为伤害（hp_loss不是） */
  readonly isDamage: boolean
}

/** 各伤害类型的规则表 */
export const DAMAGE_TYPE_RULES: Record<DamageType, DamageTypeRules> = {
  normal:   { acAbsorbable: true,  preventable: true,  amplifiable: true,  reducible: true,  isDamage: true  },
  true:     { acAbsorbable: false, preventable: false, amplifiable: true,  reducible: false, isDamage: true  },
  hp_loss:  { acAbsorbable: false, preventable: false, amplifiable: false, reducible: false, isDamage: false },
  fixed:    { acAbsorbable: true,  preventable: true,  amplifiable: false, reducible: false, isDamage: true  },
  blunt:    { acAbsorbable: true,  preventable: true,  amplifiable: false, reducible: true,  isDamage: true  },
  piercing: { acAbsorbable: false, preventable: true,  amplifiable: true,  reducible: true,  isDamage: true  },
}

/** 伤害类型中文标签 */
export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  normal: '通常伤害',
  true: '真实伤害',
  hp_loss: 'HP流失',
  fixed: '固定伤害',
  blunt: '钝性伤害',
  piercing: '贯穿伤害',
}

/**
 * 伤害类型覆盖优先级（高优先级覆盖低优先级）
 * 狂化的钝性伤害覆盖优先级最高
 */
export const DAMAGE_TYPE_PRIORITY: Record<DamageType, number> = {
  hp_loss: 0,
  normal: 1,
  fixed: 2,
  piercing: 3,
  true: 4,
  blunt: 5,  // 最高优先级（狂化等）
}

/**
 * AC 计算：每1点AC吸收1点伤害，最少造成1点伤害
 * finalDmg = max(1, rawDmg - AC)  （对于可被AC吸收的类型）
 */
export const AC_MINIMUM_DAMAGE = 1
