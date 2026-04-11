import { z } from 'zod'

/** 角色内单个技能的 schema */
export const characterSkillDefSchema = z.object({
  name: z.string().min(1).max(50),
  skillClass: z.enum(['A', 'B']),
  rarity: z.enum(['normal', 'rare']),
  type: z.enum(['active', 'passive', 'triggered', 'card']),
  triggerTiming: z.string().optional(),
  description: z.string().min(1).max(500),
  cost: z.string().optional(),
  cardCount: z.number().int().min(0).optional(),
  cardColor: z.string().optional(),
})

/** 创建/编辑角色 schema（验证 4A+2B） */
export const createCharacterSchema = z.object({
  sourceName: z.string().min(1).max(100),
  skills: z.array(characterSkillDefSchema).length(6).refine(
    (skills) => {
      const aCount = skills.filter(s => s.skillClass === 'A').length
      const bCount = skills.filter(s => s.skillClass === 'B').length
      return aCount === 4 && bCount === 2
    },
    { message: '必须恰好4个A级技能和2个B级技能' },
  ),
})

/** 审核角色 schema */
export const reviewCharacterSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().max(500).optional(),
})

/** 创建包组 schema */
export const createPackGroupSchema = z.object({
  name: z.string().min(1).max(100),
  characterSourceNames: z.array(z.string().min(1)).length(4),
})

/** 更新包组 schema */
export const updatePackGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  characterSourceNames: z.array(z.string().min(1)).length(4).optional(),
})

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>
export type ReviewCharacterInput = z.infer<typeof reviewCharacterSchema>
export type CreatePackGroupInput = z.infer<typeof createPackGroupSchema>
