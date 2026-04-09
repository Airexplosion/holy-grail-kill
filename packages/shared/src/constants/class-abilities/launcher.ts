import type { ClassAbilityDef } from './_types.js'

export const LAUNCHER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'launcher_1', name: '炮火阵列',
    abilityType: 'active', timing: 'manual', cooldown: 0, perGameLimit: 0,
    cost: { mp: 1, cards: 1 },
    description: '<1MP+1牌+1行动点>对指定地点所有角色攻击，而后本阶段+1增伤',
    effects: [
      { effectType: 'freeStrike', params: { color: 'any', aoe: true, targetType: 'location' } },
      { effectType: 'amplify', params: { value: 1 } },
    ],
  },
  {
    id: 'launcher_2', name: '毁灭打击',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]攻击未命中时摧毁目标地点据点和装置；摧毁后本回合+1增伤',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'launcher_missDestroy', flagValue: true } },
      // 摧毁后增伤由引擎在摧毁事件时触发
      { effectType: 'setFlag', params: { target: 'self', flag: 'launcher_destroyAmplify', flagValue: 1 } },
    ],
  },
]
