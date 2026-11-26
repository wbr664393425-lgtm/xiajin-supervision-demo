import { describe, expect, it } from 'vitest'
import { collectDossier, dossierPlan, dossierPrompt } from './dossier'
import { clueSeed } from '@/mock/clues'
import { inspDocs } from '@/mock/inspection'
import { cases, kb } from '@/mock/cases'
import * as m from '@/mock/supervision'
import { parseClue } from './clue-parse'
import { screenAssets, screenProcurement } from './supervision'
import { townName } from '@/mock/geo'

const clues = clueSeed.map(c => { const p = parseClue(c.content); return { id: c.id, content: c.content, village: c.village, townName: townName(c.town), receivedAt: c.receivedAt, accused: p.fields.accused.value, issue: p.fields.issue.value, codes: p.codes, amounts: p.amounts } })
const findings = [...screenAssets({ contracts: m.contracts, receipts: m.receipts, idle: m.idleAssets, vouchers: m.vouchers }, '2026-11-07'), ...screenProcurement({ projects: m.projects, companies: m.companies })]

describe('对象全景研判', () => {
  it('跨模块汇总张某军的线索、三资疑点、巡察台账与案卷', () => {
    const d = collectDossier({ subject: '张某军', clues, findings, inspDocs, cases, relations: ['和盛村（发生地）'], kb })
    expect(d.clues.length).toBeGreaterThanOrEqual(2)
    expect(d.findings.some(f => f.title.includes('24,000'))).toBe(true)
    expect(d.inspection.length).toBeGreaterThan(0)
    expect(d.cases.map(c => c.id)).toContain('AJ-2026-012')
    const plan = dossierPlan(d)
    expect(plan).toMatch(/^基本情况/)
    expect(plan).toMatch(/使用提醒\n/)
    expect(plan).not.toMatch(/构成违纪|应给予/)
    expect(dossierPrompt(d)).toContain('[1] 信访线索')
  })
  it('无关联记录时给出空汇总而不编造', () => {
    const d = collectDossier({ subject: '不存在的人', clues, findings, inspDocs, cases, relations: [], kb })
    expect(d.clues.length + d.findings.length + d.cases.length).toBe(0)
    expect(dossierPlan(d)).toContain('暂无关联记录')
  })
})
