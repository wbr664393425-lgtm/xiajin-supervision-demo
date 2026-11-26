import { describe, expect, it } from 'vitest'
import { clueSeed } from '@/mock/clues'
import { parseClue } from './clue-parse'
import { gradeClue } from './discipline-tag'
import { findInvalid, findPairs } from './clue-dedupe'
import { buildGraph } from './relation-graph'
import { deadlineState } from './deadline'

const items = clueSeed.map(c => ({ ...c, parsed: parseClue(c.content) }))
const byId = (id: string) => items.find(i => i.id === id)!

describe('clue engines', () => {
  it('extracts the five required fields with spans that point back to the original', () => {
    const p = byId('XF-2026-0102').parsed
    expect(p.fields.accused.value).toBe('张某军（村委会主任）')
    expect(p.fields.amount.value).toContain('36,000元')
    expect(p.fields.issue.value).toContain('优亲厚友')
    expect(p.fields.time.value).toBe('2026年6月30日')
    expect(p.fields.demand.value).toMatch(/^希望/)
    for (const f of Object.values(p.fields)) if (f.span) expect(byId('XF-2026-0102').content.slice(f.span.start, f.span.end).length).toBeGreaterThan(0)
    expect(p.codes).toEqual(['SZ-HT-2026-018'])
  })
  it('never invents amounts absent from the text', () => {
    for (const item of items) for (const n of item.parsed.amounts) expect(item.content.replace(/,/g, '')).toContain(String(n))
  })
  it('separates duplicates, multi-source reports and invalid requests', () => {
    const pairs = findPairs(items)
    const dup = pairs.filter(p => p.kind === 'duplicate').map(p => [p.a, p.b].sort().join('|'))
    expect(dup).toEqual(['XF-2026-0104|XF-2026-0105'])
    const multi = pairs.filter(p => p.kind === 'multi').map(p => [p.a, p.b].sort().join('|'))
    expect(multi).toContain('XF-2026-0102|XF-2026-0103')
    expect(multi).toContain('XF-2026-0106|XF-2026-0112')
    expect(findInvalid(items).map(i => i.id).sort()).toEqual(['XF-2026-0101', 'XF-2026-0114'])
  })
  it('grades with six-discipline tags and risk words, without verdicts', () => {
    const g = gradeClue(byId('XF-2026-0106').content, { hasAccused: true, amounts: byId('XF-2026-0106').parsed.amounts, codes: byId('XF-2026-0106').parsed.codes })
    expect(g.risks.map(r => r.word)).toContain('工程回扣')
    expect(g.level).toBe('high')
    const politic = gradeClue(byId('XF-2026-0117').content, { hasAccused: true, amounts: [], codes: [] })
    expect(politic.tags.map(t => t.name)).toContain('政治纪律')
    const consult = gradeClue(byId('XF-2026-0101').content, { hasAccused: false, amounts: [], codes: [] })
    expect(consult.level).toBe('low')
  })
  it('graph finds the person and company reported in multiple clues', () => {
    const g = buildGraph(items)
    const repeated = g.repeated.map(n => n.label)
    expect(repeated).toContain('王某民')
    expect(repeated).toContain('鑫路建设')
    expect(repeated).toContain('张某军')
  })
  it('computes deadline states', () => {
    expect(deadlineState('2026-10-12', '2026-11-06', false).state).toBe('已超期')
    expect(deadlineState('2026-11-04', '2026-11-06', false).state).toBe('正常')
    expect(deadlineState('2026-10-24', '2026-11-06', false).state).toBe('即将到期')
  })
})
