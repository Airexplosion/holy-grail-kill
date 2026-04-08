import { z } from 'zod'

export const createRoomSchema = z.object({
  name: z.string().min(1).max(50),
  accountName: z.string().min(1).max(20),
  displayName: z.string().min(1).max(20).optional(),
})

export const roomConfigSchema = z.object({
  maxOutpostsPerPlayer: z.number().int().min(0).max(20).optional(),
  defaultActionPoints: z.number().int().min(1).max(20).optional(),
  defaultHp: z.number().int().min(1).optional(),
  defaultHpMax: z.number().int().min(1).optional(),
  defaultMp: z.number().int().min(0).optional(),
  defaultMpMax: z.number().int().min(0).optional(),
  minPlayers: z.number().int().min(2).max(28).optional(),
  maxPlayers: z.number().int().min(7).max(28).optional(),
  customRules: z.record(z.unknown()).optional(),
})

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type RoomConfigInput = z.infer<typeof roomConfigSchema>
