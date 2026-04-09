import type { ClassAbilityDef } from './_types.js'

export const LANCER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'lancer_1', name: '不屈枪势',
    abilityType: 'triggered', timing: 'standby', cooldown: 0, perGameLimit: 0,
    description: '[被动]备战环节回复4HP，若上回合交战过则获得2点[临时]额外MP或摸两张牌',
    grandDescription: '[被动]备战环节回复4HP，而后选择获得2点[临时]额外MP或摸两张牌，若上回合交战过可两项皆选',
    effects: [
      { effectType: 'heal', params: { value: 4, target: 'self' } },
      // 条件分支：上回合交战过→二选一（MP+2 或 draw 2）
      { effectType: 'conditional', params: { flag: 'foughtLastRound', checkTarget: 'self' } },
    ],
    grandEffects: [
      { effectType: 'heal', params: { value: 4, target: 'self' } },
      { effectType: 'draw', params: { count: 2, target: 'self' } },
    ],
  },
  {
    id: 'lancer_2', name: '背水一战',
    abilityType: 'triggered', timing: 'on_hp_threshold', cooldown: 0, perGameLimit: 1,
    description: '[被动]每局限一次，HP降至0时调整至8',
    effects: [
      { effectType: 'preventDeath', params: { setHp: 8 } },
    ],
  },
]
