import type { ClassAbilityDef } from './_types.js'

export const PRETENDER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'pretender_1', name: '变换残灵',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]无真名，取消真名系统影响，展示技能时可伪装来源。游戏开始时获得2点额外MP',
    grandDescription: '[被动]不变，但每回合开始获得2点额外MP',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'pretender_noTrueName', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'pretender_disguiseSkillSource', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'pretender_startBonusMp', flagValue: 2 } },
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'pretender_noTrueName', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'pretender_disguiseSkillSource', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'pretender_roundStartBonusMp', flagValue: 2 } },
    ],
  },
  {
    id: 'pretender_2', name: '虚名伪物',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]被侦查/公示时可伪装为另一组；免疫属性等级降低效果',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'pretender_disguiseOnScout', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'pretender_immuneAttrReduction', flagValue: true } },
    ],
  },
]
