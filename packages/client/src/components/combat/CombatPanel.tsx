import { useCombatStore } from '@/stores/combat.store'
import { useRoomStore } from '@/stores/room.store'
import { CombatTurnIndicator } from './CombatTurnIndicator'
import { PlayChainDisplay } from './PlayChainDisplay'
import { CombatActionBar } from './CombatActionBar'
import { CombatLog } from './CombatLog'
import { cn } from '@/lib/cn'

export function CombatPanel() {
  const participants = useCombatStore((s) => s.participants)
  const activePlayerId = useCombatStore((s) => s.activePlayerId)
  const players = useRoomStore((s) => s.players)

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Turn indicator */}
      <CombatTurnIndicator />

      {/* Participant HP bars */}
      <div className="space-y-1.5">
        {participants.map(p => {
          const info = players.find(pl => pl.id === p.id)
          const hpPct = p.hpMax > 0 ? (p.hp / p.hpMax) * 100 : 0
          const mpPct = p.mpMax > 0 ? (p.mp / p.mpMax) * 100 : 0
          const isActive = p.id === activePlayerId
          return (
            <div key={p.id} className={cn('bg-dark-700 rounded-lg px-2.5 py-1.5 border', isActive ? 'border-amber-500/50' : 'border-dark-500')}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: info?.color || '#666' }} />
                  <span className="text-xs text-dark-100 font-medium">{info?.displayName || p.id}</span>
                </div>
                <div className="flex gap-2 text-[10px]">
                  {p.shield > 0 && <span className="text-cyan-400">盾:{p.shield}</span>}
                  <span className="text-red-400">{p.hp}/{p.hpMax}</span>
                  <span className="text-blue-400">{p.mp}/{p.mpMax}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <div className="flex-1 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${hpPct}%` }} />
                </div>
                <div className="w-8 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${mpPct}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Play chain */}
      <div className="card flex-1 min-h-0 overflow-y-auto">
        <h4 className="text-[10px] text-dark-400 uppercase tracking-wider mb-1">出牌链</h4>
        <PlayChainDisplay />
      </div>

      {/* Action bar */}
      <CombatActionBar />

      {/* Combat log */}
      <div className="card">
        <CombatLog />
      </div>
    </div>
  )
}
