import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/cn'

export function LoginForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  const { loginAccount, register, isLoading, error, clearError } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (mode === 'login') {
      await loginAccount(username, password)
    } else {
      await register(username, password, displayName || undefined)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-800 p-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-400 mb-2">圣杯杀</h1>
          <p className="text-dark-200 text-sm">桌游管理系统</p>
        </div>

        <div className="flex mb-6 bg-dark-700 rounded-lg p-1">
          <button
            className={cn(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
              mode === 'login' ? 'bg-primary-600 text-white' : 'text-dark-200 hover:text-dark-50',
            )}
            onClick={() => { setMode('login'); clearError() }}
          >
            登录
          </button>
          <button
            className={cn(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
              mode === 'register' ? 'bg-primary-600 text-white' : 'text-dark-200 hover:text-dark-50',
            )}
            onClick={() => { setMode('register'); clearError() }}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">用户名</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              required
              minLength={2}
              maxLength={20}
            />
          </div>

          <div>
            <label className="label">密码</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              required
              minLength={4}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="label">显示名称（可选）</label>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="游戏内显示的名字，不填则使用用户名"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={isLoading}>
            {isLoading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  )
}
