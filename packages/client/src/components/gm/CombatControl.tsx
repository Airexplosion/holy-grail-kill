import { useState } from 'react'
import { useRoomStore } from '@/stores/room.store'
import { useCombatStore } from '@/stores/combat.store'
import { useDeckBuildStore } from '@/stores/deck-build.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import { cn } from '@/lib/cn'

export function CombatControl() {
  const players = useRoomStore((s) => s.players).filter(p => !p.isGm)
  const isInCombat = useCombatStore((s) => s.isInCombat)
  const roundNumber = useCombatStore((s) => s.roundNumber)
  const activePlayerId = useCombatStore((s) => s.activePlayerId)
  const phase = useCombatStore((s) => s.phase)
  const participants = useCombatStore((s) => s.participants)
  const combatLog = useCombatStore((s) => s.combatLog)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const togglePlayer = (id: string) => {
    const next = new Set([...selectedIds].filter(x => x !== id))
    if (!selectedIds.has(id)) next.add(id)
    setSelectedIds(next)
  }

  const handleStart = () => {
    if (selectedIds.size < 2) return
    getSocket().emit(C2S.COMBAT_GM_START, { participantIds: Array.from(selectedIds) })
    setSelectedIds(new Set())
  }

  if (isInCombat) {
    const activePlayer = players.find(p => p.id === activePlayerId)
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-dark-200">战斗进行中</h3>

        <div className="bg-dark-700 rounded-lg p-2.5 space-y-1 text-xs">
          <div className="flex justify-between text-dark-300">
            <span>轮数</span><span className="text-dark-100">{roundNumber}</span>
          </div>
          <div className="flex justify-between text-dark-300">
            <span>阶段</span><span className="text-dark-100">{phase}</span>
          </div>
          <div className="flex justify-between text-dark-300">
            <span>当前行动</span>
            <span className="text-dark-100">{activePlayer?.displayName || '-'}</span>
          </div>
        </div>

        {/* Participant status */}
        <div className="space-y-1">
          {participants.map(p => {
            const info = players.find(pl => pl.id === p.id)
            return (
              <div key={p.id} className="bg-dark-700 rounded px-2 py-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: info?.color }} />
                  <span className="text-dark-100">{info?.displayName}</span>
                </div>
                <div className="flex gap-2 text-[10px]">
                  <span className="text-red-400">{p.hp}/{p.hpMax}</span>
                  <span className="text-blue-400">{p.mp}/{p.mpMax}</span>
                  {p.shield > 0 && <span className="text-cyan-400">盾:{p.shield}</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* GM controls */}
        <div className="flex gap-2">
          <button onClick={() => getSocket().emit(C2S.COMBAT_GM_NEXT_TURN)} className="btn-sm text-xs flex-1 bg-dark-600 text-dark-200 hover:bg-dark-500">
            跳过当前回合
          </button>
          <button onClick={() => getSocket().emit(C2S.COMBAT_GM_END)} className="btn-sm text-xs flex-1 bg-red-900/50 text-red-300 hover:bg-red-900/70">
            结束战斗
          </button>
        </div>

        {/* Recent log */}
        <div className="bg-dark-700 rounded-lg p-2 max-h-40 overflow-y-auto">
          <div className="text-[10px] text-dark-400 mb-1">战斗日志</div>
          {combatLog.slice(-20).map((entry, i) => (
            <div key={i} className="text-[10px] text-dark-300">{entry.description}</div>
          ))}
        </div>
      </div>
    )
  }

  // Pre-combat: select participants
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-dark-200">发起战斗</h3>
      <p className="text-[10px] text-dark-400">选择至少2名参与者开始战斗（需先锁定配置）</p>

      <div className="space-y-1">
        {players.map(p => (
          <div
            key={p.id}
            onClick={() => togglePlayer(p.id)}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all',
              selectedIds.has(p.id)
                ? 'bg-primary-600/20 border-primary-500'
                : 'bg-dark-700 border-dark-500 hover:border-dark-400',
            )}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-dark-100 flex-1">{p.displayName}</span>
            <span className="text-[10px] text-dark-400">
              HP:{p.hp || '?'} MP:{p.mp || '?'}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={handleStart}
        disabled={selectedIds.size < 2}
        className="btn-primary btn-sm text-xs w-full"
      >
        开始战斗 ({selectedIds.size}人)
      </button>
    </div>
  )
}
