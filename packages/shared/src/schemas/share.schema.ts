import { z } from 'zod'

export const shareDeckBuildSchema = z.object({
  deckBuildId: z.string().uuid(),
})

export const getSharedBuildSchema = z.object({
  shareCode: z.string().min(4).max(16),
})
