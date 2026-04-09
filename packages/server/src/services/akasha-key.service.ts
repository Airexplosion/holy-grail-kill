/**
 * 阿克夏之钥服务
 *
 * 当3名幻身退场时，钥匙在随机地点生成。
 * 携带→注入魔力→完成许愿→胜利
 */

import type { AkashaKeyState, VictoryEvent } from 'shared'
import { KEY_SPAWN_ELIMINATIONS, getChannelCost } from 'shared'
import * as groupService from './group.service.js'
import * as mapService from './map.service.js'

// 内存中维护钥匙状态（每房间一个）
const keyStates = new Map<string, AkashaKeyState>()

export function getKeyState(roomId: string): AkashaKeyState {
  return keyStates.get(roomId) ?? {
    spawned: false,
    regionId: null,
    carrierGroupId: null,
    channelProgress: 0,
    channelRequired: 16,
  }
}

/**
 * 检查是否应该生成钥匙（每次有幻身淘汰时调用）
 */
export function checkKeySpawn(roomId: string): { spawned: boolean; regionId?: string } {
  const existing = getKeyState(roomId)
  if (existing.spawned) return { spawned: false }

  const allGroups = groupService.getRoomGroups(roomId)
  const eliminated = allGroups.filter(g => g.status === 'eliminated' || g.status === 'servant_eliminated')

  if (eliminated.length < KEY_SPAWN_ELIMINATIONS) return { spawned: false }

  // 随机选一个区域放置钥匙
  const regions = mapService.getRoomRegions(roomId)
  if (regions.length === 0) return { spawned: false }

  const randomRegion = regions[Math.floor(Math.random() * regions.length)]!
  const aliveCount = groupService.getAliveGroupCount(roomId)

  const state: AkashaKeyState = {
    spawned: true,
    regionId: randomRegion.id,
    carrierGroupId: null,
    channelProgress: 0,
    channelRequired: getChannelCost(aliveCount),
  }
  keyStates.set(roomId, state)

  return { spawned: true, regionId: randomRegion.id }
}

/**
 * 携带钥匙（需要在钥匙所在区域，消耗1行动点）
 */
export function pickUpKey(roomId: string, groupId: string, groupRegionId: string): {
  success: boolean; error?: string
} {
  const state = getKeyState(roomId)
  if (!state.spawned) return { success: false, error: '钥匙尚未生成' }
  if (state.carrierGroupId) return { success: false, error: '钥匙已被携带' }
  if (state.regionId !== groupRegionId) return { success: false, error: '你不在钥匙所在区域' }

  keyStates.set(roomId, {
    ...state,
    carrierGroupId: groupId,
    regionId: null, // 不在地上了
  })
  groupService.setAkashaKeyHolder(groupId, true)

  return { success: true }
}

/**
 * 放置钥匙
 */
export function putDownKey(roomId: string, groupId: string, regionId: string): {
  success: boolean; error?: string
} {
  const state = getKeyState(roomId)
  if (state.carrierGroupId !== groupId) return { success: false, error: '你没有携带钥匙' }

  keyStates.set(roomId, {
    ...state,
    carrierGroupId: null,
    regionId,
  })
  groupService.setAkashaKeyHolder(groupId, false)

  return { success: true }
}

/**
 * 注入魔力（每次消耗1行动点，累计达到目标则胜利）
 * 返回是否达成胜利
 */
export function channelMagic(roomId: string, groupId: string): {
  success: boolean
  progress?: number
  required?: number
  victory?: boolean
  error?: string
} {
  const state = getKeyState(roomId)
  if (!state.spawned) return { success: false, error: '钥匙尚未生成' }
  // 需要钥匙在地上（放置状态）且组在同一区域，或者组携带钥匙也不行（携带时无法注入）
  if (state.carrierGroupId) return { success: false, error: '携带状态无法注入魔力，需先放置钥匙' }

  // 更新所需行动点（随淘汰人数变化）
  const aliveCount = groupService.getAliveGroupCount(roomId)
  const required = getChannelCost(aliveCount)

  const newProgress = state.channelProgress + 1
  const victory = newProgress >= required

  keyStates.set(roomId, {
    ...state,
    channelProgress: newProgress,
    channelRequired: required,
  })

  if (victory) {
    groupService.addChannelProgress(groupId, 1)
  }

  return {
    success: true,
    progress: newProgress,
    required,
    victory,
  }
}

/**
 * 构建胜利事件
 */
export function createVictoryEvent(groupId: string, type: 'akasha_key_channeled' | 'last_standing'): VictoryEvent {
  return {
    winnerGroupId: groupId,
    type,
    timestamp: Date.now(),
  }
}

/**
 * 检查是否只剩最后一组（自动胜利）
 */
export function checkLastStanding(roomId: string): VictoryEvent | null {
  const alive = groupService.getAliveGroups(roomId)
  if (alive.length === 1) {
    return createVictoryEvent(alive[0]!.id, 'last_standing')
  }
  return null
}

/**
 * 清理
 */
export function cleanupKey(roomId: string): void {
  keyStates.delete(roomId)
}
