import { useState } from 'react'
import { useRoomStore } from '@/stores/room.store'
import { useGmStore } from '@/stores/gm.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import type { CardLocation } from 'shared'

const CARD_TYPES = [
  { value: 'normal', label: '普通' },
  { value: 'skill', label: '技能' },
  { value: 'equipment', label: '装备' },
  { value: 'special', label: '特殊' },
  { value: 'event', label: '事件' },
]

const LOCATIONS: { value: CardLocation; label: string }[] = [
  { value: 'hand', label: '手牌' },
  { value: 'deck', label: '牌堆' },
  { value: 'discard', label: '弃牌堆' },
]

interface CardInsertFormProps {
  readonly playerId: string
}

export function CardInsertForm({ playerId }: CardInsertFormProps) {
  const players = useRoomStore((s) => s.players).filter(p => !p.isGm)
  const feedback = useGmStore((s) => s.cardFeedback)
  const [targetPlayerId, setTargetPlayerId] = useState(playerId)
  const [name, setName] = useState('')
  const [type, setType] = useState('normal')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<CardLocation>('hand')
  const [position, setPosition] = useState(0)
  const [cost, setCost] = useState('')
  const [tags, setTags] = useState('')

  const handleSubmit = () => {
    if (!name.trim() || !targetPlayerId) return
    const metadata: Record<string, unknown> = {}
    if (cost) metadata.cost = parseInt(cost) || 0
    if (tags.trim()) metadata.tags = tags.split(',').map(t => t.trim()).filter(Boolean)

    getSocket().emit(C2S.CARD_GM_INSERT, {
      playerId: targetPlayerId,
      name: name.trim(),
      type,
      description: description.trim(),
      metadata,
      location,
      position,
    })

    setName('')
    setDescription('')
    setCost('')
    setTags('')
    setPosition(0)
  }

  return (
    <div className="space-y-2">
      {feedback && (
        <div className={`text-xs px-2 py-1 rounded ${feedback.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
          {feedback.message}
        </div>
      )}

      <div>
        <label className="text-[10px] text-dark-300 block mb-0.5">目标玩家</label>
        <select className="input text-xs w-full" value={targetPlayerId} onChange={(e) => setTargetPlayerId(e.target.value)}>
          {players.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
        </select>
      </div>

      <div>
        <label className="text-[10px] text-dark-300 block mb-0.5">卡牌名称 *</label>
        <input className="input text-xs w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="输入名称" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-dark-300 block mb-0.5">类型</label>
          <select className="input text-xs w-full" value={type} onChange={(e) => setType(e.target.value)}>
            {CARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-dark-300 block mb-0.5">放置位置</label>
          <select className="input text-xs w-full" value={location} onChange={(e) => setLocation(e.target.value as CardLocation)}>
            {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-dark-300 block mb-0.5">描述</label>
        <textarea className="input text-xs w-full" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="可选描述" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-dark-300 block mb-0.5">位置序号</label>
          <input type="number" className="input text-xs w-full" min={0} value={position} onChange={(e) => setPosition(parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label className="text-[10px] text-dark-300 block mb-0.5">费用</label>
          <input type="number" className="input text-xs w-full" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="可选" />
        </div>
        <div>
          <label className="text-[10px] text-dark-300 block mb-0.5">标签</label>
          <input className="input text-xs w-full" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="逗号分隔" />
        </div>
      </div>

      <button onClick={handleSubmit} disabled={!name.trim()} className="btn-primary btn-sm text-xs w-full">
        插入卡牌
      </button>
    </div>
  )
}
