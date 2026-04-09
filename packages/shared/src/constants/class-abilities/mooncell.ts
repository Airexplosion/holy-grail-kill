import type { ClassAbilityDef } from './_types.js'

export const MOONCELL_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'mooncell_1', name: '未来管理',
    abilityType: 'triggered', timing: 'combat_round_start', cooldown: 0, perGameLimit: 0,
    description: '[被动]战斗阶段每轮开始和结束时获悉当前地点一名角色HP，仅一组时额外展示手牌',
    effects: [
      { effectType: 'scoutReveal', params: { reveals: ['hp'], targetType: 'sameLocation', count: 1 } },
      // 仅一组时额外展示手牌
      { effectType: 'setFlag', params: { target: 'self', flag: 'mooncell_soloRevealHand', flagValue: true } },
    ],
  },
  {
    id: 'mooncell_2', name: '月杯之权',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]地点内≥2组时，其他组攻击必须包含你且你+6增伤',
    grandDescription: '[被动]攻击必须包含你，+6增伤且攻击可选目标+1',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'mooncell_taunt', flagValue: true } },
      { effectType: 'amplify', params: { value: 6 } },
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'mooncell_taunt', flagValue: true } },
      { effectType: 'amplify', params: { value: 6 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'mooncell_extraTargets', flagValue: 1 } },
    ],
  },
]
