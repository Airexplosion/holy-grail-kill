import type { ActionType } from '../types/action.js'

export const ACTION_TYPES: readonly ActionType[] = [
  'move_adjacent',
  'move_designated',
  'move_to_outpost',
  'scout',
  'place_outpost',
  'destroy_outpost',
  'declare_war',
  'use_ability',
  'absorb_spirit',
  'obtain_key',
  'channel_magic',
  'skip',
]

// Re-export from types (canonical source)
export { ACTION_AP_COST, ACTION_LABELS, ACTION_RESOLUTION_ORDER } from '../types/action.js'
