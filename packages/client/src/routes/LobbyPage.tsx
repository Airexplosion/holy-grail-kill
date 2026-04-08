import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'

interface RoomInfo {
  id: string
  code: string
  name: string
  status: string
  playerCount: number
  maxPlayers: number
  phase: string
  turnNumber: number
  createdAt: number
}

interface MyRoom extends RoomInfo {
  isGm: boolean
  playerId: string
  playerDisplayName: string
}

type Tab = 'lobby' | 'my-rooms' | 'create'

export function LobbyPage() {
  const { account, logout, joinRoom, createRoom, isLoading, error, clearError } = useAuthStore()
  const [tab, setTab] = useState<Tab>('lobby')
  const [lobbyRooms, setLobbyRooms] = useState<RoomInfo[]>([])
  const [myRooms, setMyRooms] = useState<MyRoom[]>([])
  const [roomCode, setRoomCode] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchLobby = async () => {
    setLoading(true)
    try {
      const data = await api.get<RoomInfo[]>('/rooms/lobby')
      setLobbyRooms(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const fetchMyRooms = async () => {
    setLoading(true)
    try {
      const data = await api.get<MyRoom[]>('/rooms/my-rooms', { useAccountToken: true })
      setMyRooms(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    fetchLobby()
    fetchMyRooms()
  }, [])

  useEffect(() => {
    if (tab === 'lobby') fetchLobby()
    if (tab === 'my-rooms') fetchMyRooms()
  }, [tab])

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    await joinRoom(roomCode.toUpperCase(), displayName || undefined)
  }

  const handleJoinRoom = async (code: string) => {
    clearError()
    await joinRoom(code)
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    if (!newRoomName.trim()) return
    await createRoom(newRoomName.trim(), displayName || undefined)
  }

  const statusLabels: Record<string, string> = {
    waiting: '等待中',
    active: '进行中',
    paused: '已暂停',
    finished: '已结束',
  }

  const statusColors: Record<string, string> = {
    waiting: 'bg-yellow-900 text-yellow-300',
    active: 'bg-green-900 text-green-300',
    paused: 'bg-blue-900 text-blue-300',
    finished: 'bg-dark-500 text-dark-300',
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'lobby', label: '大厅' },
    { id: 'my-rooms', label: '我的房间' },
    { id: 'create', label: '创建/加入' },
  ]

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      {/* Header */}
      <header className="bg-dark-700 border-b border-dark-400 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary-400">圣杯杀</h1>
          <span className="text-dark-300 text-sm">大厅</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-dark-100">
            欢迎, <span className="text-primary-400 font-medium">{account?.displayName || account?.username}</span>
          </span>
          <button onClick={logout} className="btn-sm btn-secondary text-xs">退出登录</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-dark-700 border-b border-dark-400 px-6 flex">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-5 py-3 text-sm font-medium transition-colors border-b-2',
              tab === t.id
                ? 'text-primary-400 border-primary-400'
                : 'text-dark-300 border-transparent hover:text-dark-100',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Lobby */}
        {tab === 'lobby' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-dark-50">所有房间</h2>
              <button onClick={fetchLobby} className="btn-sm btn-secondary text-xs">刷新</button>
            </div>
            {loading ? (
              <p className="text-dark-400 text-center py-8">加载中...</p>
            ) : lobbyRooms.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-dark-400 text-lg mb-2">暂无房间</p>
                <p className="text-dark-500 text-sm">去"创建/加入"标签创建一个吧</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {lobbyRooms.map((room) => (
                  <div key={room.id} className="card flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-dark-50 font-medium">{room.name}</span>
                        <span className="font-mono text-xs text-dark-300 bg-dark-700 px-2 py-0.5 rounded">
                          {room.code}
                        </span>
                        <span className={cn('badge text-[10px]', statusColors[room.status] || '')}>
                          {statusLabels[room.status] || room.status}
                        </span>
                      </div>
                      <div className="text-xs text-dark-400">
                        玩家: {room.playerCount}/{room.maxPlayers}
                        {room.turnNumber > 0 && <span className="ml-3">回合: {room.turnNumber}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room.code)}
                      disabled={isLoading}
                      className="btn-sm btn-primary text-xs"
                    >
                      加入
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Rooms */}
        {tab === 'my-rooms' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-dark-50">我的房间</h2>
              <button onClick={fetchMyRooms} className="btn-sm btn-secondary text-xs">刷新</button>
            </div>
            {loading ? (
              <p className="text-dark-400 text-center py-8">加载中...</p>
            ) : myRooms.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-dark-400 text-lg mb-2">还没有加入过任何房间</p>
                <p className="text-dark-500 text-sm">在大厅选择一个房间加入，或创建新房间</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {myRooms.map((room) => (
                  <div key={room.id} className="card flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-dark-50 font-medium">{room.name}</span>
                        <span className="font-mono text-xs text-dark-300 bg-dark-700 px-2 py-0.5 rounded">
                          {room.code}
                        </span>
                        <span className={cn('badge text-[10px]', statusColors[room.status] || '')}>
                          {statusLabels[room.status] || room.status}
                        </span>
                        {room.isGm && (
                          <span className="badge text-[10px] bg-amber-900 text-amber-300">GM</span>
                        )}
                      </div>
                      <div className="text-xs text-dark-400">
                        身份: {room.playerDisplayName} | 玩家: {room.playerCount}
                        {room.turnNumber > 0 && <span className="ml-3">回合: {room.turnNumber}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room.code)}
                      disabled={isLoading}
                      className="btn-sm btn-primary text-xs"
                    >
                      重新进入
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create / Join */}
        {tab === 'create' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Join by code */}
            <div className="card">
              <h2 className="text-lg font-bold text-dark-50 mb-4">加入房间</h2>
              <form onSubmit={handleJoinByCode} className="space-y-3">
                <div>
                  <label className="label">房间码</label>
                  <input
                    className="input uppercase tracking-widest text-center text-lg"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="输入6位房间码"
                    maxLength={10}
                    required
                  />
                </div>
                <div>
                  <label className="label">游戏内名称（可选）</label>
                  <input
                    className="input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="不填则使用账号名"
                  />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                  {isLoading ? '加入中...' : '加入房间'}
                </button>
              </form>
            </div>

            {/* Create room */}
            <div className="card">
              <h2 className="text-lg font-bold text-dark-50 mb-4">创建房间</h2>
              <form onSubmit={handleCreateRoom} className="space-y-3">
                <div>
                  <label className="label">房间名称</label>
                  <input
                    className="input"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="给房间起个名字"
                    required
                  />
                </div>
                <div>
                  <label className="label">GM 显示名称（可选）</label>
                  <input
                    className="input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="不填则使用账号名"
                  />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                  {isLoading ? '创建中...' : '创建房间（你将成为GM）'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
