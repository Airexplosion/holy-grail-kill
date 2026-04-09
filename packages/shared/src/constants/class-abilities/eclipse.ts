import type { ClassAbilityDef } from './_types.js'

export const ECLIPSE_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'eclipse_1', name: '色彩消弭',
    abilityType: 'triggered', timing: 'standby', cooldown: 0, perGameLimit: 0,
    description: '[被动]备战环节当前地点所有角色随机展示X张手牌变无色（X=连续战斗次数）',
    grandDescription: '[被动]改为展示2X张',
    effects: [
      { effectType: 'revealHandRandom', params: { count: 'consecutiveCombats', makeColorless: true, targetType: 'sameLocation' } },
    ],
    grandEffects: [
      { effectType: 'revealHandRandom', params: { count: 'consecutiveCombats_x2', makeColorless: true, targetType: 'sameLocation' } },
    ],
  },
  {
    id: 'eclipse_2', name: '无色奇点',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]你的无色攻击(响应难度1)不能被无色响应；受无色攻击时响应难度-1',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'eclipse_colorlessNoColorlessResponse', flagValue: true } },
      { effectType: 'modifyResponseDifficulty', params: { value: 1 } }, // 无色攻击响应难度1
      { effectType: 'setFlag', params: { target: 'self', flag: 'eclipse_colorlessDefenseEasier', flagValue: -1 } },
    ],
  },
]
