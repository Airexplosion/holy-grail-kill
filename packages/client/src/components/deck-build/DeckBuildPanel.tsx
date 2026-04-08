import { useState, useEffect } from 'react'
import { useDeckBuildStore } from '@/stores/deck-build.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import { StrikeCardSelector } from './StrikeCardSelector'
import { SkillSelector } from './SkillSelector'
import { DeckSummary } from './DeckSummary'
import { cn } from '@/lib/cn'

type SubTab = 'cards' | 'skills' | 'summary'

export function DeckBuildPanel() {
  const [subTab, setSubTab] = useState<SubTab>('cards')
  const skillLibrary = useDeckBuildStore((s) => s.skillLibrary)

  // Fetch skill library and current build on mount
  useEffect(() => {
    const socket = getSocket()
    socket.emit(C2S.SKILL_LIBRARY_GET)
    socket.emit(C2S.DECK_BUILD_GET)
  }, [])

  const tabs: { id: SubTab; label: string }[] = [
    { id: 'cards', label: '击牌' },
    { id: 'skills', label: '技能' },
    { id: 'summary', label: '总览' },
  ]

  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-dark-200">备战 - 卡组配置</h3>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0.5 bg-dark-700 rounded-lg p-0.5 mb-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={cn(
              'flex-1 text-xs py-1.5 rounded transition-colors',
              subTab === tab.id ? 'bg-dark-500 text-dark-50' : 'text-dark-300 hover:text-dark-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {subTab === 'cards' && <StrikeCardSelector />}
        {subTab === 'skills' && (
          skillLibrary.length > 0
            ? <SkillSelector />
            : <p className="text-dark-400 text-xs text-center py-4">加载技能库中...</p>
        )}
        {subTab === 'summary' && <DeckSummary />}
      </div>
    </div>
  )
}
