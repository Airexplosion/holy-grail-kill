import { create } from 'zustand'
import type { ChatMessage } from 'shared'

interface ChatState {
  readonly messages: readonly ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  setMessages: (msgs: readonly ChatMessage[]) => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],

  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg],
  })),
  setMessages: (messages) => set({ messages }),
  reset: () => set({ messages: [] }),
}))
