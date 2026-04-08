import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { SKILL_TYPE_LABELS, SKILL_CLASS_LABELS, SKILL_RARITY_LABELS } from 'shared'
import type { SkillLibraryEntry, SkillClass } from 'shared'
import { cn } from '@/lib/cn'
import { SkillEditor } from './SkillEditor'

type SkillRow = SkillLibraryEntry & { enabled: boolean; source: 'db' | 'constant' }

export function SkillLibraryAdmin() {
  const [skills, setSkills] = useState<SkillRow[]>([])
  const [filterClass, setFilterClass] = useState<SkillClass | 'all'>('all')
  const [editingSkill, setEditingSkill] = useState<SkillRow | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const data = await api.get<SkillRow[]>('/admin/skills', { useAccountToken: true })
    setSkills(data)
  }, [])

  useEffect(() => { load() }, [load])

  const handleToggle = async (id: string, enabled: boolean) => {
    await api.patch('/admin/skills/' + id + '/toggle', { enabled }, { useAccountToken: true })
    load()
  }

  const handleDelete = async (id: string) => {
    await api.delete('/admin/skills/' + id, { useAccountToken: true })
    load()
  }

  const handleSeed = async () => {
    await api.post('/admin/skills/seed', {}, { useAccountToken: true })
    load()
  }

  const filtered = filterClass === 'all' ? skills : skills.filter(s => s.skillClass === filterClass)

  if (editingSkill || creating) {
    return (
      <SkillEditor
        skill={editingSkill}
        onSave={async (data) => {
          await api.post('/admin/skills', data, { useAccountToken: true })
          setEditingSkill(null)
          setCreating(false)
          load()
        }}
        onCancel={() => { setEditingSkill(null); setCreating(false) }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-dark-50">技能库管理</h2>
        <div className="flex gap-2">
          <button onClick={handleSeed} className="btn-sm text-xs bg-dark-600 text-dark-200 hover:bg-dark-500">
            从默认库导入
          </button>
          <button onClick={() => setCreating(true)} className="btn-sm btn-primary text-xs">
            新增技能
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1">
        {(['all', 'A', 'B'] as const).map(cls => (
          <button
            key={cls}
            onClick={() => setFilterClass(cls)}
            className={cn(
              'text-xs px-3 py-1 rounded',
              filterClass === cls ? 'bg-primary-600 text-white' : 'bg-dark-600 text-dark-300 hover:bg-dark-500',
            )}
          >
            {cls === 'all' ? '全部' : `${cls}级`} ({cls === 'all' ? skills.length : skills.filter(s => s.skillClass === cls).length})
          </button>
        ))}
      </div>

      {/* Skill list */}
      <div className="space-y-2">
        {filtered.map(skill => (
          <div key={skill.id} className={cn('bg-dark-700 rounded-lg p-3 border', skill.enabled ? 'border-dark-500' : 'border-red-900/50 opacity-60')}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-dark-50">{skill.name}</span>
              <span className="text-[10px] px-1.5 rounded bg-dark-500 text-dark-300">{SKILL_CLASS_LABELS[skill.skillClass]}</span>
              <span className={cn('text-[10px] px-1.5 rounded', skill.rarity === 'rare' ? 'bg-amber-900/50 text-amber-300' : 'bg-dark-500 text-dark-300')}>
                {SKILL_RARITY_LABELS[skill.rarity]}
              </span>
              <span className="text-[10px] text-dark-400">{SKILL_TYPE_LABELS[skill.type]}</span>
              {skill.source === 'constant' && <span className="text-[10px] text-dark-500">(默认)</span>}
              <div className="ml-auto flex gap-1">
                <button onClick={() => handleToggle(skill.id, !skill.enabled)} className={cn('text-[10px] px-2 py-0.5 rounded', skill.enabled ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}>
                  {skill.enabled ? '启用' : '禁用'}
                </button>
                <button onClick={() => setEditingSkill(skill)} className="text-[10px] px-2 py-0.5 rounded bg-dark-600 text-dark-200 hover:bg-dark-500">编辑</button>
                {skill.source === 'db' && (
                  <button onClick={() => handleDelete(skill.id)} className="text-[10px] px-2 py-0.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50">删除</button>
                )}
              </div>
            </div>
            <p className="text-xs text-dark-300">{skill.description}</p>
            <div className="flex gap-3 mt-1 text-[10px] text-dark-400">
              {skill.cost?.mp && <span>MP: {skill.cost.mp}</span>}
              {skill.cooldown > 0 && <span>CD: {skill.cooldown}</span>}
              <span>目标: {skill.targetType}</span>
              <span>触发: {skill.triggerTiming}</span>
              <span>效果数: {skill.effects.length}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
