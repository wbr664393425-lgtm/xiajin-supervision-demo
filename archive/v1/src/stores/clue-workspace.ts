import { defineStore } from 'pinia'
import { usePlatformStore } from './platform'
import { aiService } from '../services/ai'
import { buildWorkspaceSummary, cloneWorkspaceValue, createWorkspace, extractWorkspaceFields, knownNameMismatch, localDate, localTime, matchingClues, reviewBlockers } from '../services/clue-workspace'
import type { Clue } from '../types'
import type { ClueWorkspace, FieldKey, RelationDecision } from '../types/clue-workspace'

export const useClueWorkspaceStore = defineStore('clue-workspace', () => {
  const platform = usePlatformStore()
  // An unfinished async animation is resumed from the original after an app reload.
  for (const draft of Object.values(platform.clueWorkspaces)) if (draft.phase === 'analyzing') draft.phase = 'initial'

  function clue(id: string) { return platform.clues.find(item => item.id === id) }
  function open(id: string): ClueWorkspace | null {
    if (!clue(id)) return null
    if (!platform.clueWorkspaces[id]) platform.clueWorkspaces[id] = createWorkspace(id)
    platform.activeClueId = id
    return platform.clueWorkspaces[id]!
  }
  function log(draft: ClueWorkspace, action: string, detail: string) {
    const event = platform.addEvent(action, `${draft.clueId} · ${detail}`)
    draft.events.push({ ...event })
  }
  function dirty(draft: ClueWorkspace, affectsSummary = false) {
    const wasSubmitted = Boolean(draft.submittedAt)
    draft.dirty = true; draft.revision++; draft.updatedAt = localTime()
    if (affectsSummary && draft.summary.trim()) draft.summaryStale = true
    delete draft.submittedAt
    const item = clue(draft.clueId)
    if (item?.status === '待复核') item.status = '待人工确认'
    if (wasSubmitted) log(draft, '修改后撤回待复核提交', '本次工作稿有变更，需重新保存与人工检查；上次保存稿仍保留。')
  }
  function register(input: { title: string; content: string; area: string; source: string }): { id?: string; error?: string } {
    if (input.title.trim().length < 2 || input.content.trim().length < 10) return { error: '请填写材料标题和至少10字的举报原文。' }
    const year = localDate().slice(0, 4)
    const maximum = Math.max(108, ...platform.clues.map(item => Number(item.id.match(/-(\d+)$/)?.[1]) || 0))
    const id = `XF-${year}-${String(maximum + 1).padStart(4, '0')}`
    const item: Clue = { id, title: input.title.trim(), content: input.content, area: input.area.trim() || '地域待核对', source: input.source.trim() || '人工录入', date: localDate(), priority: '一般关注', status: '待研判' }
    platform.clues.unshift(item)
    const draft = open(id)!
    log(draft, '登记新的演示信访材料', `${item.title}；原文原样保留，等待辅助提取与人工核对。`)
    return { id }
  }
  async function analyze(id: string): Promise<string | undefined> {
    const item = clue(id), draft = open(id)
    if (!item || !draft) return '材料不存在。'
    if (draft.phase !== 'initial') return '当前材料已有整理结果，请继续核对。'
    draft.phase = 'analyzing'
    log(draft, '开始本地模拟辅助提取', '按原文整理主体、事项、时间与金额，不调用真实大模型。')
    try {
      const analysis = await aiService.analyzeClue(item, platform.clues)
      if (platform.clueWorkspaces[id] !== draft || !clue(id)) return undefined
      draft.fields = extractWorkspaceFields(item)
      draft.relatedIds = matchingClues(item, platform.clues)
      draft.relations = Object.fromEntries(draft.relatedIds.map(relatedId => [relatedId, 'pending' as RelationDecision]))
      draft.phase = 'extracted'; dirty(draft)
      item.analysis = analysis
      if (item.status === '待研判') item.status = '待人工确认'
      log(draft, '完成本地模拟辅助提取', `4项提取待核对，找到${draft.relatedIds.length}份同合同编号材料；未作事实认定。`)
    } catch {
      draft.phase = 'initial'
      log(draft, '辅助提取未完成', '原始材料保留，可以重新尝试。')
      return '辅助提取未完成，原件已保留，请重试。'
    }
  }
  function editField(id: string, key: FieldKey, value: string): string | undefined {
    const draft = open(id)
    if (!draft || draft.phase !== 'extracted') return '请先完成辅助提取。'
    const field = draft.fields[key]
    const text = value.trim()
    if (!text) return '内容不能为空；原文未载明的信息可注明“未载明，待补正”。'
    if (knownNameMismatch({ ...field, value: text })) return '请对照原文，将“禾田”修正为“禾川农机服务社”后再确认。'
    field.revisions.push({ before: field.value, after: text, by: '演示专员', at: localTime() })
    field.value = text; field.status = 'confirmed'; field.lowConfidence = false
    dirty(draft, true)
    log(draft, '人工修订并确认提取', `${field.label}：${text}；修订未改变原始举报材料。`)
  }
  function confirmField(id: string, key: FieldKey): string | undefined {
    const draft = open(id)
    if (!draft || draft.phase !== 'extracted') return '请先完成辅助提取。'
    const field = draft.fields[key]
    if (!field.value.trim()) return '原文未提取到此项，请先补正或注明“未载明，待补正”。'
    if (knownNameMismatch(field)) return '该主体与原文不一致，请先修正“禾田”为“禾川”。'
    if (field.status === 'confirmed') return
    field.status = 'confirmed'; field.lowConfidence = false
    dirty(draft, true)
    log(draft, '人工确认提取文字', `${field.label}已核对，不等于材料反映事项已经查实。`)
  }
  function decideRelation(id: string, relatedId: string, decision: RelationDecision): string | undefined {
    const draft = open(id)
    if (!draft?.relatedIds.includes(relatedId) || !['linked', 'separate', 'deferred'].includes(decision)) return '请选择有效的关联决定。'
    if (draft.relations[relatedId] === decision) return
    draft.relations[relatedId] = decision; dirty(draft, true)
    log(draft, '人工判断相似材料', `${relatedId}：${decision === 'linked' ? '关联' : decision === 'separate' ? '暂不关联' : '待核'}；两份原件分别保留。`)
  }
  function setSummary(id: string, text: string, refreshed = false): void {
    const draft = open(id)
    if (!draft || (draft.summary === text && !refreshed)) return
    draft.summary = text; draft.summaryStale = false; dirty(draft)
  }
  function prepareSummary(id: string) {
    const item = clue(id), draft = open(id)
    if (item && draft && !draft.summary) setSummary(id, buildWorkspaceSummary(item, draft, platform.contracts, platform.payments), true)
  }
  function refreshSummary(id: string) {
    const item = clue(id), draft = open(id)
    if (item && draft) setSummary(id, buildWorkspaceSummary(item, draft, platform.contracts, platform.payments), true)
  }
  function saveSummary(id: string): string | undefined {
    const draft = open(id)
    if (!draft || draft.phase !== 'extracted') return '请先完成辅助提取。'
    if (!draft.summary.trim()) return '摘要内容不能为空。'
    if (draft.summaryStale) return '基础信息已经更新，请先重整或修订摘要。'
    if (draft.saved && !draft.dirty && draft.saved.summary === draft.summary) return
    draft.saved = { summary: draft.summary, savedAt: localTime(), confirmedBy: '演示专员', fields: cloneWorkspaceValue(draft.fields), relations: cloneWorkspaceValue(draft.relations), revision: draft.revision }
    draft.dirty = false; delete draft.submittedAt
    log(draft, '保存待复核线索摘要', '保存正文、字段修订及关联决定，等待人工检查；未创建核查任务。')
  }
  function submit(id: string, checked: boolean): string | undefined {
    const draft = open(id), item = clue(id)
    if (!draft || !item) return '材料不存在。'
    const blockers = reviewBlockers(draft)
    if (blockers.length) return blockers.join('；')
    if (checked !== true) return '请先阅读摘要并完成人工检查。'
    if (draft.submittedAt) return
    draft.submittedAt = localTime()
    if (['待研判', '待人工确认', '待复核'].includes(item.status)) item.status = '待复核'
    log(draft, '人工检查后提交复核', '摘要进入待复核状态，等待复核人处理；不作受理或处置决定，未创建核查任务。')
  }
  return { open, register, analyze, editField, confirmField, decideRelation, setSummary, prepareSummary, refreshSummary, saveSummary, submit }
})
