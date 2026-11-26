/**
 * 对象全景研判：围绕一个人员或企业，跨信访线索、监督疑点、巡察台账、案卷与知识库汇总已有资料，
 * 生成初核工作方案初稿。只汇总平台内已有记录，不推断事实、不作定性。
 */
import type { Finding } from '@/types'
import type { InspDoc } from '@/mock/inspection'
import type { CaseFile, KbEntry } from '@/mock/cases'
import { readDoc } from './inspection'
import { kbSearch } from './cases'

export interface DossierClue { id: string; content: string; village: string; townName: string; receivedAt: string; accused: string; issue: string; codes: string[]; amounts: number[] }
export interface DossierBankHit { id: string; batchName: string; subject: string; counterparty: string; time: string; direction: 'in' | 'out'; amount: number; bank: string; rules: string[]; summary: string }
export interface DossierOpinionHit { id: string; title: string; category: string; townName: string; postCount: number; statusText: string; summary: string; entitiesText: string }
export interface DossierInput { subject: string; clues: DossierClue[]; findings: Finding[]; inspDocs: InspDoc[]; cases: CaseFile[]; relations: string[]; kb: KbEntry[]; bankHits?: DossierBankHit[]; opinionHits?: DossierOpinionHit[] }
export interface DossierRef { n: number; title: string; excerpt: string; to?: string }
export interface Dossier {
  subject: string; role: string
  clues: DossierClue[]; villages: string[]; codes: string[]
  findings: Finding[]
  bankHits: DossierBankHit[]
  opinionHits: DossierOpinionHit[]
  inspection: { id: string; docId: string; doc: string; rule: string; title: string; excerpt: string }[]
  cases: CaseFile[]; relations: string[]
  refs: DossierRef[]
}

const yuan = (n: number) => `${n.toLocaleString('en-US')} 元`

export function collectDossier(input: DossierInput): Dossier {
  const s = input.subject.trim()
  const clues = input.clues.filter(c => c.content.includes(s)).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
  const asAccused = clues.filter(c => c.accused.includes(s))
  const role = asAccused[0]?.accused.match(/（(.+)）/)?.[1] || (/公司|建设|服务社/.test(s) ? '企业' : '')
  const villages = [...new Set(asAccused.map(c => c.village))]
  const codes = [...new Set(clues.flatMap(c => c.codes))]
  const findings = input.findings.filter(f => {
    const hay = `${f.title}${f.subject}${f.evidence.map(e => e.value).join('')}`
    return hay.includes(s) || codes.some(c => hay.includes(c)) || villages.some(v => f.subject.includes(v) || f.title.includes(v))
  })
  const docs = input.inspDocs.filter(d => d.text.includes(s) || villages.some(v => d.title.includes(v) || d.target.includes(v)))
  const inspection = docs.flatMap(d => readDoc(d).map(f => ({ id: f.id, docId: d.id, doc: d.title, rule: f.rule, title: f.title, excerpt: f.excerpt })))
  const cases = input.cases.filter(c => c.accused === s || c.title.includes(s))
  const bankHits = (input.bankHits || []).filter(b => b.subject.includes(s) || b.counterparty.includes(s) || b.batchName.includes(s))
  const opinionHits = (input.opinionHits || []).filter(o => {
    const hay = `${o.title} ${o.summary} ${o.entitiesText}`
    return hay.includes(s) || codes.some(c => hay.includes(c)) || villages.some(v => hay.includes(v))
  })
  const issueWords = [...new Set(clues.map(c => c.issue).join('、').split('、').filter(Boolean))]
  const kbHits = kbSearch(`${issueWords.join(' ')} ${findings.map(f => f.rule).join(' ')} ${bankHits.flatMap(b => b.rules).join(' ')}`, input.kb, 3)

  const refs: DossierRef[] = []
  const push = (r: Omit<DossierRef, 'n'>) => { refs.push({ n: refs.length + 1, ...r }); return refs.length }
  clues.forEach(c => push({ title: `信访线索 ${c.id}`, excerpt: `${c.receivedAt} · ${c.townName}${c.village} · ${c.issue || '待研判'}：${c.content.slice(0, 70)}…`, to: `/clues/ledger?id=${c.id}` }))
  findings.forEach(f => push({ title: `${f.rule}疑点`, excerpt: f.title, to: `/supervision/${f.feature}?id=${f.id}` }))
  bankHits.slice(0, 6).forEach(b => push({ title: `银行流水 · ${b.counterparty}`, excerpt: `${b.time.slice(0, 10)} ${b.bank}${b.direction === 'in' ? '转入' : '转出'} ${yuan(b.amount)}（${b.rules.join('、')} · ${b.summary}）`, to: `/bankflow/ledger?id=${b.id}` }))
  opinionHits.slice(0, 4).forEach(o => push({ title: `涉纪舆情 · ${o.title}`, excerpt: `${o.townName} · ${o.category} · ${o.postCount} 条公开信息（${o.statusText}）`, to: `/opinion/alerts?topic=${o.id}` }))
  inspection.forEach(f => push({ title: `巡察台账 · ${f.doc}`, excerpt: `${f.title}：“${f.excerpt.slice(0, 50)}”`, to: `/inspection/reading?id=${f.docId}` }))
  cases.forEach(c => push({ title: `案卷 ${c.id}`, excerpt: `${c.title}（${c.stage}阶段）`, to: `/cases/extract?case=${c.id}` }))
  kbHits.forEach(h => push({ title: h.entry.title, excerpt: h.snippet }))
  return { subject: s, role, clues, villages, codes, findings, bankHits, opinionHits, inspection, cases, relations: input.relations, refs }
}

const refOf = (d: Dossier, title: string) => d.refs.find(r => r.title === title)?.n

/** 交给大模型的结构化资料：只含平台已有记录，按序号引用。 */
export function dossierPrompt(d: Dossier) {
  return [
    `任务：为纪检干部起草关于“${d.subject}${d.role ? `（${d.role}）` : ''}”的初核工作方案初稿。只依据下列平台已汇总的资料，资料中没有的内容写“待核实”，引用时标注 [n]。`,
    '段落依次为：基本情况、问题线索梳理、关联关系、建议核查事项、需调取材料、工作安排建议、使用提醒。建议核查事项须对应具体编号、金额、日期；工作安排只提出步骤与责任部门建议，不作定性和处分建议。全文控制在 800 字以内，每段不超过 4 条，同一条目的引用不超过 3 个序号。',
    '',
    '【参考资料】（仅可引用以下序号）',
    ...d.refs.map(r => `[${r.n}] ${r.title}：${r.excerpt}`),
    '',
    `【关联关系】${d.relations.length ? d.relations.join('；') : '无'}`,
  ].join('\n')
}

/** 离线引擎：按模板把汇总结果整理成方案初稿，格式与大模型输出一致。 */
export function dossierPlan(d: Dossier) {
  const n = (t: string) => { const i = refOf(d, t); return i ? ` [${i}]` : '' }
  const amounts = [...new Set(d.findings.map(f => f.amount).filter((x): x is number => Boolean(x)))]
  const parts: string[] = []
  parts.push(`基本情况\n${d.subject}${d.role ? `（${d.role}）` : ''}在平台内关联信访线索 ${d.clues.length} 条、监督疑点 ${d.findings.length} 项、银行流水预警 ${d.bankHits.length} 笔、公开涉纪舆情 ${d.opinionHits.length} 个话题、巡察纸面疑点 ${d.inspection.length} 处、在办案卷 ${d.cases.length} 件${d.villages.length ? `，涉及${d.villages.join('、')}` : ''}。以上为已有记录汇总，事实以核查结果为准。`)
  const lines: string[] = []
  d.clues.forEach(c => lines.push(`${c.receivedAt} 收到反映：${c.issue || '问题待研判'}${c.amounts.length ? `，涉及 ${yuan(Math.max(...c.amounts))}` : ''}${n(`信访线索 ${c.id}`)}`))
  d.findings.forEach(f => lines.push(`${f.rule}：${f.title}${n(`${f.rule}疑点`)}`))
  d.bankHits.slice(0, 4).forEach(b => lines.push(`银行流水预警：${b.time.slice(0, 10)} 与${b.counterparty}${b.direction === 'in' ? '转入' : '转出'} ${yuan(b.amount)}（${b.rules.join('、')}）${n(`银行流水 · ${b.counterparty}`)}`))
  d.opinionHits.slice(0, 2).forEach(o => lines.push(`公开舆情反映：${o.title}（${o.postCount} 条公开信息，${o.statusText}）${n(`涉纪舆情 · ${o.title}`)}`))
  d.inspection.forEach(f => lines.push(`巡察阅卷：${f.doc}，${f.title}${n(`巡察台账 · ${f.doc}`)}`))
  parts.push(`问题线索梳理\n${lines.slice(0, 8).map((l, i) => `${'①②③④⑤⑥⑦⑧'[i]} ${l}`).join('\n') || '暂无关联记录'}`)
  parts.push(`关联关系\n${d.relations.length ? d.relations.slice(0, 6).map((r, i) => `${'①②③④⑤⑥'[i]} ${r}`).join('\n') : '图谱中暂无其他关联对象'}\n关联仅表示资料中同时出现，不代表利益关系成立。`)
  const checks: string[] = []
  if (d.codes.length) checks.push(`调取合同/项目 ${d.codes.join('、')} 的全部档案，核对签订、审批与公示程序`)
  if (amounts.length) checks.push(`逐笔核对涉及金额 ${amounts.map(yuan).join('、')} 的收付凭证与银行流水`)
  if (d.inspection.length) checks.push('对照巡察台账疑点，核实相关会议是否依规召开、记录是否完整')
  if (d.clues.length > 1) checks.push(`将 ${d.clues.length} 条线索合并研判，避免重复核查`)
  checks.push('听取被反映人说明，必要时向相关知情人了解情况')
  parts.push(`建议核查事项\n${checks.map((c, i) => `${'①②③④⑤'[i]} ${c}`).join('\n')}`)
  const mats = ['相关会议记录与表决材料', '合同、收款凭证与银行流水', d.villages.length ? `${d.villages.join('、')}村务公开记录` : '相关公开公示记录']
  parts.push(`需调取材料\n${mats.map((m, i) => `${'①②③'[i]} ${m}`).join('\n')}`)
  parts.push(`工作安排建议\n① 由属地纪委会同监督检查室开展初步核实，建议 15 日内形成初核情况报告\n② 涉及多条线索的，统一由一个承办部门牵头办理\n③ 核查过程与结果在平台内留痕`)
  parts.push('使用提醒\n本方案为 智能汇总生成的初稿，需人工审核；不构成事实认定、违纪定性或处置意见。')
  return parts.join('\n\n')
}
