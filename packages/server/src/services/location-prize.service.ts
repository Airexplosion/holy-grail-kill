/**
 * 地点大奖服务
 *
 * - 管理员为每个地点设置大奖（技能/宝具）
 * - 击杀后在该地点的战斗，击杀者可将大奖作为替换选项
 * - 大奖不补充，获奖全屏公示（不展示获得者）
 */

import { v4 as uuid } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { locationPrizes } from '../db/schema.js'
import type { LocationPrize } from 'shared'

export function addPrize(
  roomId: string,
  regionId: string,
  skillId: string,
  name: string,
  description: string,
): LocationPrize {
  const db = getDb()
  const id = uuid()
  db.insert(locationPrizes).values({
    id, roomId, regionId, skillId, name, description,
    claimed: false, claimedByGroupId: null, claimedAt: null,
  }).run()

  return { id, roomId, regionId, skillId, name, description, claimed: false, claimedByGroupId: null, claimedAt: null }
}

export function getRegionPrizes(roomId: string, regionId: string): LocationPrize[] {
  const db = getDb()
  return db.select().from(locationPrizes)
    .where(and(
      eq(locationPrizes.roomId, roomId),
      eq(locationPrizes.regionId, regionId),
    ))
    .all() as LocationPrize[]
}

export function getUnclaimedRegionPrizes(roomId: string, regionId: string): LocationPrize[] {
  return getRegionPrizes(roomId, regionId).filter(p => !p.claimed)
}

export function claimPrize(prizeId: string, groupId: string): LocationPrize | null {
  const db = getDb()
  const prize = db.select().from(locationPrizes).where(eq(locationPrizes.id, prizeId)).get()
  if (!prize || prize.claimed) return null

  db.update(locationPrizes).set({
    claimed: true,
    claimedByGroupId: groupId,
    claimedAt: Date.now(),
  }).where(eq(locationPrizes.id, prizeId)).run()

  return { ...prize, claimed: true, claimedByGroupId: groupId, claimedAt: Date.now() } as LocationPrize
}

export function getAllRoomPrizes(roomId: string): LocationPrize[] {
  const db = getDb()
  return db.select().from(locationPrizes)
    .where(eq(locationPrizes.roomId, roomId))
    .all() as LocationPrize[]
}
