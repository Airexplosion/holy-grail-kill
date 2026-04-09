/**
 * 职业能力注册中心
 *
 * 统一管理所有职业的结构化能力定义。
 * 查询接口: getClassAbilities(classId)
 *
 * 新增职业：
 * 1. 在此目录下创建 {classId}.ts
 * 2. 导出 {CLASS_ID}_ABILITIES
 * 3. 在此文件中 import 并注册
 */

import type { ClassAbilityDef } from './_types.js'
import type { ServantClassId } from '../classes.js'

// ── 导入各职业能力定义 ──

import { SABER_ABILITIES } from './saber.js'
import { LANCER_ABILITIES } from './lancer.js'
import { ARCHER_ABILITIES } from './archer.js'
import { RIDER_ABILITIES } from './rider.js'
import { CASTER_ABILITIES } from './caster.js'
import { ASSASSIN_ABILITIES } from './assassin.js'
import { BERSERKER_ABILITIES } from './berserker.js'
import { AVENGER_ABILITIES } from './avenger.js'
import { SHIELDER_ABILITIES } from './shielder.js'
import { FOREIGNER_ABILITIES } from './foreigner.js'
import { PRETENDER_ABILITIES } from './pretender.js'
import { GUNNER_ABILITIES } from './gunner.js'
import { LAUNCHER_ABILITIES } from './launcher.js'
import { WATCHER_ABILITIES } from './watcher.js'
import { MOONCELL_ABILITIES } from './mooncell.js'
import { PLAYER_FAKER_ABILITIES } from './player_faker.js'
import { GATE_KEEPER_ABILITIES } from './gate_keeper.js'
import { LOSTMAN_ABILITIES } from './lostman.js'
import { MONSTER_ABILITIES } from './monster.js'
import { DRAGON_EXILE_ABILITIES } from './dragon_exile.js'
import { POLYHEDRON_ABILITIES } from './polyhedron.js'
import { MISSFLOWER_ABILITIES } from './missflower.js'
import { STRAYER_ABILITIES } from './strayer.js'
import { BROKEN_ROLE_ABILITIES } from './broken_role.js'
import { ANOTHER_ABILITIES } from './another.js'
import { CHAOS_ABILITIES } from './chaos.js'
import { BEAST_ABILITIES } from './beast.js'
import { ECLIPSE_ABILITIES } from './eclipse.js'
import { ALTEREGO_ABILITIES } from './alterego.js'
import { NONCLASS_ABILITIES } from './nonclass.js'

// 注册表
const registry = new Map<string, readonly ClassAbilityDef[]>()

function register(classId: ServantClassId, abilities: readonly ClassAbilityDef[]) {
  registry.set(classId, abilities)
}

// ── 注册所有职业 ──
register('saber', SABER_ABILITIES)
register('lancer', LANCER_ABILITIES)
register('archer', ARCHER_ABILITIES)
register('rider', RIDER_ABILITIES)
register('caster', CASTER_ABILITIES)
register('assassin', ASSASSIN_ABILITIES)
register('berserker', BERSERKER_ABILITIES)
register('avenger', AVENGER_ABILITIES)
register('shielder', SHIELDER_ABILITIES)
register('foreigner', FOREIGNER_ABILITIES)
register('pretender', PRETENDER_ABILITIES)
register('gunner', GUNNER_ABILITIES)
register('launcher', LAUNCHER_ABILITIES)
register('watcher', WATCHER_ABILITIES)
register('mooncell', MOONCELL_ABILITIES)
register('player_faker', PLAYER_FAKER_ABILITIES)
register('gate_keeper', GATE_KEEPER_ABILITIES)
register('lostman', LOSTMAN_ABILITIES)
register('monster', MONSTER_ABILITIES)
register('dragon_exile', DRAGON_EXILE_ABILITIES)
register('polyhedron', POLYHEDRON_ABILITIES)
register('missflower', MISSFLOWER_ABILITIES)
register('strayer', STRAYER_ABILITIES)
register('broken_role', BROKEN_ROLE_ABILITIES)
register('another', ANOTHER_ABILITIES)
register('chaos', CHAOS_ABILITIES)
register('beast', BEAST_ABILITIES)
register('eclipse', ECLIPSE_ABILITIES)
register('alterego', ALTEREGO_ABILITIES)
register('nonclass', NONCLASS_ABILITIES)

// ── 查询接口 ──

/** 获取指定职业的能力定义列表 */
export function getClassAbilities(classId: string): readonly ClassAbilityDef[] {
  return registry.get(classId) ?? []
}

/** 获取指定职业的指定能力 */
export function getClassAbility(classId: string, abilityId: string): ClassAbilityDef | undefined {
  return getClassAbilities(classId).find(a => a.id === abilityId)
}

/** 获取所有已注册的职业ID */
export function getRegisteredClassIds(): string[] {
  return [...registry.keys()]
}

/** 获取所有已注册的能力总数 */
export function getTotalAbilityCount(): number {
  let total = 0
  for (const abilities of registry.values()) total += abilities.length
  return total
}

// 类型重新导出
export type { ClassAbilityDef, ClassAbilityType, ClassAbilityTiming, ClassAbilityEffectDef } from './_types.js'
