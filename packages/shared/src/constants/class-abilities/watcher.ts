import type { ClassAbilityDef } from './_types.js'

export const WATCHER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'watcher_1', name: '强制观测',
    abilityType: 'active', timing: 'manual', cooldown: 0, perGameLimit: 0,
    cost: { cards: 2 },
    description: '<2牌>[自由]切换双形态能力，第十回合后消耗变为<1牌>',
    grandDescription: '<1牌>[自由]切换双形态，首次转换后本阶段+1减伤',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'watcher_toggleForm', flagValue: true } },
      // 第十回合后cost降为1牌，由引擎按回合数调整
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'watcher_toggleForm', flagValue: true } },
      { effectType: 'damageReductionGain', params: { value: 1, target: 'self' } },
    ],
  },
  {
    id: 'watcher_2', name: '多重现象',
    abilityType: 'triggered', timing: 'on_kill', cooldown: 0, perGameLimit: 1,
    description: '[被动]击杀幻身后永久生效：选一项双形态能力AB分离并同时存在',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'watcher_dualFormPermanent', flagValue: true } },
    ],
  },
]
