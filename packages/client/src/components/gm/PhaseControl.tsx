import { useGameStore } from '@/stores/game.store'
import { getSocket } from '@/lib/socket'
import { C2S, PHASE_LABELS, PHASE_ORDER } from 'shared'
import type { GamePhase } from 'shared'
import { cn } from '@/lib/cn'

export function PhaseControl() {
  const phase = useGameStore((s) => s.phase)
  const turnNumber = useGameStore((s) => s.turnNumber)

  const handleStart = () => getSocket().emit(C2S.GAME_START)
  const handleAdvance = () => getSocket().emit(C2S.GAME_PHASE_ADVANCE)
  const handleSetPhase = (p: GamePhase) => getSocket().emit(C2S.GAME_PHASE_SET, { phase: p })
  const handleNextAP = () => getSocket().emit(C2S.ACTION_NEXT_AP)
  const handleApproveAP = () => {
    const room = useGameStore.getState()
    getSocket().emit(C2S.ACTION_APPROVE, { actionPointIndex: room.currentActionPointIndex })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-dark-200">
          回合 <span className="text-amber-400 font-bold">{turnNumber}</span>
        </span>
        <span className="text-sm text-dark-200">
          当前: <span className="text-amber-400 font-bold">{PHASE_LABELS[phase]}</span>
        </span>
      </div>

      {/* Phase progression */}
      <div className="flex gap-1">
        {PHASE_ORDER.map((p) => (
          <button
            key={p}
            onClick={() => handleSetPhase(p)}
            className={cn(
              'flex-1 py-1.5 rounded text-[10px] font-medium transition-all',
              p === phase
                ? 'bg-amber-600 text-white'
                : 'bg-dark-500 text-dark-300 hover:bg-dark-400',
            )}
          >
            {PHASE_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {turnNumber === 0 && (
          <button onClick={handleStart} className="btn-sm bg-green-600 hover:bg-green-700 text-white text-xs col-span-2">
            开始游戏
          </button>
        )}
        <button onClick={handleAdvance} className="btn-sm btn-primary text-xs">
          下一阶段
        </button>
        {phase === 'action' && (
          <>
            <button onClick={handleApproveAP} className="btn-sm bg-green-600 hover:bg-green-700 text-white text-xs">
              批准当前行动
            </button>
            <button onClick={handleNextAP} className="btn-sm bg-amber-600 hover:bg-amber-700 text-white text-xs">
              下一行动点
            </button>
          </>
        )}
      </div>
    </div>
  )
}
