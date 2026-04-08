import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useGameStore } from '@/stores/game.store'
import { useMapStore } from '@/stores/map.store'
import { getSocket } from '@/lib/socket'
import { C2S, ACTION_LABELS } from 'shared'
import type { ActionType } from 'shared'
import { cn } from '@/lib/cn'

export function ActionPanel() {
  const playerId = useAuthStore((s) => s.player?.id)
  const phase = useGameStore((s) => s.phase)
  const actionPoints = useGameStore((s) => s.actionPoints)
  const actionSubmitted = useGameStore((s) => s.actionSubmitted)
  const currentRegionId = useMapStore((s) => s.currentRegionId)
  const regions = useMapStore((s) => s.regions)
  const adjacencies = useMapStore((s) => s.adjacencies)
  const outposts = useMapStore((s) => s.outposts)
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [targetRegion, setTargetRegion] = useState<string>('')
  const [targetOutpost, setTargetOutpost] = useState<string>('')

  if (phase !== 'action') {
    return (
      <div className="card">
        <h3 className="text-sm font-medium text-dark-200 mb-2">行动</h3>
        <p className="text-dark-400 text-xs">当前不是行动阶段</p>
      </div>
    )
  }

  // Get adjacent regions for move/scout
  const getAdjacentRegionIds = () => {
    if (!currentRegionId) return []
    const ids: string[] = []
    for (const adj of adjacencies) {
      if (adj.type === 'blocked') continue
      if (adj.type === 'bidirectional') {
        if (adj.fromRegionId === currentRegionId) ids.push(adj.toRegionId)
        if (adj.toRegionId === currentRegionId) ids.push(adj.fromRegionId)
      } else if (adj.type === 'unidirectional') {
        if (adj.fromRegionId === currentRegionId) ids.push(adj.toRegionId)
      }
    }
    return ids
  }

  const adjacentIds = getAdjacentRegionIds()
  const adjacentRegions = regions.filter(r => adjacentIds.includes(r.id))

  // Scout: current region + adjacent regions
  const scoutableRegions = currentRegionId
    ? [regions.find(r => r.id === currentRegionId), ...adjacentRegions].filter(Boolean)
    : adjacentRegions

  // Destroy: known outposts in current region (excluding own)
  const destroyableOutposts = outposts.filter(
    o => o.regionId === currentRegionId && o.playerId !== playerId,
  )

  const needsRegionTarget = selectedAction === 'move_adjacent' || selectedAction === 'move_designated' || selectedAction === 'scout'
  const needsOutpostTarget = selectedAction === 'destroy_outpost'

  const handleSubmit = () => {
    if (!selectedAction) return
    let payload: Record<string, unknown> = {}

    if (selectedAction === 'move_adjacent' || selectedAction === 'move_designated') {
      if (!targetRegion) return
      payload = { targetRegionId: targetRegion }
    }
    if (selectedAction === 'scout') {
      if (!targetRegion) return
      payload = { targetRegionId: targetRegion }
    }
    if (selectedAction === 'place_outpost') {
      payload = { regionId: currentRegionId }
    }
    if (selectedAction === 'destroy_outpost') {
      if (!targetOutpost) return
      payload = { targetRegionId: currentRegionId, targetOutpostId: targetOutpost }
    }

    getSocket().emit(C2S.ACTION_SUBMIT, { actionType: selectedAction, payload })
    setSelectedAction(null)
    setTargetRegion('')
    setTargetOutpost('')
  }

  const actions: ActionType[] = ['move_adjacent', 'move_designated', 'scout', 'place_outpost', 'destroy_outpost', 'consume']

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-dark-200">行动</h3>
        <div className="flex items-center gap-1">
          {Array.from({ length: actionPoints }, (_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-primary-500" />
          ))}
          {Array.from({ length: Math.max(0, 4 - actionPoints) }, (_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-dark-500" />
          ))}
          <span className="text-xs text-dark-300 ml-1">AP: {actionPoints}</span>
        </div>
      </div>

      {actionSubmitted ? (
        <div className="text-center py-4">
          <p className="text-primary-400 text-sm">行动已提交</p>
          <p className="text-dark-400 text-xs mt-1">等待其他玩家...</p>
        </div>
      ) : actionPoints <= 0 ? (
        <p className="text-dark-400 text-xs text-center py-4">行动点已用完</p>
      ) : (
        <div className="space-y-2">
          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-1">
            {actions.map((action) => (
              <button
                key={action}
                onClick={() => { setSelectedAction(action); setTargetRegion(''); setTargetOutpost('') }}
                className={cn(
                  'btn-sm text-xs text-left',
                  selectedAction === action
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-500 text-dark-100 hover:bg-dark-400',
                )}
              >
                {ACTION_LABELS[action]}
              </button>
            ))}
          </div>

          {/* Region target selection */}
          {needsRegionTarget && selectedAction && (
            <div>
              <label className="text-xs text-dark-300 mb-1 block">
                选择目标区域:
              </label>
              <select
                className="input text-xs"
                value={targetRegion}
                onChange={(e) => setTargetRegion(e.target.value)}
              >
                <option value="">选择区域...</option>
                {(selectedAction === 'move_designated'
                  ? regions
                  : selectedAction === 'scout'
                    ? scoutableRegions
                    : adjacentRegions
                ).map((r) => (
                  <option key={r!.id} value={r!.id}>{r!.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Outpost target selection for destroy */}
          {needsOutpostTarget && (
            <div>
              <label className="text-xs text-dark-300 mb-1 block">
                选择目标阵地:
              </label>
              {destroyableOutposts.length === 0 ? (
                <p className="text-dark-400 text-xs">当前区域没有已知阵地</p>
              ) : (
                <select
                  className="input text-xs"
                  value={targetOutpost}
                  onChange={(e) => setTargetOutpost(e.target.value)}
                >
                  <option value="">选择阵地...</option>
                  {destroyableOutposts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.displayName} 的阵地
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Submit */}
          {selectedAction && (
            <button
              onClick={handleSubmit}
              disabled={(needsRegionTarget && !targetRegion) || (needsOutpostTarget && !targetOutpost)}
              className="btn-primary w-full btn-sm text-xs"
            >
              确认提交
            </button>
          )}
        </div>
      )}
    </div>
  )
}
