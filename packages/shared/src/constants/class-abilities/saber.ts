import type { ClassAbilityDef } from './_types.js'

export const SABER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'saber_1', name: '辉煌之剑',
    abilityType: 'active', timing: 'manual', cooldown: 1, perGameLimit: 0,
    cost: { cards: 2 },
    description: '[CD1][自由]弃置两张手牌，无效一项正作用于自身所在组任意角色的其他组篡者效果或任一篡者使用的一次战术风格',
    grandDescription: '[CD1][自由]无效一项正作用于自身所在组任意角色的其他组篡者效果',
    effects: [
      { effectType: 'forceDiscard', params: { target: 'self', count: 2 } },
      { effectType: 'negateEffect', params: { negatedType: 'master_effect_or_tactical_style' } },
    ],
    grandEffects: [
      { effectType: 'negateEffect', params: { negatedType: 'master_effect' } },
    ],
  },
  {
    id: 'saber_2', name: '七骑之首',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]车卡分配属性时，多获得2点用于分配的属性',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'extraAttributePoints', flagValue: 2 } },
    ],
  },
]
