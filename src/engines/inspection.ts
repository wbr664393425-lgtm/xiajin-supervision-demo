/** 巡察辅助引擎：台账阅卷检出纸面程序疑点、问题归类去重与报告初稿、整改材料比对。 */
import type { RiskLevel } from '@/types'
import type { InspDoc, FeedbackIssue } from '@/mock/inspection'
import { daysBetween } from './deadline'

export const readRules = ['会前未酝酿', '记录缺失', '表决不合规', '决策倒置', '公示不到位', '组织生活形式化', '票据不规范'] as const
export type ReadRule = typeof readRules[number]
export interface ReadFinding { id: string; docId: string; target: string; kind: string; rule: ReadRule; level: RiskLevel; title: string; excerpt: string; start: number; end: number; basis: string; category: string }

const cn = (s: string) => s.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, (_, y, m, d) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
function hit(text: string, re: RegExp) { const m = re.exec(text); return m ? { s: m.index, e: m.index + m[0].length, m } : null }

export function classify(rule: ReadRule, text: string) {
  if (rule === '组织生活形式化') return '形式主义'
  if (rule === '公示不到位') return /补助|补贴|低保/.test(text) ? '惠民政策' : '三资管理'
  if (rule === '票据不规范' || (rule === '决策倒置' && /合同|付款|租/.test(text))) return '三资管理'
  return '主体责任落实'
}
export function readDoc(doc: InspDoc): ReadFinding[] {
  const out: ReadFinding[] = []
  const add = (rule: ReadRule, level: RiskLevel, title: string, h: { s: number; e: number }, basis: string) => out.push({ id: `${doc.id}-${out.length + 1}`, docId: doc.id, target: doc.target, kind: doc.kind, rule, level, title, excerpt: doc.text.slice(h.s, h.e), start: h.s, end: h.e, basis, category: classify(rule, doc.text) })
  const t = doc.text
  let h = hit(t, /记录人：[ \t]*(?=\n)/); if (h) add('记录缺失', 'mid', `${doc.target}${doc.kind}未填写记录人`, h, '会议记录应载明记录人，保证记录真实可追溯。')
  h = hit(t, /讨论情况：（空）/); if (h) add('记录缺失', 'high', `${doc.target}研究重大事项未记录讨论情况`, h, '“三重一大”事项须完整记录与会人员发表意见情况。')
  h = hit(t, /授课内容未记录[^\n。]*/); if (h) add('组织生活形式化', 'low', `${doc.target}党课内容未记录`, h, '党课应有授课提纲与内容记录。')
  h = hit(t, /记录与[^\n]{0,16}完全相同/); if (h) add('组织生活形式化', 'mid', `${doc.target}会议记录前后雷同`, h, '不同时间的会议记录内容完全一致，可能存在照抄照搬、补记录问题。')
  h = hit(t, /同一笔迹代签/); if (h) add('组织生活形式化', 'mid', `${doc.target}参会人员签到疑似代签`, h, '签到应由本人签署。')
  const att = hit(t, /应到(\d+)人，实到(\d+)人/)
  if (att && Number(att.m[2]) / Number(att.m[1]) < 2 / 3) add('表决不合规', 'high', `${doc.target}到会 ${att.m[2]}/${att.m[1]}，不足三分之二`, att, '议事会议到会人数应超过应到人数的三分之二，决议方为有效。')
  const votes = hit(t, /同意(\d+)票/)
  if (votes && att && Number(votes.m[1]) <= Number(att.m[1]) / 2) add('表决不合规', 'high', `${doc.target}赞成票 ${votes.m[1]} 票未过应到人数半数`, votes, '决定事项应经应到会成员半数以上同意。')
  if (doc.kind === '三重一大' && /表决情况：一致同意/.test(t)) { const v = hit(t, /表决情况：一致同意/)!; add('表决不合规', 'mid', `${doc.target}表决仅记“一致同意”，无票数`, v, '“三重一大”事项表决应逐人记录意见或票数。') }
  for (const block of t.split(/(?=议题[一二三四五]?：)/)) {
    if (/议题/.test(block) && /(\d[\d,]{4,})元/.test(block) && /研究|同意/.test(block) && !/酝酿|征求/.test(block)) { const off = t.indexOf(block); const m = /议题[一二三四五]?：[^\n]*/.exec(block)!; add('会前未酝酿', 'mid', `${doc.target}大额事项未见会前酝酿记录`, { s: off + m.index, e: off + m.index + m[0].length }, '“三重一大”事项应会前充分酝酿、征求意见。') }
  }
  const meet = /会议时间：(\d{4}年\d{1,2}月\d{1,2}日)/.exec(t)
  const signed = hit(t, /合同已于(\d{4}年\d{1,2}月\d{1,2}日)签订/)
  if (meet && signed && cn(signed.m[1]!) < cn(meet[1]!)) add('决策倒置', 'high', `${doc.target}合同签订早于集体决策 ${daysBetween(cn(signed.m[1]!), cn(meet[1]!))} 天`, signed, '先签合同后补会议，属于决策程序倒置。')
  h = hit(t, /合同自[^\n，]*起执行，现补办[^\n。]*/); if (h) add('决策倒置', 'high', `${doc.target}合同先执行后补办议事手续`, h, '应先决策后执行。')
  h = hit(t, /会议日期晚于付款日期/); if (h) add('决策倒置', 'high', `${doc.target}付款早于会议决策`, h, '资金支付应在集体决策之后。')
  const pub = hit(t, /公示时间：(\d{4}年\d{1,2}月\d{1,2}日)至(\d{1,2})月(\d{1,2})日/)
  if (pub) { const start = cn(pub.m[1]!); const end = `${start.slice(0, 4)}-${pub.m[2]!.padStart(2, '0')}-${pub.m[3]!.padStart(2, '0')}`; const days = daysBetween(start, end) + 1; if (days < 5) add('公示不到位', 'mid', `${doc.target}公示仅 ${days} 天`, pub, '公示期一般不少于 5 个工作日。') }
  h = hit(t, /监督电话：未注明/); if (h) add('公示不到位', 'low', `${doc.target}公示未公布监督电话`, h, '公示应公布监督举报渠道。')
  h = hit(t, /附件：白条[^\n。]*/); if (h) add('票据不规范', 'mid', `${doc.target}以白条入账`, h, '支出应取得合法票据。')
  h = hit(t, /无合同、无验收单/); if (h) add('票据不规范', 'high', `${doc.target}大额支出无合同和验收单`, h, '工程类支出应附合同与验收资料。')
  return out
}

export interface IssueGroup { key: string; category: string; rule: string; targets: string[]; findings: ReadFinding[]; level: RiskLevel; summary: string }
export function groupIssues(list: ReadFinding[]): IssueGroup[] {
  const map = new Map<string, ReadFinding[]>()
  list.forEach(f => { const k = `${f.category}|${f.rule}`; map.set(k, [...(map.get(k) || []), f]) })
  const order: Record<RiskLevel, number> = { high: 0, mid: 1, low: 2 }
  return [...map.entries()].map(([key, fs]) => { const [category, rule] = key.split('|'); const targets = [...new Set(fs.map(f => f.target))]; const level = fs.map(f => f.level).sort((a, b) => order[a] - order[b])[0]!; return { key, category: category!, rule: rule!, targets, findings: fs, level, summary: `${targets.join('、')}存在${rule}问题（${fs.length} 处）：${fs.map(f => f.title.replace(f.target, '')).join('；')}。` } })
    .sort((a, b) => order[a.level] - order[b.level])
}
export function reportDraft(groups: IssueGroup[], target: string, team: string) {
  const cats = [...new Set(groups.map(g => g.category))]
  const num = '一二三四五六七八'
  return [`关于对${target}巡察情况的报告（初稿）`, '', `${team}按照县委巡察工作安排，对${target}开展常规巡察。通过台账批量阅卷，系统辅助检出纸面疑点 ${groups.reduce((s, g) => s + g.findings.length, 0)} 处，经归类去重形成 ${groups.length} 个问题，现将主要情况报告如下：`, '',
    ...cats.flatMap((c, i) => [`${num[i]}、${c}方面`, ...groups.filter(g => g.category === c).map((g, j) => `（${num[j]}）${g.summary}`), '']),
    '下一步建议：对上述问题逐项核实，形成问题清单后按程序反馈被巡察党组织，督促建立整改台账。', '', '说明：本稿由系统根据台账阅卷结果辅助生成，所列问题均为纸面疑点，需巡察组谈话、调阅原件核实后方可写入正式报告。'].join('\n')
}

export interface RectifyCheck { coverage: number; matched: string[]; concrete: boolean; vague: string[]; attachments: number; overdue: boolean; verdicts: { label: string; ok: boolean; detail: string }[]; level: RiskLevel }
const VAGUE = ['高度重视', '进一步加强', '今后将', '切实提高认识', '严格按照要求', '已整理', '进行了整理']
export function checkRectify(issue: FeedbackIssue, text: string, attachments: string[], today: string, closed: boolean): RectifyCheck {
  const matched = issue.keywords.filter(k => text.includes(k))
  const coverage = issue.keywords.length ? matched.length / issue.keywords.length : 0
  const concrete = /\d{4}年\d{1,2}月\d{1,2}日|[\d,]{3,}元|《[^》]+》|一是|二是/.test(text)
  const vague = VAGUE.filter(v => text.includes(v))
  const overdue = !closed && issue.deadline < today
  const verdicts = [
    { label: '回应与问题对应', ok: coverage >= 0.4, detail: coverage >= 0.4 ? `覆盖问题要点：${matched.join('、')}` : `仅覆盖 ${matched.length}/${issue.keywords.length} 个要点${matched.length ? '：' + matched.join('、') : ''}` },
    { label: '措施具体可查', ok: concrete && vague.length < 2, detail: concrete ? (vague.length >= 2 ? `含表态性语句：${vague.join('、')}` : '有时间、金额或制度名称等可核实内容') : `未见具体时间、金额或制度${vague.length ? '，多为表态：' + vague.join('、') : ''}` },
    { label: '佐证材料齐全', ok: attachments.length >= 2, detail: attachments.length ? `已附 ${attachments.length} 份：${attachments.join('、')}` : '未附佐证材料' },
    { label: '整改时限', ok: !overdue, detail: overdue ? `已超过整改期限 ${issue.deadline}` : `期限 ${issue.deadline}` },
  ]
  const bad = verdicts.filter(v => !v.ok).length
  return { coverage, matched, concrete, vague, attachments: attachments.length, overdue, verdicts, level: bad >= 3 ? 'high' : bad >= 1 ? 'mid' : 'low' }
}
