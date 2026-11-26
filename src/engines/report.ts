/** 监督分析月报：按领域或乡镇汇总疑点与处置进展，生成可编辑的 HTML 初稿。 */
import type { RiskLevel } from '@/types'
export interface ReportItem { domain: string; townName: string; level: RiskLevel; title: string; status: 'open' | 'confirmed' | 'dismissed'; amount?: number }
const lv = { high: '红色', mid: '橙色', low: '黄色' }
export function buildReport(items: ReportItem[], opts: { month: string; scope: '领域' | '乡镇'; focus?: string }) {
  const list = opts.focus ? items.filter(i => (opts.scope === '领域' ? i.domain : i.townName) === opts.focus) : items
  const key = (i: ReportItem) => opts.scope === '领域' ? i.domain : i.townName
  const groups = [...new Set(list.map(key))].map(k => ({ name: k, items: list.filter(i => key(i) === k) })).sort((a, b) => b.items.length - a.items.length)
  const count = (l: RiskLevel) => list.filter(i => i.level === l).length
  const amount = list.reduce((s, i) => s + (i.amount || 0), 0)
  const title = `${opts.month.replace('-', '年')}月监督分析月报${opts.focus ? `（${opts.focus}）` : `（按${opts.scope}）`}`
  const summary = `本月系统共汇总监督疑点 ${list.length} 条，其中红色预警 ${count('high')} 条、橙色预警 ${count('mid')} 条、黄色关注 ${count('low')} 条，涉及金额约 ${(amount / 10000).toFixed(1)} 万元。已人工确认转核查 ${list.filter(i => i.status === 'confirmed').length} 条，待研判 ${list.filter(i => i.status === 'open').length} 条。`
  const sections = groups.map(g => ({ heading: `${g.name}（${g.items.length} 条）`, text: `红色 ${g.items.filter(i => i.level === 'high').length} 条，橙色 ${g.items.filter(i => i.level === 'mid').length} 条。主要表现：${[...new Set(g.items.slice(0, 4).map(i => i.title))].join('；')}。`, rows: g.items.slice(0, 8) }))
  const advice = ['对红色预警事项，建议由属地纪委在 7 日内完成初步核实并反馈。', '对重复出现的问题类型，建议相关职能部门开展专项整治，完善制度堵塞漏洞。', '本报告为系统辅助生成的初稿，疑点不等于问题，须经核实后方可作为工作依据。']
  return { title, summary, sections, advice }
}
export function renderReportHtml(r: ReturnType<typeof buildReport>) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<h1>${esc(r.title)}</h1><p style="text-align:center;color:#888">夏津县纪委监委 · 系统辅助生成初稿</p><h2>一、总体情况</h2><p>${esc(r.summary)}</p><h2>二、分项情况</h2>${r.sections.map(s => `<h3>${esc(s.heading)}</h3><p>${esc(s.text)}</p><table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px"><tr><th>分级</th><th>疑点</th><th>属地</th><th>状态</th></tr>${s.rows.map(i => `<tr><td>${lv[i.level]}</td><td>${esc(i.title)}</td><td>${esc(i.townName)}</td><td>${i.status === 'confirmed' ? '已转核查' : i.status === 'open' ? '待研判' : '已排除'}</td></tr>`).join('')}</table>`).join('')}<h2>三、工作建议</h2>${r.advice.map((a, i) => `<p>${i + 1}. ${esc(a)}</p>`).join('')}`
}
