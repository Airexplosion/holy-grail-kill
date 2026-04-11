import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { PlayerCharacter } from 'shared'
import { CHARACTER_STATUS_LABELS } from 'shared'

export function CharacterReviewPanel() {
  const [characters, setCharacters] = useState<(PlayerCharacter & { accountName?: string })[]>([])
  const [filter, setFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})

  const fetchCharacters = async () => {
    setLoading(true)
    try {
      const url = filter ? `/admin/characters?status=${filter}` : '/admin/characters'
      const data = await api.get<any[]>(url, { useAccountToken: true })
      setCharacters(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchCharacters() }, [filter])

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.post(`/admin/characters/${id}/review`, { status, reviewNotes: reviewNotes[id] || undefined }, { useAccountToken: true })
      fetchCharacters()
    } catch { /* ignore */ }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-dark-500 text-dark-200', pending: 'bg-yellow-900 text-yellow-300',
    approved: 'bg-green-900 text-green-300', rejected: 'bg-red-900 text-red-300',
  }
  const filters = ['', 'pending', 'approved', 'rejected']

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('btn-sm text-[10px]', filter === f ? 'bg-primary-600 text-white' : 'bg-dark-500 text-dark-200')}>
            {f ? CHARACTER_STATUS_LABELS[f as keyof typeof CHARACTER_STATUS_LABELS] : '全部'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-dark-400 text-xs">加载中...</p> : characters.length === 0 ? (
        <p className="text-dark-400 text-xs">没有角色</p>
      ) : characters.map(char => (
        <div key={char.id} className="bg-dark-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-dark-50">{char.sourceName}</span>
              <span className="text-[10px] text-dark-400">by {char.accountName}</span>
              <span className={cn('badge text-[10px]', statusColors[char.status])}>{CHARACTER_STATUS_LABELS[char.status]}</span>
            </div>
          </div>

          <div className="space-y-1 mb-2">
            {char.skills.map((s, i) => (
              <div key={i} className="text-[10px] bg-dark-600 rounded px-2 py-1">
                <span className={cn('font-bold', s.skillClass === 'A' ? 'text-amber-300' : 'text-purple-300')}>[{s.skillClass}]</span>
                {s.rarity === 'rare' && <span className="text-amber-400 mx-1">稀</span>}
                <span className="text-dark-100 font-medium">{s.name}</span>
                <span className="text-dark-400 ml-1">— {s.description.slice(0, 60)}{s.description.length > 60 ? '...' : ''}</span>
              </div>
            ))}
          </div>

          {char.status === 'pending' && (
            <div className="flex gap-2 items-end">
              <input className="input text-xs flex-1" placeholder="审核备注（可选）"
                value={reviewNotes[char.id] || ''}
                onChange={e => setReviewNotes({ ...reviewNotes, [char.id]: e.target.value })} />
              <button onClick={() => handleReview(char.id, 'approved')} className="btn-sm text-xs bg-green-600 hover:bg-green-700 text-white">通过</button>
              <button onClick={() => handleReview(char.id, 'rejected')} className="btn-sm text-xs bg-red-600 hover:bg-red-700 text-white">驳回</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
