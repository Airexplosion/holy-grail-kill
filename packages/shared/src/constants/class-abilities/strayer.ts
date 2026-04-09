import type { ClassAbilityDef } from './_types.js'

export const STRAYER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'strayer_1', name: 'Data Lost',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]首次消耗>1行动点后回复2行动点；宣战/迎战时每有1未执行行动点则战斗阶段+1伤害基准',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'strayer_actionPointRefund', flagValue: 2 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'strayer_unusedApDamageBonus', flagValue: true } },
    ],
  },
  {
    id: 'strayer_2', name: '默行迷途',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]战斗首轮敏捷视为无穷小；动作+1，首轮额外+1',
    grandDescription: '[被动]首轮敏捷无穷小；动作+2，首轮额外+2',
    effects: [
      { effectType: 'modifyAgility', params: { value: '-infinity' } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'strayer_firstRoundOnly', flagValue: true } },
      { effectType: 'modifyActions', params: { value: 1 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'strayer_firstRoundExtraActions', flagValue: 1 } },
    ],
    grandEffects: [
      { effectType: 'modifyAgility', params: { value: '-infinity' } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'strayer_firstRoundOnly', flagValue: true } },
      { effectType: 'modifyActions', params: { value: 2 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'strayer_firstRoundExtraActions', flagValue: 2 } },
    ],
  },
]
