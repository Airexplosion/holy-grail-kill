import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

interface Submission {
  id: string; playerId: string; playerName: string; sourceName: string
  skillName: string; skillType: string; skillCategory: string
  description: string; costDescription?: string; status: string
}

interface PoolSkill {
  id: string; name: string; description: string; type: string; skillClass: string
}

export function DraftPoolManager() {
  const room = useAuthStore((s) => s.room)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [pool, setPool] = useState<PoolSkill[]>([])
  const [tab, setTab] = useState<'submissions' | 'pool'>('submissions')

  const loadSubmissions = useCallback(async () => {
    if (!room) return
    const data = await api.get<Submission[]>(`/admin/skill-submissions/${room.id}`, { useAccountToken: true })
    setSubmissions(data || [])
  }, [room])

  const loadPool = useCallback(async () => {
    const data = await api.get<PoolSkill[]>('/admin/draft-pool', { useAccountToken: true })
    setPool(data || [])
  }, [])

  useEffect(() => { loadSubmissions(); loadPool() }, [loadSubmissions, loadPool])

  const handleApprove = async (sub: Submission) => {
    // 简化：审核通过时自动创建一个 admin_skill_library 条目并标记 draftReady
    await api.post('/admin/skills', {
      id: `sub_${sub.id}`,
      name: sub.skillName,
      skillClass: 'A',
      rarity: 'normal',
      type: sub.skillType,
      triggerTiming: 'manual',
      description: sub.description,
      flavorText: `来源: ${sub.sourceName} (${sub.playerName})`,
      cost: {},
      cooldown: 0,
      targetType: 'single',
      effects: [],
      tags: [],
      enabled: true,
    }, { useAccountToken: true })

    // 标记 draftReady
    await api.patch(`/admin/skills/sub_${sub.id}/draft`, { draftReady: true }, { useAccountToken: true })

    // 标记审核通过
    await api.post(`/admin/skill-submissions/${sub.id}/approve`, { adminSkillId: `sub_${sub.id}` }, { useAccountToken: true })

    loadSubmissions()
    loadPool()
  }

  const handleReject = async (subId: string) => {
    await api.post(`/admin/skill-submissions/${subId}/reject`, {}, { useAccountToken: true })
    loadSubmissions()
  }

  const handleStartDraft = async () => {
    if (!room) return
    const result = await api.post<any>(`/admin/draft-pool/start/${room.id}`, {}, { useAccountToken: true })
    alert(result?.success ? `轮抓已启动！技能数: ${result.skillCount}` : `启动失败: ${result?.error}`)
  }

  const pendingSubs = submissions.filter(s => s.status === 'pending')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-dark-50">轮抓管理</h2>
        <button onClick={handleStartDraft} className="btn-sm btn-primary text-xs">
          启动轮抓 (池中 {pool.length} 个技能)
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('submissions')}
          className={`text-xs px-3 py-1 rounded ${tab === 'submissions' ? 'bg-blue-600' : 'bg-dark-600'}`}>
          玩家提交 ({pendingSubs.length} 待审)
        </button>
        <button onClick={() => setTab('pool')}
          className={`text-xs px-3 py-1 rounded ${tab === 'pool' ? 'bg-blue-600' : 'bg-dark-600'}`}>
          轮抓池 ({pool.length})
        </button>
      </div>

      {tab === 'submissions' && (
        <div className="space-y-2">
          {submissions.length === 0 ? (
            <p className="text-dark-400 text-sm">暂无玩家提交</p>
          ) : (
            submissions.map(sub => (
              <div key={sub.id} className={`p-3 rounded border ${
                sub.status === 'approved' ? 'border-green-800 bg-green-900/20' :
                sub.status === 'rejected' ? 'border-red-800 bg-red-900/20' :
                'border-dark-500 bg-dark-700'
              }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-dark-50">{sub.skillName}</span>
                  <span className="text-[10px] px-1.5 rounded bg-dark-500">{sub.skillCategory === 'base' ? '基础' : '连携'}</span>
                  <span className="text-[10px] px-1.5 rounded bg-dark-500">{sub.skillType}</span>
                  <span className="text-[10px] text-dark-400">by {sub.playerName}</span>
                  <span className="text-[10px] text-dark-400">出处: {sub.sourceName}</span>
                </div>
                <p className="text-xs text-dark-300 mt-1">{sub.description}</p>
                {sub.costDescription && <p className="text-xs text-dark-400 mt-0.5">消耗: {sub.costDescription}</p>}
                {sub.status === 'pending' && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleApprove(sub)}
                      className="text-xs px-3 py-1 rounded bg-green-700 hover:bg-green-600 text-white">
                      通过并入池
                    </button>
                    <button onClick={() => handleReject(sub.id)}
                      className="text-xs px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-white">
                      拒绝
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'pool' && (
        <div className="space-y-2">
          {pool.length === 0 ? (
            <p className="text-dark-400 text-sm">轮抓池为空，请先审核玩家提交的技能或从技能库标记入池</p>
          ) : (
            pool.map(skill => (
              <div key={skill.id} className="p-2 rounded bg-dark-700 border border-dark-500">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-dark-50">{skill.name}</span>
                  <span className="text-[10px] px-1.5 rounded bg-dark-500">{skill.type}</span>
                </div>
                <p className="text-xs text-dark-300 mt-0.5">{skill.description}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
