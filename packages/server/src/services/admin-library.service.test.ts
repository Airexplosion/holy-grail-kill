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

describe('admin skill library bootstrap', () => {
  test('seeds the constant skill library into DB and serves admin data from DB', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hgk-skill-db-'))
    process.env.DB_PATH = path.join(tempDir, 'game.db')

    const shared = await import('shared')
    const adminLibrary = await import('./admin-library.service.js')
    const dbModule = await import('../db/connection.js')
    const schema = await import('../db/schema.js')

    const rowsBefore = dbModule.getDb().select().from(schema.adminSkillLibrary).all()
    expect(rowsBefore).toHaveLength(0)

    const skills = adminLibrary.getAllSkillsAdmin()
    const rowsAfter = dbModule.getDb().select().from(schema.adminSkillLibrary).all()

    expect(rowsAfter).toHaveLength(shared.SKILL_LIBRARY.length)
    expect(skills).toHaveLength(shared.SKILL_LIBRARY.length)
    expect(skills.every((skill) => skill.source === 'db')).toBe(true)
  })
})
