import {
  ALLOWANCES,
  CAR_TRIPS,
  COMPANIES,
  CONTRACTS,
  GRANTS,
  IDLE_ASSETS,
  INSURANCES,
  LANDS,
  MEAL_INVOICES,
  PROJECTS,
  RECEIPTS,
  RECEPTIONS,
  RESIDENTS,
  TOWNS,
  VOUCHERS,
  townName,
} from './mockData'
import type {
  Cadre,
  CaseFile,
  ClueRecord,
  FeedbackIssue,
  FieldKey,
  InspDoc,
  ParsedField,
  RiskLevel,
  Span,
  SupervisionFinding,
} from './types'

const DAY = 86400000

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00+08:00`)
  d.setTime(d.getTime() + days * DAY)
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })
}

export function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00+08:00`).getTime() - new Date(`${from}T00:00:00+08:00`).getTime()) / DAY)
}

export function deadlineState(receivedAt: string, today: string, done: boolean, limit = 15) {
  const deadline = addDays(receivedAt, limit)
  const left = daysBetween(today, deadline)
  const state: '已办结' | '已超期' | '即将到期' | '正常' = done
    ? '已办结'
    : left < 0
      ? '已超期'
      : left <= 3
        ? '即将到期'
        : '正常'
  return { deadline, left, state }
}

// ── 文本切分与相似度 ──
export function findAll(text: string, pattern: RegExp): (Span & { text: string })[] {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const re = new RegExp(pattern.source, flags)
  return [...text.matchAll(re)].map((m) => ({
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
    text: m[0],
  }))
}

export function sentences(text: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = []
  for (const m of text.matchAll(/[^。！？；\n]+[。！？；]?/g)) {
    if (m[0].trim()) out.push({ text: m[0], start: m.index ?? 0 })
  }
  return out
}

function bigrams(text: string) {
  const clean = text.replace(/[\s，。、：；！？“”‘’（）()【】[\]《》,.:;!?'"-]/g, '')
  const set = new Set<string>()
  for (let i = 0; i < clean.length - 1; i++) set.add(clean.slice(i, i + 2))
  return set
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

export const textSimilarity = (a: string, b: string) => jaccard(bigrams(a), bigrams(b))

export function segmentText(text: string, spans: (Span & { key?: string; active?: boolean })[]) {
  const sorted = [...spans]
    .filter((s) => s.end > s.start && s.start >= 0 && s.end <= text.length)
    .sort((a, b) => a.start - b.start)
  const out: { text: string; key?: string; active?: boolean; start: number }[] = []
  let cursor = 0
  for (const s of sorted) {
    if (s.start < cursor) continue
    if (s.start > cursor) out.push({ text: text.slice(cursor, s.start), start: cursor })
    out.push({ text: text.slice(s.start, s.end), key: s.key, active: s.active, start: s.start })
    cursor = s.end
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), start: cursor })
  return out
}

// ── 信访要素提取（带原文位置溯源） ──
const UNIT_RE = new RegExp(
  `(?:${TOWNS.map((t) => t.name).join('|')})(?:${TOWNS.flatMap((t) => t.villages).join('|')}|[\\u4e00-\\u9fa5]{2,8}?(?:服务站|站|所|党委))?`,
)
const TITLE_RE = '(?:村委会主任|村委会委员|村主任|党支部书记|支部书记|党委书记|党委委员|原村委会主任|会计|站长|镇干部|干部|书记|主任|委员)'
const NAME_RE = '[\\u4e00-\\u9fa5]某(?:(?![把在的将对于是和与让也又给被向从说就利用多次])[\\u4e00-\\u9fa5])?'

const ISSUE_RULES: { type: string; re: RegExp }[] = [
  { type: '对抗组织审查', re: /串供|销毁[^。]{0,8}凭证|对抗组织审查/ },
  { type: '工程回扣', re: /回扣|帮助[^。]{0,12}承揽|利益关系/ },
  { type: '围标串标', re: /围标|串标|商量好/ },
  { type: '优亲厚友', re: /(?:亲属|亲戚|关系户|侄子|妻弟)[^。]{0,30}|(?:租给|列入|评上|交给|列为)[^。]{0,12}(?:亲属|亲戚|侄子|妻弟)/ },
  { type: '低价发包', re: /低于[^。]{0,10}市场|才\s*[\d,]+元|周边[^。]{0,10}都要/ },
  { type: '违规处置集体资产', re: /擅自[^。]{0,20}(?:出租|处置)|未经[^。]{0,20}研究/ },
  { type: '吃拿卡要', re: /吃拿卡要|请吃饭|送烟酒|跑腿费/ },
  { type: '违规公款吃喝', re: /吃喝|接待|工作餐/ },
  { type: '违规补贴', re: /(?:补助|补贴)[^。]{0,30}(?:不符合|虚报|收取)|不符合条件[^。]{0,20}(?:补助|补贴)/ },
  { type: '挪用集体资金', re: /个人账户|挪用|代为保管/ },
  { type: '选人用人违规', re: /选拔|提拔|后备干部|民主推荐/ },
  { type: '咨询求助', re: /咨询|报修|政策何时/ },
]

export interface ParsedClue {
  fields: Record<FieldKey, ParsedField>
  persons: string[]
  codes: string[]
  companies: string[]
  amounts: number[]
  issueTypes: string[]
}

export function parseClueText(text: string, overrides?: Partial<Record<FieldKey, string>>): ParsedClue {
  const accusedHits = findAll(text, new RegExp(`${TITLE_RE}(${NAME_RE})`))
  const nameHits = findAll(text, new RegExp(NAME_RE))
  const persons = [...new Set(nameHits.map((h) => h.text))]
  const first = accusedHits[0]
  const name = first ? first.text.match(new RegExp(NAME_RE))?.[0] || '' : nameHits[0]?.text || ''
  const title = first ? first.text.replace(name, '') : ''
  const nameStart = first ? first.start + first.text.indexOf(name) : nameHits[0]?.start

  const makeField = (key: FieldKey, label: string, extracted: string, span: Span | undefined, conf: 'high' | 'low'): ParsedField => {
    const edited = overrides?.[key] !== undefined && overrides[key] !== extracted
    return {
      key,
      label,
      value: overrides?.[key] ?? extracted,
      span,
      confidence: edited ? 'high' : conf,
      humanEdited: edited,
    }
  }

  const accusedVal = name ? (title ? `${name}（${title}）` : name) : ''
  const accused = makeField(
    'accused',
    '被反映人',
    accusedVal,
    name && nameStart !== undefined ? { start: nameStart, end: nameStart + name.length } : undefined,
    first ? 'high' : 'low',
  )

  const unitHit = findAll(text, UNIT_RE)[0]
  const unit = makeField('unit', '涉及单位 / 村居', unitHit?.text || '', unitHit, unitHit ? 'high' : 'low')

  const issueTypes: string[] = []
  let issueSpan: Span | undefined
  for (const r of ISSUE_RULES) {
    const hit = findAll(text, r.re)[0]
    if (hit) {
      issueTypes.push(r.type)
      issueSpan ??= hit
    }
  }
  const issue = makeField(
    'issue',
    '问题类型参考',
    issueTypes.slice(0, 3).join('、'),
    issueSpan,
    issueTypes.length > 0 ? 'high' : 'low',
  )

  const timeHit = findAll(text, /20\d\d年(?:第[一二三四]季度|\d{1,2}月(?:\d{1,2}日)?|以来)?|\d{1,2}月\d{1,2}日/)[0]
  const time = makeField('time', '发生时间', timeHit?.text || '', timeHit, timeHit && /月|季度/.test(timeHit.text) ? 'high' : 'low')

  const amountHits = findAll(text, /(?:约)?[\d,]+(?:\.\d+)?元/)
  const amounts = amountHits.map((h) => Number(h.text.replace(/[^\d.]/g, '')) || 0)
  const amount = makeField('amount', '涉及金额', amountHits.map((h) => h.text).join('、'), amountHits[0], amountHits.length ? 'high' : 'low')

  const demandSentence = [...sentences(text)].reverse().find((s) => /希望|要求|请求|请(?:上级|纪委|组织)?/.test(s.text))
  const demand = makeField(
    'demand',
    '反映人诉求',
    demandSentence ? demandSentence.text.replace(/。$/, '') : '',
    demandSentence ? { start: demandSentence.start, end: demandSentence.start + demandSentence.text.length } : undefined,
    demandSentence ? 'high' : 'low',
  )

  const codes = [...new Set(findAll(text, /[A-Z]{2}-[A-Z]{2}-\d{4}-\d{2,3}/).map((h) => h.text))]
  const companies = [
    ...new Set(
      findAll(text, /[\u4e00-\u9fa5]{2}(?:建设工程有限公司|农机服务社|园林公司|有限公司|服务社)/).map((h) => h.text),
    ),
  ]

  return {
    fields: { accused, unit, issue, time, amount, demand },
    persons,
    codes,
    companies,
    amounts,
    issueTypes,
  }
}

export const FIELD_ORDER: FieldKey[] = ['accused', 'unit', 'issue', 'time', 'amount', 'demand']

// ── 六大纪律参考标尺（不作违纪定性） ──
const DISCIPLINES = ['政治纪律', '组织纪律', '廉洁纪律', '群众纪律', '工作纪律', '生活纪律'] as const
const DISCIPLINE_RULES: Record<(typeof DISCIPLINES)[number], RegExp> = {
  政治纪律: /对抗组织审查|串供|销毁[^。]{0,8}凭证/,
  组织纪律: /选拔|民主推荐|未经[^。]{0,20}(?:会议|研究)|擅自/,
  廉洁纪律: /回扣|低于[^。]{0,10}市场|亲属|亲戚|侄子|妻弟|吃喝|工作餐|个人账户|挪用|利益关系|跑腿费|送烟酒|承揽/,
  群众纪律: /吃拿卡要|低保|拖着不办|收取[^。]{0,6}费|困难的几户|补助|补贴/,
  工作纪律: /无法正常办公|没公示|没开|不作为/,
  生活纪律: /饮酒|赌博|作风散漫/,
}
const RISK_WORDS: { word: string; re: RegExp; weight: number }[] = [
  { word: '对抗审查', re: /串供|销毁[^。]{0,8}凭证|对抗组织审查/, weight: 4 },
  { word: '工程回扣', re: /回扣|帮助[^。]{0,12}承揽/, weight: 4 },
  { word: '吃拿卡要', re: /吃拿卡要|请吃饭|送烟酒|跑腿费/, weight: 3 },
  { word: '低价发包', re: /低于[^。]{0,10}市场价格?|周边[^。]{0,10}都要/, weight: 3 },
  { word: '挪用资金', re: /个人账户|挪用/, weight: 3 },
  { word: '违规补贴', re: /不符合条件[^。]{0,6}亲属|虚报|补助[^。]{0,4}收取/, weight: 3 },
  { word: '围标串标', re: /围标|串标|商量好/, weight: 3 },
  { word: '优亲厚友', re: /亲属|亲戚|关系户|侄子|妻弟/, weight: 2 },
  { word: '公款吃喝', re: /吃喝|工作餐/, weight: 2 },
]

export function gradeClue(clue: ClueRecord, parsed: ParsedClue) {
  const tags = DISCIPLINES.map((name) => ({ name, hits: findAll(clue.content, DISCIPLINE_RULES[name]).length })).filter((t) => t.hits > 0)
  const hitWords = RISK_WORDS.filter((r) => r.re.test(clue.content))
  const reasons: string[] = []
  let score = hitWords.reduce((s, r) => s + r.weight, 0)
  if (hitWords.length) reasons.push(`识别风险关键词：${hitWords.map((w) => w.word).join('、')}`)
  if (parsed.fields.accused.value) {
    score += 2
    reasons.push(`指向明确被反映人：${parsed.fields.accused.value}`)
  }
  const maxAmt = Math.max(0, ...parsed.amounts)
  if (maxAmt >= 30000) {
    score += 2
    reasons.push(`涉及金额较高（${maxAmt.toLocaleString('zh-CN')} 元）`)
  } else if (maxAmt > 0) {
    score += 1
  }
  if (parsed.codes.length) {
    score += 1
    reasons.push(`含可碰撞编号：${parsed.codes.join('、')}`)
  }
  if (tags.some((t) => t.name === '政治纪律')) {
    score += 2
    reasons.push('涉及政治纪律线索，建议优先核查')
  }
  if (parsed.issueTypes.length === 1 && parsed.issueTypes[0] === '咨询求助') {
    return {
      tags,
      words: [] as string[],
      score: 0,
      level: 'low' as RiskLevel,
      nonDisciplinary: true,
      reasons: ['属于社区咨询或民生报修诉求，系统建议转办政务热线或职能部门处理'],
    }
  }
  const level: RiskLevel = score >= 9 ? 'high' : score >= 4 ? 'mid' : 'low'
  return { tags, words: hitWords.map((w) => w.word), score, level, nonDisciplinary: false, reasons }
}

export interface SimilarClueMatch {
  other: ClueRecord
  kind: 'duplicate' | 'multi'
  similarity: number
  reasons: string[]
  sentencePairs: { a: string; b: string }[]
}

export function findSimilarClues(target: ClueRecord, all: ClueRecord[]): SimilarClueMatch[] {
  const tp = parseClueText(target.content, target.overrides)
  const tAccused = tp.fields.accused.value.replace(/（.*$/, '')
  const out: SimilarClueMatch[] = []

  for (const other of all) {
    if (other.id === target.id) continue
    const op = parseClueText(other.content, other.overrides)
    const oAccused = op.fields.accused.value.replace(/（.*$/, '')
    const sim = textSimilarity(target.content, other.content)
    const reasons: string[] = []

    if (tAccused && tAccused === oAccused) reasons.push(`同一被反映人：${tAccused}`)
    const codes = tp.codes.filter((c) => op.codes.includes(c))
    if (codes.length) reasons.push(`同一合同/项目编号：${codes.join('、')}`)
    const companies = tp.companies.filter((c) => op.companies.includes(c))
    if (companies.length) reasons.push(`同一关联企业：${companies.join('、')}`)
    if (target.village === other.village) reasons.push(`同一村居：${target.village}`)

    if (reasons.filter((r) => !r.startsWith('同一村居')).length === 0) continue

    const isDup = sim >= 0.52 && target.village === other.village
    const sa = sentences(target.content)
    const sb = sentences(other.content).map((s) => ({ ...s, set: bigrams(s.text) }))
    const pairs = sa
      .flatMap((s) => {
        const best = sb.map((x) => ({ x, s: jaccard(bigrams(s.text), x.set) })).sort((p, q) => q.s - p.s)[0]
        return best && best.s >= 0.35 ? [{ a: s.text.trim(), b: best.x.text.trim() }] : []
      })
      .slice(0, 3)

    if (isDup) {
      reasons.unshift(`文本重合度 ${Math.round(sim * 100)}%`)
    } else {
      reasons.unshift(`不同渠道 / 不同事由关联（${target.channel} ↔ ${other.channel}）`)
    }

    out.push({
      other,
      kind: isDup ? 'duplicate' : 'multi',
      similarity: sim,
      reasons,
      sentencePairs: pairs,
    })
  }
  return out.sort((a, b) => b.similarity - a.similarity)
}

// ── 大数据穿透监督四库碰撞引擎 ──
const yuan = (n: number) => `${n.toLocaleString('zh-CN')} 元`

export function screenAllSupervision(today: string): SupervisionFinding[] {
  const out: SupervisionFinding[] = []

  // 1. 农村三资
  for (const c of CONTRACTS) {
    const paid = RECEIPTS.filter((r) => r.contractId === c.id)
    const received = paid.reduce((s, r) => s + r.amount, 0)
    const place = `${townName(c.town)} · ${c.village} · ${c.asset}`

    if (c.dueDate < today && received < c.annualRent && c.end >= today) {
      const gap = c.annualRent - received
      out.push({
        id: `AS-${c.id}-unpaid`,
        tab: 'assets',
        rule: '租金到期未足额入账',
        level: gap >= 20000 ? 'high' : 'mid',
        title: `${c.village}合同 ${c.id} 租金应收 ${yuan(c.annualRent)}，流水仅见 ${yuan(received)}`,
        subject: place,
        town: c.town,
        amount: gap,
        date: c.dueDate,
        sourceSystem: '农村三资合同台账 × 村集体银行流水',
        evidence: [
          { label: '合同编号与资产', value: `${c.id}（${c.asset}）` },
          { label: '承租方', value: c.tenant },
          { label: '约定年租金 / 应付日', value: `${yuan(c.annualRent)}（${c.dueDate} 前）` },
          { label: '流水已关联收款', value: paid.length ? paid.map((r) => `${r.date} ${yuan(r.amount)}（${r.method}）`).join('；') : '无' },
          { label: '待核对差额', value: yuan(gap) },
        ],
        basis: '合同约定收款节点已过，银行流水合计少于约定年租金。可能存在分期协议未上传、线下代收未入账或拖欠租金，需核对原始账簿。',
      })
    }

    const ratio = c.annualRent / c.marketRent
    if (ratio < 0.7) {
      out.push({
        id: `AS-${c.id}-lowprice`,
        tab: 'assets',
        rule: '租金显著低于周边参考价',
        level: ratio < 0.6 ? 'high' : 'mid',
        title: `${c.village}${c.kind}年租 ${yuan(c.annualRent)}，仅为周边参考价的 ${Math.round(ratio * 100)}%`,
        subject: place,
        town: c.town,
        amount: c.marketRent - c.annualRent,
        date: c.start,
        sourceSystem: '三资合同库 × 同区域资产指导价库',
        evidence: [
          { label: '合同编号', value: c.id },
          { label: '承租方', value: c.tenant },
          { label: '合同约定租金', value: `${yuan(c.annualRent)} / 年` },
          { label: '周边同类参考价', value: `${yuan(c.marketRent)} / 年` },
          { label: '民主决策 / 公示', value: `村民代表会议：${c.meeting ? '有记录' : '未见记录'}；结果公示：${c.publicity ? '已公示' : '未公示'}` },
        ],
        basis: '合同定价低于同类资产指导参考价 70%，且部分资产缺少民主决策或公开竞价凭证，需调阅议事纪要核实定价依据。',
      })
    }

    if (c.end < today && c.renewed === false) {
      out.push({
        id: `AS-${c.id}-expired`,
        tab: 'assets',
        rule: '合同到期未续签未收回',
        level: 'mid',
        title: `${c.village}门面合同 ${c.id} 已于 ${c.end} 到期，未见续签或收回记录`,
        subject: place,
        town: c.town,
        date: c.end,
        sourceSystem: '三资合同台账 × 资产盘点状态',
        evidence: [
          { label: '合同编号', value: c.id },
          { label: '原承租方', value: c.tenant },
          { label: '合同到期日', value: c.end },
          { label: '续签及到期后流水', value: '未见续签协议，到期后无租金入账' },
        ],
        basis: '合同期满后系统未检索到续签协议或资产收回交接单，需核查是否存在无偿继续占用情形。',
      })
    }
  }

  // 重复发票与白条
  const byVoucherNo = new Map<string, typeof VOUCHERS>()
  VOUCHERS.filter((v) => v.voucherNo !== '—').forEach((v) =>
    byVoucherNo.set(v.voucherNo, [...(byVoucherNo.get(v.voucherNo) || []), v]),
  )
  for (const [no, list] of byVoucherNo) {
    if (list.length > 1) {
      out.push({
        id: `AS-dup-${no}`,
        tab: 'assets',
        rule: '同一发票号重复报账',
        level: 'high',
        title: `${list[0]!.village}同一发票号 ${no} 在不同日期报账 ${list.length} 次`,
        subject: `${townName(list[0]!.town)} · ${list[0]!.village}`,
        town: list[0]!.town,
        amount: list.slice(1).reduce((s, v) => s + v.amount, 0),
        date: list[0]!.date,
        sourceSystem: '村级财务凭证库 × 发票查重引擎',
        evidence: list.map((v) => ({
          label: `凭证 ${v.id}（${v.date}）`,
          value: `${v.item} ${yuan(v.amount)} · 发票 ${v.voucherNo} · 审批人：${v.approver}`,
        })),
        basis: '同一发票号码在多个记账凭证中重复出现，需调取原件核实是否为错贴或重复报销。',
      })
    }
  }

  const whiteSlips = VOUCHERS.filter((v) => v.type === '白条')
  if (whiteSlips.length) {
    const sum = whiteSlips.reduce((s, v) => s + v.amount, 0)
    out.push({
      id: 'AS-slip-donghe',
      tab: 'assets',
      rule: '白条入账列支工作餐',
      level: 'mid',
      title: `东河村发现 ${whiteSlips.length} 笔以“白条”入账的工作餐支出，合计 ${yuan(sum)}`,
      subject: '乡镇F · 东河村村级财务',
      town: 'donghe',
      amount: sum,
      date: whiteSlips[0]!.date,
      sourceSystem: '村级财务记账凭证扫描校验',
      evidence: whiteSlips.map((v) => ({
        label: `${v.id}（${v.date}）`,
        value: `${v.item} ${yuan(v.amount)}（${v.type}，无税务发票号）· 审批：${v.approver}`,
      })),
      basis: '村集体资金列支未附正规税务发票及接待明细清单，且与信访线索 XF-2026-0110 反映的吃喝问题相互印证。',
    })
  }

  for (const a of IDLE_ASSETS) {
    const months = Math.floor(daysBetween(a.idleSince, today) / 30)
    if (months >= 18) {
      out.push({
        id: `AS-${a.id}-idle`,
        tab: 'assets',
        rule: '集体资产长期闲置',
        level: months >= 24 ? 'high' : 'mid',
        title: `${a.village}${a.name}（账面 ${yuan(a.value)}）已闲置 ${months} 个月`,
        subject: `${townName(a.town)} · ${a.village}`,
        town: a.town,
        amount: a.value,
        date: a.idleSince,
        sourceSystem: '扶贫/集体资产台账 × 收益流水',
        evidence: [
          { label: '资产编号', value: a.id },
          { label: '账面价值', value: yuan(a.value) },
          { label: '闲置起始日期', value: `${a.idleSince}（累计约 ${months} 个月）` },
        ],
        basis: '资产投入使用或移交后长期未产生租用及运营记录，需核查资产管护责任与盘活障碍。',
      })
    }
  }

  // 2. 惠民惠农资金
  const grantGroups = new Map<string, typeof GRANTS>()
  GRANTS.forEach((g) => grantGroups.set(`${g.idNo}|${g.item}|${g.period}`, [...(grantGroups.get(`${g.idNo}|${g.item}|${g.period}`) || []), g]))
  for (const list of grantGroups.values()) {
    if (list.length > 1) {
      const g = list[0]!
      const villages = [...new Set(list.map((x) => x.village))]
      out.push({
        id: `SB-multi-${g.id}`,
        tab: 'subsidy',
        rule: villages.length > 1 ? '跨村一人多领补贴' : '同项目重复申领',
        level: 'high',
        title: `${g.name}在 ${villages.join('、')} 重复领取 ${g.item} ${list.length} 笔`,
        subject: `${townName(g.town)} · ${g.name}（${g.idNo}）`,
        town: g.town,
        amount: list.slice(1).reduce((s, x) => s + x.amount, 0),
        date: g.period,
        sourceSystem: '惠民补贴发放名册 × 公安户籍与耕地确权库',
        evidence: list.map((x) => ({
          label: `${x.id} · ${x.village}`,
          value: `${x.item} ${yuan(x.amount)}${x.parcel ? `（地块 ${x.parcel}）` : ''}`,
        })),
        basis: '同一身份证号在同一发放年度出现多条同项补贴记录，其中地块 SQ-0431 确权登记人并非本人，需核实是否虚报或代领。',
      })
    }
  }

  for (const g of GRANTS) {
    const r = RESIDENTS.find((x) => x.idNo === g.idNo)
    if (r?.status === '死亡') {
      out.push({
        id: `SB-dead-${g.id}`,
        tab: 'subsidy',
        rule: '户籍注销后继续发放',
        level: 'high',
        title: `${g.name}已于 ${r.date} 死亡注销，2026 年仍发放${g.item} ${yuan(g.amount)}`,
        subject: `${townName(g.town)} · ${g.village} · ${g.name}`,
        town: g.town,
        amount: g.amount,
        date: r.date,
        sourceSystem: '惠民补贴发放名册 × 公安户籍死亡注销库',
        evidence: [
          { label: '补贴发放记录', value: `${g.id} · ${g.item} ${yuan(g.amount)}` },
          { label: '公安户籍状态', value: `已死亡注销（注销日期 ${r.date}）` },
        ],
        basis: '户籍数据与补贴发放周期存在时间冲突，可能存在停发滞后或家属未及时申报变更，需核实资金去向与退缴情况。',
      })
    }
    if (r?.status === '迁出') {
      out.push({
        id: `SB-moved-${g.id}`,
        tab: 'subsidy',
        rule: '户籍迁出仍领属地补贴',
        level: 'mid',
        title: `${g.name}户籍已于 ${r.date} 迁出，仍在本村领取${g.item}`,
        subject: `${townName(g.town)} · ${g.village} · ${g.name}`,
        town: g.town,
        amount: g.amount,
        date: r.date,
        sourceSystem: '补贴发放名册 × 户籍迁出库',
        evidence: [
          { label: '发放记录', value: `${g.id} · ${g.item} ${yuan(g.amount)}` },
          { label: '户籍状态', value: `迁出（${r.date}）` },
          { label: '关联地块', value: `${g.parcel || '—'}（面积 ${LANDS.find((l) => l.parcel === g.parcel)?.area ?? '—'} 亩）` },
        ],
        basis: '户籍迁出后是否仍实际耕种承包地需核查土地流转实际情况。',
      })
    }
    const ins = INSURANCES.find((i) => i.idNo === g.idNo)
    if (g.item === '困难群众救助' && ins) {
      out.push({
        id: `SB-ins-${g.id}`,
        tab: 'subsidy',
        rule: '参保身份与救助资格冲突',
        level: 'high',
        title: `${g.name}为${ins.pension}人员，仍在领取困难群众救助 ${yuan(g.amount)}`,
        subject: `${townName(g.town)} · ${g.village} · ${g.name}`,
        town: g.town,
        amount: g.amount,
        date: g.period,
        sourceSystem: '困难救助发放名册 × 机关事业养老及职工医保库',
        evidence: [
          { label: '救助发放记录', value: `${g.id} · ${yuan(g.amount)}` },
          { label: '社保参保状态', value: `${ins.pension} / ${ins.medical}` },
        ],
        basis: '享有财政供养或稳定退休保障人员原则上不符合特困救助条件，需核查家庭收入复核材料。',
      })
    }
  }

  // 3. 政府采购与工程招投标
  const co = (name: string) => COMPANIES.find((c) => c.name === name)
  for (const p of PROJECTS) {
    const prices = p.bids.map((b) => b.price)
    const mean = prices.reduce((s, x) => s + x, 0) / prices.length
    const cv = Math.sqrt(prices.reduce((s, x) => s + (x - mean) ** 2, 0) / prices.length) / mean
    if (cv < 0.015) {
      out.push({
        id: `CG-${p.id}-converge`,
        tab: 'procurement',
        rule: '投标报价高度趋同',
        level: 'mid',
        title: `${p.name}多家投标报价离散度仅 ${(cv * 100).toFixed(2)}%`,
        subject: `${p.id} · ${p.owner}`,
        town: p.town,
        amount: p.budget,
        date: p.date,
        sourceSystem: '公共资源交易报价库',
        evidence: [
          ...p.bids.map((b) => ({ label: b.company, value: `报价 ${yuan(b.price)} · 工期 ${b.days} 天` })),
          { label: '预算控制价 / 离散系数', value: `${yuan(p.budget)} / ${(cv * 100).toFixed(2)}%` },
        ],
        basis: '三家报价紧贴预算上限且方差极小，存在陪标、协同报价疑点。',
      })
    }
    for (let i = 0; i < p.bids.length; i++) {
      for (let j = i + 1; j < p.bids.length; j++) {
        const a = co(p.bids[i]!.company)
        const b = co(p.bids[j]!.company)
        if (!a || !b) continue
        const shared = [
          a.legalRep === b.legalRep && `法定代表人均为「${a.legalRep}」`,
          a.phone === b.phone && `联系电话完全一致（${a.phone}）`,
          a.address.slice(0, 8) === b.address.slice(0, 8) && `注册地址同楼栋（${a.address} ↔ ${b.address}）`,
        ].filter(Boolean) as string[]
        if (shared.length) {
          out.push({
            id: `CG-${p.id}-related-${i}${j}`,
            tab: 'procurement',
            rule: '投标企业存在工商关联',
            level: 'high',
            title: `${p.name}中标方「${a.name.replace(/工程有限公司|有限公司/, '')}」与竞标方存在关联`,
            subject: `${p.id} · ${p.owner}`,
            town: p.town,
            amount: p.budget,
            date: p.date,
            sourceSystem: '公共资源交易投标库 × 市场监管企业登记库',
            evidence: [
              ...shared.map((v) => ({ label: '工商关联命中', value: v })),
              { label: '技术标书文本相似度', value: `${Math.round(textSimilarity(p.bids[i]!.doc, p.bids[j]!.doc) * 100)}%` },
              { label: '中标单位', value: p.winner },
            ],
            basis: '同项目竞争投标人之间共用法人、电话与办公地址且技术标书高度雷同，涉嫌围标串标，需调阅评标档案。',
          })
        }
      }
    }
    const win = p.bids.find((b) => b.company === p.winner)!
    const others = p.bids.filter((b) => b.company !== p.winner).map((b) => b.days).sort((a, b) => a - b)
    const median = others[Math.floor(others.length / 2)] || win.days
    if (win.days < median * 0.5) {
      out.push({
        id: `CG-${p.id}-days`,
        tab: 'procurement',
        rule: '异常低工期高分中标',
        level: 'mid',
        title: `${p.name}中标工期仅 ${win.days} 天（不足他方一半）却获 95 分`,
        subject: `${p.id} · ${p.owner}`,
        town: p.town,
        amount: win.price,
        date: p.date,
        sourceSystem: '公共资源交易评审库',
        evidence: p.bids.map((b) => ({
          label: b.company + (b.company === p.winner ? '（中标）' : ''),
          value: `报价 ${yuan(b.price)} · 工期 ${b.days} 天 · 得分 ${b.score}`,
        })),
        basis: '中标方承诺工期明显违背常规施工周期，需核实实际开工完工验收日期及是否存在事后工期变更。',
      })
    }
  }

  // 4. 公务支出与四风
  const splitMeals = MEAL_INVOICES.filter((m) => m.date === '2026-10-17')
  if (splitMeals.length >= 2) {
    out.push({
      id: 'GW-split-meal',
      tab: 'expense',
      rule: '同日连号拆分餐饮发票',
      level: 'high',
      title: `县住建局 10月17日 22:30—22:41 同酒楼连开 3 张近千元发票`,
      subject: '县住建局 · 运河人家酒楼',
      amount: splitMeals.reduce((s, m) => s + m.amount, 0),
      date: '2026-10-17',
      sourceSystem: '财政电子票据池 × 报销规则引擎',
      evidence: splitMeals.map((m) => ({
        label: `发票 ${m.id}（${m.time}）`,
        value: `${m.vendor} · 金额 ${yuan(m.amount)}（单张卡在 1,000 元审批线以下）`,
      })),
      basis: '同一单位于深夜 11 分钟内在同一餐饮商户连续开具 3 张金额 960–990 元发票，疑似拆分金额规避大额审批。',
    })
  }

  const localRec = RECEPTIONS.filter((r) => r.local && !r.letter)
  if (localRec.length) {
    out.push({
      id: 'GW-local-rec',
      tab: 'expense',
      rule: '无公函同城接待',
      level: 'mid',
      title: `乡镇F 9月发生 ${localRec.length} 笔县内部门同城接待，均无派出公函`,
      subject: '乡镇F人民政府 · 公务接待台账',
      town: 'donghe',
      amount: localRec.reduce((s, r) => s + r.amount, 0),
      date: localRec[0]!.date,
      sourceSystem: '公务接待报销台账 × 政务公函库',
      evidence: localRec.map((r) => ({
        label: `${r.id}（${r.date}）`,
        value: `${r.guest} · ${r.people} 人 · ${yuan(r.amount)}（无公函）`,
      })),
      basis: '同城部门调研检查原则上不安排公务接待，且缺乏公函依据，需核实接待必要性与列支渠道。',
    })
  }

  for (const a of ALLOWANCES.filter((x) => x.basis === '无' || x.basis === '镇自定')) {
    out.push({
      id: `GW-allow-${a.id}`,
      tab: 'expense',
      rule: '无明确政策依据发放津补贴',
      level: a.basis === '无' ? 'high' : 'mid',
      title: `${a.dept}发放「${a.item}」${yuan(a.amount)}，依据为「${a.basis}」`,
      subject: `${a.dept} · ${a.person}`,
      town: a.town,
      amount: a.amount,
      date: a.month,
      sourceSystem: '财政统发工资库 × 人社津补贴标准目录',
      evidence: [
        { label: '发放单位与对象', value: `${a.dept} · ${a.person}` },
        { label: '项目及金额', value: `${a.item} · ${yuan(a.amount)}（${a.month}）` },
        { label: '自报依据', value: a.basis },
      ],
      basis: '不在全县统一核定津补贴目录内，需调阅上级政策文件及资金来源凭证。',
    })
  }

  for (const trip of CAR_TRIPS) {
    out.push({
      id: `GW-car-${trip.id}`,
      tab: 'expense',
      rule: '公车节假日异常轨迹',
      level: trip.km > 300 ? 'high' : 'mid',
      title: `公车 ${trip.plate} 周末驶往「${trip.route}」${trip.km} 公里（事由：${trip.purpose}）`,
      subject: `${trip.dept} · ${trip.plate}`,
      town: trip.town,
      date: trip.date,
      sourceSystem: '公务用车定位轨迹 × 派车审批单',
      evidence: [
        { label: '车牌与所属单位', value: `${trip.plate}（${trip.dept}）` },
        { label: '行驶时间与轨迹', value: `${trip.date}（周末）· ${trip.route}（${trip.km} km）` },
        { label: '派车单登记状态', value: trip.purpose },
      ],
      basis: '非工作日公车轨迹驶向景区或商圈且无完整派车审批记录，需核查是否公车私用。',
    })
  }

  return out
}

// ── 巡察智能阅卷与整改核查 ──
export interface ReadFinding {
  id: string
  docId: string
  target: string
  rule: string
  level: RiskLevel
  title: string
  start: number
  end: number
  excerpt: string
  basis: string
}

const cnDate = (s: string) => s.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, (_, y, m, d) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)

export function readInspectionDoc(doc: InspDoc): ReadFinding[] {
  const out: ReadFinding[] = []
  const add = (rule: string, level: RiskLevel, title: string, s: number, e: number, basis: string) => {
    out.push({ id: `${doc.id}-${out.length + 1}`, docId: doc.id, target: doc.target, rule, level, title, start: s, end: e, excerpt: doc.text.slice(s, e), basis })
  }
  const hit = (re: RegExp) => {
    const m = re.exec(doc.text)
    return m ? { s: m.index, e: m.index + m[0].length, m } : null
  }
  const t = doc.text

  let h = hit(/记录人：[ \t]*(?=\n)/)
  if (h) add('记录要素缺失', 'mid', '会议记录未填写记录人', h.s, h.e, '会议记录须载明记录人，保证可追溯性。')
  h = hit(/讨论情况：（空）/)
  if (h) add('讨论过程空白', 'high', '研究重大工程事项未记录讨论情况', h.s, h.e, '“三重一大”事项须逐人记录讨论及表决意见。')
  h = hit(/授课内容未记录[^\n。]*/)
  if (h) add('组织生活形式化', 'low', '党课未记录实际授课内容', h.s, h.e, '党课记录需附简要提纲与内容纪要。')
  h = hit(/记录与[^\n]{0,16}完全相同/)
  if (h) add('组织生活形式化', 'mid', '连续两次党员大会记录雷同', h.s, h.e, '疑似照抄照搬补写记录，流于形式。')
  h = hit(/同一笔迹代签/)
  if (h) add('组织生活形式化', 'mid', '签到疑似同一笔迹代签', h.s, h.e, '会议签到应当由本人亲笔签署。')

  const att = hit(/应到(\d+)人，实到(\d+)人/)
  if (att && Number(att.m[2]) / Number(att.m[1]) < 2 / 3) {
    add('参会人数不足', 'high', `到会 ${att.m[2]}/${att.m[1]} 人，不足法定三分之二`, att.s, att.e, '集体决策会议到会人数应超过应到人数的 2/3。')
  }
  const votes = hit(/同意(\d+)票/)
  if (votes && att && Number(votes.m[1]) <= Number(att.m[1]) / 2) {
    add('表决票数未过半', 'high', `赞成 ${votes.m[1]} 票未过应到 ${att.m[1]} 人半数`, votes.s, votes.e, '决策事项应经应到会成员半数以上同意方可有效。')
  }
  if (doc.kind === '三重一大') {
    const v = hit(/表决情况：一致同意/)
    if (v) add('表决记录不规范', 'mid', '仅记“一致同意”，未见逐人表决票数', v.s, v.e, '“三重一大”决策应明确票数及不同意见。')
  }

  const meet = /会议时间：(\d{4}年\d{1,2}月\d{1,2}日)/.exec(t)
  const signed = hit(/合同已于(\d{4}年\d{1,2}月\d{1,2}日)签订/)
  if (meet && signed && cnDate(signed.m[1]!) < cnDate(meet[1]!)) {
    add('决策程序倒置', 'high', `合同签订早于会议决策 ${daysBetween(cnDate(signed.m[1]!), cnDate(meet[1]!))} 天`, signed.s, signed.e, '属于典型的“先签合同、后补会议”。')
  }
  h = hit(/合同自[^\n，]*起执行，现补办[^\n。]*/)
  if (h) add('决策程序倒置', 'high', '合同先执行后补办议事手续', h.s, h.e, '违反“先决策、后执行”集体资产管理规定。')
  h = hit(/会议日期晚于付款日期/)
  if (h) add('决策程序倒置', 'high', '资金支付早于会议集体决策', h.s, h.e, '资金拨付应在民主决策通过后执行。')

  const pub = hit(/公示时间：(\d{4}年\d{1,2}月\d{1,2}日)至(\d{1,2})月(\d{1,2})日/)
  if (pub) {
    const s = cnDate(pub.m[1]!)
    const e = `${s.slice(0, 4)}-${pub.m[2]!.padStart(2, '0')}-${pub.m[3]!.padStart(2, '0')}`
    const days = daysBetween(s, e) + 1
    if (days < 5) add('公示时间不足', 'mid', `公示仅 ${days} 天，少于规定的 5 个工作日`, pub.s, pub.e, '惠民补助名单应公示不少于 5 个工作日。')
  }
  h = hit(/监督电话：未注明/)
  if (h) add('公示要素缺失', 'low', '公示栏未公布监督举报电话', h.s, h.e, '群众监督渠道缺失。')
  h = hit(/附件：白条[^\n。]*/)
  if (h) add('财务票据不规范', 'mid', '白条入账列支', h.s, h.e, '财务支出应附合法有效税务票据。')
  h = hit(/无合同、无验收单/)
  if (h) add('财务手续严重缺失', 'high', '8.6 万元工程支出无合同且无验收单', h.s, h.e, '大额工程付款须附施工合同、验收单及结算票据。')

  return out
}

const VAGUE_PHRASES = ['高度重视', '进一步加强', '今后将', '切实提高认识', '严格按照要求', '进行了整理']

export function checkRectify(issue: FeedbackIssue, text: string, attachments: string[], today: string, closed: boolean) {
  const matched = issue.keywords.filter((k) => text.includes(k))
  const coverage = issue.keywords.length ? matched.length / issue.keywords.length : 0
  const concrete = /\d{4}年\d{1,2}月\d{1,2}日|[\d,]{3,}元|《[^》]+》|一是|二是/.test(text)
  const vague = VAGUE_PHRASES.filter((v) => text.includes(v))
  const overdue = !closed && issue.deadline < today

  const checks = [
    { label: '靶向回应问题要点', ok: coverage >= 0.4, detail: coverage >= 0.4 ? `已正面回应：${matched.join('、')}` : `仅覆盖 ${matched.length}/${issue.keywords.length} 个核心关键词` },
    { label: '措施具体可核验', ok: concrete && vague.length < 2, detail: concrete && vague.length < 2 ? '含具体会议时间、金额、制度名称等可查证抓手' : `表态性空话偏多（${vague.join('、') || '缺具体动作'}）` },
    { label: '佐证附件支撑', ok: attachments.length >= 2, detail: attachments.length ? `已附 ${attachments.length} 份佐证（${attachments.join('、')}）` : '未上传任何佐证材料，警惕“纸面整改”' },
    { label: '整改进度时限', ok: !overdue, detail: overdue ? `已超期（截止 ${issue.deadline}）` : `截止日期 ${issue.deadline}` },
  ]
  const fails = checks.filter((c) => !c.ok).length
  const level: RiskLevel = fails >= 3 ? 'high' : fails >= 1 ? 'mid' : 'low'
  return { checks, level, vague, matched }
}

// ── 实体关系图谱 & 全景研判合成 ──
export interface GraphNode {
  id: string
  label: string
  type: 'person' | 'company' | 'project' | 'clue' | 'village'
  weight: number
  clues: string[]
}

export interface GraphEdge {
  source: string
  target: string
  label: string
}

export function buildEntityGraph(clues: ClueRecord[]) {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []

  const ensure = (id: string, label: string, type: GraphNode['type'], clueId: string) => {
    const existing = nodes.get(id) || { id, label, type, weight: 0, clues: [] }
    if (!existing.clues.includes(clueId)) {
      existing.clues.push(clueId)
      existing.weight = existing.clues.length
    }
    nodes.set(id, existing)
    return id
  }

  for (const clue of clues) {
    const parsed = parseClueText(clue.content, clue.overrides)
    const cId = ensure(`c:${clue.id}`, clue.id.replace('XF-2026-', '线索 '), 'clue', clue.id)
    const accused = parsed.fields.accused.value.replace(/（.*$/, '')
    if (accused) {
      const pId = ensure(`p:${accused}`, accused, 'person', clue.id)
      edges.push({ source: cId, target: pId, label: '被反映人' })
    }
    ensure(`v:${clue.village}`, clue.village, 'village', clue.id)
    edges.push({ source: cId, target: `v:${clue.village}`, label: '发生地' })

    for (const code of parsed.codes) {
      const jId = ensure(`j:${code}`, code, 'project', clue.id)
      edges.push({ source: cId, target: jId, label: '涉及合同/工程' })
    }
    for (const coName of parsed.companies) {
      const shortCo = coName.replace(/工程有限公司|有限公司/, '')
      const oId = ensure(`o:${coName}`, shortCo, 'company', clue.id)
      edges.push({ source: cId, target: oId, label: '涉及企业' })
      if (accused) edges.push({ source: `p:${accused}`, target: oId, label: '利益关联待核' })
    }
  }

  // 叠加招投标企业关联边
  edges.push({ source: 'o:鑫路建设工程有限公司', target: 'o:恒基市政工程有限公司', label: '同法人秦某/同电话' })
  ensure('o:恒基市政工程有限公司', '恒基市政', 'company', 'XQ-GC-2026-07')

  const seen = new Set<string>()
  const uniqueEdges = edges.filter((e) => {
    const key = [e.source, e.target].sort().join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { nodes: [...nodes.values()], edges: uniqueEdges }
}

export function synthesizeEntityBrief(
  query: string,
  clues: ClueRecord[],
  findings: SupervisionFinding[],
  issues: FeedbackIssue[],
  cases: CaseFile[],
  cadres: Cadre[],
) {
  const q = query.trim()
  if (!q) return null

  const hitClues = clues.filter((c) => c.content.includes(q) || c.village.includes(q))
  const hitFindings = findings.filter(
    (f) => f.title.includes(q) || f.subject.includes(q) || f.evidence.some((e) => e.value.includes(q)),
  )
  const hitIssues = issues.filter((i) => i.title.includes(q) || i.detail.includes(q) || i.owner.includes(q))
  const hitCases = cases.filter((c) => c.accused.includes(q) || c.title.includes(q) || c.materials.some((m) => m.text.includes(q)))
  const hitCadres = cadres.filter((c) => c.name.includes(q) || c.unit.includes(q))

  const focusPoints: string[] = []
  if (hitClues.length) focusPoints.push(`调取并对比 ${hitClues.map((c) => c.id).join('、')} 反映人原始笔录与诉求材料，核对是否存在重复反映及利益输送关系；`)
  if (hitFindings.length) focusPoints.push(`围绕大数据碰撞发现的 ${hitFindings.length} 项疑点（${hitFindings[0]!.rule}等），调取对公账户流水、民主议事会议原始签到与工商变更登记；`)
  if (hitIssues.length) focusPoints.push(`结合巡察组反馈问题 ${hitIssues.map((i) => i.id).join('、')}，核查“先签后补”或整改附件缺项是否已实质整改；`)
  if (hitCases.length) focusPoints.push(`参照在办案卷 ${hitCases.map((c) => c.id).join('、')} 进度，重点补齐未完成的证据要件与告知程序节点。`)

  return {
    query: q,
    hitClues,
    hitFindings,
    hitIssues,
    hitCases,
    hitCadres,
    totalHits: hitClues.length + hitFindings.length + hitIssues.length + hitCases.length + hitCadres.length,
    focusPoints,
  }
}
