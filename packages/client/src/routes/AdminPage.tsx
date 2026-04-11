import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { SkillLibraryAdmin } from '@/components/admin/SkillLibraryAdmin'
import { StrikeCardAdmin } from '@/components/admin/StrikeCardAdmin'
import { CharacterReviewPanel } from '@/components/admin/CharacterReviewPanel'
import { PackGroupPanel } from '@/components/admin/PackGroupPanel'
import { cn } from '@/lib/cn'

type Tab = 'characters' | 'pack-groups' | 'skills' | 'strikes'

export function AdminPage() {
  const account = useAuthStore((s) => s.account)
  const logout = useAuthStore((s) => s.logout)
  const [activeTab, setActiveTab] = useState<Tab>('characters')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'characters', label: '角色审核' },
    { id: 'pack-groups', label: '技能包组' },
    { id: 'skills', label: '技能库' },
    { id: 'strikes', label: '击牌库' },
  ]

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      <header className="bg-dark-700 border-b border-dark-400 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-red-400">管理后台</h1>
          <span className="text-dark-300 text-sm">{account?.username}</span>
        </div>
        <div className="flex gap-2">
          <a href="/lobby" className="btn-sm text-xs bg-dark-600 text-dark-200 hover:bg-dark-500">返回大厅</a>
          <button onClick={logout} className="btn-sm btn-secondary text-xs">登出</button>
        </div>
      </header>

      <div className="flex-1 flex">
        <nav className="w-48 bg-dark-700 border-r border-dark-400 p-3 space-y-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('w-full text-left text-sm px-3 py-2 rounded transition-colors',
                activeTab === tab.id ? 'bg-dark-500 text-dark-50' : 'text-dark-300 hover:text-dark-100 hover:bg-dark-600')}>
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl">
            {activeTab === 'characters' && <CharacterReviewPanel />}
            {activeTab === 'pack-groups' && <PackGroupPanel />}
            {activeTab === 'skills' && <SkillLibraryAdmin />}
            {activeTab === 'strikes' && <StrikeCardAdmin />}
          </div>
        </main>
      </div>
    </div>
  )
}
