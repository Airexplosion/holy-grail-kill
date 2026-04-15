import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import type { ArenaSnapshot, DamageBreakdown, SkillLibraryEntry } from 'shared'

const COLORS = [
  { key: 'red', label: '红击', bg: 'bg-red-600 hover:bg-red-500' },
  { key: 'blue', label: '蓝击', bg: 'bg-blue-600 hover:bg-blue-500' },
  { key: 'green', label: '绿击', bg: 'bg-green-600 hover:bg-green-500' },
]

export function SkillArenaPage() {
  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null)
  const [lastBreakdown, setLastBreakdown] = useState<DamageBreakdown | null>(null)
  const [config, setConfig] = useState({
    playerHp: 40, playerMp: 4, playerDamage: 4, playerAc: 0,
    dummyHp: 100, dummyMp: 4, dummyDamage: 3, dummyAc: 0,
    dummyBehavior: 'aggressive' as string,
  })
  const [loading, setLoading] = useState(false)
  const [allSkills, setAllSkills] = useState<SkillLibraryEntry[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())
  const [skillSearch, setSkillSearch] = useState('')

  // 加载技能库
  useEffect(() => {
    api.get<SkillLibraryEntry[]>('/skill-arena/skills', { useAccountToken: true })
      .then(data => setAllSkills(data || []))
      .catch(() => {})
  }, [])

  const toggleSkill = useCallback((id: string) => {
    setSelectedSkillIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const createSession = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.post<ArenaSnapshot>('/skill-arena/sessions', {
        ...config,
        skillIds: [...selectedSkillIds],
      }, { useAccountToken: true })
      setSnapshot(data)
      setLastBreakdown(null)
    } finally { setLoading(false) }
  }, [config, selectedSkillIds])

  const doAction = useCallback(async (action: string, body?: any) => {
    if (!snapshot) return
    setLoading(true)
    try {
      const data = await api.post<any>(`/skill-arena/sessions/${snapshot.sessionId}/${action}`, body || {}, { useAccountToken: true })
      if (data.snapshot) { setSnapshot(data.snapshot); setLastBreakdown(data.breakdown || null) }
      else if (data.sessionId) { setSnapshot(data); setLastBreakdown(null) }
      else { setSnapshot(data); setLastBreakdown(null) }
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }, [snapshot])

  // 未创建会话
  if (!snapshot) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-center">技能沙盒</h1>
          <p className="text-center text-gray-400 text-sm">配置战斗参数，创建训练场</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-blue-400">玩家</h3>
              {(['playerHp', 'playerMp', 'playerDamage', 'playerAc'] as const).map(k => (
                <label key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-gray-400">{k.replace('player', '')}</span>
                  <input type="number" value={(config as any)[k]} onChange={e => setConfig(c => ({ ...c, [k]: +e.target.value }))}
                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm" />
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-red-400">木头人</h3>
              {(['dummyHp', 'dummyMp', 'dummyDamage', 'dummyAc'] as const).map(k => (
                <label key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-gray-400">{k.replace('dummy', '')}</span>
                  <input type="number" value={(config as any)[k]} onChange={e => setConfig(c => ({ ...c, [k]: +e.target.value }))}
                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm" />
                </label>
              ))}
              <label className="flex items-center gap-2 text-xs">
                <span className="w-16 text-gray-400">行为</span>
                <select value={config.dummyBehavior} onChange={e => setConfig(c => ({ ...c, dummyBehavior: e.target.value }))}
                  className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm">
                  <option value="aggressive">攻击型</option>
                  <option value="defensive">防守型</option>
                  <option value="random">随机</option>
                  <option value="passive">沙袋（不反击）</option>
                </select>
              </label>
            </div>
          </div>

          {/* 技能选择 */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">选择技能装备 ({selectedSkillIds.size}个)</h3>
            <input
              type="text" value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
              placeholder="搜索技能名..."
              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {allSkills
                .filter(s => !skillSearch || s.name.includes(skillSearch) || s.description.includes(skillSearch))
                .map(s => (
                <button key={s.id} onClick={() => toggleSkill(s.id)}
                  className={`w-full text-left p-2 rounded text-xs border transition-colors ${
                    selectedSkillIds.has(s.id)
                      ? 'border-purple-500 bg-purple-900/30'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                  }`}>
                  <div className="flex justify-between">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-gray-500">{s.type} {s.cooldown > 0 ? `CD${s.cooldown}` : ''}</span>
                  </div>
                  <div className="text-gray-400 mt-0.5 line-clamp-1">{s.description}</div>
                  {s.cost?.mp && <span className="text-yellow-500 text-[10px]">{s.cost.mp}MP</span>}
                </button>
              ))}
              {allSkills.length === 0 && <p className="text-gray-500 text-xs">技能库为空，请在管理后台添加技能</p>}
            </div>
          </div>

          <button onClick={createSession} disabled={loading}
            className="w-full py-3 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 font-medium">
            {loading ? '创建中...' : `开始战斗${selectedSkillIds.size > 0 ? ` (${selectedSkillIds.size}个技能)` : ''}`}
          </button>

          <a href="/lobby" className="block text-center text-xs text-gray-500 hover:text-gray-300">返回大厅</a>
        </div>
      </div>
    )
  }

  const s = snapshot
  const isPlayerAction = s.phase === 'player_action'
  const isPlayerRespond = s.phase === 'player_respond'
  const isEnded = s.phase === 'ended'
  const isRoundEnd = s.phase === 'round_end'
  const isDummyAction = s.phase === 'dummy_action'

  const phaseLabel = isPlayerAction ? '你的行动' : isPlayerRespond ? '响应攻击！' : isEnded ? '战斗结束' : isRoundEnd ? '轮结束' : '木头人行动中'
  const phaseBg = isPlayerAction ? 'bg-blue-600' : isPlayerRespond ? 'bg-yellow-600' : isEnded ? 'bg-red-600' : 'bg-gray-600'

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">技能沙盒 — 第 {s.round} 轮</h1>
          <div className="flex gap-2">
            <span className={`text-xs px-2 py-1 rounded ${phaseBg}`}>{phaseLabel}</span>
            <button onClick={createSession} className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600">重新开始</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* 左列：角色状态 + 行动 */}
          <div className="space-y-3">
            {/* 玩家状态 */}
            <div className="bg-gray-800 rounded-lg p-3 border border-blue-700">
              <h3 className="text-sm font-medium text-blue-400 mb-2">玩家</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-red-400">HP</span><span>{s.player.hp}/{s.player.hpMax}</span></div>
                <div className="h-1.5 bg-gray-700 rounded"><div className="h-full bg-red-500 rounded" style={{ width: `${(s.player.hp / s.player.hpMax) * 100}%` }} /></div>
                <div className="flex justify-between"><span className="text-blue-400">MP</span><span>{s.player.mp}/{s.player.mpMax}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">AC</span><span>{s.player.ac}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">伤害</span><span>{s.player.baseDamage}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">动作</span><span>{s.player.actionsRemaining}/{s.player.actionsMax}</span></div>
              </div>
            </div>

            {/* 木头人状态 */}
            <div className="bg-gray-800 rounded-lg p-3 border border-red-700">
              <h3 className="text-sm font-medium text-red-400 mb-2">{s.dummy.name}</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-red-400">HP</span><span>{s.dummy.hp}/{s.dummy.hpMax}</span></div>
                <div className="h-1.5 bg-gray-700 rounded"><div className="h-full bg-red-500 rounded" style={{ width: `${(s.dummy.hp / s.dummy.hpMax) * 100}%` }} /></div>
                <div className="flex justify-between"><span className="text-blue-400">MP</span><span>{s.dummy.mp}/{s.dummy.mpMax}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">AC</span><span>{s.dummy.ac}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">伤害</span><span>{s.dummy.baseDamage}</span></div>
              </div>
            </div>

            {/* 行动区：出牌/技能/pass */}
            {isPlayerAction && (
              <div className="space-y-2">
                <div className="text-xs text-gray-400">点击手牌出牌攻击（消耗1MP+1动作）：</div>
                <div className="flex flex-wrap gap-1">
                  {s.playerCards.hand.map(card => (
                    <button key={card.id} onClick={() => doAction('play-strike', { color: card.color })}
                      disabled={s.player.mp <= 0 || s.player.actionsRemaining <= 0 || loading}
                      className={`px-3 py-1.5 rounded text-xs text-white transition-colors ${
                        card.color === 'red' ? 'bg-red-700 hover:bg-red-600' :
                        card.color === 'blue' ? 'bg-blue-700 hover:bg-blue-600' :
                        card.color === 'green' ? 'bg-green-700 hover:bg-green-600' :
                        'bg-gray-600 hover:bg-gray-500'
                      } disabled:opacity-40`}>
                      {card.name}
                    </button>
                  ))}
                </div>

                {/* 技能面板 */}
                {s.playerSkills.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 mt-2">技能：</div>
                    <div className="space-y-1 mt-1">
                      {s.playerSkills.map(sk => (
                        <button key={sk.id}
                          onClick={() => doAction('use-skill', { skillId: sk.id })}
                          disabled={!sk.usable || s.player.actionsRemaining <= 0 || loading}
                          className={`w-full text-left p-2 rounded text-xs border transition-colors ${
                            sk.usable ? 'border-purple-600 bg-purple-900/30 hover:bg-purple-900/50' : 'border-gray-700 bg-gray-800 opacity-50'
                          }`}>
                          <div className="flex justify-between">
                            <span className="font-medium">{sk.name}</span>
                            <span className="text-gray-500">
                              {sk.cooldownRemaining > 0 ? `CD${sk.cooldownRemaining}` : '可用'}
                            </span>
                          </div>
                          <div className="text-gray-400 mt-0.5 line-clamp-1">{sk.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={() => doAction('pass')} disabled={loading}
                  className="w-full py-2 rounded bg-gray-700 hover:bg-gray-600 text-xs mt-2">
                  结束本轮行动（轮到木头人）
                </button>
              </div>
            )}

            {/* 响应面板：木头人攻击你，选择是否响应 */}
            {isPlayerRespond && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 space-y-2">
                <div className="text-sm text-yellow-400 font-medium">木头人攻击！选择响应：</div>
                <div className="flex flex-wrap gap-1">
                  {s.playerCards.hand.map(card => (
                    <button key={card.id} onClick={() => doAction('respond', { color: card.color })}
                      disabled={loading}
                      className={`px-3 py-1.5 rounded text-xs text-white ${
                        card.color === 'red' ? 'bg-red-700 hover:bg-red-600' :
                        card.color === 'blue' ? 'bg-blue-700 hover:bg-blue-600' :
                        card.color === 'green' ? 'bg-green-700 hover:bg-green-600' :
                        'bg-gray-600 hover:bg-gray-500'
                      }`}>
                      {card.name}
                    </button>
                  ))}
                </div>
                <button onClick={() => doAction('respond', {})} disabled={loading}
                  className="w-full py-2 rounded bg-red-700 hover:bg-red-600 text-xs">
                  不响应（承受伤害）
                </button>
              </div>
            )}

            {isRoundEnd && (
              <button onClick={() => doAction('advance-round')} disabled={loading}
                className="w-full py-3 rounded bg-green-600 hover:bg-green-500 text-sm font-medium">
                进入下一轮
              </button>
            )}
          </div>

          {/* 中列：牌区 */}
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-300 mb-2">手牌 ({s.playerCards.hand.length})</h3>
              <div className="flex flex-wrap gap-1">
                {s.playerCards.hand.map(card => (
                  <div key={card.id} className={`px-2 py-1 rounded text-xs ${
                    card.color === 'red' ? 'bg-red-800' : card.color === 'blue' ? 'bg-blue-800' : 'bg-green-800'
                  }`}>
                    {card.name}
                    {card.source !== 'initial' && <span className="text-[8px] ml-1 opacity-60">({card.source})</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                牌库 ({s.playerCards.deck.length})
                {s.playerCards.nextDraw && (
                  <span className="text-xs text-yellow-400 ml-2">
                    下一抽: {s.playerCards.nextDraw.name} ({s.playerCards.nextDraw.color})
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-1">
                {s.playerCards.deck.map((card, i) => (
                  <div key={card.id} className={`px-1.5 py-0.5 rounded text-[10px] ${
                    i === 0 ? 'ring-1 ring-yellow-400 ' : ''
                  }${card.color === 'red' ? 'bg-red-900' : card.color === 'blue' ? 'bg-blue-900' : 'bg-green-900'}`}>
                    {card.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-300 mb-2">弃牌堆 ({s.playerCards.discard.length})</h3>
              <div className="flex flex-wrap gap-1">
                {s.playerCards.discard.map(card => (
                  <div key={card.id} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-700 text-gray-400">
                    {card.name}
                  </div>
                ))}
              </div>
            </div>

            {/* 伤害拆解 */}
            {lastBreakdown && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                <h3 className="text-sm font-medium text-yellow-400 mb-1">伤害拆解</h3>
                <div className="text-xs text-yellow-200 font-mono">{lastBreakdown.formula}</div>
                <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-gray-300">
                  <div>基础伤害: {lastBreakdown.baseDamage}</div>
                  <div>增伤: +{lastBreakdown.amplification}</div>
                  <div>减伤: -{lastBreakdown.reduction}</div>
                  <div>护盾吸收: -{lastBreakdown.shieldAbsorbed}</div>
                  <div>AC吸收: -{lastBreakdown.acAbsorbed}</div>
                  <div className="text-yellow-400 font-bold">最终: {lastBreakdown.finalDamage}</div>
                </div>
              </div>
            )}
          </div>

          {/* 右列：战斗日志 */}
          <div className="bg-gray-800 rounded-lg p-3 max-h-[80vh] overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-300 mb-2">战斗日志</h3>
            <div className="space-y-1">
              {[...s.logs].reverse().map(log => (
                <div key={log.id} className={`text-xs py-0.5 border-b border-gray-700/50 ${
                  log.actor === 'dummy' ? 'text-red-300' : 'text-blue-300'
                }`}>
                  <span className="text-gray-500 text-[10px]">R{log.round}</span>
                  {' '}
                  <span className={`text-[10px] px-1 rounded ${
                    log.type === 'damage' ? 'bg-red-900' :
                    log.type === 'strike' ? 'bg-orange-900' :
                    log.type === 'phase' ? 'bg-gray-700' :
                    'bg-gray-700'
                  }`}>{log.type}</span>
                  {' '}{log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
