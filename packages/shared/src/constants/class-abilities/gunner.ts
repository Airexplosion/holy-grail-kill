import type { ClassAbilityDef } from './_types.js'

export const GUNNER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'gunner_1', name: '快速装填',
    abilityType: 'triggered', timing: 'action_start', cooldown: 0, perGameLimit: 0,
    description: '[被动]行动阶段开始装填1枚[临时]通用子弹（击杀后改为2枚），可作为攻击或替代其他子弹',
    grandDescription: '[被动]改为装填2枚（击杀后3枚）',
    effects: [
      { effectType: 'addTempCard', params: { color: 'bullet', count: 1 } },
      // 击杀后count变为2，由引擎检查击杀flag调整
      { effectType: 'setFlag', params: { target: 'self', flag: 'gunner_postKillBullets', flagValue: 2 } },
    ],
    grandEffects: [
      { effectType: 'addTempCard', params: { color: 'bullet', count: 2 } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'gunner_postKillBullets', flagValue: 3 } },
    ],
  },
  {
    id: 'gunner_2', name: '滑步射击',
    abilityType: 'triggered', timing: 'on_move', cooldown: 0, perGameLimit: 0,
    description: '[被动]移动后遭遇时可立即攻击；其他组离开时可进行[自由]攻击',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'gunner_slideShot_encounterAttack', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'gunner_slideShot_departureAttack', flagValue: true } },
    ],
  },
]
