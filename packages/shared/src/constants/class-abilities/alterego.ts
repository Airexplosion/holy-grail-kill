import type { ClassAbilityDef } from './_types.js'

export const ALTEREGO_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'alterego_1', name: '复合残灵',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]随机两个不同职业各随机一项能力获得之',
    grandDescription: '[被动]不变+升格时额外投掷第三四个职业定向选一项',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'alterego_compositeAbility', flagValue: { randomClasses: 2, randomAbilitiesEach: 1 } } },
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'alterego_compositeAbility', flagValue: { randomClasses: 2, randomAbilitiesEach: 1 } } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'alterego_grandExtraRoll', flagValue: { extraClasses: 2, chooseOne: true } } },
    ],
  },
  {
    id: 'alterego_2', name: '"最后的救赎"',
    abilityType: 'active', timing: 'manual', cooldown: 0, perGameLimit: 1,
    description: '[被动]仅一次机会，公屏重新执行复合残灵（公开信息但获得第二次机会），执行时立即死亡',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'alterego_rerollComposite', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'alterego_publicReroll', flagValue: true } },
      // 执行时立即死亡
      { effectType: 'damage', params: { value: 9999, target: 'self' } },
    ],
  },
]
