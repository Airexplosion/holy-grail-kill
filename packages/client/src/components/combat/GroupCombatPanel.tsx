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
  const combatState = useCombatStore((s) => s.activeCombat)
  const myGroup = useGroupStore((s) => s.myGroup)
  const player = useAuthStore((s) => s.player)

  const handlePlayStrike = useCallback((color: StrikeColor, targetGroupId: string) => {
    if (!combatState) return
    getSocket().emit(C2S.COMBAT_PLAY_STRIKE, {
      combatId: combatState.combatId,
      cardColor: color,
      targetGroupId,
    })
  }, [combatState])

  const handleRespond = useCallback((color?: StrikeColor) => {
    if (!combatState) return
    getSocket().emit(C2S.COMBAT_RESPOND, {
      combatId: combatState.combatId,
      cardColor: color,
    })
  }, [combatState])

  const handlePass = useCallback(() => {
    if (!combatState) return
    getSocket().emit(C2S.COMBAT_PASS, {
      combatId: combatState.combatId,
    })
  }, [combatState])

  if (!combatState || !combatState.isActive) {
    return null
  }

  const isMyTurn = combatState.activeGroupId === myGroup?.id
  const isRespondPhase = combatState.phase === 'respond'

  // 找对手组
  const opponentGroups = (combatState as any).groups?.filter(
    (g: any) => g.groupId !== myGroup?.id
  ) || []

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">战斗</h3>
        <span className="text-xs text-gray-400">
          第 {combatState.roundNumber} 轮
          {isMyTurn && ' — 你的回合'}
        </span>
      </div>

      {/* 参战组状态 */}
      <div className="grid grid-cols-2 gap-3">
        {(combatState as any).groups?.map((g: any) => (
          <div
            key={g.groupId}
            className={`p-2 rounded border ${
              g.groupId === myGroup?.id ? 'border-blue-500' : 'border-gray-600'
            } ${g.groupId === combatState.activeGroupId ? 'bg-gray-700' : ''}`}
          >
            <div className="text-xs text-gray-400">
              {g.groupId === myGroup?.id ? '我方' : '对手'}
              {g.attackerSide ? ' (宣战方)' : ''}
            </div>
            <div className="flex justify-between mt-1">
              <div>
                <div className="text-xs text-gray-500">幻身</div>
                <div className={`text-sm font-mono ${g.servant.alive ? 'text-white' : 'text-red-500'}`}>
                  HP {g.servant.hp}/{g.servant.hpMax}
                </div>
                <div className="text-xs text-gray-400">MP {g.servant.mp} | AC {g.servant.ac}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">篡者</div>
                <div className="text-sm font-mono text-white">
                  HP {g.master.hp}/{g.master.hpMax}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">手牌: {g.handCount}</div>
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
                onClick={() => opponentGroups[0] && handlePlayStrike(color, opponentGroups[0].groupId)}
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
          <div className="text-sm text-yellow-400">对手攻击！选择响应：</div>
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
        {combatState.playChain?.map((entry: any, i: number) => (
          <div key={i}>
            {entry.type === 'play' ? '⚔' : '🛡'} {entry.cardColor}击
          </div>
        ))}
      </div>
    </div>
  )
}
