import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useCombatStore } from '@/stores/combat.store'
import { useDeckBuildStore } from '@/stores/deck-build.store'
import { useRoomStore } from '@/stores/room.store'
import { getSocket } from '@/lib/socket'
import { C2S, STRIKE_COLOR_LABELS, RESPONSE_MAP } from 'shared'
import type { StrikeColor } from 'shared'
import { cn } from '@/lib/cn'

const COLOR_BG: Record<string, string> = {
  red: 'bg-red-700 hover:bg-red-600',
  blue: 'bg-blue-700 hover:bg-blue-600',
  green: 'bg-green-700 hover:bg-green-600',
}

export function CombatActionBar() {
  const playerId = useAuthStore((s) => s.player?.id)
  const combatId = useCombatStore((s) => s.combatId)
  const phase = useCombatStore((s) => s.phase)
  const activePlayerId = useCombatStore((s) => s.activePlayerId)
  const playChain = useCombatStore((s) => s.playChain)
  const participants = useCombatStore((s) => s.participants)
  const strikeCards = useDeckBuildStore((s) => s.strikeCards)
  const selectedSkillIds = useDeckBuildStore((s) => s.selectedSkillIds)
  const skillLibrary = useDeckBuildStore((s) => s.skillLibrary)
  const players = useRoomStore((s) => s.players).filter(p => !p.isGm && p.id !== playerId)
  const [targetId, setTargetId] = useState('')

  const isMyTurn = activePlayerId === playerId
  const lastPlay = playChain[playChain.length - 1]
  const isRespondTarget = phase === 'respond' && lastPlay?.targetId === playerId

  // Determine available response color
  const responseColor = lastPlay?.cardColor ? RESPONSE_MAP[lastPlay.cardColor] : null

  // Available targets (other participants)
  const otherParticipants = participants.filter(p => p.id !== playerId && p.hp > 0)

  if (!isMyTurn && !isRespondTarget) {
    return (
      <div className="bg-dark-700 rounded-lg p-3 text-center">
        <p className="text-dark-400 text-xs">等待对手行动...</p>
      </div>
    )
  }

  // Response mode
  if (isRespondTarget && responseColor) {
    return (
      <div className="bg-dark-700 rounded-lg p-3 space-y-2">
        <p className="text-xs text-amber-300 font-medium">你被攻击了！是否响应？</p>
        <div className="flex gap-2">
          <button
            onClick={() => getSocket().emit(C2S.COMBAT_RESPOND, { combatId, cardColor: responseColor })}
            disabled={(strikeCards[responseColor] || 0) <= 0}
            className={cn('btn-sm text-xs flex-1 text-white', COLOR_BG[responseColor], (strikeCards[responseColor] || 0) <= 0 && 'opacity-30')}
          >
            {STRIKE_COLOR_LABELS[responseColor]} 响应 ({strikeCards[responseColor] || 0})
          </button>
          <button
            onClick={() => getSocket().emit(C2S.COMBAT_RESPOND, { combatId })}
            className="btn-sm text-xs btn-secondary flex-1"
          >
            不响应
          </button>
        </div>
      </div>
    )
  }

  // Play mode — my turn
  return (
    <div className="bg-dark-700 rounded-lg p-3 space-y-2">
      {/* Target selector */}
      {otherParticipants.length > 0 && (
        <div>
          <label className="text-[10px] text-dark-300 block mb-0.5">目标</label>
          <select className="input text-xs w-full" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">选择目标...</option>
            {otherParticipants.map(p => {
              const info = players.find(pl => pl.id === p.id)
              return <option key={p.id} value={p.id}>{info?.displayName || p.id} (HP:{p.hp})</option>
            })}
          </select>
        </div>
      )}

      {/* Strike cards */}
      <div>
        <div className="text-[10px] text-dark-300 mb-1">击牌</div>
        <div className="flex gap-1">
          {(['red', 'blue', 'green'] as StrikeColor[]).map(color => (
            <button
              key={color}
              disabled={!targetId || (strikeCards[color] || 0) <= 0}
              onClick={() => getSocket().emit(C2S.COMBAT_PLAY_STRIKE, { combatId, cardColor: color, targetId })}
              className={cn('btn-sm text-xs flex-1 text-white', COLOR_BG[color], (!targetId || (strikeCards[color] || 0) <= 0) && 'opacity-30')}
            >
              {STRIKE_COLOR_LABELS[color]} ({strikeCards[color] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Skills */}
      {selectedSkillIds.length > 0 && (
        <div>
          <div className="text-[10px] text-dark-300 mb-1">技能</div>
          <div className="space-y-1">
            {selectedSkillIds.map(id => {
              const skill = skillLibrary.find(s => s.id === id)
              if (!skill || skill.type !== 'active') return null
              return (
                <button
                  key={id}
                  onClick={() => getSocket().emit(C2S.COMBAT_USE_SKILL, { combatId, skillId: id, targetId: targetId || undefined })}
                  className="w-full text-left text-xs bg-dark-600 hover:bg-dark-500 rounded px-2 py-1 text-dark-100 flex justify-between"
                >
                  <span>{skill.name}</span>
                  <span className="text-dark-400">{skill.cost?.mp ? `MP:${skill.cost.mp}` : ''}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Pass */}
      <button
        onClick={() => getSocket().emit(C2S.COMBAT_PASS, { combatId })}
        className="btn-sm btn-secondary text-xs w-full"
      >
        结束回合
      </button>
    </div>
  )
}
