import { useState } from 'react'
import { useMapStore } from '@/stores/map.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import type { AdjacencyType } from 'shared'
import { cn } from '@/lib/cn'

export function MapEditor() {
  const regions = useMapStore((s) => s.regions)
  const adjacencies = useMapStore((s) => s.adjacencies)
  const [newRegionName, setNewRegionName] = useState('')
  const [fromRegion, setFromRegion] = useState('')
  const [toRegion, setToRegion] = useState('')
  const [adjType, setAdjType] = useState<AdjacencyType>('bidirectional')

  const handleAddRegion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRegionName.trim()) return
    const row = Math.floor(regions.length / 4)
    const col = regions.length % 4
    getSocket().emit(C2S.MAP_REGION_ADD, {
      name: newRegionName.trim(),
      positionX: col * 1.5,
      positionY: row * 1.5,
    })
    setNewRegionName('')
  }

  const handleSetAdjacency = () => {
    if (!fromRegion || !toRegion || fromRegion === toRegion) return
    getSocket().emit(C2S.MAP_ADJACENCY_SET, {
      fromRegionId: fromRegion,
      toRegionId: toRegion,
      type: adjType,
    })
    setFromRegion('')
    setToRegion('')
  }

  const handleRemoveRegion = (regionId: string) => {
    getSocket().emit(C2S.MAP_REGION_REMOVE, { regionId })
  }

  const handleRemoveAdjacency = (fromId: string, toId: string) => {
    getSocket().emit(C2S.MAP_ADJACENCY_REMOVE, { fromRegionId: fromId, toRegionId: toId })
  }

  const adjTypeLabels: Record<AdjacencyType, string> = {
    bidirectional: '双向通行',
    unidirectional: '单向通行',
    blocked: '相邻阻塞',
  }

  return (
    <div className="space-y-4">
      {/* Add region */}
      <div>
        <h4 className="text-xs font-medium text-dark-200 mb-2">添加区域</h4>
        <form onSubmit={handleAddRegion} className="flex gap-2">
          <input
            className="input text-xs flex-1"
            value={newRegionName}
            onChange={(e) => setNewRegionName(e.target.value)}
            placeholder="区域名称"
          />
          <button type="submit" className="btn-sm btn-primary text-xs">添加</button>
        </form>
      </div>

      {/* Region list */}
      <div>
        <h4 className="text-xs font-medium text-dark-200 mb-2">区域列表 ({regions.length})</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {regions.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-dark-700 rounded px-2 py-1.5 text-xs">
              <span className="text-dark-100">{r.name}</span>
              <button
                onClick={() => handleRemoveRegion(r.id)}
                className="text-red-400 hover:text-red-300 text-[10px]"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Set adjacency */}
      <div>
        <h4 className="text-xs font-medium text-dark-200 mb-2">设置连通性</h4>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select className="input text-xs" value={fromRegion} onChange={(e) => setFromRegion(e.target.value)}>
              <option value="">起始区域</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select className="input text-xs" value={toRegion} onChange={(e) => setToRegion(e.target.value)}>
              <option value="">目标区域</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            {(Object.keys(adjTypeLabels) as AdjacencyType[]).map((type) => (
              <button
                key={type}
                onClick={() => setAdjType(type)}
                className={cn(
                  'btn-sm text-[10px] flex-1',
                  adjType === type ? 'bg-primary-600 text-white' : 'bg-dark-500 text-dark-200',
                )}
              >
                {adjTypeLabels[type]}
              </button>
            ))}
          </div>
          <button
            onClick={handleSetAdjacency}
            disabled={!fromRegion || !toRegion || fromRegion === toRegion}
            className="btn-sm btn-primary text-xs w-full"
          >
            设置连通
          </button>
        </div>
      </div>

      {/* Adjacency list */}
      <div>
        <h4 className="text-xs font-medium text-dark-200 mb-2">连通关系 ({adjacencies.length})</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {adjacencies.map((adj) => {
            const from = regions.find(r => r.id === adj.fromRegionId)
            const to = regions.find(r => r.id === adj.toRegionId)
            return (
              <div key={adj.id} className="flex items-center justify-between bg-dark-700 rounded px-2 py-1.5 text-xs">
                <span className="text-dark-100">
                  {from?.name || '?'}
                  <span className={cn(
                    'mx-1',
                    adj.type === 'bidirectional' ? 'text-green-400' :
                    adj.type === 'unidirectional' ? 'text-amber-400' : 'text-red-400',
                  )}>
                    {adj.type === 'bidirectional' ? '↔' : adj.type === 'unidirectional' ? '→' : '✕'}
                  </span>
                  {to?.name || '?'}
                </span>
                <button
                  onClick={() => handleRemoveAdjacency(adj.fromRegionId, adj.toRegionId)}
                  className="text-red-400 hover:text-red-300 text-[10px]"
                >
                  删除
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
