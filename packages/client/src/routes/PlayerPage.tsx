import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useSocket } from '@/hooks/useSocket'
import { useGameStore } from '@/stores/game.store'
import { useGroupStore } from '@/stores/group.store'
import { PhaseDisplay } from '@/components/game/PhaseDisplay'
import { GameMap } from '@/components/map/GameMap'
import { CardHand } from '@/components/cards/CardHand'
import { ActionPanel } from '@/components/game/ActionPanel'
import { DeckBuildPanel } from '@/components/deck-build/DeckBuildPanel'
import { CombatPanel } from '@/components/combat/CombatPanel'
import { GroupCombatPanel } from '@/components/combat/GroupCombatPanel'
import { SkillBrowser } from '@/components/skills/SkillBrowser'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { ReadyButton } from '@/components/game/ReadyButton'
import { SecretKeyPanel } from '@/components/game/SecretKeyPanel'
import { useMapStore } from '@/stores/map.store'
import { useCombatStore } from '@/stores/combat.store'
import { TrueNamePanel } from '@/components/true-name/TrueNamePanel'
import { TrueNameGuessModal } from '@/components/true-name/TrueNameGuessModal'
import { PoolViewPanel } from '@/components/skill-pool/PoolViewPanel'
import { PoolDrawModal } from '@/components/skill-pool/PoolDrawModal'

export function PlayerPage() {
  useSocket()
  const player = useAuthStore((s) => s.player)
  const room = useAuthStore((s) => s.room)
  const leaveRoom = useAuthStore((s) => s.leaveRoom)
  const phase = useGameStore((s) => s.phase)
  const myGroup = useGroupStore((s) => s.myGroup)
  const currentRegionId = useMapStore((s) => s.currentRegionId)
  const regions = useMapStore((s) => s.regions)
  const currentRegion = regions.find(r => r.id === currentRegionId)
  const isInCombat = useCombatStore((s) => s.isInCombat)
  const [showSkillBrowser, setShowSkillBrowser] = useState(false)
  const isStandby = phase === 'standby'
  const isCombat = phase === 'combat' && isInCombat

  if (!player || !room) return null

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      {/* Top Bar */}
      <header className="bg-dark-700 border-b border-dark-400 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-primary-400">时缝之战</h1>
          <span className="text-dark-200 text-sm">
            房间: <span className="text-dark-50 font-mono">{room.code}</span>
          </span>
          <PhaseDisplay />
        </div>
        <div className="flex items-center gap-3">
          <ReadyButton />
          {currentRegion && (
            <span className="text-xs bg-dark-600 px-2 py-1 rounded text-primary-300">
              {currentRegion.name}
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: player.color }} />
            <span className="text-sm text-dark-100">{player.displayName}</span>
            {myGroup && (
              <span className="text-xs text-dark-300">({myGroup.name})</span>
            )}
          </div>
          <button onClick={() => setShowSkillBrowser(true)} className="btn-sm text-xs bg-dark-600 text-dark-200 hover:bg-dark-500">技能</button>
          <button onClick={leaveRoom} className="btn-sm btn-secondary text-xs">离开</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex p-4 gap-4 overflow-hidden">
        {/* Left: Map Area */}
        <div className="flex-1 card relative overflow-hidden">
          <GameMap />
        </div>

        {/* Right: Sidebar */}
        <div className="w-80 flex flex-col gap-3 overflow-hidden">
          {/* Stats */}
          <div className="card flex-shrink-0">
            <h3 className="text-sm font-medium text-dark-200 mb-2">状态</h3>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-400">HP</span>
                  <span>{player.hp}/{player.hpMax}</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${player.hpMax > 0 ? (player.hp / player.hpMax) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400">MP</span>
                  <span>{player.mp}/{player.mpMax}</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${player.mpMax > 0 ? (player.mp / player.mpMax) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Secret Key Panel */}
          {myGroup && <SecretKeyPanel />}

          {/* True Name Panel — 自动显示（遭遇过对手后出现） */}
          <TrueNamePanel />

          {/* 地图池查看 — 轮抓结束后自动出现 */}
          <PoolViewPanel />

          {/* Phase-specific panel */}
          {isCombat ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {myGroup ? <GroupCombatPanel /> : <CombatPanel />}
            </div>
          ) : isStandby ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <DeckBuildPanel />
            </div>
          ) : (
            <>
              <ActionPanel />
              <div className="card flex-1 min-h-0 flex flex-col overflow-hidden">
                <CardHand />
              </div>
            </>
          )}

          {/* Chat */}
          {!isCombat && (
            <div className="card h-40 flex-shrink-0">
              <ChatPanel />
            </div>
          )}
        </div>
      </main>
      {showSkillBrowser && <SkillBrowser onClose={() => setShowSkillBrowser(false)} />}
      <TrueNameGuessModal />
      <PoolDrawModal currentSkills={[]} />
    </div>
  )
}
