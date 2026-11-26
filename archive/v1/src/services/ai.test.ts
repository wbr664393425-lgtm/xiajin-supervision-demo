import { describe, expect, it } from 'vitest'
import { aiService, ocrService } from './ai'
import { createInitialState } from '../mock/data'

describe('本地解析的原文与模拟边界', () => {
  it('自录文本即使包含样例合同编号，也不套用样例金额或结论', async () => {
    const all = createInitialState().clues
    const result = await aiService.analyzeClue({ ...all[0]!, id: 'XF-2026-0999', content: '【虚构演示】合同 SZ-HT-2026-018 的补充材料记载2026年10月29日维护费5,000元，需核对凭据。' }, all)
    expect(result.amount).toContain('5,000元')
    expect(result.amount).not.toContain('36,000')
    expect(result.summary).not.toContain('24,000')
    expect(result.duplicateIds).toContain('XF-2026-0108')
    expect(result.evidence[0]?.excerpt).toContain('5,000元')
  })
  it('TXT读取文件真实内容，保留原始字符', async () => {
    const original = '【虚构材料】金额5,000元\n第二行：等待人工核对。'
    const result = await ocrService.parse(new File([original], '材料.txt', { type: 'text/plain' }))
    expect(result.text).toBe(original)
    expect(result.simulated).toBe(false)
  })
  it('图片入口明确说明没有识别附件实际内容', async () => {
    const result = await ocrService.parse(new File(['fictional binary'], '示例.png', { type: 'image/png' }))
    expect(result.simulated).toBe(true)
    expect(result.note).toContain('未识别附件实际内容')
    expect(result.text).toContain('演示模拟解析')
  })
})
