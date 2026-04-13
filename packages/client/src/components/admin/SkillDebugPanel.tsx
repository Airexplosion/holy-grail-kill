import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SkillLibraryEntry } from 'shared'
import { api } from '@/lib/api'

type SkillRow = SkillLibraryEntry & { enabled: boolean; source: 'db' | 'constant' }

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

export function SkillDebugPanel() {
  const [skills, setSkills] = useState<SkillRow[]>([])
  const [skillId, setSkillId] = useState('')
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
    const data = await api.get<SkillRow[]>('/admin/skills', { useAccountToken: true })
    const enabled = data.filter(skill => skill.enabled)
    setSkills(enabled)
    if (!skillId && enabled[0]) setSkillId(enabled[0].id)
  }, [skillId])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  const selectedSkill = useMemo(() => skills.find(skill => skill.id === skillId) || null, [skillId, skills])

  const runTest = async () => {
    if (!skillId) return
    setRunning(true)
    setError('')
    try {
      const data = await api.post<SandboxResult>('/admin/skills/debug-test', {
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
        <h2 className="text-lg font-bold text-dark-50">技能木头人测试</h2>
        <p className="text-sm text-dark-300 mt-1">选择技能后，设置攻击者和木头人状态，一键查看 before/after、效果结果和事件日志。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-dark-700 rounded-lg border border-dark-500 p-4 space-y-3">
          <div>
            <label className="block text-xs text-dark-300 mb-1">技能</label>
            <select className="input text-sm w-full" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
              {skills.map(skill => (
                <option key={skill.id} value={skill.id}>{skill.name} ({skill.id})</option>
              ))}
            </select>
            {selectedSkill && <p className="text-xs text-dark-400 mt-2">{selectedSkill.description}</p>}
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

        <div className="bg-dark-700 rounded-lg border border-dark-500 p-4 space-y-3">
          {!result && <div className="text-sm text-dark-400">还没有测试结果。</div>}
          {result && (
            <>
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
                <div className="text-xs font-medium text-dark-100 mb-2">效果结果（MP 消耗 {result.mpCost}）</div>
                <div className="space-y-2">
                  {result.results.map((item, idx) => (
                    <div key={idx} className="bg-dark-800 rounded p-2 text-xs text-dark-300">
                      <div className="text-dark-100">{item.effectType} {item.success ? '✓' : '✗'}</div>
                      <div>{item.description}</div>
                      {item.value !== undefined && <div>数值: {item.value}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-dark-100 mb-2">事件日志</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.events.map((event, idx) => (
                    <div key={idx} className="bg-dark-800 rounded p-2 text-xs text-dark-300">
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
