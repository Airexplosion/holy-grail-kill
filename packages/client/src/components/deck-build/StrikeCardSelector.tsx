import { useDeckBuildStore } from '@/stores/deck-build.store'
import { STRIKE_CARD_TOTAL, STRIKE_COLOR_LABELS } from 'shared'
import type { StrikeColor } from 'shared'
import { cn } from '@/lib/cn'

const COLORS: { key: StrikeColor; bg: string; ring: string }[] = [
  { key: 'red', bg: 'bg-red-900/30', ring: 'ring-red-500' },
  { key: 'blue', bg: 'bg-blue-900/30', ring: 'ring-blue-500' },
  { key: 'green', bg: 'bg-green-900/30', ring: 'ring-green-500' },
]

export function StrikeCardSelector() {
  const strikeCards = useDeckBuildStore((s) => s.strikeCards)
  const isLocked = useDeckBuildStore((s) => s.isLocked)
  const setCount = useDeckBuildStore((s) => s.setStrikeColorCount)
  const total = strikeCards.red + strikeCards.blue + strikeCards.green
  const isValid = total === STRIKE_CARD_TOTAL

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-dark-200">击牌配置</h4>
        <span className={cn(
          'text-sm font-mono font-bold',
          isValid ? 'text-green-400' : 'text-red-400',
        )}>
          {total}/{STRIKE_CARD_TOTAL}
        </span>
      </div>

      <p className="text-[10px] text-dark-400">
        红击攻击可被蓝击响应 / 蓝击攻击可被绿击响应 / 绿击攻击可被红击响应
      </p>

      <div className="space-y-2">
        {COLORS.map(({ key, bg, ring }) => (
          <div key={key} className={cn('rounded-lg p-2.5', bg)}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-dark-100">
                {STRIKE_COLOR_LABELS[key]}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={isLocked || strikeCards[key] <= 0}
                  onClick={() => setCount(key, strikeCards[key] - 1)}
                  className="w-6 h-6 rounded bg-dark-600 text-dark-100 text-xs hover:bg-dark-500 disabled:opacity-30"
                >
                  -
                </button>
                <input
                  type="number"
                  disabled={isLocked}
                  min={0}
                  max={STRIKE_CARD_TOTAL}
                  value={strikeCards[key]}
                  onChange={(e) => setCount(key, parseInt(e.target.value) || 0)}
                  className={cn('w-12 text-center text-sm font-mono bg-dark-700 rounded py-0.5 ring-1', ring)}
                />
                <button
                  disabled={isLocked || total >= STRIKE_CARD_TOTAL}
                  onClick={() => setCount(key, strikeCards[key] + 1)}
                  className="w-6 h-6 rounded bg-dark-600 text-dark-100 text-xs hover:bg-dark-500 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isValid && total > 0 && (
        <p className="text-[10px] text-red-400">
          {total > STRIKE_CARD_TOTAL ? `超出${total - STRIKE_CARD_TOTAL}张` : `还需选择${STRIKE_CARD_TOTAL - total}张`}
        </p>
      )}
    </div>
  )
}
