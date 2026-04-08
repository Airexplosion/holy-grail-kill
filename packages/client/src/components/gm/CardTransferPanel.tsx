import { useState } from 'react'
import { useGmStore } from '@/stores/gm.store'
import { useRoomStore } from '@/stores/room.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'

export function CardTransferPanel() {
  const selectedIds = useGmStore((s) => s.selectedCardIds)
  const viewingPlayerId = useGmStore((s) => s.viewingPlayerId)
  const clearSelection = useGmStore((s) => s.clearCardSelection)
  const players = useRoomStore((s) => s.players).filter(p => !p.isGm && p.id !== viewingPlayerId)
  const [targetPlayerId, setTargetPlayerId] = useState('')

  if (selectedIds.size === 0) {
    return (
      <div className="bg-dark-700 rounded-lg p-2 text-xs text-dark-400 text-center">
        选择卡牌后可进行转移
      </div>
    )
  }

  const handleTransfer = () => {
    if (!viewingPlayerId || !targetPlayerId) return
    getSocket().emit(C2S.CARD_GM_TRANSFER, {
      fromPlayerId: viewingPlayerId,
      toPlayerId: targetPlayerId,
      cardIds: Array.from(selectedIds),
    })
    clearSelection()
    setTargetPlayerId('')
    // Re-fetch
    if (viewingPlayerId) {
      setTimeout(() => {
        getSocket().emit(C2S.CARD_GM_VIEW, { playerId: viewingPlayerId })
      }, 200)
    }
  }

  return (
    <div className="bg-dark-700 rounded-lg p-2 space-y-2">
      <div className="text-xs text-dark-200">
        转移 <span className="text-primary-400 font-medium">{selectedIds.size}</span> 张卡牌到:
      </div>
      <div className="flex gap-1">
        <select
          className="input text-xs flex-1"
          value={targetPlayerId}
          onChange={(e) => setTargetPlayerId(e.target.value)}
        >
          <option value="">选择目标玩家...</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>{p.displayName}</option>
          ))}
        </select>
        <button
          onClick={handleTransfer}
          disabled={!targetPlayerId}
          className="btn-sm btn-primary text-xs"
        >
          转移
        </button>
        <button
          onClick={clearSelection}
          className="btn-sm btn-secondary text-xs"
        >
          取消
        </button>
      </div>
    </div>
  )
}
