/**
 * 篡者范型效果引擎
 *
 * 在角色创建确认时调用，将范型的 specialEffects 应用到篡者和幻身的派生属性。
 * 运行时效果（如战术风格变体）由 tactical-style-engine 和 phase-effects 处理。
 */

import type { MasterArchetypeId } from 'shared'
import { MASTER_ARCHETYPE_MAP } from 'shared'

/** 范型修改结果 */
export interface ArchetypeModifiers {
  // 篡者属性修改
  masterDamageBonusFlat: number
  masterMpMaxBonus: number
  masterHandSizeBonus: number
  masterActionPointsBonus: number
  // 幻身属性修改
  servantAttributePointsBonus: number
  servantOutpostLimitBonus: number
  servantReplaceCountBonus: number
  // 战术风格修改
  tacticalStyleExtraUses: number
  tacticalStyleIsRainbow: boolean
  tacticalStyleSinglePayOnly: boolean
  tacticalStyleDisabled: boolean
  // 技能槽修改（由范型slotModifiers决定，此处计算最终值）
  martialSlots: number
  magicSlots: number
  itemSlots: number
  mysticEyeSlots: number
  obsessionSlots: number
  noblePhantasmSlots: number
  // 特殊标记
  unlockHighRanks: boolean
  loseSecretKey: number
  cannotRestoreKeys: boolean
  adjacentMoveBonus: number
  scoutRangeBonus: number
  independentActions: number
}

const BASE_SLOTS = { martial: 2, magic: 2, item: 2, mysticEye: 0, obsession: 0, noblePhantasm: 0 }

/**
 * 计算范型带来的所有修改
 */
export function computeArchetypeModifiers(archetypeId: MasterArchetypeId): ArchetypeModifiers {
  const archetype = MASTER_ARCHETYPE_MAP[archetypeId]
  const mods: ArchetypeModifiers = {
    masterDamageBonusFlat: 0,
    masterMpMaxBonus: 0,
    masterHandSizeBonus: 0,
    masterActionPointsBonus: 0,
    servantAttributePointsBonus: 0,
    servantOutpostLimitBonus: 0,
    servantReplaceCountBonus: 0,
    tacticalStyleExtraUses: 0,
    tacticalStyleIsRainbow: false,
    tacticalStyleSinglePayOnly: false,
    tacticalStyleDisabled: false,
    martialSlots: BASE_SLOTS.martial,
    magicSlots: BASE_SLOTS.magic,
    itemSlots: BASE_SLOTS.item,
    mysticEyeSlots: BASE_SLOTS.mysticEye,
    obsessionSlots: BASE_SLOTS.obsession,
    noblePhantasmSlots: BASE_SLOTS.noblePhantasm,
    unlockHighRanks: false,
    loseSecretKey: 0,
    cannotRestoreKeys: false,
    adjacentMoveBonus: 0,
    scoutRangeBonus: 0,
    independentActions: 0,
  }

  if (!archetype) return mods

  // 应用槽位修改
  for (const sm of archetype.slotModifiers) {
    const change = sm.change
    switch (sm.slotType) {
      case 'martial': mods.martialSlots = change === -99 ? 0 : mods.martialSlots + change; break
      case 'magic': mods.magicSlots = change === -99 ? 0 : mods.magicSlots + change; break
      case 'item': mods.itemSlots = change === -99 ? 0 : mods.itemSlots + change; break
      case 'mystic_eye': mods.mysticEyeSlots += change; break
      case 'obsession': mods.obsessionSlots += change; break
      case 'noble_phantasm': mods.noblePhantasmSlots += change; break
    }
  }

  // 应用特殊效果
  for (const effect of archetype.specialEffects) {
    switch (effect) {
      case 'damage_bonus_1': mods.masterDamageBonusFlat += 1; break
      case 'mp_max_plus_1': mods.masterMpMaxBonus += 1; break
      case 'hand_size_plus_1': mods.masterHandSizeBonus += 1; break
      case 'hand_size_plus_2': mods.masterHandSizeBonus += 2; break
      case 'action_points_plus_1': mods.masterActionPointsBonus += 1; break
      case 'tactical_style_extra_use': mods.tacticalStyleExtraUses += 1; break
      case 'tactical_style_single_pay': mods.tacticalStyleSinglePayOnly = true; break
      case 'tactical_style_rainbow': mods.tacticalStyleIsRainbow = true; break
      case 'lose_tactical_style': mods.tacticalStyleDisabled = true; break
      case 'unlock_high_ranks': mods.unlockHighRanks = true; break
      case 'lose_1_secret_key': mods.loseSecretKey += 1; break
      case 'cannot_restore_keys': mods.cannotRestoreKeys = true; break
      case 'adjacent_move_plus_1': mods.adjacentMoveBonus += 1; break
      case 'adjacent_move_minus_1': mods.adjacentMoveBonus -= 1; break
      case 'scout_range_plus_1': mods.scoutRangeBonus += 1; break
      case 'independent_actions_2': mods.independentActions = 2; break
      case 'outpost_limit_plus_2': mods.servantOutpostLimitBonus += 2; break
      case 'replace_count_plus_1': mods.servantReplaceCountBonus += 1; break
      case 'prep_extra_mp': mods.masterMpMaxBonus += 0; break // 准备阶段+1额外MP由phase-effects处理
      case 'noble_phantasm_slot': mods.noblePhantasmSlots += 1; break
      case 'any_slot_plus_3':
        // 非法参战者：任一槽位+3（需要玩家选择，此处标记）
        break
      // 以下效果在运行时处理，非属性修改
      case 'random_archetype_compose':
      case 'lose_one_combat_slot':
      case 'map_ability_extra_pick':
      case 'gain_key_on_kill':
      case 'key_counter_once':
      case 'humanity_pressure_card':
      case 'key_removes_pressure_gain_key':
      case 'silk_thread_card':
      case 'ignore_path_once':
        break
    }
  }

  // 确保槽位不为负
  mods.martialSlots = Math.max(0, mods.martialSlots)
  mods.magicSlots = Math.max(0, mods.magicSlots)
  mods.itemSlots = Math.max(0, mods.itemSlots)

  return mods
}

/**
 * 获取范型修改后的总技能槽数
 */
export function getTotalSkillSlots(mods: ArchetypeModifiers): number {
  return mods.martialSlots + mods.magicSlots + mods.itemSlots
    + mods.mysticEyeSlots + mods.obsessionSlots + mods.noblePhantasmSlots
}
