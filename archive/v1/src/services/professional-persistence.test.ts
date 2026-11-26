import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defaultDocument } from '../mock/data'
import { usePlatformStore } from '../stores/platform'

describe('professional page progress', () => {
  beforeEach(() => {
    const saved = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
    })
    setActivePinia(createPinia())
  })

  it('restores document corrections, assistant output and human-reviewed capability results in a fresh session', () => {
    const store = usePlatformStore()
    store.reviewDocument = '人工修改后的演示文书'
    store.reviewChecked = true
    store.reviewApplied.push('amount')
    store.reviewSummary = '演示摘要初稿，需人工审核'
    store.assistantResults.push({ id: 'AI-test', task: '信访摘要', type: 'summary', input: '虚构材料', output: '待复核初稿', createdAt: '2026-11-02 09:00' })
    store.assistantResults.push({ id: 'CAP-test', task: '惠民资金比对', type: 'capability:subsidy', input: '虚构表格', output: '需核对重复记录', createdAt: '2026-11-02 09:01', reviewed: true })
    const task = store.addTask({ source: 'AI助手', sourceId: 'AI-test', title: '人工复核：信访摘要辅助初稿', area: '县级工作组（演示）', priority: '一般关注', assignee: '演示专员', deadline: '2026-11-09' })

    setActivePinia(createPinia())
    const restored = usePlatformStore()
    expect(restored.reviewDocument).toBe('人工修改后的演示文书')
    expect(restored.reviewChecked).toBe(true)
    expect(restored.reviewApplied).toEqual(['amount'])
    expect(restored.reviewSummary).toContain('需人工审核')
    expect(restored.assistantResults).toHaveLength(2)
    expect(restored.assistantResults[1]?.reviewed).toBe(true)
    expect(restored.tasks[0]?.id).toBe(task.id)
    expect(restored.metrics.activeTasks).toBe(1)
  })

  it('resets all professional page progress and persists the initial state for the next visit', () => {
    const store = usePlatformStore()
    store.reviewDocument = '修改过的文书'
    store.reviewChecked = true
    store.reviewApplied.push('time')
    store.reviewSummary = '摘要'
    store.assistantResults.push({ id: 'CAP-test', task: '比对', type: 'capability:subsidy', input: '输入', output: '结果', createdAt: '2026-11-02' })
    store.reset()

    setActivePinia(createPinia())
    const restored = usePlatformStore()
    expect(restored.reviewDocument).toBe(defaultDocument)
    expect(restored.reviewChecked).toBe(false)
    expect(restored.reviewApplied).toEqual([])
    expect(restored.reviewSummary).toBe('')
    expect(restored.assistantResults).toEqual([])
  })
})
