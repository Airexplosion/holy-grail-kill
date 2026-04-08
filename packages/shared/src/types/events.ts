// Socket.IO event name constants
// Client -> Server
export const C2S = {
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',

  GAME_START: 'game:start',
  GAME_PHASE_ADVANCE: 'game:phase:advance',
  GAME_PHASE_SET: 'game:phase:set',
  GAME_TURN_NEXT: 'game:turn:next',

  ACTION_SUBMIT: 'action:submit',
  ACTION_APPROVE: 'action:approve',
  ACTION_REJECT: 'action:reject',
  ACTION_NEXT_AP: 'action:next-ap',

  MAP_REGION_ADD: 'map:region:add',
  MAP_REGION_UPDATE: 'map:region:update',
  MAP_REGION_REMOVE: 'map:region:remove',
  MAP_ADJACENCY_SET: 'map:adjacency:set',
  MAP_ADJACENCY_REMOVE: 'map:adjacency:remove',
  MAP_PLAYER_MOVE: 'map:player:move',

  CARD_DRAW: 'card:draw',
  CARD_DISCARD: 'card:discard',
  CARD_DRAW_SPECIFIC: 'card:draw-specific',
  CARD_RETRIEVE_DISCARD: 'card:retrieve-discard',
  CARD_SHUFFLE_DECK: 'card:shuffle-deck',
  CARD_VIEW_DECK: 'card:view-deck',
  CARD_MENU_UNLOCK: 'card:menu:unlock',
  CARD_MENU_LOCK: 'card:menu:lock',
  CARD_GM_VIEW: 'card:gm:view',
  CARD_GM_MODIFY: 'card:gm:modify',
  CARD_GM_INSERT: 'card:gm:insert',
  CARD_GM_TRANSFER: 'card:gm:transfer',
  CARD_GM_REMOVE: 'card:gm:remove',

  SKILL_USE: 'skill:use',
  SKILL_GM_ASSIGN: 'skill:gm:assign',
  SKILL_GM_REMOVE: 'skill:gm:remove',
  SKILL_GM_MODIFY: 'skill:gm:modify',
  SKILL_GM_TEMPLATE_CREATE: 'skill:gm:template:create',
  SKILL_GM_TEMPLATE_UPDATE: 'skill:gm:template:update',
  SKILL_GM_TEMPLATE_DELETE: 'skill:gm:template:delete',

  STATS_GM_UPDATE: 'stats:gm:update',

  PLAYER_BIND: 'player:bind',
  PLAYER_UNBIND: 'player:unbind',

  CHAT_SEND: 'chat:send',

  LOG_SUBSCRIBE: 'log:subscribe',
  LOG_QUERY: 'log:query',

  ROOM_CONFIG_UPDATE: 'room:config:update',

  // 备战 - 组卡
  DECK_BUILD_SUBMIT: 'deck-build:submit',
  DECK_BUILD_LOCK: 'deck-build:lock',
  DECK_BUILD_UNLOCK: 'deck-build:unlock',
  DECK_BUILD_GET: 'deck-build:get',

  // 战斗
  COMBAT_PLAY_STRIKE: 'combat:play-strike',
  COMBAT_USE_SKILL: 'combat:use-skill',
  COMBAT_RESPOND: 'combat:respond',
  COMBAT_PASS: 'combat:pass',
  COMBAT_GM_START: 'combat:gm:start',
  COMBAT_GM_END: 'combat:gm:end',
  COMBAT_GM_NEXT_TURN: 'combat:gm:next-turn',

  // 技能库 & 分享
  SKILL_LIBRARY_GET: 'skill-library:get',
  DECK_SHARE_CREATE: 'deck-share:create',
  DECK_SHARE_GET: 'deck-share:get',
} as const

// Server -> Client
export const S2C = {
  RECONNECT_RESTORE: 'reconnect:restore',
  PLAYER_CONNECTED: 'player:connected',
  PLAYER_DISCONNECTED: 'player:disconnected',

  ROOM_STATE: 'room:state',
  ROOM_CONFIG_UPDATED: 'room:config:updated',

  GAME_PHASE_CHANGED: 'game:phase:changed',

  ACTION_SUBMITTED: 'action:submitted',
  ACTION_ALL_SUBMITTED: 'action:all-submitted',
  ACTION_RESOLVED: 'action:resolved',
  ACTION_AP_UPDATE: 'action:ap:update',
  ACTION_STATUS: 'action:status',

  MAP_STATE: 'map:state',
  MAP_UPDATED: 'map:updated',

  CARD_DRAWN: 'card:drawn',
  CARD_HAND_UPDATED: 'card:hand:updated',
  CARD_DECK_CONTENTS: 'card:deck-contents',
  CARD_MENU_STATUS: 'card:menu:status',
  CARD_OPERATION_RESULT: 'card:operation:result',

  SKILL_LIST: 'skill:list',
  SKILL_RESULT: 'skill:result',
  SKILL_COOLDOWN_UPDATE: 'skill:cooldown:update',

  STATS_OWN: 'stats:own',
  STATS_GM_VIEW_ALL: 'stats:gm:view-all',
  STATS_UPDATED: 'stats:updated',

  OUTPOST_PLACED: 'outpost:placed',
  OUTPOST_REMOVED: 'outpost:removed',
  OUTPOST_GM_VIEW_ALL: 'outpost:gm:view-all',

  PLAYER_BOUND: 'player:bound',

  CHAT_MESSAGE: 'chat:message',
  CHAT_HISTORY: 'chat:history',

  LOG_ENTRY: 'log:entry',
  LOG_HISTORY: 'log:history',

  // 备战 - 组卡
  DECK_BUILD_STATE: 'deck-build:state',
  DECK_BUILD_LOCKED: 'deck-build:locked',
  DECK_BUILD_VALIDATION: 'deck-build:validation',

  // 战斗
  COMBAT_STATE_UPDATE: 'combat:state:update',
  COMBAT_CHAIN_UPDATE: 'combat:chain:update',
  COMBAT_TURN_START: 'combat:turn:start',
  COMBAT_ROUND_END: 'combat:round:end',
  COMBAT_RESULT: 'combat:result',
  COMBAT_ENDED: 'combat:ended',
  COMBAT_LOG_ENTRY: 'combat:log:entry',

  // 技能库 & 分享
  SKILL_LIBRARY_DATA: 'skill-library:data',
  DECK_SHARE_DATA: 'deck-share:data',

  ERROR: 'error',
} as const
