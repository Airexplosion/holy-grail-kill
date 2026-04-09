import { create } from 'zustand'
import type { GamePhase, GameStage, VictoryEvent, WarDeclaration } from 'shared'

interface GameState {
  readonly phase: GamePhase
  readonly gameStage: GameStage
  readonly turnNumber: number
  readonly currentActionPointIndex: number
  readonly actionPoints: number
  readonly actionPointsMax: number
  readonly actionSubmitted: boolean
  /** 胜利事件 */
  readonly victory: VictoryEvent | null
  /** 当前宣战弹窗 */
  readonly warDeclaration: WarDeclaration | null
  /** 击杀奖励选择提示 */
  readonly killRewardPrompt: any | null
  /** 能力替换提示 */
  readonly abilityReplacePrompt: any | null

  setPhase: (phase: GamePhase) => void
  setGameStage: (stage: GameStage) => void
  setTurnNumber: (turn: number) => void
  setActionPointIndex: (index: number) => void
  setActionPoints: (ap: number, max: number) => void
  setActionSubmitted: (submitted: boolean) => void
  setVictory: (event: VictoryEvent | null) => void
  setWarDeclaration: (war: WarDeclaration | null) => void
  setKillRewardPrompt: (prompt: any | null) => void
  setAbilityReplacePrompt: (prompt: any | null) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'round_start',
  gameStage: 'lobby',
  turnNumber: 0,
  currentActionPointIndex: 0,
  actionPoints: 4,
  actionPointsMax: 4,
  actionSubmitted: false,
  victory: null,
  warDeclaration: null,
  killRewardPrompt: null,
  abilityReplacePrompt: null,

  setPhase: (phase) => set({ phase }),
  setGameStage: (gameStage) => set({ gameStage }),
  setTurnNumber: (turnNumber) => set({ turnNumber }),
  setActionPointIndex: (currentActionPointIndex) =>
    set({ currentActionPointIndex, actionSubmitted: false }),
  setActionPoints: (actionPoints, actionPointsMax) =>
    set({ actionPoints, actionPointsMax }),
  setActionSubmitted: (actionSubmitted) => set({ actionSubmitted }),
  setVictory: (victory) => set({ victory }),
  setWarDeclaration: (warDeclaration) => set({ warDeclaration }),
  setKillRewardPrompt: (killRewardPrompt) => set({ killRewardPrompt }),
  setAbilityReplacePrompt: (abilityReplacePrompt) => set({ abilityReplacePrompt }),
  reset: () => set({
    phase: 'round_start',
    gameStage: 'lobby',
    turnNumber: 0,
    currentActionPointIndex: 0,
    actionPoints: 4,
    actionPointsMax: 4,
    actionSubmitted: false,
    victory: null,
    warDeclaration: null,
    killRewardPrompt: null,
    abilityReplacePrompt: null,
  }),
}))
