/**
 * 地点大奖系统
 *
 * 每个地点设置数项对应的地点大奖。
 * 仅在对应地点击杀幻身后，击杀者此次战斗后选择替换时，
 * 额外将战斗地点大奖作为替换的可选项。
 * 大奖不补充，获奖全屏公示（不展示获得者）。
 */

/** 地点大奖定义 */
export interface LocationPrize {
  readonly id: string
  readonly roomId: string
  readonly regionId: string
  /** 奖励技能/宝具的ID（引用 adminSkillLibrary） */
  readonly skillId: string
  readonly name: string
  readonly description: string
  /** 是否已被获取 */
  readonly claimed: boolean
  readonly claimedByGroupId: string | null
  readonly claimedAt: number | null
}
