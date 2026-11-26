import { describe, expect, it } from 'vitest'
import { inspDocs, feedbackIssues, rectifySamples } from '@/mock/inspection'
import { readDoc, groupIssues, reportDraft, checkRectify, readRules } from './inspection'

const all = inspDocs.flatMap(readDoc)
describe('inspection engines', () => {
  it('reading finds every required paper-procedure flaw with an exact excerpt', () => {
    const rules = new Set(all.map(f => f.rule))
    for (const r of ['会前未酝酿', '记录缺失', '表决不合规', '决策倒置', '公示不到位']) expect(rules.has(r as typeof readRules[number])).toBe(true)
    for (const f of all) expect(inspDocs.find(d => d.id === f.docId)!.text.slice(f.start, f.end)).toBe(f.excerpt)
    expect(all.find(f => f.rule === '决策倒置' && f.docId === 'XC-D01')!.title).toContain('8 天')
    expect(all.filter(f => f.docId === 'XC-D03' && f.rule === '会前未酝酿')).toHaveLength(1)
  })
  it('groups and deduplicates into categories and drafts a report', () => {
    const groups = groupIssues(all)
    expect(new Set(groups.map(g => g.category))).toEqual(new Set(['主体责任落实', '形式主义', '三资管理', '惠民政策']))
    expect(groups.reduce((s, g) => s + g.findings.length, 0)).toBe(all.length)
    expect(reportDraft(groups, 'X', 'Y')).toContain('纸面疑点')
  })
  it('rectification check separates solid responses from evasive ones', () => {
    const ok = checkRectify(feedbackIssues[0]!, rectifySamples['ZG-01']!.text, rectifySamples['ZG-01']!.attachments, '2026-11-06', false)
    expect(ok.verdicts.every(v => v.ok)).toBe(true)
    const vague = checkRectify(feedbackIssues[1]!, rectifySamples['ZG-02']!.text, [], '2026-11-06', false)
    expect(vague.level).toBe('high')
    expect(checkRectify(feedbackIssues[4]!, '', [], '2026-11-12', false).overdue).toBe(true)
  })
})
