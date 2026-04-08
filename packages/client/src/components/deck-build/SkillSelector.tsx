import { useState } from 'react'
import { useDeckBuildStore } from '@/stores/deck-build.store'
import { SKILL_SLOTS } from 'shared'
import type { SkillClass } from 'shared'
import { SkillCard } from './SkillCard'
import { cn } from '@/lib/cn'

export function SkillSelector() {
  const skillLibrary = useDeckBuildStore((s) => s.skillLibrary)
  const selectedSkillIds = useDeckBuildStore((s) => s.selectedSkillIds)
  const isLocked = useDeckBuildStore((s) => s.isLocked)
  const toggleSkill = useDeckBuildStore((s) => s.toggleSkill)
  const [viewClass, setViewClass] = useState<SkillClass>('A')

  const aClassSelected = selectedSkillIds.filter(id =>
    skillLibrary.find(s => s.id === id)?.skillClass === 'A',
  ).length
  const bClassSelected = selectedSkillIds.filter(id =>
    skillLibrary.find(s => s.id === id)?.skillClass === 'B',
  ).length

  const filteredSkills = skillLibrary.filter(s => s.skillClass === viewClass)

  const currentCount = viewClass === 'A' ? aClassSelected : bClassSelected
  const maxCount = viewClass === 'A' ? SKILL_SLOTS.A : SKILL_SLOTS.B
  const isFull = currentCount >= maxCount

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-dark-200">技能选择</h4>
        <div className="flex gap-2 text-[10px]">
          <span className={aClassSelected === SKILL_SLOTS.A ? 'text-green-400' : 'text-dark-300'}>
            A级: {aClassSelected}/{SKILL_SLOTS.A}
          </span>
          <span className={bClassSelected === SKILL_SLOTS.B ? 'text-green-400' : 'text-dark-300'}>
            B级: {bClassSelected}/{SKILL_SLOTS.B}
          </span>
        </div>
      </div>

      {/* Selected skills chips */}
      {selectedSkillIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedSkillIds.map(id => {
            const skill = skillLibrary.find(s => s.id === id)
            if (!skill) return null
            return (
              <span
                key={id}
                onClick={() => !isLocked && toggleSkill(id, skill.skillClass)}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  skill.skillClass === 'A' ? 'bg-primary-600/30 text-primary-300' : 'bg-amber-600/30 text-amber-300',
                  !isLocked && 'cursor-pointer hover:opacity-80',
                )}
              >
                {skill.name} x
              </span>
            )
          })}
        </div>
      )}

      {/* Class tabs */}
      <div className="flex gap-0.5 bg-dark-700 rounded-lg p-0.5">
        {(['A', 'B'] as SkillClass[]).map(cls => (
          <button
            key={cls}
            onClick={() => setViewClass(cls)}
            className={cn(
              'flex-1 text-xs py-1.5 rounded transition-colors',
              viewClass === cls ? 'bg-dark-500 text-dark-50' : 'text-dark-300 hover:text-dark-100',
            )}
          >
            {cls}级技能
          </button>
        ))}
      </div>

      {/* Skill list */}
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {filteredSkills.map(skill => {
          const isSelected = selectedSkillIds.includes(skill.id)
          const isDisabled = isLocked || (!isSelected && isFull)
          return (
            <SkillCard
              key={skill.id}
              skill={skill}
              selected={isSelected}
              disabled={isDisabled}
              onToggle={() => toggleSkill(skill.id, skill.skillClass)}
            />
          )
        })}
      </div>
    </div>
  )
}
