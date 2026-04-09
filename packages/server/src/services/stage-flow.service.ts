/**
 * GameStage 流转服务
 *
 * 自动检测各阶段完成条件并推进：
 * lobby → character_create → draft → deck_build → playing → finished
 */

import type { GameStage } from 'shared'
import * as gameService from './game.service.js'
import * as groupService from './group.service.js'
import * as characterService from './character.service.js'
import * as draftService from './draft.service.js'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { deckBuilds } from '../db/schema.js'

/** 阶段流转顺序 */
const STAGE_ORDER: GameStage[] = ['lobby', 'character_create', 'draft', 'deck_build', 'playing', 'finished']

/**
 * 获取下一阶段
 */
export function getNextStage(current: GameStage): GameStage | null {
  const idx = STAGE_ORDER.indexOf(current)
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1]!
}

/**
 * 检查当前阶段是否满足推进条件，满足则自动推进
 * @returns 推进后的新阶段，或 null（未推进）
 */
export function tryAdvanceStage(roomId: string): GameStage | null {
  const currentStage = gameService.getGameStage(roomId)
  const canAdvance = checkStageComplete(roomId, currentStage)

  if (!canAdvance) return null

  const nextStage = getNextStage(currentStage)
  if (!nextStage) return null

  gameService.setGameStage(roomId, nextStage)

  // 进入 playing 阶段时启动游戏回合
  if (nextStage === 'playing') {
    gameService.startGame(roomId)
  }

  // 进入 draft 阶段时自动启动轮抓
  if (nextStage === 'draft') {
    draftService.startDraft(roomId)
  }

  return nextStage
}

/**
 * 强制设置阶段（房主/GM 手动推进用）
 */
export function forceSetStage(roomId: string, stage: GameStage): void {
  gameService.setGameStage(roomId, stage)

  if (stage === 'playing') {
    gameService.startGame(roomId)
  }
  if (stage === 'draft') {
    draftService.startDraft(roomId)
  }
}

/**
 * 检查当前阶段是否完成
 */
export function checkStageComplete(roomId: string, stage: GameStage): boolean {
  switch (stage) {
    case 'lobby':
      return checkAllGroupsFormed(roomId)
    case 'character_create':
      return checkAllCharactersConfirmed(roomId)
    case 'draft':
      return checkAllDraftsFinalized(roomId)
    case 'deck_build':
      return checkAllDecksLocked(roomId)
    default:
      return false
  }
}

/**
 * lobby 完成条件：至少2个组创建完毕
 */
export function checkAllGroupsFormed(roomId: string): boolean {
  const groups = groupService.getRoomGroups(roomId)
  return groups.length >= 2
}

/**
 * character_create 完成条件：所有组的 Master + Servant 都确认
 */
export function checkAllCharactersConfirmed(roomId: string): boolean {
  const groups = groupService.getRoomGroups(roomId)
  if (groups.length === 0) return false

  for (const group of groups) {
    const servantCheck = characterService.checkServantComplete(group.servantPlayerId)
    const masterCheck = characterService.checkMasterComplete(group.masterPlayerId)
    if (!servantCheck.complete || !masterCheck.complete) return false
  }
  return true
}

/**
 * draft 完成条件：所有组完成轮抓最终选择
 */
export function checkAllDraftsFinalized(roomId: string): boolean {
  return draftService.isAllFinalized(roomId)
}

/**
 * deck_build 完成条件：所有组锁定组卡
 */
export function checkAllDecksLocked(roomId: string): boolean {
  const groups = groupService.getRoomGroups(roomId)
  if (groups.length === 0) return false

  const db = getDb()
  for (const group of groups) {
    // 检查幻身的组卡是否锁定
    const build = db.select().from(deckBuilds)
      .where(and(
        eq(deckBuilds.roomId, roomId),
        eq(deckBuilds.playerId, group.servantPlayerId),
        eq(deckBuilds.isLocked, true),
      ))
      .get()
    if (!build) return false
  }
  return true
}
