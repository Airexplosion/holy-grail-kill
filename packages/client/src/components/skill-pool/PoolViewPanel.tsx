/**
 * 地图池查看面板
 *
 * 全员可见的快照展示，可折叠
 * 放在玩家页面侧边栏或通过按钮展开
 */

import { useEffect, useState } from 'react'
import { useSkillPoolStore } from '@/stores/skill-pool.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import { cn } from '@/lib/cn'

export function PoolViewPanel() {
  const snapshot = useSkillPoolStore((s) => s.snapshot)
  const replacementsRemaining = useSkillPoolStore((s) => s.replacementsRemaining)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getSocket().emit(C2S.POOL_GET_SNAPSHOT)
  }, [])

  if (snapshot.length === 0) return null

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-medium text-dark-200"
      >
        <span>
          地图池
          <span className="text-primary-400 ml-1">({snapshot.length})</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-dark-400">
            替换剩余: <span className={cn(
              'font-bold',
              replacementsRemaining > 0 ? 'text-primary-400' : 'text-red-400',
            )}>{replacementsRemaining}</span>
          </span>
          <span className="text-dark-400 text-xs">{expanded ? '收起' : '展开'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
          {snapshot.map((skill, i) => (
            <div key={`${skill.skillId}-${i}`} className="bg-dark-700 rounded px-2 py-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-dark-100 font-medium">{skill.name}</span>
                <span className="text-[10px] text-dark-400">{skill.skillClass}级 | {skill.sourceName}</span>
              </div>
              <p className="text-[10px] text-dark-300 mt-0.5 line-clamp-1">{skill.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
