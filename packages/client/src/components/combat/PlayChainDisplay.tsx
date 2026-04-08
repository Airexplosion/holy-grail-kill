import { useCombatStore } from '@/stores/combat.store'
import { useRoomStore } from '@/stores/room.store'
import { STRIKE_COLOR_LABELS } from 'shared'
import type { StrikeColor } from 'shared'
import { cn } from '@/lib/cn'

const COLOR_STYLES: Record<string, string> = {
  red: 'border-red-500 bg-red-900/20 text-red-300',
  blue: 'border-blue-500 bg-blue-900/20 text-blue-300',
  green: 'border-green-500 bg-green-900/20 text-green-300',
}

export function PlayChainDisplay() {
  const playChain = useCombatStore((s) => s.playChain)
  const players = useRoomStore((s) => s.players)

  if (playChain.length === 0) {
    return (
      <div className="text-center py-6 text-dark-400 text-xs">
        等待出牌...
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {playChain.map((entry, i) => {
        const player = players.find(p => p.id === entry.playerId)
        const colorStyle = entry.cardColor ? COLOR_STYLES[entry.cardColor] : 'border-dark-400 bg-dark-600 text-dark-200'
        return (
          <div key={entry.id} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs', colorStyle)}>
            <span className="text-[10px] text-dark-400 w-4">{i + 1}.</span>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: player?.color || '#666' }} />
            <span className="font-medium">{player?.displayName || '???'}</span>
            <span className="text-dark-400">
              {entry.type === 'play' ? '出牌' : '响应'}
            </span>
            {entry.cardColor && (
              <span className="font-medium">{STRIKE_COLOR_LABELS[entry.cardColor as StrikeColor]}</span>
            )}
            {entry.type === 'play' && entry.targetId && (
              <span className="text-dark-400">
                → {players.find(p => p.id === entry.targetId)?.displayName || '???'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
