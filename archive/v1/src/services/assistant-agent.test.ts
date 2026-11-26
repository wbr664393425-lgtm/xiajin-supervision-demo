import { describe, expect, it } from 'vitest'
import { buildAssistantOutput, refineAssistantOutput, sourceFacts } from './professional'
import { changedSections, detectRefineMode, planSteps, splitCites, splitSections } from './assistant-agent'

const material = '【虚构演示材料】合同 SZ-HT-2026-018 约定年度租金 36,000 元，应于 2026 年 6 月 30 日前支付。公开台账仅见 12,000 元到账，余款 24,000 元是否到账不清楚。'
const amountsIn = (text: string) => new Set(text.match(/[\d,]+(?:\.\d+)?\s*元/g) || [])

describe('assistant agent orchestration', () => {
  it('plans deterministic steps from facts that exist in the material', () => {
    const steps = planSteps('summary', material)
    expect(steps.map(step => step.id)).toEqual(['read', 'facts', 'scene', 'draft', 'guard'])
    expect(steps[1]!.detail).toContain('金额 3 处')
    expect(steps[1]!.detail).toContain('编号 1 处')
    expect(planSteps('summary', material, 'concise', 2)[0]!.label).toBe('读取上一版初稿 v2')
  })

  it('splits [n] markers into citations without losing any text', () => {
    const parts = splitCites('事项摘要 [1] 后续')
    expect(parts).toEqual([{ text: '事项摘要 ' }, { cite: 1 }, { text: ' 后续' }])
    expect(splitCites('无引用')).toEqual([{ text: '无引用' }])
  })

  it('maps free follow-ups to refine modes and keeps unknown ones as notes', () => {
    expect(detectRefineMode('再简洁一些')).toBe('concise')
    expect(detectRefineMode('列出待核对项')).toBe('checklist')
    expect(detectRefineMode('改成正式公文')).toBe('formal')
    expect(detectRefineMode('换个角度')).toBe('custom')
  })

  it('every refine mode keeps the boundary reminder and adds no amount absent from the material', () => {
    const draft = buildAssistantOutput(material, 'summary')
    const allowed = amountsIn(material)
    for (const mode of ['concise', 'checklist', 'formal', 'custom'] as const) {
      const output = refineAssistantOutput(draft, material, mode, '换个角度')
      for (const amount of amountsIn(output)) expect(allowed.has(amount), `${mode}: ${amount}`).toBe(true)
      expect(output).toContain('使用提醒')
    }
  })

  it('checklist items come only from source facts and sit before the reminder', () => {
    const output = refineAssistantOutput(buildAssistantOutput(material, 'summary'), material, 'checklist')
    const titles = splitSections(output).map(section => section.title)
    expect(titles.indexOf('补充核查清单（按原文要素生成）')).toBeLessThan(titles.indexOf('使用提醒'))
    expect(output).toContain('SZ-HT-2026-018')
    expect(sourceFacts(material).dates).toContain('2026 年 6 月 30 日')
  })

  it('reports which sections changed against the previous version', () => {
    const draft = buildAssistantOutput(material, 'summary')
    const refined = refineAssistantOutput(draft, material, 'checklist')
    expect([...changedSections(refined, draft)]).toEqual(['补充核查清单（按原文要素生成）'])
    expect(changedSections(draft).size).toBe(0)
  })
})
