import { create } from 'zustand'
import type { RoomConfig } from 'shared'

interface RoomPlayer {
  readonly id: string
  readonly displayName: string
  readonly color: string
  readonly status: string
  readonly isGm: boolean
  readonly hp?: number
  readonly hpMax?: number
  readonly mp?: number
  readonly mpMax?: number
  readonly actionPoints?: number
  readonly actionPointsMax?: number
  readonly regionId?: string | null
  readonly boundToPlayerId?: string | null
  readonly cardMenuUnlocked?: boolean
  readonly handCount?: number
  readonly deckCount?: number
  readonly discardCount?: number
}

interface RoomState {
  readonly config: RoomConfig | null
  readonly players: readonly RoomPlayer[]
  setConfig: (config: RoomConfig) => void
  setPlayers: (players: readonly RoomPlayer[]) => void
  updatePlayer: (playerId: string, updates: Partial<RoomPlayer>) => void
  reset: () => void
}

export const useRoomStore = create<RoomState>((set) => ({
  config: null,
  players: [],

  setConfig: (config) => set({ config }),
  setPlayers: (players) => set({ players }),
  updatePlayer: (playerId, updates) => set((state) => ({
    players: state.players.map(p =>
      p.id === playerId ? { ...p, ...updates } : p,
    ),
  })),
  reset: () => set({ config: null, players: [] }),
}))
