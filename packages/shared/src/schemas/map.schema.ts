import { z } from 'zod'

export const addRegionSchema = z.object({
  name: z.string().min(1).max(50),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  metadata: z.record(z.unknown()).default({}),
})

export const updateRegionSchema = z.object({
  regionId: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const setAdjacencySchema = z.object({
  fromRegionId: z.string().uuid(),
  toRegionId: z.string().uuid(),
  type: z.enum(['bidirectional', 'unidirectional', 'blocked']),
})

export const removeAdjacencySchema = z.object({
  fromRegionId: z.string().uuid(),
  toRegionId: z.string().uuid(),
})

export const movePlayerSchema = z.object({
  playerId: z.string().uuid(),
  regionId: z.string().uuid(),
})

export type AddRegionInput = z.infer<typeof addRegionSchema>
export type UpdateRegionInput = z.infer<typeof updateRegionSchema>
export type SetAdjacencyInput = z.infer<typeof setAdjacencySchema>
