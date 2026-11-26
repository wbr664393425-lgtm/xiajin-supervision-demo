import { describe, expect, it } from 'vitest'
import { defaultDocument } from '../mock/data'
import { buildAssistantOutput, compareCapabilityRows, getReviewFindings, reviewChecks } from './professional'

describe('professional demo rules', () => {
  it('finds the three real sample errors, and each accepted replacement resolves its own finding', () => {
    expect(getReviewFindings(defaultDocument).map(check => check.id)).toEqual(['time', 'amount', 'required'])
    let document = defaultDocument
    for (const check of reviewChecks) {
      document = document.replace(check.excerpt, check.replacement)
      expect(getReviewFindings(document).map(item => item.id)).not.toContain(check.id)
    }
    expect(getReviewFindings(document)).toHaveLength(0)
    expect(document).toContain('待核对差额为24,000元')
    expect(document).toContain('待人工核验')
  })

  it('detects restored errors even after a prior correction', () => {
    const check = reviewChecks[1]!
    const corrected = defaultDocument.replace(check.excerpt, check.replacement)
    expect(getReviewFindings(corrected).map(item => item.id)).not.toContain('amount')
    expect(getReviewFindings(corrected.replace(check.replacement, check.excerpt)).map(item => item.id)).toContain('amount')
  })

  it('compares anonymous subsidy identifiers within the same batch, not across batches', () => {
    const sameBatch = '申请标识 | 对象 | 金额 | 批次\nHJ-1 | 甲 | 8000 | Q3\nHJ-1 | 甲 | 8000 | Q3'
    expect(compareCapabilityRows('subsidy', sameBatch)).toMatchObject({ recordCount: 2, matches: [expect.stringContaining('出现 2 次')] })
    const nextBatch = sameBatch.replace(/Q3$/, 'Q4')
    expect(compareCapabilityRows('subsidy', nextBatch).matches).toHaveLength(0)
  })

  it('updates duplicated voucher findings when the editable input changes', () => {
    const input = '记录 | 凭证 | 金额 | 事项\nBX-1 | D-1 | 6800 | 维护\nBX-2 | D-1 | 6800 | 维护'
    expect(compareCapabilityRows('expense', input).matches[0]).toContain('BX-1、BX-2')
    expect(compareCapabilityRows('expense', input.replace('BX-2 | D-1', 'BX-2 | D-2')).matches).toEqual([])
  })

  it('only includes approved education sources and keeps unreviewed material out', () => {
    const input = '标识 | 主题 | 素材 | 审核状态\nJY-1 | 管理 | 已审核 | 待审核\nJY-2 | 管理 | 合同要点 | 已审核'
    expect(compareCapabilityRows('education', input).matches).toEqual(['JY-2 · 合同要点（可供人工编排）'])
  })

  it('does not invent missing amounts and keeps the original input in a summary', () => {
    const output = buildAssistantOutput('虚构材料：请核对公示记录和原始附件。', 'summary')
    expect(output).toContain('虚构材料：请核对公示记录和原始附件。')
    expect(output).toContain('原文未提供明确金额，不作补充推断')
    expect(output).not.toContain('36,000')
  })

  it('preserves user-provided monetary values and identifies the retrieval source as a demo', () => {
    const output = buildAssistantOutput('材料记载租金 42,000 元、已到账 21,000 元。', 'summary')
    expect(output).toContain('42,000 元、21,000 元')
    const knowledge = buildAssistantOutput('应关注哪些材料？', 'knowledge')
    expect(knowledge).toContain('不是真实法规原文，无真实法条编号')
  })
})
