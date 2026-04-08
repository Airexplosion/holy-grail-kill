import { useState } from 'react'
import { useGameStore } from '@/stores/game.store'
import { useMapStore } from '@/stores/map.store'
import { getSocket } from '@/lib/socket'
import { C2S, ACTION_LABELS } from 'shared'
import type { ActionType } from 'shared'
import { cn } from '@/lib/cn'

export function ActionPanel() {
  const phase = useGameStore((s) => s.phase)
  const actionPoints = useGameStore((s) => s.actionPoints)
  const actionSubmitted = useGameStore((s) => s.actionSubmitted)
  const currentRegionId = useMapStore((s) => s.currentRegionId)
  const regions = useMapStore((s) => s.regions)
  const adjacencies = useMapStore((s) => s.adjacencies)
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [targetRegion, setTargetRegion] = useState<string>('')

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

  const needsTarget = selectedAction === 'move_adjacent' || selectedAction === 'move_designated' || selectedAction === 'scout'

  const handleSubmit = () => {
    if (!selectedAction) return
    let payload: Record<string, unknown> = {}

    if (selectedAction === 'move_adjacent' || selectedAction === 'move_designated' || selectedAction === 'scout') {
      if (!targetRegion) return
      payload = selectedAction === 'place_outpost' ? { regionId: targetRegion } : { targetRegionId: targetRegion }
    }
    if (selectedAction === 'place_outpost') {
      payload = { regionId: currentRegionId }
    }

    getSocket().emit(C2S.ACTION_SUBMIT, { actionType: selectedAction, payload })
    setSelectedAction(null)
    setTargetRegion('')
  }

  const actions: ActionType[] = ['move_adjacent', 'move_designated', 'scout', 'place_outpost', 'consume']

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
                onClick={() => { setSelectedAction(action); setTargetRegion('') }}
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

          {/* Target selection */}
          {needsTarget && selectedAction && (
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
                {(selectedAction === 'move_designated' ? regions : adjacentRegions).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Submit */}
          {selectedAction && (
            <button
              onClick={handleSubmit}
              disabled={needsTarget && !targetRegion}
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
