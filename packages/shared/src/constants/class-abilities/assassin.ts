import type { ClassAbilityDef } from './_types.js'

export const ASSASSIN_ABILITIES: readonly ClassAbilityDef[] = [
  {
    id: 'assassin_1', name: '气息遮断',
    abilityType: 'passive', timing: 'always', cooldown: 0, perGameLimit: 0,
    description: '[被动]无法被侦查看到，战术撤离/逃离时方向隐匿。每局限一次战斗首轮结束时可整组战术撤离',
    grandDescription: '[被动]无法被侦查看到（但可反向得知侦查方信息），首轮内任意空闲节点可整组战术撤离',
    effects: [
      { effectType: 'immuneToScout', params: {} },
      { effectType: 'stealth', params: { duration: 0 } }, // 撤离/逃离时方向隐匿
      { effectType: 'setFlag', params: { target: 'self', flag: 'assassin_tacticalRetreat', flagValue: true } },
    ],
    grandEffects: [
      { effectType: 'immuneToScout', params: {} },
      { effectType: 'scoutReveal', params: { reveals: ['scouterId'] } }, // 反向得知侦查方
      { effectType: 'setFlag', params: { target: 'self', flag: 'assassin_tacticalRetreat_grand', flagValue: true } },
    ],
  },
  {
    id: 'assassin_2', name: '敏锐感知',
    abilityType: 'triggered', timing: 'on_scout', cooldown: 0, perGameLimit: 0,
    description: '[被动]侦查时获悉目标HP和令咒数。每局限一次，目标HP低或令咒少时可立即执行移动，击杀后恢复使用',
    effects: [
      { effectType: 'scoutReveal', params: { reveals: ['hp', 'commandSeals'] } },
      // 每局限一次的即时移动由独立条件触发处理
      { effectType: 'setFlag', params: { target: 'self', flag: 'assassin_keenSense_dashAvailable', flagValue: true } },
    ],
  },
]
