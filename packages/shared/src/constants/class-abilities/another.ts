import type { ClassAbilityDef } from './_types.js'

export const ANOTHER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'another_1', name: '异常存在',
    abilityType: 'triggered', timing: 'standby', cooldown: 0, perGameLimit: 0,
    description: '[被动]备战环节获得1层[临时][层数状态抗性]，击杀后改为2层',
    grandDescription: '[被动]备战环节2层，击杀后3层',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'another_statusResistLayers', flagValue: 1 } },
      // 击杀后改为2层，由引擎在击杀事件时调整
      { effectType: 'setFlag', params: { target: 'self', flag: 'another_postKillResistLayers', flagValue: 2 } },
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'another_statusResistLayers', flagValue: 2 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'another_postKillResistLayers', flagValue: 3 } },
    ],
  },
  {
    id: 'another_2', name: '灵格压制',
    abilityType: 'triggered', timing: 'on_damaged', cooldown: 0, perGameLimit: 0,
    description: '[被动]每战斗阶段第二次受伤后获得2层[临时][伤害免疫]',
    effects: [
      // 第二次受伤后触发，由引擎计数伤害次数
      { effectType: 'setFlag', params: { target: 'self', flag: 'another_damageImmunityOnSecondHit', flagValue: 2 } },
    ],
  },
]
