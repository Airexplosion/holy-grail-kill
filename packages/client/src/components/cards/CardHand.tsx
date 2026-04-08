import { useState } from 'react'
import { useCardStore } from '@/stores/card.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import { cn } from '@/lib/cn'

export function CardHand() {
  const hand = useCardStore((s) => s.hand)
  const deckCount = useCardStore((s) => s.deckCount)
  const discardCount = useCardStore((s) => s.discardCount)
  const menuUnlocked = useCardStore((s) => s.menuUnlocked)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showMenu, setShowMenu] = useState(false)

  const toggleSelect = (cardId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  const handleDraw = (count: number) => {
    getSocket().emit(C2S.CARD_DRAW, { count })
  }

  const handleDiscard = () => {
    if (selected.size === 0) return
    getSocket().emit(C2S.CARD_DISCARD, { cardIds: Array.from(selected) })
    setSelected(new Set())
  }

  const handleShuffle = () => {
    getSocket().emit(C2S.CARD_SHUFFLE_DECK)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-dark-200">
          手牌 <span className="text-primary-400">{hand.length}</span>
        </h3>
        <div className="flex gap-2 text-xs text-dark-300">
          <span>牌堆: {deckCount}</span>
          <span>弃牌: {discardCount}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-1 mb-2">
        <button onClick={() => handleDraw(1)} className="btn-sm btn-secondary text-xs">
          抽1张
        </button>
        <button onClick={handleDiscard} disabled={selected.size === 0} className="btn-sm btn-secondary text-xs">
          弃牌({selected.size})
        </button>
        <button onClick={handleShuffle} className="btn-sm btn-secondary text-xs">
          洗牌
        </button>
        {menuUnlocked && (
          <button onClick={() => setShowMenu(!showMenu)} className="btn-sm btn-primary text-xs">
            高级操作
          </button>
        )}
      </div>

      {/* Advanced menu */}
      {showMenu && menuUnlocked && (
        <div className="bg-dark-700 border border-dark-400 rounded-lg p-2 mb-2 space-y-1">
          <button onClick={() => handleDraw(3)} className="w-full text-left text-xs text-dark-100 hover:text-primary-400 px-2 py-1 rounded hover:bg-dark-600">
            抽3张牌
          </button>
          <button onClick={() => getSocket().emit(C2S.CARD_VIEW_DECK)} className="w-full text-left text-xs text-dark-100 hover:text-primary-400 px-2 py-1 rounded hover:bg-dark-600">
            查看牌堆
          </button>
          <button onClick={() => {/* TODO: discard picker */}} className="w-full text-left text-xs text-dark-100 hover:text-primary-400 px-2 py-1 rounded hover:bg-dark-600">
            从弃牌区检索
          </button>
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {hand.length === 0 ? (
          <p className="text-dark-400 text-xs text-center py-4">暂无手牌</p>
        ) : (
          hand.map((card) => (
            <div
              key={card.id}
              onClick={() => toggleSelect(card.id)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer border transition-all text-xs',
                selected.has(card.id)
                  ? 'bg-primary-600/20 border-primary-500'
                  : 'bg-dark-700 border-dark-400 hover:border-dark-300',
              )}
            >
              <div className={cn(
                'w-1.5 h-6 rounded-full flex-shrink-0',
                card.type === 'skill' ? 'bg-purple-500' :
                card.type === 'equipment' ? 'bg-amber-500' :
                card.type === 'special' ? 'bg-red-500' :
                'bg-dark-300',
              )} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-dark-50 truncate">{card.name}</div>
                {card.description && (
                  <div className="text-dark-300 truncate">{card.description}</div>
                )}
              </div>
              <span className="text-dark-400 text-[10px] uppercase">{card.type}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
