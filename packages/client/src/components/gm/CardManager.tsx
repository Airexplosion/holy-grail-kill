import { useState, useEffect } from 'react'
import { useRoomStore } from '@/stores/room.store'
import { useGmStore } from '@/stores/gm.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import { CardListView } from './CardListView'
import { CardInsertForm } from './CardInsertForm'
import { CardTransferPanel } from './CardTransferPanel'
import { cn } from '@/lib/cn'

type SubTab = 'view' | 'insert'

export function CardManager() {
  const players = useRoomStore((s) => s.players).filter(p => !p.isGm)
  const viewingPlayerId = useGmStore((s) => s.viewingPlayerId)
  const clearSelection = useGmStore((s) => s.clearCardSelection)
  const setViewingCards = useGmStore((s) => s.setViewingPlayerCards)
  const [selectedPlayerId, setSelectedPlayerId] = useState(viewingPlayerId || players[0]?.id || '')
  const [subTab, setSubTab] = useState<SubTab>('view')

  // Fetch cards when player changes
  useEffect(() => {
    if (selectedPlayerId) {
      clearSelection()
      getSocket().emit(C2S.CARD_GM_VIEW, { playerId: selectedPlayerId })
    } else {
      setViewingCards([], null)
    }
  }, [selectedPlayerId, clearSelection, setViewingCards])

  const handlePlayerChange = (pid: string) => {
    setSelectedPlayerId(pid)
  }

  // Get card counts from room store
  const selectedPlayer = players.find(p => p.id === selectedPlayerId)

  return (
    <div className="space-y-3">
      {/* Player selector */}
      <div>
        <label className="text-[10px] text-dark-300 block mb-0.5">选择玩家</label>
        <select
          className="input text-xs w-full"
          value={selectedPlayerId}
          onChange={(e) => handlePlayerChange(e.target.value)}
        >
          <option value="">选择玩家...</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>{p.displayName}</option>
          ))}
        </select>
      </div>

      {selectedPlayer && (
        <div className="flex gap-3 text-[10px] text-dark-300">
          <span>手牌: <span className="text-dark-100">{selectedPlayer.handCount ?? '?'}</span></span>
          <span>牌堆: <span className="text-dark-100">{selectedPlayer.deckCount ?? '?'}</span></span>
          <span>弃牌: <span className="text-dark-100">{selectedPlayer.discardCount ?? '?'}</span></span>
        </div>
      )}

      {/* Sub-tabs */}
      {selectedPlayerId && (
        <>
          <div className="flex gap-0.5 bg-dark-700 rounded-lg p-0.5">
            <button
              onClick={() => setSubTab('view')}
              className={cn(
                'flex-1 text-xs py-1.5 rounded transition-colors',
                subTab === 'view' ? 'bg-dark-500 text-dark-50' : 'text-dark-300 hover:text-dark-100',
              )}
            >
              查看卡牌
            </button>
            <button
              onClick={() => setSubTab('insert')}
              className={cn(
                'flex-1 text-xs py-1.5 rounded transition-colors',
                subTab === 'insert' ? 'bg-dark-500 text-dark-50' : 'text-dark-300 hover:text-dark-100',
              )}
            >
              插入卡牌
            </button>
          </div>

          {subTab === 'view' && (
            <>
              <CardListView />
              <CardTransferPanel />
            </>
          )}

          {subTab === 'insert' && (
            <CardInsertForm playerId={selectedPlayerId} />
          )}
        </>
      )}
    </div>
  )
}
