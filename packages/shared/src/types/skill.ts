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
  | 'on_strike'
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

/** 技能等级：A级(4选) / B级(2选) */
export type SkillClass = 'A' | 'B'

/** 技能稀有度（用于轮抓阶段分级） */
export type SkillRarity = 'normal' | 'rare'

export const SKILL_CLASS_LABELS: Record<SkillClass, string> = { A: 'A级', B: 'B级' }
export const SKILL_RARITY_LABELS: Record<SkillRarity, string> = { normal: '普通', rare: '稀有' }

/** 组卡约束 */
export const SKILL_SLOTS = { A: 4, B: 2 } as const

/** 技能库条目（预定义的技能模板，不依赖房间） */
export interface SkillLibraryEntry {
  readonly id: string
  readonly name: string
  readonly skillClass: SkillClass
  readonly rarity: SkillRarity
  readonly type: SkillType
  readonly triggerTiming: SkillTriggerTiming
  readonly description: string
  readonly flavorText?: string
  readonly cost?: { readonly hp?: number; readonly mp?: number }
  readonly cooldown: number
  readonly charges?: number
  readonly targetType: 'self' | 'single' | 'area' | 'global'
  readonly effects: readonly SkillEffectDef[]
  readonly tags?: readonly string[]
  /**
   * 卡牌型技能：组卡时往牌库加入的卡牌数量
   * 为 undefined 或 0 时表示非卡牌型技能（纯被动/主动施放）
   */
  readonly cardCount?: number
  /**
   * 卡牌型技能：加入的卡牌颜色
   * 仅 cardCount > 0 时有意义
   */
  readonly cardColor?: import('./strike-card.js').CardColor
}
