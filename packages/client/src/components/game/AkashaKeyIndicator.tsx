import type { AkashaKeyState } from 'shared'

interface AkashaKeyIndicatorProps {
  readonly keyState: AkashaKeyState
  readonly canPickUp: boolean
  readonly canChannel: boolean
  readonly onPickUp: () => void
  readonly onPutDown: () => void
  readonly onChannel: () => void
}

export function AkashaKeyIndicator({
  keyState, canPickUp, canChannel,
  onPickUp, onPutDown, onChannel,
}: AkashaKeyIndicatorProps) {
  if (!keyState.spawned) return null

  return (
    <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-yellow-400 text-lg">🔑</span>
        <span className="text-sm font-medium text-yellow-300">阿克夏之钥</span>
      </div>

      {keyState.carrierGroupId ? (
        <div className="text-xs text-yellow-200">被携带中</div>
      ) : keyState.regionId ? (
        <div className="text-xs text-yellow-200">位于地图上</div>
      ) : null}

      {keyState.channelProgress > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-400">
            注入进度: {keyState.channelProgress}/{keyState.channelRequired}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all"
              style={{ width: `${(keyState.channelProgress / keyState.channelRequired) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {canPickUp && (
          <button onClick={onPickUp} className="flex-1 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white">
            携带
          </button>
        )}
        {keyState.carrierGroupId && (
          <button onClick={onPutDown} className="flex-1 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500 text-white">
            放置
          </button>
        )}
        {canChannel && (
          <button onClick={onChannel} className="flex-1 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white">
            注入魔力
          </button>
        )}
      </div>
    </div>
  )
}
