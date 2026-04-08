import { useGmStore } from '@/stores/gm.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import type { CardLocation } from 'shared'
import { CardItem } from './CardItem'
import { cn } from '@/lib/cn'

const LOCATION_TABS: { value: CardLocation | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'hand', label: '手牌' },
  { value: 'deck', label: '牌堆' },
  { value: 'discard', label: '弃牌堆' },
]

export function CardListView() {
  const cards = useGmStore((s) => s.viewingPlayerCards)
  const location = useGmStore((s) => s.viewingCardLocation)
  const selectedIds = useGmStore((s) => s.selectedCardIds)
  const feedback = useGmStore((s) => s.cardFeedback)
  const setLocation = useGmStore((s) => s.setViewingCardLocation)
  const toggleSelect = useGmStore((s) => s.toggleCardSelection)
  const playerId = useGmStore((s) => s.viewingPlayerId)

  const filtered = location === 'all' ? cards : cards.filter(c => c.location === location)

  const counts = {
    all: cards.length,
    hand: cards.filter(c => c.location === 'hand').length,
    deck: cards.filter(c => c.location === 'deck').length,
    discard: cards.filter(c => c.location === 'discard').length,
  }

  const handleRemove = (cardId: string) => {
    getSocket().emit(C2S.CARD_GM_REMOVE, { cardId })
    // Re-fetch after a short delay to allow server processing
    if (playerId) {
      setTimeout(() => {
        getSocket().emit(C2S.CARD_GM_VIEW, { playerId })
      }, 200)
    }
  }

  return (
    <div className="space-y-2">
      {feedback && (
        <div className={`text-xs px-2 py-1 rounded ${feedback.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
          {feedback.message}
        </div>
      )}

      {/* Location filter tabs */}
      <div className="flex gap-0.5 bg-dark-700 rounded-lg p-0.5">
        {LOCATION_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setLocation(tab.value)}
            className={cn(
              'flex-1 text-[10px] py-1 rounded transition-colors',
              location === tab.value
                ? 'bg-dark-500 text-dark-50'
                : 'text-dark-300 hover:text-dark-100',
            )}
          >
            {tab.label} ({counts[tab.value]})
          </button>
        ))}
      </div>

      {/* Card list */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-dark-400 text-xs text-center py-4">暂无卡牌</p>
        ) : (
          filtered.map(card => (
            <CardItem
              key={card.id}
              card={card}
              selected={selectedIds.has(card.id)}
              onToggle={toggleSelect}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="text-xs text-primary-400">
          已选择 {selectedIds.size} 张卡牌
        </div>
      )}
    </div>
  )
}
