/**
 * 秘钥效果引擎
 *
 * 篡者有3枚秘钥，每种用途效果不同：
 * ①防止致命伤害/HP流失
 * ②回复所有MP / 弃抽补满手牌
 * ③召回幻身到篡者身边
 * ④整组移动一次（非被宣战状态）
 * ⑤强制撤退（战斗第二轮后）
 * ⑥释放强力连携技能消耗
 */

import type { SecretKeyUseType } from 'shared'
import * as groupService from '../services/group.service.js'
import * as playerService from '../services/player.service.js'
import * as cardService from '../services/card.service.js'

export interface SecretKeyEffectResult {
  readonly success: boolean
  readonly useType: SecretKeyUseType
  readonly description: string
  readonly error?: string
}

/**
 * 执行秘钥效果
 */
export function executeSecretKeyEffect(
  groupId: string,
  useType: SecretKeyUseType,
  params?: { targetRegionId?: string; combatRound?: number },
): SecretKeyEffectResult {
  // 先消耗秘钥
  const consumed = groupService.useSecretKey(groupId)
  if (!consumed) {
    return { success: false, useType, description: '', error: '秘钥不足' }
  }

  const group = groupService.getGroup(groupId)
  if (!group) {
    return { success: false, useType, description: '', error: '组不存在' }
  }

  switch (useType) {
    case 'prevent_fatal':
      // 效果在伤害结算时拦截，此处仅标记
      return {
        success: true, useType,
        description: '秘钥激活：防止下一次致命伤害或HP流失',
      }

    case 'restore_mp': {
      // 回复所有MP
      const servant = playerService.getPlayer(group.servantPlayerId)
      const master = playerService.getPlayer(group.masterPlayerId)
      if (servant) playerService.updatePlayerStats(servant.id, { mp: servant.mpMax })
      if (master) playerService.updatePlayerStats(master.id, { mp: master.mpMax })
      return {
        success: true, useType,
        description: '秘钥激活：回复所有MP',
      }
    }

    case 'discard_draw': {
      // 弃抽：弃置全部手牌，补满
      const servant = playerService.getPlayer(group.servantPlayerId)
      if (servant) {
        const hand = cardService.getHand(servant.id)
        if (hand.length > 0) {
          cardService.discardCards(servant.id, hand.map((c: any) => c.id))
        }
        const handMax = servant.handSizeMax || 5
        cardService.drawCards(servant.id, handMax)
      }
      return {
        success: true, useType,
        description: '秘钥激活：弃抽补满手牌',
      }
    }

    case 'recall_servant': {
      // 召回幻身到篡者身边
      const master = playerService.getPlayer(group.masterPlayerId)
      if (master?.regionId) {
        playerService.updatePlayerRegion(group.servantPlayerId, master.regionId)
      }
      return {
        success: true, useType,
        description: '秘钥激活：召回幻身至篡者所在地',
      }
    }

    case 'group_move': {
      // 整组移动到指定区域
      const targetRegion = params?.targetRegionId
      if (!targetRegion) {
        return { success: false, useType, description: '', error: '需要指定目标区域' }
      }
      playerService.updatePlayerRegion(group.masterPlayerId, targetRegion)
      playerService.updatePlayerRegion(group.servantPlayerId, targetRegion)
      return {
        success: true, useType,
        description: '秘钥激活：整组移动',
      }
    }

    case 'forced_retreat': {
      // 强制撤退（战斗中使用，需第二轮后）
      if (params?.combatRound && params.combatRound < 2) {
        return { success: false, useType, description: '', error: '强制撤退仅在战斗第二轮后可用' }
      }
      return {
        success: true, useType,
        description: '秘钥激活：强制撤退',
      }
    }

    case 'release_skill':
      // 释放连携技能的秘钥消耗（具体效果由技能系统处理）
      return {
        success: true, useType,
        description: '秘钥激活：释放连携技能',
      }

    default:
      return { success: false, useType, description: '', error: '未知秘钥用途' }
  }
}
