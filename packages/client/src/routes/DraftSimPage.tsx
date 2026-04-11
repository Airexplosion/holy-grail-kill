/**
 * 轮抓模拟器
 * 开始 → 底池预览(角色可展开看技能) → 10轮抽选(全展示) → 保7弃3 → 结算复盘(含轮次时间线)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { SkillLibraryEntry, SkillPackGroup } from 'shared'
import { SKILL_CLASS_LABELS, SKILL_LIBRARY } from 'shared'

interface PickResult {
  success: boolean; error?: string; pickedSkill?: SkillLibraryEntry
  aiPicks?: Array<{ groupName: string; skillName: string }>
  round: number; totalRounds: number; draftComplete: boolean
  currentPack: SkillLibraryEntry[]; selectionCounts: Record<string, number>
}
interface RoundPick { round: number; groupName: string; skillName: string; skillId: string; rarity: string }
interface FinalizeResult {
  kept: SkillLibraryEntry[]; discarded: SkillLibraryEntry[]; mapPool: SkillLibraryEntry[]
  allResults: Array<{ name: string; isHuman: boolean; kept: SkillLibraryEntry[]; discarded: SkillLibraryEntry[] }>
  pickHistory: RoundPick[]
}
interface PoolInfo {
  totalSkills: number; selectedCharacters: string[]
  packGroup1Name?: string; packGroup2Name?: string
  publicCharacters?: string[]
  randomRareSkill: { name: string; sourceName: string; description: string } | null
  skillsBySource: Array<{ name: string; count: number }>
}

type Phase = 'idle' | 'pool_preview' | 'drafting' | 'selecting' | 'results'

function Badge({ s }: { s: { skillClass: string } }) {
  const label = SKILL_CLASS_LABELS[s.skillClass as 'A' | 'B'] || s.skillClass
  return <span className={cn('text-xs font-bold px-2 py-0.5 rounded shrink-0',
    s.skillClass === 'A' ? 'bg-amber-900/60 text-amber-300' : 'bg-purple-900/60 text-purple-300')}>{label}</span>
}

export function DraftSimPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(10)
  const [currentPack, setCurrentPack] = useState<SkillLibraryEntry[]>([])
  const [mySelections, setMySelections] = useState<SkillLibraryEntry[]>([])
  const [selectionCounts, setSelectionCounts] = useState<Record<string, number>>({})
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null)
  const [poolAllSkills, setPoolAllSkills] = useState<SkillLibraryEntry[]>([]) // 底池所有技能（用于预览）
  const [finalResult, setFinalResult] = useState<FinalizeResult | null>(null)
  const [selectedKeep, setSelectedKeep] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [lastPickWasRare, setLastPickWasRare] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)
  const [expandedChar, setExpandedChar] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewTab, setReviewTab] = useState<'timeline' | 'groups' | 'pool'>('timeline')
  const [packGroups, setPackGroups] = useState<SkillPackGroup[]>([])
  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(new Set())
  const [packLoading, setPackLoading] = useState(false)

  // 进入 idle 阶段时获取包组列表
  useEffect(() => {
    if (phase !== 'idle') return
    let cancelled = false
    const fetchPacks = async () => {
      setPackLoading(true)
      try {
        const data = await api.get<SkillPackGroup[]>('/draft-sim/pack-groups', { useAccountToken: true })
        if (!cancelled) {
          setPackGroups(data)
          setSelectedPacks(new Set())
        }
      } catch {
        // 获取失败静默处理
      }
      if (!cancelled) setPackLoading(false)
    }
    fetchPacks()
    return () => { cancelled = true }
  }, [phase])

  const togglePack = (id: string) => {
    setSelectedPacks(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 2) {
        next.add(id)
      }
      return next
    })
  }

  const handleCreate = async () => {
    if (selectedPacks.size !== 2) return
    setLoading(true)
    try {
      const data = await api.post<any>('/draft-sim/create', { packGroupIds: [...selectedPacks] }, { useAccountToken: true })
      setSessionId(data.sessionId)
      setRound(data.round); setTotalRounds(data.totalRounds)
      setCurrentPack(data.currentPack); setPoolInfo(data.poolInfo)
      setMySelections([]); setLastPickWasRare(false)
      setPhase('pool_preview')
    } catch {
      // 创建失败静默处理
    }
    setLoading(false)
  }

  const handlePick = async (skillId: string) => {
    if (!sessionId || loading) return
    const skill = currentPack.find(s => s.id === skillId)
    if (skill?.rarity === 'rare' && lastPickWasRare && currentPack.some(s => s.rarity !== 'rare')) {
      setPickError('不能连续两轮选择高稀有度'); setTimeout(() => setPickError(null), 3000); return
    }
    setLoading(true); setPickError(null)
    try {
      const data = await api.post<PickResult>(`/draft-sim/${sessionId}/pick`, { skillId }, { useAccountToken: true })
      if (!data.success) { setPickError(data.error || '选取失败'); setTimeout(() => setPickError(null), 3000); setLoading(false); return }
      if (data.pickedSkill) { setMySelections(prev => [...prev, data.pickedSkill!]); setLastPickWasRare(data.pickedSkill.rarity === 'rare') }
      setRound(data.round); setTotalRounds(data.totalRounds); setCurrentPack(data.currentPack); setSelectionCounts(data.selectionCounts)
      if (data.draftComplete) setPhase('selecting')
    } catch (err) { setPickError(err instanceof Error ? err.message : '选取失败'); setTimeout(() => setPickError(null), 3000) }
    setLoading(false)
  }

  const handleFinalize = async () => {
    if (!sessionId || selectedKeep.size !== 7) return
    setLoading(true)
    try {
      const data = await api.post<FinalizeResult>(`/draft-sim/${sessionId}/finalize`, { keepIds: [...selectedKeep] }, { useAccountToken: true })
      setFinalResult(data); setPhase('results')
    } catch {}
    setLoading(false)
  }

  const toggleKeep = (id: string) => { setSelectedKeep(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else if (n.size < 7) n.add(id); return n }) }
  const resetAll = () => { setPhase('idle'); setSessionId(null); setFinalResult(null); setMySelections([]); setSelectedKeep(new Set()); setPoolInfo(null); setExpandedId(null); setExpandedChar(null); setSelectedPacks(new Set()) }

  // ── 开始：选择包组 ──
  if (phase === 'idle') return (
    <div className="min-h-screen bg-dark-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary-400 mb-2">轮抓模拟器</h1>
          <p className="text-dark-200">选择 <span className="text-primary-400 font-bold">2</span> 个角色组作为底池基础，再随机补充7个角色</p>
        </div>

        {packLoading ? (
          <div className="text-center text-dark-300 py-12">加载包组中...</div>
        ) : packGroups.length === 0 ? (
          <div className="text-center text-dark-400 py-12">暂无包组数据</div>
        ) : (
          <div className="space-y-3 mb-6">
            {packGroups.map(pg => {
              const isSelected = selectedPacks.has(pg.id)
              const disabled = !isSelected && selectedPacks.size >= 2
              return (
                <button key={pg.id} onClick={() => !disabled && togglePack(pg.id)}
                  className={cn(
                    'w-full text-left rounded-lg border-2 px-5 py-4 transition-all',
                    isSelected
                      ? 'border-primary-500 bg-primary-900/20'
                      : disabled
                        ? 'border-dark-500 bg-dark-700 opacity-40 cursor-not-allowed'
                        : 'border-dark-500 bg-dark-700 hover:border-dark-300',
                  )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-dark-50">{pg.name}</span>
                    {isSelected && <span className="text-xs font-medium text-primary-400 bg-primary-900/40 px-2 py-0.5 rounded">已选</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pg.characterSourceNames.map(name => (
                      <span key={name} className="text-sm bg-dark-600 text-dark-200 px-2 py-0.5 rounded">{name}</span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button onClick={handleCreate} disabled={selectedPacks.size !== 2 || loading}
            className={cn('btn-primary w-full text-lg py-3', selectedPacks.size !== 2 && 'opacity-50 cursor-not-allowed')}>
            {loading ? '创建中...' : selectedPacks.size === 2 ? '开始模拟' : `请选择 ${2 - selectedPacks.size} 个包组`}
          </button>
          <button onClick={() => navigate('/lobby')} className="btn-secondary w-full">返回大厅</button>
        </div>
      </div>
    </div>
  )

  // ── 底池预览（角色可点展开看技能） ──
  if (phase === 'pool_preview' && poolInfo) return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      <header className="bg-dark-700 border-b border-dark-400 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary-400">底池预览</h1>
        <button onClick={() => setPhase('drafting')} className="btn-primary">开始轮抓</button>
      </header>
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full overflow-y-auto">
        {poolInfo.packGroup1Name && poolInfo.packGroup2Name && (
          <div className="bg-primary-900/20 border border-primary-800/40 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-primary-300">
              选定包组：<span className="font-bold text-primary-400">{poolInfo.packGroup1Name}</span> + <span className="font-bold text-primary-400">{poolInfo.packGroup2Name}</span>
              <span className="text-dark-300 ml-2">(8角色固定 + 7角色随机)</span>
            </p>
          </div>
        )}
        <p className="text-base text-dark-100 mb-4">
          <span className="text-primary-400 font-bold">{poolInfo.selectedCharacters.length}</span> 个角色入池，共
          <span className="text-primary-400 font-bold ml-1">{poolInfo.totalSkills}</span> 个技能。点击角色查看技能详情。
        </p>

        <div className="space-y-2 mb-6">
          {poolInfo.skillsBySource.map(src => {
            const isOpen = expandedChar === src.name
            // 从 currentPack 无法获取全部技能，用 SKILL_LIBRARY 匹配
            return (
              <div key={src.name} className="bg-dark-700 rounded-lg overflow-hidden">
                <button onClick={() => setExpandedChar(isOpen ? null : src.name)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-600 transition-colors text-left">
                  <span className="text-base font-medium text-dark-50">{src.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-dark-400">{src.count}个技能</span>
                    <span className="text-dark-400 text-xs">{isOpen ? '收起' : '展开'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 space-y-2 border-t border-dark-600 pt-2">
                    {/* 用 SKILL_LIBRARY 查该角色的技能（模拟器底池来自SKILL_LIBRARY） */}
                    {(() => {
                      const charSkills = (SKILL_LIBRARY as readonly SkillLibraryEntry[]).filter(s => s.flavorText === src.name)
                      return charSkills.map(skill => (
                        <div key={skill.id} className="bg-dark-600 rounded px-3 py-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-dark-50">{skill.name}</span>
                            <Badge s={skill} />
                          </div>
                          <p className="text-sm text-dark-200">{skill.description}</p>
                          {skill.rarity === 'rare' && <span className="text-xs text-amber-400 mt-1 inline-block">高稀有度</span>}
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {poolInfo.randomRareSkill && (
          <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-300 font-medium mb-2">额外随机高稀有度技能：</p>
            <div className="bg-dark-700 rounded px-3 py-2">
              <span className="text-base font-bold text-dark-50">{poolInfo.randomRareSkill.name}</span>
              <span className="text-sm text-primary-300 ml-2">{poolInfo.randomRareSkill.sourceName}</span>
              <p className="text-sm text-dark-200 mt-1">{poolInfo.randomRareSkill.description}</p>
            </div>
          </div>
        )}

        <p className="text-sm text-dark-300 text-center">每包 {Math.ceil(poolInfo.totalSkills / 7)} 张，7组线性传递，共10轮</p>
      </main>
    </div>
  )

  // ── 轮抓中（卡牌全展示描述） ──
  if (phase === 'drafting') {
    const displayRound = Math.min(round, totalRounds)
    return (
      <div className="min-h-screen bg-dark-800 flex flex-col">
        <header className="bg-dark-700 border-b border-dark-400 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-primary-400">轮抓</h1>
            <span className="text-lg text-dark-100">第 <span className="text-primary-400 font-bold">{displayRound}</span>/{totalRounds} 轮</span>
            <span className="text-lg text-dark-100">已选 <span className="text-amber-400 font-bold">{mySelections.length}</span>/10</span>
            {lastPickWasRare && <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-1 rounded">上轮选了高稀有，本轮不可再选</span>}
          </div>
          <button onClick={resetAll} className="btn-sm btn-secondary">退出</button>
        </header>

        <main className="flex-1 flex p-5 gap-5 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <h2 className="text-base font-medium text-dark-100 mb-3">当前包 ({currentPack.length} 张) — 点击选取</h2>
            {pickError && <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-400 mb-3">{pickError}</div>}
            <div className="space-y-3">
              {currentPack.map(skill => {
                const blocked = skill.rarity === 'rare' && lastPickWasRare && currentPack.some(s => s.rarity !== 'rare')
                return (
                  <button key={skill.id} onClick={() => !blocked && handlePick(skill.id)} disabled={loading || blocked}
                    className={cn('card w-full text-left p-4 transition-all', blocked ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary-500')}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base font-bold text-dark-50">{skill.name}</span>
                      <div className="flex items-center gap-2">
                        {skill.rarity === 'rare' && <span className={cn('text-xs font-medium', blocked ? 'text-red-400' : 'text-amber-400')}>{blocked ? '不可选' : '高稀有度'}</span>}
                        <Badge s={skill} />
                      </div>
                    </div>
                    {skill.flavorText && <p className="text-sm text-primary-300 mb-1">{skill.flavorText}</p>}
                    <p className="text-sm text-dark-200 leading-relaxed">{skill.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="w-72 flex flex-col gap-4 overflow-hidden">
            <div className="card">
              <h3 className="text-sm font-medium text-dark-100 mb-2">选取进度</h3>
              {Object.entries(selectionCounts).map(([name, count]) => (
                <div key={name} className="flex justify-between text-sm py-0.5"><span className="text-dark-100">{name}</span><span className="text-dark-300">{count}</span></div>
              ))}
            </div>
            <div className="card flex-1 overflow-y-auto">
              <h3 className="text-sm font-medium text-dark-100 mb-2">我的技能 ({mySelections.length})</h3>
              {mySelections.map(s => (
                <div key={s.id} className="bg-dark-700 rounded px-3 py-2 mb-1 cursor-pointer hover:bg-dark-600"
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                  <div className="flex items-center justify-between"><span className="text-sm font-medium text-dark-50">{s.name}</span><Badge s={s} /></div>
                  {expandedId === s.id && (
                    <>
                      {s.flavorText && <p className="text-xs text-primary-300 mt-1">{s.flavorText}</p>}
                      <p className="text-xs text-dark-200 mt-1 pt-1 border-t border-dark-500">{s.description}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── 保7弃3 ──
  if (phase === 'selecting') return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      <header className="bg-dark-700 border-b border-dark-400 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-amber-400">10轮完成 — 保留7个</h1>
          <span className="text-base text-dark-100">已选 <span className={cn('font-bold text-lg', selectedKeep.size === 7 ? 'text-green-400' : 'text-amber-400')}>{selectedKeep.size}</span>/7</span>
        </div>
        <button onClick={handleFinalize} disabled={selectedKeep.size !== 7 || loading} className="btn-primary">{loading ? '处理中...' : '确认定稿'}</button>
      </header>
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          {mySelections.map(skill => {
            const kept = selectedKeep.has(skill.id)
            return (
              <button key={skill.id} onClick={() => toggleKeep(skill.id)}
                className={cn('card text-left p-4 border-2 transition-all', kept ? 'border-green-500 bg-green-900/10' : 'border-dark-400 opacity-60 hover:opacity-100')}>
                <div className="flex items-center justify-between mb-1"><span className="text-base font-bold text-dark-50">{skill.name}</span><Badge s={skill} /></div>
                {skill.flavorText && <p className="text-sm text-primary-300 mb-1">{skill.flavorText}</p>}
                <p className="text-sm text-dark-200">{skill.description}</p>
                {kept && <div className="text-sm text-green-400 mt-2 font-bold">已保留</div>}
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )

  // ── 结算复盘（带轮次时间线） ──
  if (phase === 'results' && finalResult) {
    const rounds = Array.from({ length: 10 }, (_, i) => i + 1)
    const groupNames = finalResult.allResults.map(r => r.name)

    return (
      <div className="min-h-screen bg-dark-800 flex flex-col">
        <header className="bg-dark-700 border-b border-dark-400 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-green-400">轮抓结算</h1>
            <div className="flex gap-1">
              {(['timeline', 'groups', 'pool'] as const).map(tab => (
                <button key={tab} onClick={() => setReviewTab(tab)}
                  className={cn('px-3 py-1 rounded text-sm', reviewTab === tab ? 'bg-primary-600 text-white' : 'bg-dark-500 text-dark-300')}>
                  {tab === 'timeline' ? '轮次回顾' : tab === 'groups' ? '各组详情' : '地图池'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={resetAll} className="btn-primary">再来一局</button>
            <button onClick={() => navigate('/lobby')} className="btn-secondary">返回大厅</button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* 轮次回顾 */}
          {reviewTab === 'timeline' && (
            <div>
              <h2 className="text-lg font-bold text-dark-50 mb-4">每轮选取时间线</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-400">
                      <th className="text-left py-2 px-2 text-dark-300 w-16">轮次</th>
                      {groupNames.map(name => (
                        <th key={name} className={cn('text-left py-2 px-2 text-xs',
                          finalResult.allResults.find(r => r.name === name)?.isHuman ? 'text-primary-400' : 'text-dark-300')}>
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map(r => (
                      <tr key={r} className="border-b border-dark-600/50 hover:bg-dark-700/50">
                        <td className="py-2 px-2 text-dark-400 font-mono">{r}</td>
                        {groupNames.map(name => {
                          const pick = finalResult.pickHistory.find(p => p.round === r && p.groupName === name)
                          return (
                            <td key={name} className="py-2 px-2">
                              {pick ? (
                                <span className={cn('text-xs',
                                  finalResult.allResults.find(gr => gr.name === name)?.isHuman ? 'text-dark-50 font-medium' : 'text-dark-200')}>
                                  {pick.skillName}
                                  {pick.rarity === 'rare' && <span className="text-amber-400 ml-1">稀</span>}
                                </span>
                              ) : <span className="text-dark-500">-</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 各组详情 */}
          {reviewTab === 'groups' && (
            <div className="grid grid-cols-2 gap-4">
              {finalResult.allResults.map(group => (
                <div key={group.name} className="card p-4">
                  <h3 className={cn('text-base font-bold mb-3', group.isHuman ? 'text-primary-400' : 'text-dark-100')}>
                    {group.name} {group.isHuman && '(你)'}
                  </h3>
                  <div className="mb-2">
                    <span className="text-xs text-green-400">保留 ({group.kept.length})</span>
                    {group.kept.map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-dark-700 rounded px-3 py-1.5 mt-1">
                        <span className="text-sm text-dark-50">{s.name}</span><Badge s={s} />
                      </div>
                    ))}
                  </div>
                  {group.discarded.length > 0 && (
                    <div>
                      <span className="text-xs text-red-400">弃置 ({group.discarded.length})</span>
                      {group.discarded.map(s => (
                        <div key={s.id} className="flex items-center justify-between bg-dark-700/50 rounded px-3 py-1 mt-1 opacity-60">
                          <span className="text-xs text-dark-200">{s.name}</span><Badge s={s} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 地图池 */}
          {reviewTab === 'pool' && (
            <div>
              <h2 className="text-lg font-bold text-dark-50 mb-4">地图池 ({finalResult.mapPool.length})</h2>
              <div className="space-y-1.5">
                {finalResult.mapPool.map((s, i) => (
                  <div key={`${s.id}-${i}`} className="bg-dark-700 rounded px-3 py-2 cursor-pointer hover:bg-dark-600"
                    onClick={() => setExpandedId(expandedId === `pool-${i}` ? null : `pool-${i}`)}>
                    <div className="flex items-center justify-between">
                      <div><span className="text-sm font-medium text-dark-50">{s.name}</span>{s.flavorText && <span className="text-xs text-dark-400 ml-2">{s.flavorText}</span>}</div>
                      <Badge s={s} />
                    </div>
                    {expandedId === `pool-${i}` && <p className="text-xs text-dark-200 mt-1 pt-1 border-t border-dark-500">{s.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  return null
}
