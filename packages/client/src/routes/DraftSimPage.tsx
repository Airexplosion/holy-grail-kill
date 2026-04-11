/**
 * 轮抓模拟器页面
 *
 * 独立工具，纯 REST 通信，不需要 Socket.IO。
 * 流程：创建会话 → 10轮选技能 → 保7弃3 → 查看结果和地图池
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { SkillLibraryEntry } from 'shared'

interface SimGroup {
  id: string
  name: string
  isHuman: boolean
}

interface PickResult {
  pickedSkill: SkillLibraryEntry
  aiPicks: Array<{ groupName: string; skillName: string }>
  round: number
  totalRounds: number
  draftComplete: boolean
  currentPack: SkillLibraryEntry[]
  selectionCounts: Record<string, number>
}

interface FinalizeResult {
  kept: SkillLibraryEntry[]
  discarded: SkillLibraryEntry[]
  mapPool: SkillLibraryEntry[]
  allResults: Array<{ name: string; isHuman: boolean; kept: SkillLibraryEntry[] }>
}

type Phase = 'idle' | 'drafting' | 'selecting' | 'results'

export function DraftSimPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [groups, setGroups] = useState<SimGroup[]>([])
  const [round, setRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(10)
  const [currentPack, setCurrentPack] = useState<SkillLibraryEntry[]>([])
  const [mySelections, setMySelections] = useState<SkillLibraryEntry[]>([])
  const [selectionCounts, setSelectionCounts] = useState<Record<string, number>>({})
  const [lastAiPicks, setLastAiPicks] = useState<Array<{ groupName: string; skillName: string }>>([])
  const [finalResult, setFinalResult] = useState<FinalizeResult | null>(null)
  const [selectedKeep, setSelectedKeep] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // 创建会话
  const handleCreate = async () => {
    setLoading(true)
    try {
      const data = await api.post<any>('/draft-sim/create', {}, { useAccountToken: true })
      setSessionId(data.sessionId)
      setGroups(data.groups)
      setRound(data.round)
      setTotalRounds(data.totalRounds)
      setCurrentPack(data.currentPack)
      setMySelections([])
      setPhase('drafting')
    } catch { /* ignore */ }
    setLoading(false)
  }

  // 选技能
  const handlePick = async (skillId: string) => {
    if (!sessionId || loading) return
    setLoading(true)
    try {
      const data = await api.post<PickResult>(`/draft-sim/${sessionId}/pick`, { skillId }, { useAccountToken: true })
      if (data.pickedSkill) {
        setMySelections(prev => [...prev, data.pickedSkill])
      }
      setRound(data.round)
      setTotalRounds(data.totalRounds)
      setCurrentPack(data.currentPack)
      setSelectionCounts(data.selectionCounts)
      setLastAiPicks(data.aiPicks || [])

      if (data.draftComplete) {
        setPhase('selecting')
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  // 定稿
  const handleFinalize = async () => {
    if (!sessionId || selectedKeep.size !== 7) return
    setLoading(true)
    try {
      const data = await api.post<FinalizeResult>(`/draft-sim/${sessionId}/finalize`, {
        keepIds: [...selectedKeep],
      }, { useAccountToken: true })
      setFinalResult(data)
      setPhase('results')
    } catch { /* ignore */ }
    setLoading(false)
  }

  const toggleKeep = (id: string) => {
    setSelectedKeep(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 7) next.add(id)
      return next
    })
  }

  // ── 空闲状态 ──
  if (phase === 'idle') {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center">
        <div className="card w-96 text-center">
          <h1 className="text-2xl font-bold text-primary-400 mb-2">轮抓模拟器</h1>
          <p className="text-dark-300 text-sm mb-6">模拟7组完整round-robin轮抓，6个AI对手自动选取</p>
          <button onClick={handleCreate} disabled={loading} className="btn-primary w-full mb-3">
            {loading ? '创建中...' : '开始模拟'}
          </button>
          <button onClick={() => navigate('/lobby')} className="btn-secondary w-full text-sm">
            返回大厅
          </button>
        </div>
      </div>
    )
  }

  // ── 轮抓进行中 ──
  if (phase === 'drafting') {
    return (
      <div className="min-h-screen bg-dark-800 flex flex-col">
        <header className="bg-dark-700 border-b border-dark-400 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-primary-400">轮抓模拟器</h1>
            <span className="text-dark-200 text-sm">
              第 <span className="text-primary-400 font-bold">{round}</span>/{totalRounds} 轮
            </span>
            <span className="text-dark-300 text-sm">
              已选: <span className="text-amber-400 font-bold">{mySelections.length}</span>
            </span>
          </div>
          <button onClick={() => { setPhase('idle'); setSessionId(null) }} className="btn-sm btn-secondary text-xs">退出</button>
        </header>

        <main className="flex-1 flex p-4 gap-4 overflow-hidden">
          {/* 左：可选技能包 */}
          <div className="flex-1 overflow-y-auto">
            <h2 className="text-sm font-medium text-dark-200 mb-3">当前技能包 ({currentPack.length} 张)</h2>
            <div className="grid grid-cols-2 gap-2">
              {currentPack.map(skill => (
                <button
                  key={skill.id}
                  onClick={() => handlePick(skill.id)}
                  disabled={loading}
                  className="card hover:border-primary-500 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-dark-50">{skill.name}</span>
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                      skill.skillClass === 'A' ? 'bg-amber-900/50 text-amber-300' : 'bg-purple-900/50 text-purple-300',
                    )}>{skill.skillClass}级</span>
                  </div>
                  {skill.flavorText && <p className="text-[10px] text-dark-400 mb-1">{skill.flavorText}</p>}
                  <p className="text-xs text-dark-300 line-clamp-2">{skill.description}</p>
                  {skill.rarity === 'rare' && (
                    <span className="text-[9px] text-amber-400 mt-1 inline-block">高稀有度</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 右：侧边栏 */}
          <div className="w-72 flex flex-col gap-3 overflow-hidden">
            {/* AI 上次选取 */}
            {lastAiPicks.length > 0 && (
              <div className="card">
                <h3 className="text-xs font-medium text-dark-200 mb-2">AI 本轮选取</h3>
                <div className="space-y-1">
                  {lastAiPicks.map((p, i) => (
                    <div key={i} className="text-[10px] text-dark-300">
                      <span className="text-dark-100">{p.groupName}</span>: {p.skillName}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 各组选取数量 */}
            <div className="card">
              <h3 className="text-xs font-medium text-dark-200 mb-2">选取进度</h3>
              <div className="space-y-1">
                {Object.entries(selectionCounts).map(([name, count]) => (
                  <div key={name} className="flex justify-between text-xs">
                    <span className="text-dark-100">{name}</span>
                    <span className="text-dark-400">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 我的已选 */}
            <div className="card flex-1 overflow-y-auto">
              <h3 className="text-xs font-medium text-dark-200 mb-2">我的技能 ({mySelections.length})</h3>
              <div className="space-y-1">
                {mySelections.map(s => (
                  <div key={s.id} className="bg-dark-700 rounded px-2 py-1 text-xs text-dark-100">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-dark-400 ml-1">{s.skillClass}级</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── 保7弃3 ──
  if (phase === 'selecting') {
    return (
      <div className="min-h-screen bg-dark-800 flex flex-col">
        <header className="bg-dark-700 border-b border-dark-400 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-amber-400">选择保留技能</h1>
            <span className="text-dark-200 text-sm">
              已选 <span className={cn('font-bold', selectedKeep.size === 7 ? 'text-green-400' : 'text-amber-400')}>{selectedKeep.size}</span>/7
            </span>
          </div>
          <button onClick={handleFinalize} disabled={selectedKeep.size !== 7 || loading} className="btn-sm btn-primary text-xs">
            {loading ? '处理中...' : '确认定稿'}
          </button>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <p className="text-dark-300 text-sm mb-4">从 {mySelections.length} 个技能中选择 7 个保留，其余进入地图池</p>
          <div className="grid grid-cols-3 gap-3">
            {mySelections.map(skill => {
              const isKept = selectedKeep.has(skill.id)
              return (
                <button
                  key={skill.id}
                  onClick={() => toggleKeep(skill.id)}
                  className={cn(
                    'card text-left transition-all border-2',
                    isKept ? 'border-green-500 bg-green-900/10' : 'border-dark-400 opacity-70 hover:opacity-100',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-dark-50">{skill.name}</span>
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                      skill.skillClass === 'A' ? 'bg-amber-900/50 text-amber-300' : 'bg-purple-900/50 text-purple-300',
                    )}>{skill.skillClass}级</span>
                  </div>
                  <p className="text-xs text-dark-300 line-clamp-2">{skill.description}</p>
                  {isKept && <div className="text-[10px] text-green-400 mt-1 font-bold">保留</div>}
                </button>
              )
            })}
          </div>
        </main>
      </div>
    )
  }

  // ── 结果展示 ──
  if (phase === 'results' && finalResult) {
    return (
      <div className="min-h-screen bg-dark-800 flex flex-col">
        <header className="bg-dark-700 border-b border-dark-400 px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-green-400">轮抓结果</h1>
          <div className="flex gap-2">
            <button onClick={() => { setPhase('idle'); setSessionId(null); setFinalResult(null); setMySelections([]); setSelectedKeep(new Set()) }} className="btn-sm btn-primary text-xs">再来一局</button>
            <button onClick={() => navigate('/lobby')} className="btn-sm btn-secondary text-xs">返回大厅</button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            {/* 各组结果 */}
            <div>
              <h2 className="text-sm font-bold text-dark-50 mb-3">各组保留技能</h2>
              <div className="space-y-3">
                {finalResult.allResults.map(group => (
                  <div key={group.name} className="card">
                    <h3 className={cn('text-sm font-bold mb-2', group.isHuman ? 'text-primary-400' : 'text-dark-100')}>
                      {group.name} {group.isHuman && '(你)'}
                    </h3>
                    <div className="space-y-1">
                      {group.kept.map(s => (
                        <div key={s.id} className="flex justify-between text-xs bg-dark-700 rounded px-2 py-1">
                          <span className="text-dark-100">{s.name}</span>
                          <span className="text-dark-400">{s.skillClass}级</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 地图池 */}
            <div>
              <h2 className="text-sm font-bold text-dark-50 mb-3">
                地图池 <span className="text-dark-400 font-normal">({finalResult.mapPool.length} 张)</span>
              </h2>
              <div className="card max-h-[600px] overflow-y-auto">
                <div className="space-y-1">
                  {finalResult.mapPool.map((s, i) => (
                    <div key={`${s.id}-${i}`} className="bg-dark-700 rounded px-2 py-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-100 font-medium">{s.name}</span>
                        <span className="text-dark-400">{s.skillClass}级</span>
                      </div>
                      <p className="text-[10px] text-dark-300 mt-0.5 line-clamp-1">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return null
}
