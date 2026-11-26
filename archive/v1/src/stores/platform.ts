import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { createInitialState } from '../mock/data'
import type { AuditEvent, PlatformState, VerificationTask } from '../types'

const STORAGE_KEY = 'xiajin-supervision-demo-v1'
function restore(): PlatformState {
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed.clues) && Array.isArray(parsed.contracts) && Array.isArray(parsed.tasks)) return { ...createInitialState(), ...parsed }
    }
  } catch { /* Local demo remains usable if persistence is unavailable. */ }
  return createInitialState()
}
export const usePlatformStore = defineStore('platform', () => {
  const initial = restore()
  const clues = ref(initial.clues)
  const findings = ref(initial.findings)
  const contracts = ref(initial.contracts)
  const payments = ref(initial.payments)
  const issues = ref(initial.issues)
  const tasks = ref(initial.tasks)
  const events = ref(initial.events)
  const document = ref(initial.document)
  const assistantResults = ref(initial.assistantResults)
  const reviewDocument = computed({ get: () => document.value, set: (value: string) => { document.value = value } })
  const reviewChecked = ref(initial.reviewChecked)
  const reviewApplied = ref(initial.reviewApplied)
  const reviewSummary = ref(initial.reviewSummary)
  const clueWorkspaces = ref(initial.clueWorkspaces || {})
  const activeClueId = ref(initial.activeClueId || '')
  const persistenceError = ref('')
  const metrics = computed(() => ({
    pendingFindings: findings.value.filter(x => x.status === '待核查').length,
    highPriorityClues: clues.value.filter(x => x.priority === '高关注' && !['已合并', '已完成'].includes(x.status)).length,
    activeTasks: tasks.value.filter(x => x.status === '处理中').length,
    completedTasks: tasks.value.filter(x => x.status === '已完成').length,
    pendingClues: clues.value.filter(x => x.status === '待研判').length,
    awaitingConfirmation: clues.value.filter(x => ['待人工确认', '待复核'].includes(x.status)).length,
    pendingIssues: issues.value.filter(x => x.status !== '已销号').length,
    totalClues: clues.value.length,
    totalContracts: contracts.value.length,
    receivable: contracts.value.reduce((sum, x) => sum + x.receivable, 0),
    received: payments.value.reduce((sum, x) => sum + x.amount, 0),
  }))
  function now() { return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0, 16) }
  function addEvent(action: string, detail: string): AuditEvent {
    const entry = { id: `EV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, time: now(), action, detail }
    events.value.unshift(entry)
    return entry
  }
  function addTask(input: Omit<VerificationTask, 'id' | 'status' | 'createdAt'>): VerificationTask {
    const existing = tasks.value.find(t => t.source === input.source && t.sourceId === input.sourceId && t.status === '处理中')
    if (existing) return existing
    const task: VerificationTask = { ...input, id: `HC-2026-${String(tasks.value.length + 1).padStart(3, '0')}`, status: '处理中', createdAt: now() }
    tasks.value.unshift(task)
    if (input.source === '信访线索') {
      const clue = clues.value.find(x => x.id === input.sourceId)
      if (clue) { clue.status = '处理中'; clue.taskId = task.id }
    } else if (input.source === '农村三资') {
      const finding = findings.value.find(x => x.id === input.sourceId)
      if (finding) { finding.status = '处理中'; finding.taskId = task.id }
    } else if (input.source === '巡察整改') {
      const issue = issues.value.find(x => x.id === input.sourceId)
      if (issue) { issue.status = '整改中'; issue.taskId = task.id; issue.assignee = input.assignee; issue.deadline = input.deadline }
    }
    addEvent('人工确认并形成核查任务', `${task.id} · ${task.title}，由${task.assignee}办理，期限${task.deadline}`)
    return task
  }
  function completeTask(id: string) {
    const task = tasks.value.find(x => x.id === id)
    if (!task || task.status === '已完成') return
    task.status = '已完成'
    task.completedAt = now()
    if (task.source === '信访线索') { const clue = clues.value.find(x => x.id === task.sourceId); if (clue) clue.status = '已完成' }
    if (task.source === '农村三资') { const finding = findings.value.find(x => x.id === task.sourceId); if (finding) finding.status = '已完成' }
    if (task.source === '巡察整改') { const issue = issues.value.find(x => x.id === task.sourceId); if (issue) issue.status = '已销号' }
    addEvent('人工完成核查', `${task.id} · ${task.title}已完成人工核查并更新来源状态`)
  }
  function reset() {
    const fresh = createInitialState()
    clues.value = fresh.clues; findings.value = fresh.findings; contracts.value = fresh.contracts; payments.value = fresh.payments
    issues.value = fresh.issues; tasks.value = fresh.tasks; events.value = fresh.events; document.value = fresh.document; assistantResults.value = fresh.assistantResults
    reviewChecked.value = fresh.reviewChecked; reviewApplied.value = fresh.reviewApplied; reviewSummary.value = fresh.reviewSummary
    clueWorkspaces.value = {}; activeClueId.value = ''
  }
  watch([clues, findings, contracts, payments, issues, tasks, events, document, assistantResults, reviewChecked, reviewApplied, reviewSummary, clueWorkspaces, activeClueId], () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ clues: clues.value, findings: findings.value, contracts: contracts.value, payments: payments.value, issues: issues.value, tasks: tasks.value, events: events.value, document: document.value, assistantResults: assistantResults.value, reviewChecked: reviewChecked.value, reviewApplied: reviewApplied.value, reviewSummary: reviewSummary.value, clueWorkspaces: clueWorkspaces.value, activeClueId: activeClueId.value })); persistenceError.value = '' } catch { persistenceError.value = '本次操作仍可继续，但浏览器未能保存本地缓存；刷新可能丢失当前进度。' }
  }, { deep: true, flush: 'sync' })
  return { clues, findings, contracts, payments, issues, tasks, events, document, assistantResults, reviewDocument, reviewChecked, reviewApplied, reviewSummary, clueWorkspaces, activeClueId, persistenceError, metrics, addTask, completeTask, addEvent, reset }
})
