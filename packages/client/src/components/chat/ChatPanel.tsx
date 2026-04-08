import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '@/stores/chat.store'
import { useMapStore } from '@/stores/map.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'

export function ChatPanel() {
  const messages = useChatStore((s) => s.messages)
  const currentRegionId = useMapStore((s) => s.currentRegionId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentRegionId) return
    getSocket().emit(C2S.CHAT_SEND, { content: input.trim() })
    setInput('')
  }

  if (!currentRegionId) {
    return (
      <div className="flex flex-col h-full">
        <h3 className="text-sm font-medium text-dark-200 mb-2">聊天</h3>
        <p className="text-dark-400 text-xs flex-1 flex items-center justify-center">
          进入区域后可与同区域玩家聊天
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-medium text-dark-200 mb-2">区域聊天</h3>

      <div className="flex-1 overflow-y-auto space-y-1 mb-2">
        {messages.length === 0 ? (
          <p className="text-dark-400 text-xs text-center py-2">暂无消息</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-xs">
              <span className="text-primary-400 font-medium">{msg.senderName}</span>
              <span className="text-dark-400 mx-1">
                {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <p className="text-dark-100">{msg.content}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-1">
        <input
          className="input text-xs flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="发送消息..."
          maxLength={500}
        />
        <button type="submit" className="btn-sm btn-primary text-xs" disabled={!input.trim()}>
          发送
        </button>
      </form>
    </div>
  )
}
