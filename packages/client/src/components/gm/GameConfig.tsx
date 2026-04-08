import { useState, useEffect } from 'react'
import { useRoomStore } from '@/stores/room.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'

export function GameConfig() {
  const config = useRoomStore((s) => s.config)
  const [values, setValues] = useState({
    maxOutpostsPerPlayer: 3,
    defaultActionPoints: 4,
    defaultHp: 100,
    defaultHpMax: 100,
    defaultMp: 50,
    defaultMpMax: 50,
  })

  useEffect(() => {
    if (config) {
      setValues({
        maxOutpostsPerPlayer: config.maxOutpostsPerPlayer,
        defaultActionPoints: config.defaultActionPoints,
        defaultHp: config.defaultHp,
        defaultHpMax: config.defaultHpMax,
        defaultMp: config.defaultMp,
        defaultMpMax: config.defaultMpMax,
      })
    }
  }, [config])

  const handleSave = () => {
    getSocket().emit(C2S.ROOM_CONFIG_UPDATE, values)
  }

  const fields = [
    { key: 'maxOutpostsPerPlayer', label: '每人最大据点数' },
    { key: 'defaultActionPoints', label: '默认行动点' },
    { key: 'defaultHp', label: '默认HP' },
    { key: 'defaultHpMax', label: '默认HP上限' },
    { key: 'defaultMp', label: '默认MP' },
    { key: 'defaultMpMax', label: '默认MP上限' },
  ] as const

  return (
    <div className="space-y-3">
      {fields.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between">
          <label className="text-xs text-dark-200">{label}</label>
          <input
            type="number"
            className="input text-xs w-24 text-right"
            value={values[key]}
            onChange={(e) => setValues({ ...values, [key]: parseInt(e.target.value) || 0 })}
          />
        </div>
      ))}
      <button onClick={handleSave} className="btn-sm btn-primary text-xs w-full">
        保存配置
      </button>
    </div>
  )
}
