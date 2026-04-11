/**
 * 地图池系统 (Skill Pool / Map Pool)
 *
 * 流程:
 * 1. 轮抓结束 → 每人保7弃3 → 弃牌 + 池中未选技能 → 全部入地图池
 * 2. 地图池快照：入池时拍照，全员可见，后续被抽走不更新展示
 * 3. 每场战斗结束后 → 触发抽取（随机抽2个技能）
 * 4. 玩家选择替换自己的某个技能 或 放弃
 * 5. 替换次数限制：每幻身基础2次，击杀1个幻身+1次
 */

import type { SkillClass } from './skill.js'

/** 地图池中的技能条目 */
export interface PoolSkillEntry {
  readonly id: string
  /** 技能ID（对应 SkillLibraryEntry.id 或 admin_skill_library.id） */
  readonly skillId: string
  readonly name: string
  readonly skillClass: SkillClass
  readonly description: string
  readonly sourceName: string
  /** 是否已被抽走（实际状态，快照中不体现） */
  readonly drawn: boolean
  /** 被谁抽走（null=未被抽） */
  readonly drawnByPlayerId: string | null
  readonly enteredAt: number
}

/** 地图池快照（全员可见的版本，入池时冻结） */
export interface PoolSnapshot {
  readonly roomId: string
  readonly skills: readonly PoolSnapshotEntry[]
  readonly createdAt: number
}

/** 快照中的单个技能（不含 drawn 状态，永远显示为"在池中"） */
export interface PoolSnapshotEntry {
  readonly skillId: string
  readonly name: string
  readonly skillClass: SkillClass
  readonly description: string
  readonly sourceName: string
}

/** 战后抽取结果（给玩家展示的2张技能） */
export interface PoolDrawResult {
  readonly playerId: string
  /** 抽到的2个技能 */
  readonly drawnSkills: readonly PoolSkillEntry[]
  /** 当前剩余替换次数 */
  readonly replacementsRemaining: number
}

/** 技能替换请求 */
export interface SkillReplaceRequest {
  /** 要装备的新技能（从抽到的2个中选1个） */
  readonly newSkillId: string
  /** 要替换掉的旧技能ID（自己当前装备的） */
  readonly oldSkillId: string
}

/** 技能替换结果 */
export interface SkillReplaceResult {
  readonly success: boolean
  readonly playerId: string
  readonly newSkillId: string
  readonly oldSkillId: string
  readonly replacementsRemaining: number
  readonly error?: string
}

/** 玩家替换次数追踪 */
export interface PlayerReplaceTracker {
  readonly playerId: string
  /** 基础次数（固定2） */
  readonly baseCount: number
  /** 击杀奖励次数 */
  readonly killBonusCount: number
  /** 已使用次数 */
  readonly usedCount: number
  /** 剩余 = base + killBonus - used */
  readonly remaining: number
}

/** 默认基础替换次数 */
export const BASE_REPLACEMENT_COUNT = 2

/** 每次战后抽取数量 */
export const POOL_DRAW_COUNT = 2
