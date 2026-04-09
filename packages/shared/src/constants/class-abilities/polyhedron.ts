import type { ClassAbilityDef } from './_types.js'

export const POLYHEDRON_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'polyhedron_1', name: '多面能手',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[卡牌2][万色]消耗时可额外视为一张指定颜色牌',
    grandDescription: '[卡牌4][万色]每2张占1手牌上限，消耗时额外视为一张指定颜色牌',
    effects: [
      { effectType: 'addTempCard', params: { color: 'rainbow', count: 2 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'polyhedron_rainbowAsAny', flagValue: true } },
    ],
    grandEffects: [
      { effectType: 'addTempCard', params: { color: 'rainbow', count: 4 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'polyhedron_rainbowAsAny', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'polyhedron_rainbowHalfSlot', flagValue: true } },
    ],
  },
  {
    id: 'polyhedron_2', name: '能工巧匠',
    abilityType: 'triggered', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]具有≥2色的牌被弃置/消耗后可洗回牌堆，然后摸一张并展示',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'polyhedron_multiColorRecycle', flagValue: true } },
      { effectType: 'retrieveDiscard', params: { count: 1, condition: 'multiColor' } },
      { effectType: 'draw', params: { count: 1, target: 'self' } },
    ],
  },
]
