import { useCallback } from 'react'
import { useGroupStore } from '@/stores/group.store'
import { getSocket } from '@/lib/socket'
import { C2S, SECRET_KEY_USE_LABELS } from 'shared'
import type { SecretKeyUseType } from 'shared'

const KEY_OPTIONS: SecretKeyUseType[] = ['prevent_fatal', 'restore_mp', 'discard_draw', 'recall_servant']

export function SecretKeyPanel() {
  const myGroup = useGroupStore((s) => s.myGroup)

  const handleUse = useCallback((useType: SecretKeyUseType) => {
    getSocket().emit(C2S.SECRET_KEY_USE, { useType })
  }, [])

  if (!myGroup) return null

  const remaining = myGroup.secretKeysRemaining

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-white">秘钥</h4>
        <span className="text-xs text-yellow-400">{remaining}/3</span>
      </div>
      {remaining > 0 ? (
        <div className="space-y-1">
          {KEY_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => handleUse(opt)}
              className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded transition-colors"
            >
              {SECRET_KEY_USE_LABELS[opt]}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-500">已用完</div>
      )}
    </div>
  )
}
