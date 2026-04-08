import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'
import { env } from '../config/env.js'
import path from 'path'
import fs from 'fs'

let db: ReturnType<typeof drizzle<typeof schema>> | null = null
let sqlite: Database.Database | null = null

export function getDb() {
  if (db) return db

  const dbDir = path.dirname(env.dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  sqlite = new Database(env.dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  db = drizzle(sqlite, { schema })

  initTables(sqlite)

  return db
}

function initTables(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      gm_player_id TEXT,
      config TEXT NOT NULL DEFAULT '{}',
      phase TEXT NOT NULL DEFAULT 'round_start',
      turn_number INTEGER NOT NULL DEFAULT 0,
      current_action_point_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'waiting',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      account_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      is_gm INTEGER NOT NULL DEFAULT 0,
      hp INTEGER NOT NULL DEFAULT 100,
      hp_max INTEGER NOT NULL DEFAULT 100,
      mp INTEGER NOT NULL DEFAULT 50,
      mp_max INTEGER NOT NULL DEFAULT 50,
      action_points INTEGER NOT NULL DEFAULT 4,
      action_points_max INTEGER NOT NULL DEFAULT 4,
      region_id TEXT,
      bound_to_player_id TEXT,
      status TEXT NOT NULL DEFAULT 'connected',
      card_menu_unlocked INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#3B82F6',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_players_account_room ON players(account_name, room_id);
    CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id);
    CREATE INDEX IF NOT EXISTS idx_players_region ON players(region_id);

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      player_id TEXT NOT NULL REFERENCES players(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'normal',
      description TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      location TEXT NOT NULL DEFAULT 'deck',
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cards_player_location ON cards(player_id, location);

    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      name TEXT NOT NULL,
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      metadata TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_regions_room ON regions(room_id);

    CREATE TABLE IF NOT EXISTS adjacencies (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      from_region_id TEXT NOT NULL REFERENCES regions(id),
      to_region_id TEXT NOT NULL REFERENCES regions(id),
      type TEXT NOT NULL DEFAULT 'bidirectional'
    );
    CREATE INDEX IF NOT EXISTS idx_adjacencies_room_from ON adjacencies(room_id, from_region_id);

    CREATE TABLE IF NOT EXISTS outposts (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      player_id TEXT NOT NULL REFERENCES players(id),
      region_id TEXT NOT NULL REFERENCES regions(id),
      color TEXT NOT NULL,
      placed_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_outposts_room_player ON outposts(room_id, player_id);

    CREATE TABLE IF NOT EXISTS action_queue (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      player_id TEXT NOT NULL REFERENCES players(id),
      turn_number INTEGER NOT NULL,
      action_point_index INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at INTEGER NOT NULL,
      resolved_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_action_queue_room_turn ON action_queue(room_id, turn_number, status);

    CREATE TABLE IF NOT EXISTS operation_logs (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      player_id TEXT,
      action_type TEXT NOT NULL,
      description TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      phase TEXT NOT NULL,
      turn_number INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_logs_room_created ON operation_logs(room_id, created_at);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      player_id TEXT NOT NULL REFERENCES players(id),
      region_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_room_region ON chat_messages(room_id, region_id, created_at);

    CREATE TABLE IF NOT EXISTS game_snapshots (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL UNIQUE REFERENCES rooms(id),
      state TEXT NOT NULL,
      saved_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skill_templates (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'active',
      default_cooldown INTEGER NOT NULL DEFAULT 0,
      default_charges INTEGER,
      description TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_skill_templates_room ON skill_templates(room_id);

    CREATE TABLE IF NOT EXISTS player_skills (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      skill_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'active',
      cooldown INTEGER NOT NULL DEFAULT 0,
      cooldown_remaining INTEGER NOT NULL DEFAULT 0,
      charges INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      metadata TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_player_skills_player ON player_skills(player_id);
  `)
}

export function closeDb() {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    db = null
  }
}
