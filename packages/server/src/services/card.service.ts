import { v4 as uuid } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { cards } from '../db/schema.js'
import { shuffleDeck, drawFromTop, drawSpecific } from '../engine/deck-manager.js'
import type { CardLocation } from 'shared'

function getCardsByLocation(playerId: string, location: CardLocation) {
  const db = getDb()
  return db.select().from(cards)
    .where(and(eq(cards.playerId, playerId), eq(cards.location, location)))
    .all()
    .map(c => ({ ...c, metadata: JSON.parse(c.metadata) }))
}

export function getHand(playerId: string) {
  return getCardsByLocation(playerId, 'hand')
}

export function getDeck(playerId: string) {
  return getCardsByLocation(playerId, 'deck')
}

export function getDiscard(playerId: string) {
  return getCardsByLocation(playerId, 'discard')
}

export function getCardCounts(playerId: string) {
  const db = getDb()
  const all = db.select().from(cards).where(eq(cards.playerId, playerId)).all()
  return {
    hand: all.filter(c => c.location === 'hand').length,
    deck: all.filter(c => c.location === 'deck').length,
    discard: all.filter(c => c.location === 'discard').length,
  }
}

export function drawCards(playerId: string, count: number) {
  const deck = getCardsByLocation(playerId, 'deck')
  const { drawn, remaining } = drawFromTop(deck, count)
  const db = getDb()
  const handCount = getCardsByLocation(playerId, 'hand').length

  for (const card of drawn) {
    db.update(cards)
      .set({ location: 'hand', position: handCount + drawn.indexOf(card) })
      .where(eq(cards.id, card.id))
      .run()
  }

  for (let i = 0; i < remaining.length; i++) {
    db.update(cards)
      .set({ position: i })
      .where(eq(cards.id, remaining[i]!.id))
      .run()
  }

  return drawn
}

export function discardCards(playerId: string, cardIds: readonly string[]) {
  const db = getDb()
  const discardCount = getCardsByLocation(playerId, 'discard').length

  for (let i = 0; i < cardIds.length; i++) {
    db.update(cards)
      .set({ location: 'discard', position: discardCount + i })
      .where(and(eq(cards.id, cardIds[i]!), eq(cards.playerId, playerId)))
      .run()
  }
}

export function drawSpecificCard(playerId: string, cardId: string) {
  const deck = getCardsByLocation(playerId, 'deck')
  const { drawn, remaining } = drawSpecific(deck, cardId)

  if (!drawn) return null

  const db = getDb()
  const handCount = getCardsByLocation(playerId, 'hand').length

  db.update(cards)
    .set({ location: 'hand', position: handCount })
    .where(eq(cards.id, cardId))
    .run()

  for (let i = 0; i < remaining.length; i++) {
    db.update(cards)
      .set({ position: i })
      .where(eq(cards.id, remaining[i]!.id))
      .run()
  }

  return drawn
}

export function retrieveFromDiscard(playerId: string, cardId: string) {
  const db = getDb()
  const card = db.select().from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.playerId, playerId), eq(cards.location, 'discard')))
    .get()

  if (!card) return null

  const handCount = getCardsByLocation(playerId, 'hand').length
  db.update(cards)
    .set({ location: 'hand', position: handCount })
    .where(eq(cards.id, cardId))
    .run()

  return { ...card, metadata: JSON.parse(card.metadata) }
}

export function shufflePlayerDeck(playerId: string) {
  const deck = getCardsByLocation(playerId, 'deck')
  const shuffled = shuffleDeck(deck)
  const db = getDb()

  for (const card of shuffled) {
    db.update(cards)
      .set({ position: card.position })
      .where(eq(cards.id, card.id))
      .run()
  }
}

export function shuffleDiscardIntoDeck(playerId: string) {
  const db = getDb()
  const discardPile = getCardsByLocation(playerId, 'discard')
  const currentDeck = getCardsByLocation(playerId, 'deck')
  const basePos = currentDeck.length

  for (let i = 0; i < discardPile.length; i++) {
    db.update(cards)
      .set({ location: 'deck', position: basePos + i })
      .where(eq(cards.id, discardPile[i]!.id))
      .run()
  }

  shufflePlayerDeck(playerId)
}

export function insertCard(playerId: string, roomId: string, cardData: {
  name: string
  type?: string
  description?: string
  metadata?: Record<string, unknown>
  location: CardLocation
  position: number
}) {
  const db = getDb()
  const id = uuid()

  db.insert(cards).values({
    id,
    roomId,
    playerId,
    name: cardData.name,
    type: cardData.type || 'normal',
    description: cardData.description || '',
    metadata: JSON.stringify(cardData.metadata || {}),
    location: cardData.location,
    position: cardData.position,
    createdAt: Date.now(),
  }).run()

  return { id, ...cardData, metadata: cardData.metadata || {} }
}

export function transferCards(fromPlayerId: string, toPlayerId: string, cardIds: readonly string[]) {
  const db = getDb()
  const toHandCount = getCardsByLocation(toPlayerId, 'hand').length

  for (let i = 0; i < cardIds.length; i++) {
    db.update(cards)
      .set({ playerId: toPlayerId, location: 'hand', position: toHandCount + i })
      .where(and(eq(cards.id, cardIds[i]!), eq(cards.playerId, fromPlayerId)))
      .run()
  }
}

export function removeCard(cardId: string) {
  const db = getDb()
  db.delete(cards).where(eq(cards.id, cardId)).run()
}

export function getAllPlayerCards(playerId: string) {
  const db = getDb()
  return db.select().from(cards).where(eq(cards.playerId, playerId)).all()
    .map(c => ({ ...c, metadata: JSON.parse(c.metadata) }))
}
