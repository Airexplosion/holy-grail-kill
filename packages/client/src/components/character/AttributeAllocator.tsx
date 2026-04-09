import { useCharacterCreateStore, getServantPreview } from '@/stores/character-create.store'
import type { AttributeRank, ServantAttributes } from 'shared'
import { RANK_ORDER, RANK_TOTAL_COST, SERVANT_ATTR_LABELS } from 'shared'

const ATTR_KEYS: (keyof ServantAttributes)[] = ['str', 'end', 'agi', 'mag', 'luk']

export function AttributeAllocator() {
  const { servantAttrs, servantPointsUsed, servantPointsTotal, setServantAttr } = useCharacterCreateStore()
  const remaining = servantPointsTotal - servantPointsUsed
  const preview = getServantPreview(servantAttrs)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">属性分配</h3>
        <span className={`text-sm font-mono ${remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
          剩余点数: {remaining} / {servantPointsTotal}
        </span>
      </div>

      <div className="space-y-2">
        {ATTR_KEYS.map(attr => (
          <div key={attr} className="flex items-center gap-3">
            <span className="w-16 text-sm font-medium">{SERVANT_ATTR_LABELS[attr]}</span>
            <div className="flex gap-1">
              {RANK_ORDER.filter(r => !['A+', 'A++'].includes(r)).map(rank => (
                <button
                  key={rank}
                  onClick={() => setServantAttr(attr, rank)}
                  className={`w-8 h-8 text-xs rounded border transition-colors ${
                    servantAttrs[attr] === rank
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                  }`}
                >
                  {rank}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500 ml-2">
              ({RANK_TOTAL_COST[servantAttrs[attr]]}pt)
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-700 pt-3">
        <h4 className="text-sm font-medium text-gray-400 mb-2">派生数值预览</h4>
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          <div>
            <div className="text-gray-500">伤害</div>
            <div className="text-white font-bold">{preview.baseDamage}</div>
          </div>
          <div>
            <div className="text-gray-500">HP</div>
            <div className="text-white font-bold">{preview.hp}</div>
          </div>
          <div>
            <div className="text-gray-500">动作</div>
            <div className="text-white font-bold">{preview.actions}</div>
          </div>
          <div>
            <div className="text-gray-500">MP</div>
            <div className="text-white font-bold">{preview.mp}</div>
          </div>
          <div>
            <div className="text-gray-500">手牌</div>
            <div className="text-white font-bold">{preview.handSize}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
