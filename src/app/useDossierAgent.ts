import { reactive, ref } from 'vue'
import { collectDossier, dossierPlan, dossierPrompt, type Dossier, type DossierRef } from '@/engines/dossier'
import { SYSTEM_PROMPT, boundaryCheck } from '@/engines/prompts'
import { normalizeOutput } from '@/engines/assistant'
import { streamChat } from './llm'
import { useAssistantStore } from '@/stores/assistant'
import { useCluesStore } from '@/stores/clues'
import { useSupervisionStore } from '@/stores/supervision'
import { useBankFlowStore } from '@/stores/bankflow'
import { useInspectionStore } from '@/stores/inspection'
import { useCasesStore } from '@/stores/cases'
import { useOpinionStore } from '@/stores/opinion'
import { useSystemStore } from '@/stores/system'

export interface DossierStep { id: string; label: string; detail: string; status: 'wait' | 'run' | 'done'; refs: DossierRef[] }
export interface DossierRun { subject: string; steps: DossierStep[]; text: string; phase: 'tools' | 'write' | 'done'; engine: 'llm' | 'local'; started: number; elapsed: number; dossier?: Dossier; aborted?: boolean }

/** 打开 智能面板并开始研判的请求（图谱等页面发起），面板监听后执行 */
export const dossierRequest = ref<{ name: string; at: number } | null>(null)
export const requestDossier = (name: string) => { dossierRequest.value = { name, at: Date.now() } }
/** 全局唯一的研判状态：关闭面板后再打开仍能看到上次结果 */
const current = ref<DossierRun | null>(null)
let ctrl: AbortController | null = null, stopped = false

export function useDossierAgent() {
  const assistant = useAssistantStore(), clues = useCluesStore(), sup = useSupervisionStore(), bankflow = useBankFlowStore(), insp = useInspectionStore(), cases = useCasesStore(), opinion = useOpinionStore(), system = useSystemStore()
  const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const wait = (ms: number) => new Promise(r => setTimeout(r, reduced() ? 0 : ms))
  const busy = () => Boolean(current.value && current.value.phase !== 'done')

  async function start(subject: string) {
    const s = subject.trim()
    if (!s || busy()) return
    stopped = false
    const useLlm = assistant.engine === 'deepseek' && assistant.configured && assistant.status !== 'offline'
    const node = clues.graph.nodes.find(n => n.label === s || n.label.startsWith(s))
    const relations = node ? clues.graph.edges.filter(e => e.source === node.id || e.target === node.id).map(e => {
      const other = clues.graph.nodes.find(n => n.id === (e.source === node.id ? e.target : e.source))
      return other && other.type !== 'clue' ? `${other.label}（${e.label}）` : ''
    }).filter(Boolean) : []
    const bankHits = bankflow.allAlertTransactions.map(({ batch, tx }) => ({
      id: tx.id,
      batchName: batch.name,
      subject: batch.subjectName,
      counterparty: tx.counterparty,
      time: tx.time,
      direction: tx.direction,
      amount: tx.amount,
      bank: tx.bank,
      rules: tx.alerts.map(a => a.ruleName),
      summary: tx.summary,
    }))
    const opinionHits = opinion.topics.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      townName: t.townName,
      postCount: t.postCount,
      statusText: t.statusText,
      summary: t.summary,
      entitiesText: [...t.entities.people, ...t.entities.villages, ...t.entities.codes, ...t.entities.companies].join(' '),
    }))
    const d = collectDossier({
      subject: s,
      clues: clues.list.filter(c => !c.state.invalid && !c.state.mergedInto).map(c => ({ id: c.id, content: c.content, village: c.village, townName: c.townName, receivedAt: c.receivedAt, accused: c.parsed.fields.accused.value, issue: c.parsed.fields.issue.value, codes: c.parsed.codes, amounts: c.parsed.amounts })),
      findings: sup.open, inspDocs: insp.docs, cases: cases.cases, relations, kb: cases.kb, bankHits, opinionHits,
    })
    const pick = (prefix: string) => d.refs.filter(r => r.title.startsWith(prefix))
    const r = reactive<DossierRun>({
      subject: s, text: '', phase: 'tools', engine: useLlm ? 'llm' : 'local', started: Date.now(), elapsed: 0,
      steps: [
        { id: 'clue', label: '检索信访线索库', detail: `命中 ${d.clues.length} 条线索${d.villages.length ? ` · 涉及${d.villages.join('、')}` : ''}`, status: 'wait', refs: pick('信访线索') },
        { id: 'sup', label: '比对大数据监督疑点', detail: `三资、惠民资金、招投标、公务支出中关联 ${d.findings.length} 项疑点`, status: 'wait', refs: d.refs.filter(x => x.title.endsWith('疑点')) },
        { id: 'bank', label: '穿透核查银行流水', detail: d.bankHits.length ? `关联 ${d.bankHits.length} 笔银行流水预警，涉及 ${[...new Set(d.bankHits.map(b => b.counterparty))].slice(0, 2).join('、')}` : '银行流水批次中暂无关联预警', status: 'wait', refs: pick('银行流水') },
        { id: 'opinion', label: '检索涉纪公开舆情库', detail: d.opinionHits.length ? `关联 ${d.opinionHits.length} 个公开舆情话题（共 ${d.opinionHits.reduce((a, b) => a + b.postCount, 0)} 条信息）` : '公开舆情库暂无相关反映', status: 'wait', refs: pick('涉纪舆情') },
        { id: 'insp', label: '阅读巡察台账', detail: `相关台账检出 ${d.inspection.length} 处程序疑点`, status: 'wait', refs: pick('巡察台账') },
        { id: 'graph', label: '查询关联图谱', detail: relations.length ? `关联 ${relations.length} 个对象：${relations.slice(0, 3).join('、')}${relations.length > 3 ? '等' : ''}` : '图谱中暂无其他关联对象', status: 'wait', refs: [] },
        { id: 'case', label: '检索案卷与知识库', detail: `在办案卷 ${d.cases.length} 件 · 召回知识条目 ${d.refs.filter(x => !x.to).length} 条`, status: 'wait', refs: [...pick('案卷'), ...d.refs.filter(x => !x.to)] },
        { id: 'write', label: useLlm ? '纪检大模型起草初核方案' : '离线引擎起草初核方案', detail: '汇总以上资料，逐段写出并标注来源', status: 'wait', refs: [] },
        { id: 'guard', label: '边界自检', detail: '检查定性、量纪类表述', status: 'wait', refs: [] },
      ],
    })
    current.value = r
    for (const step of r.steps.slice(0, 7)) {
      step.status = 'run'; await wait(650 + step.refs.length * 60)
      if (stopped) return finish(r, d, true)
      step.status = 'done'
    }
    r.phase = 'write'
    const writeStep = r.steps[7]!, guard = r.steps[8]!
    writeStep.status = 'run'
    const local = dossierPlan(d)
    let ok = false
    if (useLlm) {
      ctrl = new AbortController()
      try {
        for await (const chunk of streamChat([{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: dossierPrompt(d) }], { signal: ctrl.signal, maxTokens: 2400 })) {
          if (chunk.type === 'content') r.text += chunk.text
        }
        ok = Boolean(r.text.trim())
      } catch (e) { if (!stopped) console.warn('[AI] 大模型不可用，已切换离线引擎：', e) }
      if (!ok && !stopped) { assistant.status = 'offline'; r.engine = 'local'; writeStep.label = '离线引擎起草初核方案'; r.text = '' }
      else if (ok) assistant.status = 'online'
    }
    if (!ok && !stopped) await typeOut(r, local)
    writeStep.status = 'done'
    if (stopped) return finish(r, d, true)
    guard.status = 'run'; await wait(300)
    // 大模型偶尔把 ①②③ 写在同一行，统一拆成逐条换行
    let out = r.engine === 'llm' ? normalizeOutput(r.text).replace(/([^\n])\s*([①②③④⑤⑥⑦⑧])/g, '$1\n$2') : r.text.trim()
    const hits = boundaryCheck(out)
    if (hits.length) out = out.replace(/\n*使用提醒[\s\S]*$/, '') + `\n\n边界提醒\n检测到可能属于定性或量纪的表述：${hits.join('、')}。请工作人员删改，系统不作此类结论。\n\n使用提醒\n本方案为 智能初稿，需人工审核；不构成事实认定、违纪定性或处置意见。`
    if (!/使用提醒/.test(out)) out += '\n\n使用提醒\n本方案为 智能初稿，需人工审核；不构成事实认定、违纪定性或处置意见。'
    r.text = out
    guard.detail = hits.length ? `发现 ${hits.length} 处需人工删改的表述，已追加提醒` : '未发现定性、量纪类表述'
    guard.status = 'done'
    finish(r, d, false)
  }
  async function typeOut(r: DossierRun, full: string) {
    if (reduced()) { r.text = full; return }
    while (r.text.length < full.length && !stopped) { r.text = full.slice(0, r.text.length + 8); await wait(16) }
  }
  function finish(r: DossierRun, d: Dossier, aborted: boolean) {
    r.dossier = d; r.aborted = aborted; r.phase = 'done'; r.elapsed = Date.now() - r.started
    r.steps.forEach(s => { if (s.status === 'run') s.status = 'done' })
    system.log('assistant', '生成', `${r.subject} 全景研判`, `智能体汇总线索 ${d.clues.length} 条、疑点 ${d.findings.length} 项、巡察疑点 ${d.inspection.length} 处，${r.engine === 'llm' ? '纪检大模型' : '离线引擎'}起草初核方案${aborted ? '（已中止）' : ''}`)
  }
  function stop() { stopped = true; ctrl?.abort() }
  function clear() { if (!busy()) current.value = null }
  return { current, start, stop, clear, busy }
}
