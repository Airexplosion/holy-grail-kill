/**
 * 职业能力类型定义
 * 从 classes.ts 抽出，供各职业文件引用
 */

export type ClassAbilityType = 'passive' | 'triggered' | 'active' | 'toggle'

export type ClassAbilityTiming =
  | 'always'
  | 'round_start'
  | 'preparation'
  | 'action_start'
  | 'standby'
  | 'combat_round_start'
  | 'combat_round_end'
  | 'on_move'
  | 'on_scout'
  | 'on_kill'
  | 'on_damaged'
  | 'on_hp_threshold'
  | 'on_encounter'
  | 'manual'

export interface ClassAbilityEffectDef {
  readonly effectType: string
  readonly params: Record<string, unknown>
}

export interface ClassAbilityDef {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly grandDescription?: string
  readonly abilityType: ClassAbilityType
  readonly timing: ClassAbilityTiming
  readonly effects: readonly ClassAbilityEffectDef[]
  readonly grandEffects?: readonly ClassAbilityEffectDef[]
  readonly cooldown: number
  readonly perGameLimit: number
  readonly cost?: { readonly mp?: number; readonly hp?: number; readonly cards?: number }
}
