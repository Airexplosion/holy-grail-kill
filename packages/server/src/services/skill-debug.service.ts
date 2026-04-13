import type { SkillLibraryEntry } from 'shared'
import type { EffectResult, CombatEventLog, PlayerCombatState } from '../engine/effect-pipeline.js'
import { createRuntimeSkill, executeSkill } from '../engine/skill-executor.js'
import { getSkillById } from './skill-library.service.js'

export interface SkillDebugSandboxRequest {
  skillId: string
  source: {
    hp: number
    hpMax: number
    mp: number
    mpMax: number
    shield?: number
    handCount?: number
    baseDamage?: number
  }
  target: {
    hp: number
    hpMax: number
    shield?: number
    mp?: number
    mpMax?: number
    handCount?: number
  }
}

export interface SkillDebugSandboxResult {
  skill: SkillLibraryEntry
  before: {
    source: SerializedCombatState
    target: SerializedCombatState
  }
  after: {
    source: SerializedCombatState
    target: SerializedCombatState
  }
  results: EffectResult[]
  events: CombatEventLog[]
  mpCost: number
}

interface SerializedCombatState {
  hp: number
  hpMax: number
  mp: number
  mpMax: number
  shield: number
  handCount: number
  flags: Record<string, unknown>
}

function createPlayerState(input: SkillDebugSandboxRequest['source'] | SkillDebugSandboxRequest['target']): PlayerCombatState {
  const flags = new Map<string, unknown>()
  if ('baseDamage' in input && typeof input.baseDamage === 'number') {
    flags.set('baseDamage', input.baseDamage)
  }

  return {
    hp: input.hp,
    hpMax: input.hpMax,
    mp: input.mp ?? 0,
    mpMax: input.mpMax ?? 0,
    shield: input.shield ?? 0,
    handCount: input.handCount ?? 0,
    flags,
  }
}

function serializeState(state: PlayerCombatState): SerializedCombatState {
  return {
    hp: state.hp,
    hpMax: state.hpMax,
    mp: state.mp,
    mpMax: state.mpMax,
    shield: state.shield,
    handCount: state.handCount,
    flags: Object.fromEntries(state.flags.entries()),
  }
}

export function runSkillDebugSandbox(input: SkillDebugSandboxRequest): SkillDebugSandboxResult {
  const skill = getSkillById(input.skillId)
  if (!skill) {
    throw new Error('技能不存在')
  }

  const sourceId = 'sandbox-source'
  const targetId = 'sandbox-target'
  const sourceState = createPlayerState(input.source)
  const targetState = createPlayerState(input.target)
  const playerStates = new Map<string, PlayerCombatState>([
    [sourceId, sourceState],
    [targetId, targetState],
  ])
  const events: CombatEventLog[] = []

  const before = {
    source: serializeState(sourceState),
    target: serializeState(targetState),
  }

  const runtimeSkill = createRuntimeSkill(skill)
  const { results, mpCost } = executeSkill(runtimeSkill, {
    sourceId,
    targetId,
    roomId: 'admin-debug-sandbox',
    playerStates,
    events,
  }, false)

  return {
    skill,
    before,
    after: {
      source: serializeState(sourceState),
      target: serializeState(targetState),
    },
    results,
    events,
    mpCost,
  }
}
