export interface ActionSubmission {
  readonly id: string
  readonly roomId: string
  readonly playerId: string
  readonly turnNumber: number
  readonly actionPointIndex: number
  readonly actionType: ActionType
  readonly payload: ActionPayload
  readonly status: ActionStatus
  readonly submittedAt: number
  readonly resolvedAt: number | null
}

export type ActionType =
  | 'move_adjacent'
  | 'move_designated'
  | 'scout'
  | 'place_outpost'
  | 'consume'

export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed'

export type ActionPayload =
  | MovePayload
  | ScoutPayload
  | PlaceOutpostPayload
  | ConsumePayload

export interface MovePayload {
  readonly targetRegionId: string
}

export interface ScoutPayload {
  readonly targetRegionId: string
}

export interface PlaceOutpostPayload {
  readonly regionId: string
}

export interface ConsumePayload {}

export interface ActionResult {
  readonly playerId: string
  readonly actionType: ActionType
  readonly success: boolean
  readonly details: string
  readonly data?: Record<string, unknown>
}

export const ACTION_AP_COST: Record<ActionType, number> = {
  move_adjacent: 1,
  move_designated: 1,
  scout: 1,
  place_outpost: 1,
  consume: 1,
}

export const ACTION_LABELS: Record<ActionType, string> = {
  move_adjacent: '相邻移动',
  move_designated: '指定移动',
  scout: '侦查',
  place_outpost: '放置据点',
  consume: '消耗',
}
