import type { ClassAbilityDef } from './_types.js'

export const BERSERKER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'berserker_1', name: '狂化',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '三选一：①指定颜色响应难度+1但造成钝性伤害；②普攻消耗HP替代MP(1:3)；③普攻+1增伤且造成贯穿伤害',
    grandDescription: '三选一：①不变；②命中时回1HP；③增伤改为2点',
    effects: [
      // 车卡时三选一，引擎根据选项设置对应flag
      { effectType: 'setFlag', params: { target: 'self', flag: 'berserkerMadness_mode', flagValue: 'choose' } },
      // 模式①：modifyResponseDifficulty +1 + overrideDamageType 'blunt'
      // 模式②：hpForMp ratio 3
      // 模式③：amplify +1 + overrideDamageType 'piercing'
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'berserkerMadness_mode', flagValue: 'choose' } },
      // 模式②grand：命中时heal 1
      // 模式③grand：amplify +2
    ],
  },
  {
    id: 'berserker_2', name: '理智不清',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]可在战斗阶段对自身篡者使用普通攻击，篡者随后也可反击',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'berserker_canAttackOwnMaster', flagValue: true } },
    ],
  },
]
