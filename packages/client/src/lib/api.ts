const BASE_URL = '/api'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

function getAuthToken(): string | null {
  return localStorage.getItem('game_token') || localStorage.getItem('account_token')
}

function getAccountToken(): string | null {
  return localStorage.getItem('account_token')
}

async function request<T>(path: string, options?: RequestInit & { useAccountToken?: boolean }): Promise<T> {
  const token = options?.useAccountToken ? getAccountToken() : getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  })

  const json: ApiResponse<T> = await res.json()

  if (!json.success) {
    throw new Error(json.error || '请求失败')
  }

  return json.data as T
}

export const api = {
  get: <T>(path: string, opts?: { useAccountToken?: boolean }) =>
    request<T>(path, opts),
  post: <T>(path: string, body: unknown, opts?: { useAccountToken?: boolean }) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...opts,
    }),
  patch: <T>(path: string, body: unknown, opts?: { useAccountToken?: boolean }) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...opts,
    }),
  delete: <T>(path: string, opts?: { useAccountToken?: boolean }) =>
    request<T>(path, {
      method: 'DELETE',
      ...opts,
    }),
}
