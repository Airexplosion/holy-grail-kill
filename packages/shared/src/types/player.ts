export interface Player {
  readonly id: string
  readonly roomId: string
  readonly accountName: string
  readonly displayName: string
  readonly isGm: boolean
  readonly hp: number
  readonly hpMax: number
  readonly mp: number
  readonly mpMax: number
  readonly actionPoints: number
  readonly actionPointsMax: number
  readonly regionId: string | null
  readonly boundToPlayerId: string | null
  readonly status: PlayerStatus
  readonly cardMenuUnlocked: boolean
  readonly color: string
  readonly createdAt: number
  readonly updatedAt: number
}

export type PlayerStatus = 'connected' | 'disconnected' | 'spectating'

export interface PlayerPublicInfo {
  readonly id: string
  readonly displayName: string
  readonly color: string
  readonly status: PlayerStatus
}

export interface PlayerSelfView {
  readonly id: string
  readonly displayName: string
  readonly hp: number
  readonly hpMax: number
  readonly mp: number
  readonly mpMax: number
  readonly actionPoints: number
  readonly actionPointsMax: number
  readonly regionId: string | null
  readonly boundToPlayerId: string | null
  readonly cardMenuUnlocked: boolean
  readonly color: string
}

export interface PlayerGmView extends Player {
  readonly handCount: number
  readonly deckCount: number
  readonly discardCount: number
}
