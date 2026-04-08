import { useState } from 'react'
import { useRoomStore } from '@/stores/room.store'
import { useMapStore } from '@/stores/map.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'

export function PlayerManager() {
  const players = useRoomStore((s) => s.players).filter(p => !p.isGm)
  const regions = useMapStore((s) => s.regions)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, number>>({})

  const startEdit = (playerId: string, p: typeof players[number]) => {
    setEditingId(playerId)
    setEditValues({
      hp: p.hp ?? 0,
      hpMax: p.hpMax ?? 0,
      mp: p.mp ?? 0,
      mpMax: p.mpMax ?? 0,
      actionPointsMax: p.actionPointsMax ?? 4,
    })
  }

  const saveEdit = () => {
    if (!editingId) return
    getSocket().emit(C2S.STATS_GM_UPDATE, { playerId: editingId, ...editValues })
    setEditingId(null)
  }

  const handleMovePlayer = (playerId: string, regionId: string) => {
    getSocket().emit(C2S.MAP_PLAYER_MOVE, { playerId, regionId })
  }

  const handleBind = (p1: string, p2: string) => {
    getSocket().emit(C2S.PLAYER_BIND, { playerId1: p1, playerId2: p2 })
  }

  const handleUnlockCardMenu = (playerId: string) => {
    getSocket().emit(C2S.CARD_MENU_UNLOCK, { playerId })
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {players.map((p) => (
        <div key={p.id} className="bg-dark-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-sm font-medium text-dark-50">{p.displayName}</span>
              <span className={`badge text-[10px] ${p.status === 'connected' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                {p.status === 'connected' ? '在线' : '离线'}
              </span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleUnlockCardMenu(p.id)} className="text-[10px] text-primary-400 hover:underline">
                解锁卡牌
              </button>
              <button onClick={() => startEdit(p.id, p)} className="text-[10px] text-amber-400 hover:underline">
                编辑
              </button>
            </div>
          </div>

          {editingId === p.id ? (
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Object.entries(editValues).map(([key, val]) => (
                <div key={key}>
                  <label className="text-dark-300 text-[10px]">{key}</label>
                  <input
                    type="number"
                    className="input text-xs"
                    value={val}
                    onChange={(e) => setEditValues({ ...editValues, [key]: parseInt(e.target.value) || 0 })}
                  />
                </div>
              ))}
              <button onClick={saveEdit} className="btn-sm btn-primary text-xs col-span-3">保存</button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 text-xs text-dark-200">
              <span>HP: {p.hp}/{p.hpMax}</span>
              <span>MP: {p.mp}/{p.mpMax}</span>
              <span>AP上限: {p.actionPointsMax}</span>
              <span>手牌: {p.handCount ?? '?'}</span>
            </div>
          )}

          {/* Move player */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-dark-300">位置:</span>
            <select
              className="input text-[10px] flex-1"
              value={p.regionId || ''}
              onChange={(e) => handleMovePlayer(p.id, e.target.value)}
            >
              <option value="">无</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
      ))}
    </div>
  )
}
