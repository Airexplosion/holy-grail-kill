import type { ClassAbilityDef } from './_types.js'

export const BEAST_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'beast_1', name: '兽之权能',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]吸取残灵行动点-1，属性分配无视不同属性限制',
    grandDescription: '[被动]行动点-2，自由分配+额外1级，特定条件下全场-2全属性',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'beast_absorbApReduction', flagValue: 1 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'beast_freeAttrDistribution', flagValue: true } },
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'beast_absorbApReduction', flagValue: 2 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'beast_freeAttrDistribution', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'beast_extraAttrLevel', flagValue: 1 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'beast_globalAttrDebuff', flagValue: -2 } },
    ],
  },
  {
    id: 'beast_2', name: '单独显现',
    abilityType: 'triggered', timing: 'on_kill', cooldown: 0, perGameLimit: 0,
    description: '[被动]击杀后额外选一项击杀奖励（可与篡者选同或不同）；篡者死亡后如常行动',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'beast_extraKillReward', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'beast_independentAfterMasterDeath', flagValue: true } },
    ],
  },
]
