// Types
export type { Player, PlayerStatus, PlayerPublicInfo, PlayerSelfView, PlayerGmView } from './types/player.js'
export type { Card, CardLocation, CardType, CardMetadata, CardOperation, CardOperationResult, SkillEffectRef } from './types/card.js'
export type { Room, RoomStatus, GamePhase, RoomConfig } from './types/room.js'
export { DEFAULT_ROOM_CONFIG } from './types/room.js'
export type { Region, Adjacency, AdjacencyType, MapState, PlayerPosition, OutpostMarker } from './types/map.js'
export type { GameState, PhaseTransition } from './types/game.js'
export { PHASE_ORDER as GAME_PHASE_ORDER, PHASE_LABELS as GAME_PHASE_LABELS } from './types/game.js'
export type { ActionSubmission, ActionType, ActionStatus, ActionPayload, MovePayload, ScoutPayload, PlaceOutpostPayload, DestroyOutpostPayload, ConsumePayload, ActionResult } from './types/action.js'
export type { SkillTemplate, PlayerSkill, SkillType, SkillTriggerTiming, SkillMetadata, SkillEffectDef, SkillUseResult, SkillEffectResult, SkillClass, SkillRarity, SkillLibraryEntry } from './types/skill.js'
export { SKILL_TYPE_LABELS, SKILL_CLASS_LABELS, SKILL_RARITY_LABELS, SKILL_SLOTS } from './types/skill.js'
export type { ChatMessage } from './types/chat.js'
export type { OperationLog, LogCategory } from './types/log.js'
export { C2S, S2C } from './types/events.js'

// Strike card types
export type { StrikeColor, StrikeCardTemplate, PlayerStrikeSelection } from './types/strike-card.js'
export { STRIKE_COLOR_LABELS, STRIKE_COUNTER, STRIKE_CARD_TOTAL } from './types/strike-card.js'

// Deck build types
export type { DeckBuild, DeckBuildValidation } from './types/deck-build.js'

// Combat types
export type { CombatState, CombatTurnPhase, PlayChainEntry, CombatAction, CombatResult, CombatEffectResult, CombatEvent } from './types/combat.js'

// Draft types (placeholder)
export type { DraftPool, DraftState, DraftPick, DraftConfig } from './types/draft.js'

// Schemas
export { registerSchema, accountLoginSchema, joinRoomSchema, loginSchema, updatePlayerStatsSchema, bindPlayersSchema } from './schemas/player.schema.js'
export type { RegisterInput, AccountLoginInput, JoinRoomInput, LoginInput, UpdatePlayerStatsInput } from './schemas/player.schema.js'
export { cardDrawSchema, cardDiscardSchema, cardDrawSpecificSchema, cardRetrieveDiscardSchema, cardInsertSchema, cardTransferSchema, cardGmViewSchema, cardGmRemoveSchema } from './schemas/card.schema.js'
export { createRoomSchema, roomConfigSchema } from './schemas/room.schema.js'
export type { CreateRoomInput, RoomConfigInput } from './schemas/room.schema.js'
export { addRegionSchema, updateRegionSchema, setAdjacencySchema, removeAdjacencySchema, movePlayerSchema } from './schemas/map.schema.js'
export type { AddRegionInput, UpdateRegionInput, SetAdjacencyInput } from './schemas/map.schema.js'
export { submitActionSchema, approveActionSchema, rejectActionSchema } from './schemas/action.schema.js'
export type { SubmitActionInput } from './schemas/action.schema.js'
export { skillTemplateSchema, assignSkillSchema, useSkillSchema, modifySkillSchema } from './schemas/skill.schema.js'
export type { SkillTemplateInput, AssignSkillInput, UseSkillInput } from './schemas/skill.schema.js'
export { sendMessageSchema } from './schemas/chat.schema.js'
export type { SendMessageInput } from './schemas/chat.schema.js'
export { submitDeckBuildSchema, lockDeckBuildSchema } from './schemas/deck-build.schema.js'
export type { SubmitDeckBuildInput } from './schemas/deck-build.schema.js'
export { combatPlayStrikeSchema, combatUseSkillSchema, combatRespondSchema, combatPassSchema, combatGmStartSchema } from './schemas/combat.schema.js'
export { shareDeckBuildSchema, getSharedBuildSchema } from './schemas/share.schema.js'

// Constants
export { PHASE_ORDER, PHASE_LABELS, getNextPhase, isValidPhaseTransition } from './constants/phases.js'
export { ACTION_TYPES, ACTION_AP_COST, ACTION_LABELS, ACTION_RESOLUTION_ORDER } from './constants/actions.js'
export { DEFAULTS, PLAYER_COLORS } from './constants/defaults.js'
export { STRIKE_CARD_TEMPLATES, STRIKE_TEMPLATE_MAP } from './constants/strike-cards.js'
export { SKILL_LIBRARY, SKILL_LIBRARY_MAP, A_CLASS_SKILLS, B_CLASS_SKILLS } from './constants/skill-library.js'
export { RESPONSE_MAP, COMBAT_TURN_PHASES, COMBAT_TIMING_WINDOW_MS, MAX_CHAIN_DEPTH } from './constants/combat.js'
