# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

圣杯杀 (Holy Grail Kill) - 一个实时多人桌游管理系统。支持 7-28 名玩家 + 1 名 GM (Game Master) 在同一房间中进行游戏。

## Tech Stack

- **Monorepo**: pnpm workspaces, 三个包 (`shared`, `server`, `client`)
- **Backend**: Node.js 20 + Express + Socket.IO 4 + TypeScript
- **Database**: SQLite (better-sqlite3) + Drizzle ORM, WAL mode
- **Frontend**: React 18 + Vite 5 + TypeScript + Tailwind CSS + Zustand
- **Map Rendering**: @xyflow/react (React Flow)
- **Auth**: JWT (jsonwebtoken)
- **Validation**: Zod (shared schemas between client/server)

## Commands

```bash
# Install dependencies
pnpm install

# Must build shared first (other packages depend on it)
pnpm run build:shared

# Development (runs both server and client)
pnpm run dev

# Run individually
pnpm run dev:server    # Express + Socket.IO on :3001
pnpm run dev:client    # Vite on :5173

# Build all
pnpm run build

# Tests
pnpm run test          # All packages
pnpm run test:server   # Server only
pnpm run test:client   # Client only
```

## Architecture

### Package Structure

- `packages/shared/` - TypeScript types, Zod schemas, constants. **Must be built before other packages.** Exports all types/schemas from `src/index.ts`.
- `packages/server/` - Express REST API + Socket.IO real-time server. Uses in-memory game state with SQLite persistence.
- `packages/client/` - React SPA. Player view (`/game`) and GM console (`/gm`) are separate routes.

### Key Architectural Patterns

**Single Source of Truth**: Game state lives in memory on the server. SQLite is secondary persistence (periodic snapshots + granular writes). Client state is a filtered projection.

**Visibility Engine**: All Socket.IO emissions pass through a visibility filter before reaching clients. Players only see: same-region players, own HP/MP/hand. GM sees everything. GM is never rendered on the map.

**Action Resolution**: Action phase uses async-submit/sync-execute model. Players submit actions independently → server collects all → GM approves → deterministic batch resolution (moves → scouts → outposts → consumes).

**Phase State Machine**: Strict linear progression: 回合开始 → 准备 → 行动 → 备战 → 战斗 → 回合结束. Only GM can advance.

### Socket.IO Room Strategy

- `room:{roomCode}` — all members
- `room:{roomCode}:region:{regionId}` — location-based chat
- `room:{roomCode}:gm` — GM-only events

### Database

SQLite with WAL mode. Schema in `packages/server/src/db/schema.ts`. Tables are auto-created on first connection via `connection.ts`. Key tables: rooms, players, cards, regions, adjacencies, outposts, action_queue, operation_logs, chat_messages, game_snapshots, skill_templates, player_skills.

### Frontend State

Zustand stores (immutable updates only): `auth.store`, `game.store`, `map.store`, `card.store`, `chat.store`. Socket events are wired in `hooks/useSocket.ts`.

### Extensibility Points

- **Card skills**: `Card.metadata.skillEffect` + `CardType` field
- **Player skills**: `player_skills` table + `skill_templates` table + `SkillMetadata.effects[]`
- **Skill executor**: Strategy pattern — register handlers per effect type in `engine/skill-executor.ts`
- **Region metadata**: JSON field for future region-specific rules

## Conventions

- All shared types/schemas/constants live in `packages/shared` and are imported as `from 'shared'`
- Event names are constants in `shared/src/types/events.ts` (`C2S.*` for client→server, `S2C.*` for server→client)
- Frontend path alias: `@/` maps to `packages/client/src/`
- Vite proxies `/api` and `/socket.io` to backend in dev
- Chinese labels for all phases/actions are defined in shared constants
