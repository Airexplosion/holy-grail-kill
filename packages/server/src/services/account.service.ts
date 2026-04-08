import { v4 as uuid } from 'uuid'
import { eq } from 'drizzle-orm'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { getDb } from '../db/connection.js'
import { accounts } from '../db/schema.js'
import { AppError } from '../middleware/error-handler.js'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuffer = Buffer.from(hash, 'hex')
  const derived = scryptSync(password, salt, 64)
  return timingSafeEqual(hashBuffer, derived)
}

export function register(username: string, password: string, displayName?: string) {
  const db = getDb()

  if (username.length < 2 || username.length > 20) {
    throw new AppError(400, '用户名长度需在2-20个字符之间')
  }
  if (password.length < 4 || password.length > 50) {
    throw new AppError(400, '密码长度需在4-50个字符之间')
  }

  const existing = db.select().from(accounts).where(eq(accounts.username, username)).get()
  if (existing) {
    throw new AppError(409, '用户名已存在')
  }

  const now = Date.now()
  const account = {
    id: uuid(),
    username,
    passwordHash: hashPassword(password),
    displayName: displayName || username,
    createdAt: now,
    updatedAt: now,
  }

  db.insert(accounts).values(account).run()

  return { id: account.id, username: account.username, displayName: account.displayName }
}

export function login(username: string, password: string) {
  const db = getDb()
  const account = db.select().from(accounts).where(eq(accounts.username, username)).get()

  if (!account) {
    throw new AppError(401, '用户名或密码错误')
  }

  if (!verifyPassword(password, account.passwordHash)) {
    throw new AppError(401, '用户名或密码错误')
  }

  return { id: account.id, username: account.username, displayName: account.displayName }
}

export function getAccount(accountId: string) {
  const db = getDb()
  const account = db.select().from(accounts).where(eq(accounts.id, accountId)).get()
  if (!account) return null
  return { id: account.id, username: account.username, displayName: account.displayName }
}
