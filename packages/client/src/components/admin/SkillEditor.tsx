import { useState } from 'react'
import type { SkillLibraryEntry, SkillClass, SkillRarity, SkillType, SkillTriggerTiming } from 'shared'

interface SkillEditorProps {
  readonly skill: (SkillLibraryEntry & { enabled: boolean }) | null
  readonly onSave: (data: any) => Promise<void>
  readonly onCancel: () => void
}

const TRIGGER_TIMINGS: SkillTriggerTiming[] = [
  'manual', 'round_start', 'round_end', 'on_damage', 'on_heal',
  'on_move', 'on_scout', 'combat_before', 'combat_after',
  'preparation', 'action_before', 'action_after', 'standby',
]

export function SkillEditor({ skill, onSave, onCancel }: SkillEditorProps) {
  const [id, setId] = useState(skill?.id || '')
  const [name, setName] = useState(skill?.name || '')
  const [skillClass, setSkillClass] = useState<SkillClass>(skill?.skillClass || 'A')
  const [rarity, setRarity] = useState<SkillRarity>(skill?.rarity || 'normal')
  const [type, setType] = useState<SkillType>(skill?.type || 'active')
  const [triggerTiming, setTriggerTiming] = useState<SkillTriggerTiming>(skill?.triggerTiming || 'manual')
  const [description, setDescription] = useState(skill?.description || '')
  const [flavorText, setFlavorText] = useState(skill?.flavorText || '')
  const [mpCost, setMpCost] = useState(skill?.cost?.mp?.toString() || '')
  const [cooldown, setCooldown] = useState(skill?.cooldown?.toString() || '0')
  const [charges, setCharges] = useState(skill?.charges?.toString() || '')
  const [targetType, setTargetType] = useState(skill?.targetType || 'single')
  const [effectsJson, setEffectsJson] = useState(JSON.stringify(skill?.effects || [], null, 2))
  const [tagsStr, setTagsStr] = useState((skill?.tags || []).join(', '))
  const [enabled, setEnabled] = useState(skill?.enabled !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!id.trim() || !name.trim()) { setError('ID和名称必填'); return }
    let effects: any[]
    try { effects = JSON.parse(effectsJson) } catch { setError('效果JSON格式错误'); return }

    setSaving(true)
    setError('')
    try {
      await onSave({
        id: id.trim(),
        name: name.trim(),
        skillClass,
        rarity,
        type,
        triggerTiming,
        description: description.trim(),
        flavorText: flavorText.trim() || undefined,
        cost: mpCost ? { mp: parseInt(mpCost) || 0 } : undefined,
        cooldown: parseInt(cooldown) || 0,
        charges: charges ? parseInt(charges) : undefined,
        targetType,
        effects,
        tags: tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [],
        enabled,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-dark-50">{skill ? '编辑技能' : '新增技能'}</h3>
        <button onClick={onCancel} className="text-xs text-dark-400 hover:text-dark-200">返回列表</button>
      </div>

      {error && <div className="text-xs text-red-400 bg-red-900/20 rounded px-2 py-1">{error}</div>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-dark-300">ID *</label>
          <input className="input text-xs w-full" value={id} onChange={(e) => setId(e.target.value)} disabled={!!skill} placeholder="如 a13" />
        </div>
        <div>
          <label className="text-[10px] text-dark-300">名称 *</label>
          <input className="input text-xs w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] text-dark-300">等级</label>
          <select className="input text-xs w-full" value={skillClass} onChange={(e) => setSkillClass(e.target.value as SkillClass)}>
            <option value="A">A级</option>
            <option value="B">B级</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-dark-300">稀有度</label>
          <select className="input text-xs w-full" value={rarity} onChange={(e) => setRarity(e.target.value as SkillRarity)}>
            <option value="normal">普通</option>
            <option value="rare">稀有</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-dark-300">类型</label>
          <select className="input text-xs w-full" value={type} onChange={(e) => setType(e.target.value as SkillType)}>
            <option value="active">主动</option>
            <option value="passive">被动</option>
            <option value="triggered">触发</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-dark-300">目标</label>
          <select className="input text-xs w-full" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
            <option value="self">自身</option>
            <option value="single">单体</option>
            <option value="area">区域</option>
            <option value="global">全局</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-dark-300">触发时机</label>
        <select className="input text-xs w-full" value={triggerTiming} onChange={(e) => setTriggerTiming(e.target.value as SkillTriggerTiming)}>
          {TRIGGER_TIMINGS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="text-[10px] text-dark-300">描述</label>
        <textarea className="input text-xs w-full" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-dark-300">MP消耗</label>
          <input type="number" className="input text-xs w-full" value={mpCost} onChange={(e) => setMpCost(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-dark-300">冷却(回合)</label>
          <input type="number" className="input text-xs w-full" value={cooldown} onChange={(e) => setCooldown(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-dark-300">使用次数</label>
          <input type="number" className="input text-xs w-full" value={charges} onChange={(e) => setCharges(e.target.value)} placeholder="不填=无限" />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-dark-300">效果链 (JSON)</label>
        <textarea className="input text-xs w-full font-mono" rows={5} value={effectsJson} onChange={(e) => setEffectsJson(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-dark-300">标签 (逗号分隔)</label>
          <input className="input text-xs w-full" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-dark-300">风味文本</label>
          <input className="input text-xs w-full" value={flavorText} onChange={(e) => setFlavorText(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-dark-300 flex items-center gap-1">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          启用
        </label>
      </div>

      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={saving} className="btn-primary btn-sm text-xs flex-1">
          {saving ? '保存中...' : '保存'}
        </button>
        <button onClick={onCancel} className="btn-secondary btn-sm text-xs">取消</button>
      </div>
    </div>
  )
}
