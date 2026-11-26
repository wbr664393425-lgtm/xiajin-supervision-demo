import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { RiskLevel } from '@/types'
import { useSupervisionStore } from './supervision'
import { useCluesStore } from './clues'
import { aggregateByTown } from '@/engines/supervision'

export interface RiskItem { id: string; domain: string; town?: string; dept: string; level: RiskLevel; title: string; to: string; amount?: number; date?: string; status: 'open' | 'confirmed' | 'dismissed' }
export const domainColors: Record<string, string> = { 三资管理: '#C91519', 惠民资金: '#E07B2A', 工程招投标: '#C8962E', 公务支出: '#4C55A6', 信访线索: '#2C7A57', 巡察问题: '#8A5A9E', 涉纪舆情: '#9B2C52' }
const domainOf: Record<string, string> = { assets: '三资管理', subsidy: '惠民资金', procurement: '工程招投标', expense: '公务支出' }
type Extra = () => RiskItem[]
const extras: Extra[] = []
/** 其他模块（如巡察）注册自己的风险项，汇入一张图。 */
export function registerRisk(fn: Extra) { extras.push(fn) }

export const useRiskStore = defineStore('risk', () => {
  const sup = useSupervisionStore(), clues = useCluesStore()
  const items = computed<RiskItem[]>(() => [
    ...sup.all.map(x => ({ id: x.id, domain: domainOf[x.feature]!, town: x.town, dept: x.feature === 'expense' ? x.subject : x.feature === 'procurement' ? (sup.data.projects.find(p => x.subject.startsWith(p.id))?.owner || '采购单位') : '村级组织', level: x.level, title: x.title, to: `/supervision/${x.feature}?id=${x.id}`, amount: x.amount, date: x.date, status: (sup.decisions[x.id]?.decision === 'confirmed' ? 'confirmed' : sup.decisions[x.id]?.decision === 'dismissed' ? 'dismissed' : 'open') as RiskItem['status'] })),
    ...clues.list.filter(c => c.grading.level !== 'low' && !c.state.invalid && !c.state.mergedInto).map(c => ({ id: c.id, domain: '信访线索', town: c.town, dept: '信访线索', level: c.grading.level, title: `${c.parsed.fields.accused.value || c.village} · ${c.parsed.fields.issue.value}`, to: `/clues/ledger?id=${c.id}`, date: c.receivedAt, status: (c.state.done ? 'confirmed' : 'open') as RiskItem['status'] })),
    ...extras.flatMap(fn => fn()),
  ])
  const active = computed(() => items.value.filter(i => i.status !== 'dismissed'))
  const byTown = computed(() => aggregateByTown(active.value))
  const byDomain = computed(() => Object.keys(domainColors).map(d => ({ label: d, value: active.value.filter(i => i.domain === d).length, color: domainColors[d]! })).filter(x => x.value))
  return { items, active, byTown, byDomain }
})
