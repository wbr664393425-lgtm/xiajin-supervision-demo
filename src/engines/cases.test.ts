import { describe, expect, it } from 'vitest'
import { kb, cases, similarCases, evidenceRequirements } from '@/mock/cases'
import { kbSearch, composeAnswer, extractElements, crossCheck, draftDoc, withTypos, checkDoc, evidenceChain, similarTo, docTypes } from './cases'

const c = cases[0]!
describe('case engines', () => {
  it('retrieves relevant knowledge with citations and admits when nothing matches', () => {
    const hits = kbSearch('村干部把集体场地低价租给亲属，核查重点有哪些？', kb)
    expect(hits.map(h => h.entry.id)).toEqual(expect.arrayContaining(['KB-10']))
    expect(composeAnswer('x', hits).points[0]!.cite).toBe(1)
    expect(kbSearch('天气预报明天下雨吗', kb)).toHaveLength(0)
    expect(kbSearch('初核阶段能不能作出违纪定性', kb)[0]!.entry.id).toBe('KB-07')
  })
  it('extracts elements with exact spans and cross-checks amounts across materials', () => {
    for (const m of c.materials) for (const e of extractElements(m)) expect(m.text.slice(e.start, e.end)).toBe(e.value)
    const rows = crossCheck(c)
    expect(rows.find(r => r.fact === '12,000 元')!.ok).toBe(true)
    expect(rows[0]!.fact).toContain('早于会议')
  })
  it('clean drafts pass, injected typos are all caught, and fixes resolve them', () => {
    for (const t of docTypes) { const issues = checkDoc(draftDoc(t, c).replace(/承办人：$/, '承办人：审查专员甲'), t); expect(issues.filter(i => i.kind !== '要素缺失'), t).toHaveLength(0) }
    const bad = withTypos(draftDoc('审查调查报告', c))
    const kinds = new Set(checkDoc(bad, '审查调查报告').map(i => i.kind))
    for (const k of ['法条引用', '表述规范', '前后矛盾', '程序时限']) expect(kinds.has(k as never), k).toBe(true)
    let fixed = bad
    for (const i of checkDoc(bad, '审查调查报告').filter(i => i.replacement !== undefined).reverse()) fixed = fixed.slice(0, i.start) + i.replacement + fixed.slice(i.end)
    expect(checkDoc(fixed, '审查调查报告').filter(i => i.kind === '前后矛盾' || i.title.includes('书名号'))).toHaveLength(0)
    expect(checkDoc(draftDoc('初核报告', c) + '已查实', '初核报告').some(i => i.title.includes('定性'))).toBe(true)
  })
  it('evidence chain lists missing items and procedure nodes; similar cases rank same violation first', () => {
    const chain = evidenceChain(c, evidenceRequirements[c.violation]!, [])
    expect(chain.items.filter(i => i.status === 'missing').map(i => i.name)).toEqual(['亲属关系证明', '市场价格评估'])
    expect(chain.nodes.filter(n => !n.ok).map(n => n.name)).toEqual(['违纪事实告知', '陈述申辩记录'])
    expect(evidenceChain(c, evidenceRequirements[c.violation]!, ['亲属关系证明', '市场价格评估', '违纪事实告知', '陈述申辩记录']).ready).toBe(true)
    const sim = similarTo(c, similarCases)
    expect(sim[0]!.violation).toBe(c.violation)
    expect(sim.some(s => s.id === 'LA-07')).toBe(false)
  })
})
