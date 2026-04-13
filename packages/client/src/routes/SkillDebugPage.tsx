import { useNavigate } from 'react-router-dom'
import { SkillDebugPanel } from '@/components/admin/SkillDebugPanel'

export function SkillDebugPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      <header className="bg-dark-700 border-b border-dark-400 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary-400">技能测试场</h1>
          <p className="text-sm text-dark-300 mt-1">任何已登录玩家都可以在这里自由挑技能打木头人。</p>
        </div>
        <button onClick={() => navigate('/lobby')} className="btn-sm text-xs bg-dark-600 text-dark-200 hover:bg-dark-500">
          返回大厅
        </button>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <SkillDebugPanel
            skillsPath="/skill-debug/skills"
            runPath="/skill-debug/run"
            title="公共技能测试"
            description="所有玩家都可以自行选择技能、设置自己的基准伤害和木头人属性，立即查看效果结果与事件日志。"
          />
        </div>
      </main>
    </div>
  )
}
