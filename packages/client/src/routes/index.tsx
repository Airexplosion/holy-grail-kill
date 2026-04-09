import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { LoginPage } from './LoginPage'
import { LobbyPage } from './LobbyPage'
import { PlayerPage } from './PlayerPage'
import { GMPage } from './GMPage'
import { AdminPage } from './AdminPage'
import { CharacterCreatePage } from './CharacterCreatePage'
import { DraftPage } from './DraftPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const account = useAuthStore((s) => s.account)
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!account?.isAdmin) return <Navigate to="/lobby" replace />
  return <>{children}</>
}

function RequireGame({ children, requireGm = false }: { children: React.ReactNode; requireGm?: boolean }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isInGame = useAuthStore((s) => s.isInGame)
  const player = useAuthStore((s) => s.player)

  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!isInGame) return <Navigate to="/lobby" replace />
  if (requireGm && !player?.isGm) return <Navigate to="/game" replace />

  return <>{children}</>
}

export function AppRouter() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isInGame = useAuthStore((s) => s.isInGame)
  const player = useAuthStore((s) => s.player)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn
              ? <Navigate to={isInGame ? (player?.isGm ? '/gm' : '/game') : '/lobby'} replace />
              : <LoginPage />
          }
        />
        <Route
          path="/lobby"
          element={
            isInGame
              ? <Navigate to={player?.isGm ? '/gm' : '/game'} replace />
              : <RequireAuth><LobbyPage /></RequireAuth>
          }
        />
        <Route
          path="/game"
          element={<RequireGame><PlayerPage /></RequireGame>}
        />
        <Route
          path="/gm"
          element={<RequireGame requireGm><GMPage /></RequireGame>}
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin><AdminPage /></RequireAdmin>
          }
        />
        <Route
          path="/character-create"
          element={<RequireGame><CharacterCreatePage /></RequireGame>}
        />
        <Route
          path="/draft"
          element={<RequireGame><DraftPage /></RequireGame>}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
