export interface Region {
  readonly id: string
  readonly roomId: string
  readonly name: string
  readonly positionX: number
  readonly positionY: number
  readonly metadata: Record<string, unknown>
}

export interface Adjacency {
  readonly id: string
  readonly roomId: string
  readonly fromRegionId: string
  readonly toRegionId: string
  readonly type: AdjacencyType
}

export type AdjacencyType = 'bidirectional' | 'unidirectional' | 'blocked'

export interface MapState {
  readonly regions: readonly Region[]
  readonly adjacencies: readonly Adjacency[]
  readonly playerPositions: readonly PlayerPosition[]
  readonly outposts: readonly OutpostMarker[]
}

export interface PlayerPosition {
  readonly playerId: string
  readonly displayName: string
  readonly regionId: string
  readonly color: string
}

export interface OutpostMarker {
  readonly id: string
  readonly playerId: string
  readonly displayName: string
  readonly regionId: string
  readonly color: string
  readonly placedAt: number
}
