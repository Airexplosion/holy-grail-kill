import { create } from 'zustand'
import type { CombatTurnPhase, PlayChainEntry } from 'shared'

interface CombatParticipant {
  readonly id: string
  readonly hp: number
  readonly hpMax: number
  readonly mp: number
  readonly mpMax: number
  readonly shield: number
}

interface CombatLogEntry {
  readonly type: string
  readonly playerId: string
  readonly description: string
  readonly data?: Record<string, unknown>
  readonly timestamp?: number
}

interface CombatState {
  readonly isInCombat: boolean
  readonly roundNumber: number
  readonly turnIndex: number
  readonly turnOrder: readonly string[]
  readonly phase: CombatTurnPhase
  readonly activePlayerId: string | null
  readonly playChain: readonly PlayChainEntry[]
  readonly participants: readonly CombatParticipant[]
  readonly combatLog: readonly CombatLogEntry[]

  setCombatState: (snapshot: {
    roundNumber: number
    turnIndex: number
    turnOrder: readonly string[]
    phase: CombatTurnPhase
    activePlayerId: string | null
    playChain: readonly PlayChainEntry[]
    isActive: boolean
    participants: readonly CombatParticipant[]
  }) => void
  setPlayChain: (chain: readonly PlayChainEntry[]) => void
  addLogEntry: (entry: CombatLogEntry) => void
  endCombat: () => void
  reset: () => void
}

export const useCombatStore = create<CombatState>((set) => ({
  isInCombat: false,
  roundNumber: 1,
  turnIndex: 0,
  turnOrder: [],
  phase: 'play',
  activePlayerId: null,
  playChain: [],
  participants: [],
  combatLog: [],

  setCombatState: (snapshot) => set({
    isInCombat: snapshot.isActive,
    roundNumber: snapshot.roundNumber,
    turnIndex: snapshot.turnIndex,
    turnOrder: snapshot.turnOrder,
    phase: snapshot.phase,
    activePlayerId: snapshot.activePlayerId,
    playChain: snapshot.playChain,
    participants: snapshot.participants,
  }),
  setPlayChain: (playChain) => set({ playChain }),
  addLogEntry: (entry) => set((s) => ({
    combatLog: [...s.combatLog, { ...entry, timestamp: Date.now() }].slice(-100),
  })),
  endCombat: () => set({ isInCombat: false }),
  reset: () => set({
    isInCombat: false,
    roundNumber: 1,
    turnIndex: 0,
    turnOrder: [],
    phase: 'play',
    activePlayerId: null,
    playChain: [],
    participants: [],
    combatLog: [],
  }),
}))
