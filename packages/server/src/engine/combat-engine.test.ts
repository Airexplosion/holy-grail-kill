import { describe, expect, test } from 'vitest'

import 'shared'
import './effects/index.js'

import { initCombat, handlePlayStrike, resolveChain } from './combat-engine.js'

describe('combat strike damage', () => {
  test('uses attacker baseDamage instead of a fixed 10', () => {
    const state = initCombat('room-1', [
      {
        id: 'attacker',
        hp: 100,
        hpMax: 100,
        mp: 10,
        mpMax: 10,
        skills: [],
        hand: new Map([['red', 1]]),
        baseDamage: 17,
      } as any,
      {
        id: 'defender',
        hp: 100,
        hpMax: 100,
        mp: 10,
        mpMax: 10,
        skills: [],
        hand: new Map(),
        baseDamage: 0,
      } as any,
    ])

    const play = handlePlayStrike(state, 'attacker', 'red', 'defender')
    expect(play.success).toBe(true)

    const results = resolveChain(state)
    expect(results[0]?.value).toBe(17)
    expect(state.playerStates.get('defender')?.hp).toBe(83)
    expect(state.events.at(-1)?.description).toContain('17')
  })
})
