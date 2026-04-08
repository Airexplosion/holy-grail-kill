export interface ChatMessage {
  readonly id: string
  readonly roomId: string
  readonly playerId: string
  readonly senderName: string
  readonly regionId: string
  readonly content: string
  readonly createdAt: number
}
