import { useCharacterCreateStore } from '@/stores/character-create.store'
import { MASTER_ARCHETYPES } from 'shared'

export function ArchetypeSelector() {
  const { selectedArchetypeId, setArchetypeId } = useCharacterCreateStore()

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold">范型选择</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
        {MASTER_ARCHETYPES.map(arch => (
          <button
            key={arch.id}
            onClick={() => setArchetypeId(arch.id)}
            className={`p-2 rounded border text-left transition-colors ${
              selectedArchetypeId === arch.id
                ? 'bg-purple-600/30 border-purple-500'
                : 'bg-gray-800 border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-sm font-medium text-white">{arch.name}</div>
            <div className="text-xs text-gray-500 mt-1 line-clamp-3">{arch.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
