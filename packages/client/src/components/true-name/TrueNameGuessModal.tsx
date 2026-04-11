/**
 * 真名猜测弹窗 — 3选1
 *
 * 展示时机：玩家点击某个遭遇过的对手 → 弹出此组件
 * 选中后自动发送猜测请求，显示结果后关闭
 */

import { useState } from 'react'
import { useTrueNameStore } from '@/stores/true-name.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import { cn } from '@/lib/cn'
import { SERVANT_ATTR_LABELS } from 'shared'

export function TrueNameGuessModal() {
  const target = useTrueNameStore((s) => s.guessingTarget)
  const lastResult = useTrueNameStore((s) => s.lastResult)
  const setGuessingTarget = useTrueNameStore((s) => s.setGuessingTarget)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (!target) return null

  // 已猜中过
  if (target.alreadyGuessed) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setGuessingTarget(null)}>
        <div className="card w-80 text-center" onClick={(e) => e.stopPropagation()}>
          <p className="text-dark-200 text-sm mb-3">已看破 <span className="text-primary-400">{target.targetDisplayName}</span> 的真名</p>
          <button onClick={() => setGuessingTarget(null)} className="btn-sm btn-secondary text-xs">关闭</button>
        </div>
      </div>
    )
  }

  const handleGuess = () => {
    if (!selected || submitted) return
    setSubmitted(true)
    getSocket().emit(C2S.TRUE_NAME_GUESS, {
      targetPlayerId: target.targetPlayerId,
      guessedName: selected,
    })
  }

  // 显示猜测结果
  if (submitted && lastResult) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setGuessingTarget(null); setSubmitted(false); setSelected(null) }}>
        <div className="card w-96" onClick={(e) => e.stopPropagation()}>
          {lastResult.correct ? (
            <div className="text-center">
              <div className="text-green-400 text-lg font-bold mb-3">看破真名!</div>
              <p className="text-dark-100 text-sm mb-4">
                <span className="text-primary-400">{target.targetDisplayName}</span> 的真名是
                <span className="text-amber-400 font-bold ml-1">{lastResult.guessedName}</span>
              </p>
              {lastResult.attributes && (
                <div className="bg-dark-700 rounded-lg p-3 mb-4">
                  <p className="text-xs text-dark-300 mb-2">五维属性</p>
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.entries(lastResult.attributes) as [string, string][]).map(([key, rank]) => (
                      <div key={key} className="text-center">
                        <div className="text-[10px] text-dark-400">{(SERVANT_ATTR_LABELS as any)[key] || key}</div>
                        <div className={cn(
                          'text-sm font-bold',
                          rank.startsWith('A') ? 'text-amber-400' :
                          rank === 'B' ? 'text-purple-400' :
                          rank === 'C' ? 'text-blue-400' :
                          'text-dark-200',
                        )}>{rank}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => { setGuessingTarget(null); setSubmitted(false); setSelected(null) }} className="btn-sm btn-primary text-xs">
                确认
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-red-400 text-lg font-bold mb-3">猜测错误</div>
              <p className="text-dark-300 text-sm mb-4">这不是正确的真名...</p>
              <button onClick={() => { setGuessingTarget(null); setSubmitted(false); setSelected(null) }} className="btn-sm btn-secondary text-xs">
                关闭
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setGuessingTarget(null); setSelected(null) }}>
      <div className="card w-80" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-dark-50 text-center mb-1">猜测真名</h3>
        <p className="text-xs text-dark-300 text-center mb-4">
          <span className="text-primary-400">{target.targetDisplayName}</span> 的真名是?
        </p>

        <div className="space-y-2 mb-4">
          {target.candidates.map((name) => (
            <button
              key={name}
              onClick={() => setSelected(name)}
              className={cn(
                'w-full py-2.5 px-3 rounded-lg text-sm font-medium transition-all border',
                selected === name
                  ? 'bg-primary-600/20 border-primary-500 text-primary-300'
                  : 'bg-dark-700 border-dark-400 text-dark-100 hover:border-dark-300',
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setGuessingTarget(null); setSelected(null) }}
            className="btn-sm btn-secondary text-xs flex-1"
          >
            取消
          </button>
          <button
            onClick={handleGuess}
            disabled={!selected}
            className="btn-sm btn-primary text-xs flex-1"
          >
            确认猜测
          </button>
        </div>
      </div>
    </div>
  )
}
