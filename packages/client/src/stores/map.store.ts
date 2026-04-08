import { create } from 'zustand'
import type { Region, Adjacency, PlayerPosition, OutpostMarker } from 'shared'

interface MapState {
  readonly regions: readonly Region[]
  readonly adjacencies: readonly Adjacency[]
  readonly playerPositions: readonly PlayerPosition[]
  readonly outposts: readonly OutpostMarker[]
  readonly currentRegionId: string | null
  setMapState: (state: {
    regions: readonly Region[]
    adjacencies: readonly Adjacency[]
    playerPositions: readonly PlayerPosition[]
    outposts: readonly OutpostMarker[]
  }) => void
  setCurrentRegion: (regionId: string | null) => void
  reset: () => void
}

export const useMapStore = create<MapState>((set) => ({
  regions: [],
  adjacencies: [],
  playerPositions: [],
  outposts: [],
  currentRegionId: null,

  setMapState: (state) => set(state),
  setCurrentRegion: (currentRegionId) => set({ currentRegionId }),
  reset: () => set({
    regions: [],
    adjacencies: [],
    playerPositions: [],
    outposts: [],
    currentRegionId: null,
  }),
}))
