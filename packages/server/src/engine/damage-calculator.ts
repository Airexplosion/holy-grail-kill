import type { DamageType } from 'shared'
import { DAMAGE_TYPE_RULES, AC_MINIMUM_DAMAGE, DAMAGE_TYPE_PRIORITY } from 'shared'

/**
 * 伤害计算管线
 *
 * 计算流程：
 * 1. 确定伤害类型（优先级覆盖）
 * 2. 应用增伤（如果该类型允许）
 * 3. 应用减伤（如果该类型允许）
 * 4. 应用AC吸收（如果该类型允许）
 * 5. 应用最低伤害保底（1点）
 */

export interface DamageInput {
  /** 基础伤害值 */
  readonly baseDamage: number
  /** 伤害类型 */
  readonly damageType: DamageType
  /** 攻击者的增伤加成 */
  readonly amplification: number
  /** 超级增伤（所有类型均享受，包括钝性和固定） */
  readonly superAmplification: number
  /** 防御者的减伤 */
  readonly reduction: number
  /** 防御者的AC值 */
  readonly armorClass: number
  /** 防御者的护盾值（可防止的伤害量） */
  readonly shield: number
}

export interface DamageResult {
  /** 最终造成的HP减少 */
  readonly finalDamage: number
  /** 实际伤害类型（可能被覆盖） */
  readonly actualType: DamageType
  /** AC吸收了多少 */
  readonly acAbsorbed: number
  /** 护盾吸收了多少 */
  readonly shieldAbsorbed: number
  /** 减伤减免了多少 */
  readonly reduced: number
  /** 增伤增加了多少 */
  readonly amplified: number
  /** 是否被完全防止 */
  readonly prevented: boolean
  /** 是否视为伤害（hp_loss不是） */
  readonly isDamage: boolean
}

/**
 * 计算最终伤害
 */
export function calculateDamage(input: DamageInput): DamageResult {
  const rules = DAMAGE_TYPE_RULES[input.damageType]

  // HP流失特殊处理：无视一切
  if (!rules.isDamage) {
    return {
      finalDamage: input.baseDamage,
      actualType: input.damageType,
      acAbsorbed: 0,
      shieldAbsorbed: 0,
      reduced: 0,
      amplified: 0,
      prevented: false,
      isDamage: false,
    }
  }

  let damage = input.baseDamage

  // 1. 应用增伤
  let amplified = 0
  if (rules.amplifiable) {
    amplified = input.amplification
    damage += amplified
  }
  // 超级增伤对所有伤害类型生效
  amplified += input.superAmplification
  damage += input.superAmplification

  // 2. 应用减伤
  let reduced = 0
  if (rules.reducible && input.reduction > 0) {
    reduced = Math.min(input.reduction, damage)
    damage -= reduced
  }

  // 3. 应用护盾（可防止类型）
  let shieldAbsorbed = 0
  if (rules.preventable && input.shield > 0) {
    shieldAbsorbed = Math.min(input.shield, damage)
    damage -= shieldAbsorbed
  }

  // 4. 应用AC吸收
  let acAbsorbed = 0
  if (rules.acAbsorbable && input.armorClass > 0 && damage > 0) {
    // AC吸收后最少造成1点伤害
    const maxAbsorb = Math.max(0, damage - AC_MINIMUM_DAMAGE)
    acAbsorbed = Math.min(input.armorClass, maxAbsorb)
    damage -= acAbsorbed
  }

  // 5. 最低伤害保底（只要造成了任何伤害）
  if (damage < AC_MINIMUM_DAMAGE && input.baseDamage > 0) {
    damage = AC_MINIMUM_DAMAGE
  }

  // 确保非负
  damage = Math.max(0, damage)

  const prevented = shieldAbsorbed >= input.baseDamage + amplified

  return {
    finalDamage: damage,
    actualType: input.damageType,
    acAbsorbed,
    shieldAbsorbed,
    reduced,
    amplified,
    prevented,
    isDamage: true,
  }
}

/**
 * 解析伤害类型优先级覆盖
 * 当多个效果指定不同伤害类型时，使用最高优先级的
 */
export function resolveOverriddenDamageType(types: DamageType[]): DamageType {
  if (types.length === 0) return 'normal'
  return types.reduce((highest, t) =>
    DAMAGE_TYPE_PRIORITY[t] > DAMAGE_TYPE_PRIORITY[highest] ? t : highest
  )
}

/**
 * 快速计算：基础攻击伤害（击牌攻击）
 */
export function calcStrikeDamage(
  attackerBaseDamage: number,
  attackerAmplification: number,
  attackerSuperAmp: number,
  defenderReduction: number,
  defenderAC: number,
  damageType: DamageType = 'normal',
): DamageResult {
  return calculateDamage({
    baseDamage: attackerBaseDamage,
    damageType,
    amplification: attackerAmplification,
    superAmplification: attackerSuperAmp,
    reduction: defenderReduction,
    armorClass: defenderAC,
    shield: 0,
  })
}
