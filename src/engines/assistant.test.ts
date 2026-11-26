import { describe, expect, it } from 'vitest'
import { buildOutput, planSteps, refine, detectRefineMode, splitCites, changedSections, sceneMeta, type Scene } from './assistant'

const amounts = (t: string) => new Set((t.match(/[\d,]+(?:\.\d+)?\s*元/g) || []).map(x => x.replace(/\s/g, '')))
describe('assistant engine', () => {
  it('every scene yields sections, a boundary reminder and citable sources', () => {
    for (const s of Object.keys(sceneMeta) as Scene[]) {
      const r = buildOutput(s, sceneMeta[s].example)
      expect(r.output).toMatch(/提醒|待人工确认|保留与待确认/)
      expect(r.sources.length).toBeGreaterThan(0)
      expect(planSteps(s, sceneMeta[s].example).at(-1)!.id).toBe('guard')
    }
  })
  it('knowledge answers cite retrieved entries', () => {
    const r = buildOutput('law', sceneMeta.law.example)
    expect(r.output).toContain('[1]')
    expect(r.sources[0]!.title).toContain('对抗组织审查')
  })
  it('polish rewrites colloquial wording without inventing amounts', () => {
    const r = buildOutput('polish', sceneMeta.polish.example)
    expect(r.output).toContain('36,000元')
    expect(r.output).toContain('尚未核对一致')
  })
  it('refinements keep the reminder and add no amount absent from the material', () => {
    const input = sceneMeta.summary.example, draft = buildOutput('summary', input).output
    for (const m of ['concise', 'checklist', 'formal', 'custom'] as const) {
      const out = refine(draft, input, m, '换个角度')
      for (const a of amounts(out)) expect(amounts(input + draft).has(a), a).toBe(true)
      expect(out).toContain('使用提醒')
    }
    expect([...changedSections(refine(draft, input, 'checklist'), draft)]).toEqual(['补充核查清单（按原文要素生成）'])
  })
  it('helpers', () => {
    expect(detectRefineMode('再简洁一些')).toBe('concise')
    expect(detectRefineMode('换个角度')).toBe('custom')
    expect(splitCites('a [1] b')).toEqual([{ text: 'a ' }, { cite: 1 }, { text: ' b' }])
  })
})
