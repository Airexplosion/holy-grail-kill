import { fisherYatesShuffle } from '../utils/shuffle.js'

export interface DeckCard {
  readonly id: string
  readonly position: number
  readonly [key: string]: unknown
}

export function shuffleDeck<T extends DeckCard>(cards: readonly T[]): T[] {
  const shuffled = fisherYatesShuffle(cards)
  return shuffled.map((card, index) => ({ ...card, position: index }))
}

export function drawFromTop<T extends DeckCard>(
  deck: readonly T[],
  count: number,
): { drawn: T[]; remaining: T[] } {
  const sorted = [...deck].sort((a, b) => a.position - b.position)
  const drawn = sorted.slice(0, count)
  const remaining = sorted.slice(count)
  return { drawn, remaining }
}

export function drawSpecific<T extends DeckCard>(
  deck: readonly T[],
  cardId: string,
): { drawn: T | null; remaining: T[] } {
  const idx = deck.findIndex(c => c.id === cardId)
  if (idx === -1) return { drawn: null, remaining: [...deck] }

  const drawn = deck[idx]!
  const remaining = [...deck.slice(0, idx), ...deck.slice(idx + 1)]
  return { drawn, remaining }
}

export function insertAtPosition<T extends DeckCard>(
  deck: readonly T[],
  card: T,
  position: number,
): T[] {
  const sorted = [...deck].sort((a, b) => a.position - b.position)
  const result: T[] = []

  const insertPos = Math.min(position, sorted.length)
  for (let i = 0; i < sorted.length; i++) {
    if (i === insertPos) {
      result.push({ ...card, position: i })
    }
    result.push({ ...sorted[i]!, position: i < insertPos ? i : i + 1 })
  }

  if (insertPos >= sorted.length) {
    result.push({ ...card, position: sorted.length })
  }

  return result
}

export function reindex<T extends DeckCard>(cards: readonly T[]): T[] {
  const sorted = [...cards].sort((a, b) => a.position - b.position)
  return sorted.map((card, index) => ({ ...card, position: index }))
}
