/**
 * 冠位(Grand)升格服务
 *
 * 吸收冠位残灵后：
 * 1. 职业升格为 Grand 版本（标记 isGrand=true）
 * 2. 选择一项职业能力替换为冠位版本（使用 grandEffects）
 * 3. 冠位版本的能力描述在 class-abilities/{class}.ts 中已定义
 */

import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { players } from '../db/schema.js'
import { getClassAbilities } from 'shared'
import type { ClassAbilityDef } from 'shared'
import * as playerService from './player.service.js'

/**
 * 检查玩家是否已冠位
 */
export function isGrand(playerId: string): boolean {
  const player = playerService.getPlayer(playerId)
  if (!player) return false
  // 使用 flags 中的 isGrand 标记（存储在 player metadata 或独立列）
  // 简化实现：检查 classId 是否以 'grand_' 开头
  return player.classId?.startsWith('grand_') ?? false
}

/**
 * 执行冠位升格
 * @param abilityId 选择升格的能力ID
 */
export function upgradeToGrand(
  playerId: string,
  abilityId: string,
): { success: boolean; error?: string; upgradedAbility?: ClassAbilityDef } {
  const player = playerService.getPlayer(playerId)
  if (!player) return { success: false, error: '玩家不存在' }
  if (!player.classId) return { success: false, error: '未选择职业' }

  if (isGrand(playerId)) return { success: false, error: '已经是冠位' }

  // 获取职业能力
  const abilities = getClassAbilities(player.classId)
  const target = abilities.find(a => a.id === abilityId)
  if (!target) return { success: false, error: '能力不存在' }
  if (!target.grandEffects || target.grandEffects.length === 0) {
    return { success: false, error: '该能力没有冠位版本' }
  }

  // 标记冠位状态
  const db = getDb()
  db.update(players).set({
    classId: `grand_${player.classId}`,
    updatedAt: Date.now(),
  }).where(eq(players.id, playerId)).run()

  return {
    success: true,
    upgradedAbility: {
      ...target,
      effects: target.grandEffects,
      description: target.grandDescription || target.description,
    },
  }
}

/**
 * 获取可升格的能力列表（有 grandEffects 的）
 */
export function getUpgradeableAbilities(playerId: string): ClassAbilityDef[] {
  const player = playerService.getPlayer(playerId)
  if (!player?.classId) return []

  const abilities = getClassAbilities(player.classId)
  return abilities.filter(a => a.grandEffects && a.grandEffects.length > 0) as ClassAbilityDef[]
}
