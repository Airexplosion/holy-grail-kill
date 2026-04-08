import type { Card } from 'shared'
import { cn } from '@/lib/cn'

const TYPE_COLORS: Record<string, string> = {
  skill: 'bg-purple-500',
  equipment: 'bg-amber-500',
  special: 'bg-red-500',
  event: 'bg-blue-500',
  normal: 'bg-dark-300',
}

const TYPE_LABELS: Record<string, string> = {
  normal: '普通',
  skill: '技能',
  equipment: '装备',
  special: '特殊',
  event: '事件',
}

interface CardItemProps {
  readonly card: Card
  readonly selected?: boolean
  readonly onToggle?: (id: string) => void
  readonly onRemove?: (id: string) => void
}

export function CardItem({ card, selected, onToggle, onRemove }: CardItemProps) {
  return (
    <div
      onClick={() => onToggle?.(card.id)}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all text-xs',
        onToggle ? 'cursor-pointer' : '',
        selected
          ? 'bg-primary-600/20 border-primary-500'
          : 'bg-dark-600 border-dark-400 hover:border-dark-300',
      )}
    >
      <div className={cn('w-1.5 h-6 rounded-full flex-shrink-0', TYPE_COLORS[card.type] || 'bg-dark-300')} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-dark-50 truncate">{card.name}</div>
        {card.description && <div className="text-dark-300 truncate">{card.description}</div>}
      </div>
      <span className="text-dark-400 text-[10px] flex-shrink-0">{TYPE_LABELS[card.type] || card.type}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(card.id) }}
          className="text-red-400 hover:text-red-300 text-[10px] flex-shrink-0"
        >
          删除
        </button>
      )}
    </div>
  )
}
