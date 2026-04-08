import { useEffect, useRef } from 'react'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { useAuthStore } from '@/stores/auth.store'
import { useGameStore } from '@/stores/game.store'
import { useMapStore } from '@/stores/map.store'
import { useCardStore } from '@/stores/card.store'
import { useChatStore } from '@/stores/chat.store'
import { useRoomStore } from '@/stores/room.store'
import { useGmStore } from '@/stores/gm.store'
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
