import { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeChange,
  type Connection,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMapStore } from '@/stores/map.store'
import { useAuthStore } from '@/stores/auth.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import { RegionNode } from './RegionNode'
import { useEffect, useRef } from 'react'

const nodeTypes: NodeTypes = {
  region: RegionNode as any,
}

interface GameMapProps {
  isGm?: boolean
  onRegionClick?: (regionId: string) => void
}

export function GameMap({ isGm = false, onRegionClick }: GameMapProps) {
  const regions = useMapStore((s) => s.regions)
  const adjacencies = useMapStore((s) => s.adjacencies)
  const playerPositions = useMapStore((s) => s.playerPositions)
  const outposts = useMapStore((s) => s.outposts)
  const currentRegionId = useMapStore((s) => s.currentRegionId)

  const initialNodes: Node[] = useMemo(() =>
    regions.map((region) => {
      const regionPlayers = playerPositions.filter(p => p.regionId === region.id)
      const regionOutposts = outposts.filter(o => o.regionId === region.id)
      const isCurrent = region.id === currentRegionId

      return {
        id: region.id,
        type: 'region',
        position: { x: region.positionX * 200, y: region.positionY * 200 },
        data: {
          name: region.name,
          players: regionPlayers,
          outposts: regionOutposts,
          isCurrent,
          isGm,
        },
      }
    }),
  [regions, playerPositions, outposts, currentRegionId, isGm])

  const initialEdges: Edge[] = useMemo(() =>
    adjacencies.map((adj) => {
      const isBidirectional = adj.type === 'bidirectional'
      const isBlocked = adj.type === 'blocked'
      const isUnidirectional = adj.type === 'unidirectional'

      return {
        id: adj.id,
        source: adj.fromRegionId,
        target: adj.toRegionId,
        type: 'default',
        animated: isUnidirectional,
        style: {
          stroke: isBlocked ? '#ef4444' : isBidirectional ? '#22c55e' : '#f59e0b',
          strokeWidth: 2,
          strokeDasharray: isBlocked ? '5 5' : isUnidirectional ? '8 4' : undefined,
        },
        markerEnd: isUnidirectional ? {
          type: MarkerType.ArrowClosed,
          color: '#f59e0b',
        } : undefined,
        label: isBlocked ? '阻塞' : undefined,
        labelStyle: isBlocked ? { fill: '#ef4444', fontSize: 10 } : undefined,
        labelBgStyle: isBlocked ? { fill: '#1a1b1e' } : undefined,
      }
    }),
  [adjacencies])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Sync from server data
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  // Save position to server when GM drags a node
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)

    if (!isGm) return

    // Debounce position saves
    for (const change of changes) {
      if (change.type === 'position' && change.position && !change.dragging) {
        const nodeId = change.id
        const pos = change.position
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current)
        dragTimeoutRef.current = setTimeout(() => {
          getSocket().emit(C2S.MAP_REGION_UPDATE, {
            regionId: nodeId,
            positionX: pos.x / 200,
            positionY: pos.y / 200,
          })
        }, 300)
      }
    }
  }, [isGm, onNodesChange])

  // GM drag-to-connect: create adjacency by dragging between node handles
  const handleConnect = useCallback((connection: Connection) => {
    if (!isGm || !connection.source || !connection.target) return
    if (connection.source === connection.target) return
    getSocket().emit(C2S.MAP_ADJACENCY_SET, {
      fromRegionId: connection.source,
      toRegionId: connection.target,
      type: 'bidirectional',
    })
  }, [isGm])

  const handleNodeClick = useCallback((_: any, node: Node) => {
    onRegionClick?.(node.id)
  }, [onRegionClick])

  if (regions.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-dark-300">
        <div className="text-center">
          <p className="text-lg mb-2">暂无地图区域</p>
          {isGm && <p className="text-sm">在地图编辑器中添加区域</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={isGm ? handleConnect : undefined}
        onNodeClick={handleNodeClick}
        nodesDraggable={isGm}
        nodesConnectable={isGm}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#373a40" gap={20} />
        <Controls className="!bg-dark-600 !border-dark-400 !shadow-xl" />
        <MiniMap
          nodeColor={(n) => n.data?.isCurrent ? '#4c6ef5' : '#5c5f66'}
          className="!bg-dark-700 !border-dark-400"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-dark-700/90 border border-dark-400 rounded-lg p-3 text-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-green-500" />
          <span className="text-dark-100">双向通行</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-amber-500" style={{ borderBottom: '2px dashed #f59e0b' }} />
          <span className="text-dark-100">单向通行</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-red-500" style={{ borderBottom: '2px dashed #ef4444' }} />
          <span className="text-dark-100">阻塞</span>
        </div>
      </div>
    </div>
  )
}
