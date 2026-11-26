/** 线索关联图谱：从线索要素中抽取人员、村社、项目、企业、资金节点。仅辅助发现，不作定性。 */
import type { ParsedClue } from './clue-parse'

export interface RNode { id: string; label: string; type: 'person' | 'village' | 'project' | 'company' | 'fund' | 'clue'; weight: number; clues: string[]; hint?: string }
export interface REdge { source: string; target: string; label: string }
/** names：合同/项目编号到业务名称的映射，节点显示名称、悬停显示编号 */
export function buildGraph(items: { id: string; village: string; parsed: ParsedClue }[], names: Record<string, string> = {}) {
  const nodes = new Map<string, RNode>(), edges: REdge[] = []
  const add = (id: string, label: string, type: RNode['type'], clue: string) => { const n = nodes.get(id) || { id, label, type, weight: 0, clues: [] }; if (!n.clues.includes(clue)) { n.clues.push(clue); n.weight = n.clues.length } nodes.set(id, n); return id }
  for (const item of items) {
    const c = add(`c:${item.id}`, item.id.replace('XF-2026-', '线索'), 'clue', item.id)
    const accused = item.parsed.fields.accused.value.replace(/（.*$/, '')
    const people = item.parsed.persons.filter(p => p !== accused)
    if (accused) edges.push({ source: c, target: add(`p:${accused}`, accused, 'person', item.id), label: '被反映' })
    people.forEach(p => edges.push({ source: c, target: add(`p:${p}`, p, 'person', item.id), label: '涉及' }))
    edges.push({ source: c, target: add(`v:${item.village}`, item.village, 'village', item.id), label: '发生地' })
    item.parsed.codes.forEach(code => { const id = add(`j:${code}`, names[code] || code, 'project', item.id); nodes.get(id)!.hint = code; edges.push({ source: c, target: id, label: '合同/项目' }) })
    item.parsed.companies.forEach(co => {
      const id = add(`o:${co}`, co.replace(/工程有限公司|有限公司/, ''), 'company', item.id)
      edges.push({ source: c, target: id, label: '关联企业' })
      if (accused) edges.push({ source: `p:${accused}`, target: id, label: '利益关联待核' })
    })
    const big = Math.max(0, ...item.parsed.amounts)
    if (big >= 10000) edges.push({ source: c, target: add(`f:${item.id}`, `${(big / 10000).toFixed(big % 10000 ? 1 : 0)}万元`, 'fund', item.id), label: '涉及资金' })
  }
  const seen = new Set<string>()
  const uniqueEdges = edges.filter(e => { const k = [e.source, e.target].sort().join('|'); if (seen.has(k)) return false; seen.add(k); return true })
  const list = [...nodes.values()]
  return { nodes: list, edges: uniqueEdges, repeated: list.filter(n => n.type !== 'clue' && n.type !== 'village' && n.type !== 'fund' && n.weight >= 2).sort((a, b) => b.weight - a.weight) }
}
