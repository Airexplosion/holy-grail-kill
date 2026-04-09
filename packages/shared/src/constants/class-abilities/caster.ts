import type { ClassAbilityDef } from './_types.js'

export const CASTER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'caster_1', name: '道具作成',
    abilityType: 'triggered', timing: 'preparation', cooldown: 0, perGameLimit: 0,
    description: '[被动]准备阶段结束时摸两张弃一张或令篡者摸一张；据点被破坏时摸一张牌',
    effects: [
      // 二选一：摸2弃1 或 令篡者摸1
      { effectType: 'draw', params: { count: 2, target: 'self' } },
      { effectType: 'discard', params: { count: 1, target: 'self', choice: true } },
      // 据点被破坏时摸牌由独立触发处理
      { effectType: 'setFlag', params: { target: 'self', flag: 'casterItemCreation_outpostDestroyDraw', flagValue: true } },
    ],
  },
  {
    id: 'caster_2', name: '阵地作成',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '车卡时二选一：①落地时建立不占上限的据点，可转移；②篡者可将两张地点牌视为任一地点牌建据点',
    grandDescription: '车卡时二选一：①据点上限+1，可转移且破坏时摸牌；②不变',
    effects: [
      // 车卡时选择模式，由车卡流程处理
      { effectType: 'setFlag', params: { target: 'self', flag: 'casterTerritory_mode', flagValue: 'choose' } },
    ],
    grandEffects: [
      { effectType: 'modifyOutpostLimit', params: { value: 1 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'casterTerritory_transferable', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'casterTerritory_destroyDraw', flagValue: true } },
    ],
  },
]
