import type { ClassAbilityDef } from './_types.js'

export const GATE_KEEPER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'gate_keeper_1', name: '门之戍卫',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]阿克夏之钥落地后篡者+3增伤+2减伤',
    grandDescription: '[被动]篡者+4增伤+2减伤（不需要钥匙落地）',
    effects: [
      // 条件：阿克夏之钥落地后才生效
      { effectType: 'conditional', params: { flag: 'akashaKeyLanded', checkTarget: 'game' } },
      { effectType: 'amplify', params: { value: 3 } },
      { effectType: 'damageReductionGain', params: { value: 2, target: 'self' } },
    ],
    grandEffects: [
      // Grand版不需要钥匙落地
      { effectType: 'amplify', params: { value: 4 } },
      { effectType: 'damageReductionGain', params: { value: 2, target: 'self' } },
    ],
  },
  {
    id: 'gate_keeper_2', name: '无限寰宇',
    abilityType: 'triggered', timing: 'combat_round_start', cooldown: 0, perGameLimit: 0,
    description: '[被动]战斗阶段首轮敏捷视为无穷大',
    effects: [
      { effectType: 'modifyAgility', params: { value: 'infinity' } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'gateKeeper_firstRoundOnly', flagValue: true } },
    ],
  },
]
