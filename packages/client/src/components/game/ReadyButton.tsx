import { useCallback } from 'react'
import { useGroupStore } from '@/stores/group.store'
import { useGameStore } from '@/stores/game.store'
import { getSocket } from '@/lib/socket'
import { C2S, GAME_PHASE_LABELS } from 'shared'

export function ReadyButton() {
  const myGroup = useGroupStore((s) => s.myGroup)
  const readyGroupIds = useGroupStore((s) => s.readyGroupIds)
  const aliveGroupCount = useGroupStore((s) => s.aliveGroupCount)
  const phase = useGameStore((s) => s.phase)

  const isReady = myGroup ? readyGroupIds.includes(myGroup.id) : false
  const readyCount = readyGroupIds.length

  const handleToggle = useCallback(() => {
    const socket = getSocket()
    if (isReady) {
      socket.emit(C2S.GROUP_UNREADY)
    } else {
      socket.emit(C2S.GROUP_READY)
    }
  }, [isReady])

  return (
    <div className="flex items-center gap-3">
      <div className="text-xs text-gray-400">
        <span className="text-white font-medium">{GAME_PHASE_LABELS[phase]}</span>
        {' '}— {readyCount}/{aliveGroupCount} 组已就绪
      </div>
      <button
        onClick={handleToggle}
        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
          isReady
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
        }`}
      >
        {isReady ? '已就绪 ✓' : '准备就绪'}
      </button>
    </div>
  )
}
