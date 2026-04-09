/**
 * 篡者范型系统 — 12 种范型
 * 每种范型改变技能槽结构和提供独特效果
 */

/** 范型ID */
export type MasterArchetypeId =
  | 'martial_artist'   // 武术家
  | 'mage'             // 法师
  | 'modern'           // 现代人
  | 'aberrant'         // 异化者
  | 'mystic_eye'       // 魔眼使
  | 'construct'        // 人造物
  | 'ley_guardian'     // 地脉守护者
  | 'seal_enforcer'    // 封印执行者
  | 'illegal'          // 非法参战者
  | 'executor'         // 圣堂代行者
  | 'savior'           // 人理救世者
  | 'puppeteer'        // 伽蓝人偶师

/** 技能槽类型 */
export type SkillSlotType = 'martial' | 'magic' | 'item' | 'mystic_eye' | 'obsession' | 'noble_phantasm'

/** 范型定义 */
export interface MasterArchetypeDef {
  readonly id: MasterArchetypeId
  readonly name: string
  readonly description: string
  readonly designPhilosophy: string
  readonly slotModifiers: readonly SlotModifier[]
  readonly specialEffects: readonly string[]
}

/** 技能槽修改 */
export interface SlotModifier {
  readonly slotType: SkillSlotType
  readonly change: number  // +N 或 -N
}

/** 全部范型定义 */
export const MASTER_ARCHETYPES: readonly MasterArchetypeDef[] = [
  {
    id: 'martial_artist', name: '武术家',
    description: '武术槽+1，法术槽-1，伤害基准+1，战术风格使用+1但支付色卡时一次仅一张',
    designPhilosophy: '通过武术效果和战术风格进行猛烈输出的类型，也可以针对攻击进行回避或反制',
    slotModifiers: [{ slotType: 'martial', change: 1 }, { slotType: 'magic', change: -1 }],
    specialEffects: ['damage_bonus_1', 'tactical_style_extra_use', 'tactical_style_single_pay'],
  },
  {
    id: 'mage', name: '法师',
    description: '武术槽-1，法术槽+1，MP上限+1，战术风格变为万色',
    designPhilosophy: '通过法术效果和自身MP为幻身提供支援，也具备MP输出能力',
    slotModifiers: [{ slotType: 'martial', change: -1 }, { slotType: 'magic', change: 1 }],
    specialEffects: ['mp_max_plus_1', 'tactical_style_rainbow'],
  },
  {
    id: 'modern', name: '现代人',
    description: '失去法术槽，道具槽+3，手牌上限+1，每回合相邻移动+1，可无视路径限一次',
    designPhilosophy: '擅长使用多种多样的道具，卡牌和移动是他们的看家本领',
    slotModifiers: [{ slotType: 'magic', change: -99 }, { slotType: 'item', change: 3 }],
    specialEffects: ['hand_size_plus_1', 'adjacent_move_plus_1', 'ignore_path_once'],
  },
  {
    id: 'aberrant', name: '异化者',
    description: '失去武术槽，法术槽+3，执念槽+1，行动点+1',
    designPhilosophy: '为了追寻根源而走入执念的法术师，不要低估其行动力和执念力量',
    slotModifiers: [{ slotType: 'martial', change: -99 }, { slotType: 'magic', change: 3 }, { slotType: 'obsession', change: 1 }],
    specialEffects: ['action_points_plus_1'],
  },
  {
    id: 'mystic_eye', name: '魔眼使',
    description: '失去战术风格，魔眼槽+2，侦查范围+1，2点独立动作',
    designPhilosophy: '积蓄力量以魔眼为爆发能力，擅长侦查的同时也具备战斗能力',
    slotModifiers: [{ slotType: 'mystic_eye', change: 2 }],
    specialEffects: ['lose_tactical_style', 'scout_range_plus_1', 'independent_actions_2'],
  },
  {
    id: 'construct', name: '人造物',
    description: '从随机范型列表中随机四项，选二组合为本局效果',
    designPhilosophy: '人造的作品，简称拼好御',
    slotModifiers: [],
    specialEffects: ['random_archetype_compose'],
  },
  {
    id: 'ley_guardian', name: '地脉守护者',
    description: '失去武术或法术槽，解锁高等级属性，准备阶段+1额外MP，替换+1，地图获取能力+1备选',
    designPhilosophy: '守护地脉的领主，充足魔力资源，可从地图中快速获取能力，代价是自身较弱',
    slotModifiers: [],
    specialEffects: ['lose_one_combat_slot', 'unlock_high_ranks', 'prep_extra_mp', 'replace_count_plus_1', 'map_ability_extra_pick'],
  },
  {
    id: 'seal_enforcer', name: '封印执行者',
    description: '失去道具槽，解锁高等级属性，获得一个宝具级能力',
    designPhilosophy: '多变的类型，取决于自身宝具级能力的倾向',
    slotModifiers: [{ slotType: 'item', change: -99 }],
    specialEffects: ['unlock_high_ranks', 'noble_phantasm_slot'],
  },
  {
    id: 'illegal', name: '非法参战者',
    description: '失去1秘钥，无法恢复秘钥，任一槽位+3，解锁高等级属性',
    designPhilosophy: '失去秘钥化作力量，戴着镣铐逃脱的狂战士，唯有战胜所有对手',
    slotModifiers: [],
    specialEffects: ['lose_1_secret_key', 'cannot_restore_keys', 'any_slot_plus_3', 'unlock_high_ranks'],
  },
  {
    id: 'executor', name: '圣堂代行者',
    description: '击杀后+1秘钥，可用秘钥反制同组一次攻击（每局一次），解锁高等级属性',
    designPhilosophy: '强大的代行者始终如一地强大，不随环境变化，无法更多成长',
    slotModifiers: [],
    specialEffects: ['gain_key_on_kill', 'key_counter_once', 'unlock_high_ranks'],
  },
  {
    id: 'savior', name: '人理救世者',
    description: '每种槽位+1，相邻移动-1，初始地点牌变为【人理的重压】，钥匙落地后移除获得秘钥',
    designPhilosophy: '全面带来另一种压迫，给予发育空间就能独当一面',
    slotModifiers: [{ slotType: 'martial', change: 1 }, { slotType: 'magic', change: 1 }, { slotType: 'item', change: 1 }],
    specialEffects: ['adjacent_move_minus_1', 'humanity_pressure_card', 'key_removes_pressure_gain_key'],
  },
  {
    id: 'puppeteer', name: '伽蓝人偶师',
    description: '据点上限+2，手牌上限+2，初始地点牌变为【伽蓝的丝线】（万色地点牌，建据点时+1额外MP）',
    designPhilosophy: '灵巧的人偶师擅长利用据点战斗，失去据点后略显捉襟见肘',
    slotModifiers: [],
    specialEffects: ['outpost_limit_plus_2', 'hand_size_plus_2', 'silk_thread_card'],
  },
]

/** 范型ID→定义快速查找 */
export const MASTER_ARCHETYPE_MAP = Object.fromEntries(
  MASTER_ARCHETYPES.map(a => [a.id, a])
) as Record<MasterArchetypeId, MasterArchetypeDef>

/** 范型中文名映射 */
export const ARCHETYPE_NAME_LABELS = Object.fromEntries(
  MASTER_ARCHETYPES.map(a => [a.id, a.name])
) as Record<MasterArchetypeId, string>

/** 默认技能槽数量（范型修改前的基础值） */
export const BASE_SKILL_SLOTS: Record<SkillSlotType, number> = {
  martial: 2,
  magic: 2,
  item: 2,
  mystic_eye: 0,
  obsession: 0,
  noble_phantasm: 0,
}
