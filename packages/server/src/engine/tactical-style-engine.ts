/**
 * 篡者战术风格引擎
 *
 * 每回合可使用的次数（默认1，武术家+1）
 * 3种用途：
 * 1. 视为对目标使用与风格同色的击（免费攻击）
 * 2. 视为直接响应成功被克制的攻击（免费响应）
 * 3. 视为支付至多两张同色色卡消耗（武术家一次仅一张）
 *
 * 范型变体：
 * - 武术家(martial_artist)：使用次数+1，但支付色卡一次仅一张
 * - 法师(mage)：战术风格变为万色（可声明为任意三色之一）
 * - 魔眼使(mystic_eye)：失去战术风格
 */

import type { StrikeColor, MasterArchetypeId } from 'shared'

export type TacticalStyleUse = 'attack' | 'respond' | 'pay_cards'

export interface TacticalStyleState {
  readonly color: StrikeColor | 'rainbow' | null
  readonly maxUses: number
  usesRemaining: number
  /** 武术家：支付时一次仅一张 */
  readonly singleCardPayOnly: boolean
  /** 是否完全失去（魔眼使） */
  readonly disabled: boolean
}

/**
 * 初始化战术风格状态（每回合开始时调用）
 */
export function initTacticalStyle(
  baseColor: StrikeColor | null,
  archetypeId: MasterArchetypeId | null,
): TacticalStyleState {
  // 魔眼使失去战术风格
  if (archetypeId === 'mystic_eye') {
    return { color: null, maxUses: 0, usesRemaining: 0, singleCardPayOnly: false, disabled: true }
  }

  let color: StrikeColor | 'rainbow' | null = baseColor
  let maxUses = 1
  let singleCardPayOnly = false

  if (archetypeId === 'martial_artist') {
    maxUses = 2
    singleCardPayOnly = true
  }

  if (archetypeId === 'mage') {
    color = 'rainbow'
  }

  return { color, maxUses, usesRemaining: maxUses, singleCardPayOnly, disabled: false }
}

/**
 * 尝试使用战术风格
 */
export function useTacticalStyle(
  state: TacticalStyleState,
  useType: TacticalStyleUse,
  declaredColor?: StrikeColor,
): { success: boolean; effectiveColor: StrikeColor | null; error?: string } {
  if (state.disabled) return { success: false, effectiveColor: null, error: '没有战术风格' }
  if (state.usesRemaining <= 0) return { success: false, effectiveColor: null, error: '本回合战术风格已用完' }
  if (!state.color) return { success: false, effectiveColor: null, error: '没有战术风格' }

  // 确定实际颜色
  let effectiveColor: StrikeColor
  if (state.color === 'rainbow') {
    if (!declaredColor) return { success: false, effectiveColor: null, error: '万色风格需声明颜色' }
    effectiveColor = declaredColor
  } else {
    effectiveColor = state.color
  }

  state.usesRemaining -= 1

  return { success: true, effectiveColor }
}

/**
 * 重置战术风格（每回合开始）
 */
export function resetTacticalStyle(state: TacticalStyleState): void {
  if (!state.disabled) {
    state.usesRemaining = state.maxUses
  }
}
