import { useState, useEffect } from 'react'
import { useRoomStore } from '@/stores/room.store'
import { useCombatStore } from '@/stores/combat.store'
import { getSocket } from '@/lib/socket'
import { C2S, S2C } from 'shared'
import { cn } from '@/lib/cn'

interface CombatSnapshot {
  combatId: string
  roundNumber: number
  phase: string
  activePlayerId: string | null
  turnOrder: string[]
  isActive: boolean
  participants: Array<{ id: string; hp: number; hpMax: number; mp: number; mpMax: number; shield: number }>
}

export function CombatControl() {
  const players = useRoomStore((s) => s.players).filter(p => !p.isGm)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeCombats, setActiveCombats] = useState<CombatSnapshot[]>([])

  // Listen for combat state updates to track all combats
  useEffect(() => {
    const socket = getSocket()
    const handleUpdate = (data: CombatSnapshot) => {
      setActiveCombats(prev => {
        const idx = prev.findIndex(c => c.combatId === data.combatId)
        if (idx >= 0) {
          return prev.map((c, i) => i === idx ? data : c)
        }
        if (data.isActive) return [...prev, data]
        return prev
      })
    }
    const handleEnd = (data: { combatId: string }) => {
      setActiveCombats(prev => prev.filter(c => c.combatId !== data.combatId))
    }
    socket.on(S2C.COMBAT_STATE_UPDATE, handleUpdate)
    socket.on(S2C.COMBAT_ENDED, handleEnd)
    return () => {
      socket.off(S2C.COMBAT_STATE_UPDATE, handleUpdate)
      socket.off(S2C.COMBAT_ENDED, handleEnd)
    }
  }, [])

  const togglePlayer = (id: string) => {
    const next = new Set([...selectedIds].filter(x => x !== id))
    if (!selectedIds.has(id)) next.add(id)
    setSelectedIds(next)
  }

  // Players already in combat
  const busyPlayerIds = new Set(activeCombats.flatMap(c => c.turnOrder))

  const handleStart = () => {
    if (selectedIds.size < 2) return
    getSocket().emit(C2S.COMBAT_GM_START, { participantIds: Array.from(selectedIds) })
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Active combats */}
      {activeCombats.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-dark-200">进行中的战斗 ({activeCombats.length})</h3>
          {activeCombats.map(combat => (
            <CombatCard key={combat.combatId} combat={combat} players={players} />
          ))}
        </div>
      )}

      {/* Start new combat */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-dark-200">发起新战斗</h3>
        <p className="text-[10px] text-dark-400">选择至少2名空闲玩家</p>

        <div className="space-y-1">
          {players.map(p => {
            const busy = busyPlayerIds.has(p.id)
            return (
              <div
                key={p.id}
                onClick={() => !busy && togglePlayer(p.id)}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all',
                  busy ? 'opacity-40 cursor-not-allowed border-dark-600' :
                  selectedIds.has(p.id) ? 'bg-primary-600/20 border-primary-500 cursor-pointer' :
                  'bg-dark-700 border-dark-500 hover:border-dark-400 cursor-pointer',
                )}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-dark-100 flex-1">{p.displayName}</span>
                {busy && <span className="text-[10px] text-red-400">战斗中</span>}
                {!busy && <span className="text-[10px] text-dark-400">HP:{p.hp || '?'}</span>}
              </div>
            )
          })}
        </div>

        <button onClick={handleStart} disabled={selectedIds.size < 2} className="btn-primary btn-sm text-xs w-full">
          开始战斗 ({selectedIds.size}人)
        </button>
      </div>
    </div>
  )
}

function CombatCard({ combat, players }: { combat: CombatSnapshot; players: Array<{ id: string; displayName: string; color: string }> }) {
  const activePlayer = players.find(p => p.id === combat.activePlayerId)

  return (
    <div className="bg-dark-700 rounded-lg p-2.5 border border-dark-500 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-dark-400">#{combat.combatId.slice(0, 6)}</span>
          <span className="text-dark-300">第{combat.roundNumber}轮</span>
          <span className="text-dark-300">{combat.phase}</span>
          {activePlayer && (
            <span className="text-dark-100">{activePlayer.displayName} 行动中</span>
          )}
        </div>
      </div>

      {/* Participants */}
      <div className="space-y-0.5">
        {combat.participants.map(p => {
          const info = players.find(pl => pl.id === p.id)
          return (
            <div key={p.id} className="flex items-center gap-1.5 text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info?.color }} />
              <span className="text-dark-200 w-12 truncate">{info?.displayName}</span>
              <span className="text-red-400">{p.hp}/{p.hpMax}</span>
              <span className="text-blue-400">{p.mp}/{p.mpMax}</span>
              {p.shield > 0 && <span className="text-cyan-400">盾:{p.shield}</span>}
            </div>
          )
        })}
      </div>

      {/* GM controls */}
      <div className="flex gap-1">
        <button
          onClick={() => getSocket().emit(C2S.COMBAT_GM_NEXT_TURN, { combatId: combat.combatId })}
          className="btn-sm text-[10px] flex-1 bg-dark-600 text-dark-200 hover:bg-dark-500"
        >
          跳过回合
        </button>
        <button
          onClick={() => getSocket().emit(C2S.COMBAT_GM_END, { combatId: combat.combatId })}
          className="btn-sm text-[10px] flex-1 bg-red-900/50 text-red-300 hover:bg-red-900/70"
        >
          结束战斗
        </button>
      </div>
    </div>
  )
}
