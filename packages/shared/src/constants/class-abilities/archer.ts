import type { ClassAbilityDef } from './_types.js'

export const ARCHER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'archer_1', name: '千里眼',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]侦查距离+1，行动点+1，行动阶段开始时可执行一次侦查',
    grandDescription: '[被动]侦查距离+2，行动点+2，附带远距射击和常规七骑少时的额外侦查加成',
    effects: [
      { effectType: 'modifyScoutRange', params: { value: 1 } },
      { effectType: 'modifyActionPoints', params: { value: 1 } },
    ],
    grandEffects: [
      { effectType: 'modifyScoutRange', params: { value: 2 } },
      { effectType: 'modifyActionPoints', params: { value: 2 } },
    ],
  },
  {
    id: 'archer_2', name: '远距射击',
    abilityType: 'triggered', timing: 'on_scout', cooldown: 0, perGameLimit: 0,
    description: '[被动]侦查到其他组角色时可弃置一张普通牌进行远程攻击',
    effects: [
      { effectType: 'forceDiscard', params: { target: 'self', count: 1 } },
      { effectType: 'freeStrike', params: { color: 'match_discard' } },
    ],
  },
]
