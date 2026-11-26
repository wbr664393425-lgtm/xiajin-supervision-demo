import { describe, expect, it } from 'vitest'
import { keywordGroupsSeed, opinionPostsSeed, simulationSamples, topicSeeds } from '@/mock/opinion'
import {
  analyzeSimulatedPost,
  build14DaySeries,
  buildReportData,
  diffSnapshots,
  findCrossMatches,
  highlightSegments,
  isHistoricalTopic,
  matchKeywords,
  type CrossSourcePool,
} from './opinion'

const mockPool: CrossSourcePool = {
  clues: [
    { id: 'XF-2026-0102', content: '反映乡镇G和盛村村委会主任张某军出租集体场地 SZ-HT-2026-018', town: 'qinghe', village: '和盛村', accused: '张某军', issue: '农村三资', codes: ['SZ-HT-2026-018'], receivedAt: '2026-10-12', level: 'high' },
    { id: 'XF-2026-0104', content: '乡镇K清源村会计李某华虚报农业设施补助', town: 'qingyuan', village: '清源村', accused: '李某华', issue: '惠民资金', codes: [], receivedAt: '2026-10-08', level: 'high' },
  ],
  findings: [
    { id: 'F-SZ-01', feature: 'assets', rule: '低价出租与欠收', title: '和盛村集体场地租金差额 24,000 元', subject: 'SZ-HT-2026-018', town: 'qinghe', level: 'high', evidenceText: '禾川农机服务社 36000' },
  ],
  inspDocs: [
    { id: 'XC-01', title: '和盛村资产出租会议记录', target: '和盛村', excerpt: '先签合同后补会议记录' },
  ],
  cadres: [
    { id: 'GB-001', name: '张某军', title: '村委会主任', unit: '乡镇G和盛村', town: 'qinghe', openCount: 3, cleanNote: '' },
    { id: 'GB-006', name: '陈某明', title: '副镇长', unit: '乡镇D人民政府', town: 'xilin', openCount: 0, cleanNote: '个人事项与审计未发现异常' },
  ],
  bankHits: [],
}

describe('opinion engine', () => {
  it('matches keywords and filters excluded noise words', () => {
    const hits = matchKeywords('村集体场地低价出租给亲戚，村务公开栏一直未公示', keywordGroupsSeed)
    expect(hits.some(h => h.category === '农村三资')).toBe(true)
    const excluded = matchKeywords('房屋中介推荐的集体场地低价出租房源', keywordGroupsSeed)
    expect(excluded.some(h => h.category === '农村三资')).toBe(false)
  })

  it('splits highlighted segments safely without HTML injection', () => {
    const segs = highlightSegments('反映集体场地低价出租<script>alert(1)</script>', ['集体场地', '低价出租'])
    expect(segs.filter(s => s.hit).map(s => s.text)).toEqual(['集体场地', '低价出租'])
    expect(segs.map(s => s.text).join('')).toContain('<script>')
  })

  it('diffs modified post snapshots accurately', () => {
    const edited = opinionPostsSeed.find(p => p.evidenceStatus === '已改文·留痕对比')!
    const diff = diffSnapshots(edited.originalContent!, edited.content)
    expect(diff.some(d => d.kind === 'removed')).toBe(true)
    expect(diff.some(d => d.kind === 'added')).toBe(true)
  })

  it('finds cross-module matches for entities', () => {
    const matches = findCrossMatches({ people: ['张某军'], villages: ['和盛村'], codes: ['SZ-HT-2026-018'], companies: ['禾川农机服务社'] }, 'qinghe', mockPool)
    expect(matches.map(m => m.sourceType)).toEqual(expect.arrayContaining(['信访线索', '穿透监督', '巡察台账', '廉政档案']))
  })

  it('analyzes simulated posts with accurate acceptance boundary', () => {
    const s1 = simulationSamples[0]!
    const r1 = analyzeSimulatedPost(s1.title, s1.content, s1.sourceId, s1.town, s1.village, keywordGroupsSeed, mockPool)
    expect(r1.acceptance).toBe('拟研判·涉纪苗头')
    expect(r1.crossMatches.length).toBeGreaterThan(0)

    const s2 = simulationSamples[1]!
    const r2 = analyzeSimulatedPost(s2.title, s2.content, s2.sourceId, s2.town, s2.village, keywordGroupsSeed, mockPool)
    expect(r2.acceptance).toBe('非纪检受理·民生咨询')
    expect(r2.level).toBe('info')
  })

  it('marks 30-day-old topics as historical and builds report data', () => {
    expect(isHistoricalTopic('2026-10-05', '2026-11-07')).toBe(true)
    expect(isHistoricalTopic('2026-11-05', '2026-11-07')).toBe(false)
    const series = build14DaySeries(opinionPostsSeed, '2026-11-07')
    expect(series.labels).toHaveLength(14)
    const report = buildReportData(
      'weekly',
      topicSeeds.map(t => ({
        id: t.id, title: t.title, summary: t.summary, category: t.category, level: t.baseLevel,
        town: t.town, village: t.village, postCount: 5, repostCount: 2, platformCount: 3,
        statusText: '待研判', primaryPostId: opinionPostsSeed[0]!.id, primarySourceId: 'douyin',
        primaryEvidenceStatus: '原帖在架', crossCount: 1, historical: isHistoricalTopic(t.lastSeen, '2026-11-07'),
      })),
      opinionPostsSeed,
      '2026-11-07',
      '2026-11-07 10:00',
    )
    expect(report.kpis).toHaveLength(4)
    expect(report.markdown).toContain('演示样例')
  })
})
