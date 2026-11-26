import { computed } from 'vue'
import { defineStore } from 'pinia'
import { cases, kb, kbSuggestions } from '@/mock/cases'
import { draftDoc } from '@/engines/cases'
import { registerSearch } from '@/app/search'
import { nowText, persisted } from './persist'

export const useCasesStore = defineStore('cases', () => {
  const activeId = persisted<string>('cases.active', () => cases[0]!.id)
  const qa = persisted<{ id: string; q: string; time: string; llm?: string; engine?: 'llm' | 'local' }[]>('cases.qa', () => [{ id: 'QA-SEED', q: kbSuggestions[0]!, time: '2026-11-07 08:50', engine: 'local' }])
  // 首个案件预置审查调查报告初稿，进入文书页即可直接演示校核
  const drafts = persisted<Record<string, string>>('cases.drafts', () => ({ [`${cases[0]!.id}|审查调查报告`]: draftDoc('审查调查报告', cases[0]!) }))
  const supplemented = persisted<Record<string, string[]>>('cases.supplemented', () => ({}))
  const extracted = persisted<string[]>('cases.extracted', () => cases.map(c => c.id))
  const active = computed(() => cases.find(c => c.id === activeId.value) || cases[0]!)
  function ask(q: string) { const id = `QA-${Date.now().toString(36)}`; qa.value.push({ id, q, time: nowText() }); return id }
  function supplement(caseId: string, name: string) { supplemented.value[caseId] = [...new Set([...(supplemented.value[caseId] || []), name])] }
  registerSearch(() => [...cases.map(c => ({ id: c.id, title: c.title, type: '案卷', to: `/cases/extract?case=${c.id}` })), ...kb.map(k => ({ id: k.id, title: k.title, type: '知识库', to: `/cases/qa?q=${encodeURIComponent(k.title)}` }))])
  return { activeId, active, qa, drafts, supplemented, extracted, ask, supplement, cases, kb }
})
