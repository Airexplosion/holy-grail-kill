/**
 * 幻身职业系统 — 30 个职业
 *
 * 职业元数据定义在此文件。
 * 职业能力（结构化效果链）定义在 class-abilities/ 目录下，每个职业一个文件。
 * 查询能力: import { getClassAbilities } from './class-abilities/index.js'
 */

// 类型从 class-abilities/_types.ts 重新导出
export type { ClassAbilityDef, ClassAbilityType, ClassAbilityTiming, ClassAbilityEffectDef } from './class-abilities/_types.js'

/** 职业ID */
export type ServantClassId =
  | 'saber' | 'lancer' | 'archer' | 'rider' | 'caster' | 'assassin' | 'berserker'
  | 'avenger' | 'shielder' | 'foreigner' | 'pretender' | 'gunner'
  | 'launcher' | 'watcher' | 'mooncell' | 'player_faker'
  | 'gate_keeper' | 'lostman' | 'monster' | 'dragon_exile'
  | 'polyhedron' | 'missflower' | 'strayer' | 'broken_role'
  | 'another' | 'chaos' | 'beast' | 'eclipse' | 'alterego' | 'nonclass'

/** 职业元数据（不含能力数据，能力通过 getClassAbilities 查询） */
export interface ServantClassMeta {
  readonly id: ServantClassId
  readonly name: string
  readonly nameEn: string
  readonly description: string
  readonly isStandardSeven: boolean
}

/** 标准七骑职业ID */
export const STANDARD_SEVEN_CLASS_IDS: readonly ServantClassId[] = [
  'saber', 'lancer', 'archer', 'rider', 'caster', 'assassin', 'berserker',
]

/** 全部职业元数据 */
export const SERVANT_CLASSES: readonly ServantClassMeta[] = [
  { id: 'saber', name: '剑士', nameEn: 'Saber', isStandardSeven: true, description: '通过武术效果和战术风格进行猛烈输出的类型' },
  { id: 'lancer', name: '枪兵', nameEn: 'Lancer', isStandardSeven: true, description: '拥有不屈生命力和背水一战能力的持久战型' },
  { id: 'archer', name: '弓箭手', nameEn: 'Archer', isStandardSeven: true, description: '侦查距离远，可远程攻击的情报型' },
  { id: 'rider', name: '骑兵', nameEn: 'Rider', isStandardSeven: true, description: '机动性极强，首次移动可触发强制宣战' },
  { id: 'caster', name: '魔术师', nameEn: 'Caster', isStandardSeven: true, description: '支援型，擅长建立据点和资源管理' },
  { id: 'assassin', name: '暗杀者', nameEn: 'Assassin', isStandardSeven: true, description: '隐蔽行动，侦查能力强，可一击必杀' },
  { id: 'berserker', name: '狂战士', nameEn: 'Berserker', isStandardSeven: true, description: '高风险高回报的暴力输出型' },
  { id: 'avenger', name: '复仇者', nameEn: 'Avenger', isStandardSeven: false, description: 'HP上限极高但半血无法回复，击杀回满' },
  { id: 'shielder', name: '盾兵', nameEn: 'Shielder', isStandardSeven: false, description: '保护篡者的坦克型，AC和减伤能力强' },
  { id: 'foreigner', name: '降临者', nameEn: 'Foreigner', isStandardSeven: false, description: '使用无色牌和钝性伤害转换的独特战斗风格' },
  { id: 'pretender', name: '身披角色者', nameEn: 'Pretender', isStandardSeven: false, description: '伪装身份，免疫真名系统' },
  { id: 'gunner', name: '枪手', nameEn: 'Gunner', isStandardSeven: false, description: '子弹系统，移动后可自动攻击' },
  { id: 'launcher', name: '炮兵', nameEn: 'Launcher', isStandardSeven: false, description: 'AOE远程炮击和据点摧毁专家' },
  { id: 'watcher', name: '观测者', nameEn: 'Watcher', isStandardSeven: false, description: '双形态切换专家' },
  { id: 'mooncell', name: '月之癌', nameEn: 'Mooncell', isStandardSeven: false, description: '情报获取和嘲讽型' },
  { id: 'player_faker', name: '玩家/伪者', nameEn: 'Player/Faker', isStandardSeven: false, description: '能力替换和地点大奖专家' },
  { id: 'gate_keeper', name: '门卫', nameEn: 'Gate Keeper', isStandardSeven: false, description: '阿克夏之钥落地后变强，战斗首轮无敌先手' },
  { id: 'lostman', name: '失落客', nameEn: 'Lostman', isStandardSeven: false, description: '改变地图通行规则，压制同地点敌人职业能力' },
  { id: 'monster', name: '怪物', nameEn: 'Monster', isStandardSeven: false, description: '虚色卡牌系统，暴走模式+贯穿伤害' },
  { id: 'dragon_exile', name: '龙之流亡者', nameEn: 'Dragon Exile', isStandardSeven: false, description: '充能上限翻倍，威压使敌方弃牌' },
  { id: 'polyhedron', name: '多面体', nameEn: 'Polyhedron', isStandardSeven: false, description: '万色卡牌和牌堆回收' },
  { id: 'missflower', name: '幼丽花', nameEn: 'Missflower', isStandardSeven: false, description: '随时间成长的持久型，自带减伤' },
  { id: 'strayer', name: '迷踪者', nameEn: 'Strayer', isStandardSeven: false, description: '行动点回收+战斗首轮最后行动但增伤叠加' },
  { id: 'broken_role', name: '影角色', nameEn: 'BrokenRole', isStandardSeven: false, description: '黑色卡牌和负向极化自我增伤' },
  { id: 'another', name: '异常者', nameEn: 'Another', isStandardSeven: false, description: '层数状态抗性和伤害免疫系统' },
  { id: 'chaos', name: '混沌', nameEn: 'Chaos', isStandardSeven: false, description: '战斗轮开始免费攻击+三色齐全后超级增伤' },
  { id: 'beast', name: '兽', nameEn: 'Beast', isStandardSeven: false, description: '残灵吸收加速+击杀时双倍奖励' },
  { id: 'eclipse', name: '消色者', nameEn: 'Eclipse', isStandardSeven: false, description: '强制展示手牌变无色+无色攻击特殊规则' },
  { id: 'alterego', name: '他人格', nameEn: 'Alterego', isStandardSeven: false, description: '随机获得两个其他职业的能力' },
  { id: 'nonclass', name: '无职业', nameEn: 'Nonclass', isStandardSeven: false, description: '放弃职业能力换取超级增伤' },
]

/** 职业ID→元数据快速查找 */
export const SERVANT_CLASS_MAP = Object.fromEntries(
  SERVANT_CLASSES.map(c => [c.id, c])
) as Record<ServantClassId, ServantClassMeta>

/** 职业中文名映射 */
export const CLASS_NAME_LABELS = Object.fromEntries(
  SERVANT_CLASSES.map(c => [c.id, c.name])
) as Record<ServantClassId, string>
