/** 审理与案卷引擎：知识库检索问答、案卷要素抽取与印证、文书起草与校核、证据链校验、类案相似度。 */
import { bigrams, findAll, sentences, parseAmount } from './text'
import type { KbEntry, CaseFile, CaseMaterial, SimilarCase } from '@/mock/cases'

// ───────── 知识库检索（本地 BM25 近似） ─────────
const STOP = new Set(['什么', '哪些', '怎么', '如何', '是否', '能不', '不能', '有什', '么要', '要求', '一个'])
export function tokens(q: string) { return [...bigrams(q)].filter(t => !STOP.has(t)) }
export interface KbHit { entry: KbEntry; score: number; snippet: string; matched: string[] }
export function kbSearch(query: string, kb: KbEntry[], k = 4): KbHit[] {
  const qs = tokens(query)
  if (!qs.length) return []
  const docs = kb.map(e => ({ e, title: e.title, tags: e.tags.join(' '), body: e.content }))
  const df = (t: string) => docs.filter(d => (d.title + d.tags + d.body).includes(t)).length
  const idf = Object.fromEntries(qs.map(t => [t, Math.log(1 + (docs.length - df(t) + 0.5) / (df(t) + 0.5))]))
  const count = (s: string, t: string) => s.split(t).length - 1
  return docs.map(d => {
    const matched = qs.filter(t => (d.title + d.tags + d.body).includes(t))
    const score = qs.reduce((s, t) => { const tf = count(d.title, t) * 2 + count(d.tags, t) * 3 + count(d.body, t); return s + (tf ? idf[t]! * (tf * 2.2) / (tf + 1.2) : 0) }, 0)
    const snippet = sentences(d.body).map(x => ({ x: x.text, n: qs.filter(t => x.text.includes(t)).length })).sort((a, b) => b.n - a.n)[0]?.x || d.body.slice(0, 60)
    return { entry: d.e, score, snippet, matched }
  }).filter(h => h.score > 0.8).sort((a, b) => b.score - a.score).slice(0, k)
}
export function composeAnswer(query: string, hits: KbHit[]) {
  if (!hits.length) return { lead: '内置知识库中未检索到与该问题直接相关的条目。建议换用更具体的业务词（如违纪类型、程序节点）重新提问，或查阅权威原文。', points: [] as { text: string; cite: number }[], checks: [] as string[] }
  const points = hits.map((h, i) => ({ text: `${h.entry.title.replace(/^虚构案例：/, '参考案例：')}——${h.snippet.replace(/。$/, '')}。`, cite: i + 1 }))
  const checks = [...new Set(hits.flatMap(h => sentences(h.entry.content).filter(s => /核查|调取|注意|重点|应当|应/.test(s.text)).map(s => s.text.trim())))].slice(0, 4)
  return { lead: `关于“${query.slice(0, 40)}”，根据内置知识库检索到 ${hits.length} 条相关内容，要点如下：`, points, checks }
}

// ───────── 案卷要素抽取 ─────────
export interface Element { label: string; value: string; start: number; end: number }
export function extractElements(m: CaseMaterial): Element[] {
  const out: Element[] = []
  const push = (label: string, re: RegExp) => findAll(m.text, re).forEach(h => out.push({ label, value: h.text, start: h.start, end: h.end }))
  push('时间', /\d{4}年\d{1,2}月\d{1,2}日(?:上午|下午)?(?:\d{1,2}时(?:至\d{1,2}时)?)?|\d{1,2}月\d{1,2}号/)
  push('金额', /(?:[\d,]+(?:\.\d+)?元)|(?:三万六|六万左右)/)
  push('涉案人员', /[一-龥]某(?:(?![把在的将对于是和与让也又给被向从说就])[一-龥])?|审查专员[甲乙]/)
  push('关系', /妻弟|妹妹|亲属|亲戚/)
  push('事由', /(?:场地租金|农业设施补助|补助金额|租赁期限|没有开会研究|补了个记录|让我们签个字|合同其实之前就签了|不符合条件)/)
  push('地点', /镇纪委谈话室|村委会议室|和盛村|谈话室/)
  return out.sort((a, b) => a.start - b.start)
}
export function crossCheck(c: CaseFile) {
  const norm = (v: string) => v === '三万六' ? 36000 : v === '六万左右' ? 60000 : parseAmount(v)
  const amounts = new Map<number, string[]>()
  c.materials.forEach(m => extractElements(m).filter(e => e.label === '金额').forEach(e => { const n = norm(e.value); if (n) amounts.set(n, [...new Set([...(amounts.get(n) || []), m.id])]) }))
  const rows = [...amounts.entries()].sort((a, b) => b[0] - a[0]).map(([n, ids]) => ({ fact: `${n.toLocaleString()} 元`, materials: ids, ok: ids.length >= 2, note: ids.length >= 2 ? `${ids.length} 份材料相互印证` : '单一来源，建议补充印证' }))
  const sign = /签订日期：(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(c.materials.map(m => m.text).join(''))
  const meet = /(\d{1,2})月(\d{1,2})号/.exec(c.materials.map(m => m.text).join(''))
  if (sign && meet) rows.unshift({ fact: `合同签订 ${sign[1]}-${sign[2]}-${sign[3]} 早于会议 ${meet[1]}月${meet[2]}日`, materials: c.materials.filter(m => /签订日期|号/.test(m.text)).map(m => m.id), ok: false, note: '书证与证言共同指向“先签合同后开会”，需在审查报告中写明' })
  return rows
}

// ───────── 文书起草与校核 ─────────
export const docTypes = ['线索处置单', '初核报告', '审查调查报告', '审理报告', '处分决定'] as const
export type DocType = typeof docTypes[number]
export function draftDoc(type: DocType, c: CaseFile) {
  const facts = c.id === 'AJ-2026-012'
    ? '经查，张某军利用担任和盛村村委会主任的职务便利，在未经村民代表会议研究的情况下，于2025年12月28日以年租金36,000元将村集体场地出租给其妻弟负责的禾川农机服务社，低于同类场地参考价；截至2026年10月31日，承租方仅支付租金12,000元，尚欠24,000元。'
    : '经查，李某华利用担任清源村会计的职务便利，将不符合条件的亲属李某芳列入2026年第三季度农业设施补助名单，致其领取补助资金8,000元。'
  const head = `${type}（初稿）\n\n被反映人 / 被审查人：${c.accused}，${c.role}\n案件编号：${c.id}\n`
  const bodies: Record<DocType, string> = {
    线索处置单: `${head}线索来源：信访举报\n受理日期：${c.filedAt}\n反映问题：${c.title.replace('涉嫌', '')}\n拟办意见：建议予以初步核实，由监督检查室承办，初核时限30日。\n承办人：`,
    初核报告: `${head}一、初核工作情况\n${c.filedAt}受理后，初核组调取了合同、银行流水、会议记录等材料，并开展谈话了解。\n二、初核发现的主要问题\n${facts}\n三、处置建议\n建议对${c.accused}立案审查调查。初核阶段所反映问题有待进一步审查核实。\n承办人：`,
    审查调查报告: `${head}一、基本情况\n${c.accused}，${c.role}。\n二、违纪事实\n${facts}\n三、证据情况\n上述事实有租赁合同、银行流水、证人证言及本人陈述等证据证实。\n四、处理意见\n其行为违反《中国共产党纪律处分条例》相关规定，构成违反廉洁纪律。建议给予相应党纪处分，具体由审理部门依规提出。\n承办人：`,
    审理报告: `${head}一、审理经过\n本案于${c.filedAt}立案，经审查调查后移送审理。\n二、违纪事实及证据\n${facts}\n三、审理意见\n事实清楚，证据确实充分，程序合规。依据《中国共产党纪律处分条例》有关规定，量纪意见由审理室集体研究提出（本稿不作量纪建议）。\n承办人：`,
    处分决定: `${head}一、违纪事实\n${facts}\n二、处分依据与决定\n依据《中国共产党纪律处分条例》有关规定，经研究决定，给予${c.accused}（处分种类由集体研究确定）。\n三、权利告知\n如不服本决定，可在收到决定之日起一个月内向作出决定的机关提出申诉。\n承办人：`,
  }
  return bodies[type]
}
/** 为演示校核功能注入的常见笔误。 */
export function withTypos(text: string) {
  return text.replace('《中国共产党纪律处分条例》', '中国共产党纪律处分条例第27条').replace('尚欠24,000元', '尚欠26,000元').replace('利用担任', '搞了个利用担任').replace('于2025年12月28日', '于2025年12月28日（后补开会议，估计是1月份）').replace(/承办人：$/, '承办人：\n谈话时间：2026年10月19日（立案日期：2026年10月20日）')
}
export interface DocIssue { id: string; kind: '法条引用' | '程序时限' | '表述规范' | '前后矛盾' | '要素缺失'; title: string; start: number; end: number; excerpt: string; suggestion: string; replacement?: string }
export function checkDoc(text: string, type: DocType): DocIssue[] {
  const out: DocIssue[] = []
  const add = (kind: DocIssue['kind'], title: string, h: { start: number; end: number; text: string }, suggestion: string, replacement?: string) => out.push({ id: `${kind}-${h.start}`, kind, title, start: h.start, end: h.end, excerpt: h.text, suggestion, replacement })
  findAll(text, /(?<!《)(中国共产党纪律处分条例|中华人民共和国监察法|监察法实施条例)(?!》)/).forEach(h => add('法条引用', '法规名称未加书名号', h, '法规名称应使用书名号', `《${h.text}》`))
  findAll(text, /第\d+条/).forEach(h => add('法条引用', '条款序号使用阿拉伯数字', h, '请核对条款并改用汉字序号；系统不提供条款编号，需人工查阅现行有效文本', '第（请人工核对）条'))
  findAll(text, /搞了个|整了|拿了钱|估计是|大概|应该是/).forEach(h => add('表述规范', `口语化或推测性表述“${h.text}”`, h, '执纪文书应客观、准确，避免口语与推测', ''))
  if (/线索处置单|初核报告/.test(type)) findAll(text, /构成违反|已查实|严重违纪/).forEach(h => add('表述规范', '初核阶段出现定性表述', h, '初核阶段只反映问题与处置建议，不作违纪定性', '涉嫌'))
  const owed = findAll(text, /尚欠([\d,]+)元/)[0], total = /年租金([\d,]+)元/.exec(text), paid = /仅支付租金([\d,]+)元/.exec(text)
  if (owed && total && paid) { const expect = parseAmount(total[1]!) - parseAmount(paid[1]!); if (parseAmount(owed.text) !== expect) add('前后矛盾', `欠款金额与年租金、已付金额不一致（应为 ${expect.toLocaleString()} 元）`, owed, '按年租金减已付金额重新计算', `尚欠${expect.toLocaleString()}元`) }
  const talk = /谈话时间：(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(text), file = /立案日期：(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(text)
  if (talk && file) { const d = (m: RegExpExecArray) => `${m[1]}-${m[2]!.padStart(2, '0')}-${m[3]!.padStart(2, '0')}`; if (d(talk) < d(file)) { const h = findAll(text, /谈话时间：\d{4}年\d{1,2}月\d{1,2}日/)[0]!; add('程序时限', '谈话时间早于立案日期', h, '核对谈话审批与立案审批先后，程序节点不得倒置') } }
  if (type === '处分决定' && !/申诉/.test(text)) out.push({ id: 'miss-appeal', kind: '要素缺失', title: '未告知申诉权利', start: text.length, end: text.length, excerpt: '', suggestion: '处分决定应告知申诉权利与期限' })
  const blank = findAll(text, /承办人：(?=\n|$)/)[0]
  if (blank) add('要素缺失', '承办人未填写', blank, '补充承办人员信息')
  return out.sort((a, b) => a.start - b.start)
}

// ───────── 证据链 ─────────
export function evidenceChain(c: CaseFile, required: string[], supplemented: string[]) {
  const items = required.map(name => ({ name, status: c.evidence.includes(name) ? 'have' as const : supplemented.includes(name) ? 'added' as const : 'missing' as const }))
  const nodes = Object.entries(c.procedures).map(([name, date]) => ({ name, date, ok: Boolean(date) || supplemented.includes(name) }))
  const order: string[] = []
  const talkApprove = c.procedures['谈话审批'], talkSign = c.procedures['谈话笔录签字']
  if (talkApprove && talkSign && talkSign < talkApprove) order.push('谈话笔录签字早于谈话审批')
  const missing = items.filter(i => i.status === 'missing').length + nodes.filter(n => !n.ok).length
  return { items, nodes, order, missing, ready: missing === 0 && !order.length }
}

// ───────── 类案推送 ─────────
const BEHAVIOR: [string, RegExp][] = [['亲属', /妻弟|妹妹|亲属|亲戚/], ['低价出租', /低于|六万|参考价/], ['未经民主决策', /没有开会|未经|补了个记录/], ['集体资产', /集体场地|集体资产|场地/], ['租金未收齐', /剩下|尚欠|仅支付|没交齐/], ['补助', /补助|补贴/], ['虚报', /不符合条件/]]
export function caseBehaviors(c: CaseFile) { const text = c.materials.map(m => m.text).join(''); return BEHAVIOR.filter(([, re]) => re.test(text)).map(([b]) => b) }
export function similarTo(c: CaseFile, list: SimilarCase[]) {
  const behaviors = caseBehaviors(c)
  const amountOf = (cf: CaseFile) => Math.max(0, ...cf.materials.flatMap(m => findAll(m.text, /[\d,]+元/).map(h => parseAmount(h.text))).filter(n => n < 1e6))
  const amount = c.id === 'AJ-2026-012' ? 24000 : amountOf(c)
  return list.map(s => {
    const reasons: string[] = []
    let score = 0
    if (s.violation === c.violation) { score += 40; reasons.push(`同类违纪：${s.violation}`) }
    if (s.role === c.role) { score += 15; reasons.push(`同类职务：${s.role}`) }
    const overlap = s.behaviors.filter(b => behaviors.includes(b))
    if (overlap.length) { score += Math.round((overlap.length / Math.max(s.behaviors.length, behaviors.length)) * 30); reasons.push(`相同情节：${overlap.join('、')}`) }
    if (s.amount && amount) { const r = Math.min(s.amount, amount) / Math.max(s.amount, amount); score += Math.round(r * 15); if (r > 0.5) reasons.push(`涉及金额相近（${s.amount.toLocaleString()} 元）`) }
    return { ...s, score, reasons }
  }).filter(s => s.score >= 30).sort((a, b) => b.score - a.score)
}
