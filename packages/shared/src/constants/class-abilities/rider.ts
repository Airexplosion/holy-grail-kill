import type { ClassAbilityDef } from './_types.js'

export const RIDER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'rider_1', name: '冲阵急行',
    abilityType: 'triggered', timing: 'on_move', cooldown: 0, perGameLimit: 0,
    description: '[被动]每回合首次移动结束时，遭遇则视为宣战且对方无条件迎战并跳过其备战环节，未遭遇则回复1行动力',
    grandDescription: '[被动]首次移动消耗的地点牌后篡者摸一张牌，附带骑乘效果',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'riderCharge', flagValue: true } },
      // 遭遇时：强制宣战+跳过对方备战；未遭遇时：回复1行动点
      { effectType: 'conditional', params: { flag: 'encounteredOnMove', checkTarget: 'self' } },
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'riderCharge', flagValue: true } },
      { effectType: 'draw', params: { count: 1, target: 'master' } },
    ],
  },
  {
    id: 'rider_2', name: '骑乘',
    abilityType: 'active', timing: 'manual', cooldown: 0, perGameLimit: 0,
    description: '[自由]篡者可将两张地点牌视为任一地点牌消耗或弃置（不可建据点）',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'riderMount_wildLocation', flagValue: true } },
    ],
  },
]
