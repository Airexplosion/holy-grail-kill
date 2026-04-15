import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import { MyCharactersPage } from './MyCharactersPage'
import { SkillBrowserPage } from './SkillBrowserPage'
import { SkillDebugPage } from './SkillDebugPage'
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

/** Routes that are stage-specific (auto-redirect when stage changes) */
const STAGE_ROUTES: Record<string, GameStage> = {
  '/group-formation': 'lobby',
  '/character-create': 'character_create',
  '/draft': 'draft',
  '/deck-build': 'deck_build',
  '/game': 'playing',
}

/** Redirects player to the correct route when gameStage doesn't match current route */
function StageGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const gameStage = useGameStore((s) => s.gameStage)
  const player = useAuthStore((s) => s.player)

  // GM is not stage-guarded
  if (player?.isGm) return <>{children}</>

  const expectedStage = STAGE_ROUTES[location.pathname]
  // If current route is a stage-specific route and the stage doesn't match, redirect
  if (expectedStage && expectedStage !== gameStage) {
    const correctRoute = getGameRoute(gameStage, false)
    return <Navigate to={correctRoute} replace />
  }

  return <>{children}</>
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
          element={<RequireGame><StageGuard><PlayerPage /></StageGuard></RequireGame>}
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
          element={<RequireGame><StageGuard><GroupFormationPage /></StageGuard></RequireGame>}
        />
        <Route
          path="/character-create"
          element={<RequireGame><StageGuard><CharacterCreatePage /></StageGuard></RequireGame>}
        />
        <Route
          path="/deck-build"
          element={<RequireGame><StageGuard><DeckBuildPage /></StageGuard></RequireGame>}
        />
        <Route
          path="/draft"
          element={<RequireGame><StageGuard><DraftPage /></StageGuard></RequireGame>}
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
        <Route
          path="/my-characters"
          element={<RequireAuth><MyCharactersPage /></RequireAuth>}
        />
        <Route
          path="/skill-browser"
          element={<RequireAuth><SkillBrowserPage /></RequireAuth>}
        />
        <Route
          path="/skill-debug"
          element={<RequireAuth><SkillDebugPage /></RequireAuth>}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
