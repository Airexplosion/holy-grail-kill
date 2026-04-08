import { z } from 'zod'

export const registerSchema = z.object({
  username: z.string().min(2).max(20),
  password: z.string().min(4).max(50),
  displayName: z.string().min(1).max(20).optional(),
})

export const accountLoginSchema = z.object({
  username: z.string().min(1).max(20),
  password: z.string().min(1).max(50),
})

export const joinRoomSchema = z.object({
  roomCode: z.string().min(4).max(10),
  displayName: z.string().min(1).max(20).optional(),
})

// Legacy: still used for direct login with room code
export const loginSchema = z.object({
  accountName: z.string().min(1).max(20),
  roomCode: z.string().min(4).max(10),
  displayName: z.string().min(1).max(20).optional(),
})

export const updatePlayerStatsSchema = z.object({
  playerId: z.string().uuid(),
  hp: z.number().int().optional(),
  hpMax: z.number().int().positive().optional(),
  mp: z.number().int().optional(),
  mpMax: z.number().int().positive().optional(),
  actionPointsMax: z.number().int().min(0).optional(),
})

export const bindPlayersSchema = z.object({
  playerId1: z.string().uuid(),
  playerId2: z.string().uuid(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type AccountLoginInput = z.infer<typeof accountLoginSchema>
export type JoinRoomInput = z.infer<typeof joinRoomSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdatePlayerStatsInput = z.infer<typeof updatePlayerStatsSchema>
