import type { ClassAbilityDef } from './_types.js'

export const SHIELDER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'shielder_1', name: '决意之盾',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]1点减伤，同地点篡者受到的伤害和HP流失由你承担一半',
    effects: [
      { effectType: 'damageReductionGain', params: { value: 1, target: 'self' } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'shielder_absorbMasterDamage', flagValue: 0.5 } },
    ],
  },
  {
    id: 'shielder_2', name: '坚毅之壁',
    abilityType: 'triggered', timing: 'standby', cooldown: 0, perGameLimit: 0,
    description: '[被动]备战环节获得3点AC，若本方HP≤上限一半则改为6点AC',
    grandDescription: '[被动]备战环节获得6点AC，低HP时改为9点AC',
    effects: [
      { effectType: 'gainAC', params: { value: 3, target: 'self' } },
      // HP≤50%时改为6点（由引擎检查HP阈值替换value）
      { effectType: 'setFlag', params: { target: 'self', flag: 'shielder_lowHpAC', flagValue: 6 } },
    ],
    grandEffects: [
      { effectType: 'gainAC', params: { value: 6, target: 'self' } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'shielder_lowHpAC', flagValue: 9 } },
    ],
  },
]
