import type { StrikeCardTemplate } from '../types/strike-card.js'

/**
 * 三种击牌模板
 * 克制关系：红→被蓝响应，蓝→被绿响应，绿→被红响应
 * 每种牌同时具有攻击和防御属性
 */
export const STRIKE_CARD_TEMPLATES: readonly StrikeCardTemplate[] = [
  {
    id: 'strike_red',
    color: 'red',
    name: '红击',
    baseDamage: 10,
    description: '基础攻击牌。命中时造成攻击者的基准伤害，也可响应绿击的攻击。',
  },
  {
    id: 'strike_blue',
    color: 'blue',
    name: '蓝击',
    baseDamage: 10,
    description: '基础攻击牌。命中时造成攻击者的基准伤害，也可响应红击的攻击。',
  },
  {
    id: 'strike_green',
    color: 'green',
    name: '绿击',
    baseDamage: 10,
    description: '基础攻击牌。命中时造成攻击者的基准伤害，也可响应蓝击的攻击。',
  },
]

export const STRIKE_TEMPLATE_MAP: Record<string, StrikeCardTemplate> =
  Object.fromEntries(STRIKE_CARD_TEMPLATES.map(t => [t.id, t]))
