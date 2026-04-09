# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

圣杯杀 (Holy Grail Kill) - 实时多人桌游管理系统。7-28 名玩家 + 1 名 GM 在同一房间中进行游戏。

## Tech Stack

- **Monorepo**: pnpm workspaces, 三个包 (`shared`, `server`, `client`)
- **Backend**: Node.js 20 + Express + Socket.IO 4 + TypeScript
- **Database**: SQLite (better-sqlite3) + Drizzle ORM, WAL mode
- **Frontend**: React 18 + Vite 5 + TypeScript + Tailwind CSS + Zustand
- **Map Rendering**: @xyflow/react (React Flow)
- **Auth**: JWT (jsonwebtoken)
- **Validation**: Zod (shared schemas between client/server)
- **Testing**: Vitest (both server and client)

## Commands

```bash
# Install dependencies
pnpm install

# Must build shared first (other packages depend on it)
pnpm run build:shared

# Development (runs both server and client concurrently)
pnpm run dev

# Run individually
pnpm run dev:server    # Express + Socket.IO on :3001
pnpm run dev:client    # Vite on :5173

# Build all (shared → server → client)
pnpm run build

# Tests
pnpm run test                          # All packages
pnpm run test:server                   # Server only
pnpm run test:client                   # Client only
pnpm --filter server run test:watch    # Server watch mode
pnpm --filter client run test:watch    # Client watch mode

# Lint
pnpm run lint                          # All packages
pnpm --filter client run lint          # Client ESLint only

# Database (from packages/server/)
pnpm run db:generate    # Generate Drizzle migrations
pnpm run db:migrate     # Run migrations
pnpm run db:studio      # Drizzle Studio GUI
```

## Environment Setup

Copy `.env.example` to `.env` at the repo root:

```env
PORT=3001                                # Server port (dev default: 3001, prod: 25656)
JWT_SECRET=change-me-to-a-random-string  # JWT signing key
DB_PATH=./data/game.db                   # SQLite database path
CLIENT_URL=http://localhost:5173         # Client origin for CORS
```

Config loaded in `packages/server/src/config/env.ts` — all vars have dev defaults.

## Architecture

### Package Structure

- `packages/shared/` — Types, Zod schemas, constants. **Must be built before other packages.** Barrel export from `src/index.ts`. No runtime logic — purely types/constants/validation.
- `packages/server/` — Express REST + Socket.IO real-time server. In-memory game state with SQLite persistence.
- `packages/client/` — React SPA. Player view (`/game`) and GM console (`/gm`) are separate routes.

### Server Architecture

**Entry point** (`packages/server/src/index.ts`): Express app → CORS → JSON → REST routes → DB init → Socket.IO setup → listen.

**REST Routes** (`routes/`):
- `/api/auth` — Account register/login, room join (returns JWT)
- `/api/rooms` — Room CRUD
- `/api/admin` — Skill library admin, strike card admin
- `/api/health` — Health check

**Socket.IO Handlers** (`socket/`):
- `socket/index.ts` — Main handler hub: room, game, map, card, skill, action, chat, log events
- `socket/deck-build-handlers.ts` — 备战 deck building events
- `socket/combat-handlers.ts` — 战斗 combat events
- `socket/middleware.ts` — JWT auth middleware for socket connections

**Services Layer** (`services/`): Business logic. Each service manages one domain — game, player, card, combat, deck-build, action, map, outpost, chat, skill-library, etc. Services call Drizzle ORM for DB access.

**Engine** (`engine/`): Core game mechanics:
- `combat-engine.ts` — Combat state machine: init, turn order, chain resolution, round management
- `skill-executor.ts` — Skill usability checks, execution, passive triggers, cooldown management
- `effect-pipeline.ts` — Extensible effect registry (strategy pattern). `registerEffect(effectType, handler)` for each effect type
- `phase-machine.ts` — Phase state machine: 回合开始→准备→行动→备战→战斗→回合结束 (linear, GM-only advance)
- `visibility.ts` — Filters game state per player. Players see: same-region players, own HP/MP/hand. GM sees everything, is never rendered on map
- `deck-manager.ts` — Card deck operations

### Key Architectural Patterns

**Single Source of Truth**: Game state lives in memory on the server. SQLite is secondary persistence (periodic snapshots + granular writes). Client state is a filtered projection.

**Visibility Engine**: All Socket.IO emissions pass through `visibility.ts` before reaching clients.

**Action Resolution**: Action phase uses async-submit/sync-execute model. Players submit independently → server collects → GM approves → deterministic batch resolution (moves → scouts → outposts → consumes).

**Combat Flow**: GM initiates → `initCombat()` creates turn order (sorted by priority) → each turn: play strike / use skill / pass → opponent responds → chain resolves → round ends: AP refreshes, MP doesn't, cooldowns -1.

### Socket.IO Rooms

- `room:{roomCode}` — all members
- `room:{roomCode}:region:{regionId}` — location-based chat
- `room:{roomCode}:gm` — GM-only events

### Socket.IO Event Constants

All events defined in `shared/src/types/events.ts`:
- `C2S.*` — client→server (e.g., `C2S.COMBAT_PLAY_STRIKE`)
- `S2C.*` — server→client (e.g., `S2C.COMBAT_STATE_UPDATE`)

### Database

SQLite with WAL mode. Schema in `packages/server/src/db/schema.ts`. Tables are auto-created on first connection via `connection.ts`. Key tables: accounts, rooms, players, cards, regions, adjacencies, outposts, actionQueue, operationLogs, chatMessages, gameSnapshots, skillTemplates, playerSkills, deckBuilds, knownOutposts.

### Frontend Architecture

**Routes** (`routes/`):
- `/login` — Account register/login
- `/lobby` — Room creation/join, player list
- `/game` — Player gameplay (map, cards, actions, combat)
- `/gm` — GM console (map editor, player/card/combat management, phase control, logs)
- `/admin` — Admin panel (skill library editor)

Route guards: `RequireAuth`, `RequireAdmin`, `RequireGame` (with optional `requireGm`).

**Zustand Stores** (`stores/`): Immutable updates only. One store per domain: `auth`, `game`, `room`, `map`, `card`, `combat`, `deck-build`, `chat`, `gm`.

**Socket Integration**: `hooks/useSocket.ts` centralizes all S2C event listeners. Each listener updates its corresponding Zustand store.

**State Flow**: REST API calls for auth/room ops → JWT stored in localStorage → Socket.IO for real-time game events → Zustand stores updated via socket listeners → React re-renders.

**Path alias**: `@/` maps to `packages/client/src/`.

**Dev proxy**: Vite proxies `/api` and `/socket.io` to `http://localhost:3001`.

### Extensibility Points

**Adding a new socket event**:
1. Add constant to `C2S`/`S2C` in `shared/src/types/events.ts`
2. Add Zod schema in `shared/src/schemas/`
3. Register handler in the appropriate `socket/*.ts` file
4. Add listener in client `hooks/useSocket.ts`

**Adding a new skill effect**:
1. Register handler via `registerEffect(effectType, handler)` in `engine/effect-pipeline.ts`
2. Add skill entry using new effect in `shared/src/constants/skill-library.ts`

**Adding a new REST endpoint**:
1. Create/edit route file in `server/src/routes/`
2. Register in `server/src/index.ts`
3. Add Zod schema for validation in `shared/src/schemas/`

## Game Systems Reference

### 击牌系统 (Strike Cards)

Rock-paper-scissors: 红击→蓝击响应, 蓝击→绿击响应, 绿击→红击响应. Constants: `STRIKE_COUNTER`, `RESPONSE_MAP`. Templates: `shared/src/constants/strike-cards.ts`. 24 cards per player deck.

### 技能系统 (Skills)

4 A-class + 2 B-class skills per player. Each skill has `effects: SkillEffectDef[]` — modular effect chain. 19+ effect types registered in `effect-pipeline.ts`. Full skill library: `shared/src/constants/skill-library.ts`. Skills have `rarity` (普通/稀有) for draft phase tiering.

### 轮抓阶段 (Draft — placeholder)

Types defined in `shared/src/types/draft.ts`, awaiting implementation.

## Conventions

- All shared types/schemas/constants imported as `from 'shared'`
- Event names are constants: `C2S.*` / `S2C.*` (never raw strings)
- Chinese labels for phases/actions are in shared constants (`PHASE_LABELS`, `ACTION_LABELS`, etc.)
- ESM throughout (`"type": "module"` in all packages)
- Server uses `.js` extensions in imports (TypeScript ESM requirement)

## Deployment

- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`), triggered by `v*` tags
- **Host**: VPS via SSH, deployed to `/www/wwwroot/holyGK`
- **Process**: pm2 with `ecosystem.config.cjs` — runs `tsx src/index.ts` in production on port 25656
- **Build steps**: `pnpm install` → `build:shared` → `build client` → pm2 restart
