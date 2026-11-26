/** 纪检智能助手本地智能体：确定性步骤、场景输出、追问改写、引用解析。不调用网络或模型。 */
import { kb } from '@/mock/cases'
import { kbSearch, composeAnswer } from './cases'
import { parseClue } from './clue-parse'

export type Scene = 'qa' | 'law' | 'polish' | 'summary' | 'transcribe' | 'minutes'
export type RefineMode = 'concise' | 'checklist' | 'formal' | 'custom'
export const refineLabels: Record<RefineMode, string> = { concise: '更简洁', checklist: '补充核查清单', formal: '改为公文语气', custom: '补充要求' }
export interface AgentStep { id: string; label: string; detail: string }
export interface Source { n: number; title: string; excerpt: string }
const BOUNDARY = /提醒|待人工确认|保留与待确认/

export const sceneMeta: Record<Scene, { title: string; subtitle: string; example: string }> = {
  qa: { title: '日常问答', subtitle: '业务问题快速解答', example: '村里集体资产出租需要走哪些程序？租金收入怎么入账？' },
  law: { title: '法规查询', subtitle: '快速检索条规要点；需逐条对照引用时用「法规智能问答」', example: '对抗组织审查包括哪些行为？审查中应注意固定哪些证据？' },
  polish: { title: '材料润色', subtitle: '规范表达，保留原意', example: '请规范以下表述，不新增事实：\n“这份合同写的三万六，但目前只找到一万二的到账记录，还有两万四没对上。我们想把银行回单、补充协议都找齐，再看看是不是少录了收款。”' },
  summary: { title: '摘要提炼', subtitle: '提取要素与待核事项', example: '群众反映乡镇G和盛村村委会主任张某军，将村集体场地以年租金36,000元租给其亲属开办的禾川农机服务社，合同SZ-HT-2026-018约定2026年6月30日前付清，公开台账仅见到账12,000元。希望核对原始收款凭证与补充协议，公开收款情况。' },
  transcribe: { title: '录音转写', subtitle: '谈话录音转文字', example: '【谈话录音】证人刘某谈话录音，时长 02:46。' },
  minutes: { title: '会议纪要', subtitle: '区分议定事项与待确认', example: '2026年11月2日，第一监督检查组召开材料核对专题会。参会人员：审查专员甲、审查专员乙。\n讨论：和盛村场地租赁应收36,000元，已关联收款12,000元，差额24,000元需核对。\n议定：由审查专员甲在11月9日前补齐合同、收款回单及补充协议；审查专员乙复核台账关联情况。对差额暂不作结论。' },
}
export const transcriptSample = [
  { t: '00:03', who: '谈话人', text: '请你说一下今年1月村里开会研究出租场地的情况。' },
  { t: '00:11', who: '刘某', text: '那天开会就我们三个人，张主任说场地租给他妻弟，一年三万六，让我们签个字。' },
  { t: '00:26', who: '谈话人', text: '会议是哪天开的？合同是什么时候签的？' },
  { t: '00:33', who: '刘某', text: '我记得是1月5号开的会，合同其实之前就签了，去年12月底。' },
  { t: '00:48', who: '谈话人', text: '周边类似场地的租金大概是多少？' },
  { t: '00:55', who: '刘某', text: '周边那样的场地一年都要六万左右。' },
]

export function sourceFacts(text: string) {
  const clean = text.replace(/【[^】]*】/g, '')
  const uniq = (list: string[] | null) => [...new Set(list || [])]
  return { amounts: uniq(clean.match(/[\d,]+(?:\.\d+)?\s*元|[\d.]+万元/g)), dates: uniq(clean.match(/\d{4}\s*年\s*\d{1,2}\s*月(?:\s*\d{1,2}\s*日)?|\d{1,2}\s*月\s*\d{1,2}\s*日/g)), codes: uniq(clean.match(/[A-Z]{2,}(?:-[A-Z0-9]+){2,}/g)) }
}
const FORMAL: [RegExp, string][] = [[/这份合同写的/g, '该合同约定'], [/三万六/g, '36,000元'], [/一万二/g, '12,000元'], [/两万四/g, '24,000元'], [/还有/g, '尚有'], [/没对上/g, '尚未核对一致'], [/找齐/g, '补齐'], [/看看/g, '核实'], [/是不是/g, '是否'], [/我们想/g, '拟'], [/我们/g, '工作组'], [/但目前只找到/g, '目前仅查见'], [/再/g, '后续'], [/少录了/g, '漏录']]

export function buildOutput(scene: Scene, input: string): { output: string; sources: Source[] } {
  const clean = input.replace(/【[^】]*】/g, '').trim()
  const excerpt = clean.length > 160 ? clean.slice(0, 160) + '…' : clean
  if (scene === 'qa' || scene === 'law') {
    const hits = kbSearch(clean, kb, 3), ans = composeAnswer(clean, hits)
    const sources = hits.map((h, i) => ({ n: i + 1, title: `${h.entry.title}（${h.entry.source}）`, excerpt: h.snippet }))
    const body = ans.points.length ? ans.points.map(p => `${'①②③④'[p.cite - 1]} ${p.text} [${p.cite}]`).join('\n') : ans.lead
    return { output: [`${scene === 'law' ? '检索结论' : '回答要点'}\n${ans.points.length ? ans.lead : ''}${ans.points.length ? '\n' + body : ''}`, ans.checks.length ? `核查提示\n${ans.checks.map((c, i) => `${'①②③④'[i]} ${c}`).join('\n')}` : '', `使用提醒\n知识库条目为演示摘要，不是权威原文，未提供条款编号。正式适用须查阅现行有效文本，由专业人员判断。`].filter(Boolean).join('\n\n'), sources }
  }
  const self: Source[] = [{ n: 1, title: scene === 'transcribe' ? '内置录音样例 · 证人刘某谈话' : '用户提供材料 · 当前输入', excerpt: (scene === 'transcribe' ? transcriptSample.map(s => s.text).join('') : clean).slice(0, 120) }]
  if (scene === 'polish') {
    const quoted = /“([^”]+)”/.exec(clean)?.[1] || clean
    const formal = FORMAL.reduce((t, [a, b]) => t.replace(a, b), quoted)
    const f = sourceFacts(quoted + formal)
    return { output: `原意提取\n${quoted}\n\n规范表述初稿 [1]\n${formal}${/认定|结论/.test(formal) ? '' : '相关情况核实前，暂不作事实认定。'}\n\n保留与待确认\n涉及金额：${f.amounts.join('、') || '原文未提供明确金额'}。润色仅调整表达，不新增事实，请逐项核对与原文一致。`, sources: self }
  }
  if (scene === 'summary') {
    const p = parseClue(clean)
    const fields = (['accused', 'issue', 'time', 'amount', 'demand'] as const).map(k => `${p.fields[k].label}：${p.fields[k].value || '原文未明确'}`)
    const f = sourceFacts(clean)
    return { output: `事项摘要 [1]\n${excerpt}\n\n原文关键要素\n${fields.join('\n')}\n\n建议核查清单\n① 回查原始材料，确认被反映人、时间与金额。\n② 调阅${f.codes.length ? `编号 ${f.codes.join('、')} 的` : ''}合同、台账与收付款凭证，核验关联范围。\n③ 补充尚缺的佐证材料，由工作人员记录核查结论。\n\n使用提醒\n本结果为本地模拟整理，不代表事实认定、违纪定性或处置决定。`, sources: self }
  }
  if (scene === 'transcribe') {
    return { output: `转写文本 [1]\n${transcriptSample.map(s => `[${s.t}] ${s.who}：${s.text}`).join('\n')}\n\n谈话要点\n① 证人称 1 月 5 日会议实到 3 人，被要求签字确认出租事项。\n② 证人称合同在会议之前（2025 年 12 月底）已签订。\n③ 证人称周边同类场地年租金约六万元，合同为三万六。\n\n使用提醒\n转写文本需与原始录音逐句核对；证言须与书证相互印证。`, sources: self }
  }
  const lines = clean.split('\n')
  const people = lines.find(l => /参会/.test(l))?.replace(/^.*?参会人员：/, '') || '待确认'
  const decided = lines.filter(l => /议定|决定/.test(l)).map(l => l.replace(/^议定：/, ''))
  return { output: `会议主题\n${lines.find(l => /召开/.test(l))?.replace(/^.*?召开/, '').replace(/。$/, '') || '专题会议（根据输入整理）'}\n\n记录提要 [1]\n${excerpt}\n\n议定事项\n${decided.length ? decided.flatMap(d => d.split('；')).map((d, i) => `${'①②③④⑤'[i]} ${d.replace(/。$/, '')}`).join('\n') : '① 原文未明确议定事项，需人工补充'}\n\n待人工确认\n参会人员：${people.replace(/。$/, '')}；期限与责任人以原始记录为准。纪要须经参会人员核对后流转。`, sources: self }
}

export function planSteps(scene: Scene, input: string, mode?: RefineMode, revision = 0): AgentStep[] {
  const f = sourceFacts(input)
  const guard = { id: 'guard', label: '边界自检', detail: '未出现定性、量纪或处置结论；保留“智能初稿，人工审核”标注' }
  if (mode) return [{ id: 'prev', label: `读取上一版初稿 v${revision}`, detail: '以上一版为基础调整，原始材料不变' }, { id: 'refine', label: `按要求调整：${refineLabels[mode]}`, detail: mode === 'checklist' ? `金额 ${f.amounts.length} 处 · 日期 ${f.dates.length} 处 · 编号 ${f.codes.length} 处` : '只改结构与措辞，不新增事实' }, guard]
  const scenes: Record<Scene, [string, string]> = { qa: ['检索私有知识库', `内置条目 ${kb.length} 条 · 不访问互联网`], law: ['检索条规要点', `内置条目 ${kb.length} 条 · 附引用来源`], polish: ['比对原意与表述', '保留事实、金额与边界，只调整措辞'], summary: ['抽取五类要素', '被反映人、问题类型、时间、金额、诉求'], transcribe: ['语音转写与说话人分离', '识别 6 段 · 2 位说话人'], minutes: ['区分议定与待确认', '参会名单、期限标记为待人工确认'] }
  return [
    { id: 'read', label: scene === 'transcribe' ? '读取音频' : '理解问题与材料', detail: scene === 'transcribe' ? '时长 02:46 · 单声道' : `共 ${input.replace(/【[^】]*】/g, '').trim().length} 字` },
    { id: 'scene', label: scenes[scene][0], detail: scenes[scene][1] },
    { id: 'draft', label: '生成结构化初稿', detail: '按段落组织，标注可追溯依据' },
    guard,
  ]
}

function blocks(o: string) { return o.split('\n\n').map(b => { const [title = '', ...body] = b.split('\n'); return { title, body } }) }
const join = (l: { title: string; body: string[] }[]) => l.map(b => [b.title, ...b.body].join('\n')).join('\n\n')
export function refine(previous: string, input: string, mode: RefineMode, note = '') {
  const list = blocks(previous)
  if (mode === 'concise') return join(list.map(b => { if (BOUNDARY.test(b.title)) return b; const items = b.body.filter(l => /^[①②③④⑤]/.test(l)); if (items.length) return { title: b.title, body: items.slice(0, 2) }; const t = b.body.join(''); const first = t.split(/(?<=。)/)[0] || t; return { title: b.title, body: [first.length > 90 ? first.slice(0, 90) + '…' : first] } }))
  if (mode === 'checklist') {
    const f = sourceFacts(input)
    const items = [...f.codes.map(c => `调阅编号 ${c} 对应的原件，核对主体与期限。`), ...f.amounts.map(a => `核对金额 ${a} 与原始凭证、台账记载是否一致。`), ...f.dates.map(d => `核对 ${d} 的原始记录或登记信息。`), '记录每项核对的材料来源、核对人及时间，未核实内容保持待核状态。'].slice(0, 8)
    const without = list.filter(b => !b.title.startsWith('补充核查清单'))
    const at = without.findIndex(b => BOUNDARY.test(b.title))
    without.splice(at < 0 ? without.length : at, 0, { title: '补充核查清单（按原文要素生成）', body: items.map((x, i) => `${'①②③④⑤⑥⑦⑧'[i]} ${x}`) })
    return join(without)
  }
  if (mode === 'formal') { const m: Record<string, string> = { '①': '（一）', '②': '（二）', '③': '（三）', '④': '（四）', '⑤': '（五）' }; return join(list.map(b => ({ title: b.title, body: b.body.map(l => FORMAL.reduce((t, [a, r]) => t.replace(a, r), l).replace(/^[①②③④⑤]\s?/, k => m[k.trim()] || k)) }))) }
  return join([...list.filter(b => !b.title.startsWith('补充要求')), { title: '补充要求（按本地规则处理）', body: [`已记录要求：「${note.trim().slice(0, 120) || '（未填写）'}」`, '本地演示引擎不解析自由语义，上方初稿未作改动，也未新增事实。请工作人员据此人工修改，或选择“更简洁”“补充核查清单”“改为公文语气”。'] }])
}
export function detectRefineMode(text: string): RefineMode {
  if (/简洁|精简|压缩|简短|缩短/.test(text)) return 'concise'
  if (/清单|核查项|核对项|待核|列出/.test(text)) return 'checklist'
  if (/公文|正式|规范|语气|书面/.test(text)) return 'formal'
  return 'custom'
}
export type CitePart = { text: string } | { cite: number }
export function splitCites(text: string): CitePart[] {
  const parts: CitePart[] = []; let cursor = 0
  for (const m of text.matchAll(/\[(\d+)\]/g)) { if (m.index! > cursor) parts.push({ text: text.slice(cursor, m.index) }); parts.push({ cite: Number(m[1]) }); cursor = m.index! + m[0].length }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) })
  return parts
}
/** 清理模型输出中的 Markdown 痕迹（#、**、- 列表符），保持纯文本公文格式。 */
export function normalizeOutput(o: string) {
  return o.replace(/\r/g, '').replace(/\*\*/g, '').replace(/^#{1,6}\s*/gm, '').replace(/^[-*]\s+/gm, '').replace(/\n{3,}/g, '\n\n').trim()
}
const isHeading = (l: string) => l.trim().length > 0 && l.trim().length <= 16 && !/[。；，：:]$/.test(l.trim()) && !/^[①②③④⑤⑥⑦⑧（]/.test(l.trim())
/** 按“小标题 + 内容”分段；兼容模型在标题后多空一行、或把标题与正文写在同一段的情况。 */
export function splitSections(o: string) {
  const blocks = normalizeOutput(o).split(/\n\s*\n/).filter(b => b.trim()).map(b => b.split('\n'))
  const out: { title: string; body: string }[] = []
  for (const lines of blocks) {
    const [first = '', ...rest] = lines
    const prev = out[out.length - 1]
    if (isHeading(first)) out.push({ title: first.trim(), body: rest.join('\n') })
    else if (prev && !prev.body) prev.body = lines.join('\n')
    else if (prev) prev.body += (prev.body ? '\n' : '') + lines.join('\n')
    else out.push({ title: '', body: lines.join('\n') })
  }
  return out
}
export function changedSections(current: string, previous?: string) { if (!previous) return new Set<string>(); const before = new Map(splitSections(previous).map(s => [s.title, s.body])); return new Set(splitSections(current).filter(s => before.get(s.title) !== s.body).map(s => s.title)) }
