/**
 * 单机模式主页面
 *
 * 按阶段切换子视图：setup → draft → deck_build → playing → result
 * playing 阶段复用 PlayerPage 的核心组件（地图/行动/战斗）
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useSoloStore } from '@/stores/solo.store'
import { useSocket } from '@/hooks/useSocket'
import { useGameStore } from '@/stores/game.store'
import { PhaseDisplay } from '@/components/game/PhaseDisplay'
import { GameMap } from '@/components/map/GameMap'
import { CardHand } from '@/components/cards/CardHand'
import { ActionPanel } from '@/components/game/ActionPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useMapStore } from '@/stores/map.store'
import { getSocket } from '@/lib/socket'
import { C2S, S2C } from 'shared'

export function SoloPage() {
  useSocket()
  const navigate = useNavigate()
  const player = useAuthStore((s) => s.player)
  const room = useAuthStore((s) => s.room)
  const leaveRoom = useAuthStore((s) => s.leaveRoom)
  const stage = useSoloStore((s) => s.stage)
  const aiOpponents = useSoloStore((s) => s.aiOpponents)
  const result = useSoloStore((s) => s.result)
  const setStage = useSoloStore((s) => s.setStage)
  const reset = useSoloStore((s) => s.reset)
  const currentRegionId = useMapStore((s) => s.currentRegionId)
  const regions = useMapStore((s) => s.regions)
  const currentRegion = regions.find(r => r.id === currentRegionId)

  // 监听 solo 事件
  useEffect(() => {
    const socket = getSocket()

    socket.on(S2C.SOLO_STATE, (data: any) => {
      if (data.stage) setStage(data.stage)
    })

    socket.on(S2C.SOLO_RESULT, (data: any) => {
      useSoloStore.getState().setResult(data)
      setStage('result')
    })

    return () => {
      socket.off(S2C.SOLO_STATE)
      socket.off(S2C.SOLO_RESULT)
    }
  }, [setStage])

  // 初始进入就是 playing 阶段（建房已在 API 完成）
  useEffect(() => {
    if (room) setStage('playing')
  }, [room, setStage])

  const handleQuit = () => {
    getSocket().emit(C2S.SOLO_QUIT)
    reset()
    leaveRoom()
    navigate('/lobby')
  }

  const handleNewGame = () => {
    reset()
    leaveRoom()
    navigate('/lobby')
  }

  if (!player || !room) return null

  // 结算画面
  if (stage === 'result' && result) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center">
        <div className="card w-96 text-center">
          <h2 className={`text-2xl font-bold mb-4 ${result.playerSurvived ? 'text-green-400' : 'text-red-400'}`}>
            {result.playerSurvived ? '胜利!' : '失败'}
          </h2>
          <div className="space-y-2 mb-6 text-sm text-dark-200">
            <p>战斗胜场: {result.combatsWon}</p>
            <p>战斗败场: {result.combatsLost}</p>
            <p>经历回合: {result.totalRounds}</p>
            <p>击败AI: {result.eliminatedAiCount}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleNewGame} className="btn-primary flex-1 text-sm">再来一局</button>
            <button onClick={handleQuit} className="btn-secondary flex-1 text-sm">返回大厅</button>
          </div>
        </div>
      </div>
    )
  }

  // 游戏主界面（复用 PlayerPage 布局）
  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      {/* Header */}
      <header className="bg-dark-700 border-b border-dark-400 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-amber-400">单机模式</h1>
          <span className="text-dark-200 text-sm">
            AI对手: <span className="text-dark-50">{aiOpponents.length}</span>
          </span>
          <PhaseDisplay />
        </div>
        <div className="flex items-center gap-3">
          {currentRegion && (
            <span className="text-xs bg-dark-600 px-2 py-1 rounded text-primary-300">
              {currentRegion.name}
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: player.color }} />
            <span className="text-sm text-dark-100">{player.displayName}</span>
          </div>
          <button onClick={handleQuit} className="btn-sm btn-secondary text-xs">退出单机</button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex p-4 gap-4 overflow-hidden">
        {/* Map */}
        <div className="flex-1 card relative overflow-hidden">
          <GameMap />
        </div>

        {/* Sidebar */}
        <div className="w-80 flex flex-col gap-3 overflow-hidden">
          {/* Stats */}
          <div className="card flex-shrink-0">
            <h3 className="text-sm font-medium text-dark-200 mb-2">状态</h3>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-400">HP</span>
                  <span>{player.hp}/{player.hpMax}</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${player.hpMax > 0 ? (player.hp / player.hpMax) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400">MP</span>
                  <span>{player.mp}/{player.mpMax}</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${player.mpMax > 0 ? (player.mp / player.mpMax) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* AI Opponents Info */}
          <div className="card flex-shrink-0">
            <h3 className="text-sm font-medium text-dark-200 mb-2">AI 对手</h3>
            <div className="space-y-1">
              {aiOpponents.map(ai => (
                <div key={ai.groupId} className="flex items-center justify-between text-xs bg-dark-700 rounded px-2 py-1">
                  <span className="text-dark-100">{ai.templateName}</span>
                  <span className="text-dark-400">存活</span>
                </div>
              ))}
            </div>
          </div>

          <ActionPanel />

          <div className="card flex-1 min-h-0 flex flex-col overflow-hidden">
            <CardHand />
          </div>

          <div className="card h-36 flex-shrink-0">
            <ChatPanel />
          </div>
        </div>
      </main>
    </div>
  )
}
