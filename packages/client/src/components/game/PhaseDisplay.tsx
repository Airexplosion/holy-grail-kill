import { useGameStore } from '@/stores/game.store'
import { PHASE_LABELS, PHASE_ORDER } from 'shared'
import { cn } from '@/lib/cn'

export function PhaseDisplay() {
  const phase = useGameStore((s) => s.phase)
  const turnNumber = useGameStore((s) => s.turnNumber)

  return (
    <div className="flex items-center gap-4">
      <span className="text-dark-200 text-sm">
        第 <span className="text-primary-400 font-bold">{turnNumber}</span> 回合
      </span>
      <div className="flex items-center gap-1">
        {PHASE_ORDER.map((p) => (
          <div
            key={p}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-all',
              p === phase
                ? 'bg-primary-600 text-white scale-105'
                : 'bg-dark-600 text-dark-300',
            )}
          >
            {PHASE_LABELS[p]}
          </div>
        ))}
      </div>
    </div>
  )
}
