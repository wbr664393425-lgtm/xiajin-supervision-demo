<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Check, Clipboard, Download, FileCheck2, FileSearch2, Link2, RotateCcw,
  Sparkles, Square, Workflow, X,
} from 'lucide-vue-next'
import { AiNotice, UiButton, UiCard, UiSelect, UiTag } from '@/design/ui'
import {
  OPINION_AGENT_MODES,
  buildOpinionAgentContext,
  buildOpinionAgentLocalReport,
  buildOpinionAgentPrompt,
  type OpinionAgentContext,
  type OpinionAgentMode,
  type OpinionAgentRef,
} from '@/engines/opinion-agent'
import { normalizeOutput, splitCites, splitSections } from '@/engines/assistant'
import { SYSTEM_PROMPT, boundaryCheck } from '@/engines/prompts'
import { streamChat } from '@/app/llm'
import { requestDossier } from '@/app/useDossierAgent'
import { downloadText } from '@/app/download'
import { useAssistantStore } from '@/stores/assistant'
import { useOpinionStore } from '@/stores/opinion'
import { useSystemStore } from '@/stores/system'
import { today } from '@/stores/persist'
import { toast } from '@/app/toast'

const props = defineProps<{
  autoRunKey?: number
  initialMode?: OpinionAgentMode
  initialTopicId?: string | null
  closable?: boolean
}>()

const emit = defineEmits<{
  'open-post': [postId: string]
  close: []
}>()

const router = useRouter()
const store = useOpinionStore()
const assistant = useAssistantStore()
const system = useSystemStore()

const mode = ref<OpinionAgentMode>(props.initialMode || 'briefing')
const selectedTopicId = ref<string>(props.initialTopicId || store.activeTopics[0]?.id || '')
const customQuestion = ref('')
const copied = ref(false)

interface AgentStep { id: string; label: string; detail: string; status: 'wait' | 'run' | 'done' }
interface AgentRunState {
  mode: OpinionAgentMode
  topicId?: string
  engine: 'llm' | 'local'
  phase: 'steps' | 'write' | 'done'
  steps: AgentStep[]
  text: string
  reasoning: string
  refs: OpinionAgentRef[]
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

const topicOptions = computed(() =>
  store.activeTopics
    .filter(t => t.category !== '非纪检民生')
    .map(t => ({ value: t.id, label: `${t.title}（${t.townName} · ${t.postCount}条）` })),
)

const focusTopic = computed(() => store.activeTopics.find(t => t.id === selectedTopicId.value) || store.activeTopics[0])
const focusSubject = computed(() => focusTopic.value?.entities.people[0] || focusTopic.value?.entities.companies[0] || '')

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const wait = (ms: number) => new Promise(r => setTimeout(r, reduced() ? 0 : ms))

async function typeOut(state: AgentRunState, full: string) {
  if (reduced()) { state.text = full; return }
  while (state.text.length < full.length && !stopped) {
    state.text = full.slice(0, state.text.length + 14)
    await wait(14)
  }
}

async function runAnalysis(targetMode: OpinionAgentMode = mode.value, overrideTopicId?: string | null) {
  if (busy.value) return
  mode.value = targetMode
  if (overrideTopicId) selectedTopicId.value = overrideTopicId
  else if (targetMode === 'clarify') {
    const clarify = store.activeTopics.find(t => t.category === '涉纪不实传言')
    if (clarify) selectedTopicId.value = clarify.id
  }

  stopped = false
  const ctx: OpinionAgentContext = buildOpinionAgentContext(
    store.activeTopics,
    targetMode,
    targetMode === 'briefing' ? null : selectedTopicId.value,
  )
  const useLlm = assistant.engine === 'deepseek' && assistant.configured && assistant.status !== 'offline'

  const state = reactive<AgentRunState>({
    mode: targetMode,
    topicId: ctx.focusTopic?.id,
    engine: useLlm ? 'llm' : 'local',
    phase: 'steps',
    text: '',
    reasoning: '',
    refs: ctx.refs,
    started: Date.now(),
    elapsed: 0,
    aborted: false,
    steps: [
      { id: 'gather', label: '汇集公开舆情与词包命中', detail: `纳入 ${ctx.topics.length} 个涉纪话题，抽取 ${ctx.refs.filter(r => r.kind === 'post').length} 条核心公开原声`, status: 'wait' },
      { id: 'snap', label: '核验删帖与改文保全快照', detail: ctx.snapshotCount ? `检出 ${ctx.snapshotCount} 份删帖/改文异常保全快照，纳入重点核查依据` : '相关帖文当前在架，已核对原始抓取时间', status: 'wait' },
      { id: 'cross', label: '穿透碰撞全站业务库', detail: ctx.crossTotal ? `关联命中信访、穿透监督、巡察与廉政档案 ${ctx.crossTotal} 项记录` : '暂未命中异常在库记录（同步核验廉政档案清白度）', status: 'wait' },
      { id: 'write', label: useLlm ? '纪检大模型流式研判' : '本地研判引擎起草初稿', detail: `按「${OPINION_AGENT_MODES.find(m => m.key === targetMode)?.label}」视角生成带 [n] 溯源初稿`, status: 'wait' },
      { id: 'guard', label: '执纪边界自检', detail: '检查定性、量纪、删帖控评类越界表述', status: 'wait' },
    ],
  })
  current.value = state

  for (const s of state.steps.slice(0, 3)) {
    s.status = 'run'
    await wait(340)
    if (stopped) return finish(state, true)
    s.status = 'done'
  }

  state.phase = 'write'
  const writeStep = state.steps[3]!
  const guardStep = state.steps[4]!
  writeStep.status = 'run'

  const localText = buildOpinionAgentLocalReport(ctx, customQuestion.value)
  let ok = false
  if (useLlm) {
    ctrl = new AbortController()
    try {
      for await (const chunk of streamChat([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildOpinionAgentPrompt(ctx, customQuestion.value) },
      ], { signal: ctrl.signal, maxTokens: 2000 })) {
        if (chunk.type === 'reasoning') state.reasoning += chunk.text
        else if (chunk.type === 'content') state.text += chunk.text
      }
      ok = Boolean(state.text.trim())
    } catch {
      // 网络或模型异常时静默回退本地规则引擎
    }
    if (!ok && !stopped) {
      assistant.status = 'offline'
      state.engine = 'local'
      writeStep.label = '本地研判引擎起草初稿'
      state.text = ''
    } else if (ok) {
      assistant.status = 'online'
    }
  }

  if (!ok && !stopped) await typeOut(state, localText)
  writeStep.status = 'done'
  if (stopped) return finish(state, true)

  guardStep.status = 'run'
  await wait(240)
  let out = state.engine === 'llm'
    ? normalizeOutput(state.text).replace(/([^\n])\s*([①②③④⑤⑥⑦⑧])/g, '$1\n$2')
    : state.text.trim()
  const hits = boundaryCheck(out)
  if (hits.length) {
    out = out.replace(/\n*使用提醒[\s\S]*$/, '')
      + `\n\n边界提醒\n检测到可能属于定性或量纪的表述：${hits.join('、')}。请人工删改，系统不作此类结论。\n\n使用提醒\n本研判为智能辅助初稿，仅汇总公开信息与平台已有客观记录，须经纪检干部审核把关。`
  }
  if (!/使用提醒/.test(out)) {
    out += '\n\n使用提醒\n本研判为智能辅助初稿，仅汇总公开信息与平台已有客观记录，须经纪检干部审核把关。'
  }
  state.text = out
  guardStep.detail = hits.length ? `提示 ${hits.length} 处需人工审改表述` : '未发现定性、量纪或越权表述'
  guardStep.status = 'done'
  finish(state, false)
}

function finish(state: AgentRunState, aborted: boolean) {
  state.phase = 'done'
  state.aborted = aborted
  state.elapsed = Date.now() - state.started
  state.steps.forEach(s => { if (s.status === 'run') s.status = 'done' })
  const mLabel = OPINION_AGENT_MODES.find(m => m.key === state.mode)?.label || '舆情研判'
  system.log('opinion', '生成', `舆情智能体 · ${mLabel}`, `${state.engine === 'llm' ? '纪检大模型' : '本地规则引擎'}完成研判初稿${aborted ? '（已中止）' : ''}`)
}

function stopRun() {
  stopped = true
  ctrl?.abort()
}

function onClickRef(refItem?: OpinionAgentRef) {
  if (!refItem) return
  if (refItem.kind === 'post' && refItem.postId) emit('open-post', refItem.postId)
  else if (refItem.to) void router.push(refItem.to)
}

async function copyText() {
  if (!current.value?.text) return
  try {
    await navigator.clipboard.writeText(current.value.text)
    copied.value = true
    toast('已复制研判初稿', 'ok')
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    toast('复制失败，请使用导出文本', 'warn')
  }
}

function exportDraft() {
  if (!current.value?.text) return
  const mLabel = OPINION_AGENT_MODES.find(m => m.key === current.value!.mode)?.label || '舆情研判'
  downloadText(`涉纪舆情智能研判_${mLabel}_${today()}.txt`, current.value.text)
  system.log('opinion', '导出', `舆情智能体 · ${mLabel}`, '导出智能研判初稿文本')
}

function syncToReport() {
  if (!current.value?.text) return
  const kind = current.value.mode === 'clarify' ? 'clarify' : current.value.mode === 'verify' ? 'campaign' : 'weekly'
  const target = store.presetReports.find(r => r.kind === kind) || store.presetReports[0]!
  store.saveReportLlmDraft(target.id, current.value.text)
  system.log('opinion', '修改', target.title, '将舆情智能体研判初稿写入专报润色稿')
  toast(`已写入《${target.title}》润色初稿`, 'ok', { label: '前往专报中心', to: `/opinion/reports?kind=${kind}` })
}

watch(() => props.autoRunKey, v => {
  if (!v) return
  if (props.initialMode) mode.value = props.initialMode
  if (props.initialTopicId) selectedTopicId.value = props.initialTopicId
  void runAnalysis(props.initialMode || mode.value, props.initialTopicId)
}, { immediate: true })

onBeforeUnmount(() => { stopped = true; ctrl?.abort() })
</script>

<template>
  <UiCard flush class="op-agent-card" :aria-busy="busy || undefined">
    <template #title>
      <span class="oa-title">
        <Sparkles :size="16" class="oa-ic" />
        <span>舆情研判智能体</span>
        <UiTag tone="ai" size="sm">{{ assistant.engine === 'deepseek' && assistant.configured && assistant.status !== 'offline' ? '纪检大模型' : '本地研判引擎' }}</UiTag>
      </span>
    </template>
    <template #extra>
      <div class="oa-head-acts">
        <UiButton v-if="focusSubject && mode !== 'briefing'" size="sm" variant="ghost" :icon="Workflow" @click="requestDossier(focusSubject)">
          对「{{ focusSubject }}」全景研判
        </UiButton>
        <button v-if="closable" type="button" class="oa-close" aria-label="收起智能体" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>
    </template>

    <!-- 顶部模式与追问区（去卡套卡，采用统一底色分隔） -->
    <div class="oa-controls">
      <div class="oa-modes" role="tablist" aria-label="研判视角">
        <button
          v-for="m in OPINION_AGENT_MODES"
          :key="m.key"
          type="button"
          class="oa-mode"
          :class="{ on: mode === m.key }"
          :disabled="busy"
          @click="mode = m.key"
        >
          <strong>{{ m.label }}</strong>
          <small>{{ m.desc }}</small>
        </button>
      </div>

      <div class="oa-query-row">
        <div v-if="mode !== 'briefing'" class="oa-topic-pick">
          <UiSelect v-model="selectedTopicId" :options="topicOptions" size="sm" label="聚焦话题" />
        </div>
        <input
          v-model="customQuestion"
          class="input oa-input"
          placeholder="可选：补充追问重点（如：汇总删帖时间差与三资疑点，写一段呈报领导的 300 字摘要）"
          :disabled="busy"
          @keydown.enter.prevent="runAnalysis(mode)"
        />
        <button v-if="busy" type="button" class="oa-stop" @click="stopRun">
          <Square :size="11" fill="currentColor" class="stop-pulse" />停止生成
        </button>
        <UiButton v-else variant="primary" size="sm" :icon="Sparkles" @click="runAnalysis(mode)">
          {{ current ? '重新研判' : '开始智能研判' }}
        </UiButton>
      </div>
    </div>

    <!-- 主体双栏：左侧粘性步骤与可点击引用轨 + 右侧阅读纸面 -->
    <div v-if="current" class="oa-body">
      <aside class="oa-rail scroll-thin">
        <div class="oar-sec">
          <h4>研判步骤</h4>
          <ol class="oa-steps">
            <li v-for="s in current.steps" :key="s.id" :class="s.status">
              <i class="st-dot" />
              <div>
                <strong>{{ s.label }}</strong>
                <small>{{ s.detail }}</small>
              </div>
            </li>
          </ol>
        </div>

        <div v-if="current.refs.length" class="oar-sec">
          <h4>可追溯证据引用（<span class="num">{{ current.refs.length }}</span>）</h4>
          <ul class="oa-refs">
            <li v-for="r in current.refs" :key="r.n">
              <button type="button" class="ref-btn" @click="onClickRef(r)">
                <span class="ref-n num">[{{ r.n }}]</span>
                <component :is="r.kind === 'post' ? FileSearch2 : Link2" :size="13" class="ref-ic" />
                <div>
                  <strong>{{ r.title }}</strong>
                  <small>{{ r.meta }}</small>
                </div>
              </button>
            </li>
          </ul>
        </div>
      </aside>

      <div class="oa-paper" aria-live="polite">
        <div class="oap-meta">
          <UiTag tone="green" size="sm">{{ current.engine === 'llm' ? '纪检大模型流式生成' : '本地确定性引擎起草' }}</UiTag>
          <span v-if="current.phase === 'done'" class="num">耗时 {{ (current.elapsed / 1000).toFixed(1) }} 秒{{ current.aborted ? ' · 已人工中止' : '' }}</span>
          <span v-else class="oap-live">正在整理证据并逐段起草…</span>
        </div>

        <p v-if="current.reasoning && !current.text" class="oa-think">{{ current.reasoning.slice(-180) }}</p>

        <div v-if="sections.length" class="oa-sections">
          <section v-for="(sec, i) in sections" :key="i" class="oa-sec">
            <h5>{{ sec.title.replace(/\s*\[\d+\]/, '') }}</h5>
            <p>
              <template v-for="(part, j) in splitCites(sec.body)" :key="j">
                <button
                  v-if="'cite' in part"
                  type="button"
                  class="cite-tag num"
                  :title="refsByN[part.cite]?.title || `查看证据 [${part.cite}]`"
                  @click="onClickRef(refsByN[part.cite])"
                >[{{ part.cite }}]</button>
                <template v-else>{{ part.text }}</template>
              </template>
            </p>
          </section>
        </div>
        <p v-else-if="current.text" class="oa-stream">{{ current.text }}</p>

        <div v-if="current.phase === 'done' && current.text" class="oap-actions">
          <UiButton size="sm" variant="soft" :icon="FileCheck2" @click="syncToReport">写入专报润色稿</UiButton>
          <UiButton size="sm" variant="secondary" :icon="copied ? Check : Clipboard" @click="copyText">{{ copied ? '已复制' : '复制初稿' }}</UiButton>
          <UiButton size="sm" variant="secondary" :icon="Download" @click="exportDraft">导出文本</UiButton>
          <UiButton size="sm" variant="ghost" :icon="RotateCcw" @click="runAnalysis(mode)">重新生成</UiButton>
        </div>

        <AiNotice text="智能研判仅基于合法公开信息与平台已有记录起草初稿，点击 [n] 可直查原帖保全快照或跨库印证；定性与处置由纪检干部核定。" />
      </div>
    </div>
  </UiCard>
</template>

<style scoped>
.op-agent-card{border-left:3px solid var(--ai)}
.oa-title{display:inline-flex;align-items:center;gap:8px}
.oa-ic{color:var(--ai)}
.oa-head-acts{display:flex;align-items:center;gap:6px}
.oa-close{width:28px;height:28px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;color:var(--text-3)}
.oa-close:hover{background:var(--surface-3);color:var(--text)}

.oa-controls{padding:14px 18px;background:var(--surface-2);border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:10px}
.oa-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.oa-mode{text-align:left;padding:10px 12px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface);display:flex;flex-direction:column;gap:3px;transition:border-color var(--dur),background var(--dur)}
.oa-mode:hover:not(:disabled){border-color:var(--ai-line)}
.oa-mode.on{border-color:var(--ai);background:var(--ai-bg);box-shadow:inset 3px 0 0 var(--ai)}
.oa-mode strong{font-size:13.5px;color:var(--text)}
.oa-mode.on strong{color:var(--ai)}
.oa-mode small{font-size:12px;color:var(--text-3);line-height:1.45}

.oa-query-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.oa-topic-pick{width:260px;flex:none}
.oa-input{flex:1 1 280px;height:32px;font-size:13px;padding:0 11px;background:var(--surface)}
.oa-stop{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:var(--r-sm);background:var(--stop-bg);color:var(--on-brand);font-size:13px;font-weight:500}
.stop-pulse{animation:oa-blink 1.2s ease-in-out infinite}
@keyframes oa-blink{0%,100%{opacity:1}50%{opacity:.45}}

.oa-body{display:grid;grid-template-columns:288px minmax(0,1fr);align-items:start}
.oa-rail{padding:14px 16px;background:var(--surface-2);border-right:1px solid var(--line);display:flex;flex-direction:column;gap:14px;position:sticky;top:12px;max-height:560px;overflow-y:auto}
.oar-sec h4{font-size:12px;font-weight:600;color:var(--text-3);margin-bottom:8px}
.oa-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.oa-steps li{display:flex;align-items:flex-start;gap:8px;font-size:12.5px}
.st-dot{width:8px;height:8px;border-radius:50%;background:var(--line-2);margin-top:5px;flex:none}
.oa-steps li.run .st-dot{background:var(--ai);box-shadow:0 0 0 3px var(--ai-bg)}
.oa-steps li.done .st-dot{background:var(--ok)}
.oa-steps strong{display:block;color:var(--text);font-weight:600;line-height:1.35}
.oa-steps small{display:block;font-size:12px;color:var(--text-3);line-height:1.45;margin-top:2px}

.oa-refs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.ref-btn{width:100%;display:flex;align-items:flex-start;gap:6px;padding:7px 8px;border-radius:7px;background:var(--surface);border:1px solid var(--line);text-align:left;transition:border-color var(--dur),background var(--dur)}
.ref-btn:hover{border-color:var(--red-line);background:var(--red-25)}
.ref-n{font-size:12px;font-weight:700;color:var(--red);flex:none}
.ref-ic{color:var(--text-3);margin-top:2px;flex:none}
.ref-btn>div{flex:1;min-width:0}
.ref-btn strong{display:block;font-size:12.5px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ref-btn small{display:block;font-size:12px;color:var(--text-3)}

.oa-paper{padding:16px 20px;background:var(--surface);display:flex;flex-direction:column;gap:12px;min-width:0}
.oap-meta{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--text-3)}
.oap-live{color:var(--ai);font-weight:500}
.oa-think{font-size:12.5px;color:var(--text-3);padding:8px 12px;border-radius:8px;background:var(--surface-2);border-left:2px solid var(--ai)}
.oa-sections{display:flex;flex-direction:column;gap:12px}
.oa-sec h5{font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;padding-left:8px;border-left:3px solid var(--red)}
.oa-sec p,.oa-stream{font-size:14px;line-height:1.85;color:var(--text-2);white-space:pre-line}
.cite-tag{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:18px;padding:0 4px;margin:0 2px;border-radius:4px;background:var(--red-50);color:var(--red);font-size:12px;font-weight:700;vertical-align:baseline}
.cite-tag:hover{background:var(--red);color:var(--on-brand)}
.oap-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding-top:10px;border-top:1px solid var(--line)}

@media(max-width:980px){
  .oa-modes{grid-template-columns:1fr}
  .oa-body{grid-template-columns:1fr}
  .oa-rail{position:static;border-right:none;border-bottom:1px solid var(--line);max-height:none}
  .oa-topic-pick{width:100%}
}
</style>
