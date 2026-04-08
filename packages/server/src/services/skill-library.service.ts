import * as adminLibrary from './admin-library.service.js'
import type { SkillLibraryEntry, SkillClass, SkillRarity } from 'shared'

/** Get all enabled skills (DB overrides constants) */
export function getAllSkills(): readonly SkillLibraryEntry[] {
  return adminLibrary.getAllSkills()
}

export function getSkillById(id: string): SkillLibraryEntry | undefined {
  return adminLibrary.getAllSkills().find(s => s.id === id)
}

export function getSkillsByClass(skillClass: SkillClass): readonly SkillLibraryEntry[] {
  return adminLibrary.getAllSkills().filter(s => s.skillClass === skillClass)
}

export function getSkillsByRarity(rarity: SkillRarity): readonly SkillLibraryEntry[] {
  return adminLibrary.getAllSkills().filter(s => s.rarity === rarity)
}

export function searchSkills(query: string): readonly SkillLibraryEntry[] {
  const q = query.toLowerCase()
  return adminLibrary.getAllSkills().filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q),
  )
}
