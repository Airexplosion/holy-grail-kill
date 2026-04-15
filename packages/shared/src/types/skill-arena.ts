/**
 * 技能沙盒/战场测试类型
 */

/** 木头人行为模式 */
export type DummyBehavior = 'aggressive' | 'defensive' | 'random' | 'passive'

/** 沙盒角色状态（完全可观测） */
export interface ArenaCharacterState {
  readonly name: string
  readonly hp: number
  readonly hpMax: number
  readonly mp: number
  readonly mpMax: number
  readonly ac: number
  readonly baseDamage: number
  readonly amplification: number
  readonly superAmplification: number
  readonly reduction: number
  readonly shield: number
  readonly actions: number
  readonly actionsMax: number
  readonly actionsRemaining: number
}

/** 完全可观测的牌区 */
export interface ArenaCardZones {
  readonly hand: readonly ArenaCard[]
  readonly deck: readonly ArenaCard[]
  readonly discard: readonly ArenaCard[]
  /** 下一次抽牌会抽到的牌 */
  readonly nextDraw: ArenaCard | null
}

/** 带来源追踪的卡牌 */
export interface ArenaCard {
  readonly id: string
  readonly name: string
  readonly color: string
  /** 来源：initial=初始牌库, skill=技能生成, class_ability=职业能力, temp=临时牌 */
  readonly source: 'initial' | 'skill' | 'class_ability' | 'temp' | 'recovered'
  readonly sourceSkillName?: string
}

/** 伤害拆解 */
export interface DamageBreakdown {
  readonly baseDamage: number
  readonly amplification: number
  readonly superAmplification: number
  readonly reduction: number
  readonly shieldAbsorbed: number
  readonly acAbsorbed: number
  readonly finalDamage: number
  readonly damageType: string
  readonly formula: string
}

/** 效果执行步骤追踪 */
export interface EffectStepTrace {
  readonly stepIndex: number
  readonly effectType: string
  readonly params: Record<string, unknown>
  readonly result: { success: boolean; value?: number; description: string }
  readonly stateBefore: { hp: number; mp: number; shield: number; ac: number }
  readonly stateAfter: { hp: number; mp: number; shield: number; ac: number }
}

/** 战斗日志条目 */
export interface ArenaLogEntry {
  readonly id: string
  readonly timestamp: number
  readonly round: number
  readonly actor: 'player' | 'dummy'
  readonly type: 'strike' | 'skill' | 'respond' | 'pass' | 'damage' | 'effect' | 'phase' | 'card' | 'ai'
  readonly message: string
  readonly details?: DamageBreakdown | EffectStepTrace[]
}

/** 沙盒会话快照（每次action后返回） */
export interface ArenaSnapshot {
  readonly sessionId: string
  readonly round: number
  readonly phase: 'player_turn' | 'dummy_turn' | 'resolve' | 'round_end' | 'ended'
  readonly player: ArenaCharacterState
  readonly dummy: ArenaCharacterState
  readonly playerCards: ArenaCardZones
  readonly dummyCards: ArenaCardZones
  readonly playerSkills: readonly ArenaSkillState[]
  readonly logs: readonly ArenaLogEntry[]
  /** 本次action产生的效果步骤追踪 */
  readonly lastTrace?: readonly EffectStepTrace[]
  /** 本次action的伤害拆解 */
  readonly lastDamageBreakdown?: DamageBreakdown
}

/** 技能运行时状态 */
export interface ArenaSkillState {
  readonly id: string
  readonly name: string
  readonly type: string
  readonly cooldown: number
  readonly cooldownRemaining: number
  readonly usable: boolean
  readonly description: string
  readonly effects: readonly { effectType: string; params: Record<string, unknown> }[]
}

/** 创建会话配置 */
export interface ArenaSessionConfig {
  readonly dummyName?: string
  readonly dummyHp?: number
  readonly dummyMp?: number
  readonly dummyAc?: number
  readonly dummyDamage?: number
  readonly dummyBehavior?: DummyBehavior
  /** 玩家初始HP */
  readonly playerHp?: number
  readonly playerMp?: number
  readonly playerAc?: number
  readonly playerDamage?: number
  /** 玩家击牌分配 */
  readonly strikeCards?: { red: number; blue: number; green: number }
  /** 预装技能ID列表 */
  readonly skillIds?: readonly string[]
}
