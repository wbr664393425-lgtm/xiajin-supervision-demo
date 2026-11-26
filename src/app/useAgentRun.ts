import { onBeforeUnmount, reactive, ref } from 'vue'
import { buildOutput, normalizeOutput, planSteps, refine, refineLabels, sceneMeta, transcriptSample, type AgentStep, type RefineMode, type Scene, type Source } from '@/engines/assistant'
import { SYSTEM_PROMPT, buildUserPrompt, REFINE_PROMPT, boundaryCheck } from '@/engines/prompts'
import { streamChat, type ChatMessage } from './llm'
import { useAssistantStore, type AiResult } from '@/stores/assistant'
import { useSystemStore } from '@/stores/system'
import { nowText } from '@/stores/persist'
import { toast } from './toast'

type RunStep = AgentStep & { status: 'wait' | 'run' | 'done' }
const REMINDER = '使用提醒\n本结果为 智能初稿，需人工审核；不构成事实认定、违纪定性或处置意见。'
/**
 * 智能体运行：优先调用 DeepSeek 实时流式生成（经本地代理），不可用时自动回退到本地规则引擎。
 * 两种方式都展示步骤、逐段写出、可中止，完成后写入版本记录与审计日志。
 */
export function useAgentRun() {
  const store = useAssistantStore(), system = useSystemStore()
  const run = ref<null | { title: string; steps: RunStep[]; phase: 'steps' | 'stream'; text: string; reasoning: string; started: number; engine: 'deepseek' | 'local' }>(null)
  let stop = false, timer = 0, ctrl: AbortController | null = null
  const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const wait = (ms: number) => new Promise(r => setTimeout(r, reduced() ? 0 : ms))
  async function typeOut(full: string) {
    if (reduced()) { run.value!.text = full; return }
    await new Promise<void>(resolve => { const tick = () => { if (!run.value || stop) return resolve(); const next = Math.min(full.length, run.value.text.length + 6); run.value.text = full.slice(0, next); if (next >= full.length) return resolve(); timer = window.setTimeout(tick, 18) }; timer = window.setTimeout(tick, 18) })
  }
  function llmSteps(scene: Scene, input: string, mode?: RefineMode, revision = 0): AgentStep[] {
    const s: AgentStep[] = mode ? [{ id: 'prev', label: `读取上一版初稿 v${revision}`, detail: `按要求调整：${refineLabels[mode]}` }] : [{ id: 'read', label: '理解问题与材料', detail: `共 ${input.replace(/【[^】]*】/g, '').trim().length} 字` }]
    if (!mode && (scene === 'qa' || scene === 'law')) s.push({ id: 'kb', label: '检索私有知识库', detail: '召回相关条目作为参考资料，回答附引用' })
    s.push({ id: 'llm', label: '纪检大模型生成', detail: `结合资料推理并逐段写出${store.thinking ? ' · 深度思考' : ''}` })
    s.push({ id: 'guard', label: '边界自检', detail: '检查定性、量纪类表述，保留“智能初稿，人工审核”' })
    return s
  }
  async function viaLlm(scene: Scene, input: string, sources: Source[], base?: AiResult, mode?: RefineMode, note = '') {
    const r = run.value!
    const material = scene === 'transcribe' ? transcriptSample.map(x => `[${x.t}] ${x.who}：${x.text}`).join('\n') : input
    const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: buildUserPrompt(scene, material, sources) }]
    if (base && mode) messages.push({ role: 'assistant', content: base.output }, { role: 'user', content: mode === 'custom' ? `请按以下要求修改上一版，保持原有段落格式、事实边界和“使用提醒”段：${note}` : REFINE_PROMPT[mode]! })
    ctrl = new AbortController()
    r.phase = 'stream'
    for await (const chunk of streamChat(messages, { signal: ctrl.signal, thinking: store.thinking })) {
      if (!run.value) return
      if (chunk.type === 'reasoning') r.reasoning += chunk.text
      else r.text += chunk.text
    }
  }
  async function execute(opts: { scene: Scene; input: string; base?: AiResult; mode?: RefineMode; note?: string; revision?: number; panel?: boolean }): Promise<AiResult | undefined> {
    if (run.value) return
    stop = false
    const { scene, input, base, mode, note = '' } = opts
    const useLlm = store.engine === 'deepseek' && store.configured && store.status !== 'offline'
    const local = base && mode ? { output: refine(base.output, input, mode, note), sources: base.sources } : buildOutput(scene, input)
    const sources = base?.sources || local.sources
    const steps = useLlm ? llmSteps(scene, input, mode, opts.revision || 0) : planSteps(scene, input, mode, opts.revision || 0)
    run.value = reactive({ title: mode ? `按要求调整：${refineLabels[mode]}` : `${sceneMeta[scene].title} · 处理中`, steps: steps.map(s => ({ ...s, status: 'wait' as const })), phase: 'steps' as const, text: '', reasoning: '', started: Date.now(), engine: useLlm ? 'deepseek' as const : 'local' as const })
    let engine: 'deepseek' | 'local' = useLlm ? 'deepseek' : 'local'
    let errorMsg = ''
    for (const s of run.value.steps) {
      if (s.id === 'llm' || s.id === 'guard') break
      s.status = 'run'; await wait(useLlm ? 180 : 240 + Math.min(s.detail.length * 5, 200)); if (stop) { run.value = null; return } s.status = 'done'
    }
    if (useLlm) {
      const llmStep = run.value.steps.find(s => s.id === 'llm')!
      llmStep.status = 'run'
      try { await viaLlm(scene, input, sources, base, mode, note) } catch (e) { if (!stop) errorMsg = e instanceof Error ? e.message : String(e) }
      if (!run.value) return
      if (errorMsg || (!run.value.text.trim() && !stop)) {
        store.status = 'offline'; engine = 'local'
        console.warn('[AI] 大模型不可用，已切换离线引擎：', errorMsg || '无返回内容')
        llmStep.label = '离线引擎生成'; llmStep.detail = '按内置规则与知识库生成'
        run.value.text = ''; run.value.engine = 'local'
        await typeOut(local.output)
      } else if (!stop) store.status = 'online'
      llmStep.status = 'done'
    } else {
      for (const s of run.value.steps) if (s.status === 'wait') { s.status = 'run'; await wait(240); if (stop) { run.value = null; return } s.status = 'done' }
      run.value.phase = 'stream'
      await typeOut(local.output)
    }
    if (!run.value) return
    const full = engine === 'local' ? local.output : run.value.text
    const aborted = stop && (engine === 'deepseek' || run.value.text.length < full.length)
    let output = engine === 'deepseek' ? normalizeOutput(aborted ? run.value.text : full) : (aborted ? run.value.text : full).trim()
    const guard = run.value.steps.find(s => s.id === 'guard')
    if (engine === 'deepseek' && !aborted) {
      const hits = boundaryCheck(output)
      if (hits.length) output += `\n\n边界提醒\n检测到可能属于定性或量纪的表述：${hits.join('、')}。请工作人员删改，系统不作此类结论。`
      if (!/使用提醒/.test(output)) output += `\n\n${REMINDER}`
      if (guard) { guard.status = 'done'; guard.detail = hits.length ? `发现 ${hits.length} 处需人工删改的表述，已追加提醒` : '未发现定性、量纪类表述' }
    }
    const result: AiResult = { id: `AI-${Date.now().toString(36).toUpperCase()}`, scene, input, output, sources, createdAt: nowText(), parentId: base?.id, refine: mode, note: mode === 'custom' ? note : undefined, steps: run.value.steps.map(({ id, label, detail }) => ({ id, label, detail })), elapsedMs: Date.now() - run.value.started, aborted, panel: opts.panel, engine, reasoning: run.value.reasoning || undefined }
    store.results.push(result)
    system.log('assistant', '生成', sceneMeta[scene].title, `${engine === 'deepseek' ? '纪检大模型生成' : '离线引擎生成'}${mode ? `，按“${refineLabels[mode]}”调整` : ''}${aborted ? '（已中止）' : ''}`)
    run.value = null
    return result
  }
  onBeforeUnmount(() => { stop = true; ctrl?.abort(); clearTimeout(timer) })
  return { run, execute, stop: () => { stop = true; ctrl?.abort() } }
}
