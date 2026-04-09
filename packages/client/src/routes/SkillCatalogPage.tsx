import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useAuthStore } from '@/stores/auth.store'
import { getSocket } from '@/lib/socket'
import { C2S, S2C, SKILL_TYPE_LABELS, SKILL_CLASS_LABELS, SKILL_RARITY_LABELS } from 'shared'
import type { SkillLibraryEntry, SkillClass } from 'shared'

export function SkillCatalogPage() {
  useSocket()
  const room = useAuthStore((s) => s.room)
  const [skills, setSkills] = useState<SkillLibraryEntry[]>([])
  const [filterClass, setFilterClass] = useState<SkillClass | 'all'>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('skill_wishlist')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })
  const [showWishlistOnly, setShowWishlistOnly] = useState(false)

  useEffect(() => {
    const socket = getSocket()
    socket.emit(C2S.SKILL_LIBRARY_GET)
    socket.on(S2C.SKILL_LIBRARY_DATA, (data: any) => {
      if (data.skills) setSkills(data.skills)
    })
    return () => { socket.off(S2C.SKILL_LIBRARY_DATA) }
  }, [])

  const toggleWishlist = useCallback((skillId: string) => {
    setWishlist(prev => {
      const next = new Set(prev)
      if (next.has(skillId)) next.delete(skillId)
      else next.add(skillId)
      localStorage.setItem('skill_wishlist', JSON.stringify([...next]))
      return next
    })
  }, [])

  const filtered = skills.filter(s => {
    if (filterClass !== 'all' && s.skillClass !== filterClass) return false
    if (filterType !== 'all' && s.type !== filterType) return false
    if (showWishlistOnly && !wishlist.has(s.id)) return false
    if (searchText && !s.name.includes(searchText) && !s.description.includes(searchText)) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">技能图鉴</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWishlistOnly(!showWishlistOnly)}
              className={`px-3 py-1 text-xs rounded ${showWishlistOnly ? 'bg-yellow-600' : 'bg-gray-700'}`}
            >
              {showWishlistOnly ? '显示全部' : `心愿单 (${wishlist.size})`}
            </button>
            <a href={room ? '/group-formation' : '/lobby'} className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600">
              返回
            </a>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="搜索技能名或描述..."
            className="flex-1 min-w-48 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded"
          />
          <div className="flex gap-1">
            {(['all', 'A', 'B'] as const).map(cls => (
              <button
                key={cls}
                onClick={() => setFilterClass(cls)}
                className={`text-xs px-2 py-1 rounded ${filterClass === cls ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                {cls === 'all' ? '全部' : `${cls}级`}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {['all', 'active', 'passive', 'triggered'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-xs px-2 py-1 rounded ${filterType === t ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                {t === 'all' ? '全部' : SKILL_TYPE_LABELS[t as keyof typeof SKILL_TYPE_LABELS] || t}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500">{filtered.length} 个技能 · 点击星标加入心愿单（轮抓时参考）</p>

        {/* 技能列表 */}
        <div className="space-y-2">
          {filtered.map(skill => (
            <div key={skill.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => toggleWishlist(skill.id)}
                  className={`text-lg mt-0.5 ${wishlist.has(skill.id) ? 'text-yellow-400' : 'text-gray-600'}`}
                >
                  {wishlist.has(skill.id) ? '★' : '☆'}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{skill.name}</span>
                    <span className="text-[10px] px-1.5 rounded bg-gray-700 text-gray-300">
                      {SKILL_CLASS_LABELS[skill.skillClass]}
                    </span>
                    <span className={`text-[10px] px-1.5 rounded ${skill.rarity === 'rare' ? 'bg-amber-900/50 text-amber-300' : 'bg-gray-700 text-gray-400'}`}>
                      {SKILL_RARITY_LABELS[skill.rarity]}
                    </span>
                    <span className="text-[10px] text-gray-500">{SKILL_TYPE_LABELS[skill.type]}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{skill.description}</p>
                  <div className="flex gap-3 mt-1.5 text-[10px] text-gray-500">
                    {skill.cost?.mp && <span>MP: {skill.cost.mp}</span>}
                    {skill.cost?.hp && <span>HP: {skill.cost.hp}</span>}
                    {skill.cooldown > 0 && <span>CD: {skill.cooldown}</span>}
                    <span>目标: {skill.targetType}</span>
                    <span>效果: {skill.effects.length}个</span>
                  </div>
                  {skill.effects.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {skill.effects.map((eff, i) => (
                        <div key={i} className="text-[10px] text-gray-500 bg-gray-900 rounded px-2 py-0.5">
                          {eff.effectType}: {JSON.stringify(eff.params)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
