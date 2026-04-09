import type { ClassAbilityDef } from './_types.js'

export const NONCLASS_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'nonclass_1', name: '超级增伤',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '你具有3点超级增伤（所有伤害类型均享受）',
    grandDescription: '你具有5点超级增伤',
    effects: [
      { effectType: 'superAmplify', params: { value: 3 } },
    ],
    grandEffects: [
      { effectType: 'superAmplify', params: { value: 5 } },
    ],
  },
]
