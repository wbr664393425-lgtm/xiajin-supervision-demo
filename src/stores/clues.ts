import { computed } from 'vue'
import { defineStore } from 'pinia'
import { clueSeed, type ClueRecord } from '@/mock/clues'
import { parseClue, type FieldKey } from '@/engines/clue-parse'
import { gradeClue } from '@/engines/discipline-tag'
import { findInvalid, findPairs } from '@/engines/clue-dedupe'
import { buildGraph } from '@/engines/relation-graph'
import { contracts, projects } from '@/mock/supervision'

const codeNames: Record<string, string> = Object.fromEntries([...projects.map(p => [p.id, p.name.replace(/工程$/, '')]), ...contracts.map(c => [c.id, `${c.village}${c.kind}租赁`])])
import { deadlineState, flowNodes } from '@/engines/deadline'
import { townName } from '@/mock/geo'
import { registerSearch } from '@/app/search'
import { nowText, persisted, today } from './persist'
import { useSystemStore } from './system'

export interface ClueState {
  node: number; done: boolean; assignee: string
  flow: { node: string; time: string; actor: string; note: string }[]
  overrides: Partial<Record<FieldKey, string>>; screened?: '高价值' | '一般'; mergedInto?: string; invalid?: boolean
}
const seedNodes: Record<string, number> = { 'XF-2026-0102': 2, 'XF-2026-0104': 1, 'XF-2026-0116': 3, 'XF-2026-0109': 1, 'XF-2026-0110': 1, 'XF-2026-0115': 2, 'XF-2026-0106': 1 }
function initialState(c: ClueRecord): ClueState {
  const node = seedNodes[c.id] ?? 0
  const flow = flowNodes.slice(0, node + 1).map((n, i) => ({ node: n, time: `${c.receivedAt} ${String(9 + i * 2).padStart(2, '0')}:30`, actor: i === 0 ? '信访室' : i === 1 ? '信访室 → 监督检查室' : '监督检查室', note: i === 0 ? `${c.channel}登记` : '' }))
  return { node, done: node === 3, assignee: node >= 1 ? '监督检查室' : '待分办', flow, overrides: {} }
}
const pairKey = (a: string, b: string) => [a, b].sort().join('|')

export const useCluesStore = defineStore('clues', () => {
  const system = useSystemStore()
  const added = persisted<ClueRecord[]>('clues.added', () => [])
  const states = persisted<Record<string, ClueState>>('clues.states', () => Object.fromEntries(clueSeed.map(c => [c.id, initialState(c)])))
  const pairDecisions = persisted<Record<string, '合并' | '关联' | '不相关'>>('clues.pairs', () => ({}))

  const records = computed(() => [...added.value, ...clueSeed])
  const list = computed(() => records.value.map(c => {
    const parsed = parseClue(c.content)
    const state = states.value[c.id] || initialState(c)
    for (const [k, v] of Object.entries(state.overrides)) parsed.fields[k as FieldKey] = { ...parsed.fields[k as FieldKey], value: v, confidence: 'high' }
    const grading = gradeClue(c.content, { hasAccused: Boolean(parsed.fields.accused.value), amounts: parsed.amounts, codes: parsed.codes, companies: parsed.companies })
    return { ...c, townName: townName(c.town), parsed, grading, state, dl: deadlineState(c.receivedAt, today(), state.done || Boolean(state.invalid) || Boolean(state.mergedInto)) }
  }))
  const byId = (id: string) => list.value.find(c => c.id === id)
  const pairs = computed(() => findPairs(list.value))
  const invalid = computed(() => findInvalid(list.value))
  const graph = computed(() => buildGraph(list.value.filter(c => !c.state.invalid), codeNames))

  function ensure(id: string) { const c = records.value.find(r => r.id === id)!; if (!states.value[id]) states.value[id] = initialState(c); return states.value[id]! }
  function register(record: Omit<ClueRecord, 'id'>, overrides: Partial<Record<FieldKey, string>>) {
    const id = `XF-2026-${String(118 + added.value.length).padStart(4, '0')}`
    added.value.unshift({ ...record, id })
    states.value[id] = { ...initialState({ ...record, id }), overrides, flow: [{ node: '登记受理', time: nowText(), actor: system.user, note: `${record.channel}登记，人工核对解析要素后入库` }] }
    system.log('clues', '生成', id, `${record.channel}材料解析入库，${Object.keys(overrides).length} 项要素经人工修正`)
    return id
  }
  function advance(id: string, note: string) {
    const s = ensure(id)
    if (s.node >= flowNodes.length - 1) return
    s.node++; s.done = s.node === flowNodes.length - 1
    if (s.node === 1) s.assignee = '监督检查室'
    s.flow.push({ node: flowNodes[s.node]!, time: nowText(), actor: system.user, note })
    system.log('clues', '流转', id, `推进至「${flowNodes[s.node]}」${note ? '：' + note : ''}`)
  }
  function decidePair(a: string, b: string, decision: '合并' | '关联' | '不相关') {
    pairDecisions.value[pairKey(a, b)] = decision
    if (decision === '合并') { ensure(b).mergedInto = a } else if (states.value[b]?.mergedInto === a) delete states.value[b]!.mergedInto
    system.log('clues', '确认', `${a} / ${b}`, `人工判定：${decision}${decision === '合并' ? '（原件保留，后者并入前者办理）' : ''}`)
  }
  const pairDecision = (a: string, b: string) => pairDecisions.value[pairKey(a, b)]
  function markInvalid(id: string, value: boolean) { ensure(id).invalid = value; system.log('clues', '确认', id, value ? '人工确认为无效诉求，转相关部门答复' : '撤销无效标记，恢复研判') }
  function screen(ids: string[], value: '高价值' | '一般') { ids.forEach(id => { ensure(id).screened = value }); system.log('clues', '确认', `${ids.length} 条线索`, `批量初筛标记为「${value}」`) }

  registerSearch(() => list.value.map(c => ({ id: c.id, title: `${c.parsed.fields.accused.value || c.village} · ${c.parsed.fields.issue.value || '信访线索'}`, type: '信访线索', to: `/clues/ledger?id=${c.id}` })))
  return { records, list, byId, pairs, invalid, graph, register, advance, decidePair, pairDecision, markInvalid, screen, states }
})
