import type { ActionType } from '../types/action.js'

export const ACTION_TYPES: readonly ActionType[] = [
  'move_adjacent',
  'move_designated',
  'scout',
  'place_outpost',
  'consume',
]

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

export const ACTION_RESOLUTION_ORDER: readonly ActionType[] = [
  'move_adjacent',
  'move_designated',
  'scout',
  'place_outpost',
  'consume',
]
