import type { CharacterRole } from './group.js'
import type { AttributeRank } from './attributes.js'

export interface Player {
  readonly id: string
  readonly roomId: string
  readonly accountName: string
  readonly displayName: string
  readonly isGm: boolean
  readonly isBot: boolean
  readonly hp: number
  readonly hpMax: number
  readonly mp: number
  readonly mpMax: number
  /** 额外MP（准备阶段MP满时获得，上限=MP上限） */
  readonly extraMp: number
  readonly extraMpMax: number
  readonly actionPoints: number
  readonly actionPointsMax: number
  readonly regionId: string | null
  readonly boundToPlayerId: string | null
  readonly status: PlayerStatus
  readonly cardMenuUnlocked: boolean
  readonly color: string
  readonly createdAt: number
  readonly updatedAt: number

  // ── 新增：双角色系统 ──
  /** 角色类型：master(篡者) / servant(幻身)，null表示旧模式或观战 */
  readonly role: CharacterRole | null
  /** 所属组ID */
  readonly groupId: string | null

  // ── 幻身 (Servant) 专属属性 ──
  /** 五维属性等级 */
  readonly str: AttributeRank | null
  readonly end: AttributeRank | null
  readonly agi: AttributeRank | null
  readonly mag: AttributeRank | null
  readonly luk: AttributeRank | null
  /** 职业ID */
  readonly classId: string | null

  // ── 篡者 (Master) 专属属性 ──
  /** 四维属性中的行动力 */
  readonly actionPower: AttributeRank | null
  /** 范型ID */
  readonly archetypeId: string | null
  /** 战术风格颜色（红/蓝/绿） */
  readonly tacticalStyle: 'red' | 'blue' | 'green' | null
  /** 本回合战术风格是否已使用 */
  readonly tacticalStyleUsed: boolean

  // ── 通用战斗属性 ──
  /** AC（伤害吸收值） */
  readonly armorClass: number
  /** 基础伤害（由筋力等级派生） */
  readonly baseDamage: number
  /** 动作数（幻身由敏捷派生，篡者默认0） */
  readonly actions: number
  readonly actionsMax: number
  /** 手牌上限 */
  readonly handSizeMax: number
}

export type PlayerStatus = 'connected' | 'disconnected' | 'spectating'

export interface PlayerPublicInfo {
  readonly id: string
  readonly displayName: string
  readonly color: string
  readonly status: PlayerStatus
  readonly isBot: boolean
  readonly role: CharacterRole | null
  readonly groupId: string | null
  readonly classId: string | null
  readonly archetypeId: string | null
}

export interface PlayerSelfView {
  readonly id: string
  readonly displayName: string
  readonly hp: number
  readonly hpMax: number
  readonly mp: number
  readonly mpMax: number
  readonly extraMp: number
  readonly extraMpMax: number
  readonly actionPoints: number
  readonly actionPointsMax: number
  readonly regionId: string | null
  readonly boundToPlayerId: string | null
  readonly cardMenuUnlocked: boolean
  readonly color: string
  readonly role: CharacterRole | null
  readonly groupId: string | null
  readonly armorClass: number
  readonly baseDamage: number
  readonly actions: number
  readonly actionsMax: number
  readonly handSizeMax: number
  readonly tacticalStyle: 'red' | 'blue' | 'green' | null
  readonly tacticalStyleUsed: boolean
}

export interface PlayerGmView extends Player {
  readonly handCount: number
  readonly deckCount: number
  readonly discardCount: number
}
