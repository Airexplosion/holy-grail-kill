import type { ClassAbilityDef } from './_types.js'

export const PLAYER_FAKER_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'player_faker_1', name: '缺失补全',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]游戏开始时进行一次不消耗次数的能力替换（3选1）',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'playerFaker_freeAbilitySwap', flagValue: true } },
    ],
  },
  {
    id: 'player_faker_2', name: '构想之阶',
    abilityType: 'triggered', timing: 'always', cooldown: 0, perGameLimit: 1,
    description: '[被动]每局限一次，阿克夏之钥落地时获取指定地点大奖复制品并替换',
    grandDescription: '[被动]不变，升格时额外生效一次',
    effects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'playerFaker_keyLandingCopyPrize', flagValue: true } },
    ],
    grandEffects: [
      { effectType: 'setFlag', params: { target: 'self', flag: 'playerFaker_keyLandingCopyPrize', flagValue: true } },
      { effectType: 'setFlag', params: { target: 'self', flag: 'playerFaker_grandExtraUse', flagValue: true } },
    ],
  },
]
