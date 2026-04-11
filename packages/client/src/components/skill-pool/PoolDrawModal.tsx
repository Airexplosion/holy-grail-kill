/**
 * 战后技能抽取弹窗
 *
 * 展示抽到的2个技能，玩家可以：
 * - 选择1个替换自己的某个技能
 * - 或全部放弃
 *
 * 自动弹出（战斗结束后服务器推送 POOL_DRAW_RESULT 时触发）
 */

import { useState } from 'react'
import { useSkillPoolStore } from '@/stores/skill-pool.store'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'
import { cn } from '@/lib/cn'

// 简化：假设玩家当前技能列表从 props 传入
interface PoolDrawModalProps {
  /** 玩家当前装备的技能列表 */
  currentSkills: readonly { id: string; name: string; skillClass: string }[]
}

export function PoolDrawModal({ currentSkills }: PoolDrawModalProps) {
  const drawnSkills = useSkillPoolStore((s) => s.drawnSkills)
  const showDrawModal = useSkillPoolStore((s) => s.showDrawModal)
  const replacementsRemaining = useSkillPoolStore((s) => s.replacementsRemaining)
  const lastReplaceResult = useSkillPoolStore((s) => s.lastReplaceResult)
  const setShowDrawModal = useSkillPoolStore((s) => s.setShowDrawModal)

  const [selectedNew, setSelectedNew] = useState<string | null>(null)
  const [selectedOld, setSelectedOld] = useState<string | null>(null)
  const [step, setStep] = useState<'pick' | 'replace' | 'done'>('pick')

  if (!showDrawModal || drawnSkills.length === 0) return null

  // 替换成功后的反馈
  if (step === 'done' && lastReplaceResult) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="card w-96 text-center">
          {lastReplaceResult.success ? (
            <>
              <div className="text-green-400 text-lg font-bold mb-2">替换成功!</div>
              <p className="text-dark-300 text-sm mb-4">剩余替换次数: {lastReplaceResult.replacementsRemaining}</p>
            </>
          ) : (
            <>
              <div className="text-red-400 text-lg font-bold mb-2">替换失败</div>
              <p className="text-dark-300 text-sm mb-4">{lastReplaceResult.error}</p>
            </>
          )}
          <button onClick={() => { setShowDrawModal(false); setStep('pick'); setSelectedNew(null); setSelectedOld(null) }}
            className="btn-sm btn-primary text-xs">确认</button>
        </div>
      </div>
    )
  }

  // 第二步：选择要替换的旧技能
  if (step === 'replace' && selectedNew) {
    const newSkill = drawnSkills.find(s => s.id === selectedNew)

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="card w-[420px]">
          <h3 className="text-sm font-bold text-dark-50 text-center mb-1">选择要替换的技能</h3>
          <p className="text-xs text-dark-300 text-center mb-3">
            用 <span className="text-primary-400">{newSkill?.name}</span> 替换哪个？
          </p>

          <div className="space-y-1.5 mb-4 max-h-60 overflow-y-auto">
            {currentSkills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => setSelectedOld(skill.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border transition-all text-xs',
                  selectedOld === skill.id
                    ? 'bg-red-600/20 border-red-500 text-red-300'
                    : 'bg-dark-700 border-dark-400 text-dark-100 hover:border-dark-300',
                )}
              >
                <span className="font-medium">{skill.name}</span>
                <span className="text-dark-400 ml-2">{skill.skillClass}级</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setStep('pick'); setSelectedOld(null) }}
              className="btn-sm btn-secondary text-xs flex-1">返回</button>
            <button
              onClick={() => {
                if (!selectedNew || !selectedOld) return
                getSocket().emit(C2S.POOL_REPLACE_SKILL, {
                  newSkillPoolEntryId: selectedNew,
                  oldPlayerSkillId: selectedOld,
                })
                setStep('done')
              }}
              disabled={!selectedOld}
              className="btn-sm btn-primary text-xs flex-1"
            >
              确认替换
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 第一步：查看抽到的技能，选择1个或放弃
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="card w-[420px]">
        <h3 className="text-sm font-bold text-dark-50 text-center mb-1">战后技能抽取</h3>
        <p className="text-xs text-dark-300 text-center mb-1">
          从地图池中抽到了 {drawnSkills.length} 个技能
        </p>
        <p className="text-xs text-dark-400 text-center mb-4">
          剩余替换次数: <span className={cn(
            'font-bold',
            replacementsRemaining > 0 ? 'text-primary-400' : 'text-red-400',
          )}>{replacementsRemaining}</span>
        </p>

        <div className="space-y-2 mb-4">
          {drawnSkills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => replacementsRemaining > 0 ? setSelectedNew(skill.id) : undefined}
              disabled={replacementsRemaining <= 0}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg border transition-all',
                selectedNew === skill.id
                  ? 'bg-primary-600/20 border-primary-500'
                  : replacementsRemaining > 0
                    ? 'bg-dark-700 border-dark-400 hover:border-dark-300'
                    : 'bg-dark-700 border-dark-400 opacity-50',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-dark-50">{skill.name}</span>
                <span className="text-[10px] text-dark-400">{skill.skillClass}级 | {skill.sourceName}</span>
              </div>
              <p className="text-xs text-dark-300 line-clamp-2">{skill.description}</p>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              getSocket().emit(C2S.POOL_SKIP)
              setShowDrawModal(false)
              setSelectedNew(null)
            }}
            className="btn-sm btn-secondary text-xs flex-1"
          >
            全部放弃
          </button>
          {selectedNew && replacementsRemaining > 0 && (
            <button onClick={() => setStep('replace')}
              className="btn-sm btn-primary text-xs flex-1">
              选择替换
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
