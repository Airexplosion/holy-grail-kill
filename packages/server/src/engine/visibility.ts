import type { Player } from 'shared'
import type { Region, Adjacency, OutpostMarker, PlayerPosition, MapState } from 'shared'

export function filterMapForPlayer(
  fullMap: MapState,
  player: { id: string; regionId: string | null; isGm: boolean },
  knownOutpostSnapshots?: readonly OutpostMarker[],
): MapState {
  // GM sees everything, but is never shown on map
  if (player.isGm) {
    return {
      ...fullMap,
      playerPositions: fullMap.playerPositions.filter(p => p.playerId !== player.id),
    }
  }

  // Players see all regions and adjacencies, but only players at their location
  const visiblePlayers = player.regionId
    ? fullMap.playerPositions.filter(p => p.regionId === player.regionId)
    : []

  // Own outposts: real-time from fullMap (always accurate)
  const ownOutposts = fullMap.outposts.filter(o => o.playerId === player.id)

  // Others' outposts: snapshots from discovery (may be stale / already destroyed)
  const snapshots = knownOutpostSnapshots || []

  // Merge: own real + discovered snapshots, deduplicate by id
  const seenIds = new Set(ownOutposts.map(o => o.id))
  const mergedOutposts = [...ownOutposts]
  for (const snap of snapshots) {
    if (!seenIds.has(snap.id)) {
      seenIds.add(snap.id)
      mergedOutposts.push(snap)
    }
  }

  return {
    regions: fullMap.regions,
    adjacencies: fullMap.adjacencies,
    playerPositions: visiblePlayers,
    outposts: mergedOutposts,
  }
}

export function filterPlayerStatsForOthers(player: {
  id: string
  displayName: string
  color: string
  status: string
}) {
  return {
    id: player.id,
    displayName: player.displayName,
    color: player.color,
    status: player.status,
  }
}

export function buildPlayerSelfView(player: Player) {
  return {
    id: player.id,
    displayName: player.displayName,
    hp: player.hp,
    hpMax: player.hpMax,
    mp: player.mp,
    mpMax: player.mpMax,
    actionPoints: player.actionPoints,
    actionPointsMax: player.actionPointsMax,
    regionId: player.regionId,
    boundToPlayerId: player.boundToPlayerId,
    cardMenuUnlocked: player.cardMenuUnlocked,
    color: player.color,
  }
}

export function canPlayerSeeRegionPlayers(
  viewerRegionId: string | null,
  targetRegionId: string,
): boolean {
  return viewerRegionId === targetRegionId
}

export function getAdjacentRegions(
  regionId: string,
  adjacencies: readonly Adjacency[],
): string[] {
  const adjacent: string[] = []
  for (const adj of adjacencies) {
    if (adj.type === 'blocked') continue
    if (adj.type === 'bidirectional') {
      if (adj.fromRegionId === regionId) adjacent.push(adj.toRegionId)
      if (adj.toRegionId === regionId) adjacent.push(adj.fromRegionId)
    } else if (adj.type === 'unidirectional') {
      if (adj.fromRegionId === regionId) adjacent.push(adj.toRegionId)
    }
  }
  return adjacent
}

export function canTraverse(
  fromRegionId: string,
  toRegionId: string,
  adjacencies: readonly Adjacency[],
): boolean {
  for (const adj of adjacencies) {
    if (adj.type === 'blocked') continue
    if (adj.type === 'bidirectional') {
      if (
        (adj.fromRegionId === fromRegionId && adj.toRegionId === toRegionId) ||
        (adj.fromRegionId === toRegionId && adj.toRegionId === fromRegionId)
      ) return true
    } else if (adj.type === 'unidirectional') {
      if (adj.fromRegionId === fromRegionId && adj.toRegionId === toRegionId) return true
    }
  }
  return false
}
