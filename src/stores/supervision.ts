import { computed } from 'vue'
import { defineStore } from 'pinia'
import * as m from '@/mock/supervision'
import { screenAssets, screenSubsidy, screenProcurement, screenExpense } from '@/engines/supervision'
import { townName } from '@/mock/geo'
import { registerSearch } from '@/app/search'
import type { Finding } from '@/types'
import { addDays } from '@/engines/deadline'
import { nowText, persisted, today } from './persist'
import { useSystemStore } from './system'

export interface FindingDecision { decision: 'confirmed' | 'dismissed'; note: string; by: string; time: string }

export const useSupervisionStore = defineStore('supervision', () => {
  const system = useSystemStore()
  const decisions = persisted<Record<string, FindingDecision>>('supervision.decisions', () => ({ 'AS-SZ-HT-2026-018-unpaid': { decision: 'confirmed', note: '已生成核查任务', by: '监督专员', time: '2026-10-27 09:20' }, 'SB-multi-BT-001': { decision: 'confirmed', note: '已生成核查任务', by: '监督专员', time: '2026-10-30 15:02' } }))
  const reports = persisted<{ id: string; title: string; time: string; scope: string }[]>('supervision.reports', () => [{ id: 'YB-2026-10', title: '2026年10月监督分析月报', time: '2026-11-05 17:42', scope: '按领域' }])
  const assets = screenAssets({ contracts: m.contracts, receipts: m.receipts, idle: m.idleAssets, vouchers: m.vouchers }, today())
  const subsidy = screenSubsidy({ grants: m.grants, residents: m.residents, lands: m.lands, insurance: m.insurance })
  const procurement = screenProcurement({ projects: m.projects, companies: m.companies })
  const expense = screenExpense({ allowances: m.allowances, approved: m.approvedAllowances, receptions: m.receptions, meals: m.meals, trips: m.carTrips })
  const all = computed<Finding[]>(() => [...assets, ...subsidy, ...procurement, ...expense])
  const byFeature = (feature: string) => all.value.filter(x => x.feature === feature)
  const open = computed(() => all.value.filter(x => decisions.value[x.id]?.decision !== 'dismissed'))

  function confirm(x: Finding, note = '') {
    decisions.value[x.id] = { decision: 'confirmed', note: note || '人工确认，转核查', by: system.user, time: nowText() }
    return system.createTask({ title: `核查：${x.title}`, module: x.module, feature: x.feature, sourceId: x.id, sourceLabel: `${x.rule}疑点`, level: x.level, assignee: x.feature === 'expense' ? '监督检查室' : `${x.town ? townName(x.town) : '县直'}纪委`, deadline: addDays(today(), x.level === 'high' ? 7 : 15) })
  }
  function dismiss(x: Finding, note: string) { decisions.value[x.id] = { decision: 'dismissed', note, by: system.user, time: nowText() }; system.log(x.module, '确认', x.id, `人工排除疑点：${note}`) }
  function reopen(x: Finding) { delete decisions.value[x.id]; system.log(x.module, '修改', x.id, '撤销排除，恢复待研判') }
  function addReport(title: string, scope: string) { reports.value.unshift({ id: `YB-${Date.now().toString(36).toUpperCase()}`, title, time: nowText(), scope }) }

  registerSearch(() => [
    ...m.contracts.map(c => ({ id: c.id, title: `${c.village} · ${c.asset}`, type: '三资合同', to: `/supervision/assets?contract=${c.id}` })),
    ...m.projects.map(p => ({ id: p.id, title: p.name, type: '招投标项目', to: `/supervision/procurement?project=${p.id}` })),
    ...all.value.map(x => ({ id: x.id, title: x.title, type: `${x.rule}疑点`, to: `/supervision/${x.feature}?id=${x.id}` })),
  ])
  return { decisions, reports, all, byFeature, open, confirm, dismiss, reopen, addReport, data: m }
})
