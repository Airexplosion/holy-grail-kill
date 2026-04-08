import { z } from 'zod'

export const skillTemplateSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['active', 'passive', 'triggered']),
  defaultCooldown: z.number().int().min(0).default(0),
  defaultCharges: z.number().int().min(1).nullable().default(null),
  description: z.string().default(''),
  metadata: z.record(z.unknown()).default({}),
})

export const assignSkillSchema = z.object({
  playerId: z.string().uuid(),
  templateId: z.string().uuid(),
  overrides: z.object({
    cooldown: z.number().int().min(0).optional(),
    charges: z.number().int().min(1).nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
})

export const useSkillSchema = z.object({
  skillId: z.string().uuid(),
  targetId: z.string().uuid().optional(),
  params: z.record(z.unknown()).optional(),
})

export const modifySkillSchema = z.object({
  playerId: z.string().uuid(),
  skillId: z.string().uuid(),
  enabled: z.boolean().optional(),
  cooldownRemaining: z.number().int().min(0).optional(),
  charges: z.number().int().min(0).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type SkillTemplateInput = z.infer<typeof skillTemplateSchema>
export type AssignSkillInput = z.infer<typeof assignSkillSchema>
export type UseSkillInput = z.infer<typeof useSkillSchema>
