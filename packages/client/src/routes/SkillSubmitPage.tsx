import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'

interface Submission {
  id: string; skillName: string; skillCategory: string; skillType: string
  description: string; sourceName: string; status: string; costDescription?: string
}

export function SkillSubmitPage() {
  useSocket()
  const room = useAuthStore((s) => s.room)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [sourceName, setSourceName] = useState('')
  const [skillName, setSkillName] = useState('')
  const [skillType, setSkillType] = useState<string>('active')
  const [skillCategory, setSkillCategory] = useState<string>('base')
  const [description, setDescription] = useState('')
  const [costDescription, setCostDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadMine = useCallback(async () => {
    if (!room) return
    const data = await api.get<Submission[]>(`/rooms/${room.id}/skill-submissions/mine`)
    setSubmissions(data || [])
  }, [room])

  useEffect(() => { loadMine() }, [loadMine])

  const baseSubs = submissions.filter(s => s.skillCategory === 'base')
  const linkSubs = submissions.filter(s => s.skillCategory === 'link')

  const handleSubmit = useCallback(async () => {
    if (!room || !skillName || !description || !sourceName) return
    setSubmitting(true)
    try {
      await api.post(`/rooms/${room.id}/skill-submissions`, {
        sourceName, skillName, skillType, skillCategory, description, costDescription,
      })
      setSkillName(''); setDescription(''); setCostDescription('')
      await loadMine()
    } finally { setSubmitting(false) }
  }, [room, sourceName, skillName, skillType, skillCategory, description, costDescription, loadMine])

  const canSubmitBase = baseSubs.length < 4
  const canSubmitLink = linkSubs.length < 2

  if (!room) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">提交技能</h1>
          <a href="/group-formation" className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600">返回</a>
        </div>

        <p className="text-sm text-gray-400">
          提交 4 个基础技能 + 2 个连携技能，需注明出处（神话/历史/英灵）。
          提交后由 GM 审核并实现为可执行技能。
        </p>

        {/* 已提交列表 */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-300">
            基础技能 ({baseSubs.length}/4) · 连携技能 ({linkSubs.length}/2)
          </h2>
          {submissions.map(s => (
            <div key={s.id} className={`p-3 rounded border ${
              s.status === 'approved' ? 'border-green-700 bg-green-900/20' :
              s.status === 'rejected' ? 'border-red-700 bg-red-900/20' :
              'border-gray-700 bg-gray-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{s.skillName}</span>
                <span className="text-[10px] px-1.5 rounded bg-gray-700">{s.skillCategory === 'base' ? '基础' : '连携'}</span>
                <span className="text-[10px] px-1.5 rounded bg-gray-700">{s.skillType}</span>
                <span className={`text-[10px] px-1.5 rounded ${
                  s.status === 'approved' ? 'bg-green-800 text-green-300' :
                  s.status === 'rejected' ? 'bg-red-800 text-red-300' :
                  'bg-yellow-800 text-yellow-300'
                }`}>
                  {s.status === 'approved' ? '已通过' : s.status === 'rejected' ? '已拒绝' : '待审核'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">出处: {s.sourceName}</p>
              <p className="text-xs text-gray-300 mt-1">{s.description}</p>
            </div>
          ))}
        </div>

        {/* 提交表单 */}
        {(canSubmitBase || canSubmitLink) && (
          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <h3 className="font-medium">提交新技能</h3>

            <div>
              <label className="text-xs text-gray-400">出处（神话/英灵名）</label>
              <input value={sourceName} onChange={e => setSourceName(e.target.value)}
                placeholder="如：安东尼奥·萨列里" className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400">分类</label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setSkillCategory('base')} disabled={!canSubmitBase}
                    className={`flex-1 py-1.5 text-xs rounded ${skillCategory === 'base' ? 'bg-blue-600' : 'bg-gray-700'} ${!canSubmitBase ? 'opacity-50' : ''}`}>
                    基础技能 ({baseSubs.length}/4)
                  </button>
                  <button onClick={() => setSkillCategory('link')} disabled={!canSubmitLink}
                    className={`flex-1 py-1.5 text-xs rounded ${skillCategory === 'link' ? 'bg-purple-600' : 'bg-gray-700'} ${!canSubmitLink ? 'opacity-50' : ''}`}>
                    连携技能 ({linkSubs.length}/2)
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400">类型</label>
                <select value={skillType} onChange={e => setSkillType(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm">
                  <option value="active">主动</option>
                  <option value="passive">被动</option>
                  <option value="triggered">触发</option>
                  <option value="card">卡牌</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400">技能名</label>
              <input value={skillName} onChange={e => setSkillName(e.target.value)}
                placeholder="如：可怕的燎原之火" className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" />
            </div>

            <div>
              <label className="text-xs text-gray-400">效果描述</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="详细描述技能效果，如：[卡牌2][蓝] 消耗2MP，对当前范围内的所有角色进行攻击，响应难度1..."
                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" />
            </div>

            <div>
              <label className="text-xs text-gray-400">消耗说明（可选）</label>
              <input value={costDescription} onChange={e => setCostDescription(e.target.value)}
                placeholder="如：2MP + 红红" className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" />
            </div>

            <button onClick={handleSubmit} disabled={submitting || !skillName || !description || !sourceName}
              className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 font-medium">
              {submitting ? '提交中...' : '提交技能'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
