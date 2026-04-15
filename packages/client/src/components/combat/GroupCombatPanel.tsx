import { useCallback } from 'react'
import { useCombatStore } from '@/stores/combat.store'
import { useAuthStore } from '@/stores/auth.store'
import { useGroupStore } from '@/stores/group.store'
import { getSocket } from '@/lib/socket'
import { C2S, STRIKE_COLOR_LABELS } from 'shared'
import type { StrikeColor } from 'shared'

const STRIKE_COLORS: StrikeColor[] = ['red', 'blue', 'green']
const COLOR_STYLES: Record<StrikeColor, string> = {
  red: 'bg-red-600 hover:bg-red-500',
  blue: 'bg-blue-600 hover:bg-blue-500',
  green: 'bg-green-600 hover:bg-green-500',
}

export function GroupCombatPanel() {
  const combatId = useCombatStore((s) => s.combatId)
  const isInCombat = useCombatStore((s) => s.isInCombat)
  const roundNumber = useCombatStore((s) => s.roundNumber)
  const phase = useCombatStore((s) => s.phase)
  const activePlayerId = useCombatStore((s) => s.activePlayerId)
  const playChain = useCombatStore((s) => s.playChain)
  const participants = useCombatStore((s) => s.participants)
  const myGroup = useGroupStore((s) => s.myGroup)
  const player = useAuthStore((s) => s.player)

  const handlePlayStrike = useCallback((color: StrikeColor, targetId: string) => {
    if (!combatId) return
    getSocket().emit(C2S.COMBAT_PLAY_STRIKE, {
      combatId,
      cardColor: color,
      targetId,
    })
  }, [combatId])

  const handleRespond = useCallback((color?: StrikeColor) => {
    if (!combatId) return
    getSocket().emit(C2S.COMBAT_RESPOND, {
      combatId,
      cardColor: color,
    })
  }, [combatId])

  const handlePass = useCallback(() => {
    if (!combatId) return
    getSocket().emit(C2S.COMBAT_PASS, {
      combatId,
    })
  }, [combatId])

  if (!isInCombat || !combatId) {
    return null
  }

  const isMyTurn = activePlayerId === player?.id
  const isRespondPhase = phase === 'respond'

  // Find opponents among participants (those not in my group)
  const myGroupPlayerIds = myGroup
    ? [myGroup.masterPlayerId, myGroup.servantPlayerId]
    : [player?.id].filter(Boolean) as string[]
  const opponents = participants.filter(p => !myGroupPlayerIds.includes(p.id))

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">战斗</h3>
        <span className="text-xs text-gray-400">
          第 {roundNumber} 轮
          {isMyTurn && ' -- 你的回合'}
        </span>
      </div>

      {/* 参战者状态 */}
      <div className="grid grid-cols-2 gap-3">
        {participants.map((p) => (
          <div
            key={p.id}
            className={`p-2 rounded border ${
              myGroupPlayerIds.includes(p.id) ? 'border-blue-500' : 'border-gray-600'
            } ${p.id === activePlayerId ? 'bg-gray-700' : ''}`}
          >
            <div className="text-xs text-gray-400">
              {myGroupPlayerIds.includes(p.id) ? '我方' : '对手'}
            </div>
            <div className="mt-1">
              <div className={`text-sm font-mono ${p.hp > 0 ? 'text-white' : 'text-red-500'}`}>
                HP {p.hp}/{p.hpMax}
              </div>
              <div className="text-xs text-gray-400">MP {p.mp}/{p.mpMax}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 出牌/响应控制 */}
      {isMyTurn && !isRespondPhase && (
        <div className="space-y-2">
          <div className="text-sm text-gray-300">选择攻击：</div>
          <div className="flex gap-2">
            {STRIKE_COLORS.map(color => (
              <button
                key={color}
                onClick={() => opponents[0] && handlePlayStrike(color, opponents[0].id)}
                className={`flex-1 py-2 rounded text-sm text-white ${COLOR_STYLES[color]}`}
              >
                {STRIKE_COLOR_LABELS[color]}
              </button>
            ))}
          </div>
          <button
            onClick={handlePass}
            className="w-full py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-300"
          >
            结束回合
          </button>
        </div>
      )}

      {isRespondPhase && (
        <div className="space-y-2">
          <div className="text-sm text-yellow-400">对手攻击! 选择响应：</div>
          <div className="flex gap-2">
            {STRIKE_COLORS.map(color => (
              <button
                key={color}
                onClick={() => handleRespond(color)}
                className={`flex-1 py-2 rounded text-sm text-white ${COLOR_STYLES[color]}`}
              >
                {STRIKE_COLOR_LABELS[color]}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleRespond(undefined)}
            className="w-full py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-300"
          >
            不响应
          </button>
        </div>
      )}

      {/* 战斗日志 */}
      <div className="max-h-32 overflow-y-auto text-xs text-gray-400 space-y-1">
        {playChain.map((entry: any, i: number) => (
          <div key={i}>
            {entry.type === 'play' ? '*' : '#'} {entry.cardColor}击
          </div>
        ))}
      </div>
    </div>
  )
}
