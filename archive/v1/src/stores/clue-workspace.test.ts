import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlatformStore } from './platform'
import { useClueWorkspaceStore } from './clue-workspace'
import type { FieldKey } from '../types/clue-workspace'

const STORAGE_KEY = 'xiajin-supervision-demo-v1'
const SAMPLE_ID = 'XF-2026-0108'
const FIELD_KEYS: FieldKey[] = ['tenant', 'event', 'deadline', 'amount']
const original = '【虚构测试材料】\n涉及单位：青禾镇测试服务社\n2026年11月2日，测试场地维修支出5000元，请核对原始凭证。'

function stores() {
  const platform = usePlatformStore()
  const workspace = useClueWorkspaceStore()
  return { platform, workspace }
}

function register(content = original) {
  const { workspace } = stores()
  const result = workspace.register({ title: '虚构材料测试', content, area: '青禾镇 · 测试村', source: '人工测试录入' })
  expect(result.error).toBeUndefined()
  expect(result.id).toBeTruthy()
  return result.id!
}

async function analyze(id: string) {
  const { platform, workspace } = stores()
  const pending = workspace.analyze(id)
  await vi.advanceTimersByTimeAsync(600)
  expect(await pending).toBeUndefined()
  return platform.clueWorkspaces[id]!
}

function confirmFields(id: string) {
  const { platform, workspace } = stores()
  const draft = platform.clueWorkspaces[id]!
  for (const key of FIELD_KEYS) {
    const field = draft.fields[key]
    const result = key === 'tenant' && field.aiValue === '禾田农机服务社'
      ? workspace.editField(id, key, '禾川农机服务社')
      : field.value.trim() ? workspace.confirmField(id, key) : workspace.editField(id, key, '未载明，待补正')
    expect(result).toBeUndefined()
  }
}

async function readyToSubmit(id = SAMPLE_ID) {
  const { workspace } = stores()
  const draft = await analyze(id)
  confirmFields(id)
  for (const relatedId of draft.relatedIds) expect(workspace.decideRelation(id, relatedId, 'linked')).toBeUndefined()
  workspace.refreshSummary(id)
  expect(workspace.saveSummary(id)).toBeUndefined()
  return draft
}

describe('clue workspace human review workflow', () => {
  beforeEach(() => {
    const memory = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value) },
      removeItem: (key: string) => { memory.delete(key) },
      clear: () => memory.clear(),
    })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-03T04:00:00Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('registers unique identifiers and preserves the complete original verbatim', () => {
    const { platform, workspace } = stores()
    const content = `  \n${original}\n\t保留原有空白、标点及换行。  \n`
    const first = register(content)
    const second = register(content)
    expect(first).toBe('XF-2026-0109')
    expect(second).toBe('XF-2026-0110')
    expect(new Set(platform.clues.map(clue => clue.id)).size).toBe(platform.clues.length)
    for (const id of [first, second]) {
      expect(platform.clues.find(clue => clue.id === id)?.content).toBe(content)
      expect(workspace.open(id)?.phase).toBe('initial')
    }
    expect(platform.tasks).toHaveLength(0)
  })

  it('requires correcting the sample tenant against its original before confirmation', async () => {
    const { platform, workspace } = stores()
    const content = platform.clues.find(clue => clue.id === SAMPLE_ID)!.content
    const draft = await analyze(SAMPLE_ID)
    const tenant = draft.fields.tenant
    expect(tenant.value).toBe('禾田农机服务社')
    expect(tenant.sourceText).toBe('禾川农机服务社')
    expect(content.slice(tenant.sourceStart, tenant.sourceEnd)).toBe(tenant.sourceText)
    expect(workspace.confirmField(SAMPLE_ID, 'tenant')).toContain('先修正')
    expect(workspace.editField(SAMPLE_ID, 'tenant', '禾田农机服务社')).toContain('修正')
    expect(tenant.status).toBe('pending')
    expect(workspace.editField(SAMPLE_ID, 'tenant', '禾川农机服务社')).toBeUndefined()
    expect(tenant.status).toBe('confirmed')
    expect(tenant.revisions).toEqual([expect.objectContaining({ before: '禾田农机服务社', after: '禾川农机服务社' })])
    expect(platform.clues.find(clue => clue.id === SAMPLE_ID)?.content).toBe(content)
  })

  it('extracts only the arbitrary material amount even when it mentions the sample contract', async () => {
    const { platform } = stores()
    const content = '【虚构测试材料】\n涉及单位：测试服务社\n2026年11月2日，反映合同 SZ-HT-2026-018 中某笔5000元收款，请核对原始凭证。'
    const id = register(content)
    const draft = await analyze(id)
    expect(draft.fields.amount.value).toBe('5000元')
    expect(draft.fields.amount.sourceText).toBe('5000元')
    const analysis = platform.clues.find(clue => clue.id === id)!.analysis!
    expect(analysis.amount).toBe('5000元（仅原文提取）')
    expect(analysis.summary).not.toContain('24,000')
    expect(analysis.evidence.every(item => !item.excerpt.includes('36,000'))).toBe(true)
  })

  it('does not match contract 0189 to 018 or misread contract identifiers as dates', async () => {
    const { platform } = stores()
    const id = register('【虚构测试材料】\n涉及单位：测试服务社\n请核对合同 SZ-HT-2026-0189 的5000元付款，原件未提供具体时间。')
    const draft = await analyze(id)
    expect(draft.relatedIds).toEqual([])
    expect(draft.fields.deadline.value).toBe('')
    expect(platform.clues.find(clue => clue.id === id)?.analysis?.related).toEqual([])

    const validId = register('【虚构测试材料】\n涉及单位：测试服务社\n请核对合同 SZ-HT-2026-018 的5000元付款，原件未提供具体时间。')
    const validDraft = await analyze(validId)
    expect(validDraft.relatedIds).toEqual(expect.arrayContaining([SAMPLE_ID, 'XF-2026-0106']))
    expect(validDraft.relatedIds).not.toContain(id)
    expect(validDraft.fields.deadline.value).toBe('')
  })

  it.each(['2026-02-30', '2026-13-02', '2026年2月30日', '2026年4月31日', '2026-02-29', '2026/11/31'])(
    'does not extract the invalid original date %s', async date => {
      const id = register(`【虚构测试材料】\n涉及单位：测试服务社\n材料记载时间为${date}，反映5000元维修支出待核。`)
      const draft = await analyze(id)
      expect(draft.fields.deadline.value).toBe('')
      expect(draft.fields.deadline.sourceStart).toBe(-1)
      expect(draft.fields.deadline.lowConfidence).toBe(true)
    },
  )

  it.each(['field', 'relation'] as const)('rejects saving or submitting an old summary after changing a %s', async change => {
    const { workspace } = stores()
    const draft = await readyToSubmit()
    const saved = JSON.parse(JSON.stringify(draft.saved))
    if (change === 'field') expect(workspace.editField(SAMPLE_ID, 'amount', '36,000元与12,000元，均待核对')).toBeUndefined()
    else expect(workspace.decideRelation(SAMPLE_ID, draft.relatedIds[0]!, 'separate')).toBeUndefined()
    expect(draft.summaryStale).toBe(true)
    expect(draft.saved).toEqual(saved)
    workspace.setSummary(SAMPLE_ID, draft.summary)
    expect(draft.summaryStale).toBe(true)
    expect(workspace.saveSummary(SAMPLE_ID)).toContain('重整或修订摘要')
    expect(workspace.submit(SAMPLE_ID, true)).toContain('摘要尚未重整或修订')
    expect(draft.submittedAt).toBeUndefined()
    workspace.refreshSummary(SAMPLE_ID)
    expect(workspace.saveSummary(SAMPLE_ID)).toBeUndefined()
    expect(draft.saved?.revision).toBe(draft.revision)
    expect(draft.saved?.summary).not.toBe(saved.summary)
    expect(workspace.submit(SAMPLE_ID, true)).toBeUndefined()
  })

  it('requires a human decision for every candidate and preserves all original records', async () => {
    const { platform, workspace } = stores()
    const additionalId = register('【虚构测试材料】\n涉及单位：测试服务社\n合同 SZ-HT-2026-018 的5000元凭证需要核对。')
    const originals = platform.clues.map(clue => ({ id: clue.id, content: clue.content }))
    const draft = await analyze(SAMPLE_ID)
    expect(draft.relatedIds).toHaveLength(2)
    expect(draft.relatedIds).toEqual(expect.arrayContaining(['XF-2026-0106', additionalId]))
    expect(Object.values(draft.relations)).toEqual(['pending', 'pending'])
    confirmFields(SAMPLE_ID)
    expect(workspace.decideRelation(SAMPLE_ID, 'XF-2026-0106', 'linked')).toBeUndefined()
    workspace.refreshSummary(SAMPLE_ID)
    expect(workspace.saveSummary(SAMPLE_ID)).toBeUndefined()
    expect(workspace.submit(SAMPLE_ID, true)).toContain('未完成的关联判断')
    expect(workspace.decideRelation(SAMPLE_ID, additionalId, 'deferred')).toBeUndefined()
    workspace.refreshSummary(SAMPLE_ID)
    expect(workspace.saveSummary(SAMPLE_ID)).toBeUndefined()
    expect(workspace.submit(SAMPLE_ID, true)).toBeUndefined()
    expect(platform.clues.map(clue => ({ id: clue.id, content: clue.content }))).toEqual(originals)
    expect(platform.clues.every(clue => clue.mergedInto === undefined)).toBe(true)
  })

  it.each(FIELD_KEYS)('blocks submission while the %s field is not confirmed', async key => {
    const { workspace } = stores()
    const draft = await analyze(SAMPLE_ID)
    for (const otherKey of FIELD_KEYS.filter(fieldKey => fieldKey !== key)) {
      const result = otherKey === 'tenant'
        ? workspace.editField(SAMPLE_ID, otherKey, '禾川农机服务社')
        : workspace.confirmField(SAMPLE_ID, otherKey)
      expect(result).toBeUndefined()
    }
    for (const relatedId of draft.relatedIds) workspace.decideRelation(SAMPLE_ID, relatedId, 'linked')
    workspace.refreshSummary(SAMPLE_ID)
    expect(workspace.saveSummary(SAMPLE_ID)).toBeUndefined()
    expect(workspace.submit(SAMPLE_ID, true)).toContain(`${draft.fields[key].label}待人工核对`)
    expect(draft.submittedAt).toBeUndefined()
  })

  it('requires a saved current draft and an explicit checked value before submitting for review', async () => {
    const { platform, workspace } = stores()
    const draft = await analyze(SAMPLE_ID)
    confirmFields(SAMPLE_ID)
    for (const relatedId of draft.relatedIds) workspace.decideRelation(SAMPLE_ID, relatedId, 'separate')
    workspace.refreshSummary(SAMPLE_ID)
    expect(workspace.submit(SAMPLE_ID, true)).toContain('尚未保存摘要')
    expect(workspace.saveSummary(SAMPLE_ID)).toBeUndefined()
    for (const checked of [false, undefined, 1, 'true']) {
      expect(workspace.submit(SAMPLE_ID, checked as unknown as boolean)).toContain('人工检查')
    }
    expect(draft.submittedAt).toBeUndefined()
    const tasksBefore = JSON.parse(JSON.stringify(platform.tasks))
    expect(workspace.submit(SAMPLE_ID, true)).toBeUndefined()
    expect(draft.submittedAt).toBeTruthy()
    expect(platform.clues.find(clue => clue.id === SAMPLE_ID)?.status).toBe('待复核')
    expect(platform.tasks).toEqual(tasksBefore)
    const eventsAfterSubmit = platform.events.length
    expect(workspace.submit(SAMPLE_ID, true)).toBeUndefined()
    expect(platform.events).toHaveLength(eventsAfterSubmit)
  })

  it('withdraws submission after modification while retaining the previous saved snapshot', async () => {
    const { platform, workspace } = stores()
    const draft = await readyToSubmit()
    expect(workspace.submit(SAMPLE_ID, true)).toBeUndefined()
    const saved = JSON.parse(JSON.stringify(draft.saved))
    workspace.setSummary(SAMPLE_ID, `${draft.summary}\n人工补充：继续核对付款凭证。`)
    expect(draft.submittedAt).toBeUndefined()
    expect(draft.dirty).toBe(true)
    expect(draft.saved).toEqual(saved)
    expect(platform.clues.find(clue => clue.id === SAMPLE_ID)?.status).toBe('待人工确认')
    expect(draft.events.at(-1)?.action).toBe('修改后撤回待复核提交')
    expect(workspace.submit(SAMPLE_ID, true)).toContain('当前修改尚未保存')
    expect(workspace.saveSummary(SAMPLE_ID)).toBeUndefined()
    expect(workspace.submit(SAMPLE_ID, true)).toBeUndefined()
    expect(platform.tasks).toHaveLength(0)
  })

  it('restores summaries, field revisions, relations, events and submission in a fresh Pinia instance', async () => {
    const { platform, workspace } = stores()
    const draft = await readyToSubmit()
    workspace.setSummary(SAMPLE_ID, `${draft.summary}\n人工核对补充记录。`)
    expect(workspace.saveSummary(SAMPLE_ID)).toBeUndefined()
    expect(workspace.submit(SAMPLE_ID, true)).toBeUndefined()
    const expected = JSON.parse(JSON.stringify(draft))
    const eventIds = platform.events.map(event => event.id)
    setActivePinia(createPinia())
    const restored = stores()
    expect(restored.platform.activeClueId).toBe(SAMPLE_ID)
    expect(restored.workspace.open(SAMPLE_ID)).toEqual(expected)
    expect(restored.platform.events.map(event => event.id)).toEqual(eventIds)
    expect(restored.platform.clues.find(clue => clue.id === SAMPLE_ID)?.status).toBe('待复核')
    expect(restored.platform.tasks).toHaveLength(0)
  })

  it('opens legacy cache without workspace keys while preserving other module progress', () => {
    const { platform } = stores()
    platform.clues[1]!.status = '已合并'
    platform.clues[1]!.mergedInto = SAMPLE_ID
    const task = platform.addTask({ source: '巡察整改', sourceId: platform.issues[0]!.id, title: '虚构整改核查', area: '青禾镇', priority: '一般关注', assignee: '演示专员', deadline: '2026-11-12' })
    platform.reviewDocument = '旧版缓存中的人工修订文稿'
    platform.reviewChecked = true
    platform.reviewApplied.push('amount')
    platform.reviewSummary = '旧版审核摘要'
    platform.assistantResults.push({ id: 'AI-LEGACY', task: '信访摘要', input: '虚构材料', output: '待人工核对', createdAt: '2026-11-02' })
    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    delete cached.clueWorkspaces
    delete cached.activeClueId
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
    setActivePinia(createPinia())
    const restored = stores()
    expect(restored.platform.clueWorkspaces).toEqual({})
    expect(restored.platform.activeClueId).toBe('')
    expect(restored.platform.tasks[0]?.id).toBe(task.id)
    expect(restored.platform.issues[0]?.status).toBe('整改中')
    expect(restored.platform.clues[1]?.mergedInto).toBe(SAMPLE_ID)
    expect(restored.platform.reviewDocument).toBe('旧版缓存中的人工修订文稿')
    expect(restored.platform.reviewChecked).toBe(true)
    expect(restored.platform.reviewApplied).toEqual(['amount'])
    expect(restored.platform.reviewSummary).toBe('旧版审核摘要')
    expect(restored.platform.assistantResults[0]?.id).toBe('AI-LEGACY')
    expect(restored.workspace.open(SAMPLE_ID)?.phase).toBe('initial')
    expect(restored.platform.tasks).toHaveLength(1)
  })
})
