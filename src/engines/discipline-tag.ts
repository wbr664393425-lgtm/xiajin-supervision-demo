/** 六大纪律标签与高频风险词：规则命中即给出原文位置，分级只用于排序初筛，不作定性。 */
import type { RiskLevel } from '@/types'
import { findAll, type Span } from './text'

export const disciplines = ['政治纪律', '组织纪律', '廉洁纪律', '群众纪律', '工作纪律', '生活纪律'] as const
export type Discipline = typeof disciplines[number]
const disciplineRules: Record<Discipline, RegExp> = {
  政治纪律: /对抗组织审查|串供|销毁[^。]{0,8}凭证|妄议/,
  组织纪律: /选拔|提拔|民主推荐|考察程序|未经[^。]{0,20}(会议|研究)|擅自/,
  廉洁纪律: /回扣|低于[^。]{0,10}市场|亲属|亲戚|侄子|妻弟|吃喝|工作餐|个人账户|挪用|利益关系|跑腿费|送烟酒|承揽/,
  群众纪律: /吃拿卡要|低保|拖着不办|收取[^。]{0,6}费|困难的几户/,
  工作纪律: /无法正常办公|名单[^。]{0,8}(撤下|没公示)|没开|不作为/,
  生活纪律: /饮酒|赌博|作风散漫/,
}
export const riskWords: { word: string; re: RegExp; weight: number }[] = [
  { word: '违规补贴', re: /不符合条件[^。]{0,6}亲属|虚报|补助[^。]{0,4}收取/, weight: 3 },
  { word: '吃拿卡要', re: /吃拿卡要|请吃饭|送烟酒|跑腿费/, weight: 3 },
  { word: '优亲厚友', re: /亲属|亲戚|关系户|侄子|妻弟/, weight: 2 },
  { word: '工程回扣', re: /回扣|帮助[^。]{0,12}承揽/, weight: 4 },
  { word: '围标串标', re: /围标|串标|商量好/, weight: 3 },
  { word: '公款吃喝', re: /吃喝|工作餐/, weight: 2 },
  { word: '低价发包', re: /低于[^。]{0,10}市场价格?|周边[^。]{0,10}都要/, weight: 3 },
  { word: '挪用资金', re: /个人账户|挪用/, weight: 3 },
  { word: '对抗审查', re: /串供|销毁[^。]{0,8}凭证|对抗组织审查/, weight: 4 },
]
export interface RiskHit extends Span { word: string; text: string }
export interface Grading { tags: { name: Discipline; hits: number }[]; risks: RiskHit[]; score: number; level: RiskLevel; highValue: boolean; reasons: string[] }

export function gradeClue(text: string, facts: { hasAccused: boolean; amounts: number[]; codes: string[]; companies?: string[] }): Grading {
  const tags = disciplines.map(name => ({ name, hits: findAll(text, disciplineRules[name]).length })).filter(t => t.hits > 0)
  const risks: RiskHit[] = riskWords.flatMap(r => findAll(text, r.re).map(h => ({ ...h, word: r.word })))
  const words = [...new Set(risks.map(r => r.word))]
  const reasons: string[] = []
  let score = words.reduce((s, w) => s + riskWords.find(r => r.word === w)!.weight, 0)
  if (words.length) reasons.push(`命中风险词：${words.join('、')}`)
  if (facts.hasAccused) { score += 2; reasons.push('有明确被反映人') }
  const maxAmount = Math.max(0, ...facts.amounts)
  if (maxAmount >= 30000) { score += 2; reasons.push(`涉及金额 ${maxAmount.toLocaleString()} 元`) } else if (maxAmount > 0) score += 1
  if (facts.codes.length) { score += 1; reasons.push(`可查证编号：${facts.codes.join('、')}`) }
  if (facts.companies?.length) { score += 1; reasons.push(`涉及企业：${facts.companies.join('、')}`) }
  if (tags.some(t => t.name === '政治纪律')) { score += 2; reasons.push('涉及政治纪律，需优先研判') }
  const level: RiskLevel = score >= 9 ? 'high' : score >= 4 ? 'mid' : 'low'
  return { tags, risks, score, level, highValue: level === 'high' && facts.hasAccused, reasons }
}
