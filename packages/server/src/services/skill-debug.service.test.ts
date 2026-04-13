import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, test, vi } from 'vitest'

const originalDbPath = process.env.DB_PATH

afterEach(() => {
  vi.resetModules()
  if (originalDbPath === undefined) {
    delete process.env.DB_PATH
  } else {
    process.env.DB_PATH = originalDbPath
  }
})

describe('skill debug sandbox', () => {
  test('returns before/after snapshots, effect results, and event logs for a skill test', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hgk-skill-sandbox-'))
    process.env.DB_PATH = path.join(tempDir, 'game.db')

    await import('../engine/effects/index.js')
    const sandbox = await import('./skill-debug.service.js')

    const result = sandbox.runSkillDebugSandbox({
      skillId: 'a03',
      source: {
        hp: 80,
        hpMax: 100,
        mp: 12,
        mpMax: 12,
        shield: 0,
        baseDamage: 14,
      },
      target: {
        hp: 70,
        hpMax: 100,
        shield: 5,
      },
    })

    expect(result.skill.id).toBe('a03')
    expect(result.before.source.mp).toBe(12)
    expect(result.after.source.mp).toBe(9)
    expect(result.after.target.hp).toBeLessThan(result.before.target.hp)
    expect(result.results.length).toBeGreaterThan(0)
    expect(result.events.length).toBeGreaterThan(0)
  })
})
