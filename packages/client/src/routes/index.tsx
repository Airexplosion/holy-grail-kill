import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useGameStore } from '@/stores/game.store'
import { LoginPage } from './LoginPage'
import { LobbyPage } from './LobbyPage'
import { PlayerPage } from './PlayerPage'
import { GMPage } from './GMPage'
import { AdminPage } from './AdminPage'
import { CharacterCreatePage } from './CharacterCreatePage'
import { DraftPage } from './DraftPage'
import { GroupFormationPage } from './GroupFormationPage'
import { DeckBuildPage } from './DeckBuildPage'
import { SkillCatalogPage } from './SkillCatalogPage'
import { SkillSubmitPage } from './SkillSubmitPage'
import { SoloPage } from './SoloPage'
import { DraftSimPage } from './DraftSimPage'
import type { GameStage } from 'shared'

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

/** 根据 GameStage 决定游戏内默认路由 */
function getGameRoute(gameStage: GameStage, isGm: boolean): string {
  if (isGm) return '/gm'
  switch (gameStage) {
    case 'lobby': return '/group-formation'
    case 'character_create': return '/character-create'
    case 'draft': return '/draft'
    case 'deck_build': return '/deck-build'
    case 'playing': return '/game'
    default: return '/game'
  }
}

export function AppRouter() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isInGame = useAuthStore((s) => s.isInGame)
  const player = useAuthStore((s) => s.player)
  const gameStage = useGameStore((s) => s.gameStage)

  const gameRoute = isInGame ? getGameRoute(gameStage, !!player?.isGm) : '/lobby'

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn
              ? <Navigate to={isInGame ? gameRoute : '/lobby'} replace />
              : <LoginPage />
          }
        />
        <Route
          path="/lobby"
          element={
            isInGame
              ? <Navigate to={gameRoute} replace />
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
          element={<RequireAdmin><AdminPage /></RequireAdmin>}
        />
        <Route
          path="/group-formation"
          element={<RequireGame><GroupFormationPage /></RequireGame>}
        />
        <Route
          path="/character-create"
          element={<RequireGame><CharacterCreatePage /></RequireGame>}
        />
        <Route
          path="/deck-build"
          element={<RequireGame><DeckBuildPage /></RequireGame>}
        />
        <Route
          path="/draft"
          element={<RequireGame><DraftPage /></RequireGame>}
        />
        <Route
          path="/skill-catalog"
          element={<RequireAuth><SkillCatalogPage /></RequireAuth>}
        />
        <Route
          path="/skill-submit"
          element={<RequireGame><SkillSubmitPage /></RequireGame>}
        />
        <Route
          path="/solo"
          element={<RequireAuth><SoloPage /></RequireAuth>}
        />
        <Route
          path="/draft-sim"
          element={<RequireAuth><DraftSimPage /></RequireAuth>}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
