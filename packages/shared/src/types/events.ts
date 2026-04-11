// Socket.IO event name constants

// Client -> Server
export const C2S = {
  // ── 房间 ──
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_CONFIG_UPDATE: 'room:config:update',

  // ── 游戏流程（自驱动） ──
  GAME_START: 'game:start',
  /** 房主/GM 设置游戏大阶段 */
  GAME_SET_STAGE: 'game:stage:set',
  /** 标记本组已就绪（替代GM推进阶段） */
  GROUP_READY: 'group:ready',
  GROUP_UNREADY: 'group:unready',
  /** 组队：请求与某玩家组队 */
  GROUP_FORM_REQUEST: 'group:form:request',
  /** 组队：接受组队请求 */
  GROUP_FORM_ACCEPT: 'group:form:accept',
  /** 组队：选择角色类型 */
  GROUP_FORM_SET_ROLE: 'group:form:set-role',
  /** @deprecated 保留兼容 */
  GAME_PHASE_ADVANCE: 'game:phase:advance',
  GAME_PHASE_SET: 'game:phase:set',
  GAME_TURN_NEXT: 'game:turn:next',

  // ── 角色创建 ──
  CHARACTER_ALLOCATE_ATTRIBUTES: 'character:allocate-attributes',
  CHARACTER_SELECT_CLASS: 'character:select-class',
  CHARACTER_SELECT_ARCHETYPE: 'character:select-archetype',
  CHARACTER_SELECT_TACTICAL_STYLE: 'character:select-tactical-style',
  CHARACTER_CONFIRM: 'character:confirm',

  // ── 技能轮抓 ──
  DRAFT_SUBMIT_SKILLS: 'draft:submit-skills',
  DRAFT_SELECT_CHARACTER: 'draft:select-character',
  DRAFT_START: 'draft:start',
  DRAFT_PICK: 'draft:pick',
  DRAFT_FINALIZE: 'draft:finalize',

  // ── 行动阶段 ──
  ACTION_SUBMIT: 'action:submit',
  /** @deprecated GM审批已移除 */
  ACTION_APPROVE: 'action:approve',
  ACTION_REJECT: 'action:reject',
  ACTION_NEXT_AP: 'action:next-ap',

  // ── 宣战/遭遇 ──
  DECLARE_WAR: 'war:declare',
  WAR_RESPOND: 'war:respond',

  // ── 地图 ──
  MAP_REGION_ADD: 'map:region:add',
  MAP_REGION_UPDATE: 'map:region:update',
  MAP_REGION_REMOVE: 'map:region:remove',
  MAP_ADJACENCY_SET: 'map:adjacency:set',
  MAP_ADJACENCY_REMOVE: 'map:adjacency:remove',
  MAP_PLAYER_MOVE: 'map:player:move',

  // ── 卡牌 ──
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

  // ── 技能 ──
  SKILL_USE: 'skill:use',
  SKILL_GM_ASSIGN: 'skill:gm:assign',
  SKILL_GM_REMOVE: 'skill:gm:remove',
  SKILL_GM_MODIFY: 'skill:gm:modify',
  SKILL_GM_TEMPLATE_CREATE: 'skill:gm:template:create',
  SKILL_GM_TEMPLATE_UPDATE: 'skill:gm:template:update',
  SKILL_GM_TEMPLATE_DELETE: 'skill:gm:template:delete',

  // ── 篡者属性 ──
  STATS_GM_UPDATE: 'stats:gm:update',

  // ── 组绑定 ──
  PLAYER_BIND: 'player:bind',
  PLAYER_UNBIND: 'player:unbind',

  // ── 聊天 ──
  CHAT_SEND: 'chat:send',

  // ── 日志 ──
  LOG_SUBSCRIBE: 'log:subscribe',
  LOG_QUERY: 'log:query',

  // ── 备战 - 组卡 ──
  DECK_BUILD_SUBMIT: 'deck-build:submit',
  DECK_BUILD_LOCK: 'deck-build:lock',
  DECK_BUILD_UNLOCK: 'deck-build:unlock',
  DECK_BUILD_GET: 'deck-build:get',

  // ── 战斗 ──
  COMBAT_PLAY_STRIKE: 'combat:play-strike',
  COMBAT_USE_SKILL: 'combat:use-skill',
  COMBAT_RESPOND: 'combat:respond',
  COMBAT_PASS: 'combat:pass',
  /** @deprecated 战斗由宣战自动触发 */
  COMBAT_GM_START: 'combat:gm:start',
  COMBAT_GM_END: 'combat:gm:end',
  COMBAT_GM_NEXT_TURN: 'combat:gm:next-turn',
  /** 战术撤离请求 */
  COMBAT_TACTICAL_RETREAT: 'combat:tactical-retreat',

  // ── 秘钥 ──
  SECRET_KEY_USE: 'secret-key:use',

  // ── 残灵吸收 ──
  SPIRIT_ABSORB: 'spirit:absorb',
  SPIRIT_CHOOSE_ATTRIBUTES: 'spirit:choose-attributes',

  // ── 阿克夏之钥 ──
  AKASHA_KEY_PICK_UP: 'akasha-key:pick-up',
  AKASHA_KEY_PUT_DOWN: 'akasha-key:put-down',
  AKASHA_KEY_CHANNEL: 'akasha-key:channel',

  // ── 击杀奖励 ──
  KILL_REWARD_CHOOSE: 'kill-reward:choose',

  // ── 能力替换 ──
  ABILITY_REPLACE: 'ability:replace',
  ABILITY_REPLACE_SKIP: 'ability:replace:skip',

  // ── 技能库 & 分享 ──
  SKILL_LIBRARY_GET: 'skill-library:get',
  DECK_SHARE_CREATE: 'deck-share:create',
  DECK_SHARE_GET: 'deck-share:get',

  // ── 真名系统 ──
  TRUE_NAME_GET_CANDIDATES: 'true-name:get-candidates',
  TRUE_NAME_GUESS: 'true-name:guess',

  // ── 地图池 ──
  POOL_GET_SNAPSHOT: 'pool:get-snapshot',
  POOL_DRAW: 'pool:draw',
  POOL_REPLACE_SKILL: 'pool:replace-skill',
  POOL_SKIP: 'pool:skip',

  // ── 单机模式 ──
  SOLO_CREATE: 'solo:create',
  SOLO_DRAFT_PICK: 'solo:draft:pick',
  SOLO_DECK_BUILD_SUBMIT: 'solo:deck-build:submit',
  SOLO_COMBAT_ACTION: 'solo:combat:action',
  SOLO_ACTION_SUBMIT: 'solo:action:submit',
  SOLO_QUIT: 'solo:quit',
} as const

// Server -> Client
export const S2C = {
  // ── 连接 ──
  RECONNECT_RESTORE: 'reconnect:restore',
  PLAYER_CONNECTED: 'player:connected',
  PLAYER_DISCONNECTED: 'player:disconnected',

  // ── 房间 ──
  ROOM_STATE: 'room:state',
  ROOM_CONFIG_UPDATED: 'room:config:updated',

  // ── 游戏流程 ──
  GAME_PHASE_CHANGED: 'game:phase:changed',
  GAME_STAGE_CHANGED: 'game:stage:changed',
  /** 阶段自动推进通知 */
  PHASE_AUTO_ADVANCED: 'phase:auto-advanced',
  /** 组就绪状态更新 */
  GROUP_READY_UPDATE: 'group:ready:update',

  // ── 组状态 ──
  GROUP_LIST: 'group:list',
  GROUP_STATE: 'group:state',
  GROUP_ELIMINATED: 'group:eliminated',

  // ── 角色创建 ──
  CHARACTER_STATE: 'character:state',
  CHARACTER_CONFIRMED: 'character:confirmed',

  // ── 技能轮抓 ──
  DRAFT_STATE_UPDATE: 'draft:state:update',
  DRAFT_PACK_RECEIVED: 'draft:pack:received',
  DRAFT_PICK_MADE: 'draft:pick:made',
  DRAFT_COMPLETE: 'draft:complete',
  DRAFT_POOL_INFO: 'draft:pool:info',
  DRAFT_CHARACTER_SELECTED: 'draft:character:selected',
  DRAFT_MAP_POOL: 'draft:map-pool',

  // ── 行动 ──
  ACTION_SUBMITTED: 'action:submitted',
  ACTION_ALL_SUBMITTED: 'action:all-submitted',
  ACTION_RESOLVED: 'action:resolved',
  ACTION_AP_UPDATE: 'action:ap:update',
  ACTION_STATUS: 'action:status',
  /** 行动验证失败 */
  ACTION_INVALID: 'action:invalid',

  // ── 宣战/遭遇 ──
  WAR_DECLARED: 'war:declared',
  WAR_RESPONSE: 'war:response',
  ENCOUNTER_DETECTED: 'encounter:detected',
  FORCED_WAR: 'war:forced',

  // ── 地图 ──
  MAP_STATE: 'map:state',
  MAP_UPDATED: 'map:updated',

  // ── 卡牌 ──
  CARD_DRAWN: 'card:drawn',
  CARD_HAND_UPDATED: 'card:hand:updated',
  CARD_DECK_CONTENTS: 'card:deck-contents',
  CARD_MENU_STATUS: 'card:menu:status',
  CARD_OPERATION_RESULT: 'card:operation:result',

  // ── 技能 ──
  SKILL_LIST: 'skill:list',
  SKILL_RESULT: 'skill:result',
  SKILL_COOLDOWN_UPDATE: 'skill:cooldown:update',

  // ── 属性 ──
  STATS_OWN: 'stats:own',
  STATS_GM_VIEW_ALL: 'stats:gm:view-all',
  STATS_UPDATED: 'stats:updated',

  // ── 据点 ──
  OUTPOST_PLACED: 'outpost:placed',
  OUTPOST_REMOVED: 'outpost:removed',
  OUTPOST_GM_VIEW_ALL: 'outpost:gm:view-all',

  // ── 绑定 ──
  PLAYER_BOUND: 'player:bound',

  // ── 聊天 ──
  CHAT_MESSAGE: 'chat:message',
  CHAT_HISTORY: 'chat:history',

  // ── 日志 ──
  LOG_ENTRY: 'log:entry',
  LOG_HISTORY: 'log:history',

  // ── 备战 - 组卡 ──
  DECK_BUILD_STATE: 'deck-build:state',
  DECK_BUILD_LOCKED: 'deck-build:locked',
  DECK_BUILD_VALIDATION: 'deck-build:validation',

  // ── 战斗 ──
  COMBAT_STATE_UPDATE: 'combat:state:update',
  COMBAT_CHAIN_UPDATE: 'combat:chain:update',
  COMBAT_TURN_START: 'combat:turn:start',
  COMBAT_ROUND_END: 'combat:round:end',
  COMBAT_RESULT: 'combat:result',
  COMBAT_ENDED: 'combat:ended',
  COMBAT_LOG_ENTRY: 'combat:log:entry',

  // ── 秘钥 ──
  SECRET_KEY_USED: 'secret-key:used',
  SECRET_KEY_UPDATE: 'secret-key:update',

  // ── 残灵 ──
  SPIRIT_SPAWNED: 'spirit:spawned',
  SPIRIT_ABSORBED: 'spirit:absorbed',
  SPIRIT_CHOOSE_PROMPT: 'spirit:choose-prompt',

  // ── 阿克夏之钥 ──
  AKASHA_KEY_SPAWNED: 'akasha-key:spawned',
  AKASHA_KEY_PICKED_UP: 'akasha-key:picked-up',
  AKASHA_KEY_PUT_DOWN: 'akasha-key:put-down',
  AKASHA_KEY_CHANNEL_PROGRESS: 'akasha-key:channel-progress',

  // ── 胜利 ──
  VICTORY: 'victory',

  // ── 击杀奖励 ──
  KILL_REWARD_PROMPT: 'kill-reward:prompt',
  KILL_REWARD_APPLIED: 'kill-reward:applied',

  // ── 能力替换 ──
  ABILITY_REPLACE_PROMPT: 'ability:replace:prompt',
  ABILITY_REPLACED: 'ability:replaced',

  // ── 技能库 & 分享 ──
  SKILL_LIBRARY_DATA: 'skill-library:data',
  DECK_SHARE_DATA: 'deck-share:data',

  // ── 真名系统 ──
  TRUE_NAME_CANDIDATES: 'true-name:candidates',
  TRUE_NAME_RESULT: 'true-name:result',
  TRUE_NAME_REVEALED_LIST: 'true-name:revealed-list',

  // ── 地图池 ──
  POOL_SNAPSHOT: 'pool:snapshot',
  POOL_DRAW_RESULT: 'pool:draw-result',
  POOL_REPLACE_RESULT: 'pool:replace-result',
  POOL_UPDATED: 'pool:updated',

  // ── 单机模式 ──
  SOLO_STATE: 'solo:state',
  SOLO_DRAFT_STATE: 'solo:draft:state',
  SOLO_DRAFT_PICK_MADE: 'solo:draft:pick-made',
  SOLO_DECK_BUILD_STATE: 'solo:deck-build:state',
  SOLO_COMBAT_STATE: 'solo:combat:state',
  SOLO_ACTION_STATE: 'solo:action:state',
  SOLO_AI_ACTIONS: 'solo:ai:actions',
  SOLO_RESULT: 'solo:result',

  // ── 错误 ──
  ERROR: 'error',
} as const
