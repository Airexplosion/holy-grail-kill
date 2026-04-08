export interface SkillTemplate {
  readonly id: string
  readonly roomId: string
  readonly name: string
  readonly type: SkillType
  readonly defaultCooldown: number
  readonly defaultCharges: number | null
  readonly description: string
  readonly metadata: SkillMetadata
}

export interface PlayerSkill {
  readonly id: string
  readonly playerId: string
  readonly skillId: string
  readonly name: string
  readonly type: SkillType
  readonly cooldown: number
  readonly cooldownRemaining: number
  readonly charges: number | null
  readonly enabled: boolean
  readonly metadata: SkillMetadata
}

export type SkillType = 'active' | 'passive' | 'triggered'

export type SkillTriggerTiming =
  | 'round_start'
  | 'preparation'
  | 'action_before'
  | 'action_after'
  | 'standby'
  | 'combat_before'
  | 'combat_after'
  | 'round_end'
  | 'on_damage'
  | 'on_heal'
  | 'on_move'
  | 'on_scout'
  | 'manual'

export interface SkillMetadata {
  readonly [key: string]: unknown
  readonly triggerTiming?: SkillTriggerTiming
  readonly targetType?: 'self' | 'single' | 'area' | 'global'
  readonly range?: number
  readonly cost?: { hp?: number; mp?: number; ap?: number }
  readonly effects?: readonly SkillEffectDef[]
}

export interface SkillEffectDef {
  readonly effectType: string
  readonly params: Record<string, unknown>
}

export interface SkillUseResult {
  readonly success: boolean
  readonly skillId: string
  readonly effects?: readonly SkillEffectResult[]
  readonly error?: string
}

export interface SkillEffectResult {
  readonly effectType: string
  readonly targetId: string
  readonly result: Record<string, unknown>
}

export const SKILL_TYPE_LABELS: Record<SkillType, string> = {
  active: '主动',
  passive: '被动',
  triggered: '触发',
}
