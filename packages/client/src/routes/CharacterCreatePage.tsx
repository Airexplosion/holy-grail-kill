import { useCallback } from 'react'
import { useCharacterCreateStore } from '@/stores/character-create.store'
import { useAuthStore } from '@/stores/auth.store'
import { useGroupStore } from '@/stores/group.store'
import { AttributeAllocator } from '@/components/character/AttributeAllocator'
import { ClassSelector } from '@/components/character/ClassSelector'
import { ArchetypeSelector } from '@/components/character/ArchetypeSelector'
import { TacticalStylePicker } from '@/components/character/TacticalStylePicker'
import { getSocket } from '@/lib/socket'
import { C2S } from 'shared'

export function CharacterCreatePage() {
  const player = useAuthStore((s) => s.player)
  const myGroup = useGroupStore((s) => s.myGroup)
  const {
    servantAttrs, selectedClassId, selectedArchetypeId, selectedTacticalStyle,
    servantPointsUsed, servantPointsTotal,
    confirmed, isSubmitting, setSubmitting, setConfirmed,
  } = useCharacterCreateStore()

  const isServant = myGroup ? myGroup.servantPlayerId === player?.id : false
  const isMaster = myGroup ? myGroup.masterPlayerId === player?.id : false

  const handleSubmit = useCallback(() => {
    const socket = getSocket()
    setSubmitting(true)

    if (isServant) {
      socket.emit(C2S.CHARACTER_ALLOCATE_ATTRIBUTES, servantAttrs)
      if (selectedClassId) {
        socket.emit(C2S.CHARACTER_SELECT_CLASS, { classId: selectedClassId })
      }
    }

    if (isMaster) {
      if (selectedArchetypeId) {
        socket.emit(C2S.CHARACTER_SELECT_ARCHETYPE, { archetypeId: selectedArchetypeId })
      }
      if (selectedTacticalStyle) {
        socket.emit(C2S.CHARACTER_SELECT_TACTICAL_STYLE, { color: selectedTacticalStyle })
      }
    }

    // 短暂延迟后确认
    setTimeout(() => {
      socket.emit(C2S.CHARACTER_CONFIRM)
      setSubmitting(false)
      setConfirmed(true)
    }, 300)
  }, [isServant, isMaster, servantAttrs, selectedClassId, selectedArchetypeId, selectedTacticalStyle, setSubmitting, setConfirmed])

  const remaining = servantPointsTotal - servantPointsUsed
  const canSubmitServant = remaining >= 0 && selectedClassId !== null
  const canSubmitMaster = selectedArchetypeId !== null

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">角色创建完成</div>
          <div className="text-gray-400">等待其他玩家完成...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center">
          {isServant ? '幻身创建' : isMaster ? '篡者创建' : '角色创建'}
        </h1>

        {isServant && (
          <>
            <AttributeAllocator />
            <ClassSelector />
          </>
        )}

        {isMaster && (
          <>
            <ArchetypeSelector />
            <TacticalStylePicker />
          </>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (isServant && !canSubmitServant) || (isMaster && !canSubmitMaster)}
          className="w-full py-3 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors font-medium"
        >
          {isSubmitting ? '提交中...' : '确认角色'}
        </button>
      </div>
    </div>
  )
}
