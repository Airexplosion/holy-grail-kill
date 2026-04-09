import type { ClassAbilityDef } from './_types.js'

export const MISSFLOWER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'missflower_1', name: '繁生之花',
    abilityType: 'triggered', timing: 'round_start', cooldown: 0, perGameLimit: 0,
    description: '[被动]第1/9/14回合结束时选一项+1：MP上限、伤害基准、行动点、动作/据点、手牌上限',
    effects: [
      // 在指定回合触发，玩家选择一项+1
      { effectType: 'setFlag', params: { target: 'self', flag: 'missflower_growthRounds', flagValue: [1, 9, 14] } },
      // 可选效果由引擎提供选项：mpMax/damageBase/actionPoints/actions/handLimit
    ],
  },
  {
    id: 'missflower_2', name: '初萌之芽',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]受到>2点伤害时视为2点减伤，首名/第二名幻身离场后各-1',
    grandDescription: '[被动]2点减伤',
    effects: [
      { effectType: 'damageReductionGain', params: { value: 2, target: 'self' } },
      // 幻身离场后减伤递减，由引擎在离场事件时处理
      { effectType: 'setFlag', params: { target: 'self', flag: 'missflower_reductionDecay', flagValue: true } },
    ],
    grandEffects: [
      { effectType: 'damageReductionGain', params: { value: 2, target: 'self' } },
    ],
  },
]
