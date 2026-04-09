import type { ClassAbilityDef } from './_types.js'

export const DRAGON_EXILE_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'dragon_exile_1', name: '龙心脉动',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]充能类能力上限翻倍',
    grandDescription: '[被动]充能上限翻两倍，[可超支]的视为已超支一次',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'dragonExile_chargeMaxMultiplier', flagValue: 2 } },
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'dragonExile_chargeMaxMultiplier', flagValue: 3 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'dragonExile_overchargePreUsed', flagValue: true } },
    ],
  },
  {
    id: 'dragon_exile_2', name: '威压姿态',
    abilityType: 'active', timing: 'manual', cooldown: 0, perGameLimit: 0,
    description: '[充能2/3][自由]当前地点其他篡者各弃一张，你的篡者可弃一张后你摸一张。备战环节获得3点充能',
    effects: [
      { effectType: 'chargeGain', params: { skillId: 'dragon_exile_2', value: 3 } }, // 备战环节获得充能
      // 消耗充能时：其他篡者各弃一张，己方篡者弃一张后摸一张
      { effectType: 'forceDiscard', params: { target: 'allOtherMasters', count: 1 } },
      { effectType: 'forceDiscard', params: { target: 'ownMaster', count: 1 } },
      { effectType: 'draw', params: { count: 1, target: 'self' } },
    ],
  },
]
