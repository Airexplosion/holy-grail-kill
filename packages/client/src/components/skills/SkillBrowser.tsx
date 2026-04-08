import { useState } from 'react'
import { useDeckBuildStore } from '@/stores/deck-build.store'
import type { SkillClass, SkillRarity } from 'shared'
import { SkillCard } from '@/components/deck-build/SkillCard'
import { cn } from '@/lib/cn'

interface SkillBrowserProps {
  readonly onClose: () => void
}

export function SkillBrowser({ onClose }: SkillBrowserProps) {
  const skillLibrary = useDeckBuildStore((s) => s.skillLibrary)
  const [filterClass, setFilterClass] = useState<SkillClass | 'all'>('all')
  const [filterRarity, setFilterRarity] = useState<SkillRarity | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = skillLibrary.filter(s => {
    if (filterClass !== 'all' && s.skillClass !== filterClass) return false
    if (filterRarity !== 'all' && s.rarity !== filterRarity) return false
    if (search && !s.name.includes(search) && !s.description.includes(search)) return false
    return true
  })

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-400">
          <h3 className="text-sm font-medium text-dark-100">技能图鉴</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200 text-xs">关闭</button>
        </div>

        {/* Filters */}
        <div className="px-4 py-2 border-b border-dark-400 space-y-2">
          <input
            className="input text-xs w-full"
            placeholder="搜索技能名称或描述..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2">
            <div className="flex gap-0.5 bg-dark-600 rounded p-0.5">
              {(['all', 'A', 'B'] as const).map(cls => (
                <button
                  key={cls}
                  onClick={() => setFilterClass(cls)}
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded',
                    filterClass === cls ? 'bg-dark-400 text-dark-50' : 'text-dark-300',
                  )}
                >
                  {cls === 'all' ? '全部' : `${cls}级`}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5 bg-dark-600 rounded p-0.5">
              {(['all', 'normal', 'rare'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRarity(r)}
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded',
                    filterRarity === r ? 'bg-dark-400 text-dark-50' : 'text-dark-300',
                  )}
                >
                  {r === 'all' ? '全部' : r === 'normal' ? '普通' : '稀有'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Skill list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-dark-400 text-xs text-center py-4">无匹配技能</p>
          ) : (
            filtered.map(skill => (
              <SkillCard key={skill.id} skill={skill} />
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-dark-400 text-[10px] text-dark-400 text-center">
          共 {filtered.length} / {skillLibrary.length} 个技能
        </div>
      </div>
    </div>
  )
}
