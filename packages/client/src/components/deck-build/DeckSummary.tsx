import { useDeckBuildStore } from '@/stores/deck-build.store'
import { getSocket } from '@/lib/socket'
import { C2S, STRIKE_CARD_TOTAL, STRIKE_COLOR_LABELS, SKILL_SLOTS } from 'shared'
import { cn } from '@/lib/cn'

export function DeckSummary() {
  const strikeCards = useDeckBuildStore((s) => s.strikeCards)
  const selectedSkillIds = useDeckBuildStore((s) => s.selectedSkillIds)
  const isLocked = useDeckBuildStore((s) => s.isLocked)
  const validation = useDeckBuildStore((s) => s.validation)
  const skillLibrary = useDeckBuildStore((s) => s.skillLibrary)
  const deckBuildId = useDeckBuildStore((s) => s.deckBuildId)
  const shareCode = useDeckBuildStore((s) => s.shareCode)

  const total = strikeCards.red + strikeCards.blue + strikeCards.green
  const cardsValid = total === STRIKE_CARD_TOTAL
  const aCount = selectedSkillIds.filter(id => skillLibrary.find(s => s.id === id)?.skillClass === 'A').length
  const bCount = selectedSkillIds.filter(id => skillLibrary.find(s => s.id === id)?.skillClass === 'B').length
  const skillsValid = aCount === SKILL_SLOTS.A && bCount === SKILL_SLOTS.B
  const allValid = cardsValid && skillsValid

  const handleSubmitAndLock = () => {
    getSocket().emit(C2S.DECK_BUILD_SUBMIT, { strikeCards, skillIds: selectedSkillIds })
    setTimeout(() => getSocket().emit(C2S.DECK_BUILD_LOCK), 200)
  }

  const handleSubmit = () => {
    getSocket().emit(C2S.DECK_BUILD_SUBMIT, { strikeCards, skillIds: selectedSkillIds })
  }

  const handleShare = () => {
    if (deckBuildId) {
      getSocket().emit(C2S.DECK_SHARE_CREATE, { deckBuildId })
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-dark-200">配置总览</h4>

      {/* Strike card summary */}
      <div className="bg-dark-700 rounded-lg p-2.5 space-y-1.5">
        <div className="text-xs text-dark-300">击牌配置</div>
        <div className="flex gap-3">
          {(['red', 'blue', 'green'] as const).map(color => (
            <div key={color} className="flex items-center gap-1 text-xs">
              <div className={cn(
                'w-2 h-2 rounded-full',
                color === 'red' ? 'bg-red-500' : color === 'blue' ? 'bg-blue-500' : 'bg-green-500',
              )} />
              <span className="text-dark-100">{STRIKE_COLOR_LABELS[color]}: {strikeCards[color]}</span>
            </div>
          ))}
        </div>
        <div className={cn('text-[10px]', cardsValid ? 'text-green-400' : 'text-red-400')}>
          {total}/{STRIKE_CARD_TOTAL} {cardsValid ? '✓' : '未完成'}
        </div>
      </div>

      {/* Skills summary */}
      <div className="bg-dark-700 rounded-lg p-2.5 space-y-1.5">
        <div className="text-xs text-dark-300">技能配置</div>
        {selectedSkillIds.length === 0 ? (
          <p className="text-[10px] text-dark-400">未选择技能</p>
        ) : (
          <div className="space-y-0.5">
            {selectedSkillIds.map(id => {
              const skill = skillLibrary.find(s => s.id === id)
              return skill ? (
                <div key={id} className="text-xs text-dark-100 flex gap-1">
                  <span className={cn(
                    'text-[10px] px-1 rounded',
                    skill.skillClass === 'A' ? 'bg-primary-900/50 text-primary-300' : 'bg-amber-900/50 text-amber-300',
                  )}>
                    {skill.skillClass}
                  </span>
                  {skill.name}
                </div>
              ) : null
            })}
          </div>
        )}
        <div className={cn('text-[10px]', skillsValid ? 'text-green-400' : 'text-red-400')}>
          A级: {aCount}/{SKILL_SLOTS.A} | B级: {bCount}/{SKILL_SLOTS.B} {skillsValid ? '✓' : '未完成'}
        </div>
      </div>

      {/* Validation errors */}
      {validation && !validation.valid && (
        <div className="bg-red-900/20 rounded-lg p-2 space-y-0.5">
          {validation.errors.map((err, i) => (
            <p key={i} className="text-[10px] text-red-400">{err}</p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-1.5">
        {isLocked ? (
          <div className="text-center py-2">
            <p className="text-green-400 text-sm font-medium">配置已锁定</p>
            <p className="text-dark-400 text-[10px]">等待GM开始战斗</p>
          </div>
        ) : (
          <>
            <button onClick={handleSubmit} className="btn-secondary btn-sm text-xs w-full">
              保存配置
            </button>
            <button
              onClick={handleSubmitAndLock}
              disabled={!allValid}
              className="btn-primary btn-sm text-xs w-full"
            >
              锁定配置
            </button>
          </>
        )}
        {deckBuildId && (
          <button onClick={handleShare} className="btn-sm text-xs w-full bg-dark-500 text-dark-200 hover:bg-dark-400">
            分享配置
          </button>
        )}
        {shareCode && (
          <div className="text-center text-xs text-dark-300">
            分享码: <span className="font-mono text-primary-400">{shareCode}</span>
          </div>
        )}
      </div>
    </div>
  )
}
