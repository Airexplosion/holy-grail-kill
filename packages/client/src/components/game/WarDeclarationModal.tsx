import { useCallback } from 'react'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'

interface WarDeclarationModalProps {
  readonly warId: string
  readonly attackerName: string
  readonly onClose: () => void
}

export function WarDeclarationModal({ warId, attackerName, onClose }: WarDeclarationModalProps) {
  const handleFight = useCallback(() => {
    getSocket().emit(C2S.WAR_RESPOND, { warId, response: 'fight' })
    onClose()
  }, [warId, onClose])

  const handleFlee = useCallback(() => {
    getSocket().emit(C2S.WAR_RESPOND, { warId, response: 'flee' })
    onClose()
  }, [warId, onClose])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="text-xl font-bold text-red-400 text-center">宣战！</h3>
        <p className="text-center text-gray-300">
          <span className="text-white font-medium">{attackerName}</span> 对你发起宣战
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleFight}
            className="flex-1 py-3 rounded bg-red-600 hover:bg-red-500 text-white font-medium"
          >
            迎战
          </button>
          <button
            onClick={handleFlee}
            className="flex-1 py-3 rounded bg-gray-600 hover:bg-gray-500 text-white font-medium"
          >
            逃离
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center">
          逃离需弃置所有地点牌，直至下回合结束无法使用任何牌
        </p>
      </div>
    </div>
  )
}
