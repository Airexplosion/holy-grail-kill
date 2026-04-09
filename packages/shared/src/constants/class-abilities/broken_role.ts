import type { ClassAbilityDef } from './_types.js'

export const BROKEN_ROLE_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'broken_role_1', name: '构造崩坏',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]游戏开始时加入3张黑色普通牌，手牌上限-2但黑色牌不占上限',
    grandDescription: '[被动]加入3张黑色牌+升格时1张入手，黑色牌不占上限',
    effects: [
      { effectType: 'addTempCard', params: { color: 'black', count: 3 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'brokenRole_handLimitReduction', flagValue: -2 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'brokenRole_blackNoSlot', flagValue: true } },
    ],
    grandEffects: [
      { effectType: 'addTempCard', params: { color: 'black', count: 3 } },
      { effectType: 'draw', params: { count: 1, target: 'self' } }, // 升格时1张入手
      { effectType: 'setFlag', params: { target: 'self', flag: 'brokenRole_blackNoSlot', flagValue: true } },
    ],
  },
  {
    id: 'broken_role_2', name: '负向极化',
    abilityType: 'triggered', timing: 'combat_round_start', cooldown: 3, perGameLimit: 0,
    cost: { hp: 3 },
    description: '[CD3]<3HP>战斗阶段开始时+3伤害基准-3手牌上限至阶段结束，击杀后回复6HP',
    effects: [
      { effectType: 'amplify', params: { value: 3 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'brokenRole_handLimitTemp', flagValue: -3 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'brokenRole_killHealBonus', flagValue: 6 } },
    ],
  },
]
