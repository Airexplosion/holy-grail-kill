/**
 * 阶段效果引擎
 * 各阶段入口/出口时自动触发的效果
 */

import type { GamePhase } from 'shared'
import * as playerService from '../services/player.service.js'
import * as cardService from '../services/card.service.js'
import * as groupService from '../services/group.service.js'

/**
 * 准备阶段效果
 * - MP回满（优先消耗非额外MP）
 * - 已满MP的玩家获得1额外MP（上限=MP上限）
 * - 抽牌补至手牌上限
 * - 手牌超限则弃至上限
 */
export function onPreparationPhaseEnter(roomId: string): void {
  const allPlayers = playerService.getNonGmPlayers(roomId)

  for (const p of allPlayers) {
    const player = playerService.getPlayer(p.id)
    if (!player) continue

    // MP回复
    const mpMax = player.mpMax
    let newMp = player.mp
    let newExtraMp = player.extraMp || 0
    const extraMpMax = player.extraMpMax || mpMax

    if (newMp >= mpMax) {
      // MP已满，获得1额外MP
      newExtraMp = Math.min(newExtraMp + 1, extraMpMax)
    } else {
      // MP未满，回满
      newMp = mpMax
    }

    playerService.updatePlayerStats(p.id, {
      mp: newMp,
    })

    // 抽牌补至手牌上限
    const handMax = player.handSizeMax || 5
    const counts = cardService.getCardCounts(p.id)
    if (counts.hand < handMax) {
      cardService.drawCards(p.id, handMax - counts.hand)
    }

    // 手牌超限弃至上限（由玩家选择弃哪些 — 这里先自动弃最后的）
    if (counts.hand > handMax) {
      const hand = cardService.getHand(p.id)
      const toDiscard = hand.slice(handMax).map((c: any) => c.id)
      if (toDiscard.length > 0) {
        cardService.discardCards(p.id, toDiscard)
      }
    }
  }
}

/**
 * 行动阶段效果
 * - 重置行动点为默认值（4）
 * - 重置相邻移动计数
 */
export function onActionPhaseEnter(roomId: string, defaultAP: number = 4): void {
  const allPlayers = playerService.getNonGmPlayers(roomId)
  for (const p of allPlayers) {
    playerService.updatePlayerStats(p.id, {
      actionPoints: defaultAP,
      actionPointsMax: defaultAP,
    })
  }
}

/**
 * 战斗阶段入口
 * - 由宣战触发，不在这里处理
 * - 仅在有宣战记录时才进入战斗阶段
 */
export function onCombatPhaseEnter(_roomId: string): void {
  // 战斗由 encounter-engine 和 group-combat.service 处理
}

/**
 * 回合开始效果
 * - 重置战术风格使用状态
 * - 重置相邻移动次数
 */
export function onRoundStartEnter(roomId: string): void {
  const allPlayers = playerService.getNonGmPlayers(roomId)
  for (const p of allPlayers) {
    playerService.updatePlayerStats(p.id, {
      // tacticalStyleUsed 会在回合开始重置 — 通过 DB 列
    })
  }
}

/**
 * 回合结束效果
 * - 清除临时效果
 */
export function onRoundEndEnter(_roomId: string): void {
  // 临时状态清理
}

/**
 * 根据阶段触发对应效果
 */
export function triggerPhaseEffects(roomId: string, phase: GamePhase, config: { defaultAP?: number } = {}): void {
  switch (phase) {
    case 'round_start':
      onRoundStartEnter(roomId)
      break
    case 'preparation':
      onPreparationPhaseEnter(roomId)
      break
    case 'action':
      onActionPhaseEnter(roomId, config.defaultAP || 4)
      break
    case 'combat':
      onCombatPhaseEnter(roomId)
      break
    case 'round_end':
      onRoundEndEnter(roomId)
      break
  }
}
