import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  name: text('name').notNull(),
  color: text('color').notNull(),
  masterPlayerId: text('master_player_id').notNull(),
  servantPlayerId: text('servant_player_id').notNull(),
  secretKeysRemaining: integer('secret_keys_remaining').notNull().default(3),
  status: text('status').notNull().default('alive'),
  akashaKeyHolder: integer('akasha_key_holder', { mode: 'boolean' }).notNull().default(false),
  magicChannelProgress: integer('magic_channel_progress').notNull().default(0),
  isReady: integer('is_ready', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  roomIdx: index('idx_groups_room').on(table.roomId),
  masterIdx: uniqueIndex('idx_groups_master').on(table.masterPlayerId),
  servantIdx: uniqueIndex('idx_groups_servant').on(table.servantPlayerId),
}))

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  gmPlayerId: text('gm_player_id'),
  config: text('config').notNull().default('{}'),
  phase: text('phase').notNull().default('round_start'),
  turnNumber: integer('turn_number').notNull().default(0),
  currentActionPointIndex: integer('current_action_point_index').notNull().default(0),
  status: text('status').notNull().default('waiting'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  accountName: text('account_name').notNull(),
  displayName: text('display_name').notNull(),
  isGm: integer('is_gm', { mode: 'boolean' }).notNull().default(false),
  isBot: integer('is_bot', { mode: 'boolean' }).notNull().default(false),
  hp: integer('hp').notNull().default(100),
  hpMax: integer('hp_max').notNull().default(100),
  mp: integer('mp').notNull().default(50),
  mpMax: integer('mp_max').notNull().default(50),
  actionPoints: integer('action_points').notNull().default(4),
  actionPointsMax: integer('action_points_max').notNull().default(4),
  regionId: text('region_id'),
  boundToPlayerId: text('bound_to_player_id'),
  status: text('status').notNull().default('connected'),
  cardMenuUnlocked: integer('card_menu_unlocked', { mode: 'boolean' }).notNull().default(false),
  color: text('color').notNull().default('#3B82F6'),
  // ── 双角色系统 ──
  role: text('role'),                    // 'master' | 'servant' | null
  groupId: text('group_id'),
  // 幻身五维
  str: text('str'),                      // AttributeRank
  end: text('end_rank'),                 // "end" is reserved in some SQL dialects
  agi: text('agi'),
  mag: text('mag'),
  luk: text('luk'),
  classId: text('class_id'),
  // 篡者属性
  actionPower: text('action_power'),
  archetypeId: text('archetype_id'),
  tacticalStyle: text('tactical_style'),
  tacticalStyleUsed: integer('tactical_style_used', { mode: 'boolean' }).notNull().default(false),
  // 战斗属性
  armorClass: integer('armor_class').notNull().default(0),
  baseDamage: integer('base_damage').notNull().default(0),
  actions: integer('actions').notNull().default(0),
  actionsMax: integer('actions_max').notNull().default(0),
  handSizeMax: integer('hand_size_max').notNull().default(5),
  extraMp: integer('extra_mp').notNull().default(0),
  extraMpMax: integer('extra_mp_max').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  roomIdx: index('idx_players_room').on(table.roomId),
  regionIdx: index('idx_players_region').on(table.regionId),
  accountRoomIdx: uniqueIndex('idx_players_account_room').on(table.accountName, table.roomId),
  groupIdx: index('idx_players_group').on(table.groupId),
}))

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id').notNull().references(() => players.id),
  name: text('name').notNull(),
  type: text('type').notNull().default('normal'),
  description: text('description').notNull().default(''),
  metadata: text('metadata').notNull().default('{}'),
  location: text('location').notNull().default('deck'),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  playerLocationIdx: index('idx_cards_player_location').on(table.playerId, table.location),
}))

export const regions = sqliteTable('regions', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  name: text('name').notNull(),
  positionX: real('position_x').notNull().default(0),
  positionY: real('position_y').notNull().default(0),
  metadata: text('metadata').notNull().default('{}'),
}, (table) => ({
  roomIdx: index('idx_regions_room').on(table.roomId),
}))

export const adjacencies = sqliteTable('adjacencies', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  fromRegionId: text('from_region_id').notNull().references(() => regions.id),
  toRegionId: text('to_region_id').notNull().references(() => regions.id),
  type: text('type').notNull().default('bidirectional'),
}, (table) => ({
  roomFromIdx: index('idx_adjacencies_room_from').on(table.roomId, table.fromRegionId),
}))

export const outposts = sqliteTable('outposts', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id').notNull().references(() => players.id),
  regionId: text('region_id').notNull().references(() => regions.id),
  color: text('color').notNull(),
  placedAt: integer('placed_at').notNull(),
}, (table) => ({
  roomPlayerIdx: index('idx_outposts_room_player').on(table.roomId, table.playerId),
}))

export const actionQueue = sqliteTable('action_queue', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id').notNull().references(() => players.id),
  turnNumber: integer('turn_number').notNull(),
  actionPointIndex: integer('action_point_index').notNull(),
  actionType: text('action_type').notNull(),
  payload: text('payload').notNull().default('{}'),
  status: text('status').notNull().default('pending'),
  submittedAt: integer('submitted_at').notNull(),
  resolvedAt: integer('resolved_at'),
}, (table) => ({
  roomTurnIdx: index('idx_action_queue_room_turn').on(table.roomId, table.turnNumber, table.status),
}))

export const operationLogs = sqliteTable('operation_logs', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id'),
  actionType: text('action_type').notNull(),
  description: text('description').notNull(),
  details: text('details').notNull().default('{}'),
  phase: text('phase').notNull(),
  turnNumber: integer('turn_number').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  roomCreatedIdx: index('idx_logs_room_created').on(table.roomId, table.createdAt),
}))

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id').notNull().references(() => players.id),
  regionId: text('region_id').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  roomRegionIdx: index('idx_chat_room_region').on(table.roomId, table.regionId, table.createdAt),
}))

export const gameSnapshots = sqliteTable('game_snapshots', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().unique().references(() => rooms.id),
  state: text('state').notNull(),
  savedAt: integer('saved_at').notNull(),
})

export const skillTemplates = sqliteTable('skill_templates', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  name: text('name').notNull(),
  type: text('type').notNull().default('active'),
  defaultCooldown: integer('default_cooldown').notNull().default(0),
  defaultCharges: integer('default_charges'),
  description: text('description').notNull().default(''),
  metadata: text('metadata').notNull().default('{}'),
}, (table) => ({
  roomIdx: index('idx_skill_templates_room').on(table.roomId),
}))

export const knownOutposts = sqliteTable('known_outposts', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull().references(() => players.id),
  outpostId: text('outpost_id').notNull(),
  ownerPlayerId: text('owner_player_id').notNull(),
  ownerDisplayName: text('owner_display_name').notNull(),
  regionId: text('region_id').notNull(),
  color: text('color').notNull(),
  discoveredAt: integer('discovered_at').notNull(),
}, (table) => ({
  playerIdx: index('idx_known_outposts_player').on(table.playerId),
  playerOutpostIdx: uniqueIndex('idx_known_outposts_player_outpost').on(table.playerId, table.outpostId),
}))

export const playerSkills = sqliteTable('player_skills', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull().references(() => players.id),
  skillId: text('skill_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull().default('active'),
  cooldown: integer('cooldown').notNull().default(0),
  cooldownRemaining: integer('cooldown_remaining').notNull().default(0),
  charges: integer('charges'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  metadata: text('metadata').notNull().default('{}'),
}, (table) => ({
  playerIdx: index('idx_player_skills_player').on(table.playerId),
}))

export const deckBuilds = sqliteTable('deck_builds', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id').notNull().references(() => players.id),
  strikeCards: text('strike_cards').notNull().default('{"red":0,"blue":0,"green":0}'),
  skillIds: text('skill_ids').notNull().default('[]'),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  roomPlayerIdx: uniqueIndex('idx_deck_builds_room_player').on(table.roomId, table.playerId),
}))

export const combatStates = sqliteTable('combat_states', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  roundNumber: integer('round_number').notNull().default(1),
  turnIndex: integer('turn_index').notNull().default(0),
  turnOrder: text('turn_order').notNull().default('[]'),
  phase: text('phase').notNull().default('play'),
  activePlayerId: text('active_player_id'),
  playChain: text('play_chain').notNull().default('[]'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  startedAt: integer('started_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  roomIdx: index('idx_combat_states_room').on(table.roomId),
}))

export const combatLogs = sqliteTable('combat_logs', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  roundNumber: integer('round_number').notNull(),
  playerId: text('player_id'),
  eventType: text('event_type').notNull(),
  description: text('description').notNull(),
  details: text('details').notNull().default('{}'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  roomCreatedIdx: index('idx_combat_logs_room').on(table.roomId, table.createdAt),
}))

export const deckShares = sqliteTable('deck_shares', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id').notNull().references(() => players.id),
  deckBuildId: text('deck_build_id').notNull(),
  shareCode: text('share_code').notNull().unique(),
  createdAt: integer('created_at').notNull(),
})

// 玩家技能提交（概念文本，待GM审核）
export const skillSubmissions = sqliteTable('skill_submissions', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id').notNull(),
  playerName: text('player_name').notNull(),
  sourceName: text('source_name').notNull(),
  skillName: text('skill_name').notNull(),
  skillType: text('skill_type').notNull().default('active'),
  skillCategory: text('skill_category').notNull().default('base'),
  description: text('description').notNull(),
  costDescription: text('cost_description'),
  status: text('status').notNull().default('pending'), // pending/approved/rejected
  adminSkillId: text('admin_skill_id'), // 关联到 admin_skill_library
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  roomIdx: index('idx_skill_submissions_room').on(table.roomId),
}))

// Admin-managed libraries (overrides constants at runtime)
export const adminSkillLibrary = sqliteTable('admin_skill_library', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  skillClass: text('skill_class').notNull(),
  rarity: text('rarity').notNull().default('normal'),
  type: text('type').notNull().default('active'),
  triggerTiming: text('trigger_timing').notNull().default('manual'),
  description: text('description').notNull().default(''),
  flavorText: text('flavor_text'),
  cost: text('cost').notNull().default('{}'),
  cooldown: integer('cooldown').notNull().default(0),
  charges: integer('charges'),
  targetType: text('target_type').notNull().default('single'),
  effects: text('effects').notNull().default('[]'),
  tags: text('tags').notNull().default('[]'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  /** 技能分类：base=基础技能, link=连携技能 */
  skillCategory: text('skill_category').notNull().default('base'),
  /** 是否已审核可进入轮抓池 */
  draftReady: integer('draft_ready', { mode: 'boolean' }).notNull().default(false),
  /** 技能来源（出自哪个神话/英灵） */
  sourceName: text('source_name'),
  /** 是否高稀有度（轮抓分级用） */
  isHighRarity: integer('is_high_rarity', { mode: 'boolean' }).notNull().default(false),
  /** 卡牌数量（卡牌类技能） */
  cardCount: integer('card_count'),
  /** 颜色（卡牌类技能的颜色） */
  skillColor: text('skill_color'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const adminStrikeLibrary = sqliteTable('admin_strike_library', {
  id: text('id').primaryKey(),
  color: text('color').notNull(),
  name: text('name').notNull(),
  baseDamage: integer('base_damage').notNull().default(10),
  description: text('description').notNull().default(''),
  effectType: text('effect_type'),
  effectParams: text('effect_params').notNull().default('{}'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// 地点大奖
export const locationPrizes = sqliteTable('location_prizes', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  regionId: text('region_id').notNull().references(() => regions.id),
  skillId: text('skill_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  claimed: integer('claimed', { mode: 'boolean' }).notNull().default(false),
  claimedByGroupId: text('claimed_by_group_id'),
  claimedAt: integer('claimed_at'),
}, (table) => ({
  roomRegionIdx: index('idx_location_prizes_room_region').on(table.roomId, table.regionId),
}))

// ── 真名系统 ──

/** 遭遇记录：记录哪些玩家之间有过同区域接触 */
export const encounters = sqliteTable('encounters', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerIdA: text('player_id_a').notNull().references(() => players.id),
  playerIdB: text('player_id_b').notNull().references(() => players.id),
  firstMetAt: integer('first_met_at').notNull(),
}, (table) => ({
  roomIdx: index('idx_encounters_room').on(table.roomId),
  pairIdx: uniqueIndex('idx_encounters_pair').on(table.playerIdA, table.playerIdB),
}))

/** 真名揭示记录：猜中者永久可见目标五维 */
export const trueNameReveals = sqliteTable('true_name_reveals', {
  id: text('id').primaryKey(),
  guesserPlayerId: text('guesser_player_id').notNull().references(() => players.id),
  targetPlayerId: text('target_player_id').notNull().references(() => players.id),
  trueName: text('true_name').notNull(),
  revealedAt: integer('revealed_at').notNull(),
}, (table) => ({
  guesserIdx: index('idx_true_name_guesser').on(table.guesserPlayerId),
  pairIdx: uniqueIndex('idx_true_name_pair').on(table.guesserPlayerId, table.targetPlayerId),
}))

// ── 地图池 ──

/** 地图池技能条目（实际状态，含是否被抽走） */
export const skillPool = sqliteTable('skill_pool', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  skillId: text('skill_id').notNull(),
  name: text('name').notNull(),
  skillClass: text('skill_class').notNull(),
  description: text('description').notNull().default(''),
  sourceName: text('source_name').notNull().default(''),
  drawn: integer('drawn', { mode: 'boolean' }).notNull().default(false),
  drawnByPlayerId: text('drawn_by_player_id'),
  enteredAt: integer('entered_at').notNull(),
}, (table) => ({
  roomIdx: index('idx_skill_pool_room').on(table.roomId),
}))

/** 地图池快照（入池时冻结，全员可见） */
export const skillPoolSnapshot = sqliteTable('skill_pool_snapshot', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  /** JSON: PoolSnapshotEntry[] */
  skills: text('skills').notNull().default('[]'),
  createdAt: integer('created_at').notNull(),
})

/** 玩家替换次数追踪 */
export const playerReplaceTrackers = sqliteTable('player_replace_trackers', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull().references(() => players.id),
  roomId: text('room_id').notNull().references(() => rooms.id),
  baseCount: integer('base_count').notNull().default(2),
  killBonusCount: integer('kill_bonus_count').notNull().default(0),
  usedCount: integer('used_count').notNull().default(0),
}, (table) => ({
  playerIdx: uniqueIndex('idx_replace_tracker_player').on(table.playerId, table.roomId),
}))
