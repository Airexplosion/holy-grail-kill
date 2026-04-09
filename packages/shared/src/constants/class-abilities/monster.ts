import type { ClassAbilityDef } from './_types.js'

export const MONSTER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'monster_1', name: '怪异之心',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]游戏开始时每种颜色各一半卡牌变为虚色卡牌',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'monster_voidColorCards', flagValue: true } },
    ],
  },
  {
    id: 'monster_2', name: '空无暴走',
    abilityType: 'triggered', timing: 'standby', cooldown: 2, perGameLimit: 0,
    description: '[被动][CD2]备战环节，本回合有色攻击+2增伤，虚色卡牌额外+1增伤且贯穿',
    grandDescription: '[被动][CD2]备战环节+2增伤，虚色额外+3增伤且贯穿',
    effects: [
      { effectType: 'amplify', params: { value: 2 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'monster_voidExtraAmplify', flagValue: 1 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'monster_voidPiercing', flagValue: true } },
    ],
    grandEffects: [
      { effectType: 'amplify', params: { value: 2 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'monster_voidExtraAmplify', flagValue: 3 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'monster_voidPiercing', flagValue: true } },
    ],
  },
]
