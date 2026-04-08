import { z } from 'zod'

export const submitActionSchema = z.object({
  actionType: z.enum(['move_adjacent', 'move_designated', 'scout', 'place_outpost', 'destroy_outpost', 'consume']),
  payload: z.union([
    z.object({ targetRegionId: z.string().uuid(), targetOutpostId: z.string().uuid() }),
    z.object({ targetRegionId: z.string().uuid() }),
    z.object({ regionId: z.string().uuid() }),
    z.object({}),
  ]),
})

export const approveActionSchema = z.object({
  actionPointIndex: z.number().int().min(1),
})

export const rejectActionSchema = z.object({
  actionPointIndex: z.number().int().min(1),
  reason: z.string().optional(),
})

export type SubmitActionInput = z.infer<typeof submitActionSchema>
