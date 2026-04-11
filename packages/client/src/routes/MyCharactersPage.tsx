/**
 * 我的角色管理页面
 *
 * 查看所有角色（草稿/待审/已过审/驳回）
 * 创建新角色（来源名+6技能，4A+2B验证）
 * 编辑草稿/驳回的角色
 * 提交审核
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { PlayerCharacter, CharacterSkillDef } from 'shared'
import { CHARACTER_STATUS_LABELS } from 'shared'

const emptySkill = (): Omit<CharacterSkillDef, 'id'> => ({
  name: '', skillClass: 'A', rarity: 'normal', type: 'active', description: '',
})

export function MyCharactersPage() {
  const navigate = useNavigate()
  const [characters, setCharacters] = useState<PlayerCharacter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sourceName, setSourceName] = useState('')
  const [skills, setSkills] = useState<Omit<CharacterSkillDef, 'id'>[]>([
    emptySkill(), emptySkill(), emptySkill(), emptySkill(), // 4A
    { ...emptySkill(), skillClass: 'B' }, { ...emptySkill(), skillClass: 'B' }, // 2B
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCharacters = async () => {
    setLoading(true)
    try {
      const data = await api.get<PlayerCharacter[]>('/characters/mine', { useAccountToken: true })
      setCharacters(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchCharacters() }, [])

  const aCount = skills.filter(s => s.skillClass === 'A').length
  const bCount = skills.filter(s => s.skillClass === 'B').length
  const isValid = sourceName.trim() && skills.every(s => s.name.trim() && s.description.trim()) && aCount === 4 && bCount === 2

  const updateSkill = (index: number, field: string, value: any) => {
    setSkills(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const handleSave = async () => {
    if (!isValid || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await api.post(`/characters/${editingId}`, { sourceName, skills }, { useAccountToken: true })
      } else {
        await api.post('/characters', { sourceName, skills }, { useAccountToken: true })
      }
      setShowForm(false)
      setEditingId(null)
      fetchCharacters()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
    setSaving(false)
  }

  const handleSubmit = async (charId: string) => {
    try {
      await api.post(`/characters/${charId}/submit`, {}, { useAccountToken: true })
      fetchCharacters()
    } catch { /* ignore */ }
  }

  const handleEdit = (char: PlayerCharacter) => {
    setEditingId(char.id)
    setSourceName(char.sourceName)
    setSkills(char.skills.map(s => ({ ...s })))
    setShowForm(true)
  }

  const handleNew = () => {
    setEditingId(null)
    setSourceName('')
    setSkills([emptySkill(), emptySkill(), emptySkill(), emptySkill(), { ...emptySkill(), skillClass: 'B' }, { ...emptySkill(), skillClass: 'B' }])
    setShowForm(false)
    setTimeout(() => setShowForm(true), 0)
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-dark-500 text-dark-200',
    pending: 'bg-yellow-900 text-yellow-300',
    approved: 'bg-green-900 text-green-300',
    rejected: 'bg-red-900 text-red-300',
  }

  // 编辑表单
  if (showForm) {
    return (
      <div className="min-h-screen bg-dark-800 flex flex-col">
        <header className="bg-dark-700 border-b border-dark-400 px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary-400">{editingId ? '编辑角色' : '创建角色'}</h1>
          <button onClick={() => setShowForm(false)} className="btn-sm btn-secondary text-xs">返回列表</button>
        </header>

        <main className="flex-1 p-6 max-w-4xl mx-auto w-full overflow-y-auto">
          {error && <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-400 text-sm mb-4">{error}</div>}

          <div className="mb-4">
            <label className="label">角色来源名</label>
            <input className="input" value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="例：奈亚子（潜行吧！奈亚子）" />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-dark-200">技能分配:</span>
            <span className={cn('text-xs font-bold', aCount === 4 ? 'text-green-400' : 'text-red-400')}>A级: {aCount}/4</span>
            <span className={cn('text-xs font-bold', bCount === 2 ? 'text-green-400' : 'text-red-400')}>B级: {bCount}/2</span>
          </div>

          <div className="space-y-3">
            {skills.map((skill, i) => (
              <div key={i} className="card">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-dark-400">技能 {i + 1}</span>
                  <select className="input text-xs w-20" value={skill.skillClass} onChange={e => updateSkill(i, 'skillClass', e.target.value)}>
                    <option value="A">A级</option>
                    <option value="B">B级</option>
                  </select>
                  <select className="input text-xs w-24" value={skill.rarity} onChange={e => updateSkill(i, 'rarity', e.target.value)}>
                    <option value="normal">普通</option>
                    <option value="rare">高稀有度</option>
                  </select>
                  <select className="input text-xs w-24" value={skill.type} onChange={e => updateSkill(i, 'type', e.target.value)}>
                    <option value="active">主动</option>
                    <option value="passive">被动</option>
                    <option value="triggered">触发</option>
                    <option value="card">卡牌</option>
                  </select>
                  {skill.type === 'card' && (
                    <>
                      <input type="number" className="input text-xs w-16" value={skill.cardCount || ''} onChange={e => updateSkill(i, 'cardCount', parseInt(e.target.value) || 0)} placeholder="张数" />
                      <input className="input text-xs w-20" value={skill.cardColor || ''} onChange={e => updateSkill(i, 'cardColor', e.target.value)} placeholder="颜色" />
                    </>
                  )}
                </div>
                <input className="input text-sm mb-2" value={skill.name} onChange={e => updateSkill(i, 'name', e.target.value)} placeholder="技能名称" />
                <textarea className="input text-xs resize-none" rows={2} value={skill.description} onChange={e => updateSkill(i, 'description', e.target.value)} placeholder="技能描述" />
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} disabled={!isValid || saving} className="btn-primary flex-1">
              {saving ? '保存中...' : '保存草稿'}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // 角色列表
  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      <header className="bg-dark-700 border-b border-dark-400 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-primary-400">我的角色</h1>
          <span className="text-dark-300 text-sm">{characters.length} 个角色</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleNew} className="btn-sm btn-primary text-xs">创建新角色</button>
          <button onClick={() => navigate('/lobby')} className="btn-sm btn-secondary text-xs">返回大厅</button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full overflow-y-auto">
        {loading ? (
          <p className="text-dark-400 text-center py-8">加载中...</p>
        ) : characters.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-dark-400 text-lg mb-2">还没有创建角色</p>
            <button onClick={handleNew} className="btn-primary text-sm">创建第一个角色</button>
          </div>
        ) : (
          <div className="space-y-3">
            {characters.map(char => (
              <div key={char.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-dark-50 font-bold">{char.sourceName}</span>
                    <span className={cn('badge text-[10px]', statusColors[char.status] || '')}>
                      {CHARACTER_STATUS_LABELS[char.status]}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {(char.status === 'draft' || char.status === 'rejected') && (
                      <>
                        <button onClick={() => handleEdit(char)} className="text-[10px] text-primary-400 hover:underline">编辑</button>
                        <button onClick={() => handleSubmit(char.id)} className="text-[10px] text-amber-400 hover:underline">提交审核</button>
                      </>
                    )}
                  </div>
                </div>
                {char.reviewNotes && (
                  <div className="bg-red-900/20 border border-red-800/50 rounded px-2 py-1 text-xs text-red-300 mb-2">
                    审核意见: {char.reviewNotes}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-1">
                  {char.skills.map((s, i) => (
                    <div key={i} className="bg-dark-700 rounded px-2 py-1 text-[10px]">
                      <span className={cn('font-bold', s.skillClass === 'A' ? 'text-amber-300' : 'text-purple-300')}>[{s.skillClass}]</span>
                      {' '}<span className="text-dark-100">{s.name}</span>
                      {s.rarity === 'rare' && <span className="text-amber-400 ml-1">稀</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
