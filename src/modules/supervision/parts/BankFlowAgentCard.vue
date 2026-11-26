<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  Check, Clipboard, Download, FileSearch2, RotateCcw, Sparkles, Square, Workflow, X,
} from 'lucide-vue-next'
import { AiNotice, UiButton, UiCard, UiTag } from '@/design/ui'
import {
  BANK_AGENT_MODES,
  buildBankAgentContext,
  buildBankAgentLocalReport,
  buildBankAgentPrompt,
  type BankAgentContext,
  type BankAgentMode,
  type BankAgentRef,
} from '@/engines/bankflow-agent'
import { normalizeOutput, splitCites, splitSections } from '@/engines/assistant'
import { SYSTEM_PROMPT, boundaryCheck } from '@/engines/prompts'
import { streamChat } from '@/app/llm'
import { requestDossier } from '@/app/useDossierAgent'
import { downloadText } from '@/app/download'
import { useAssistantStore } from '@/stores/assistant'
import { useBankFlowStore } from '@/stores/bankflow'
import { useSystemStore } from '@/stores/system'
import { today } from '@/stores/persist'
import { toast } from '@/app/toast'

const props = defineProps<{ autoRunKey?: number; initialMode?: BankAgentMode; closable?: boolean }>()
const emit = defineEmits<{ 'open-tx': [txId: string]; close: [] }>()

const store = useBankFlowStore()
const assistant = useAssistantStore()
const system = useSystemStore()

const mode = ref<BankAgentMode>('chain')
const customQuestion = ref('')
const copied = ref(false)

interface AgentStep {
  id: string
  label: string
  detail: string
  status: 'wait' | 'run' | 'done'
}

interface AgentRunState {
  batchId: string
  mode: BankAgentMode
  engine: 'llm' | 'local'
  phase: 'steps' | 'write' | 'done'
  steps: AgentStep[]
  text: string
  reasoning: string
  refs: BankAgentRef[]
  started: number
  elapsed: number
  aborted: boolean
}

const current = ref<AgentRunState | null>(null)
let ctrl: AbortController | null = null
let stopped = false

const busy = computed(() => Boolean(current.value && current.value.phase !== 'done'))
const sections = computed(() => splitSections(current.value?.text || ''))
const refsByN = computed(() => Object.fromEntries((current.value?.refs || []).map(r => [r.n, r])))

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const wait = (ms: number) => new Promise(r => setTimeout(r, reduced() ? 0 : ms))

async function typeOut(state: AgentRunState, full: string) {
  if (reduced()) { state.text = full; return }
  while (state.text.length < full.length && !stopped) {
    state.text = full.slice(0, state.text.length + 10)
    await wait(14)
  }
}

async function start(targetMode: BankAgentMode = mode.value) {
  if (busy.value) return
  mode.value = targetMode
  stopped = false

  const ctx: BankAgentContext = buildBankAgentContext(
    store.currentBatch,
    store.overview,
    store.counterparties,
    store.analyzed,
  )
  const useLlm = assistant.engine === 'deepseek' && assistant.configured && assistant.status !== 'offline'
  const modeLabel = BANK_AGENT_MODES.find(m => m.key === targetMode)?.label || '智能研判'

  const state = reactive<AgentRunState>({
    batchId: store.currentBatch.id,
    mode: targetMode,
    engine: useLlm ? 'llm' : 'local',
    phase: 'steps',
    text: '',
    reasoning: '',
    refs: ctx.refs,
    started: Date.now(),
    elapsed: 0,
    aborted: false,
    steps: [
      {
        id: 'scan',
        label: '梳理本批流水与异常预警',
        detail: `汇总 ${store.currentBatch.transactions.length} 笔流水，锁定 ${ctx.alerts.length} 笔未排除预警与 ${ctx.refs.length} 份核心引用`,
        status: 'wait',
      },
      {
        id: 'chain',
        label: '穿透资金链路与重点对手方',
        detail: `识别 ${ctx.counterparties.filter(c => c.alertCount > 0).length} 户预警对手方，关联过桥、拆分与敏感节点特征`,
        status: 'wait',
      },
      {
        id: 'write',
        label: useLlm ? `纪检大模型流式生成 · ${modeLabel}` : `离线引擎起草 · ${modeLabel}`,
        detail: '按公文语体逐段输出并标注原流水引用序号 [n]',
        status: 'wait',
      },
      {
        id: 'guard',
        label: '执纪边界自检',
        detail: '核验是否存在违纪定性、量纪类表述并保留人工审核提醒',
        status: 'wait',
      },
    ],
  })
  current.value = state

  for (const step of state.steps.slice(0, 2)) {
    step.status = 'run'
    await wait(360)
    if (stopped) return finish(state, true)
    step.status = 'done'
  }

  state.phase = 'write'
  const writeStep = state.steps[2]!
  const guardStep = state.steps[3]!
  writeStep.status = 'run'

  const localDraft = buildBankAgentLocalReport(ctx, targetMode, customQuestion.value)
  let llmOk = false

  if (useLlm) {
    ctrl = new AbortController()
    try {
      const prompt = buildBankAgentPrompt(ctx, targetMode, customQuestion.value)
      for await (const chunk of streamChat(
        [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
        { signal: ctrl.signal, thinking: assistant.thinking, maxTokens: 2000 },
      )) {
        if (stopped) break
        if (chunk.type === 'reasoning') state.reasoning += chunk.text
        else state.text += chunk.text
      }
      llmOk = Boolean(state.text.trim())
    } catch {
      if (!stopped) {
        assistant.status = 'offline'
        state.engine = 'local'
        writeStep.label = `离线引擎起草 · ${modeLabel}`
        state.text = ''
      }
    }
    if (llmOk && !stopped) assistant.status = 'online'
  }

  if (!llmOk && !stopped) {
    await typeOut(state, localDraft)
  }
  writeStep.status = 'done'
  if (stopped) return finish(state, true)

  guardStep.status = 'run'
  await wait(220)
  let out = state.engine === 'llm'
    ? normalizeOutput(state.text).replace(/([^\n])\s*([①②③④⑤⑥⑦⑧])/g, '$1\n$2')
    : state.text.trim()
  const hits = boundaryCheck(out)
  if (hits.length) {
    out = out.replace(/\n*使用提醒[\s\S]*$/, '')
      + `\n\n边界提醒\n检测到可能属于定性或量纪的表述：${hits.join('、')}。请工作人员删改，系统不作此类结论。\n\n使用提醒\n本报告为智能初稿，需人工审核；不构成事实认定、违纪定性或处置意见。`
  }
  if (!/使用提醒/.test(out)) {
    out += '\n\n使用提醒\n本报告为智能初稿，需人工审核；不构成事实认定、违纪定性或处置意见。'
  }
  state.text = out
  guardStep.detail = hits.length ? `检出 ${hits.length} 处需人工删改表述，已追加提醒` : '未发现违纪定性或量纪类表述'
  guardStep.status = 'done'
  finish(state, false)
}

function finish(state: AgentRunState, aborted: boolean) {
  state.aborted = aborted
  state.phase = 'done'
  state.elapsed = Date.now() - state.started
  state.steps.forEach(s => { if (s.status === 'run') s.status = 'done' })
  const modeLabel = BANK_AGENT_MODES.find(m => m.key === state.mode)?.label || '智能研判'
  system.log(
    'supervision',
    '生成',
    `${store.currentBatch.subjectName} 银行流水${modeLabel}`,
    `${state.engine === 'llm' ? '纪检大模型' : '离线引擎'}生成研判初稿，引用 ${state.refs.length} 笔预警流水${aborted ? '（已中止）' : ''}`,
  )
}

function stop() {
  stopped = true
  ctrl?.abort()
}

function clickCite(n: number) {
  const refItem = refsByN.value[n]
  if (refItem) emit('open-tx', refItem.txId)
}

async function copyReport() {
  if (!current.value?.text) return
  const modeLabel = BANK_AGENT_MODES.find(m => m.key === current.value!.mode)?.label || '智能研判'
  await navigator.clipboard.writeText(`【智能初稿，人工审核】${store.currentBatch.name} · ${modeLabel}\n\n${current.value.text}`)
  copied.value = true
  toast('已复制研判初稿', 'ok')
  setTimeout(() => { copied.value = false }, 2000)
}

function exportDraft() {
  if (!current.value?.text) return
  const modeLabel = BANK_AGENT_MODES.find(m => m.key === current.value!.mode)?.label || '智能研判'
  const fileName = `${store.currentBatch.subjectName}_银行流水${modeLabel}_${today()}.txt`
  const refLines = current.value.refs.map(r => `[${r.n}] ${r.excerpt}`).join('\n')
  downloadText(fileName, `${store.currentBatch.name} · ${modeLabel}\n\n${current.value.text}\n\n附：引用流水明细\n${refLines}`)
  system.log('supervision', '导出', fileName, '导出银行流水智能研判初稿')
  toast('已导出研判初稿文本', 'ok')
}

watch(() => store.currentBatchId, () => {
  if (busy.value) stop()
  current.value = null
})

watch(() => props.autoRunKey, key => {
  if (!key) return
  if (props.initialMode) mode.value = props.initialMode
  if (busy.value) stop()
  void start(props.initialMode || mode.value)
}, { immediate: true })

onBeforeUnmount(() => { stopped = true; ctrl?.abort() })
</script>

<template>
  <UiCard :icon="Sparkles" title="银行流水智能体深度研判" :subtitle="`结合「${store.currentBatch.subjectName}」本批流水与预警链路，由纪检大模型流式解析并标注可回溯引用`">
    <template #extra>
      <UiTag tone="ai" size="sm">{{ assistant.engine === 'deepseek' && assistant.configured && assistant.status !== 'offline' ? '纪检大模型在线' : '离线引擎就绪' }}</UiTag>
      <UiButton size="sm" variant="soft" :icon="Workflow" @click="requestDossier(store.currentBatch.subjectName)">跨库全景研判「{{ store.currentBatch.subjectName }}」</UiButton>
      <UiButton v-if="closable" size="sm" variant="ghost" :icon="X" @click="emit('close')">收起</UiButton>
    </template>

    <div class="agent-top">
      <div class="mode-cards" role="tablist" aria-label="研判视角">
        <button
          v-for="m in BANK_AGENT_MODES"
          :key="m.key"
          type="button"
          class="mode-btn"
          :class="{ on: mode === m.key }"
          :disabled="busy"
          @click="mode = m.key"
        >
          <strong>{{ m.label }}</strong>
          <span>{{ m.desc }}</span>
        </button>
      </div>

      <div class="ask-row">
        <input
          v-model="customQuestion"
          class="input"
          :disabled="busy"
          placeholder="可选：补充重点核查方向，如“重点剖析与夏润建设之间的过桥资金流向”"
          aria-label="补充智能研判关注点"
          @keydown.enter.prevent="start(mode)"
        />
        <UiButton v-if="busy" variant="danger" :icon="Square" @click="stop">停止生成</UiButton>
        <UiButton v-else variant="primary" :icon="Sparkles" @click="start(mode)">{{ current ? '重新智能解析' : '开始智能解析' }}</UiButton>
      </div>
    </div>

    <div v-if="!current" class="agent-empty">
      <FileSearch2 :size="20" class="ae-ic" />
      <div>
        <strong>点击「开始智能解析」，由纪检智能体自动串联本批 {{ store.overview.alertTxCount }} 笔预警流水</strong>
        <p class="muted">生成结果自动附带原流水引用角标 [1][2]…，点击角标可在右侧抽屉直达核验对应交易；也可点击右上角唤起全平台跨库「全景研判」。</p>
      </div>
    </div>

    <div v-else class="agent-workspace">
      <!-- 左侧：执行步骤与可溯源引用流水 -->
      <aside class="aw-side">
        <h4>智能体执行步骤</h4>
        <ol class="steps">
          <li v-for="s in current.steps" :key="s.id" :class="s.status">
            <span class="mk"><Check v-if="s.status === 'done'" :size="10" :stroke-width="3" /></span>
            <div>
              <strong>{{ s.label }}</strong>
              <p v-if="s.status !== 'wait'">{{ s.detail }}</p>
            </div>
          </li>
        </ol>

        <template v-if="current.refs.length">
          <h4>引用原流水 <span class="muted num">（点击核查）</span></h4>
          <ul class="ref-list scroll-thin">
            <li v-for="r in current.refs" :key="r.n">
              <button type="button" @click="emit('open-tx', r.txId)">
                <b class="num">[{{ r.n }}]</b>
                <span>{{ r.title }}</span>
              </button>
            </li>
          </ul>
        </template>
      </aside>

      <!-- 右侧：流式研判初稿正文 -->
      <div class="aw-doc">
        <div v-if="current.reasoning && !current.text" class="think-box">
          <strong>深度推演中…</strong>
          <p>{{ current.reasoning.slice(-220) }}</p>
        </div>
        <div v-else-if="current.phase === 'write' && !current.text" class="waiting">
          <i /><i /><i />正在结合原流水起草研判初稿…
        </div>

        <div v-if="sections.length" class="doc-body">
          <header class="doc-head">
            <h3>{{ store.currentBatch.subjectName }} · {{ BANK_AGENT_MODES.find(m => m.key === current?.mode)?.label }}（初稿）</h3>
            <span v-if="current.phase === 'done'" class="done-meta">
              <Check :size="13" />{{ current.engine === 'llm' ? '纪检大模型' : '离线引擎' }} · {{ (current.elapsed / 1000).toFixed(1) }} 秒{{ current.aborted ? ' · 已中止' : '' }}
            </span>
          </header>
          <article v-for="(sec, i) in sections" :key="i" class="doc-sec">
            <h5>{{ sec.title.replace(/\s*\[\d+\]/g, '') }}</h5>
            <p>
              <template v-for="(part, j) in splitCites(sec.body)" :key="j">
                <button
                  v-if="'cite' in part"
                  type="button"
                  class="cite"
                  :title="refsByN[part.cite]?.title || `查看引用 ${part.cite}`"
                  @click="clickCite(part.cite)"
                >{{ part.cite }}</button>
                <template v-else>{{ part.text }}</template>
              </template>
            </p>
          </article>
        </div>

        <footer v-if="current.phase === 'done'" class="doc-acts">
          <UiButton size="sm" variant="secondary" :icon="Clipboard" @click="copyReport">{{ copied ? '已复制' : '复制初稿' }}</UiButton>
          <UiButton size="sm" variant="secondary" :icon="Download" :disabled="!system.can('export')" @click="exportDraft">导出初稿文本</UiButton>
          <UiButton size="sm" variant="ghost" :icon="RotateCcw" @click="start(mode)">重新生成</UiButton>
        </footer>
      </div>
    </div>

    <AiNotice style="margin-top:12px" text="智能研判初稿仅依据本批次清洗后的流水生成，引用角标均可回查原流水；不构成违纪违法定性或处分意见。" />
  </UiCard>
</template>

<style scoped>
.agent-top{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
.mode-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mode-btn{text-align:left;padding:10px 12px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2);transition:all var(--dur);display:flex;flex-direction:column;gap:3px}
.mode-btn:hover:not(:disabled){border-color:var(--red-line);background:var(--red-25)}
.mode-btn.on{border-color:var(--red);background:var(--red-50);box-shadow:inset 0 0 0 1px var(--red-line)}
.mode-btn strong{font-size:13.5px;color:var(--text)}
.mode-btn.on strong{color:var(--red-600)}
.mode-btn span{font-size:12px;color:var(--text-3);line-height:1.45}
.ask-row{display:flex;gap:8px;align-items:center}
.ask-row .input{flex:1;height:36px;padding:6px 12px}

.agent-empty{display:flex;align-items:flex-start;gap:12px;padding:16px;border-radius:var(--r-sm);background:linear-gradient(120deg,var(--cream),var(--red-25));border:1px solid var(--gold-line)}
.ae-ic{color:var(--red);margin-top:2px;flex:none}
.agent-empty strong{display:block;font-size:14px;color:var(--text)}
.agent-empty p{font-size:13px;margin-top:3px;line-height:1.6}

.agent-workspace{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:start}
.aw-side{padding:12px 14px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line);display:flex;flex-direction:column;gap:10px}
.aw-side h4{font-size:13px;font-weight:600;color:var(--text-2);margin:0}
.steps{display:flex;flex-direction:column;gap:9px}
.steps li{display:flex;gap:8px;font-size:12px;color:var(--text-4)}
.steps .mk{width:15px;height:15px;flex:none;margin-top:2px;border-radius:50%;box-shadow:inset 0 0 0 1.5px currentColor;display:flex;align-items:center;justify-content:center}
.steps li.run{color:var(--red)}
.steps li.run .mk{animation:bf-pulse 1s ease-in-out infinite}
.steps li.done{color:var(--text-2)}
.steps li.done .mk{background:var(--ok);color:var(--on-brand);box-shadow:none}
.steps strong{display:block;font-size:13px;font-weight:600;color:inherit}
.steps li.done strong{color:var(--text)}
.steps p{color:var(--text-3);margin-top:1px;line-height:1.5}

.ref-list{display:flex;flex-direction:column;gap:4px;max-height:240px;overflow-y:auto}
.ref-list button{width:100%;display:flex;align-items:baseline;gap:6px;padding:6px 8px;border-radius:6px;background:var(--surface);border:1px solid var(--line);text-align:left;font-size:12px;color:var(--text-2);transition:all var(--dur)}
.ref-list button:hover{border-color:var(--red-line);color:var(--red);background:var(--red-25)}
.ref-list b{color:var(--red);flex:none}
.ref-list span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.aw-doc{padding:16px 18px;border-radius:var(--r-sm);background:var(--surface);border:1px solid var(--line);min-height:240px;display:flex;flex-direction:column;gap:12px}
.think-box{padding:10px 12px;border-radius:var(--r-sm);background:var(--ai-bg);border:1px solid var(--ai-line);font-size:12.5px;color:var(--ai)}
.think-box p{margin-top:4px;color:var(--text-2);line-height:1.6}
.waiting{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ai);padding:12px 0}
.waiting i{width:6px;height:6px;border-radius:50%;background:currentColor;animation:bf-pulse 1s infinite}
.waiting i:nth-child(2){animation-delay:.15s}
.waiting i:nth-child(3){animation-delay:.3s}

.doc-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-bottom:10px;border-bottom:1px solid var(--line)}
.doc-head h3{font-size:15px;font-weight:700;color:var(--red-700)}
.done-meta{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--ok)}
.doc-sec{margin-top:12px}
.doc-sec h5{font-size:13.5px;font-weight:700;color:var(--text);margin-bottom:4px}
.doc-sec p{font-size:13.5px;line-height:1.85;color:var(--text-2);white-space:pre-line}
.cite{font-size:10.5px;line-height:1;padding:2px 5px;margin:0 2px;border-radius:4px;background:var(--red-50);color:var(--red);font-weight:700;vertical-align:super;transition:all var(--dur)}
.cite:hover{background:var(--red);color:var(--on-brand)}
.doc-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--line)}

@keyframes bf-pulse{50%{opacity:.35}}
@media(max-width:1100px){.mode-cards,.agent-workspace{grid-template-columns:1fr}}
</style>
