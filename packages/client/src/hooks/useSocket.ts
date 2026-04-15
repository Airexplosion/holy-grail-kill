import { useEffect, useRef } from 'react'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { useAuthStore } from '@/stores/auth.store'
import { useGameStore } from '@/stores/game.store'
import { useMapStore } from '@/stores/map.store'
import { useCardStore } from '@/stores/card.store'
import { useChatStore } from '@/stores/chat.store'
import { useRoomStore } from '@/stores/room.store'
import { useGmStore } from '@/stores/gm.store'
import { useDeckBuildStore } from '@/stores/deck-build.store'
import { useCombatStore } from '@/stores/combat.store'
import { useGroupStore } from '@/stores/group.store'
import { useDraftStore } from '@/stores/draft.store'
import { useTrueNameStore } from '@/stores/true-name.store'
import { useSkillPoolStore } from '@/stores/skill-pool.store'
import { S2C } from 'shared'
import type { Socket } from 'socket.io-client'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const isInGame = useAuthStore((s) => s.isInGame)
  const isGm = useAuthStore((s) => s.player?.isGm)

  useEffect(() => {
    if (!isInGame) return

    const socket = connectSocket()
    socketRef.current = socket

    // Room state
    socket.on(S2C.ROOM_STATE, (data: any) => {
      if (data.room?.config) useRoomStore.getState().setConfig(data.room.config)
      if (data.players) useRoomStore.getState().setPlayers(data.players)
    })

    socket.on(S2C.ROOM_CONFIG_UPDATED, (data: any) => {
      if (data.config) useRoomStore.getState().setConfig(data.config)
    })

    // Game phase
    socket.on(S2C.GAME_PHASE_CHANGED, (data: any) => {
      useGameStore.getState().setPhase(data.phase)
      useGameStore.getState().setTurnNumber(data.turnNumber)
    })

    // Map
    socket.on(S2C.MAP_STATE, (data: any) => {
      useMapStore.getState().setMapState(data)
      // Set current region from player positions
      const auth = useAuthStore.getState()
      if (auth.player && !auth.player.isGm) {
        const myPos = data.playerPositions?.find((p: any) => p.playerId === auth.player?.id)
        useMapStore.getState().setCurrentRegion(myPos?.regionId || auth.player.regionId || null)
      }
    })

    socket.on(S2C.MAP_UPDATED, (data: any) => {
      useMapStore.getState().setMapState(data)
      const auth = useAuthStore.getState()
      if (auth.player && !auth.player.isGm) {
        const myPos = data.playerPositions?.find((p: any) => p.playerId === auth.player?.id)
        useMapStore.getState().setCurrentRegion(myPos?.regionId || null)
      }
    })

    // Cards
    socket.on(S2C.CARD_HAND_UPDATED, (data: any) => {
      const auth = useAuthStore.getState()
      // Only update own hand (or if GM viewing)
      if (!data.playerId || data.playerId === auth.player?.id) {
        useCardStore.getState().setHand(data.hand || [])
        if (data.deckCount !== undefined) useCardStore.getState().setDeckCount(data.deckCount)
        if (data.discardCount !== undefined) useCardStore.getState().setDiscardCount(data.discardCount)
      }
    })

    socket.on(S2C.CARD_MENU_STATUS, (data: any) => {
      const auth = useAuthStore.getState()
      if (!data.playerId || data.playerId === auth.player?.id) {
        useCardStore.getState().setMenuUnlocked(data.unlocked)
      }
    })

    socket.on(S2C.CARD_DECK_CONTENTS, (data: any) => {
      if (isGm && data.playerId) {
        useGmStore.getState().setViewingPlayerCards(data.cards, data.playerId)
      } else {
        useCardStore.getState().setViewingDeck(data.cards || [])
      }
    })

    socket.on(S2C.CARD_OPERATION_RESULT, (data: any) => {
      if (isGm) {
        useGmStore.getState().setCardFeedback(data)
        setTimeout(() => useGmStore.getState().setCardFeedback(null), 3000)
      }
    })

    // Deck build
    socket.on(S2C.DECK_BUILD_STATE, (data: any) => {
      useDeckBuildStore.getState().loadFromServer(data)
    })

    socket.on(S2C.DECK_BUILD_LOCKED, (data: any) => {
      const auth = useAuthStore.getState()
      if (data.playerId === auth.player?.id) {
        useDeckBuildStore.getState().setLocked(data.locked)
      }
    })

    socket.on(S2C.DECK_BUILD_VALIDATION, (data: any) => {
      useDeckBuildStore.getState().setValidation(data)
    })

    socket.on(S2C.SKILL_LIBRARY_DATA, (data: any) => {
      if (data.skills) useDeckBuildStore.getState().setSkillLibrary(data.skills)
    })

    socket.on(S2C.DECK_SHARE_DATA, (data: any) => {
      if (data.shareCode) useDeckBuildStore.getState().setShareCode(data.shareCode)
    })

    // Combat
    socket.on(S2C.COMBAT_STATE_UPDATE, (data: any) => {
      useCombatStore.getState().setCombatState(data)
    })
    socket.on(S2C.COMBAT_CHAIN_UPDATE, (data: any) => {
      if (data.chain) useCombatStore.getState().setPlayChain(data.combatId, data.chain)
    })
    socket.on(S2C.COMBAT_TURN_START, (data: any) => {
      useCombatStore.getState().addLogEntry({
        type: 'turn_start', playerId: data.playerId, combatId: data.combatId,
        description: `轮到行动 (第${data.roundNumber}轮)`,
      })
    })
    socket.on(S2C.COMBAT_ROUND_END, (data: any) => {
      useCombatStore.getState().addLogEntry({
        type: 'round_end', playerId: '', combatId: data.combatId,
        description: `第 ${data.roundNumber} 轮结束`,
      })
    })
    socket.on(S2C.COMBAT_RESULT, (data: any) => {
      for (const r of (data.results || [])) {
        useCombatStore.getState().addLogEntry({
          type: 'result', playerId: r.targetId || '', combatId: data.combatId, description: r.description,
        })
      }
    })
    socket.on(S2C.COMBAT_ENDED, (data: any) => {
      useCombatStore.getState().endCombat(data.combatId)
      useCombatStore.getState().addLogEntry({
        type: 'combat_end', playerId: '', combatId: data.combatId, description: '战斗结束',
      })
    })
    socket.on(S2C.COMBAT_LOG_ENTRY, (data: any) => {
      useCombatStore.getState().addLogEntry(data)
    })

    // Stats
    socket.on(S2C.STATS_OWN, (data: any) => {
      const auth = useAuthStore.getState()
      if (auth.player) {
        useAuthStore.setState({
          player: { ...auth.player, ...data },
        })
      }
    })

    socket.on(S2C.STATS_UPDATED, (data: any) => {
      const auth = useAuthStore.getState()
      if (data.playerId === auth.player?.id) {
        useAuthStore.setState({
          player: { ...auth.player!, ...data },
        })
      }
      useRoomStore.getState().updatePlayer(data.playerId, data)
    })

    socket.on(S2C.STATS_GM_VIEW_ALL, (data: any) => {
      if (data.players) useRoomStore.getState().setPlayers(data.players)
    })

    // Actions
    socket.on(S2C.ACTION_AP_UPDATE, (data: any) => {
      const auth = useAuthStore.getState()
      if (!data.playerId || data.playerId === auth.player?.id) {
        useGameStore.getState().setActionPoints(
          data.remainingAP,
          useGameStore.getState().actionPointsMax,
        )
      }
    })

    socket.on(S2C.ACTION_STATUS, (data: any) => {
      useGameStore.getState().setActionSubmitted(data.submitted)
      if (data.currentAPIndex) {
        useGameStore.getState().setActionPointIndex(data.currentAPIndex)
      }
    })

    socket.on(S2C.ACTION_SUBMITTED, (data: any) => {
      if (isGm) {
        useGmStore.getState().setPendingActions([
          ...useGmStore.getState().pendingActions,
          data,
        ])
      }
    })

    socket.on(S2C.ACTION_ALL_SUBMITTED, (data: any) => {
      if (isGm) {
        useGmStore.getState().setAllSubmitted(true)
        useGmStore.getState().setPendingActions(data.actions || [])
      }
    })

    socket.on(S2C.ACTION_RESOLVED, (_data: any) => {
      useGmStore.getState().setAllSubmitted(false)
      useGmStore.getState().setPendingActions([])
    })

    // Chat
    socket.on(S2C.CHAT_MESSAGE, (msg: any) => {
      useChatStore.getState().addMessage(msg)
    })

    socket.on(S2C.CHAT_HISTORY, (data: any) => {
      useChatStore.getState().setMessages(data.messages || [])
    })

    // Logs
    socket.on(S2C.LOG_ENTRY, (entry: any) => {
      useGmStore.getState().addLog(entry)
    })

    socket.on(S2C.LOG_HISTORY, (data: any) => {
      useGmStore.getState().setLogs(data.entries || [])
    })

    // Player events
    socket.on(S2C.PLAYER_CONNECTED, (data: any) => {
      useRoomStore.getState().updatePlayer(data.playerId, { status: 'connected' })
    })

    socket.on(S2C.PLAYER_DISCONNECTED, (data: any) => {
      useRoomStore.getState().updatePlayer(data.playerId, { status: 'disconnected' })
    })

    // ── Group ready / auto-advance ──
    socket.on(S2C.GROUP_READY_UPDATE, (data: any) => {
      useGroupStore.getState().setGroupReady(data.groupId, data.ready)
      if (data.readyGroupIds) {
        useGroupStore.getState().setReadyStatus(data.readyGroupIds, data.aliveGroupCount)
      }
    })

    socket.on(S2C.PHASE_AUTO_ADVANCED, (data: any) => {
      useGameStore.getState().setPhase(data.phase)
      useGameStore.getState().setTurnNumber(data.turnNumber)
    })

    socket.on(S2C.GROUP_LIST, (data: any) => {
      if (data.groups) useGroupStore.getState().setGroups(data.groups)
    })

    socket.on(S2C.GROUP_STATE, (data: any) => {
      if (data.group) {
        const auth = useAuthStore.getState()
        const myId = auth.player?.id
        // Only set as myGroup if this player is a member of this group
        if (myId && (data.group.masterPlayerId === myId || data.group.servantPlayerId === myId)) {
          useGroupStore.getState().setMyGroup(data.group)
        }
      }
    })

    socket.on(S2C.GROUP_ELIMINATED, (data: any) => {
      useGroupStore.getState().updateGroupStatus(data.groupId, 'eliminated')
    })

    socket.on(S2C.GROUP_FORM_REQUESTED, (data: any) => {
      const auth = useAuthStore.getState()
      // Only store the request if this player is the target
      if (data.toId === auth.player?.id) {
        useGroupStore.getState().addPendingRequest({
          fromId: data.fromId,
          fromName: data.fromName,
          fromRole: data.fromRole,
        })
      }
    })

    // ── Draft ──
    socket.on(S2C.DRAFT_STATE_UPDATE, (data: any) => {
      if (data.phase) useDraftStore.getState().setPhase(data.phase)
      if (data.round != null) useDraftStore.getState().setRound(data.round, data.totalRounds || 10)
      if (data.groupSelectionCounts) useDraftStore.getState().setGroupSelectionCounts(data.groupSelectionCounts)
    })

    socket.on(S2C.DRAFT_PACK_RECEIVED, (data: any) => {
      if (data.skills) useDraftStore.getState().setCurrentPack(data.skills)
    })

    socket.on(S2C.DRAFT_PICK_MADE, (data: any) => {
      if (data.skill) useDraftStore.getState().addSelectedSkill(data.skill)
    })

    socket.on(S2C.DRAFT_COMPLETE, (data: any) => {
      useDraftStore.getState().setFinalized(true)
    })

    // ── Victory / Key / Spirit ──
    socket.on(S2C.AKASHA_KEY_SPAWNED, (data: any) => {
      useMapStore.getState().setAkashaKey(data.keyState || data)
    })

    socket.on(S2C.AKASHA_KEY_PICKED_UP, (data: any) => {
      useMapStore.getState().setAkashaKey(data.keyState || data)
    })

    socket.on(S2C.AKASHA_KEY_PUT_DOWN, (data: any) => {
      useMapStore.getState().setAkashaKey(data.keyState || data)
    })

    socket.on(S2C.AKASHA_KEY_CHANNEL_PROGRESS, (data: any) => {
      useMapStore.getState().setAkashaKey(data)
    })

    socket.on(S2C.VICTORY, (data: any) => {
      useGameStore.getState().setVictory(data)
    })

    socket.on(S2C.SPIRIT_SPAWNED, (data: any) => {
      useMapStore.getState().addSpirit(data.spirit)
    })

    socket.on(S2C.SPIRIT_ABSORBED, (data: any) => {
      useMapStore.getState().removeSpirit(data.spiritId)
    })

    socket.on(S2C.WAR_DECLARED, (data: any) => {
      useGameStore.getState().setWarDeclaration(data)
    })

    socket.on(S2C.KILL_REWARD_PROMPT, (data: any) => {
      useGameStore.getState().setKillRewardPrompt(data)
    })

    socket.on(S2C.ABILITY_REPLACE_PROMPT, (data: any) => {
      useGameStore.getState().setAbilityReplacePrompt(data)
    })

    socket.on(S2C.GAME_STAGE_CHANGED, (data: any) => {
      useGameStore.getState().setGameStage(data.stage)
    })

    // ── 真名系统 ──
    socket.on(S2C.TRUE_NAME_CANDIDATES, (data: any) => {
      if (data.candidates) useTrueNameStore.getState().setCandidates(data.candidates)
    })

    socket.on(S2C.TRUE_NAME_RESULT, (data: any) => {
      useTrueNameStore.getState().setLastResult(data)
      // 3秒后清除结果提示
      setTimeout(() => useTrueNameStore.getState().setLastResult(null), 4000)
    })

    socket.on(S2C.TRUE_NAME_REVEALED_LIST, (data: any) => {
      if (data.revealed) useTrueNameStore.getState().setRevealed(data.revealed)
    })

    // ── 地图池 ──
    socket.on(S2C.POOL_SNAPSHOT, (data: any) => {
      if (data.skills) useSkillPoolStore.getState().setSnapshot(data.skills)
    })

    socket.on(S2C.POOL_DRAW_RESULT, (data: any) => {
      if (data.drawnSkills) {
        useSkillPoolStore.getState().setDrawResult(data.drawnSkills, data.replacementsRemaining ?? 0)
      }
    })

    socket.on(S2C.POOL_REPLACE_RESULT, (data: any) => {
      useSkillPoolStore.getState().setReplaceResult(data)
      if (data.replacementsRemaining != null) {
        useSkillPoolStore.getState().updateRemaining(data.replacementsRemaining)
      }
      setTimeout(() => useSkillPoolStore.getState().setReplaceResult(null), 3000)
    })

    // Error
    socket.on(S2C.ERROR, (data: any) => {
      console.error('[Socket Error]', data.message)
    })

    return () => {
      disconnectSocket()
      socketRef.current = null
    }
  }, [isInGame, isGm])

  return socketRef
}
