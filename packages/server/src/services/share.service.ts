import { v4 as uuid } from 'uuid'
import { randomInt } from 'crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { deckShares, deckBuilds } from '../db/schema.js'
import type { PlayerStrikeSelection } from 'shared'

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[randomInt(chars.length)]
  }
  return code
}

export function createShareLink(deckBuildId: string, roomId: string, playerId: string) {
  const db = getDb()
  const shareCode = generateShareCode()
  const id = uuid()
  db.insert(deckShares).values({
    id,
    roomId,
    playerId,
    deckBuildId,
    shareCode,
    createdAt: Date.now(),
  }).run()
  return { id, shareCode }
}

export function getSharedBuild(shareCode: string) {
  const db = getDb()
  const share = db.select().from(deckShares)
    .where(eq(deckShares.shareCode, shareCode))
    .get()
  if (!share) return null

  const build = db.select().from(deckBuilds)
    .where(eq(deckBuilds.id, share.deckBuildId))
    .get()
  if (!build) return null

  return {
    shareCode: share.shareCode,
    playerId: share.playerId,
    strikeCards: JSON.parse(build.strikeCards) as PlayerStrikeSelection,
    skillIds: JSON.parse(build.skillIds) as string[],
    createdAt: share.createdAt,
  }
}
