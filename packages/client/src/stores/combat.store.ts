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
  readonly combatId?: string
  readonly data?: Record<string, unknown>
  readonly timestamp?: number
}

interface CombatState {
  /** Current player's active combat ID (null if not in combat) */
  readonly combatId: string | null
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
    combatId: string
    roundNumber: number
    turnIndex: number
    turnOrder: readonly string[]
    phase: CombatTurnPhase
    activePlayerId: string | null
    playChain: readonly PlayChainEntry[]
    isActive: boolean
    participants: readonly CombatParticipant[]
  }) => void
  setPlayChain: (combatId: string, chain: readonly PlayChainEntry[]) => void
  addLogEntry: (entry: CombatLogEntry) => void
  endCombat: (combatId: string) => void
  reset: () => void
}

export const useCombatStore = create<CombatState>((set, get) => ({
  combatId: null,
  isInCombat: false,
  roundNumber: 1,
  turnIndex: 0,
  turnOrder: [],
  phase: 'play',
  activePlayerId: null,
  playChain: [],
  participants: [],
  combatLog: [],

  setCombatState: (snapshot) => {
    const current = get()
    // Only update if this combat is relevant to this player
    // (first combat state received sets the combatId, or matches existing)
    if (current.combatId && current.combatId !== snapshot.combatId) return
    set({
      combatId: snapshot.combatId,
      isInCombat: snapshot.isActive,
      roundNumber: snapshot.roundNumber,
      turnIndex: snapshot.turnIndex,
      turnOrder: snapshot.turnOrder,
      phase: snapshot.phase,
      activePlayerId: snapshot.activePlayerId,
      playChain: snapshot.playChain,
      participants: snapshot.participants,
    })
  },
  setPlayChain: (combatId, playChain) => {
    if (get().combatId !== combatId) return
    set({ playChain })
  },
  addLogEntry: (entry) => set((s) => ({
    combatLog: [...s.combatLog, { ...entry, timestamp: Date.now() }].slice(-100),
  })),
  endCombat: (combatId) => {
    if (get().combatId !== combatId) return
    set({ isInCombat: false, combatId: null })
  },
  reset: () => set({
    combatId: null,
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
