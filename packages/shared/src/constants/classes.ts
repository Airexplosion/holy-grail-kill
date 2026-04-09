/**
 * 幻身职业系统 — 32 个职业
 * 每个职业有 2 个职业基础技能
 * 冠位(Grand)版本为强化版
 */

/** 职业ID */
export type ServantClassId =
  | 'saber' | 'lancer' | 'archer' | 'rider' | 'caster' | 'assassin' | 'berserker'
  | 'avenger' | 'shielder' | 'foreigner' | 'pretender' | 'gunner'
  | 'launcher' | 'watcher' | 'mooncell' | 'player_faker'
  | 'gate_keeper' | 'lostman' | 'monster' | 'dragon_exile'
  | 'polyhedron' | 'missflower' | 'strayer' | 'broken_role'
  | 'another' | 'chaos' | 'beast' | 'eclipse' | 'alterego' | 'nonclass'

/** 职业定义 */
export interface ServantClassDef {
  readonly id: ServantClassId
  readonly name: string
  readonly nameEn: string
  readonly description: string
  readonly abilities: readonly ClassAbilityDef[]
  /** 是否为标准七骑（用于规则判断） */
  readonly isStandardSeven: boolean
}

/** 职业能力定义 */
export interface ClassAbilityDef {
  readonly id: string
  readonly name: string
  readonly description: string
  /** 冠位版本的能力描述（升级后替换） */
  readonly grandDescription?: string
}

/** 标准七骑职业ID */
export const STANDARD_SEVEN_CLASS_IDS: readonly ServantClassId[] = [
  'saber', 'lancer', 'archer', 'rider', 'caster', 'assassin', 'berserker',
]

/** 全部职业定义 */
export const SERVANT_CLASSES: readonly ServantClassDef[] = [
  {
    id: 'saber', name: '剑士', nameEn: 'Saber', isStandardSeven: true,
    description: '通过武术效果和战术风格进行猛烈输出的类型',
    abilities: [
      { id: 'saber_1', name: '辉煌之剑', description: '[CD1][自由]弃置两张手牌，无效一项正作用于自身所在组任意角色的其他组篡者效果或任一篡者使用的一次战术风格', grandDescription: '[CD1][自由]无效一项正作用于自身所在组任意角色的其他组篡者效果' },
      { id: 'saber_2', name: '七骑之首', description: '[被动]车卡分配属性时，多获得2点用于分配的属性' },
    ],
  },
  {
    id: 'lancer', name: '枪兵', nameEn: 'Lancer', isStandardSeven: true,
    description: '拥有不屈生命力和背水一战能力的持久战型',
    abilities: [
      { id: 'lancer_1', name: '不屈枪势', description: '[被动]备战环节回复4HP，若上回合交战过则获得2点[临时]额外MP或摸两张牌', grandDescription: '[被动]备战环节回复4HP，而后选择获得2点[临时]额外MP或摸两张牌，若上回合交战过可两项皆选' },
      { id: 'lancer_2', name: '背水一战', description: '[被动]每局限一次，HP降至0时调整至8' },
    ],
  },
  {
    id: 'archer', name: '弓箭手', nameEn: 'Archer', isStandardSeven: true,
    description: '侦查距离远，可远程攻击的情报型',
    abilities: [
      { id: 'archer_1', name: '千里眼', description: '[被动]侦查距离+1，行动点+1，行动阶段开始时可执行一次侦查', grandDescription: '[被动]侦查距离+2，行动点+2，附带远距射击和常规七骑少时的额外侦查加成' },
      { id: 'archer_2', name: '远距射击', description: '[被动]侦查到其他组角色时可弃置一张普通牌进行远程攻击' },
    ],
  },
  {
    id: 'rider', name: '骑兵', nameEn: 'Rider', isStandardSeven: true,
    description: '机动性极强，首次移动可触发强制宣战',
    abilities: [
      { id: 'rider_1', name: '冲阵急行', description: '[被动]每回合首次移动结束时，遭遇则视为宣战且对方无条件迎战并跳过其备战环节，未遭遇则回复1行动力', grandDescription: '[被动]首次移动消耗的地点牌后篡者摸一张牌，附带骑乘效果' },
      { id: 'rider_2', name: '骑乘', description: '[自由]篡者可将两张地点牌视为任一地点牌消耗或弃置（不可建据点）' },
    ],
  },
  {
    id: 'caster', name: '魔术师', nameEn: 'Caster', isStandardSeven: true,
    description: '支援型，擅长建立据点和资源管理',
    abilities: [
      { id: 'caster_1', name: '道具作成', description: '[被动]准备阶段结束时摸两张弃一张或令篡者摸一张；据点被破坏时摸一张牌' },
      { id: 'caster_2', name: '阵地作成', description: '车卡时二选一：①落地时建立不占上限的据点，可转移；②篡者可将两张地点牌视为任一地点牌建据点', grandDescription: '车卡时二选一：①据点上限+1，可转移且破坏时摸牌；②不变' },
    ],
  },
  {
    id: 'assassin', name: '暗杀者', nameEn: 'Assassin', isStandardSeven: true,
    description: '隐蔽行动，侦查能力强，可一击必杀',
    abilities: [
      { id: 'assassin_1', name: '气息遮断', description: '[被动]无法被侦查看到，战术撤离/逃离时方向隐匿。每局限一次战斗首轮结束时可整组战术撤离', grandDescription: '[被动]无法被侦查看到（但可反向得知侦查方信息），首轮内任意空闲节点可整组战术撤离' },
      { id: 'assassin_2', name: '敏锐感知', description: '[被动]侦查时获悉目标HP和令咒数。每局限一次，目标HP低或令咒少时可立即执行移动，击杀后恢复使用' },
    ],
  },
  {
    id: 'berserker', name: '狂战士', nameEn: 'Berserker', isStandardSeven: true,
    description: '高风险高回报的暴力输出型',
    abilities: [
      { id: 'berserker_1', name: '狂化', description: '三选一：①指定颜色响应难度+1但造成钝性伤害；②普攻消耗HP替代MP(1:3)；③普攻+1增伤且造成贯穿伤害', grandDescription: '三选一：①不变；②命中时回1HP；③增伤改为2点' },
      { id: 'berserker_2', name: '理智不清', description: '[被动]可在战斗阶段对自身篡者使用普通攻击，篡者随后也可反击' },
    ],
  },
  {
    id: 'avenger', name: '复仇者', nameEn: 'Avenger', isStandardSeven: false,
    description: 'HP上限极高但半血无法回复，击杀回满',
    abilities: [
      { id: 'avenger_1', name: '忘却补正', description: '[被动]HP上限+16，上半无法补充HP，击杀幻身后回满', grandDescription: '[被动]HP上限+32，上半无法补充，击杀回满，升格时立即回复16HP' },
      { id: 'avenger_2', name: '自我回复（魔力）', description: '[被动]备战环节/战斗首轮结束时，HP≤上限一半则回复2MP或获得2点[临时]额外MP' },
    ],
  },
  {
    id: 'shielder', name: '盾兵', nameEn: 'Shielder', isStandardSeven: false,
    description: '保护篡者的坦克型，AC和减伤能力强',
    abilities: [
      { id: 'shielder_1', name: '决意之盾', description: '[被动]1点减伤，同地点篡者受到的伤害和HP流失由你承担一半' },
      { id: 'shielder_2', name: '坚毅之壁', description: '[被动]备战环节获得3点AC，若本方HP≤上限一半则改为6点AC', grandDescription: '[被动]备战环节获得6点AC，低HP时改为9点AC' },
    ],
  },
  {
    id: 'foreigner', name: '降临者', nameEn: 'Foreigner', isStandardSeven: false,
    description: '使用无色牌和钝性伤害转换的独特战斗风格',
    abilities: [
      { id: 'foreigner_1', name: '领域外的生命', description: '[被动]准备阶段结束时加入[临时][抹消]无色普通牌，第十回合后变为三张', grandDescription: '[被动]改为两张，第十回合后变为四张' },
      { id: 'foreigner_2', name: '降临之神性', description: '[自由]消耗1MP或无色手牌，将受到的伤害变为钝性伤害，每回合首次弃牌时摸一张' },
    ],
  },
  {
    id: 'pretender', name: '身披角色者', nameEn: 'Pretender', isStandardSeven: false,
    description: '伪装身份，免疫真名系统',
    abilities: [
      { id: 'pretender_1', name: '变换残灵', description: '[被动]无真名，取消真名系统影响，展示技能时可伪装来源。游戏开始时获得2点额外MP', grandDescription: '[被动]不变，但每回合开始获得2点额外MP' },
      { id: 'pretender_2', name: '虚名伪物', description: '[被动]被侦查/公示时可伪装为另一组；免疫属性等级降低效果' },
    ],
  },
  {
    id: 'gunner', name: '枪手', nameEn: 'Gunner', isStandardSeven: false,
    description: '子弹系统，移动后可自动攻击',
    abilities: [
      { id: 'gunner_1', name: '快速装填', description: '[被动]行动阶段开始装填1枚[临时]通用子弹（击杀后改为2枚），可作为攻击或替代其他子弹', grandDescription: '[被动]改为装填2枚（击杀后3枚）' },
      { id: 'gunner_2', name: '滑步射击', description: '[被动]移动后遭遇时可立即攻击；其他组离开时可进行[自由]攻击' },
    ],
  },
  {
    id: 'launcher', name: '炮兵', nameEn: 'Launcher', isStandardSeven: false,
    description: 'AOE远程炮击和据点摧毁专家',
    abilities: [
      { id: 'launcher_1', name: '炮火阵列', description: '<1MP+1牌+1行动点>对指定地点所有角色攻击，而后本阶段+1增伤' },
      { id: 'launcher_2', name: '毁灭打击', description: '[被动]攻击未命中时摧毁目标地点据点和装置；摧毁后本回合+1增伤' },
    ],
  },
  {
    id: 'watcher', name: '观测者', nameEn: 'Watcher', isStandardSeven: false,
    description: '双形态切换专家',
    abilities: [
      { id: 'watcher_1', name: '强制观测', description: '<2牌>[自由]切换双形态能力，第十回合后消耗变为<1牌>', grandDescription: '<1牌>[自由]切换双形态，首次转换后本阶段+1减伤' },
      { id: 'watcher_2', name: '多重现象', description: '[被动]击杀幻身后永久生效：选一项双形态能力AB分离并同时存在' },
    ],
  },
  {
    id: 'mooncell', name: '月之癌', nameEn: 'Mooncell', isStandardSeven: false,
    description: '情报获取和嘲讽型',
    abilities: [
      { id: 'mooncell_1', name: '未来管理', description: '[被动]战斗阶段每轮开始和结束时获悉当前地点一名角色HP，仅一组时额外展示手牌' },
      { id: 'mooncell_2', name: '月杯之权', description: '[被动]地点内≥2组时，其他组攻击必须包含你且你+6增伤', grandDescription: '[被动]攻击必须包含你，+6增伤且攻击可选目标+1' },
    ],
  },
  {
    id: 'player_faker', name: '玩家/伪者', nameEn: 'Player/Faker', isStandardSeven: false,
    description: '能力替换和地点大奖专家',
    abilities: [
      { id: 'player_faker_1', name: '缺失补全', description: '[被动]游戏开始时进行一次不消耗次数的能力替换（3选1）' },
      { id: 'player_faker_2', name: '构想之阶', description: '[被动]每局限一次，阿克夏之钥落地时获取指定地点大奖复制品并替换', grandDescription: '[被动]不变，升格时额外生效一次' },
    ],
  },
  {
    id: 'gate_keeper', name: '门卫', nameEn: 'Gate Keeper', isStandardSeven: false,
    description: '阿克夏之钥落地后变强，战斗首轮无敌先手',
    abilities: [
      { id: 'gate_keeper_1', name: '门之戍卫', description: '[被动]阿克夏之钥落地后篡者+3增伤+2减伤', grandDescription: '[被动]篡者+4增伤+2减伤（不需要钥匙落地）' },
      { id: 'gate_keeper_2', name: '无限寰宇', description: '[被动]战斗阶段首轮敏捷视为无穷大' },
    ],
  },
  {
    id: 'lostman', name: '失落客', nameEn: 'Lostman', isStandardSeven: false,
    description: '改变地图通行规则，压制同地点敌人职业能力',
    abilities: [
      { id: 'lostman_1', name: '失落行迹', description: '[被动]所有单向/不通路径对本组视为双向；若全为双向则可选2条变为不通' },
      { id: 'lostman_2', name: '崩坏境界', description: '[被动]同地点其他组幻身第二项非冠位职业能力失效（特殊职业有例外）', grandDescription: '[被动]同地点每项非冠位职业能力失效（Nonclass/Grand Nonclass有例外）' },
    ],
  },
  {
    id: 'monster', name: '怪物', nameEn: 'Monster', isStandardSeven: false,
    description: '虚色卡牌系统，暴走模式+贯穿伤害',
    abilities: [
      { id: 'monster_1', name: '怪异之心', description: '[被动]游戏开始时每种颜色各一半卡牌变为虚色卡牌' },
      { id: 'monster_2', name: '空无暴走', description: '[被动][CD2]备战环节，本回合有色攻击+2增伤，虚色卡牌额外+1增伤且贯穿', grandDescription: '[被动][CD2]备战环节+2增伤，虚色额外+3增伤且贯穿' },
    ],
  },
  {
    id: 'dragon_exile', name: '龙之流亡者', nameEn: 'Dragon Exile', isStandardSeven: false,
    description: '充能上限翻倍，威压使敌方弃牌',
    abilities: [
      { id: 'dragon_exile_1', name: '龙心脉动', description: '[被动]充能类能力上限翻倍', grandDescription: '[被动]充能上限翻两倍，[可超支]的视为已超支一次' },
      { id: 'dragon_exile_2', name: '威压姿态', description: '[充能2/3][自由]当前地点其他篡者各弃一张，你的篡者可弃一张后你摸一张。备战环节获得3点充能' },
    ],
  },
  {
    id: 'polyhedron', name: '多面体', nameEn: 'Polyhedron', isStandardSeven: false,
    description: '万色卡牌和牌堆回收',
    abilities: [
      { id: 'polyhedron_1', name: '多面能手', description: '[卡牌2][万色]消耗时可额外视为一张指定颜色牌', grandDescription: '[卡牌4][万色]每2张占1手牌上限，消耗时额外视为一张指定颜色牌' },
      { id: 'polyhedron_2', name: '能工巧匠', description: '[被动]具有≥2色的牌被弃置/消耗后可洗回牌堆，然后摸一张并展示' },
    ],
  },
  {
    id: 'missflower', name: '幼丽花', nameEn: 'Missflower', isStandardSeven: false,
    description: '随时间成长的持久型，自带减伤',
    abilities: [
      { id: 'missflower_1', name: '繁生之花', description: '[被动]第1/9/14回合结束时选一项+1：MP上限、伤害基准、行动点、动作/据点、手牌上限' },
      { id: 'missflower_2', name: '初萌之芽', description: '[被动]受到>2点伤害时视为2点减伤，首名/第二名幻身离场后各-1', grandDescription: '[被动]2点减伤' },
    ],
  },
  {
    id: 'strayer', name: '迷踪者', nameEn: 'Strayer', isStandardSeven: false,
    description: '行动点回收+战斗首轮最后行动但增伤叠加',
    abilities: [
      { id: 'strayer_1', name: 'Data Lost', description: '[被动]首次消耗>1行动点后回复2行动点；宣战/迎战时每有1未执行行动点则战斗阶段+1伤害基准' },
      { id: 'strayer_2', name: '默行迷途', description: '[被动]战斗首轮敏捷视为无穷小；动作+1，首轮额外+1', grandDescription: '[被动]首轮敏捷无穷小；动作+2，首轮额外+2' },
    ],
  },
  {
    id: 'broken_role', name: '影角色', nameEn: 'BrokenRole', isStandardSeven: false,
    description: '黑色卡牌和负向极化自我增伤',
    abilities: [
      { id: 'broken_role_1', name: '构造崩坏', description: '[被动]游戏开始时加入3张黑色普通牌，手牌上限-2但黑色牌不占上限', grandDescription: '[被动]加入3张黑色牌+升格时1张入手，黑色牌不占上限' },
      { id: 'broken_role_2', name: '负向极化', description: '[CD3]<3HP>战斗阶段开始时+3伤害基准-3手牌上限至阶段结束，击杀后回复6HP' },
    ],
  },
  {
    id: 'another', name: '异常者', nameEn: 'Another', isStandardSeven: false,
    description: '层数状态抗性和伤害免疫系统',
    abilities: [
      { id: 'another_1', name: '异常存在', description: '[被动]备战环节获得1层[临时][层数状态抗性]，击杀后改为2层', grandDescription: '[被动]备战环节2层，击杀后3层' },
      { id: 'another_2', name: '灵格压制', description: '[被动]每战斗阶段第二次受伤后获得2层[临时][伤害免疫]' },
    ],
  },
  {
    id: 'chaos', name: '混沌', nameEn: 'Chaos', isStandardSeven: false,
    description: '战斗轮开始免费攻击+三色齐全后超级增伤',
    abilities: [
      { id: 'chaos_1', name: '对秩序', description: '[被动]战斗每轮开始时免费普攻一次，首次使用某颜色牌时摸一张' },
      { id: 'chaos_2', name: '混沌量化', description: '[被动]同回合内红蓝绿各攻击至少一次后+2超级增伤', grandDescription: '[被动]改为+4超级增伤' },
    ],
  },
  {
    id: 'beast', name: '兽', nameEn: 'Beast', isStandardSeven: false,
    description: '残灵吸收加速+击杀时双倍奖励',
    abilities: [
      { id: 'beast_1', name: '兽之权能', description: '[被动]吸取残灵行动点-1，属性分配无视不同属性限制', grandDescription: '[被动]行动点-2，自由分配+额外1级，特定条件下全场-2全属性' },
      { id: 'beast_2', name: '单独显现', description: '[被动]击杀后额外选一项击杀奖励（可与篡者选同或不同）；篡者死亡后如常行动' },
    ],
  },
  {
    id: 'eclipse', name: '消色者', nameEn: 'Eclipse', isStandardSeven: false,
    description: '强制展示手牌变无色+无色攻击特殊规则',
    abilities: [
      { id: 'eclipse_1', name: '色彩消弭', description: '[被动]备战环节当前地点所有角色随机展示X张手牌变无色（X=连续战斗次数）', grandDescription: '[被动]改为展示2X张' },
      { id: 'eclipse_2', name: '无色奇点', description: '[被动]你的无色攻击(响应难度1)不能被无色响应；受无色攻击时响应难度-1' },
    ],
  },
  {
    id: 'alterego', name: '他人格', nameEn: 'Alterego', isStandardSeven: false,
    description: '随机获得两个其他职业的能力',
    abilities: [
      { id: 'alterego_1', name: '复合残灵', description: '[被动]随机两个不同职业各随机一项能力获得之', grandDescription: '[被动]不变+升格时额外投掷第三四个职业定向选一项' },
      { id: 'alterego_2', name: '"最后的救赎"', description: '[被动]仅一次机会，公屏重新执行复合残灵（公开信息但获得第二次机会），执行时立即死亡' },
    ],
  },
  {
    id: 'nonclass', name: '无职业', nameEn: 'Nonclass', isStandardSeven: false,
    description: '放弃职业能力换取超级增伤',
    abilities: [
      { id: 'nonclass_1', name: '超级增伤', description: '你具有3点超级增伤（所有伤害类型均享受）', grandDescription: '你具有5点超级增伤' },
    ],
  },
]

/** 职业ID→定义的快速查找 */
export const SERVANT_CLASS_MAP = Object.fromEntries(
  SERVANT_CLASSES.map(c => [c.id, c])
) as Record<ServantClassId, ServantClassDef>

/** 职业中文名映射 */
export const CLASS_NAME_LABELS = Object.fromEntries(
  SERVANT_CLASSES.map(c => [c.id, c.name])
) as Record<ServantClassId, string>
