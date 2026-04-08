import { z } from 'zod'

export const cardDrawSchema = z.object({
  count: z.number().int().min(1).max(50),
})

export const cardDiscardSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(1),
})

export const cardDrawSpecificSchema = z.object({
  cardId: z.string().uuid(),
})

export const cardRetrieveDiscardSchema = z.object({
  cardId: z.string().uuid(),
})

export const cardInsertSchema = z.object({
  playerId: z.string().uuid(),
  name: z.string().min(1),
  type: z.string().default('normal'),
  description: z.string().default(''),
  metadata: z.record(z.unknown()).default({}),
  location: z.enum(['deck', 'hand', 'discard']),
  position: z.number().int().min(0),
})

export const cardTransferSchema = z.object({
  fromPlayerId: z.string().uuid(),
  toPlayerId: z.string().uuid(),
  cardIds: z.array(z.string().uuid()).min(1),
})

export const cardGmViewSchema = z.object({
  playerId: z.string().uuid(),
  location: z.enum(['deck', 'hand', 'discard']).optional(),
})

export const cardGmRemoveSchema = z.object({
  cardId: z.string().uuid(),
})
