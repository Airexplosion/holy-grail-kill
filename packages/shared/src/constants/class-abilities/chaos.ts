import type { ClassAbilityDef } from './_types.js'

export const CHAOS_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'chaos_1', name: '对秩序',
    abilityType: 'triggered', timing: 'combat_round_start', cooldown: 0, perGameLimit: 0,
    description: '[被动]战斗每轮开始时免费普攻一次，首次使用某颜色牌时摸一张',
    effects: [
      { effectType: 'freeStrike', params: { color: 'any' } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'chaos_firstColorUseDraw', flagValue: true } },
    ],
  },
  {
    id: 'chaos_2', name: '混沌量化',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]同回合内红蓝绿各攻击至少一次后+2超级增伤',
    grandDescription: '[被动]改为+4超级增伤',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'chaos_triColorTracking', flagValue: true } },
      { effectType: 'superAmplify', params: { value: 2 } },
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'chaos_triColorTracking', flagValue: true } },
      { effectType: 'superAmplify', params: { value: 4 } },
    ],
  },
]
