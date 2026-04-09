import type { ClassAbilityDef } from './_types.js'

export const AVENGER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'avenger_1', name: '忘却补正',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]HP上限+16，上半无法补充HP，击杀幻身后回满',
    grandDescription: '[被动]HP上限+32，上半无法补充，击杀回满，升格时立即回复16HP',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'hpMaxBonus', flagValue: 16 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'avenger_upperHalfNoHeal', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'avenger_killFullHeal', flagValue: true } },
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'hpMaxBonus', flagValue: 32 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'avenger_upperHalfNoHeal', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'avenger_killFullHeal', flagValue: true } },
      { effectType: 'heal', params: { value: 16, target: 'self' } },
    ],
  },
  {
    id: 'avenger_2', name: '自我回复（魔力）',
    abilityType: 'triggered', timing: 'standby', cooldown: 0, perGameLimit: 0,
    description: '[被动]备战环节/战斗首轮结束时，HP≤上限一半则回复2MP或获得2点[临时]额外MP',
    effects: [
      { effectType: 'hpThresholdTrigger', params: { threshold: 50 } },
      // 条件满足时：回复2MP 或 获得2点临时额外MP（玩家选择）
      { effectType: 'setFlag', params: { target: 'self', flag: 'avenger_mpRecovery', flagValue: 2 } },
    ],
  },
]
