import { useCombatStore } from '@/stores/combat.store'
import { useRoomStore } from '@/stores/room.store'
import { cn } from '@/lib/cn'

const PHASE_LABELS: Record<string, string> = {
  play: '出牌',
  respond: '响应',
  resolve: '结算中',
  end_turn: '回合结束',
}

export function CombatTurnIndicator() {
  const roundNumber = useCombatStore((s) => s.roundNumber)
  const phase = useCombatStore((s) => s.phase)
  const activePlayerId = useCombatStore((s) => s.activePlayerId)
  const players = useRoomStore((s) => s.players)

  const activePlayer = players.find(p => p.id === activePlayerId)

  return (
    <div className="bg-dark-700 rounded-lg px-3 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xs text-dark-400">第 <span className="text-dark-100 font-mono">{roundNumber}</span> 轮</span>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded font-medium',
          phase === 'play' ? 'bg-blue-900/50 text-blue-300' :
          phase === 'respond' ? 'bg-amber-900/50 text-amber-300' :
          phase === 'resolve' ? 'bg-red-900/50 text-red-300' :
          'bg-dark-500 text-dark-300',
        )}>
          {PHASE_LABELS[phase] || phase}
        </span>
      </div>
      {activePlayer && (
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activePlayer.color }} />
          <span className="text-xs text-dark-100 font-medium">{activePlayer.displayName}</span>
          <span className="text-[10px] text-dark-400">行动中</span>
        </div>
      )}
    </div>
  )
}
