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

## 备战 & 战斗系统

### 击牌系统（三色克制）

三种击牌，每种既能攻击也能防御，石头剪刀布克制：

| 攻击 | 被谁响应 | 基础伤害 |
|------|----------|----------|
| 红击 | 蓝击响应 | 10 |
| 蓝击 | 绿击响应 | 10 |
| 绿击 | 红击响应 | 10 |

- 组卡总计 24 张，红蓝绿任意比例
- 克制关系常量：`STRIKE_COUNTER` / `RESPONSE_MAP`
- 击牌模板：`packages/shared/src/constants/strike-cards.ts`

### 技能系统

选 4 个 A 级 + 2 个 B 级技能。每个技能有 `普通/稀有` 稀有度标签（用于轮抓分级）。

**技能效果接口（模块化）**：每个技能通过 `effects: SkillEffectDef[]` 定义效果链，每个效果是 `{ effectType: string, params: Record<string, unknown> }` 标准格式。新增技能只需在 `skill-library.ts` 追加条目。

**已实现的 effectType**：
- `damage` — 伤害（params: value, pierceShield?, aoe?）
- `heal` — 治疗（params: value, target?）
- `shield` — 护盾（params: value, duration?）
- `draw` — 抽牌（params: count, target?, fillTo?, condition?）
- `discard` — 弃牌（params: count, target?, choice?）
- `vision` — 侦查信息（params: reveal[]）
- `move` — 移动（params: type）
- `stealth` — 隐匿（params: duration）
- `reflect` — 反弹伤害（params: value）
- `removeShield` — 移除护盾
- `damageReduction` — 减伤（params: value, condition?）
- `damageBonus` — 伤害加成（params: value, condition?）
- `modifyPriority` — 出牌优先级修改（params: value）
- `mpReduction` — MP消耗减少（params: value, minCost?）
- `retrieveDiscard` — 弃牌堆回收（params: count, random?）

**技能库**：`packages/shared/src/constants/skill-library.ts`

**A 级技能 (12)：**
| ID | 名称 | 稀有度 | 类型 | 效果简述 |
|----|------|--------|------|----------|
| a01 | 圣剑一闪 | 普通 | 主动 | 2MP, 25伤, 无视5护盾 |
| a02 | 守护结界 | 普通 | 触发 | 受伤时抵消15伤, CD2 |
| a03 | 生命汲取 | 普通 | 主动 | 3MP, 15伤+吸血 |
| a04 | 战术侦查 | 普通 | 主动 | 1MP, 查看目标+抽1牌 |
| a05 | 迅捷突袭 | 稀有 | 主动 | 2MP, 移动+20伤, CD1 |
| a06 | 神圣护佑 | 普通 | 主动 | 3MP, 30护盾2回合, CD2 |
| a07 | 命运抽签 | 稀有 | 主动 | 1MP, 抽3弃1, CD1 |
| a08 | 破甲一击 | 普通 | 主动 | 2MP, 15伤+清护盾 |
| a09 | 烽火连天 | 稀有 | 主动 | 4MP, 区域AOE 15伤, CD2 |
| a10 | 战地救护 | 普通 | 主动 | 2MP, 回复30HP |
| a11 | 暗影潜行 | 稀有 | 触发 | 移动后隐匿, CD3 |
| a12 | 反击风暴 | 普通 | 触发 | 受击反弹10伤, CD1 |

**B 级技能 (8)：**
| ID | 名称 | 稀有度 | 类型 | 效果简述 |
|----|------|--------|------|----------|
| b01 | 坚韧意志 | 普通 | 被动 | HP<30%时减伤5 |
| b02 | 资源回收 | 普通 | 触发 | 每回合从弃牌堆回收1张 |
| b03 | 先手之利 | 稀有 | 被动 | 出牌优先级+1 |
| b04 | 补给线 | 普通 | 触发 | 回合结束手牌<3补至3 |
| b05 | 地利之势 | 普通 | 被动 | 己方阵地区域+5伤 |
| b06 | 鹰眼洞察 | 稀有 | 触发 | 战斗前查看对手上回合技能 |
| b07 | 节能回路 | 普通 | 被动 | 技能MP消耗-1 |
| b08 | 绝地反击 | 稀有 | 触发 | HP首次<50%回15HP+抽2牌, 每场1次 |

### 战斗流程

1. 备战阶段 → 玩家组卡（24击牌 + 6技能），锁定后进入战斗
2. 战斗按轮次进行，每轮所有参与者依次行动
3. 出牌链：出击 → 对手响应（或pass）→ 结算
4. 每轮结束：行动点刷新，MP**不恢复**
5. 技能按 triggerTiming 自动/手动触发

### 轮抓阶段（占位）

接口已定义在 `packages/shared/src/types/draft.ts`，等待实现。技能的 `rarity` 字段（普通/稀有）即为轮抓分级。

## Conventions

- All shared types/schemas/constants live in `packages/shared` and are imported as `from 'shared'`
- Event names are constants in `shared/src/types/events.ts` (`C2S.*` for client→server, `S2C.*` for server→client)
- Frontend path alias: `@/` maps to `packages/client/src/`
- Vite proxies `/api` and `/socket.io` to backend in dev
- Chinese labels for all phases/actions are defined in shared constants
