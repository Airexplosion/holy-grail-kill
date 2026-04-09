import type { GamePhase } from 'shared'
import { PHASE_ORDER } from 'shared'

// ── 纯函数工具（保留旧 API 兼容） ──

export function getNextPhase(current: GamePhase): GamePhase | null {
  const idx = PHASE_ORDER.indexOf(current)
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return null
  return PHASE_ORDER[idx + 1]!
}

export function isLastPhase(phase: GamePhase): boolean {
  return phase === 'round_end'
}

export function isActionPhase(phase: GamePhase): boolean {
  return phase === 'action'
}

export function validatePhaseTransition(from: GamePhase, to: GamePhase): boolean {
  const fromIdx = PHASE_ORDER.indexOf(from)
  const toIdx = PHASE_ORDER.indexOf(to)
  return toIdx === fromIdx + 1
}

// ── 自驱动阶段推进引擎 ──

export type PhaseAdvanceCallback = (roomId: string, phase: GamePhase, turnNumber: number) => void

interface RoomPhaseState {
  timeoutHandle: ReturnType<typeof setTimeout> | null
  readyGroupIds: Set<string>
}

/** 每个房间的阶段推进状态 */
const roomStates = new Map<string, RoomPhaseState>()

function getOrCreateRoomState(roomId: string): RoomPhaseState {
  let state = roomStates.get(roomId)
  if (!state) {
    state = { timeoutHandle: null, readyGroupIds: new Set() }
    roomStates.set(roomId, state)
  }
  return state
}

/**
 * 标记一个组已就绪
 * 返回是否触发了自动推进（所有存活组都 ready）
 */
export function markGroupReady(
  roomId: string,
  groupId: string,
  aliveGroupIds: readonly string[],
): boolean {
  const state = getOrCreateRoomState(roomId)
  state.readyGroupIds.add(groupId)
  return checkAllReady(state, aliveGroupIds)
}

/**
 * 取消一个组的就绪标记
 */
export function unmarkGroupReady(roomId: string, groupId: string): void {
  const state = getOrCreateRoomState(roomId)
  state.readyGroupIds.delete(groupId)
}

/**
 * 获取当前就绪的组ID列表
 */
export function getReadyGroupIds(roomId: string): string[] {
  const state = roomStates.get(roomId)
  return state ? [...state.readyGroupIds] : []
}

/**
 * 重置所有组的就绪状态（阶段转换后调用）
 */
export function resetReadiness(roomId: string): void {
  const state = roomStates.get(roomId)
  if (state) {
    state.readyGroupIds.clear()
  }
}

/**
 * 设置超时自动推进
 * 如果在 timeoutMs 内没有所有组 ready，则强制推进
 */
export function setPhaseTimeout(
  roomId: string,
  timeoutMs: number,
  onTimeout: () => void,
): void {
  const state = getOrCreateRoomState(roomId)
  clearPhaseTimeout(roomId)

  if (timeoutMs > 0) {
    state.timeoutHandle = setTimeout(() => {
      state.timeoutHandle = null
      onTimeout()
    }, timeoutMs)
  }
}

/**
 * 清除超时计时器
 */
export function clearPhaseTimeout(roomId: string): void {
  const state = roomStates.get(roomId)
  if (state?.timeoutHandle) {
    clearTimeout(state.timeoutHandle)
    state.timeoutHandle = null
  }
}

/**
 * 清理房间的所有阶段状态（房间结束时调用）
 */
export function cleanupRoom(roomId: string): void {
  clearPhaseTimeout(roomId)
  roomStates.delete(roomId)
}

// ── 内部 ──

function checkAllReady(state: RoomPhaseState, aliveGroupIds: readonly string[]): boolean {
  if (aliveGroupIds.length === 0) return false
  return aliveGroupIds.every(id => state.readyGroupIds.has(id))
}
