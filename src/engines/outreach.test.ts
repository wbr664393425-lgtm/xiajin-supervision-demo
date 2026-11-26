import { describe, expect, it } from 'vitest'
import { cadres, posts, educationCases, materialTypes } from '@/mock/outreach'
import { objectiveTags, archiveSummary, integrityOpinion, generateMaterial, clusterPosts } from './outreach'

describe('archive & outreach engines', () => {
  it('tags are objective facts only and never a risk verdict', () => {
    for (const c of cadres) {
      const tags = objectiveTags(c, { clues: 0, findings: 0 })
      const text = tags.map(t => t.label).join() + archiveSummary(c, tags) + integrityOpinion(c, tags, '某职务')
      expect(text).not.toMatch(/风险高|风险较高|高风险|廉政风险等级|不宜提拔|建议不予/)
    }
    expect(objectiveTags(cadres[0]!, { clues: 2, findings: 3 }).map(t => t.key)).toEqual(expect.arrayContaining(['xf', 'xc', 'zj', 'open']))
  })
  it('generates all five material types and marks them as drafts', () => {
    for (const t of materialTypes) expect(generateMaterial(t, educationCases.slice(0, 2), '', '村干部')).toMatch(/初稿|审核/)
  })
  it('clusters posts into hotspots and raises alerts for conduct issues', () => {
    const c = clusterPosts(posts)
    expect(c[0]!.topic).toBe('服务站办事作风')
    expect(c[0]!.level).toBe('high')
    expect(c.find(x => x.topic === '社区公共服务')!.category).toBe('民生诉求')
    expect(c.reduce((s, x) => s + x.posts.length, 0)).toBeGreaterThanOrEqual(posts.length)
  })
})
