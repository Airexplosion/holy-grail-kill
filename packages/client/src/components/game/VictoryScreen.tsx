import type { VictoryEvent } from 'shared'

interface VictoryScreenProps {
  readonly event: VictoryEvent
  readonly winnerName: string
  readonly isWinner: boolean
}

export function VictoryScreen({ event, winnerName, isWinner }: VictoryScreenProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="text-center space-y-6 p-8">
        <div className={`text-6xl ${isWinner ? 'text-yellow-400' : 'text-gray-400'}`}>
          {isWinner ? '胜利' : '败北'}
        </div>
        <div className="text-2xl text-white">
          <span className="text-yellow-400 font-bold">{winnerName}</span>
          {event.type === 'akasha_key_channeled'
            ? ' 完成了阿克夏之钥的许愿'
            : ' 是最后的幸存者'
          }
        </div>
        <div className="text-sm text-gray-400">
          {event.type === 'akasha_key_channeled'
            ? '历史将被改写，命运将被扭转……'
            : '所有对手已被击败，世界归于沉寂……'
          }
        </div>
      </div>
    </div>
  )
}
