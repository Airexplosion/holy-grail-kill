import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { SkillPackGroup } from 'shared'

export function PackGroupPanel() {
  const [groups, setGroups] = useState<SkillPackGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newChars, setNewChars] = useState(['', '', '', ''])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editChars, setEditChars] = useState(['', '', '', ''])

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const data = await api.get<SkillPackGroup[]>('/admin/pack-groups', { useAccountToken: true })
      setGroups(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchGroups() }, [])

  const handleSeed = async () => {
    await api.post('/admin/pack-groups/seed', {}, { useAccountToken: true })
    fetchGroups()
  }

  const handleCreate = async () => {
    if (!newName.trim() || newChars.some(c => !c.trim())) return
    await api.post('/admin/pack-groups', { name: newName, characterSourceNames: newChars }, { useAccountToken: true })
    setNewName(''); setNewChars(['', '', '', ''])
    fetchGroups()
  }

  const startEdit = (g: SkillPackGroup) => {
    setEditingId(g.id)
    setEditName(g.name)
    setEditChars([...g.characterSourceNames, '', '', '', ''].slice(0, 4))
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim() || editChars.some(c => !c.trim())) return
    await api.post(`/admin/pack-groups/${editingId}`, { name: editName, characterSourceNames: editChars }, { useAccountToken: true })
    setEditingId(null)
    fetchGroups()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此包组？')) return
    // 用 admin routes 的 DELETE — 通过 PATCH 端点发送
    try {
      await fetch(`/api/admin/pack-groups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('account_token')}` },
      })
    } catch {}
    fetchGroups()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={handleSeed} className="btn-sm btn-primary text-xs">从技能库生成默认包组</button>
        <button onClick={fetchGroups} className="btn-sm btn-secondary text-xs">刷新</button>
      </div>

      {loading ? <p className="text-dark-400 text-xs">加载中...</p> : groups.length === 0 ? (
        <p className="text-dark-400 text-xs">暂无包组，点击上方按钮生成</p>
      ) : (
        <div className="space-y-2">
          {groups.map(g => (
            <div key={g.id} className="bg-dark-700 rounded-lg p-3">
              {editingId === g.id ? (
                /* 编辑模式 */
                <div>
                  <input className="input text-sm mb-2 w-full" value={editName} onChange={e => setEditName(e.target.value)} placeholder="包组名称" />
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {editChars.map((c, i) => (
                      <input key={i} className="input text-xs" value={c}
                        onChange={e => setEditChars(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                        placeholder={`角色来源名 ${i + 1}`} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} disabled={!editName.trim() || editChars.some(c => !c.trim())}
                      className="btn-sm btn-primary text-xs flex-1">保存</button>
                    <button onClick={() => setEditingId(null)} className="btn-sm btn-secondary text-xs flex-1">取消</button>
                  </div>
                </div>
              ) : (
                /* 展示模式 */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-dark-50">{g.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-dark-400">{g.characterSourceNames.length} 角色 = {g.characterSourceNames.length * 6} 技能</span>
                      <button onClick={() => startEdit(g)} className="text-[10px] text-primary-400 hover:underline">编辑</button>
                      <button onClick={() => handleDelete(g.id)} className="text-[10px] text-red-400 hover:underline">删除</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {g.characterSourceNames.map((name, i) => (
                      <span key={i} className="text-[10px] bg-dark-600 text-dark-100 px-2 py-0.5 rounded">{name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 创建新包组 */}
      <div className="bg-dark-700 rounded-lg p-3">
        <h4 className="text-xs font-medium text-dark-200 mb-2">创建新包组</h4>
        <input className="input text-xs mb-2" value={newName} onChange={e => setNewName(e.target.value)} placeholder="包组名称" />
        <div className="grid grid-cols-2 gap-2 mb-2">
          {newChars.map((c, i) => (
            <input key={i} className="input text-xs" value={c}
              onChange={e => setNewChars(prev => prev.map((v, j) => j === i ? e.target.value : v))}
              placeholder={`角色来源名 ${i + 1}`} />
          ))}
        </div>
        <button onClick={handleCreate} disabled={!newName.trim() || newChars.some(c => !c.trim())}
          className="btn-sm btn-primary text-xs w-full">创建包组</button>
      </div>
    </div>
  )
}
