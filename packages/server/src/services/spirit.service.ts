/**
 * 残灵系统
 *
 * - 幻身退场时在该区域生成残灵
 * - 冠位系统开启时，游戏开始生成1~3个冠位残灵
 * - 吸收残灵需连续3行动点（被宣战则中断）
 * - 普通残灵：选择3项不同属性各+1级
 * - 冠位残灵：职业升级为冠位版本
 */

import { v4 as uuid } from 'uuid'
import type { SpiritType, SpiritRemnant, AttributeRank } from 'shared'
import { RANK_ORDER } from 'shared'

// 内存中维护残灵状态
const roomSpirits = new Map<string, SpiritRemnant[]>()

export function getSpirits(roomId: string): SpiritRemnant[] {
  return roomSpirits.get(roomId) || []
}

export function getSpirit(roomId: string, spiritId: string): SpiritRemnant | null {
  const spirits = getSpirits(roomId)
  return spirits.find(s => s.id === spiritId) ?? null
}

export function getRegionSpirits(roomId: string, regionId: string): SpiritRemnant[] {
  return getSpirits(roomId).filter(s => s.regionId === regionId && !s.absorbed)
}

/**
 * 幻身退场时生成残灵
 */
export function spawnSpirit(
  roomId: string,
  regionId: string,
  sourceServantId: string,
  type: SpiritType = 'normal',
): SpiritRemnant {
  const spirit: SpiritRemnant = {
    id: uuid(),
    roomId,
    regionId,
    type,
    sourceServantId,
    absorbed: false,
    absorbedByGroupId: null,
  }

  const spirits = roomSpirits.get(roomId) || []
  spirits.push(spirit)
  roomSpirits.set(roomId, spirits)

  return spirit
}

/**
 * 游戏开始时生成冠位残灵（可选系统）
 */
export function spawnGrandSpirits(roomId: string, regionIds: string[], count: number = 2): SpiritRemnant[] {
  const spawned: SpiritRemnant[] = []
  const available = [...regionIds]

  for (let i = 0; i < Math.min(count, available.length); i++) {
    const idx = Math.floor(Math.random() * available.length)
    const regionId = available.splice(idx, 1)[0]!
    spawned.push(spawnSpirit(roomId, regionId, '', 'grand'))
  }

  return spawned
}

/**
 * 吸收残灵（需已消耗3行动点）
 */
export function absorbSpirit(
  roomId: string,
  spiritId: string,
  groupId: string,
): { success: boolean; spirit?: SpiritRemnant; error?: string } {
  const spirits = roomSpirits.get(roomId) || []
  const idx = spirits.findIndex(s => s.id === spiritId)
  if (idx === -1) return { success: false, error: '残灵不存在' }

  const spirit = spirits[idx]!
  if (spirit.absorbed) return { success: false, error: '残灵已被吸收' }

  // 标记为已吸收
  const absorbed: SpiritRemnant = {
    ...spirit,
    absorbed: true,
    absorbedByGroupId: groupId,
  }
  spirits[idx] = absorbed
  roomSpirits.set(roomId, spirits)

  return { success: true, spirit: absorbed }
}

/**
 * 属性升级：将一个属性提升一级
 */
export function upgradeAttribute(currentRank: AttributeRank): AttributeRank | null {
  const idx = RANK_ORDER.indexOf(currentRank)
  if (idx >= RANK_ORDER.length - 1) return null // 已经是最高
  return RANK_ORDER[idx + 1]!
}

/**
 * 验证属性选择是否合法（3项不同属性）
 */
export function validateSpiritAttributeChoice(attrs: string[]): boolean {
  if (attrs.length !== 3) return false
  return new Set(attrs).size === 3
}

// 吸收进度追踪（需要连续3AP）
const absorptionProgress = new Map<string, { groupId: string; spiritId: string; regionId: string; apSpent: number }>()

export function startAbsorption(roomId: string, groupId: string, spiritId: string, regionId: string): void {
  absorptionProgress.set(`${roomId}:${groupId}`, { groupId, spiritId, regionId, apSpent: 1 })
}

export function continueAbsorption(roomId: string, groupId: string): {
  complete: boolean; spiritId?: string; apSpent: number
} | null {
  const key = `${roomId}:${groupId}`
  const progress = absorptionProgress.get(key)
  if (!progress) return null

  progress.apSpent++

  if (progress.apSpent >= 3) {
    absorptionProgress.delete(key)
    return { complete: true, spiritId: progress.spiritId, apSpent: progress.apSpent }
  }

  return { complete: false, apSpent: progress.apSpent }
}

export function cancelAbsorption(roomId: string, groupId: string): void {
  absorptionProgress.delete(`${roomId}:${groupId}`)
}

export function cleanupSpirits(roomId: string): void {
  roomSpirits.delete(roomId)
  // 清除该房间的所有吸收进度
  for (const key of absorptionProgress.keys()) {
    if (key.startsWith(`${roomId}:`)) {
      absorptionProgress.delete(key)
    }
  }
}
