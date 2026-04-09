import { useSocket } from '@/hooks/useSocket'
import { DeckBuildPanel } from '@/components/deck-build/DeckBuildPanel'
import { useAuthStore } from '@/stores/auth.store'
import { useDeckBuildStore } from '@/stores/deck-build.store'

export function DeckBuildPage() {
  useSocket()
  const player = useAuthStore((s) => s.player)
  const room = useAuthStore((s) => s.room)
  const isLocked = useDeckBuildStore((s) => s.isLocked)

  if (!player || !room) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">组卡阶段</h1>
          <p className="text-gray-400 text-sm mt-1">
            分配 24 张击牌（红/蓝/绿，每色至少 6 张）并锁定
          </p>
        </div>

        {isLocked ? (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-6 text-center">
            <p className="text-green-400 text-lg">组卡已锁定</p>
            <p className="text-gray-400 text-sm mt-2">等待其他组完成锁定...</p>
          </div>
        ) : (
          <DeckBuildPanel />
        )}
      </div>
    </div>
  )
}
