# 技能编写指南

本文档说明如何在圣杯杀系统中添加新技能。整个流程分为两步：定义技能数据 + 注册效果处理器。

---

## 1. 技能数据定义

在 `packages/shared/src/constants/skill-library.ts` 的 `SKILL_LIBRARY` 数组中添加条目。

### 字段说明

```typescript
interface SkillLibraryEntry {
  id: string             // 唯一ID，如 'nyaruko_physics_sword'
  name: string           // 显示名称，如 '物理学圣剑'
  skillClass: 'A' | 'B'  // A级(选4个) / B级(选2个)
  rarity: 'normal' | 'rare'  // 普通 / 稀有（高稀有度用 'rare'）
  type: 'active' | 'passive' | 'triggered'
  triggerTiming: SkillTriggerTiming  // 触发时机（见下方列表）
  description: string    // 技能描述文本
  flavorText?: string    // 风味文本（角色名等）
  cost?: { hp?: number; mp?: number }  // 使用消耗
  cooldown: number       // 冷却回合数（0=无冷却）
  charges?: number       // 可用次数（不填=无限）
  targetType: 'self' | 'single' | 'area' | 'global'
  effects: SkillEffectDef[]  // 效果链（按顺序执行）
  tags?: string[]        // 标签，用于分类和筛选
  cardCount?: number     // 卡牌型技能：往牌库加入的卡牌数量（不填=非卡牌型）
  cardColor?: CardColor  // 卡牌型技能：卡牌颜色（仅 cardCount > 0 时有意义）
}
```

### 技能的两种形态

**卡牌型技能** (`cardCount > 0`)：
- 组卡时将 `cardCount` 张特殊击牌混入玩家牌库
- 卡牌颜色由 `cardColor` 决定（如 `'colorless'` = 无色）
- `triggerTiming` 通常为 `'on_strike'`（作为击牌打出时触发）
- 这张牌的攻击效果 = 普通击牌攻击 + `effects[]` 中的附加效果
- 描述中标注为 `[卡牌N][颜色]`

**非卡牌型技能** (`cardCount` 省略或为 0)：
- 被动技能：自动在对应阶段触发
- 主动技能：玩家手动施放（消耗MP等）
- 不会生成实体卡牌

### 触发时机 (triggerTiming)

| 值 | 说明 | 典型用途 |
|---|---|---|
| `'manual'` | 手动触发（主动技能） | 消耗MP的攻击/辅助 |
| `'on_damage'` | 受到伤害时 | 护盾、减伤 |
| `'on_heal'` | 被治疗时 | 治疗增幅 |
| `'on_move'` | 移动时 | 移动后触发效果 |
| `'on_scout'` | 被侦查时 | 反侦查 |
| `'on_strike'` | 作为击牌打出时 | 卡牌型技能（`cardCount > 0`） |
| `'round_start'` | 回合开始 | 被动增益 |
| `'preparation'` | 准备阶段 | 阶段性增益 |
| `'action_before'` | 行动阶段开始前 | 行动点加成 |
| `'action_after'` | 行动阶段结束后 | 行动后结算 |
| `'standby'` | 备战阶段 | 组卡阶段效果 |
| `'combat_before'` | 战斗开始前 | 战斗准备 |
| `'combat_after'` | 战斗结束后 | 战后结算 |
| `'round_end'` | 回合结束 | 回合结束效果 |

---

## 2. 效果系统

### 2.1 已注册的效果类型

技能通过 `effects[]` 数组定义效果链，每个效果是 `{ effectType, params }` 对象。

#### 战斗类 (`effects/combat.ts`)

| effectType | params | 说明 |
|---|---|---|
| `damage` | `{ value, pierceShield? }` | 造成伤害，可穿透护盾 |
| `heal` | `{ value, target?: 'self' }` | 回复HP |
| `shield` | `{ value, target?: 'self' }` | 获得护盾 |
| `removeShield` | `{}` | 移除目标全部护盾 |
| `reflect` | `{ value }` | 反弹伤害给攻击者 |
| `freeStrike` | `{ color }` | 发动一次免费攻击 |
| `negateEffect` | `{ negatedType }` | 无效化某效果 |
| `modifyResponseDifficulty` | `{ value }` | 修改响应难度 |

#### 卡牌操作类 (`effects/card-ops.ts`)

| effectType | params | 说明 |
|---|---|---|
| `draw` | `{ count, target?: 'self' }` | 抽牌 |
| `discard` | `{ count, choice?: true }` | 弃牌（choice=true可选择） |
| `forceDiscard` | `{ count, random?: true }` | 强制弃牌 |
| `addTempCard` | `{ count, color?, erased? }` | 添加临时牌 |
| `retrieveDiscard` | `{ count, random? }` | 从弃牌堆回收 |
| `revealHandRandom` | `{ count, makeColorless? }` | 随机展示手牌 |
| `chargeGain` | `{ skillId, value, max? }` | 技能充能 |

#### 属性修改类 (`effects/stat-modifier.ts`)

| effectType | params | 说明 |
|---|---|---|
| `gainAC` | `{ value, max?, target?: 'self' }` | 增加AC |
| `modifyAgility` | `{ value }` | 修改敏捷 |
| `modifyActions` | `{ value }` | 修改动作数 |
| `modifyScoutRange` | `{ value }` | 修改侦查范围 |
| `modifyActionPoints` | `{ value }` | 修改行动点 |
| `amplify` | `{ multiplier }` | 伤害倍率 |
| `superAmplify` | `{ multiplier, damageType? }` | 高级伤害倍率 |
| `damageReductionGain` | `{ value }` | 减伤增益 |
| `overrideDamageType` | `{ damageType }` | 覆盖伤害类型 |
| `hpForMp` | `{ hpCost, mpGain }` | 用HP换MP |
| `preventDeath` | `{ hpAfter? }` | 防死（保留HP） |
| `hpThresholdTrigger` | `{ threshold, flag }` | HP阈值触发标记 |
| `modifyOutpostLimit` | `{ value }` | 修改据点上限 |

#### 条件/标记类 (`effects/condition.ts`)

| effectType | params | 说明 |
|---|---|---|
| `setFlag` | `{ flag, flagValue?, target? }` | 设置标记 |
| `checkFlag` | `{ flag, expected?, target? }` | 检查标记 |
| `conditional` | `{ flag, expected?, checkTarget? }` | 条件判断 |
| `vision` | `{ reveal }` | 获取视野信息 |
| `stealth` | `{}` | 进入隐匿 |
| `move` | `{ type }` | 移动 |
| `immuneToScout` | `{}` | 免疫侦查 |
| `scoutReveal` | `{ reveals }` | 侦查揭示信息 |

---

## 3. 添加新效果类型

当已有效果无法满足需求时，需要注册新效果。

### 步骤

1. 在 `packages/server/src/engine/effects/` 下创建新文件或编辑已有文件
2. 使用 `registerEffect(effectType, handler)` 注册
3. 在 `effects/index.ts` 中 import 新文件

### 处理器签名

```typescript
import { registerEffect, type EffectContext } from '../effect-pipeline.js'

registerEffect('myNewEffect', (ctx: EffectContext, params: Record<string, unknown>) => {
  // ctx.sourceId  — 技能使用者ID
  // ctx.targetId  — 目标ID
  // ctx.roomId    — 房间ID
  // ctx.playerStates — Map<playerId, PlayerCombatState>，可读写
  // ctx.events    — 事件日志数组，push 记录

  const target = ctx.playerStates.get(ctx.targetId)
  if (!target) {
    return { effectType: 'myNewEffect', targetId: ctx.targetId, success: false, description: '目标不存在' }
  }

  // 修改状态...
  // 记录事件...
  ctx.events.push({ type: 'myNewEffect', playerId: ctx.targetId, description: '效果描述' })

  return {
    effectType: 'myNewEffect',
    targetId: ctx.targetId,
    success: true,
    value: 42,
    description: '效果已生效',
  }
})
```

### PlayerCombatState 可用字段

```typescript
interface PlayerCombatState {
  hp: number           // 当前HP
  hpMax: number        // HP上限
  mp: number           // 当前MP
  mpMax: number        // MP上限
  shield: number       // 护盾值
  handCount: number    // 手牌数
  flags: Map<string, unknown>  // 运行时标记（存任意数据）
}
```

`flags` 常用键：
- `ac` — 当前AC值
- `stealth` — 隐匿状态
- `immuneToScout` — 免疫侦查
- `responseDifficulty` — 响应难度修正
- `agilityModifier` — 敏捷修正
- `actionBonus` — 动作数加成
- `charge:{skillId}` — 技能充能
- `preventDeath` — 防死标记
- 自定义标记：任意 string 键

---

## 4. 完整示例：奈亚子技能

以下展示如何为角色"奈亚子"添加完整技能组。

### 4.1 技能库条目

在 `skill-library.ts` 的 `SKILL_LIBRARY` 数组中追加：

```typescript
// ===== 奈亚子（潜行吧！奈亚子）=====
{
  id: 'nyaruko_physics_sword',
  name: '物理学圣剑',
  skillClass: 'A',
  rarity: 'normal',
  type: 'active',
  triggerTiming: 'combat_before',
  description: '攻击使用时，直至此次攻击完成结算前，所有角色不能从牌堆获取牌。',
  flavorText: '奈亚子（潜行吧！奈亚子）',
  cooldown: 0,
  targetType: 'global',
  tags: ['colorless', 'card_1', 'attack_modifier'],
  effects: [
    { effectType: 'setFlag', params: { flag: 'lockDraw', flagValue: true, target: 'global' } },
  ],
},
{
  id: 'nyaruko_cosmic_bomb',
  name: '亵渎之宇宙炸弹',
  skillClass: 'A',
  rarity: 'normal',
  type: 'active',
  triggerTiming: 'manual',
  description: '消耗3张手牌+3MP，对一名其他组角色进行无色攻击，造成伤害基准*3真实伤害，响应难度4。',
  flavorText: '奈亚子（潜行吧！奈亚子）',
  cost: { mp: 3 },
  cooldown: 0,
  targetType: 'single',
  tags: ['colorless', 'card_1', 'true_damage'],
  effects: [
    { effectType: 'discard', params: { count: 3, target: 'self' } },
    { effectType: 'trueDamage', params: { multiplier: 3, basedOn: 'baseDamage' } },
    { effectType: 'modifyResponseDifficulty', params: { value: 4 } },
  ],
},
{
  id: 'nyaruko_infinite_joker',
  name: '无限的joker',
  skillClass: 'A',
  rarity: 'rare',
  type: 'active',
  triggerTiming: 'standby',
  description: '消耗1MP，将X张临时抹消无色普通牌加入手牌，X=已击杀从者数+1。',
  flavorText: '奈亚子（潜行吧！奈亚子）',
  cost: { mp: 1 },
  cooldown: 0,
  targetType: 'self',
  tags: ['colorless', 'card_generation'],
  effects: [
    { effectType: 'addTempCard', params: { color: 'colorless', countFormula: 'kills+1', erased: true } },
  ],
},
{
  id: 'nyaruko_cqc_108',
  name: '宇宙CQC壹佰〇捌式',
  skillClass: 'A',
  rarity: 'normal',
  type: 'passive',
  triggerTiming: 'combat_before',
  description: '你的无色攻击指定唯一目标后，该目标不能使用其手中颜色最多的牌进行响应。',
  flavorText: '奈亚子（潜行吧！奈亚子）',
  cooldown: 0,
  targetType: 'self',
  tags: ['colorless', 'response_lock'],
  effects: [
    { effectType: 'setFlag', params: { flag: 'lockMajorityColor', flagValue: true } },
  ],
},
{
  id: 'nyaruko_crawling_chaos',
  name: '伏行之混沌',
  skillClass: 'A',
  rarity: 'rare',
  type: 'passive',
  triggerTiming: 'action_before',
  description: '行动点+1。每个行动阶段开始时，若你所在地点没有其他组角色，随机获得额外能力。',
  flavorText: '奈亚子（潜行吧！奈亚子）',
  cooldown: 0,
  targetType: 'self',
  tags: ['action_bonus', 'random', 'noble_phantasm'],
  effects: [
    { effectType: 'modifyActionPoints', params: { value: 1 } },
    { effectType: 'crawlingChaosRandom', params: {} },
  ],
},
{
  id: 'nyaruko_thousand_faces',
  name: '千面之神',
  skillClass: 'A',
  rarity: 'rare',
  type: 'passive',
  triggerTiming: 'round_start',
  description: '游戏开始时展示此宝具并公开完整卡面，实时同步变动。本宝具无法被替换。所有能力来源名称视为真名。',
  flavorText: '奈亚子（潜行吧！奈亚子）',
  cooldown: 0,
  targetType: 'self',
  tags: ['info_reveal', 'permanent', 'noble_phantasm'],
  effects: [
    { effectType: 'setFlag', params: { flag: 'publicCardFace', flagValue: true } },
    { effectType: 'setFlag', params: { flag: 'skillIrreplaceable', flagValue: true } },
    { effectType: 'setFlag', params: { flag: 'unifySourceName', flagValue: true } },
  ],
},
```

### 4.2 新效果处理器

对于无法用已有效果表达的逻辑，创建 `effects/nyaruko.ts`：

```typescript
// packages/server/src/engine/effects/nyaruko.ts
import { registerEffect } from '../effect-pipeline.js'

/**
 * 真实伤害（无视护盾和AC）
 * params: { multiplier, basedOn: 'baseDamage' }
 */
registerEffect('trueDamage', (ctx, params) => {
  const target = ctx.playerStates.get(ctx.targetId)
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!target || !source) {
    return { effectType: 'trueDamage', targetId: ctx.targetId, success: false, description: '目标不存在' }
  }

  const baseDamage = (source.flags.get('baseDamage') as number) || 10
  const multiplier = (params.multiplier as number) || 1
  const totalDamage = baseDamage * multiplier

  // 真实伤害：直接扣HP，无视护盾和AC
  target.hp = Math.max(0, target.hp - totalDamage)

  ctx.events.push({
    type: 'trueDamage',
    playerId: ctx.targetId,
    description: `受到 ${totalDamage} 点真实伤害 (${baseDamage}*${multiplier})`,
  })

  return {
    effectType: 'trueDamage',
    targetId: ctx.targetId,
    success: true,
    value: totalDamage,
    description: `造成 ${totalDamage} 点真实伤害`,
  }
})

/**
 * 伏行之混沌 — 随机能力
 * 行动阶段开始时检查是否独处，随机获得一个效果
 */
registerEffect('crawlingChaosRandom', (ctx, _params) => {
  const source = ctx.playerStates.get(ctx.sourceId)
  if (!source) {
    return { effectType: 'crawlingChaosRandom', targetId: ctx.sourceId, success: false, description: '目标不存在' }
  }

  // 检查是否独处（需要在调用方传入 flag 'isAloneInRegion'）
  const isAlone = source.flags.get('isAloneInRegion') as boolean
  if (!isAlone) {
    return {
      effectType: 'crawlingChaosRandom',
      targetId: ctx.sourceId,
      success: false,
      description: '当前地点有其他组角色，能力未触发',
    }
  }

  const roll = Math.floor(Math.random() * 4) + 1
  let desc = ''

  switch (roll) {
    case 1:
      source.flags.set('extraAdjacentMove', true)
      desc = '本回合可额外进行一次相邻移动'
      break
    case 2:
      source.flags.set('immuneToScout', true)
      desc = '本回合侦查中视为不存在'
      break
    case 3:
      source.flags.set('scoutRangeBonus', 2)
      source.flags.set('actionPointPenalty', 1)
      desc = '侦查范围+2，但行动点-1'
      break
    case 4:
      source.flags.set('standbyFreeAttack', true)
      desc = '备战开始时可进行1次无色普通攻击(响应难度1)'
      break
  }

  ctx.events.push({
    type: 'crawlingChaosRandom',
    playerId: ctx.sourceId,
    description: `伏行之混沌触发: ${desc}`,
    data: { roll },
  })

  return {
    effectType: 'crawlingChaosRandom',
    targetId: ctx.sourceId,
    success: true,
    value: roll,
    description: desc,
  }
})
```

然后在 `effects/index.ts` 中注册：

```typescript
import './nyaruko.js'
```

---

## 5. 设计规范

### 命名规范
- **技能ID**: `{角色简称}_{技能英文简写}`，如 `nyaruko_physics_sword`
- **effectType**: 小写驼峰，描述动作，如 `trueDamage`, `lockDraw`
- **flag 键名**: 小写驼峰描述状态，如 `lockMajorityColor`, `immuneToScout`

### 效果链执行顺序
`effects[]` 数组中的效果按顺序执行。前一个效果可以通过 `flags` 影响后续效果。

### 动态数值
- 对于依赖运行时数据的数值（如"已击杀从者数+1"），在 params 中使用 `countFormula` 字符串标记
- 实际计算由效果处理器在运行时查询游戏状态完成

### 被动技能
- `type: 'passive'` 的技能不需要玩家手动触发
- 通过 `triggerTiming` 指定自动触发时机
- 效果通常是设置 `flags`，由其他系统（伤害计算、移动检查等）读取

### 标签约定
| 标签 | 说明 |
|---|---|
| `colorless` | 无色相关技能 |
| `card_1` | 占1张卡牌槽位 |
| `true_damage` | 真实伤害 |
| `noble_phantasm` | 宝具 |
| `card_generation` | 生成卡牌 |
| `response_lock` | 限制响应 |
| `attack_modifier` | 修改攻击属性 |
| `action_bonus` | 行动点增益 |
| `info_reveal` | 信息公开 |
| `permanent` | 永久效果 |

---

## 6. 测试清单

添加新技能后验证：

- [ ] 技能出现在技能库列表中（前端技能浏览器）
- [ ] 轮抓阶段可以正常选取
- [ ] GM 可以手动分配给玩家
- [ ] 主动技能：消耗正确、目标选择正确、效果执行正确
- [ ] 被动技能：在对应阶段自动触发
- [ ] 冷却回合正确递减
- [ ] 效果链中后续效果依赖前序效果的 flag 时正常工作
