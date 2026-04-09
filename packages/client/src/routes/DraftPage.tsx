import { useCallback } from 'react'
import { useDraftStore } from '@/stores/draft.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import type { SkillLibraryEntry } from 'shared'

function SkillCard({
  skill,
  onSelect,
  selected,
  keepToggle,
  isKept,
}: {
  skill: SkillLibraryEntry
  onSelect?: () => void
  selected?: boolean
  keepToggle?: () => void
  isKept?: boolean
}) {
  return (
    <div
      onClick={onSelect || keepToggle}
      className={`p-3 rounded border cursor-pointer transition-colors ${
        selected ? 'bg-blue-600/30 border-blue-500' :
        isKept ? 'bg-green-600/30 border-green-500' :
        'bg-gray-800 border-gray-700 hover:border-gray-500'
      }`}
    >
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-white">{skill.name}</span>
        <span className="text-xs text-gray-400">{skill.type}</span>
      </div>
      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{skill.description}</div>
      {skill.cost && (
        <div className="text-xs text-yellow-400 mt-1">
          {skill.cost.mp ? `${skill.cost.mp}MP` : ''}
          {skill.cost.hp ? ` ${skill.cost.hp}HP` : ''}
        </div>
      )}
      {skill.cooldown > 0 && (
        <span className="text-xs text-gray-500">CD{skill.cooldown}</span>
      )}
    </div>
  )
}

export function DraftPage() {
  const {
    phase, round, totalRounds, currentPack, selectedSkills,
    finalizedKeepIds, isFinalized, toggleKeepId,
  } = useDraftStore()

  const handlePick = useCallback((skillId: string) => {
    getSocket().emit(C2S.DRAFT_PICK, { skillId })
  }, [])

  const handleFinalize = useCallback(() => {
    getSocket().emit(C2S.DRAFT_FINALIZE, { keepIds: finalizedKeepIds })
  }, [finalizedKeepIds])

  if (isFinalized) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">轮抓完成</div>
          <div className="text-gray-400">已保留 {finalizedKeepIds.length} 个技能，等待其他组...</div>
        </div>
      </div>
    )
  }

  // 最终选择阶段：从10个中选7个
  if (phase === 'selecting') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold text-center">最终选择</h1>
          <p className="text-center text-gray-400">从 {selectedSkills.length} 个技能中保留 7 个</p>
          <p className="text-center text-sm text-yellow-400">
            已选 {finalizedKeepIds.length}/7
          </p>

          <div className="grid grid-cols-2 gap-2">
            {selectedSkills.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                keepToggle={() => toggleKeepId(skill.id)}
                isKept={finalizedKeepIds.includes(skill.id)}
              />
            ))}
          </div>

          <button
            onClick={handleFinalize}
            disabled={finalizedKeepIds.length !== 7}
            className="w-full py-3 rounded bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors font-medium"
          >
            确认保留 ({finalizedKeepIds.length}/7)
          </button>
        </div>
      </div>
    )
  }

  // 轮抓进行中
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">技能轮抓</h1>
          <span className="text-sm text-gray-400">第 {round}/{totalRounds} 轮</span>
        </div>

        <div className="text-sm text-gray-400">
          已选: {selectedSkills.length} 个 | 包中剩余: {currentPack.length} 个
        </div>

        {currentPack.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">从当前包中选择一个技能：</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentPack.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onSelect={() => handlePick(skill.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">等待其他组完成选取...</div>
        )}

        {selectedSkills.length > 0 && (
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">已选取的技能</h3>
            <div className="grid grid-cols-2 gap-2">
              {selectedSkills.map(skill => (
                <SkillCard key={skill.id} skill={skill} selected />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
