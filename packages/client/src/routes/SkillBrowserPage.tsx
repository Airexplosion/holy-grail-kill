import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SKILL_LIBRARY, SKILL_CLASS_LABELS, SKILL_RARITY_LABELS } from 'shared'
import type { SkillLibraryEntry } from 'shared'
import { cn } from '@/lib/cn'

/** Group skills by character (flavorText). Skills without flavorText go under "通用技能". */
function buildCharacterMap(skills: readonly SkillLibraryEntry[]): Map<string, SkillLibraryEntry[]> {
  const map = new Map<string, SkillLibraryEntry[]>()
  for (const skill of skills) {
    const key = skill.flavorText ?? '通用技能'
    const list = map.get(key)
    if (list) {
      list.push(skill)
    } else {
      map.set(key, [skill])
    }
  }
  return map
}

export function SkillBrowserPage() {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)

  const characterMap = useMemo(() => buildCharacterMap(SKILL_LIBRARY), [])

  const characterNames = useMemo(() => [...characterMap.keys()], [characterMap])

  const filteredCharacters = useMemo(() => {
    if (!searchText.trim()) return characterNames
    const q = searchText.trim().toLowerCase()
    return characterNames.filter((name) => {
      if (name.toLowerCase().includes(q)) return true
      const skills = characterMap.get(name)
      return skills?.some((s) => s.name.toLowerCase().includes(q)) ?? false
    })
  }, [searchText, characterNames, characterMap])

  // Auto-select first character when filtered list changes
  const effectiveSelected = useMemo(() => {
    if (selectedCharacter && filteredCharacters.includes(selectedCharacter)) {
      return selectedCharacter
    }
    return filteredCharacters[0] ?? null
  }, [selectedCharacter, filteredCharacters])

  const displaySkills = useMemo(() => {
    if (!effectiveSelected) return []
    return characterMap.get(effectiveSelected) ?? []
  }, [effectiveSelected, characterMap])

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      {/* Header */}
      <header className="bg-dark-700 border-b border-dark-400 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary-400">技能图鉴</h1>
          <span className="text-dark-300 text-sm">
            共 {characterNames.length} 名角色 / {SKILL_LIBRARY.length} 个技能
          </span>
        </div>
        <button
          onClick={() => navigate('/lobby')}
          className="btn-sm text-xs bg-dark-500 hover:bg-dark-400 text-dark-50"
        >
          返回大厅
        </button>
      </header>

      {/* Search */}
      <div className="bg-dark-700 border-b border-dark-400 px-6 py-3">
        <input
          className="input w-full max-w-md"
          placeholder="搜索角色名或技能名..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Character list */}
        <aside className="w-64 shrink-0 bg-dark-700 border-r border-dark-400 overflow-y-auto">
          {filteredCharacters.length === 0 ? (
            <p className="text-dark-400 text-sm text-center py-8">无匹配角色</p>
          ) : (
            <ul className="py-2">
              {filteredCharacters.map((name) => {
                const skills = characterMap.get(name) ?? []
                const aCount = skills.filter((s) => s.skillClass === 'A').length
                const bCount = skills.filter((s) => s.skillClass === 'B').length
                return (
                  <li key={name}>
                    <button
                      onClick={() => setSelectedCharacter(name)}
                      className={cn(
                        'w-full text-left px-4 py-3 transition-colors',
                        effectiveSelected === name
                          ? 'bg-primary-900/40 text-primary-300 border-l-2 border-primary-400'
                          : 'text-dark-200 hover:bg-dark-600 border-l-2 border-transparent',
                      )}
                    >
                      <div className="font-medium text-sm truncate">{name}</div>
                      <div className="text-xs text-dark-400 mt-0.5">
                        {aCount > 0 && <span>技能x{aCount}</span>}
                        {aCount > 0 && bCount > 0 && <span className="mx-1">/</span>}
                        {bCount > 0 && <span>宝具x{bCount}</span>}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* Right: Skill details */}
        <main className="flex-1 overflow-y-auto p-6">
          {!effectiveSelected ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-dark-400 text-lg">选择一个角色查看技能详情</p>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-dark-50 mb-4">{effectiveSelected}</h2>
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {displaySkills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function SkillCard({ skill }: { skill: SkillLibraryEntry }) {
  const classLabel = SKILL_CLASS_LABELS[skill.skillClass]
  const rarityLabel = SKILL_RARITY_LABELS[skill.rarity]

  const classBadgeColor =
    skill.skillClass === 'A'
      ? 'bg-blue-900/60 text-blue-300'
      : 'bg-amber-900/60 text-amber-300'

  const rarityBadgeColor =
    skill.rarity === 'rare'
      ? 'bg-purple-900/60 text-purple-300'
      : 'bg-dark-500 text-dark-200'

  return (
    <div className="bg-dark-600 border border-dark-400 rounded-xl p-4">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-dark-50">{skill.name}</span>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', classBadgeColor)}>
          {classLabel}
        </span>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', rarityBadgeColor)}>
          {rarityLabel}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-2 text-xs text-dark-300 mb-3">
        {skill.cost?.mp && <span>MP: {skill.cost.mp}</span>}
        {skill.cost?.hp && <span>HP: {skill.cost.hp}</span>}
        {skill.cooldown > 0 && <span>CD: {skill.cooldown}回合</span>}
        {skill.targetType && <span>目标: {targetLabel(skill.targetType)}</span>}
        {skill.tags && skill.tags.length > 0 && (
          skill.tags.map((tag) => (
            <span key={tag} className="bg-dark-500 px-1.5 py-0.5 rounded text-dark-200">
              {tag}
            </span>
          ))
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-dark-100 leading-relaxed">{skill.description}</p>
    </div>
  )
}

function targetLabel(t: string): string {
  switch (t) {
    case 'self': return '自身'
    case 'single': return '单体'
    case 'area': return '区域'
    case 'global': return '全场'
    default: return t
  }
}
