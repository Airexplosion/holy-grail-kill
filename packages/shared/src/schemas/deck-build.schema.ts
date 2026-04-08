import { z } from 'zod'

export const submitDeckBuildSchema = z.object({
  strikeCards: z.object({
    red: z.number().int().min(0),
    blue: z.number().int().min(0),
    green: z.number().int().min(0),
  }),
  skillIds: z.array(z.string()).min(1).max(6),
})

export const lockDeckBuildSchema = z.object({
  playerId: z.string().uuid().optional(),
})

export type SubmitDeckBuildInput = z.infer<typeof submitDeckBuildSchema>
