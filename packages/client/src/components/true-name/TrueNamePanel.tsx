/**
 * 真名面板 — 显示遭遇过的对手列表
 *
 * 集成到玩家页面侧边栏。
 * 遭遇过 + 未猜中 → 显示"?"按钮 → 点击弹出 TrueNameGuessModal
 * 已猜中 → 直接显示五维属性
 */

import { useEffect } from 'react'
import { useTrueNameStore } from '@/stores/true-name.store'
import { getSocket } from '@/lib/socket'
import { C2S, SERVANT_ATTR_LABELS } from 'shared'
import { cn } from '@/lib/cn'
import type { RevealedAttributes } from 'shared'

function RankBadge({ rank }: { rank: string }) {
  return (
    <span className={cn(
      'text-[10px] font-bold',
      rank.startsWith('A') ? 'text-amber-400' :
      rank === 'B' ? 'text-purple-400' :
      rank === 'C' ? 'text-blue-400' :
      rank === 'D' ? 'text-green-400' :
      'text-dark-300',
    )}>
      {rank}
    </span>
  )
}

function RevealedRow({ targetName, attrs }: { targetName: string; attrs: RevealedAttributes }) {
  const keys = ['str', 'end', 'agi', 'mag', 'luk'] as const
  return (
    <div className="bg-dark-700 rounded px-2 py-1.5">
      <div className="text-xs text-primary-400 font-medium mb-1">{targetName}</div>
      <div className="flex gap-2">
        {keys.map((k) => (
          <div key={k} className="text-center">
            <div className="text-[9px] text-dark-400">{(SERVANT_ATTR_LABELS as any)[k]}</div>
            <RankBadge rank={attrs[k]} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TrueNamePanel() {
  const candidates = useTrueNameStore((s) => s.candidates)
  const revealed = useTrueNameStore((s) => s.revealed)
  const setGuessingTarget = useTrueNameStore((s) => s.setGuessingTarget)

  // 页面加载和区域变化时自动刷新候选列表
  useEffect(() => {
    getSocket().emit(C2S.TRUE_NAME_GET_CANDIDATES)
  }, [])

  const unguessed = candidates.filter(c => !c.alreadyGuessed)
  const guessed = candidates.filter(c => c.alreadyGuessed)

  if (candidates.length === 0 && revealed.size === 0) {
    return null // 没遭遇过任何人，不显示面板
  }

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-dark-200 mb-2">
        真名看破
        {revealed.size > 0 && <span className="text-primary-400 ml-1">({revealed.size})</span>}
      </h3>

      <div className="space-y-1.5">
        {/* 已揭示的：显示五维 */}
        {[...revealed.entries()].map(([targetId, attrs]) => {
          const candidate = candidates.find(c => c.targetPlayerId === targetId)
          return (
            <RevealedRow
              key={targetId}
              targetName={candidate?.targetDisplayName || '未知'}
              attrs={attrs}
            />
          )
        })}

        {/* 未猜测的：显示猜测按钮 */}
        {unguessed.map((c) => (
          <div key={c.targetPlayerId} className="flex items-center justify-between bg-dark-700 rounded px-2 py-1.5">
            <span className="text-xs text-dark-100">{c.targetDisplayName}</span>
            <button
              onClick={() => {
                setGuessingTarget(c)
                // 刷新最新候选（防止选项过期）
                getSocket().emit(C2S.TRUE_NAME_GET_CANDIDATES)
              }}
              className="text-[10px] text-amber-400 hover:text-amber-300 font-medium"
            >
              猜测真名
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
