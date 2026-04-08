import { useRef, useEffect } from 'react'
import { useCombatStore } from '@/stores/combat.store'
import { cn } from '@/lib/cn'

const TYPE_COLORS: Record<string, string> = {
  damage: 'text-red-400',
  heal: 'text-green-400',
  shield: 'text-blue-300',
  skill_use: 'text-purple-400',
  skill_trigger: 'text-purple-300',
  play_strike: 'text-amber-400',
  respond_strike: 'text-blue-400',
  chain_blocked: 'text-blue-300',
  chain_resolved: 'text-red-300',
  combat_start: 'text-amber-300',
  combat_end: 'text-amber-300',
  round_end: 'text-dark-300',
  turn_start: 'text-dark-300',
  result: 'text-dark-200',
}

export function CombatLog() {
  const log = useCombatStore((s) => s.combatLog)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length])

  return (
    <div className="space-y-1">
      <h4 className="text-[10px] text-dark-400 uppercase tracking-wider">战斗日志</h4>
      <div className="max-h-32 overflow-y-auto space-y-0.5">
        {log.length === 0 ? (
          <p className="text-dark-500 text-[10px]">等待战斗开始...</p>
        ) : (
          log.map((entry, i) => (
            <div key={i} className={cn('text-[10px]', TYPE_COLORS[entry.type] || 'text-dark-300')}>
              {entry.description}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
