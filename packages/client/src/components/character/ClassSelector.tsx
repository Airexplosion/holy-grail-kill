import { useCharacterCreateStore } from '@/stores/character-create.store'
import { SERVANT_CLASSES } from 'shared'

export function ClassSelector() {
  const { selectedClassId, setClassId } = useCharacterCreateStore()

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold">职业选择</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
        {SERVANT_CLASSES.map(cls => (
          <button
            key={cls.id}
            onClick={() => setClassId(cls.id)}
            className={`p-2 rounded border text-left transition-colors ${
              selectedClassId === cls.id
                ? 'bg-blue-600/30 border-blue-500'
                : 'bg-gray-800 border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-sm font-medium text-white">{cls.name}</div>
            <div className="text-xs text-gray-400">{cls.nameEn}</div>
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{cls.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
