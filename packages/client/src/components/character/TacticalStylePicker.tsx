import { useCharacterCreateStore } from '@/stores/character-create.store'

const STYLES = [
  { color: 'red' as const, label: '红色', cn: '猛击', bg: 'bg-red-600/30', border: 'border-red-500' },
  { color: 'blue' as const, label: '蓝色', cn: '技击', bg: 'bg-blue-600/30', border: 'border-blue-500' },
  { color: 'green' as const, label: '绿色', cn: '迅击', bg: 'bg-green-600/30', border: 'border-green-500' },
]

export function TacticalStylePicker() {
  const { selectedTacticalStyle, setTacticalStyle } = useCharacterCreateStore()

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold">战术风格</h3>
      <p className="text-xs text-gray-400">每回合可使用一次：作为攻击/响应/支付色卡消耗</p>
      <div className="flex gap-3">
        {STYLES.map(s => (
          <button
            key={s.color}
            onClick={() => setTacticalStyle(s.color)}
            className={`flex-1 p-3 rounded border text-center transition-colors ${
              selectedTacticalStyle === s.color
                ? `${s.bg} ${s.border}`
                : 'bg-gray-800 border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-sm font-medium text-white">{s.label}</div>
            <div className="text-xs text-gray-400">{s.cn}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
