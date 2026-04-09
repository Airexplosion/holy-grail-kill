import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { players } from '../db/schema.js'
import type { AttributeRank, ServantAttributes, MasterAttributes } from 'shared'
import type { ServantClassId } from 'shared'
import type { MasterArchetypeId } from 'shared'
import { SERVANT_CLASS_MAP, MASTER_ARCHETYPE_MAP } from 'shared'
import {
  validateServantAllocation,
  deriveServantStats,
  deriveMasterStats,
} from '../engine/attribute-engine.js'
import * as playerService from './player.service.js'
import * as groupService from './group.service.js'

// ── 幻身属性分配 ──

export function allocateServantAttributes(
  playerId: string,
  attrs: ServantAttributes,
): { success: boolean; error?: string } {
  const player = playerService.getPlayer(playerId)
  if (!player) return { success: false, error: '玩家不存在' }

  // 检查是否有 Saber 的七骑之首加成
  const classId = player.classId as ServantClassId | null
  let totalPoints = 16
  if (classId === 'saber') totalPoints = 18

  // 检查是否有范型解锁高等级
  const group = groupService.getPlayerGroup(playerId)
  let unlockHighRanks = false
  if (group) {
    const masterPlayer = playerService.getPlayer(group.masterPlayerId)
    const archetypeId = masterPlayer?.archetypeId as MasterArchetypeId | null
    if (archetypeId) {
      const archetype = MASTER_ARCHETYPE_MAP[archetypeId]
      if (archetype?.specialEffects.includes('unlock_high_ranks')) {
        unlockHighRanks = true
      }
    }
  }

  const validation = validateServantAllocation(attrs, totalPoints, unlockHighRanks)
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('; ') }
  }

  // 派生数值
  const derived = deriveServantStats(attrs)

  const db = getDb()
  db.update(players).set({
    str: attrs.str,
    end: attrs.end,
    agi: attrs.agi,
    mag: attrs.mag,
    luk: attrs.luk,
    hp: derived.hp,
    hpMax: derived.hp,
    mp: derived.mp,
    mpMax: derived.mp,
    actionPointsMax: derived.actions,
    actionPoints: derived.actions,
    updatedAt: Date.now(),
  }).where(eq(players.id, playerId)).run()

  return { success: true }
}

// ── 篡者属性分配 ──

export function allocateMasterAttributes(
  playerId: string,
  attrs: MasterAttributes,
): { success: boolean; error?: string } {
  const player = playerService.getPlayer(playerId)
  if (!player) return { success: false, error: '玩家不存在' }

  const derived = deriveMasterStats(attrs)

  const db = getDb()
  db.update(players).set({
    str: attrs.str,
    end: attrs.end,
    mag: attrs.mag,
    actionPower: attrs.actionPower,
    hp: derived.hp,
    hpMax: derived.hp,
    mp: derived.mp,
    mpMax: derived.mp,
    updatedAt: Date.now(),
  }).where(eq(players.id, playerId)).run()

  return { success: true }
}

// ── 职业选择 ──

export function selectClass(
  playerId: string,
  classId: ServantClassId,
): { success: boolean; error?: string } {
  if (!SERVANT_CLASS_MAP[classId]) {
    return { success: false, error: `未知职业: ${classId}` }
  }

  const db = getDb()
  db.update(players).set({
    classId,
    updatedAt: Date.now(),
  }).where(eq(players.id, playerId)).run()

  return { success: true }
}

// ── 范型选择 ──

export function selectArchetype(
  playerId: string,
  archetypeId: MasterArchetypeId,
): { success: boolean; error?: string } {
  if (!MASTER_ARCHETYPE_MAP[archetypeId]) {
    return { success: false, error: `未知范型: ${archetypeId}` }
  }

  const db = getDb()
  db.update(players).set({
    archetypeId,
    updatedAt: Date.now(),
  }).where(eq(players.id, playerId)).run()

  return { success: true }
}

// ── 战术风格选择 ──

export function selectTacticalStyle(
  playerId: string,
  color: 'red' | 'blue' | 'green',
): { success: boolean; error?: string } {
  const db = getDb()
  db.update(players).set({
    tacticalStyle: color,
    updatedAt: Date.now(),
  }).where(eq(players.id, playerId)).run()

  return { success: true }
}

// ── 角色完成度检查 ──

export interface CharacterCompleteness {
  readonly complete: boolean
  readonly missing: readonly string[]
}

export function checkServantComplete(playerId: string): CharacterCompleteness {
  const player = playerService.getPlayer(playerId)
  if (!player) return { complete: false, missing: ['玩家不存在'] }

  const missing: string[] = []
  if (!player.str || !player.end || !player.agi || !player.mag || !player.luk) {
    missing.push('属性分配')
  }
  if (!player.classId) missing.push('职业选择')

  return { complete: missing.length === 0, missing }
}

export function checkMasterComplete(playerId: string): CharacterCompleteness {
  const player = playerService.getPlayer(playerId)
  if (!player) return { complete: false, missing: ['玩家不存在'] }

  const missing: string[] = []
  if (!player.archetypeId) missing.push('范型选择')
  if (!player.tacticalStyle) {
    // 魔眼使没有战术风格
    const archetypeId = player.archetypeId as MasterArchetypeId | null
    if (archetypeId !== 'mystic_eye') {
      missing.push('战术风格选择')
    }
  }

  return { complete: missing.length === 0, missing }
}
