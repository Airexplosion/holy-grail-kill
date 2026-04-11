/**
 * 单机模式游戏服务
 *
 * 编排完整游戏流程：
 * 1. createSoloGame — 创建隐藏房间 + 人类玩家 + AI对手
 * 2. 轮抓 — 完整round-robin，AI自动选取
 * 3. 组卡 — 人类手动，AI自动
 * 4. 游戏进行 — 行动阶段AI自动行动，战斗AI自动出牌
 */

import { v4 as uuid } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { rooms, players, groups, regions, adjacencies } from '../db/schema.js'
import { signToken } from '../middleware/auth.js'
import { DEFAULT_SOLO_CONFIG, AI_TEMPLATES, PLAYER_COLORS } from 'shared'
import type { SoloConfig, AiTemplate } from 'shared'
import { generateRoomCode } from '../utils/room-code.js'
import * as aiBrain from './ai-brain.service.js'

/**
 * 创建单机游戏
 * 自动创建房间、人类组、AI组、地图
 */
export function createSoloGame(
  accountId: string,
  accountName: string,
  displayName: string,
  config?: Partial<SoloConfig>,
) {
  const db = getDb()
  const now = Date.now()
  const soloConfig = { ...DEFAULT_SOLO_CONFIG, ...config }

  // 1. 创建隐藏房间
  const roomId = uuid()
  const roomCode = generateRoomCode()

  const roomConfig = {
    maxOutpostsPerGroup: 2,
    defaultActionPoints: soloConfig.defaultActionPoints,
    minGroups: 3,
    maxGroups: 14,
    phaseTimeoutSeconds: 0, // 单机不超时
    actionTimeoutSeconds: 0,
    draftPickTimeoutSeconds: 0,
    enableGrandSystem: false,
    customRules: { isSolo: true, soloConfig },
    // legacy compat
    maxOutpostsPerPlayer: 3,
    defaultHp: 100,
    defaultHpMax: 100,
    defaultMp: 50,
    defaultMpMax: 50,
    minPlayers: 7,
    maxPlayers: 28,
  }

  db.insert(rooms).values({
    id: roomId,
    code: roomCode,
    name: `单机练习 - ${displayName}`,
    gmPlayerId: null,
    config: JSON.stringify(roomConfig),
    phase: 'round_start',
    turnNumber: 0,
    currentActionPointIndex: 0,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }).run()

  // 2. 创建人类玩家（servant角色）
  const humanPlayerId = uuid()
  const humanMasterId = uuid()

  db.insert(players).values({
    id: humanMasterId,
    roomId,
    accountName: `${accountName}_master`,
    displayName: `${displayName}(篡者)`,
    isGm: false,
    isBot: false,
    role: 'master',
    hp: 30, hpMax: 30,
    mp: 3, mpMax: 3,
    actionPoints: soloConfig.defaultActionPoints,
    actionPointsMax: soloConfig.defaultActionPoints,
    status: 'connected',
    color: PLAYER_COLORS[0]!,
    createdAt: now, updatedAt: now,
  }).run()

  db.insert(players).values({
    id: humanPlayerId,
    roomId,
    accountName,
    displayName,
    isGm: false,
    isBot: false,
    role: 'servant',
    hp: 36, hpMax: 36,
    mp: 4, mpMax: 4,
    actionPoints: soloConfig.defaultActionPoints,
    actionPointsMax: soloConfig.defaultActionPoints,
    status: 'connected',
    color: PLAYER_COLORS[0]!,
    createdAt: now, updatedAt: now,
  }).run()

  // 创建人类组
  const humanGroupId = uuid()
  db.insert(groups).values({
    id: humanGroupId,
    roomId,
    name: displayName,
    color: PLAYER_COLORS[0]!,
    masterPlayerId: humanMasterId,
    servantPlayerId: humanPlayerId,
    status: 'alive',
    createdAt: now, updatedAt: now,
  }).run()

  // 更新 groupId
  db.update(players).set({ groupId: humanGroupId }).where(eq(players.id, humanPlayerId)).run()
  db.update(players).set({ groupId: humanGroupId }).where(eq(players.id, humanMasterId)).run()

  // 3. 创建 AI 对手
  const aiGroupCount = Math.min(soloConfig.aiGroupCount, AI_TEMPLATES.length)
  const selectedTemplates = [...AI_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, aiGroupCount)
  const aiGroups: Array<{ groupId: string; servantId: string; masterId: string; template: AiTemplate }> = []

  for (let i = 0; i < selectedTemplates.length; i++) {
    const template = selectedTemplates[i]!
    const colorIdx = (i + 1) % PLAYER_COLORS.length
    const aiServantId = uuid()
    const aiMasterId = uuid()
    const aiGroupId = uuid()

    // AI Master
    db.insert(players).values({
      id: aiMasterId,
      roomId,
      accountName: `AI_master_${template.id}`,
      displayName: `${template.displayName}(篡者)`,
      isGm: false,
      isBot: true,
      role: 'master',
      hp: 25, hpMax: 25, mp: 2, mpMax: 2,
      actionPoints: soloConfig.defaultActionPoints,
      actionPointsMax: soloConfig.defaultActionPoints,
      status: 'connected',
      color: PLAYER_COLORS[colorIdx]!,
      createdAt: now, updatedAt: now,
    }).run()

    // AI Servant — 用模板属性
    db.insert(players).values({
      id: aiServantId,
      roomId,
      accountName: `AI_${template.id}`,
      displayName: template.displayName,
      isGm: false,
      isBot: true,
      role: 'servant',
      hp: 36, hpMax: 36, mp: 4, mpMax: 4,
      actionPoints: soloConfig.defaultActionPoints,
      actionPointsMax: soloConfig.defaultActionPoints,
      status: 'connected',
      color: PLAYER_COLORS[colorIdx]!,
      str: template.attributes.str,
      end: template.attributes.end,
      agi: template.attributes.agi,
      mag: template.attributes.mag,
      luk: template.attributes.luk,
      classId: template.preferredClassId,
      createdAt: now, updatedAt: now,
    }).run()

    db.insert(groups).values({
      id: aiGroupId,
      roomId,
      name: template.displayName,
      color: PLAYER_COLORS[colorIdx]!,
      masterPlayerId: aiMasterId,
      servantPlayerId: aiServantId,
      status: 'alive',
      createdAt: now, updatedAt: now,
    }).run()

    db.update(players).set({ groupId: aiGroupId }).where(eq(players.id, aiServantId)).run()
    db.update(players).set({ groupId: aiGroupId }).where(eq(players.id, aiMasterId)).run()

    aiGroups.push({ groupId: aiGroupId, servantId: aiServantId, masterId: aiMasterId, template })
  }

  // 4. 生成地图
  if (soloConfig.enableMap) {
    generateSoloMap(roomId, soloConfig.mapRegionCount)
  }

  // 5. 生成 game token
  const token = signToken({
    playerId: humanPlayerId,
    roomId,
    isGm: false,
    accountName,
    accountId,
  })

  return {
    token,
    room: db.select().from(rooms).where(eq(rooms.id, roomId)).get()!,
    humanPlayer: db.select().from(players).where(eq(players.id, humanPlayerId)).get()!,
    aiGroups: aiGroups.map(g => ({
      groupId: g.groupId,
      servantId: g.servantId,
      templateName: g.template.displayName,
    })),
  }
}

/**
 * 生成单机地图（简单环形 + 中央）
 */
function generateSoloMap(roomId: string, regionCount: number) {
  const db = getDb()
  const regionIds: string[] = []

  const regionNames = [
    '深渊城', '月光塔', '铁壁堡', '幽暗森林', '灵魂教堂',
    '废墟港', '龙脊峰', '星辰湖', '血色平原', '天空庭园',
    '时之回廊', '冥府入口', '黄金宫殿', '冰封要塞',
  ]

  // 创建区域（环形布局）
  for (let i = 0; i < regionCount; i++) {
    const id = uuid()
    const angle = (2 * Math.PI * i) / regionCount
    const radius = 2

    db.insert(regions).values({
      id,
      roomId,
      name: regionNames[i] || `区域${i + 1}`,
      positionX: Math.cos(angle) * radius,
      positionY: Math.sin(angle) * radius,
      metadata: '{}',
    }).run()

    regionIds.push(id)
  }

  // 创建邻接关系（环形双向通行）
  for (let i = 0; i < regionIds.length; i++) {
    const next = (i + 1) % regionIds.length
    db.insert(adjacencies).values({
      id: uuid(),
      roomId,
      fromRegionId: regionIds[i]!,
      toRegionId: regionIds[next]!,
      type: 'bidirectional',
    }).run()
  }

  // 随机分配玩家到不同区域
  const allPlayers = db.select().from(players)
    .where(and(eq(players.roomId, roomId), eq(players.role, 'servant')))
    .all()

  for (let i = 0; i < allPlayers.length; i++) {
    const regionId = regionIds[i % regionIds.length]!
    db.update(players)
      .set({ regionId })
      .where(eq(players.id, allPlayers[i]!.id))
      .run()
    // Master 跟随 Servant
    const group = db.select().from(groups)
      .where(eq(groups.servantPlayerId, allPlayers[i]!.id))
      .get()
    if (group) {
      db.update(players)
        .set({ regionId })
        .where(eq(players.id, group.masterPlayerId))
        .run()
    }
  }

  return regionIds
}

/**
 * 获取房间内所有AI幻身的ID列表
 */
export function getAiServantIds(roomId: string): string[] {
  const db = getDb()
  return db.select().from(players)
    .where(and(eq(players.roomId, roomId), eq(players.isBot, true), eq(players.role, 'servant')))
    .all()
    .map(p => p.id)
}

/**
 * 检查房间是否是单机模式
 */
export function isSoloRoom(roomId: string): boolean {
  const db = getDb()
  const room = db.select().from(rooms).where(eq(rooms.id, roomId)).get()
  if (!room) return false
  const config = JSON.parse(room.config)
  return !!config.customRules?.isSolo
}

/**
 * 清理单机游戏（退出时调用）
 */
export function cleanupSoloGame(roomId: string) {
  const db = getDb()
  // 级联删除太复杂，直接标记房间为finished
  db.update(rooms).set({ status: 'finished', updatedAt: Date.now() }).where(eq(rooms.id, roomId)).run()
}
