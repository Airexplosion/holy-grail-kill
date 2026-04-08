import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/cn'

interface RegionNodeData {
  name: string
  players: Array<{ playerId: string; displayName: string; color: string }>
  outposts: Array<{ id: string; playerId: string; color: string; displayName: string }>
  isCurrent: boolean
  isGm: boolean
}

export function RegionNode({ data }: { data: RegionNodeData }) {
  return (
    <div
      className={cn(
        'bg-dark-600 border-2 rounded-xl px-4 py-3 min-w-[140px] shadow-lg relative',
        data.isCurrent
          ? 'border-primary-500 shadow-primary-500/20'
          : 'border-dark-400',
      )}
    >
      {/* Handles: only visible & functional for GM */}
      {data.isGm ? (
        <>
          <Handle type="target" position={Position.Top} id="top"
            className="!bg-primary-400 !w-3 !h-3 !border-2 !border-dark-600 hover:!bg-primary-300 !cursor-crosshair" />
          <Handle type="source" position={Position.Bottom} id="bottom"
            className="!bg-primary-400 !w-3 !h-3 !border-2 !border-dark-600 hover:!bg-primary-300 !cursor-crosshair" />
          <Handle type="target" position={Position.Left} id="left"
            className="!bg-primary-400 !w-3 !h-3 !border-2 !border-dark-600 hover:!bg-primary-300 !cursor-crosshair" />
          <Handle type="source" position={Position.Right} id="right"
            className="!bg-primary-400 !w-3 !h-3 !border-2 !border-dark-600 hover:!bg-primary-300 !cursor-crosshair" />
        </>
      ) : (
        <>
          <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0 !min-w-0 !min-h-0" />
          <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0 !min-w-0 !min-h-0" />
        </>
      )}

      {/* Region name */}
      <div className={cn(
        'text-sm font-bold text-center mb-1',
        data.isCurrent ? 'text-primary-400' : 'text-dark-50',
      )}>
        {data.name}
      </div>

      {/* Players */}
      {data.players.length > 0 && (
        <div className="space-y-0.5 mt-2">
          {data.players.map((p) => (
            <div key={p.playerId} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-dark-100 truncate">{p.displayName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Outposts */}
      {data.outposts.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {data.outposts.map((o) => (
            <div
              key={o.id}
              className="w-3 h-3 rounded-sm border border-dark-300"
              style={{ backgroundColor: o.color }}
              title={`${o.displayName}的据点`}
            />
          ))}
        </div>
      )}

      {/* Current location indicator */}
      {data.isCurrent && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary-500 rounded-full border-2 border-dark-600 animate-pulse" />
      )}
    </div>
  )
}
