// ── Types ──

export type { Player, PlayerStatus, PlayerPublicInfo, PlayerSelfView, PlayerGmView } from './types/player.js'
export type { Card, CardLocation, CardType, CardMetadata, CardOperation, CardOperationResult, SkillEffectRef } from './types/card.js'
export type { Room, RoomStatus, GamePhase, GameStage, RoomConfig } from './types/room.js'
export { DEFAULT_ROOM_CONFIG, GAME_STAGE_LABELS } from './types/room.js'
export type { Region, Adjacency, AdjacencyType, MapState, PlayerPosition, OutpostMarker } from './types/map.js'
export type { GameState, PhaseTransition } from './types/game.js'
export { PHASE_ORDER as GAME_PHASE_ORDER, PHASE_LABELS as GAME_PHASE_LABELS } from './types/game.js'

// Action types
export type {
  ActionSubmission, ActionType, ActionStatus, ActionPayload,
  MovePayload, ScoutPayload, PlaceOutpostPayload, DestroyOutpostPayload,
  DeclareWarPayload, UseAbilityPayload, AbsorbSpiritPayload,
  ObtainKeyPayload, ChannelMagicPayload, SkipPayload,
  ActionResult,
} from './types/action.js'

// Skill types
export type {
  SkillTemplate, PlayerSkill, SkillType, SkillTriggerTiming,
  SkillMetadata, SkillEffectDef, SkillUseResult, SkillEffectResult,
  SkillClass, SkillRarity, SkillLibraryEntry,
} from './types/skill.js'
export { SKILL_TYPE_LABELS, SKILL_CLASS_LABELS, SKILL_RARITY_LABELS, SKILL_SLOTS } from './types/skill.js'

export type { LocationPrize } from './types/location-prize.js'
export type { ChatMessage } from './types/chat.js'
export type { OperationLog, LogCategory } from './types/log.js'
export { C2S, S2C } from './types/events.js'

// ── New: Group system ──

export type { CharacterRole, GroupStatus, Group, GroupPublicInfo, GroupSelfView } from './types/group.js'
export { INITIAL_SECRET_KEYS, CHARACTER_ROLE_LABELS, GROUP_STATUS_LABELS } from './types/group.js'

// ── New: Attribute system ──

export type { AttributeRank, ServantAttributes, MasterAttributes } from './types/attributes.js'
export {
  RANK_ORDER, RANK_UPGRADE_COST, RANK_TOTAL_COST, RANK_REQUIRES_UNLOCK,
  SERVANT_ATTRIBUTE_POINTS,
  SERVANT_STR_TABLE, SERVANT_END_TABLE, SERVANT_AGI_TABLE, SERVANT_MAG_TABLE, SERVANT_LUK_TABLE,
  MASTER_STR_TABLE, MASTER_END_TABLE, MASTER_MAG_TABLE, MASTER_ACTION_POWER_TABLE,
  RANK_LABELS, SERVANT_ATTR_LABELS, MASTER_ATTR_LABELS,
} from './types/attributes.js'

// ── New: Damage system ──

export type { DamageType, DamageTypeRules } from './types/damage.js'
export { DAMAGE_TYPE_RULES, DAMAGE_TYPE_LABELS, DAMAGE_TYPE_PRIORITY, AC_MINIMUM_DAMAGE } from './types/damage.js'

// ── New: Victory / Key / Spirit / War ──

export type {
  AkashaKeyState, VictoryEvent,
  SecretKeyUseType, SecretKeyUsage,
  SpiritType, SpiritRemnant,
  KillRewardOption,
  WarDeclarationStatus, WarResponse, WarDeclaration,
} from './types/victory.js'
export {
  KEY_SPAWN_ELIMINATIONS, getChannelCost,
  SECRET_KEY_USE_LABELS, KILL_REWARD_LABELS,
  FORCED_WAR_COEXIST_THRESHOLD,
} from './types/victory.js'

// ── Strike card types (extended) ──

export type { BaseStrikeColor, SpecialColor, CardColor, StrikeColor, StrikeCardTemplate, PlayerStrikeSelection } from './types/strike-card.js'
export {
  BASE_COLOR_LABELS, STRIKE_COLOR_LABELS, CARD_COLOR_LABELS,
  STRIKE_COUNTER, SPECIAL_COLOR_RULES,
  STRIKE_CARD_TOTAL, STRIKE_COLOR_MINIMUM,
} from './types/strike-card.js'

// Deck build types
export type { DeckBuild, DeckBuildValidation } from './types/deck-build.js'

// Combat types
export type { CombatState, CombatTurnPhase, PlayChainEntry, CombatAction, CombatResult, CombatEffectResult, CombatEvent } from './types/combat.js'

// ── Draft types (reworked) ──

export type {
  SkillSubmission, DraftSkillDef, DraftSkillType,
  DraftPack, DraftPhase, DraftState, DraftPick, DraftConfig,
} from './types/draft.js'
export { DEFAULT_DRAFT_CONFIG, DRAFT_PHASE_LABELS } from './types/draft.js'

// ── Schemas ──

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
export {
  allocateServantAttributesSchema, allocateMasterAttributesSchema,
  selectClassSchema, selectArchetypeSchema, selectTacticalStyleSchema,
} from './schemas/character.schema.js'
export type {
  AllocateServantAttributesInput, AllocateMasterAttributesInput,
  SelectClassInput, SelectArchetypeInput, SelectTacticalStyleInput,
} from './schemas/character.schema.js'

// ── Constants ──

export { PHASE_ORDER, PHASE_LABELS, getNextPhase, isValidPhaseTransition } from './constants/phases.js'
export { ACTION_TYPES, ACTION_AP_COST, ACTION_LABELS, ACTION_RESOLUTION_ORDER } from './constants/actions.js'
export { DEFAULTS, PLAYER_COLORS } from './constants/defaults.js'
export { STRIKE_CARD_TEMPLATES, STRIKE_TEMPLATE_MAP } from './constants/strike-cards.js'
export { SKILL_LIBRARY, SKILL_LIBRARY_MAP, A_CLASS_SKILLS, B_CLASS_SKILLS } from './constants/skill-library.js'
export { RESPONSE_MAP, COMBAT_TURN_PHASES, COMBAT_TIMING_WINDOW_MS, MAX_CHAIN_DEPTH } from './constants/combat.js'

// ── New constants ──

export type { ServantClassId, ServantClassMeta, ClassAbilityDef, ClassAbilityType, ClassAbilityTiming, ClassAbilityEffectDef } from './constants/classes.js'
export { SERVANT_CLASSES, SERVANT_CLASS_MAP, CLASS_NAME_LABELS, STANDARD_SEVEN_CLASS_IDS } from './constants/classes.js'
export { getClassAbilities, getClassAbility, getRegisteredClassIds } from './constants/class-abilities/index.js'

export type { MasterArchetypeId, SkillSlotType, MasterArchetypeDef, SlotModifier } from './constants/archetypes.js'
export { MASTER_ARCHETYPES, MASTER_ARCHETYPE_MAP, ARCHETYPE_NAME_LABELS, BASE_SKILL_SLOTS } from './constants/archetypes.js'
