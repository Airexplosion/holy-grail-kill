import type { ClassAbilityDef } from './_types.js'

export const FOREIGNER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'foreigner_1', name: '领域外的生命',
    abilityType: 'triggered', timing: 'preparation', cooldown: 0, perGameLimit: 0,
    description: '[被动]准备阶段结束时加入[临时][抹消]无色普通牌，第十回合后变为三张',
    grandDescription: '[被动]改为两张，第十回合后变为四张',
    effects: [
      { effectType: 'addTempCard', params: { color: 'colorless', count: 1, erased: true } },
      // 第十回合后count变为3，由引擎按回合数调整
      { effectType: 'setFlag', params: { target: 'self', flag: 'foreigner_lateGameCardCount', flagValue: 3 } },
    ],
    grandEffects: [
      { effectType: 'addTempCard', params: { color: 'colorless', count: 2, erased: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'foreigner_lateGameCardCount', flagValue: 4 } },
    ],
  },
  {
    id: 'foreigner_2', name: '降临之神性',
    abilityType: 'active', timing: 'manual', cooldown: 0, perGameLimit: 0,
    cost: { mp: 1 },
    description: '[自由]消耗1MP或无色手牌，将受到的伤害变为钝性伤害，每回合首次弃牌时摸一张',
    effects: [
      { effectType: 'overrideDamageType', params: { damageType: 'blunt' } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'foreigner_firstDiscardDraw', flagValue: true } },
    ],
  },
]
