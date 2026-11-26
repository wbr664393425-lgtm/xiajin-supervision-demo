import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlatformStore } from './platform'
import type { VerificationTask } from '../types'

const taskInput = (source: VerificationTask['source'], sourceId: string) => ({
  source, sourceId, title: '虚构事项人工核查', area: '青禾镇 · 和盛村', priority: '优先核查' as const,
  assignee: '第一监督检查组', deadline: '2026-11-12',
})

describe('shared supervision workflow', () => {
  beforeEach(() => {
    const memory = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value) },
      removeItem: (key: string) => { memory.delete(key) },
      clear: () => memory.clear(),
    })
    setActivePinia(createPinia())
  })

  it('creates a clue task only after human confirmation and synchronizes completion', () => {
    const store = usePlatformStore()
    expect(store.metrics.activeTasks).toBe(0)
    const clue = store.clues[0]!
    const task = store.addTask(taskInput('信访线索', clue.id))
    expect(clue.status).toBe('处理中')
    expect(clue.taskId).toBe(task.id)
    expect(store.metrics.pendingClues).toBe(3)
    expect(store.metrics.activeTasks).toBe(1)
    expect(store.events[0]?.action).toBe('人工确认并形成核查任务')
    store.completeTask(task.id)
    expect(clue.status).toBe('已完成')
    expect(store.metrics.highPriorityClues).toBe(0)
    expect(store.metrics.activeTasks).toBe(0)
    expect(store.metrics.completedTasks).toBe(1)
  })

  it('keeps asset findings, source evidence, and overview counts consistent', () => {
    const store = usePlatformStore()
    const finding = store.findings.find(x => x.sourceId === 'SZ-HT-2026-018')!
    const evidence = JSON.stringify(finding.evidence)
    const contract = store.contracts.find(x => x.id === finding.sourceId)!
    const linkedReceipts = store.payments.filter(x => x.contractId === contract.id).reduce((sum, x) => sum + x.amount, 0)
    expect(contract.receivable - linkedReceipts).toBe(24000)
    expect(store.metrics.pendingFindings).toBe(4)
    const task = store.addTask(taskInput('农村三资', finding.id))
    expect(finding.status).toBe('处理中')
    expect(store.metrics.pendingFindings).toBe(3)
    store.completeTask(task.id)
    expect(finding.status).toBe('已完成')
    expect(JSON.stringify(finding.evidence)).toBe(evidence)
    expect(contract.received).toBe(12000)
  })

  it('records assignment and closes the inspection issue after human review', () => {
    const store = usePlatformStore()
    const issue = store.issues[0]!
    issue.status = '待整改'
    const task = store.addTask(taskInput('巡察整改', issue.id))
    expect(issue.status).toBe('整改中')
    expect(issue.assignee).toBe(task.assignee)
    expect(issue.deadline).toBe('2026-11-12')
    issue.response = '已补充参会名单、决议签字页与预算审批材料（演示）。'
    issue.evidenceAdded = true
    issue.status = '待复核'
    expect(store.metrics.completedTasks).toBe(0)
    store.completeTask(task.id)
    expect(issue.status).toBe('已销号')
    expect(store.metrics.pendingIssues).toBe(2)
    expect(store.metrics.completedTasks).toBe(1)
    expect(issue.response).toContain('预算审批材料')
  })

  it('does not duplicate an in-progress task or completion audit record', () => {
    const store = usePlatformStore()
    const input = taskInput('信访线索', store.clues[0]!.id)
    const first = store.addTask(input)
    const second = store.addTask(input)
    expect(second.id).toBe(first.id)
    expect(store.tasks).toHaveLength(1)
    expect(store.events.filter(x => x.action === '人工确认并形成核查任务')).toHaveLength(1)
    store.completeTask(first.id)
    const eventCount = store.events.length
    store.completeTask(first.id)
    store.completeTask('does-not-exist')
    expect(store.events).toHaveLength(eventCount)
    expect(store.metrics.completedTasks).toBe(1)
  })

  it('restores workflow and document progress after a fresh app instance, then resets all modules', () => {
    const store = usePlatformStore()
    store.clues[1]!.status = '已合并'
    store.clues[1]!.mergedInto = store.clues[0]!.id
    const task = store.addTask(taskInput('信访线索', store.clues[0]!.id))
    store.reviewDocument = '虚构校核材料已被人工修订'
    store.reviewChecked = true
    store.reviewApplied.push('amount')
    store.reviewSummary = 'AI辅助摘要初稿'
    store.assistantResults.push({ id: 'AI-TEST', task: '信访摘要', input: '虚构样例', output: '辅助摘要，需人工复核', createdAt: '2026-11-02' })
    setActivePinia(createPinia())
    const restored = usePlatformStore()
    expect(restored.tasks[0]?.id).toBe(task.id)
    expect(restored.clues[1]?.status).toBe('已合并')
    expect(restored.clues[1]?.mergedInto).toBe(store.clues[0]!.id)
    expect(restored.document).toBe('虚构校核材料已被人工修订')
    expect(restored.reviewDocument).toBe(restored.document)
    expect(restored.reviewChecked).toBe(true)
    expect(restored.reviewApplied).toEqual(['amount'])
    expect(restored.assistantResults).toHaveLength(1)
    restored.reset()
    expect(restored.tasks).toHaveLength(0)
    expect(restored.clues).toHaveLength(4)
    expect(restored.clues.every(x => x.status === '待研判')).toBe(true)
    expect(restored.issues.every(x => x.status === '待阅卷')).toBe(true)
    expect(restored.reviewChecked).toBe(false)
    expect(restored.reviewApplied).toHaveLength(0)
    expect(restored.reviewSummary).toBe('')
    expect(restored.assistantResults).toHaveLength(0)
    expect(restored.document).toContain('26,000元')
    setActivePinia(createPinia())
    expect(usePlatformStore().metrics.activeTasks).toBe(0)
  })

  it('recovers from malformed persisted JSON without losing the usable initial demo', () => {
    localStorage.setItem('xiajin-supervision-demo-v1', '{malformed')
    const store = usePlatformStore()
    expect(store.clues).toHaveLength(4)
    expect(store.contracts[0]?.receivable).toBe(36000)
  })
})
