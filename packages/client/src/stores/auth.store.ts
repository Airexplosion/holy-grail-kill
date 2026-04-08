import { create } from 'zustand'
import type { Player, Room } from 'shared'
import { api } from '@/lib/api'

const ACCOUNT_TOKEN_KEY = 'account_token'
const GAME_TOKEN_KEY = 'game_token'

interface Account {
  accountId: string
  username: string
  displayName: string
  isAdmin?: boolean
}

interface AuthState {
  readonly accountToken: string | null
  readonly gameToken: string | null
  readonly account: Account | null
  readonly player: Player | null
  readonly room: Room | null
  readonly isLoggedIn: boolean
  readonly isInGame: boolean
  readonly isLoading: boolean
  readonly error: string | null
  register: (username: string, password: string, displayName?: string) => Promise<void>
  loginAccount: (username: string, password: string) => Promise<void>
  joinRoom: (roomCode: string, displayName?: string) => Promise<void>
  createRoom: (name: string, displayName?: string) => Promise<void>
  checkSession: () => Promise<void>
  enterRoom: (gameToken: string, player: Player, room: Room) => void
  leaveRoom: () => void
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accountToken: localStorage.getItem(ACCOUNT_TOKEN_KEY),
  gameToken: localStorage.getItem(GAME_TOKEN_KEY),
  account: null,
  player: null,
  room: null,
  isLoggedIn: false,
  isInGame: false,
  isLoading: false,
  error: null,

  register: async (username, password, displayName) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.post<{ account: Account; token: string }>('/auth/register', { username, password, displayName })
      localStorage.setItem(ACCOUNT_TOKEN_KEY, data.token)
      set({ accountToken: data.token, account: data.account, isLoggedIn: true, isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : '注册失败' })
      throw err
    }
  },

  loginAccount: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.post<{ account: Account; token: string }>('/auth/login', { username, password })
      localStorage.setItem(ACCOUNT_TOKEN_KEY, data.token)
      set({ accountToken: data.token, account: data.account, isLoggedIn: true, isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : '登录失败' })
      throw err
    }
  },

  joinRoom: async (roomCode, displayName) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.post<{ token: string; player: Player; room: Room }>('/auth/join-room', { roomCode, displayName }, { useAccountToken: true })
      localStorage.setItem(GAME_TOKEN_KEY, data.token)
      set({ gameToken: data.token, player: data.player, room: data.room, isInGame: true, isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : '加入失败' })
      throw err
    }
  },

  createRoom: async (name, displayName) => {
    set({ isLoading: true, error: null })
    try {
      const account = get().account
      const data = await api.post<{ token: string; gmPlayer: Player; room: Room }>('/rooms', {
        name,
        accountName: account?.username || 'unknown',
        displayName: displayName || account?.displayName,
      }, { useAccountToken: true })
      localStorage.setItem(GAME_TOKEN_KEY, data.token)
      set({ gameToken: data.token, player: data.gmPlayer, room: data.room, isInGame: true, isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : '创建失败' })
      throw err
    }
  },

  checkSession: async () => {
    const accountToken = localStorage.getItem(ACCOUNT_TOKEN_KEY)
    if (!accountToken) {
      set({ isLoading: false })
      return
    }

    set({ isLoading: true })
    try {
      const data = await api.get<Account>('/auth/me')
      set({ account: data, isLoggedIn: true, accountToken, isLoading: false })
    } catch {
      localStorage.removeItem(ACCOUNT_TOKEN_KEY)
      set({ accountToken: null, isLoggedIn: false, isLoading: false })
    }
  },

  enterRoom: (gameToken, player, room) => {
    localStorage.setItem(GAME_TOKEN_KEY, gameToken)
    set({ gameToken, player, room, isInGame: true })
  },

  leaveRoom: () => {
    localStorage.removeItem(GAME_TOKEN_KEY)
    set({ gameToken: null, player: null, room: null, isInGame: false })
  },

  logout: () => {
    localStorage.removeItem(ACCOUNT_TOKEN_KEY)
    localStorage.removeItem(GAME_TOKEN_KEY)
    set({
      accountToken: null, gameToken: null,
      account: null, player: null, room: null,
      isLoggedIn: false, isInGame: false, error: null,
    })
  },

  clearError: () => set({ error: null }),
}))
