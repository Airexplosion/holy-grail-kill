import type { ClassAbilityDef } from './_types.js'

export const LOSTMAN_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'lostman_1', name: '失落行迹',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]所有单向/不通路径对本组视为双向；若全为双向则可选2条变为不通',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'lostman_bidirectionalPaths', flagValue: true } },
      // 若全为双向则可选2条变为不通
      { effectType: 'setFlag', params: { target: 'self', flag: 'lostman_blockPaths', flagValue: 2 } },
    ],
  },
  {
    id: 'lostman_2', name: '崩坏境界',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]同地点其他组幻身第二项非冠位职业能力失效（特殊职业有例外）',
    grandDescription: '[被动]同地点每项非冠位职业能力失效（Nonclass/Grand Nonclass有例外）',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'lostman_suppressAbility', flagValue: 'second' } },
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'lostman_suppressAbility', flagValue: 'all' } },
    ],
  },
]
