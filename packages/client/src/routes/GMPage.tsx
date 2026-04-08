import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useSocket } from '@/hooks/useSocket'
import { PhaseDisplay } from '@/components/game/PhaseDisplay'
import { GameMap } from '@/components/map/GameMap'
import { MapEditor } from '@/components/gm/MapEditor'
import { PlayerManager } from '@/components/gm/PlayerManager'
import { PhaseControl } from '@/components/gm/PhaseControl'
import { OperationLog } from '@/components/gm/OperationLog'
import { GameConfig } from '@/components/gm/GameConfig'
import { cn } from '@/lib/cn'

type Tab = 'map' | 'players' | 'phase' | 'config' | 'log'

export function GMPage() {
  useSocket()
  const player = useAuthStore((s) => s.player)
  const room = useAuthStore((s) => s.room)
  const leaveRoom = useAuthStore((s) => s.leaveRoom)
  const [activeTab, setActiveTab] = useState<Tab>('map')

  if (!player || !room) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'map', label: '地图管理' },
    { id: 'players', label: '玩家管理' },
    { id: 'phase', label: '阶段控制' },
    { id: 'config', label: '游戏配置' },
    { id: 'log', label: '操作日志' },
  ]

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      {/* Top Bar */}
      <header className="bg-dark-700 border-b border-dark-400 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-amber-400">GM 控制台</h1>
          <span className="text-dark-200 text-sm">
            房间: <span className="text-dark-50 font-mono">{room.code}</span>
            <span className="text-dark-300 ml-1">({room.name})</span>
          </span>
          <PhaseDisplay />
        </div>
        <button onClick={leaveRoom} className="btn-sm btn-secondary text-xs">返回大厅</button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Map */}
        <div className="flex-1 p-4 relative">
          <div className="w-full h-full card overflow-hidden relative">
            <GameMap isGm />
          </div>
        </div>

        {/* Right: Control Panel */}
        <div className="w-96 border-l border-dark-400 bg-dark-700 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-dark-400">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 py-2.5 text-xs font-medium transition-colors',
                  activeTab === tab.id
                    ? 'text-amber-400 border-b-2 border-amber-400 bg-dark-600'
                    : 'text-dark-300 hover:text-dark-100',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'map' && <MapEditor />}
            {activeTab === 'players' && <PlayerManager />}
            {activeTab === 'phase' && <PhaseControl />}
            {activeTab === 'config' && <GameConfig />}
            {activeTab === 'log' && <OperationLog />}
          </div>
        </div>
      </main>
    </div>
  )
}
