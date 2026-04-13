import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SkillClass, SkillLibraryEntry } from 'shared'
import { api } from '@/lib/api'

type SkillRow = SkillLibraryEntry & { enabled?: boolean; source?: 'db' | 'constant' }

type SandboxResult = {
  skill: SkillLibraryEntry
  before: {
    source: { hp: number; hpMax: number; mp: number; mpMax: number; shield: number }
    target: { hp: number; hpMax: number; mp: number; mpMax: number; shield: number }
  }
  after: {
    source: { hp: number; hpMax: number; mp: number; mpMax: number; shield: number }
    target: { hp: number; hpMax: number; mp: number; mpMax: number; shield: number }
  }
  results: Array<{ effectType: string; description: string; value?: number; success: boolean }>
  events: Array<{ type: string; description: string; playerId: string }>
  mpCost: number
}

function summaryFromResult(result: SandboxResult) {
  const sourceHpChange = result.after.source.hp - result.before.source.hp
  const sourceMpChange = result.after.source.mp - result.before.source.mp
  const targetHpLoss = Math.max(0, result.before.target.hp - result.after.target.hp)
  const targetShieldLoss = Math.max(0, result.before.target.shield - result.after.target.shield)
  const successCount = result.results.filter(item => item.success).length
  const triggeredEffects = result.results
    .filter(item => item.success)
    .map(item => item.effectType)

  return {
    sourceHpChange,
    sourceMpChange,
    targetHpLoss,
    targetShieldLoss,
    successCount,
    triggeredEffects,
  }
}

function formatDelta(value: number) {
  if (value > 0) return `+${value}`
  return `${value}`
}

export function SkillDebugPanel({
  skillsPath = '/admin/skills',
  runPath = '/admin/skills/debug-test',
  title = '技能木头人测试',
  description = '选择技能后，设置攻击者和木头人状态，一键查看 before/after、效果结果和事件日志。',
}: {
  skillsPath?: string
  runPath?: string
  title?: string
  description?: string
}) {
  const [skills, setSkills] = useState<SkillRow[]>([])
  const [skillId, setSkillId] = useState('')
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState<'all' | SkillClass>('all')
  const [sourceHp, setSourceHp] = useState('100')
  const [sourceHpMax, setSourceHpMax] = useState('100')
  const [sourceMp, setSourceMp] = useState('10')
  const [sourceMpMax, setSourceMpMax] = useState('10')
  const [sourceBaseDamage, setSourceBaseDamage] = useState('10')
  const [targetHp, setTargetHp] = useState('100')
  const [targetHpMax, setTargetHpMax] = useState('100')
  const [targetShield, setTargetShield] = useState('0')
  const [result, setResult] = useState<SandboxResult | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const loadSkills = useCallback(async () => {
    const data = await api.get<SkillRow[]>(skillsPath, { useAccountToken: true })
    const enabled = data.filter(skill => skill.enabled !== false)
    setSkills(enabled)
  }, [skillsPath])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  const filteredSkills = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return skills.filter(skill => {
      const classMatch = filterClass === 'all' ? true : skill.skillClass === filterClass
      const searchMatch = keyword
        ? skill.name.toLowerCase().includes(keyword)
          || skill.id.toLowerCase().includes(keyword)
          || skill.description.toLowerCase().includes(keyword)
        : true
      return classMatch && searchMatch
    })
  }, [filterClass, search, skills])

  useEffect(() => {
    if (!filteredSkills.some(skill => skill.id === skillId)) {
      setSkillId(filteredSkills[0]?.id || '')
    }
  }, [filteredSkills, skillId])

  const selectedSkill = useMemo(() => filteredSkills.find(skill => skill.id === skillId) || skills.find(skill => skill.id === skillId) || null, [filteredSkills, skillId, skills])
  const resultSummary = result ? summaryFromResult(result) : null

  const runTest = async () => {
    if (!skillId) return
    setRunning(true)
    setError('')
    try {
      const data = await api.post<SandboxResult>(runPath, {
        skillId,
        source: {
          hp: parseInt(sourceHp, 10) || 0,
          hpMax: parseInt(sourceHpMax, 10) || 0,
          mp: parseInt(sourceMp, 10) || 0,
          mpMax: parseInt(sourceMpMax, 10) || 0,
          baseDamage: parseInt(sourceBaseDamage, 10) || 0,
        },
        target: {
          hp: parseInt(targetHp, 10) || 0,
          hpMax: parseInt(targetHpMax, 10) || 0,
          shield: parseInt(targetShield, 10) || 0,
        },
      }, { useAccountToken: true })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '测试失败')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-dark-50">{title}</h2>
        <p className="text-sm text-dark-300 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-dark-700 rounded-lg border border-dark-500 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="text-xs text-dark-300">
              搜索技能名 / ID
              <input
                className="input text-sm w-full mt-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="比如：生命、a03、圣剑"
              />
            </label>
            <label className="text-xs text-dark-300">
              技能分类
              <select className="input text-sm w-full mt-1" value={filterClass} onChange={(e) => setFilterClass(e.target.value as 'all' | SkillClass)}>
                <option value="all">全部</option>
                <option value="A">A 级技能</option>
                <option value="B">B 级宝具</option>
              </select>
            </label>
          </div>

          <div>
            <label className="block text-xs text-dark-300 mb-1">技能（当前 {filteredSkills.length} 个）</label>
            <select className="input text-sm w-full" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
              {filteredSkills.map(skill => (
                <option key={skill.id} value={skill.id}>{skill.name} [{skill.skillClass}] ({skill.id})</option>
              ))}
            </select>
            {selectedSkill && (
              <div className="mt-2 bg-dark-800 rounded p-3 text-xs text-dark-300 space-y-1">
                <div className="text-dark-100 font-medium">{selectedSkill.name} / {selectedSkill.id}</div>
                <div>分类：{selectedSkill.skillClass}　类型：{selectedSkill.type}　触发：{selectedSkill.triggerTiming}</div>
                <div>描述：{selectedSkill.description}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-dark-300">攻击者 HP<input className="input text-sm w-full mt-1" value={sourceHp} onChange={(e) => setSourceHp(e.target.value)} /></label>
            <label className="text-xs text-dark-300">攻击者 HP上限<input className="input text-sm w-full mt-1" value={sourceHpMax} onChange={(e) => setSourceHpMax(e.target.value)} /></label>
            <label className="text-xs text-dark-300">攻击者 MP<input className="input text-sm w-full mt-1" value={sourceMp} onChange={(e) => setSourceMp(e.target.value)} /></label>
            <label className="text-xs text-dark-300">攻击者 MP上限<input className="input text-sm w-full mt-1" value={sourceMpMax} onChange={(e) => setSourceMpMax(e.target.value)} /></label>
            <label className="text-xs text-dark-300 col-span-2">攻击者基准伤害<input className="input text-sm w-full mt-1" value={sourceBaseDamage} onChange={(e) => setSourceBaseDamage(e.target.value)} /></label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-dark-300">木头人 HP<input className="input text-sm w-full mt-1" value={targetHp} onChange={(e) => setTargetHp(e.target.value)} /></label>
            <label className="text-xs text-dark-300">木头人 HP上限<input className="input text-sm w-full mt-1" value={targetHpMax} onChange={(e) => setTargetHpMax(e.target.value)} /></label>
            <label className="text-xs text-dark-300 col-span-2">木头人护盾<input className="input text-sm w-full mt-1" value={targetShield} onChange={(e) => setTargetShield(e.target.value)} /></label>
          </div>

          <button className="btn-sm btn-primary text-sm" onClick={runTest} disabled={running || !skillId}>
            {running ? '测试中...' : '执行测试'}
          </button>
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        <div className="bg-dark-700 rounded-lg border border-dark-500 p-4 space-y-4">
          {!result && <div className="text-sm text-dark-400">还没有测试结果。</div>}
          {result && resultSummary && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-dark-800 rounded p-3">
                  <div className="text-[11px] text-dark-400">造成伤害</div>
                  <div className="text-lg font-bold text-red-400">{resultSummary.targetHpLoss}</div>
                </div>
                <div className="bg-dark-800 rounded p-3">
                  <div className="text-[11px] text-dark-400">扣掉护盾</div>
                  <div className="text-lg font-bold text-amber-400">{resultSummary.targetShieldLoss}</div>
                </div>
                <div className="bg-dark-800 rounded p-3">
                  <div className="text-[11px] text-dark-400">MP 变化</div>
                  <div className="text-lg font-bold text-blue-400">{formatDelta(resultSummary.sourceMpChange)}</div>
                </div>
                <div className="bg-dark-800 rounded p-3">
                  <div className="text-[11px] text-dark-400">攻击者 HP 变化</div>
                  <div className="text-lg font-bold text-green-400">{formatDelta(resultSummary.sourceHpChange)}</div>
                </div>
                <div className="bg-dark-800 rounded p-3">
                  <div className="text-[11px] text-dark-400">成功效果数</div>
                  <div className="text-lg font-bold text-primary-400">{resultSummary.successCount}</div>
                </div>
                <div className="bg-dark-800 rounded p-3">
                  <div className="text-[11px] text-dark-400">本次技能</div>
                  <div className="text-sm font-bold text-dark-100">{result.skill.name}</div>
                </div>
              </div>

              <div className="bg-dark-800 rounded p-3 text-xs">
                <div className="text-dark-100 font-medium mb-2">触发了哪些效果</div>
                <div className="flex flex-wrap gap-2">
                  {resultSummary.triggeredEffects.length > 0 ? resultSummary.triggeredEffects.map((effect, idx) => (
                    <span key={`${effect}-${idx}`} className="px-2 py-1 rounded bg-dark-600 text-dark-200">
                      {effect}
                    </span>
                  )) : <span className="text-dark-400">没有成功触发的效果</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-dark-800 rounded p-3">
                  <div className="font-medium text-dark-100 mb-2">攻击者</div>
                  <div className="text-dark-300">HP: {result.before.source.hp} → {result.after.source.hp}</div>
                  <div className="text-dark-300">MP: {result.before.source.mp} → {result.after.source.mp}</div>
                  <div className="text-dark-300">护盾: {result.before.source.shield} → {result.after.source.shield}</div>
                </div>
                <div className="bg-dark-800 rounded p-3">
                  <div className="font-medium text-dark-100 mb-2">木头人</div>
                  <div className="text-dark-300">HP: {result.before.target.hp} → {result.after.target.hp}</div>
                  <div className="text-dark-300">MP: {result.before.target.mp} → {result.after.target.mp}</div>
                  <div className="text-dark-300">护盾: {result.before.target.shield} → {result.after.target.shield}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-dark-100 mb-2">效果明细（MP 消耗 {result.mpCost}）</div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {result.results.map((item, idx) => (
                    <div key={idx} className="bg-dark-800 rounded p-2 text-xs text-dark-300 border border-dark-600">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-dark-100 font-medium">{item.effectType}</div>
                        <div className={item.success ? 'text-green-400' : 'text-red-400'}>{item.success ? '成功' : '失败'}</div>
                      </div>
                      <div className="mt-1">{item.description}</div>
                      {item.value !== undefined && <div className="mt-1 text-dark-400">数值：{item.value}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-dark-100 mb-2">事件日志</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.events.map((event, idx) => (
                    <div key={idx} className="bg-dark-800 rounded p-2 text-xs text-dark-300 border border-dark-600">
                      <div className="text-dark-100">{event.type}</div>
                      <div>{event.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
