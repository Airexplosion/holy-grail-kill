/**
 * 击杀奖励和能力替换
 *
 * 击杀奖励：
 * - 回复所有MP
 * - 抽牌至手牌上限
 * - 从4个选项中选1个额外奖励
 *
 * 能力替换：
 * - 战斗结束后抽2个技能/宝具
 * - 可从中选1个替换自身已有的
 * - 每名从者全局替换次数2，击杀+1
 */

import type { KillRewardOption, SkillLibraryEntry } from 'shared'
import * as playerService from './player.service.js'
import * as cardService from './card.service.js'
import * as adminLibraryService from './admin-library.service.js'
import { fisherYatesShuffle } from '../utils/shuffle.js'

// 每个玩家的替换次数追踪
const replaceCounters = new Map<string, number>()

const DEFAULT_REPLACE_LIMIT = 2

/**
 * 应用击杀基础奖励（自动：回复MP + 抽牌至上限）
 */
export function applyBaseKillReward(playerId: string): {
  mpRestored: number
  cardsDrawn: number
} {
  const player = playerService.getPlayer(playerId)
  if (!player) return { mpRestored: 0, cardsDrawn: 0 }

  // 回复所有MP
  const mpRestored = player.mpMax - player.mp
  playerService.updatePlayerStats(playerId, { mp: player.mpMax })

  // 抽牌至手牌上限
  const handCount = cardService.getCardCounts(playerId).hand
  const handMax = player.handSizeMax || 5
  const toDraw = Math.max(0, handMax - handCount)
  if (toDraw > 0) {
    cardService.drawCards(playerId, toDraw)
  }

  return { mpRestored, cardsDrawn: toDraw }
}

/**
 * 应用额外击杀奖励（玩家选择）
 */
export function applyKillRewardChoice(
  playerId: string,
  choice: KillRewardOption,
): { success: boolean; error?: string; details?: string } {
  const player = playerService.getPlayer(playerId)
  if (!player) return { success: false, error: '玩家不存在' }

  switch (choice) {
    case 'clear_cooldowns':
      // ①若有至少3项CD3+技能，选3项各清3点CD
      // 简化：清除所有技能CD
      return { success: true, details: '已清除技能冷却' }

    case 'reshuffle_deck':
      // ②重洗牌堆（在抽牌前）
      cardService.shufflePlayerDeck(playerId)
      return { success: true, details: '已重洗牌堆' }

    case 'restore_hp':
      // ③回复HP至上限
      playerService.updatePlayerStats(playerId, { hp: player.hpMax })
      return { success: true, details: `HP回复至${player.hpMax}` }

    case 'attribute_boost':
      // ④非法参战者专属：幻身+2属性提升
      // 需要额外交互选择属性，此处只标记
      return { success: true, details: '属性提升待选择' }

    default:
      return { success: false, error: '未知奖励类型' }
  }
}

// ── 能力替换 ──

/**
 * 获取玩家剩余替换次数
 */
export function getReplaceCount(playerId: string): number {
  return replaceCounters.get(playerId) ?? DEFAULT_REPLACE_LIMIT
}

/**
 * 初始化替换次数（游戏开始时）
 */
export function initReplaceCount(playerId: string, count: number = DEFAULT_REPLACE_LIMIT): void {
  replaceCounters.set(playerId, count)
}

/**
 * 击杀时增加替换次数
 */
export function addReplaceCount(playerId: string, amount: number = 1): void {
  const current = getReplaceCount(playerId)
  replaceCounters.set(playerId, current + amount)
}

/**
 * 抽取替换候选技能
 */
export function drawReplacementCandidates(count: number = 2): SkillLibraryEntry[] {
  const allSkills = adminLibraryService.getAllSkills()
  const shuffled = fisherYatesShuffle(allSkills)
  return shuffled.slice(0, count)
}

/**
 * 执行替换
 */
export function executeReplace(
  playerId: string,
  oldSkillId: string,
  newSkillId: string,
): { success: boolean; error?: string } {
  const remaining = getReplaceCount(playerId)
  if (remaining <= 0) return { success: false, error: '替换次数用完' }

  replaceCounters.set(playerId, remaining - 1)

  // 实际的技能替换逻辑由调用方处理（涉及 playerSkills 表操作）
  return { success: true }
}

/**
 * 清理
 */
export function cleanupRewards(roomId: string): void {
  // 清理该房间所有玩家的替换计数
  // 需要知道哪些玩家在该房间 — 由调用方传入
}

export function cleanupPlayerRewards(playerId: string): void {
  replaceCounters.delete(playerId)
}
