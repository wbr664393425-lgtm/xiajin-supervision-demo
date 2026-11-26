/** 重复举报、多头举报与无效诉求识别。只给出匹配依据，合并与否由人工决定，原件永不删除。 */
import { bigrams, jaccard, sentences, similarity } from './text'
import type { ParsedClue } from './clue-parse'

export interface DedupeInput { id: string; content: string; village: string; reporter: string; channel: string; parsed: ParsedClue }
export interface PairMatch { a: string; b: string; kind: 'duplicate' | 'multi'; similarity: number; reasons: string[]; matches: { a: string; b: string }[] }
export interface InvalidMatch { id: string; reasons: string[] }

const accusedName = (p: ParsedClue) => p.fields.accused.value.replace(/（.*$/, '')
function sentencePairs(a: string, b: string) {
  const sb = sentences(b).map(s => ({ ...s, set: bigrams(s.text) }))
  return sentences(a).flatMap(s => { const set = bigrams(s.text); const best = sb.map(x => ({ x, sim: jaccard(set, x.set) })).sort((p, q) => q.sim - p.sim)[0]; return best && best.sim >= 0.35 ? [{ a: s.text.trim(), b: best.x.text.trim() }] : [] }).slice(0, 4)
}
export function findPairs(items: DedupeInput[]): PairMatch[] {
  const out: PairMatch[] = []
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i]!, b = items[j]!
    const sim = similarity(a.content, b.content)
    const reasons: string[] = []
    const na = accusedName(a.parsed), nb = accusedName(b.parsed)
    if (na && na === nb) reasons.push(`同一被反映人：${na}`)
    const codes = a.parsed.codes.filter(c => b.parsed.codes.includes(c))
    if (codes.length) reasons.push(`同一合同/项目编号：${codes.join('、')}`)
    const companies = a.parsed.companies.filter(c => b.parsed.companies.includes(c))
    if (companies.length) reasons.push(`同一关联企业：${companies.join('、')}`)
    if (a.village === b.village) reasons.push(`同一村社：${a.village}`)
    const duplicate = sim >= 0.55 && a.village === b.village && (a.reporter === b.reporter || sim >= 0.72)
    if (duplicate) { reasons.unshift(`文本相似度 ${Math.round(sim * 100)}%${a.reporter === b.reporter ? '，同一反映人再次反映' : ''}`); out.push({ a: a.id, b: b.id, kind: 'duplicate', similarity: sim, reasons, matches: sentencePairs(a.content, b.content) }); continue }
    const strong = reasons.filter(r => !r.startsWith('同一村社'))
    if (strong.length) out.push({ a: a.id, b: b.id, kind: 'multi', similarity: sim, reasons: [`不同渠道或不同反映人（${a.channel} / ${b.channel}）`, ...reasons], matches: sentencePairs(a.content, b.content) })
  }
  return out.sort((p, q) => q.similarity - p.similarity)
}
export function findInvalid(items: DedupeInput[]): InvalidMatch[] {
  return items.flatMap(item => {
    const p = item.parsed, reasons: string[] = []
    if (p.issueTypes.length === 1 && p.issueTypes[0] === '咨询求助') reasons.push('属于咨询求助类诉求，不涉及违纪违法问题线索，建议转相关部门答复')
    if (!p.fields.accused.value && !p.amounts.length && !p.codes.length && !p.issueTypes.filter(t => t !== '咨询求助').length) reasons.push('无具体被反映对象、事实、时间或金额，无法开展核查')
    return reasons.length ? [{ id: item.id, reasons }] : []
  })
}
