import type { SkillLibraryEntry } from 'shared'
import { SKILL_TYPE_LABELS, SKILL_CLASS_LABELS, SKILL_RARITY_LABELS } from 'shared'
import { cn } from '@/lib/cn'

interface SkillCardProps {
  readonly skill: SkillLibraryEntry
  readonly selected?: boolean
  readonly disabled?: boolean
  readonly compact?: boolean
  readonly onToggle?: (id: string) => void
}

const RARITY_STYLES: Record<string, string> = {
  normal: 'bg-dark-500 text-dark-200',
  rare: 'bg-amber-900/50 text-amber-300',
}

const TYPE_STYLES: Record<string, string> = {
  active: 'text-blue-400',
  passive: 'text-green-400',
  triggered: 'text-purple-400',
}

export function SkillCard({ skill, selected, disabled, compact, onToggle }: SkillCardProps) {
  return (
    <div
      onClick={() => !disabled && onToggle?.(skill.id)}
      className={cn(
        'rounded-lg border transition-all text-xs',
        onToggle && !disabled ? 'cursor-pointer' : '',
        disabled ? 'opacity-50' : '',
        selected
          ? 'bg-primary-600/20 border-primary-500'
          : 'bg-dark-600 border-dark-400 hover:border-dark-300',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-dark-50">{skill.name}</span>
        <span className={cn('text-[10px] px-1 rounded', RARITY_STYLES[skill.rarity])}>
          {SKILL_RARITY_LABELS[skill.rarity]}
        </span>
        <span className={cn('text-[10px]', TYPE_STYLES[skill.type])}>
          {SKILL_TYPE_LABELS[skill.type]}
        </span>
        <span className="text-[10px] text-dark-400 ml-auto">
          {SKILL_CLASS_LABELS[skill.skillClass]}
        </span>
      </div>
      {!compact && (
        <div className="mt-1 space-y-0.5">
          <p className="text-dark-300">{skill.description}</p>
          <div className="flex gap-2 text-[10px] text-dark-400">
            {skill.cost?.mp && <span>MP: {skill.cost.mp}</span>}
            {skill.cooldown > 0 && <span>CD: {skill.cooldown}回合</span>}
            {skill.charges && <span>次数: {skill.charges}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
