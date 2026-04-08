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
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_players_room').on(table.roomId),
  index('idx_players_region').on(table.regionId),
  uniqueIndex('idx_players_account_room').on(table.accountName, table.roomId),
])

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
}, (table) => [
  index('idx_cards_player_location').on(table.playerId, table.location),
])

export const regions = sqliteTable('regions', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  name: text('name').notNull(),
  positionX: real('position_x').notNull().default(0),
  positionY: real('position_y').notNull().default(0),
  metadata: text('metadata').notNull().default('{}'),
}, (table) => [
  index('idx_regions_room').on(table.roomId),
])

export const adjacencies = sqliteTable('adjacencies', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  fromRegionId: text('from_region_id').notNull().references(() => regions.id),
  toRegionId: text('to_region_id').notNull().references(() => regions.id),
  type: text('type').notNull().default('bidirectional'),
}, (table) => [
  index('idx_adjacencies_room_from').on(table.roomId, table.fromRegionId),
])

export const outposts = sqliteTable('outposts', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id').notNull().references(() => players.id),
  regionId: text('region_id').notNull().references(() => regions.id),
  color: text('color').notNull(),
  placedAt: integer('placed_at').notNull(),
}, (table) => [
  index('idx_outposts_room_player').on(table.roomId, table.playerId),
])

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
}, (table) => [
  index('idx_action_queue_room_turn').on(table.roomId, table.turnNumber, table.status),
])

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
}, (table) => [
  index('idx_logs_room_created').on(table.roomId, table.createdAt),
])

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id').notNull().references(() => players.id),
  regionId: text('region_id').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_chat_room_region').on(table.roomId, table.regionId, table.createdAt),
])

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
}, (table) => [
  index('idx_skill_templates_room').on(table.roomId),
])

export const knownOutposts = sqliteTable('known_outposts', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull().references(() => players.id),
  outpostId: text('outpost_id').notNull(),
  ownerPlayerId: text('owner_player_id').notNull(),
  ownerDisplayName: text('owner_display_name').notNull(),
  regionId: text('region_id').notNull(),
  color: text('color').notNull(),
  discoveredAt: integer('discovered_at').notNull(),
}, (table) => [
  index('idx_known_outposts_player').on(table.playerId),
  uniqueIndex('idx_known_outposts_player_outpost').on(table.playerId, table.outpostId),
])

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
}, (table) => [
  index('idx_player_skills_player').on(table.playerId),
])

export const deckBuilds = sqliteTable('deck_builds', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id').notNull().references(() => players.id),
  strikeCards: text('strike_cards').notNull().default('{"red":0,"blue":0,"green":0}'),
  skillIds: text('skill_ids').notNull().default('[]'),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  uniqueIndex('idx_deck_builds_room_player').on(table.roomId, table.playerId),
])

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
}, (table) => [
  index('idx_combat_states_room').on(table.roomId),
])

export const combatLogs = sqliteTable('combat_logs', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  roundNumber: integer('round_number').notNull(),
  playerId: text('player_id'),
  eventType: text('event_type').notNull(),
  description: text('description').notNull(),
  details: text('details').notNull().default('{}'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_combat_logs_room').on(table.roomId, table.createdAt),
])

export const deckShares = sqliteTable('deck_shares', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  playerId: text('player_id').notNull().references(() => players.id),
  deckBuildId: text('deck_build_id').notNull(),
  shareCode: text('share_code').notNull().unique(),
  createdAt: integer('created_at').notNull(),
})

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
