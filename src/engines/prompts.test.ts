import { describe, expect, it } from 'vitest'
import { SYSTEM_PROMPT, buildUserPrompt, boundaryCheck, materialPrompt, stripMarkdown } from './prompts'
import { splitSections, normalizeOutput } from './assistant'

describe('LLM prompt & output handling', () => {
  it('system prompt fixes the role, boundaries and output format', () => {
    for (const k of ['纪检监察智能助手', '不得编造', '不得作出“构成违纪', '不得杜撰条款编号', '使用提醒', '①②③']) expect(SYSTEM_PROMPT).toContain(k)
    const p = buildUserPrompt('law', '对抗组织审查包括哪些行为', [{ n: 1, title: 'A', excerpt: 'B' }])
    expect(p).toContain('[1] A：B')
    expect(p).toContain('【用户输入】')
  })
  it('flags verdict-like wording', () => {
    expect(boundaryCheck('经查，其行为构成违纪，应当给予党内警告处分')).toHaveLength(2)
    expect(boundaryCheck('反映问题待核查')).toHaveLength(0)
  })
  it('parses model output tolerant of markdown and blank lines after headings', () => {
    const raw = '## 检索结论\n\n**对抗组织审查**是违反政治纪律的行为 [1]。\n\n认定要点\n① 串供\n② 销毁证据\n\n使用提醒\n本结果为 AI 初稿。'
    const s = splitSections(raw)
    expect(s.map(x => x.title)).toEqual(['检索结论', '认定要点', '使用提醒'])
    expect(s[0]!.body).toContain('对抗组织审查是违反政治纪律')
    expect(normalizeOutput(raw)).not.toMatch(/\*\*|##/)
  })
})

describe('边界自检不误报否定表述', () => {
  it('“不构成事实认定、违纪定性”不触发提醒', () => {
    expect(boundaryCheck('本结果不构成事实认定、违纪定性或处置意见。')).toEqual([])
    expect(boundaryCheck('其行为构成违纪')).toHaveLength(1)
  })
})

describe('廉政素材提示词', () => {
  it('只携带所选案例并给出体裁要求', () => {
    const p = materialPrompt('警示教育通报', [{ title: '某村会计虚报亲属补助资金', fact: '虚报 3 户', result: '党内警告', lesson: '惠民资金不能伸手', area: '惠民资金' }], '', '村干部')
    expect(p).toContain('某村会计虚报亲属补助资金')
    expect(p).toContain('主送')
    expect(stripMarkdown('## 一、要求\n**重点**内容')).toBe('一、要求\n重点内容')
  })
})
