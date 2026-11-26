/**
 * 涉纪舆情监测确定性规则引擎：
 * - 词包匹配与噪词过滤
 * - 安全文本高亮分段（杜绝 v-html）
 * - 改文快照逐句差异对比
 * - 现场模拟网帖实时研判与跨库实体碰撞
 * - 话题指标与 14 日声量曲线计算
 * - 结论前置 + 自动图表化 + 站内回链的专报结构构建
 */
import {
  sourceById,
  opinionCategories,
  type AcceptanceTag,
  type KeywordGroup,
  type MediaSourceId,
  type OpinionCategory,
  type OpinionPost,
  type OpinionTopicSeed,
} from '@/mock/opinion'
import { townName, towns } from '@/mock/geo'
import { addDays } from './deadline'
import type { RiskLevel } from '@/types'

export interface KeywordHit {
  groupId: string
  groupName: string
  category: OpinionCategory
  words: string[]
  excluded: boolean
}

export interface TextSegment {
  text: string
  hit: boolean
}

export interface SnapshotDiffPart {
  kind: 'same' | 'removed' | 'added'
  text: string
}

export interface CrossMatch {
  id: string
  sourceType: '信访线索' | '穿透监督' | '巡察台账' | '廉政档案' | '银行流水'
  title: string
  summary: string
  matchedBy: string
  to: string
  level?: RiskLevel
}

export interface CrossSourcePool {
  clues: { id: string; content: string; town: string; village: string; accused: string; issue: string; codes: string[]; receivedAt: string; level: RiskLevel }[]
  findings: { id: string; feature: string; rule: string; title: string; subject: string; town?: string; level: RiskLevel; evidenceText: string }[]
  inspDocs: { id: string; title: string; target: string; excerpt: string }[]
  cadres: { id: string; name: string; title: string; unit: string; town: string; openCount: number; cleanNote: string }[]
  bankHits: { id: string; subject: string; counterparty: string; amount: number; summary: string }[]
}

export interface SimulatedAnalysis {
  title: string
  content: string
  sourceId: MediaSourceId
  town: string
  village: string
  category: OpinionCategory
  acceptance: AcceptanceTag
  level: RiskLevel | 'info'
  matchedWords: string[]
  matchedGroups: string[]
  entities: { people: string[]; villages: string[]; codes: string[]; companies: string[] }
  crossMatches: CrossMatch[]
  aiQuote: string
  aiReason: string
}

export type ReportKind = 'weekly' | 'campaign' | 'clarify'

export interface ReportEventItem {
  n: number
  topicId: string
  postId: string
  title: string
  category: OpinionCategory
  level: RiskLevel | 'info'
  townText: string
  statusText: string
  summary: string
  sourceShort: string
  evidenceStatus: string
  crossCount: number
}

export interface OpinionReport {
  id: string
  kind: ReportKind
  title: string
  period: string
  generatedAt: string
  subtitle: string
  kpis: { label: string; value: number; unit: string; hint: string }[]
  conclusions: string[]
  trendLabels: string[]
  trendValues: number[]
  categoryDist: { label: string; value: number; color: string }[]
  sourceDist: { label: string; value: number; color: string }[]
  events: ReportEventItem[]
  recommendations: string[]
  markdown: string
  llmDraft?: string
}

/** 根据当前启用词包匹配单段文本（含排除词过滤） */
export function matchKeywords(text: string, groups: KeywordGroup[]): KeywordHit[] {
  const hits: KeywordHit[] = []
  for (const g of groups) {
    if (!g.enabled) continue
    const excluded = g.excludes.some(ex => ex.trim() && text.includes(ex.trim()))
    if (excluded) continue
    const words = g.words.filter(w => w.trim() && text.includes(w.trim()))
    if (words.length) hits.push({ groupId: g.id, groupName: g.name, category: g.category, words, excluded: false })
  }
  return hits
}

/** 安全分段高亮：不生成 HTML 字符串，供模板逐段渲染 <mark> */
export function highlightSegments(text: string, words: string[]): TextSegment[] {
  const clean = [...new Set(words.map(w => w.trim()).filter(w => w.length >= 2))].sort((a, b) => b.length - a.length)
  if (!clean.length || !text) return [{ text, hit: false }]
  const escaped = clean.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = text.split(re).filter(Boolean)
  const set = new Set(clean)
  return parts.map(p => ({ text: p, hit: set.has(p) }))
}

/** 改文快照逐句差异对比（按中文句号/问号/感叹号/分号拆分） */
export function diffSnapshots(before: string, after: string): SnapshotDiffPart[] {
  const split = (s: string) => s.split(/(?<=[。？！；\n])/).map(x => x.trim()).filter(Boolean)
  const a = split(before), b = split(after)
  const out: SnapshotDiffPart[] = []
  const bSet = new Set(b), aSet = new Set(a)
  for (const seg of a) {
    if (bSet.has(seg)) out.push({ kind: 'same', text: seg })
    else out.push({ kind: 'removed', text: seg })
  }
  for (const seg of b) {
    if (!aSet.has(seg)) out.push({ kind: 'added', text: seg })
  }
  return out
}

/** 跨库自动印证：围绕实体（人名、村居、项目/合同号、企业）碰撞主站各业务库 */
export function findCrossMatches(
  entities: { people: string[]; villages: string[]; codes: string[]; companies: string[] },
  town: string,
  pool: CrossSourcePool,
): CrossMatch[] {
  const results: CrossMatch[] = []
  const seen = new Set<string>()
  const push = (m: CrossMatch) => {
    const key = `${m.sourceType}:${m.id}`
    if (!seen.has(key)) { seen.add(key); results.push(m) }
  }

  const tokens = [
    ...entities.people,
    ...entities.codes,
    ...entities.companies,
    ...entities.villages,
  ].filter(t => t && t.length >= 2)

  if (!tokens.length) return results

  // 1. 信访线索库
  for (const c of pool.clues) {
    const hay = `${c.content} ${c.accused} ${c.village} ${c.codes.join(' ')}`
    const hit = entities.codes.find(k => hay.includes(k))
      || entities.people.find(k => hay.includes(k))
      || entities.companies.find(k => hay.includes(k))
      || (c.town === town ? entities.villages.find(v => c.village === v) : undefined)
    if (hit) {
      push({
        id: c.id,
        sourceType: '信访线索',
        title: `${c.id} · ${c.accused || c.village}`,
        summary: `${c.receivedAt} · ${c.issue || '待研判'}`,
        matchedBy: `命中「${hit}」`,
        to: `/clues/ledger?id=${c.id}`,
        level: c.level,
      })
    }
  }

  // 2. 穿透监督疑点（三资、惠民、招投标、公务支出）
  for (const f of pool.findings) {
    const hay = `${f.title} ${f.subject} ${f.evidenceText}`
    const hit = entities.codes.find(k => hay.includes(k))
      || entities.companies.find(k => hay.includes(k))
      || entities.people.find(k => hay.includes(k))
      || (f.town === town ? entities.villages.find(v => hay.includes(v)) : undefined)
    if (hit) {
      push({
        id: f.id,
        sourceType: '穿透监督',
        title: `${f.rule} · ${f.title}`,
        summary: f.subject,
        matchedBy: `命中「${hit}」`,
        to: `/supervision/${f.feature}?id=${f.id}`,
        level: f.level,
      })
    }
  }

  // 3. 巡察台账
  for (const d of pool.inspDocs) {
    const hay = `${d.title} ${d.target} ${d.excerpt}`
    const hit = entities.people.find(k => hay.includes(k))
      || entities.villages.find(v => hay.includes(v))
      || entities.codes.find(k => hay.includes(k))
    if (hit) {
      push({
        id: d.id,
        sourceType: '巡察台账',
        title: d.title,
        summary: d.excerpt,
        matchedBy: `命中「${hit}」`,
        to: `/inspection/reading?id=${d.id}`,
      })
    }
  }

  // 4. 廉政档案（客观履历与既往核查记录，不做定性）
  for (const cd of pool.cadres) {
    const hit = entities.people.find(p => cd.name === p || p.includes(cd.name))
    if (hit) {
      push({
        id: cd.id,
        sourceType: '廉政档案',
        title: `${cd.name} · ${cd.unit}${cd.title}`,
        summary: cd.openCount > 0 ? `在办关注记录 ${cd.openCount} 条（仅客观归集）` : cd.cleanNote,
        matchedBy: `主体一致「${hit}」`,
        to: `/archive/records?id=${cd.id}`,
      })
    }
  }

  // 5. 银行流水预警
  for (const b of pool.bankHits) {
    const hay = `${b.subject} ${b.counterparty} ${b.summary}`
    const hit = entities.people.find(k => hay.includes(k)) || entities.companies.find(k => hay.includes(k))
    if (hit) {
      push({
        id: b.id,
        sourceType: '银行流水',
        title: `${b.subject} ↔ ${b.counterparty}`,
        summary: `${b.amount.toLocaleString('en-US')} 元 · ${b.summary}`,
        matchedBy: `命中「${hit}」`,
        to: `/bankflow/ledger?id=${b.id}`,
        level: 'high',
      })
    }
  }

  return results
}

/** 现场模拟网帖实时研判：毫秒级抽取要素、判定受理边界并碰撞主站全库 */
export function analyzeSimulatedPost(
  title: string,
  content: string,
  sourceId: MediaSourceId,
  town: string,
  village: string,
  groups: KeywordGroup[],
  pool: CrossSourcePool,
): SimulatedAnalysis {
  const full = `${title} ${content}`.trim()
  const hits = matchKeywords(full, groups)
  const matchedWords = [...new Set(hits.flatMap(h => h.words))]
  const matchedGroups = hits.map(h => h.groupName)

  // 自动抽取文本中出现的已有主体、村居、合同/项目编号、企业名
  const knownPeople = [...new Set([...pool.cadres.map(c => c.name), '张某军', '李某华', '李某芳', '王某民', '赵某平', '吴某', '陈某明', '刘某刚', '孙某'])]
  const people = knownPeople.filter(p => full.includes(p))
  const allVillages = towns.flatMap(t => t.villages)
  const villages = [...new Set([village, ...allVillages.filter(v => full.includes(v))].filter(Boolean))]
  const codes = [...new Set(full.match(/[A-Z]{2,4}-[A-Z]{2}-\d{4}-\d{2,3}/g) || [])]
  const knownCompanies = ['禾川农机服务社', '鑫路建设工程有限公司', '鑫路建设', '绿森园林公司']
  const companies = knownCompanies.filter(co => full.includes(co))

  const entities = { people, villages, codes, companies }
  const crossMatches = findCrossMatches(entities, town, pool)

  // 判定归属类别与受理边界
  let category: OpinionCategory = '非纪检民生'
  if (hits.length) {
    const sorted = [...hits].sort((a, b) => b.words.length - a.words.length)
    category = sorted[0]!.category
  }

  let acceptance: AcceptanceTag = '非纪检受理·民生咨询'
  if (category === '涉纪不实传言') acceptance = '待核实·疑似不实传言'
  else if (category === '农村三资' || category === '工程招投标' || category === '惠民补贴' || /吃拿卡要|回扣|虚报|冒领|亲戚|套取/.test(full)) {
    acceptance = '拟研判·涉纪苗头'
  } else if (category === '作风效能' || category === '校园餐与民生') {
    acceptance = '拟督办·履职与作风'
  }

  let level: RiskLevel | 'info' = 'info'
  if (acceptance === '非纪检受理·民生咨询') {
    level = 'info'
  } else if (crossMatches.some(m => m.sourceType === '信访线索' || m.sourceType === '穿透监督') && matchedWords.length >= 2) {
    level = 'high'
  } else if (matchedWords.length >= 2 || crossMatches.length >= 1) {
    level = 'mid'
  } else {
    level = 'low'
  }

  // 截取原文连续依据句
  const sentences = content.split(/(?<=[。？！；\n])/).map(s => s.trim()).filter(Boolean)
  const quoteSent = sentences.find(s => matchedWords.some(w => s.includes(w))) || sentences[0] || content.slice(0, 80)
  const aiQuote = quoteSent.slice(0, 96)

  const aiReason = acceptance === '非纪检受理·民生咨询'
    ? '经本地词包与纪检受理边界规则初筛，未命中违纪违法或作风失范要素，属一般公共服务/民生咨询范畴，建议按非纪检受理范围归档并转民生部门参考。'
    : `命中「${matchedWords.slice(0, 4).join('、') || category}」等 ${matchedWords.length} 处涉纪关注词${crossMatches.length ? `，并自动碰撞命中平台在库记录 ${crossMatches.length} 项（${[...new Set(crossMatches.map(m => m.sourceType))].slice(0, 3).join('、')}）` : ''}；当前归类为「${acceptance}」，事实有待人工核查确认。`

  return { title, content, sourceId, town, village, category, acceptance, level, matchedWords, matchedGroups, entities, crossMatches, aiQuote, aiReason }
}

/** 计算近 14 日标签与每日帖文声量（以业务基准日 todayStr 倒推） */
export function build14DaySeries(posts: OpinionPost[], todayStr: string): { labels: string[]; total: number[]; discipline: number[] } {
  const days = Array.from({ length: 14 }, (_, i) => addDays(todayStr, i - 13))
  const total = days.map(d => posts.filter(p => p.publishedAt.slice(0, 10) === d).length)
  const discipline = days.map(d => posts.filter(p => p.publishedAt.slice(0, 10) === d && p.acceptance !== '非纪检受理·民生咨询').length)
  return { labels: days.map(d => d.slice(5)), total, discipline }
}

/** 判定话题是否超过 30 天自动沉底 */
export function isHistoricalTopic(lastSeen: string, todayStr: string): boolean {
  const d1 = new Date(`${lastSeen}T00:00:00`).getTime()
  const d2 = new Date(`${todayStr}T00:00:00`).getTime()
  return (d2 - d1) / 86400000 >= 30
}

/** 生成专报结构化数据与可导出 Markdown（结论前置 + 自动图表数据 + 站内引用编号） */
export function buildReportData(
  kind: ReportKind,
  topics: {
    id: string
    title: string
    summary: string
    category: OpinionCategory
    level: RiskLevel | 'info'
    town: string
    village?: string
    postCount: number
    repostCount: number
    platformCount: number
    statusText: string
    primaryPostId: string
    primarySourceId: MediaSourceId
    primaryEvidenceStatus: string
    crossCount: number
    historical: boolean
  }[],
  posts: OpinionPost[],
  todayStr: string,
  generatedAt: string,
): OpinionReport {
  const recentPosts = posts.filter(p => !isHistoricalTopic(p.publishedAt.slice(0, 10), todayStr))
  const activeTopics = topics.filter(t => !t.historical)
  const highTopics = activeTopics.filter(t => t.level === 'high')
  const midTopics = activeTopics.filter(t => t.level === 'mid')
  const snapshotPosts = posts.filter(p => p.evidenceStatus !== '原帖在架')
  const crossTopics = activeTopics.filter(t => t.crossCount > 0)
  const clarifyTopics = activeTopics.filter(t => t.category === '涉纪不实传言')

  const meta = {
    weekly: {
      id: `RP-WK-${todayStr.replace(/-/g, '')}`,
      title: '夏津县纪检监察涉纪网络舆情周报',
      period: `${addDays(todayStr, -13)} 至 ${todayStr}`,
      subtitle: '周期公开舆情态势、高关注苗头、跨库印证与分流处置汇总',
    },
    campaign: {
      id: `RP-CP-${todayStr.replace(/-/g, '')}`,
      title: '群众身边不正之风和腐败问题舆情专项快报',
      period: `${addDays(todayStr, -13)} 至 ${todayStr}`,
      subtitle: '聚焦农村三资、窗口作风、小微工程与校园餐等重点民生监督领域',
    },
    clarify: {
      id: `RP-CL-${todayStr.replace(/-/g, '')}`,
      title: '涉基层干部不实网传核查与澄清正名建议专报',
      period: `${addDays(todayStr, -6)} 至 ${todayStr}`,
      subtitle: '落实“三个区分开来”，为合规履职干部核实澄清、护航担当作为',
    },
  }[kind]

  const selectedTopics = kind === 'clarify'
    ? (clarifyTopics.length ? clarifyTopics : activeTopics.slice(0, 2))
    : kind === 'campaign'
      ? activeTopics.filter(t => ['农村三资', '作风效能', '工程招投标', '校园餐与民生', '惠民补贴'].includes(t.category))
      : activeTopics

  const events: ReportEventItem[] = selectedTopics.map((t, idx) => ({
    n: idx + 1,
    topicId: t.id,
    postId: t.primaryPostId,
    title: t.title,
    category: t.category,
    level: t.level,
    townText: `${townName(t.town)}${t.village ? ` · ${t.village}` : ''}`,
    statusText: t.statusText,
    summary: t.summary,
    sourceShort: sourceById(t.primarySourceId).short,
    evidenceStatus: t.primaryEvidenceStatus,
    crossCount: t.crossCount,
  }))

  const series = build14DaySeries(recentPosts, todayStr)
  const categoryDist = opinionCategories.map(c => ({
    label: c.label,
    value: recentPosts.filter(p => p.category === c.key).length,
    color: c.color,
  })).filter(x => x.value > 0)

  const sourceMap = new Map<MediaSourceId, number>()
  for (const p of recentPosts) sourceMap.set(p.sourceId, (sourceMap.get(p.sourceId) || 0) + 1)
  const sourceDist = [...sourceMap.entries()]
    .map(([id, value]) => ({ label: sourceById(id).short, value, color: sourceById(id).badgeColor }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const kpis = kind === 'clarify'
    ? [
        { label: '疑似不实传言话题', value: clarifyTopics.length, unit: '个', hint: '经语义与现场跟帖交叉初筛' },
        { label: '关联公开帖文', value: recentPosts.filter(p => p.category === '涉纪不实传言').length, unit: '条', hint: '含现场目击还原与权威评论' },
        { label: '跨库异常记录', value: 0, unit: '条', hint: '廉政档案与审计均无异常' },
        { label: '建议澄清对象', value: clarifyTopics.length, unit: '名', hint: '须按程序核实审批后实施' },
      ]
    : [
        { label: '本期监测公开帖文', value: recentPosts.length, unit: '条', hint: `聚类为 ${activeTopics.length} 个活跃话题` },
        { label: '优先研判苗头', value: highTopics.length + midTopics.length, unit: '项', hint: `红色 ${highTopics.length} · 橙色 ${midTopics.length}` },
        { label: '跨库自动印证', value: crossTopics.length, unit: '项', hint: '命中信访、三资、招投标或巡察记录' },
        { label: '证据保全快照', value: snapshotPosts.length, unit: '份', hint: '含删帖保全与改文留痕对比' },
      ]

  const conclusions = kind === 'clarify'
    ? [
        `监测发现 ${clarifyTopics.length} 起针对基层一线干部的断章取义短视频网传，评论区多名目击群众自发还原完整执法公告过程。`,
        '经跨库核对涉事干部廉政档案、年度个人事项及经济责任审计结果，均未见违纪违法或异常信访记录。',
        '建议由党风政风监督室会同宣传部门按程序调阅完整执法记录仪画面，核实无误后及时开展澄清正名，旗帜鲜明为实干干部撑腰。',
      ]
    : [
        `本期（${meta.period}）累计汇集属地合法公开平台信息 ${recentPosts.length} 条，聚类形成 ${activeTopics.length} 个关注话题，整体以基层“三资”公开、涉农窗口作风、农村小微工程质量与校园餐透明度为主。`,
        `共有 ${highTopics.length} 项红色优先研判苗头与 ${crossTopics.length} 项跨库印证事件；其中“和盛村集体场地租赁”与“新桥村道路质量”出现发帖后删帖或删改企业名现象，系统均已保留原始快照固定证据。`,
        '同步识别 1 起针对基层合规拆违的断章取义传言（建议核实澄清）及 1 类市政路灯/改造咨询（建议按非纪检受理范围归档并转民生参考），严守受理边界与留痕规范。',
      ]

  const recommendations = kind === 'clarify'
    ? [
        '核实执法全过程视频、前期限期整改公告及规划红线图，形成客观书面核查结论。',
        '按《纪检监察机关处理检举控告工作规则》履行审批程序，采取书面或会议形式在适当范围予以澄清正名。',
        '同步总结基层一线项目推进中的公开沟通经验，减少因信息不对称引发的误读发酵。',
      ]
    : [
        '对跨库碰撞命中既有信访与穿透监督疑点的红色苗头，建议优先由监督检查室与信访室并案核查，避免重复办理。',
        '针对农业服务站窗口推诿刁难反映，建议由党风政风监督室开展明察暗访并督促推行农机补贴一次性告知与进度公示。',
        '持续紧盯校园餐食材采购单价公开与困难救助评议公示，把网络群众痛点转化为“群腐”集中整治精准靶点。',
        '对核实确属断章取义的不实网传及时按程序澄清正名，做到严管厚爱结合、激励约束并重。',
      ]

  const mdLines = [
    `# ${meta.title}`,
    `> 统计周期：${meta.period} ｜ 生成时间：${generatedAt} ｜ 演示样例 · 非正式公文`,
    '',
    '## 一、核心态势结论',
    ...conclusions.map((c, i) => `${i + 1}. ${c}`),
    '',
    '## 二、关键监测指标',
    '| 指标 | 数值 | 说明 |',
    '| --- | --- | --- |',
    ...kpis.map(k => `| ${k.label} | ${k.value} ${k.unit} | ${k.hint} |`),
    '',
    '## 三、重点关注事件与证据溯源',
    ...events.map(e => `- **[${e.n}] ${e.title}**（${e.category} · ${e.townText} · ${e.statusText} · 首发：${e.sourceShort} · ${e.evidenceStatus}）\n  ${e.summary}`),
    '',
    '## 四、监督工作建议',
    ...recommendations.map((r, i) => `${i + 1}. ${r}`),
    '',
    '---',
    '*说明：本专报由系统基于公开网络样例信息与本地规则引擎汇总生成，仅供纪检监察干部研判参考，不构成事实认定、违纪定性或处置决定。*',
  ]

  return {
    ...meta,
    kind,
    generatedAt,
    kpis,
    conclusions,
    trendLabels: series.labels,
    trendValues: series.total,
    categoryDist,
    sourceDist,
    events,
    recommendations,
    markdown: mdLines.join('\n'),
  }
}

/** 可选大模型润色专报提示词（严格约束不越界定性） */
export function opinionReportPrompt(report: OpinionReport): string {
  return [
    `请作为县级纪检监察机关舆情研判文字秘书，将以下《${report.title}》（${report.period}）润色为庄重、克制、条理清晰的政务研判专报正文。`,
    '硬性要求：1) 只基于下列事实数据，不编造新案例或新数字；2) 所有网传与群众反映均须保持“反映、质疑、待核实”事实边界，严禁出现违纪定性、处分建议、删帖或控评表述；3) 正文中引用重点事件时保留 [1]、[2] 等序号标注；4) 全文控制在 700 字以内，分“总体态势、重点苗头研判、工作建议、使用提醒”四部分。',
    '',
    '【原始汇总】',
    report.markdown,
  ].join('\n')
}
