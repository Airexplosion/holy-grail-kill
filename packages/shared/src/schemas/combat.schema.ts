import { z } from 'zod'

export const combatPlayStrikeSchema = z.object({
  cardColor: z.enum(['red', 'blue', 'green']),
  targetId: z.string().uuid(),
})

export const combatUseSkillSchema = z.object({
  skillId: z.string(),
  targetId: z.string().uuid().optional(),
  params: z.record(z.unknown()).optional(),
})

export const combatRespondSchema = z.object({
  cardColor: z.enum(['red', 'blue', 'green']).optional(),
  skillId: z.string().optional(),
})

export const combatPassSchema = z.object({})

export const combatGmStartSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(2),
})
