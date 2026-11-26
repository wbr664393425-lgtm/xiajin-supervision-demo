import { computed } from 'vue'
import { defineStore } from 'pinia'
import { inspDocs, feedbackIssues, inspectionTarget, type InspDoc } from '@/mock/inspection'
import { readDoc, groupIssues, reportDraft, checkRectify } from '@/engines/inspection'
import { registerRisk } from './risk'
import { registerSearch } from '@/app/search'
import { nowText, persisted, today } from './persist'
import { useSystemStore } from './system'

export interface RectifyState { text: string; attachments: string[]; status: '整改中' | '待复核' | '已销号'; history: { time: string; who: string; action: string }[] }

export const useInspectionStore = defineStore('inspection', () => {
  const system = useSystemStore()
  const uploaded = persisted<InspDoc[]>('insp.uploaded', () => [])
  const batch = persisted<string[]>('insp.batch', () => ['XC-D01', 'XC-D02', 'XC-D03', 'XC-D04', 'XC-D05', 'XC-D06'])
  const readIds = persisted<string[]>('insp.read', () => ['XC-D02', 'XC-D03', 'XC-D04', 'XC-D05', 'XC-D06'])
  const decisions = persisted<Record<string, 'confirmed' | 'dismissed'>>('insp.decisions', () => ({}))
  const draft = persisted<string>('insp.draft', () => '')
  const rectify = persisted<Record<string, RectifyState>>('insp.rectify', () => ({ 'ZG-03': { text: '', attachments: [], status: '整改中', history: [{ time: '2026-10-25 10:00', who: '巡察办', action: '下发整改通知' }] } }))

  const docs = computed(() => [...uploaded.value, ...inspDocs])
  const findings = computed(() => docs.value.filter(d => readIds.value.includes(d.id)).flatMap(readDoc))
  const kept = computed(() => findings.value.filter(f => decisions.value[f.id] !== 'dismissed'))
  const groups = computed(() => groupIssues(kept.value))
  const issues = feedbackIssues
  const stateOf = (id: string): RectifyState => rectify.value[id] || { text: '', attachments: [], status: '整改中', history: [{ time: '2026-10-25 10:00', who: '巡察办', action: '下发整改通知' }] }
  const checks = computed(() => Object.fromEntries(issues.map(i => { const s = stateOf(i.id); return [i.id, s.text ? checkRectify(i, s.text, s.attachments, today(), s.status === '已销号') : null] })))

  function markRead(ids: string[]) { readIds.value = [...new Set([...readIds.value, ...ids])]; system.log('inspection', '生成', `${ids.length} 份台账`, `批量智能阅卷，检出 ${findings.value.filter(f => ids.includes(f.docId)).length} 处纸面疑点`) }
  function upload(name: string, text: string) { const id = `XC-U${String(uploaded.value.length + 1).padStart(2, '0')}`; uploaded.value.unshift({ id, target: '上传材料', town: 'qinghe', kind: '会议记录', title: name.replace(/\.txt$/i, ''), date: today(), text }); batch.value.push(id); return id }
  function decide(id: string, d: 'confirmed' | 'dismissed') { decisions.value[id] = d; system.log('inspection', '确认', id, d === 'confirmed' ? '确认阅卷疑点，纳入问题清单' : '排除阅卷疑点') }
  function undo(id: string) { delete decisions.value[id]; system.log('inspection', '修改', id, '撤销阅卷疑点判定') }
  function genDraft() { draft.value = reportDraft(groups.value, inspectionTarget.name, inspectionTarget.team); system.log('inspection', '生成', '巡察报告初稿', `${groups.value.length} 个问题`) }
  function saveRectify(id: string, text: string, attachments: string[]) { const s = stateOf(id); rectify.value[id] = { ...s, text, attachments, history: [...s.history, { time: nowText(), who: system.user, action: '上传 / 更新整改材料' }] } }
  function setStatus(id: string, status: RectifyState['status'], action: string) { const s = stateOf(id); rectify.value[id] = { ...s, status, history: [...s.history, { time: nowText(), who: system.user, action }] }; system.log('inspection', status === '已销号' ? '确认' : '流转', id, action) }

  registerRisk(() => kept.value.filter(f => decisions.value[f.id] === 'confirmed' || !decisions.value[f.id]).map(f => ({ id: f.id, domain: '巡察问题', town: docs.value.find(d => d.id === f.docId)?.town, dept: f.target, level: f.level, title: f.title, to: `/inspection/reading?id=${f.docId}`, status: decisions.value[f.id] === 'confirmed' ? 'confirmed' as const : 'open' as const })))
  registerSearch(() => [...docs.value.map(d => ({ id: d.id, title: d.title, type: '巡察台账', to: `/inspection/reading?id=${d.id}` })), ...issues.map(i => ({ id: i.id, title: i.title, type: '整改问题', to: `/inspection/rectify?id=${i.id}` }))])
  return { docs, batch, readIds, findings, kept, groups, decisions, draft, issues, rectify, stateOf, checks, markRead, upload, decide, undo, genDraft, saveRectify, setStatus, target: inspectionTarget }
})
