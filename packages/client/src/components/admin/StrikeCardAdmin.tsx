import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { STRIKE_COLOR_LABELS } from 'shared'
import type { StrikeCardTemplate, StrikeColor } from 'shared'
import { cn } from '@/lib/cn'

type StrikeRow = StrikeCardTemplate & { enabled: boolean; source: 'db' | 'constant' }

const COLOR_STYLES: Record<string, string> = {
  red: 'border-red-500/30 bg-red-900/10',
  blue: 'border-blue-500/30 bg-blue-900/10',
  green: 'border-green-500/30 bg-green-900/10',
}

export function StrikeCardAdmin() {
  const [cards, setCards] = useState<StrikeRow[]>([])
  const [editing, setEditing] = useState<StrikeRow | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const data = await api.get<StrikeRow[]>('/admin/strike-cards', { useAccountToken: true })
    setCards(data)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    await api.delete('/admin/strike-cards/' + id, { useAccountToken: true })
    load()
  }

  if (editing || creating) {
    return (
      <StrikeCardEditor
        card={editing}
        onSave={async (data) => {
          await api.post('/admin/strike-cards', data, { useAccountToken: true })
          setEditing(null); setCreating(false); load()
        }}
        onCancel={() => { setEditing(null); setCreating(false) }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-dark-50">击牌管理</h2>
        <button onClick={() => setCreating(true)} className="btn-sm btn-primary text-xs">新增击牌</button>
      </div>

      <div className="space-y-2">
        {cards.map(card => (
          <div key={card.id} className={cn('rounded-lg p-3 border', COLOR_STYLES[card.color] || 'border-dark-500')}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-dark-50">{card.name}</span>
              <span className="text-[10px] text-dark-400">{STRIKE_COLOR_LABELS[card.color as StrikeColor] || card.color}</span>
              <span className="text-[10px] text-dark-400">伤害: {card.baseDamage}</span>
              {card.effectType && <span className="text-[10px] text-purple-400">效果: {card.effectType}</span>}
              {card.source === 'constant' && <span className="text-[10px] text-dark-500">(默认)</span>}
              <div className="ml-auto flex gap-1">
                <button onClick={() => setEditing(card)} className="text-[10px] px-2 py-0.5 rounded bg-dark-600 text-dark-200">编辑</button>
                {card.source === 'db' && (
                  <button onClick={() => handleDelete(card.id)} className="text-[10px] px-2 py-0.5 rounded bg-red-900/30 text-red-400">删除</button>
                )}
              </div>
            </div>
            <p className="text-xs text-dark-300 mt-1">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function StrikeCardEditor({ card, onSave, onCancel }: {
  card: StrikeRow | null
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}) {
  const [id, setId] = useState(card?.id || '')
  const [color, setColor] = useState<'red' | 'blue' | 'green'>(card?.color as 'red' | 'blue' | 'green' || 'red')
  const [name, setName] = useState(card?.name || '')
  const [baseDamage, setBaseDamage] = useState(card?.baseDamage?.toString() || '10')
  const [description, setDescription] = useState(card?.description || '')
  const [effectType, setEffectType] = useState(card?.effectType || '')
  const [effectParams, setEffectParams] = useState(JSON.stringify(card?.effectParams || {}, null, 2))
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!id.trim() || !name.trim()) return
    setSaving(true)
    try {
      let params = {}
      try { params = JSON.parse(effectParams) } catch {}
      await onSave({
        id: id.trim(), color, name: name.trim(),
        baseDamage: parseInt(baseDamage) || 10,
        description: description.trim(),
        effectType: effectType.trim() || undefined,
        effectParams: params,
        enabled: true,
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-dark-50">{card ? '编辑击牌' : '新增击牌'}</h3>
        <button onClick={onCancel} className="text-xs text-dark-400 hover:text-dark-200">返回</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-dark-300">ID</label>
          <input className="input text-xs w-full" value={id} onChange={(e) => setId(e.target.value)} disabled={!!card} />
        </div>
        <div>
          <label className="text-[10px] text-dark-300">颜色</label>
          <select className="input text-xs w-full" value={color} onChange={(e) => setColor(e.target.value as 'red' | 'blue' | 'green')}>
            <option value="red">红</option>
            <option value="blue">蓝</option>
            <option value="green">绿</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-dark-300">名称</label>
        <input className="input text-xs w-full" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-dark-300">基础伤害</label>
          <input type="number" className="input text-xs w-full" value={baseDamage} onChange={(e) => setBaseDamage(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-dark-300">效果类型</label>
          <input className="input text-xs w-full" value={effectType} onChange={(e) => setEffectType(e.target.value)} placeholder="可选" />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-dark-300">描述</label>
        <textarea className="input text-xs w-full" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="text-[10px] text-dark-300">效果参数 (JSON)</label>
        <textarea className="input text-xs w-full font-mono" rows={3} value={effectParams} onChange={(e) => setEffectParams(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={saving} className="btn-primary btn-sm text-xs flex-1">{saving ? '...' : '保存'}</button>
        <button onClick={onCancel} className="btn-secondary btn-sm text-xs">取消</button>
      </div>
    </div>
  )
}
