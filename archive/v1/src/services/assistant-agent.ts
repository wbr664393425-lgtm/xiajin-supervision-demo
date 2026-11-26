/** 纪检 AI 助手的本地智能体编排：确定性步骤、引用解析、追问意图识别。不调用网络或模型。 */
import type { AssistantStepRecord } from '../types'
import { refineLabels, sourceFacts, type RefineMode } from './professional'

export type AgentStep = AssistantStepRecord

const sceneStep: Record<string, [string, string]> = {
  summary: ['梳理诉求与待核事项', '区分材料反映的情况与核查诉求，不作事实认定'],
  knowledge: ['检索内置演示条目', '命中 1 条内置演示资料 · 不访问互联网'],
  polish: ['比对原意与表述', '保留事实、金额与核查边界，只调整措辞'],
  meeting: ['区分议定事项与待确认内容', '会议名单、日期与期限标记为待人工确认'],
}

export function planSteps(type: string, input: string, mode?: RefineMode, revision = 0): AgentStep[] {
  const facts = sourceFacts(input)
  const length = input.replace(/【[^】]*】/g, '').trim().length
  const factDetail = [
    facts.amounts.length ? `金额 ${facts.amounts.length} 处（${facts.amounts.slice(0, 2).join('、')}${facts.amounts.length > 2 ? '…' : ''}）` : '未见明确金额',
    `日期 ${facts.dates.length} 处`,
    `编号 ${facts.codes.length} 处`,
  ].join(' · ')
  const guard: AgentStep = { id: 'guard', label: '边界自检', detail: '未出现定性、处分或处置结论；保留人工复核提示' }
  if (mode) {
    return [
      { id: 'read-prev', label: `读取上一版初稿 v${revision}`, detail: '以上一版为基础调整，原始材料保持不变' },
      { id: 'refine', label: `按要求调整：${refineLabels[mode]}`, detail: mode === 'checklist' ? factDetail : mode === 'custom' ? '记录补充要求，提示人工修改' : '只改结构与措辞，不新增事实' },
      guard,
    ]
  }
  const [label, detail] = sceneStep[type] || sceneStep.summary!
  return [
    { id: 'read', label: '读取材料', detail: `共 ${length} 字，已忽略演示标记` },
    { id: 'facts', label: '识别要素', detail: factDetail },
    { id: 'scene', label, detail },
    { id: 'draft', label: '生成结构化初稿', detail: '按段落整理，标注可追溯依据 [1]' },
    guard,
  ]
}

export type CitePart = { text: string } | { cite: number }
/** 把文本中的 [n] 拆成引用角标，其余文字原样保留。 */
export function splitCites(text: string): CitePart[] {
  const parts: CitePart[] = []
  let cursor = 0
  for (const match of text.matchAll(/\[(\d+)\]/g)) {
    if (match.index! > cursor) parts.push({ text: text.slice(cursor, match.index) })
    parts.push({ cite: Number(match[1]) })
    cursor = match.index! + match[0].length
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) })
  return parts
}

export interface ResultSection { title: string; body: string }
export function splitSections(output: string): ResultSection[] {
  return output.split('\n\n').filter(Boolean).map(block => { const [title = '', ...body] = block.split('\n'); return { title, body: body.join('\n') } })
}
/** 与上一版相比内容有变化（或新增）的段落标题。 */
export function changedSections(current: string, previous?: string) {
  if (!previous) return new Set<string>()
  const before = new Map(splitSections(previous).map(section => [section.title, section.body]))
  return new Set(splitSections(current).filter(section => before.get(section.title) !== section.body).map(section => section.title))
}

/** 自由追问的意图识别；识别不到时作为补充要求记录。 */
export function detectRefineMode(text: string): RefineMode {
  if (/简洁|精简|压缩|简短|缩短/.test(text)) return 'concise'
  if (/清单|核查项|核对项|待核|列出/.test(text)) return 'checklist'
  if (/公文|正式|规范|语气|书面/.test(text)) return 'formal'
  return 'custom'
}
