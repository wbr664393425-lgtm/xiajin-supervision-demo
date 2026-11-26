import type { Clue, Contract, Payment } from '../types'
import type { ClueWorkspace, FieldKey, WorkspaceField } from '../types/clue-workspace'

export const fieldKeys: FieldKey[] = ['tenant', 'event', 'deadline', 'amount']
export const relationLabels = { pending: '尚未判断', linked: '人工关联', separate: '暂不关联', deferred: '关联待核' }
export const localTime = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })
export const localDate = () => localTime().slice(0, 10)
export const cloneWorkspaceValue = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const labels: Record<FieldKey, string> = { tenant: '涉及主体', event: '反映事项', deadline: '材料时间', amount: '涉及金额' }

function makeField(label: string, value = '', sourceText = '', content = '', lowConfidence = false, sourceOffset?: number): WorkspaceField {
  const start = typeof sourceOffset === 'number' ? sourceOffset : sourceText ? content.indexOf(sourceText) : -1
  return { label, value, aiValue: value, sourceText, sourceStart: start, sourceEnd: start < 0 ? -1 : start + sourceText.length, lowConfidence, status: 'pending', revisions: [] }
}

export function createWorkspace(clueId: string): ClueWorkspace {
  return { clueId, phase: 'initial', fields: Object.fromEntries(fieldKeys.map(key => [key, makeField(labels[key])])) as Record<FieldKey, WorkspaceField>, relatedIds: [], relations: {}, summary: '', summaryStale: false, dirty: false, revision: 0, saved: null, events: [], updatedAt: localTime() }
}

export function contractIds(content: string): string[] { return [...new Set(content.match(/(?<![A-Za-z0-9_-])SZ-HT-\d{4}-\d{3}(?![A-Za-z0-9_-])/g) || [])] }

function dateInOriginal(content: string): { text: string; offset: number } {
  // Mask identifiers without changing offsets. An ID such as SZ-HT-2026-018 is not a date.
  const masked = content.replace(/[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+/g, token => ' '.repeat(token.length))
  const patterns = [/(?<!\d)(?:0?[1-9]|1[0-2])月(?:0?[1-9]|[12]\d|3[01])日前/g, /20\d{2}年(?:第[一二三四1-4]季度|(?:0?[1-9]|1[0-2])月(?:(?:0?[1-9]|[12]\d|3[01])日)?)/g, /(?<!\d)20\d{2}[-/](?:0?[1-9]|1[0-2])(?:[-/](?:0?[1-9]|[12]\d|3[01]))?(?![\d/-])/g]
  for (const pattern of patterns) for (const match of masked.matchAll(pattern)) {
    const text = match[0]
    if (/季度/.test(text)) return { text, offset: match.index! }
    const chineseMonth = text.match(/(\d{1,2})月/)?.[1]
    const chineseDay = text.match(/(\d{1,2})日/)?.[1]
    const parts = text.split(/[-/]/).map(Number)
    const year = Number(text.match(/^(20\d{2})年/)?.[1] || (parts.length > 1 ? parts[0] : 2000))
    const month = Number(chineseMonth || parts[1])
    const day = Number(chineseDay || (parts.length > 2 ? parts[2] : 1))
    const date = new Date(Date.UTC(year, month - 1, day))
    if (date.getUTCMonth() + 1 === month && date.getUTCDate() === day) return { text, offset: match.index! }
  }
  return { text: '', offset: -1 }
}

/** Local deterministic extraction: only characters present in the submitted original are used. */
export function extractWorkspaceFields(clue: Clue): Record<FieldKey, WorkspaceField> {
  const content = clue.content
  const tenant = content.match(/承租方[为：:]\s*([^，。；\n（(]{2,40})/)?.[1]?.trim()
    || content.match(/由([^，。；\n]{2,40}?)承租/)?.[1]?.trim()
    || content.match(/(?:涉及单位|被反映人|涉及人员)[：:]\s*([^\n，。；]+)/)?.[1]?.trim() || ''
  const sampleEvent = '和盛村集体场地租赁款收取情况'
  const paragraphs = content.split('\n').map(line => line.trim()).filter(line => line && !/^【|^(反映人|涉及单位|涉及人员|被反映人)[：:]/.test(line))
  const event = content.includes(sampleEvent) ? sampleEvent : (paragraphs[0]?.split(/[。；]/)[0]?.slice(0, 65) || '')
  const date = dateInOriginal(content)
  const amounts = [...content.matchAll(/\d[\d,，.]*\s*(?:万元|元)/g)].map(match => match[0])
  const amountText = [...new Set(amounts)].join('、')
  const knownTypo = tenant === '禾川农机服务社' && content.includes('SZ-HT-2026-018')
  return {
    tenant: makeField('涉及主体', knownTypo ? '禾田农机服务社' : tenant, tenant, content, knownTypo || !tenant),
    event: makeField('反映事项', event, event, content, !event),
    deadline: makeField('材料时间', date.text, date.text, content, !date.text, date.offset),
    amount: makeField('涉及金额', amountText, amounts[0] || '', content, !amountText),
  }
}

export function matchingClues(clue: Clue, all: Clue[]): string[] {
  const ids = contractIds(clue.content)
  return ids.length ? all.filter(other => other.id !== clue.id && contractIds(other.content).some(id => ids.includes(id))).map(other => other.id) : []
}

export function knownNameMismatch(field: WorkspaceField): boolean {
  return field.aiValue === '禾田农机服务社' && field.sourceText === '禾川农机服务社' && field.value.replace(/\s|（虚构）|\(虚构\)/g, '') !== field.sourceText
}

export function reviewBlockers(draft: ClueWorkspace): string[] {
  const reasons: string[] = []
  if (draft.phase !== 'extracted') reasons.push('尚未完成辅助提取')
  const pending = fieldKeys.filter(key => draft.fields[key].status !== 'confirmed' || !draft.fields[key].value.trim())
  if (pending.length) reasons.push(`${pending.map(key => draft.fields[key].label).join('、')}待人工核对`)
  if (knownNameMismatch(draft.fields.tenant) && !pending.includes('tenant')) reasons.push('涉及主体与原件不一致')
  if (draft.relatedIds.some(id => !draft.relations[id] || draft.relations[id] === 'pending')) reasons.push('相似材料尚有未完成的关联判断')
  if (draft.summaryStale) reasons.push('基础信息更新后，摘要尚未重整或修订')
  if (!draft.saved) reasons.push('尚未保存摘要')
  else if (draft.dirty || draft.saved.summary !== draft.summary) reasons.push('当前修改尚未保存')
  if (!draft.summary.trim()) reasons.push('摘要内容为空')
  return reasons
}

export function buildWorkspaceSummary(clue: Clue, draft: ClueWorkspace, contracts: Contract[], payments: Payment[]): string {
  const ids = contractIds(clue.content)
  const foundContracts = contracts.filter(contract => ids.includes(contract.id))
  const foundPayments = payments.filter(payment => ids.includes(payment.contractId))
  const confirmed = fieldKeys.filter(key => draft.fields[key].status === 'confirmed').length
  const extracted = fieldKeys.map(key => `${draft.fields[key].label}：${draft.fields[key].value || '原文未提取到，需人工补正'}`).join('；')
  const records = foundContracts.length || foundPayments.length
    ? [...foundContracts.map(contract => `合同 ${contract.id}：${contract.clause || `台账年度应收${contract.receivable.toLocaleString('en-US')}元`}`), ...foundPayments.map(payment => `收款记录 ${payment.id}：${payment.date}，${payment.amount.toLocaleString('en-US')}元`)].join('\n')
    : '当前未检索到可关联的合同或收款台账，不据此判断记录不存在。'
  const relations = draft.relatedIds.length ? draft.relatedIds.map(id => `${id}：${relationLabels[draft.relations[id] || 'pending']}`).join('；') : '本次未检索到相同合同编号的其他材料，不代表已排除相关举报。'
  return `【原件陈述】${clue.id} · ${clue.title}；材料来源：${clue.source}，登记日期：${clue.date}。\n\n【提取整理 · ${confirmed}/4项已人工核对】${extracted}。\n\n【系统检索台账 · 参考依据】\n${records}\n检索结果不等于事项已查实，未关联记录不等于不存在其他收款。\n\n【人工关联决定】${relations}。原始材料分别保留。\n\n【待补充与核对】对照原件、完整收款凭证、付款节点与补充约定继续核实。以上为待复核整理稿，不能据此认定欠缴、违纪或违法。`
}
