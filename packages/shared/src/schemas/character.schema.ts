import { z } from 'zod'

const rankEnum = z.enum(['E', 'D', 'C', 'B', 'A', 'A+', 'A++'])

export const allocateServantAttributesSchema = z.object({
  str: rankEnum,
  end: rankEnum,
  agi: rankEnum,
  mag: rankEnum,
  luk: rankEnum,
})

export const allocateMasterAttributesSchema = z.object({
  str: rankEnum,
  end: rankEnum,
  mag: rankEnum,
  actionPower: rankEnum,
})

export const selectClassSchema = z.object({
  classId: z.string(),
})

export const selectArchetypeSchema = z.object({
  archetypeId: z.string(),
})

export const selectTacticalStyleSchema = z.object({
  color: z.enum(['red', 'blue', 'green']),
})

export type AllocateServantAttributesInput = z.infer<typeof allocateServantAttributesSchema>
export type AllocateMasterAttributesInput = z.infer<typeof allocateMasterAttributesSchema>
export type SelectClassInput = z.infer<typeof selectClassSchema>
export type SelectArchetypeInput = z.infer<typeof selectArchetypeSchema>
export type SelectTacticalStyleInput = z.infer<typeof selectTacticalStyleSchema>
