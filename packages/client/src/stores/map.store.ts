import { create } from 'zustand'
import type { Region, Adjacency, PlayerPosition, OutpostMarker, AkashaKeyState, SpiritRemnant } from 'shared'

interface MapState {
  readonly regions: readonly Region[]
  readonly adjacencies: readonly Adjacency[]
  readonly playerPositions: readonly PlayerPosition[]
  readonly outposts: readonly OutpostMarker[]
  readonly currentRegionId: string | null
  /** 阿克夏之钥状态 */
  readonly akashaKey: AkashaKeyState | null
  /** 地图上的残灵 */
  readonly spirits: readonly SpiritRemnant[]

  setMapState: (state: {
    regions: readonly Region[]
    adjacencies: readonly Adjacency[]
    playerPositions: readonly PlayerPosition[]
    outposts: readonly OutpostMarker[]
  }) => void
  setCurrentRegion: (regionId: string | null) => void
  setAkashaKey: (state: AkashaKeyState | null) => void
  addSpirit: (spirit: SpiritRemnant) => void
  removeSpirit: (spiritId: string) => void
  reset: () => void
}

export const useMapStore = create<MapState>((set) => ({
  regions: [],
  adjacencies: [],
  playerPositions: [],
  outposts: [],
  currentRegionId: null,
  akashaKey: null,
  spirits: [],

  setMapState: (state) => set(state),
  setCurrentRegion: (currentRegionId) => set({ currentRegionId }),
  setAkashaKey: (akashaKey) => set({ akashaKey }),
  addSpirit: (spirit) => set((s) => ({ spirits: [...s.spirits, spirit] })),
  removeSpirit: (spiritId) => set((s) => ({
    spirits: s.spirits.filter(sp => sp.id !== spiritId),
  })),
  reset: () => set({
    regions: [],
    adjacencies: [],
    playerPositions: [],
    outposts: [],
    currentRegionId: null,
    akashaKey: null,
    spirits: [],
  }),
}))
