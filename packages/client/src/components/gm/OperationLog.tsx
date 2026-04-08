import { useEffect } from 'react'
import { useGmStore } from '@/stores/gm.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'

export function OperationLog() {
  const logs = useGmStore((s) => s.logs)

  useEffect(() => {
    getSocket().emit(C2S.LOG_QUERY, { limit: 100 })
  }, [])

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {logs.length === 0 ? (
        <p className="text-dark-400 text-xs text-center py-4">暂无日志</p>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="bg-dark-700 rounded px-2 py-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-dark-400 text-[10px]">
                {new Date(log.createdAt).toLocaleTimeString('zh-CN')}
              </span>
              <span className="badge bg-dark-500 text-dark-200 text-[10px]">
                {log.actionType}
              </span>
              <span className="text-dark-100">{log.description}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
