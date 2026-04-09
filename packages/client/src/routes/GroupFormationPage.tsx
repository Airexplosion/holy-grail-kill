import { useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useRoomStore } from '@/stores/room.store'
import { useGroupStore } from '@/stores/group.store'
import { useSocket } from '@/hooks/useSocket'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'

export function GroupFormationPage() {
  useSocket()
  const player = useAuthStore((s) => s.player)
  const room = useAuthStore((s) => s.room)
  const players = useRoomStore((s) => s.players)
  const groups = useGroupStore((s) => s.groups)
  const [selectedRole, setSelectedRole] = useState<'master' | 'servant'>('servant')
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null)

  const myGroup = groups.find(g =>
    (g as any).masterPlayerId === player?.id || (g as any).servantPlayerId === player?.id
  )

  // 未组队的玩家（排除已在组中的和GM）
  const groupedPlayerIds = new Set<string>()
  for (const g of groups) {
    if ((g as any).masterPlayerId) groupedPlayerIds.add((g as any).masterPlayerId)
    if ((g as any).servantPlayerId) groupedPlayerIds.add((g as any).servantPlayerId)
  }
  const availablePlayers = players.filter(
    (p: any) => !p.isGm && p.id !== player?.id && !groupedPlayerIds.has(p.id)
  )

  const handleSendRequest = useCallback(() => {
    if (!targetPlayerId) return
    getSocket().emit(C2S.GROUP_FORM_REQUEST, { targetPlayerId, role: selectedRole })
  }, [targetPlayerId, selectedRole])

  const handleAcceptRequest = useCallback((requesterId: string) => {
    getSocket().emit(C2S.GROUP_FORM_ACCEPT, { requesterId })
  }, [])

  const handleStartGame = useCallback(() => {
    getSocket().emit(C2S.GAME_START)
  }, [])

  const isOwner = room?.ownerPlayerId === player?.id || player?.isGm

  if (!player || !room) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-400">时缝之战</h1>
          <p className="text-gray-400 mt-1">房间: {room.code} — 组队阶段</p>
          <div className="flex gap-2 mt-2 justify-center">
            <a href="/skill-submit" className="px-4 py-1.5 text-sm rounded bg-blue-700 hover:bg-blue-600 transition-colors">
              提交技能 (4基础+2连携)
            </a>
            <a href="/skill-catalog" className="px-4 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors">
              技能图鉴 / 轮抓池预览
            </a>
          </div>
        </div>

        {/* 已组成的组 */}
        <div className="space-y-3">
          <h2 className="text-lg font-medium">已组成的组 ({groups.length})</h2>
          {groups.length === 0 ? (
            <p className="text-gray-500 text-sm">暂无组队</p>
          ) : (
            groups.map((g: any) => (
              <div key={g.id} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3 border border-gray-700">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="font-medium">{g.name}</span>
                <span className="text-xs text-gray-400">
                  篡者: {players.find((p: any) => p.id === g.masterPlayerId)?.displayName || '?'}
                </span>
                <span className="text-xs text-gray-400">
                  幻身: {players.find((p: any) => p.id === g.servantPlayerId)?.displayName || '?'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* 我的状态 */}
        {myGroup ? (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
            <p className="text-green-400">你已组队完成，等待其他玩家...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">选择组队</h2>

            {/* 角色选择 */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRole('master')}
                className={`flex-1 py-3 rounded border text-center transition-colors ${
                  selectedRole === 'master' ? 'bg-purple-600/30 border-purple-500' : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div className="font-medium">篡者 (Master)</div>
                <div className="text-xs text-gray-400">策略型，控制战术风格和秘钥</div>
              </button>
              <button
                onClick={() => setSelectedRole('servant')}
                className={`flex-1 py-3 rounded border text-center transition-colors ${
                  selectedRole === 'servant' ? 'bg-blue-600/30 border-blue-500' : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div className="font-medium">幻身 (Servant)</div>
                <div className="text-xs text-gray-400">战斗型，选择职业和技能</div>
              </button>
            </div>

            {/* 可组队玩家列表 */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">选择你的搭档：</p>
              {availablePlayers.length === 0 ? (
                <p className="text-gray-500 text-sm">没有可组队的玩家，等待更多玩家加入...</p>
              ) : (
                availablePlayers.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setTargetPlayerId(p.id)}
                    className={`w-full p-3 rounded border text-left transition-colors ${
                      targetPlayerId === p.id
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <span className="font-medium">{p.displayName}</span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={handleSendRequest}
              disabled={!targetPlayerId}
              className="w-full py-3 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 font-medium transition-colors"
            >
              发送组队请求
            </button>
          </div>
        )}

        {/* 房主开始按钮 */}
        {isOwner && groups.length >= 2 && (
          <button
            onClick={handleStartGame}
            className="w-full py-4 rounded bg-green-600 hover:bg-green-500 font-bold text-lg transition-colors"
          >
            开始游戏（进入角色创建）
          </button>
        )}
      </div>
    </div>
  )
}
