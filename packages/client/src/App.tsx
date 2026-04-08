import { useEffect, useState } from 'react'
import { AppRouter } from './routes'
import { useAuthStore } from './stores/auth.store'

export default function App() {
  const [ready, setReady] = useState(false)
  const checkSession = useAuthStore((s) => s.checkSession)

  useEffect(() => {
    checkSession().finally(() => setReady(true))
  }, [checkSession])

  if (!ready) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-dark-200">加载中...</p>
        </div>
      </div>
    )
  }

  return <AppRouter />
}
