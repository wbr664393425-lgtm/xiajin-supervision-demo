<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import { ArrowUp, BookOpen, Check, ChevronDown, Clipboard, FilePenLine, FileText, GitCompare, History, ListChecks, MessageSquareText, PanelRightClose, PanelRightOpen, PencilLine, Plus, Quote, RotateCcw, ShieldCheck, Sparkles, Square } from 'lucide-vue-next'
import { usePlatformStore } from '../stores/platform'
import { buildAssistantOutput, refineAssistantOutput, refineLabels, type RefineMode } from '../services/professional'
import { changedSections, detectRefineMode, planSteps, splitCites, splitSections, type AgentStep } from '../services/assistant-agent'
import type { AssistantResult } from '../types'

const store = usePlatformStore()
const presets = [
  { id: 'summary', title: '信访摘要', subtitle: '提取事实与待核要点', icon: FileText, label: '将原始诉求整理为清晰的核查提纲', example: '【虚构演示材料】群众反映青禾镇和盛村集体场地租赁收款情况。合同 SZ-HT-2026-018 约定年度租金 36,000 元，应于 2026 年 6 月 30 日前支付。公开台账仅见 12,000 元到账，余款 24,000 元是否到账不清楚。希望核对原始收款凭证、补充协议及完整银行回单。请生成客观摘要与待核事项，不作事实认定。', source: '信访线索 XF-2026-0108 · 演示材料', excerpt: '合同约定年度租金 36,000 元，现有公开记录已关联到账 12,000 元，待核对差额 24,000 元。' },
  { id: 'knowledge', title: '法规检索', subtitle: '查看可溯源的审查要点', icon: BookOpen, label: '检索内置演示条目，保留来源与适用提醒', example: '集体资产租赁收款资料不完整时，核查人员应当关注哪些材料要素？请从系统内置演示资料中整理检查清单，并说明适用边界。', source: '内置演示条目 · 集体资产租赁材料核对要点', excerpt: '对照合同主体、租赁期间、付款约定与收款凭证；存在差额时，结合完整台账核实是否漏录或未关联。' },
  { id: 'polish', title: '材料润色', subtitle: '规范表达，保留原意', icon: FilePenLine, label: '让业务表述更准确、审慎且便于流转', example: '请规范以下表述，不新增事实、不作违纪认定：\n“这份合同写的三万六，但目前只找到一万二的到账记录，还有两万四没对上。我们想把银行回单、补充协议都找齐，再看看是不是少录了收款。”', source: '用户提供文字 · 当前输入', excerpt: '润色仅调整表达方式，不改变事实、金额和核查边界；修改后的表述须由使用人员审核。' },
  { id: 'meeting', title: '会议纪要', subtitle: '从记录整理议定事项', icon: MessageSquareText, label: '整理会议要点，区分议定事项与待确认内容', example: '【虚构演示会议记录】\n2026年11月2日，第一监督检查组召开材料核对专题会。参会人员：演示专员甲、演示专员乙。\n讨论：和盛村场地租赁应收 36,000 元，现有已关联收款 12,000 元，差额 24,000 元需核对。\n议定：由演示专员甲在11月9日前补齐合同、收款回单及补充协议；演示专员乙复核台账关联情况。对差额暂不作结论，核对完成后再行报告。', source: '用户提供记录 · 虚构专题会议', excerpt: '待确认：参会名单、会议日期和完成期限；会议纪要须经参会人员核对后流转。' },
]
const quickRefines: { mode: RefineMode; icon: typeof Sparkles }[] = [
  { mode: 'concise', icon: Sparkles }, { mode: 'checklist', icon: ListChecks }, { mode: 'formal', icon: PencilLine },
]

const selectedId = ref('summary')
const selected = computed(() => presets.find(p => p.id === selectedId.value)!)
const versionsOf = (type: string) => store.assistantResults.filter(r => r.type === type)
const versions = computed(() => versionsOf(selectedId.value))
const activeId = ref(versions.value.at(-1)?.id || '')
const active = computed(() => versions.value.find(v => v.id === activeId.value) || versions.value.at(-1))
const activeRevision = computed(() => active.value ? versions.value.indexOf(active.value) + 1 : 0)
const material = ref(active.value?.input || selected.value.example)
const editingMaterial = ref(!active.value)
const followUp = ref('')
const evidenceOpen = ref(false)
const activeCite = ref(false)
const compare = ref(false)
const stepsOpen = ref(false)
const copied = ref(false)

/* 运行中的智能体状态（不持久化；完成后写入 store） */
type RunStep = AgentStep & { status: 'wait' | 'run' | 'done' }
const run = ref<null | { title: string; steps: RunStep[]; phase: 'steps' | 'stream'; text: string; started: number }>(null)
let stopRequested = false
let frame = 0
const busy = computed(() => Boolean(run.value))

const parent = computed(() => {
  if (!active.value) return undefined
  return versions.value.find(v => v.id === active.value!.parentId) || versions.value[versions.value.indexOf(active.value) - 1]
})
const changed = computed(() => compare.value && active.value ? changedSections(active.value.output, parent.value?.output) : new Set<string>())
const sections = computed(() => splitSections(run.value?.phase === 'stream' ? run.value.text : active.value?.output || ''))
const addedTask = computed(() => active.value && store.tasks.find(t => t.sourceId === active.value!.id))
const usedScenes = computed(() => new Set(store.assistantResults.filter(r => presets.some(p => p.id === r.type)).map(r => r.type)).size)
const referenceInput = computed(() => active.value?.input || material.value)
const referenceTitle = computed(() => selectedId.value === 'knowledge' || referenceInput.value === selected.value.example ? selected.value.source : '用户提供材料 · 本地工作区')
const referenceExcerpt = computed(() => referenceInput.value === selected.value.example || selectedId.value === 'knowledge' ? selected.value.excerpt : referenceInput.value.replace(/【[^】]*】/g, '').slice(0, 150))
const materialDirty = computed(() => Boolean(active.value && material.value !== active.value.input))

function reduced() { return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches }
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, reduced() ? 0 : ms))
function versionLabel(result: AssistantResult, index: number) {
  return `v${index + 1} · ${result.refine ? refineLabels[result.refine as RefineMode] || '调整' : '初稿'}`
}
function shortTime(value: string) { return value.split(' ')[1]?.slice(0, 5) || value }

function choose(id: string) {
  if (busy.value) return
  selectedId.value = id
  const latest = versionsOf(id).at(-1)
  activeId.value = latest?.id || ''
  material.value = latest?.input || presets.find(p => p.id === id)!.example
  editingMaterial.value = !latest
  compare.value = false; copied.value = false; activeCite.value = false
}
function pickVersion(id: string) {
  if (busy.value) return
  activeId.value = id
  material.value = active.value?.input || material.value
  compare.value = false; copied.value = false
}

async function stream(full: string) {
  if (reduced()) { run.value!.text = full; return }
  await new Promise<void>(resolve => {
    const tick = () => {
      if (!run.value || stopRequested) return resolve()
      const next = Math.min(full.length, run.value.text.length + 6)
      run.value.text = full.slice(0, next)
      if (next >= full.length) return resolve()
      frame = window.setTimeout(tick, 18)
    }
    frame = window.setTimeout(tick, 18)
  })
}

async function execute(mode?: RefineMode, note = '') {
  if (busy.value) return
  const base = mode ? active.value : undefined
  if (mode && !base) return
  const input = base ? base.input : material.value
  if (!input.trim()) return
  const type = selectedId.value, scene = selected.value
  stopRequested = false
  run.value = reactive({
    title: mode ? `按要求调整：${refineLabels[mode]}` : `${scene.title} · 生成初稿`,
    steps: planSteps(type, input, mode, activeRevision.value).map(step => ({ ...step, status: 'wait' as const })),
    phase: 'steps' as const, text: '', started: Date.now(),
  })
  editingMaterial.value = false; compare.value = false; copied.value = false; stepsOpen.value = true
  for (const step of run.value.steps) {
    step.status = 'run'
    await wait(260 + Math.min(step.detail.length * 6, 220))
    if (stopRequested) { run.value = null; return }
    step.status = 'done'
  }
  const full = base ? refineAssistantOutput(base.output, input, mode!, note) : buildAssistantOutput(input, type)
  run.value.phase = 'stream'
  await stream(full)
  if (!run.value) return
  const aborted = stopRequested && run.value.text.length < full.length
  const result: AssistantResult = {
    id: `AI-${Date.now()}`, type, task: scene.title, input, output: aborted ? run.value.text.trimEnd() : full,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    parentId: base?.id, refine: mode, refineNote: mode === 'custom' ? note : undefined,
    steps: run.value.steps.map(({ id, label, detail }) => ({ id, label, detail })), elapsedMs: Date.now() - run.value.started, aborted,
  }
  store.assistantResults.push(result)
  store.addEvent('AI 助手本地模拟处理', `${scene.title}：${mode ? `按“${refineLabels[mode]}”调整为新版本` : '生成结构化辅助初稿'}${aborted ? '（已中止，保留部分内容）' : ''}`)
  activeId.value = result.id
  run.value = null
  stepsOpen.value = false
}
function stop() { stopRequested = true }
async function sendFollowUp() {
  const text = followUp.value.trim()
  if (!text || busy.value || !active.value) return
  followUp.value = ''
  await execute(detectRefineMode(text), text)
}
function onComposerKey(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); active.value && !materialDirty.value ? void sendFollowUp() : void execute() }
}
async function editMaterial() {
  editingMaterial.value = true
  await nextTick()
  document.getElementById('assistant-material')?.focus()
}
function openCite() {
  evidenceOpen.value = true; activeCite.value = true
  setTimeout(() => { activeCite.value = false }, 1800)
}
async function copy() {
  if (!active.value) return
  await navigator.clipboard.writeText(`【演示数据 · AI 辅助初稿，需人工审核】\n\n${active.value.output}`)
  copied.value = true
  setTimeout(() => copied.value = false, 2200)
}
function markReviewed() {
  if (!active.value || active.value.reviewed) return
  active.value.reviewed = true
  store.addEvent('人工审阅 AI 辅助初稿', `${active.value.task} v${activeRevision.value}：已由工作人员逐项核对，仍不构成事实认定`)
}
function addTask() {
  if (!active.value || addedTask.value) return
  store.addTask({ source: 'AI助手', sourceId: active.value.id, title: `人工复核：${selected.value.title}辅助初稿`, area: '县级工作组（演示）', priority: '一般关注', assignee: '演示专员', deadline: '2026-11-09' })
}
onBeforeUnmount(() => { stopRequested = true; clearTimeout(frame) })
</script>

<template>
  <div class="assistant-page">
    <div class="page-heading">
      <div><div class="eyebrow">材料整理与辅助起草</div><h1>纪检 AI 助手</h1><p>交给助手整理材料，过程可见、依据可溯，结论始终由人工把关。</p></div>
      <span class="engine-tag"><span></span>本地模拟引擎 · 不联网</span>
    </div>

    <div class="assistant-layout" :class="{ 'with-evidence': evidenceOpen }">
      <!-- 左：场景与版本 -->
      <aside class="assistant-rail" aria-label="工作场景与版本">
        <div class="rail-heading">工作场景</div>
        <button v-for="preset in presets" :key="preset.id" type="button" class="scene" :class="{ active: selectedId === preset.id }" :disabled="busy && selectedId !== preset.id" :aria-pressed="selectedId === preset.id" @click="choose(preset.id)">
          <span class="scene-icon"><component :is="preset.icon" :size="18" /></span>
          <span class="scene-copy"><strong>{{ preset.title }}</strong><span>{{ preset.subtitle }}</span></span>
          <span v-if="versionsOf(preset.id).length" class="scene-count">{{ versionsOf(preset.id).length }}</span>
        </button>
        <div class="rail-heading rail-versions-head"><History :size="15" />本场景版本</div>
        <p v-if="!versions.length" class="rail-empty">处理后，每次生成或调整都会留下一个版本，可随时切换回看。</p>
        <ol v-else class="version-list">
          <li v-for="(version, index) in versions" :key="version.id">
            <button type="button" :class="{ active: active?.id === version.id }" :disabled="busy" @click="pickVersion(version.id)">
              <span class="version-dot" :class="{ reviewed: version.reviewed, aborted: version.aborted }"></span>
              <span class="version-copy"><strong>{{ versionLabel(version, index) }}</strong><span>{{ shortTime(version.createdAt) }}<template v-if="version.aborted"> · 已中止</template><template v-else-if="version.reviewed"> · 人工已审阅</template></span></span>
            </button>
          </li>
        </ol>
        <div class="rail-progress"><span>本次演示已体验 {{ usedScenes }} / 4 个场景</span><div class="progress-track"><i :style="{ width: `${usedScenes * 25}%` }"></i></div></div>
      </aside>

      <!-- 中：材料 → 智能体运行 → 结果 → 追问 -->
      <main class="assistant-main">
        <section class="material-card">
          <header class="material-head">
            <span class="material-icon"><component :is="selected.icon" :size="20" /></span>
            <div><h2>{{ selected.title }}</h2><p>{{ selected.label }}</p></div>
            <button v-if="!editingMaterial" type="button" class="btn btn-quiet btn-sm" :disabled="busy" @click="editMaterial"><PencilLine :size="15" />编辑材料</button>
            <span v-else class="material-count">{{ material.length }} 字</span>
          </header>
          <textarea v-if="editingMaterial" id="assistant-material" v-model="material" :disabled="busy" aria-label="输入材料与处理要求" placeholder="粘贴虚构材料，或输入需要处理的工作内容…" spellcheck="false" @keydown="onComposerKey"></textarea>
          <button v-else type="button" class="material-preview" :disabled="busy" @click="editMaterial"><span>{{ material }}</span></button>
          <footer v-if="!busy && (editingMaterial || materialDirty || !active)" class="material-foot">
            <span><ShieldCheck :size="14" />请勿输入真实敏感或涉密资料</span>
            <button type="button" class="btn btn-primary" :disabled="busy || !material.trim()" @click="execute()"><Sparkles :size="16" />{{ active ? '按新材料重新生成' : '交给助手处理' }}</button>
          </footer>
        </section>

        <!-- 空状态：说明工作方式 -->
        <section v-if="!run && !active" class="agent-empty">
          <ol class="flow">
            <li><span class="flow-mark"><FileText :size="18" /></span><strong>材料进入</strong><p>确认或修改上方样例</p></li>
            <li><span class="flow-mark is-agent"><Sparkles :size="18" /></span><strong>助手逐步整理</strong><p>每一步可见，结果逐段写出</p></li>
            <li><span class="flow-mark is-human"><ShieldCheck :size="18" /></span><strong>人工审阅</strong><p>核对依据，再决定是否流转</p></li>
          </ol>
        </section>

        <!-- 智能体运行与结果 -->
        <section v-else class="agent-card" :aria-busy="busy">
          <header class="agent-head">
            <span class="agent-avatar" :class="{ thinking: busy }"><Sparkles :size="17" /></span>
            <div class="agent-title">
              <strong>{{ run ? run.title : `${active!.task} · ${versionLabel(active!, activeRevision - 1)}` }}</strong>
              <span v-if="run">{{ run.phase === 'steps' ? '正在逐步处理…' : '正在写出结果…' }}</span>
              <span v-else>{{ active!.createdAt }}<template v-if="active!.elapsedMs"> · 用时 {{ (active!.elapsedMs / 1000).toFixed(1) }} 秒</template></span>
            </div>
            <span v-if="run" class="state state-ai">处理中</span>
            <span v-else-if="active!.reviewed" class="state state-confirmed">人工已审阅</span>
            <span v-else-if="active!.aborted" class="state state-pending">已中止 · 内容不完整</span>
            <span v-else class="state state-ai">AI 初稿 · 待人工审核</span>
            <button v-if="!run" type="button" class="btn btn-quiet btn-sm evidence-toggle" :aria-expanded="evidenceOpen" @click="evidenceOpen = !evidenceOpen"><component :is="evidenceOpen ? PanelRightClose : PanelRightOpen" :size="16" />依据 1</button>
          </header>

          <!-- 步骤轨迹 -->
          <div v-if="run || active?.steps?.length" class="steps" :class="{ open: run || stepsOpen }">
            <button v-if="!run" type="button" class="steps-toggle" :aria-expanded="stepsOpen" @click="stepsOpen = !stepsOpen"><Check :size="14" />已完成 {{ active!.steps!.length }} 个步骤<ChevronDown :size="15" class="chev" /></button>
            <ol v-if="run || stepsOpen" class="step-list">
              <li v-for="step in (run ? run.steps : active!.steps!.map(s => ({ ...s, status: 'done' })))" :key="step.id" :class="`is-${step.status}`">
                <span class="step-mark"><Check v-if="step.status === 'done'" :size="12" :stroke-width="3" /></span>
                <div><strong>{{ step.label }}</strong><p v-if="step.status !== 'wait'">{{ step.detail }}</p></div>
              </li>
            </ol>
          </div>

          <!-- 结果正文 -->
          <div v-if="sections.length" class="result-body" :class="{ streaming: run?.phase === 'stream' }">
            <article v-for="(section, index) in sections" :key="section.title + index" :class="{ changed: changed.has(section.title) }">
              <h3><span class="section-no">{{ String(index + 1).padStart(2, '0') }}</span><template v-for="(part, i) in splitCites(section.title)" :key="i"><button v-if="'cite' in part" type="button" class="cite" :class="{ active: activeCite }" :aria-label="`查看依据 ${part.cite}`" @click="openCite">{{ part.cite }}</button><template v-else>{{ part.text }}</template></template><span v-if="changed.has(section.title)" class="changed-tag">本版调整</span></h3>
              <p><template v-for="(part, i) in splitCites(section.body)" :key="i"><button v-if="'cite' in part" type="button" class="cite" :aria-label="`查看依据 ${part.cite}`" @click="openCite">{{ part.cite }}</button><template v-else>{{ part.text }}</template></template></p>
            </article>
          </div>

          <!-- 结果操作 -->
          <footer v-if="!run && active" class="result-actions">
            <div class="result-primary">
              <button type="button" class="btn" :class="active.reviewed ? 'is-done' : 'btn-primary'" :disabled="active.reviewed" @click="markReviewed"><Check :size="15" />{{ active.reviewed ? '已标记人工审阅' : '我已逐项核对' }}</button>
              <button type="button" class="btn" :class="{ 'is-done': addedTask }" :disabled="!!addedTask" @click="addTask"><Check v-if="addedTask" :size="15" /><Plus v-else :size="15" />{{ addedTask ? `已加入待办 ${addedTask.id}` : '加入人工复核任务' }}</button>
            </div>
            <div class="result-tools">
              <button v-if="parent" type="button" class="btn btn-quiet btn-sm" :class="{ on: compare }" :aria-pressed="compare" @click="compare = !compare"><GitCompare :size="15" />对比上一版</button>
              <button type="button" class="btn btn-quiet btn-sm" @click="copy"><Check v-if="copied" :size="15" /><Clipboard v-else :size="15" />{{ copied ? '已复制' : '复制' }}</button>
              <button type="button" class="btn btn-quiet btn-sm" @click="execute()"><RotateCcw :size="15" />重新生成</button>
            </div>
          </footer>
        </section>

        <!-- 追问区 -->
        <section v-if="active || run" class="composer" :class="{ disabled: !active && !run }">
          <div v-if="active && !run" class="refine-chips" aria-label="快捷调整">
            <button v-for="item in quickRefines" :key="item.mode" type="button" @click="execute(item.mode)"><component :is="item.icon" :size="14" />{{ refineLabels[item.mode] }}</button>
          </div>
          <div class="composer-box">
            <textarea v-model="followUp" rows="1" :disabled="busy || !active" aria-label="继续追问或提出修改要求" placeholder="继续提要求，例如“再简洁一些”或“列出待核对项”…  ⌘/Ctrl + Enter 发送" @keydown="onComposerKey"></textarea>
            <button v-if="run" type="button" class="composer-send stop" aria-label="停止生成" @click="stop"><Square :size="13" fill="currentColor" /></button>
            <button v-else type="button" class="composer-send" aria-label="发送追问" :disabled="!followUp.trim() || materialDirty" @click="sendFollowUp"><ArrowUp :size="17" /></button>
          </div>
          <p class="composer-note"><Sparkles :size="13" />本地规则模拟，未接入真实大模型；所有产出为辅助初稿，不构成事实认定、定性或处置意见。</p>
        </section>
      </main>

      <!-- 右：依据抽屉 -->
      <aside v-if="evidenceOpen" class="evidence" aria-label="所依据的资料">
        <header><h3><Quote :size="16" />所依据的资料</h3><button type="button" class="btn btn-quiet btn-sm" aria-label="收起依据" @click="evidenceOpen = false"><PanelRightClose :size="16" /></button></header>
        <div class="source" :class="{ flash: activeCite }">
          <span class="cite static">1</span>
          <div><h4>{{ referenceTitle }}</h4><span>{{ selectedId === 'knowledge' ? '内置演示知识' : '当前任务上下文' }} · 仅限虚构演示样本</span></div>
        </div>
        <blockquote :class="{ flash: activeCite }">{{ referenceExcerpt }}</blockquote>
        <p class="evidence-boundary"><ShieldCheck :size="14" />不检索互联网，不调用公网模型，不构成已验证的法规适用或案件结论。</p>
        <div class="checklist">
          <h4><ListChecks :size="15" />使用前，请再确认</h4>
          <ol><li>金额、日期与原始材料一致</li><li>事实表述未超出已有依据</li><li>法规依据已经人工核验</li><li>初稿已经责任人员审核</li></ol>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page-heading{margin-bottom:26px}
.engine-tag{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);white-space:nowrap;padding-bottom:6px}
.engine-tag>span{width:6px;height:6px;border-radius:50%;background:var(--annot)}

.assistant-layout{display:grid;grid-template-columns:224px minmax(0,1fr);gap:28px;align-items:start;transition:grid-template-columns var(--dur) var(--ease-out)}
.assistant-layout.with-evidence{grid-template-columns:224px minmax(0,1fr) 300px}

/* 左栏 */
.assistant-rail{position:sticky;top:96px}
.rail-heading{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--faint);letter-spacing:.06em;margin:0 10px 10px}
.scene{width:100%;display:flex;align-items:center;gap:11px;padding:11px 10px;margin-bottom:4px;border:1px solid transparent;border-radius:var(--r-md);background:transparent;text-align:left;position:relative;transition:background var(--dur-fast),border-color var(--dur-fast),box-shadow var(--dur-fast)}
.scene:hover:not(:disabled){background:var(--paper-2)}
.scene.active{background:var(--surface);border-color:var(--line);box-shadow:var(--shadow-1)}
.scene.active::before{content:"";position:absolute;left:-1px;top:12px;bottom:12px;width:2px;border-radius:2px;background:var(--annot)}
.scene-icon{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:var(--paper-2);color:var(--muted);flex:none;transition:background var(--dur-fast),color var(--dur-fast)}
.scene.active .scene-icon{background:var(--navy);color:var(--on-dark)}
.scene-copy{min-width:0}
.scene-copy strong{display:block;font-size:15px;font-weight:600;color:var(--ink);line-height:1.4}
.scene-copy span{display:block;font-size:13px;color:var(--muted);margin-top:2px;line-height:1.5}
.scene-count{margin-left:auto;font-size:12px;color:var(--muted);background:var(--paper-2);border-radius:999px;min-width:22px;height:20px;display:flex;align-items:center;justify-content:center;padding:0 6px}
.scene.active .scene-count{background:var(--annot-soft);color:var(--annot)}
.rail-versions-head{margin-top:26px}
.rail-empty{font-size:13px;color:var(--muted);line-height:1.75;margin:0 10px}
.version-list{list-style:none;margin:0;padding:0 0 0 14px;position:relative}
.version-list::before{content:"";position:absolute;left:18px;top:14px;bottom:14px;width:1px;background:var(--line-strong)}
.version-list button{width:100%;display:flex;align-items:flex-start;gap:11px;padding:8px 8px 8px 0;border:0;background:none;text-align:left;border-radius:var(--r-sm)}
.version-list button:hover:not(:disabled) strong{color:var(--ink)}
.version-dot{position:relative;z-index:1;width:9px;height:9px;margin-top:6px;border-radius:50%;background:var(--paper);box-shadow:inset 0 0 0 1.5px var(--state-ai);flex:none}
.version-dot.reviewed{background:var(--state-confirmed);box-shadow:none}
.version-dot.aborted{box-shadow:inset 0 0 0 1.5px var(--state-pending)}
.version-list button.active .version-dot{box-shadow:inset 0 0 0 1.5px var(--annot),0 0 0 4px var(--annot-soft)}
.version-copy strong{display:block;font-size:14px;font-weight:500;color:var(--ink-2);line-height:1.5}
.version-list button.active strong{color:var(--ink);font-weight:600}
.version-copy span{display:block;font-size:13px;color:var(--faint);line-height:1.5}
.rail-progress{margin:26px 10px 0;font-size:13px;color:var(--muted)}
.progress-track{height:3px;border-radius:3px;background:var(--paper-3);margin-top:10px;overflow:hidden}
.progress-track i{display:block;height:100%;background:var(--annot);transition:width var(--dur-slow) var(--ease-out)}

/* 材料卡 */
.assistant-main{min-width:0;display:flex;flex-direction:column;gap:18px}
.material-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow-1);padding:20px 22px}
.material-head{display:flex;align-items:center;gap:12px}
.material-head>div{min-width:0;flex:1}
.material-head h2{font-size:18px;line-height:1.4}
.material-head p{font-size:14px;color:var(--muted);line-height:1.6;margin-top:2px}
.material-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--paper-2);color:var(--ink-2);flex:none}
.material-count{font-size:13px;color:var(--faint)}
.material-card textarea{display:block;width:100%;margin-top:16px;min-height:150px;max-height:380px;resize:vertical;border:1px solid var(--line-strong);border-radius:var(--r-md);background:var(--surface-2);padding:14px 16px;font-size:15px;line-height:1.9;color:var(--ink-2);outline:none;transition:border-color var(--dur-fast),background var(--dur-fast)}
.material-card textarea:focus{border-color:var(--accent);background:var(--surface)}
.material-preview{display:block;width:100%;margin-top:14px;padding:12px 14px;border:0;border-left:2px solid var(--line-strong);border-radius:0;background:var(--surface-2);text-align:left;font-size:14px;line-height:1.85;color:var(--ink-2);cursor:text}
.material-preview span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line}
.material-preview:hover:not(:disabled){border-left-color:var(--annot)}
.material-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px}
.material-foot>span{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted)}

/* 空状态 */
.agent-empty{padding:34px 24px;border:1px dashed var(--line-strong);border-radius:var(--r-lg)}
.flow{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;position:relative}
.flow::before{content:"";position:absolute;top:21px;left:16.6%;right:16.6%;height:1px;background:repeating-linear-gradient(90deg,var(--annot-line) 0 6px,transparent 6px 11px)}
.flow li{text-align:center;position:relative}
.flow-mark{width:42px;height:42px;margin:0 auto 12px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--ink-2);box-shadow:inset 0 0 0 1px var(--line-strong)}
.flow-mark.is-agent{background:var(--navy);color:var(--on-dark);box-shadow:none}
.flow-mark.is-human{background:var(--state-confirmed-soft);color:var(--state-confirmed);box-shadow:inset 0 0 0 1px var(--state-confirmed-line)}
.flow strong{font-size:15px;color:var(--ink)}
.flow p{font-size:13px;color:var(--muted);margin-top:4px}

/* 智能体卡 */
.agent-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow-1);overflow:hidden;animation:rise-in var(--dur) var(--ease-out)}
.agent-head{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--line)}
.agent-avatar{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--navy);color:var(--on-dark);flex:none;position:relative}
.agent-avatar.thinking::after{content:"";position:absolute;inset:-4px;border-radius:13px;border:1.5px solid var(--annot);opacity:.0;animation:agent-pulse 1.4s var(--ease-out) infinite}
@keyframes agent-pulse{0%{opacity:.7;transform:scale(.92)}100%{opacity:0;transform:scale(1.12)}}
.agent-title{min-width:0;flex:1}
.agent-title strong{display:block;font-size:16px;font-weight:600;color:var(--ink);line-height:1.45}
.agent-title span{display:block;font-size:13px;color:var(--muted);margin-top:2px}
.evidence-toggle{margin-left:4px}

.steps{padding:4px 20px;border-bottom:1px solid var(--line);background:var(--surface-2)}
.steps-toggle{display:flex;align-items:center;gap:7px;width:100%;padding:10px 0;border:0;background:none;font-size:13px;color:var(--muted);text-align:left}
.steps-toggle>svg:first-child{color:var(--state-confirmed)}
.steps-toggle .chev{margin-left:auto;transition:transform var(--dur-fast)}
.steps.open .steps-toggle .chev{transform:rotate(180deg)}
.step-list{list-style:none;margin:0;padding:8px 0 14px;position:relative}
.step-list li{display:flex;gap:12px;padding:7px 0;position:relative;animation:rise-in var(--dur) var(--ease-out) both}
.step-list li:not(:last-child)::before{content:"";position:absolute;left:8px;top:25px;bottom:-7px;width:1px;background:var(--line-strong)}
.step-mark{width:17px;height:17px;margin-top:3px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--line-strong);color:#fff;transition:background var(--dur-fast),box-shadow var(--dur-fast)}
.step-list li.is-run .step-mark{box-shadow:inset 0 0 0 1.5px var(--annot),0 0 0 4px var(--annot-soft);animation:step-breathe 1.1s ease-in-out infinite}
.step-list li.is-done .step-mark{background:var(--state-confirmed);box-shadow:none}
@keyframes step-breathe{50%{box-shadow:inset 0 0 0 1.5px var(--annot),0 0 0 7px transparent}}
.step-list strong{display:block;font-size:14px;font-weight:600;color:var(--ink-2);line-height:1.6}
.step-list li.is-wait strong{color:var(--faint);font-weight:500}
.step-list p{font-size:13px;color:var(--muted);line-height:1.6;animation:fade-in var(--dur) var(--ease-out)}

.result-body{padding:22px 24px 8px}
.result-body article{padding:0 0 20px 0;position:relative;transition:background var(--dur)}
.result-body article.changed{margin:0 -12px 8px;padding:12px 12px 14px;border-radius:var(--r-sm);background:var(--annot-soft)}
.result-body h3{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:16px;font-weight:600;color:var(--ink);line-height:1.6;margin-bottom:6px}
.section-no{font-size:12px;font-weight:600;color:var(--annot);letter-spacing:.06em;margin-right:4px;font-variant-numeric:tabular-nums}
.changed-tag{font-size:12px;font-weight:500;color:var(--annot);border:1px solid var(--annot-line);border-radius:4px;padding:0 6px;line-height:1.6;margin-left:4px}
.result-body p{white-space:pre-line;font-size:15px;line-height:1.95;color:var(--ink-2);padding-left:30px}
.result-body.streaming article:last-child p::after{content:"";display:inline-block;width:2px;height:1.05em;margin-left:2px;vertical-align:-2px;background:var(--annot);animation:caret 1s steps(1) infinite}
@keyframes caret{50%{opacity:0}}

.result-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 20px;border-top:1px solid var(--line);background:var(--surface-2)}
.result-primary,.result-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.btn.is-done{color:var(--state-confirmed);border-color:var(--state-confirmed-line);background:var(--state-confirmed-soft);opacity:1}
.btn-quiet.on{color:var(--annot);background:var(--annot-soft)}

/* 追问区 */
.composer{position:sticky;bottom:0;z-index:5;background:linear-gradient(180deg,transparent,var(--paper) 22px);padding:20px 0 14px;margin-top:-6px}
.refine-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.refine-chips button{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1px solid var(--line-strong);border-radius:999px;background:var(--surface);font-size:13px;color:var(--ink-2);transition:border-color var(--dur-fast),color var(--dur-fast),background var(--dur-fast)}
.refine-chips button:hover{border-color:var(--annot-line);color:var(--annot);background:var(--annot-soft)}
.composer-box{display:flex;align-items:flex-end;gap:10px;padding:8px 8px 8px 16px;background:var(--surface);border:1px solid var(--line-strong);border-radius:16px;box-shadow:var(--shadow-2);transition:border-color var(--dur-fast)}
.composer-box:focus-within{border-color:var(--accent)}
.composer-box textarea{flex:1;border:0;outline:0;background:transparent;resize:none;min-height:40px;max-height:120px;padding:9px 0;font-size:15px;line-height:1.5;color:var(--ink)}
.composer-send{width:38px;height:38px;border-radius:12px;border:0;display:flex;align-items:center;justify-content:center;background:var(--accent);color:#fff;flex:none;transition:background var(--dur-fast)}
.composer-send:hover:not(:disabled){background:var(--accent-hover)}
.composer-send:disabled{background:var(--paper-3);color:var(--muted);opacity:1}
.composer-send.stop{background:var(--navy)}
.composer-note{display:flex;align-items:center;gap:6px;justify-content:center;font-size:13px;color:var(--faint);margin-top:8px;line-height:1.6;text-align:center}

/* 依据抽屉 */
.evidence{position:sticky;top:96px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow-1);padding:18px 18px 20px;animation:slide-in var(--dur) var(--ease-out)}
.evidence header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.evidence h3{display:flex;align-items:center;gap:8px;font-size:15px;color:var(--ink)}
.evidence h3 svg{color:var(--annot)}
.source{display:flex;gap:10px;align-items:flex-start;padding:10px;margin:0 -10px;border-radius:var(--r-sm);transition:background var(--dur)}
.cite.static{cursor:default;margin-top:3px}
.source h4{font-size:14px;font-weight:600;color:var(--ink);line-height:1.6;overflow-wrap:anywhere}
.source span:not(.cite){display:block;font-size:13px;color:var(--muted);margin-top:2px}
blockquote{margin:12px 0 0;padding:12px 14px;border-left:2px solid var(--annot);background:var(--surface-2);font-family:var(--font-serif);font-size:14px;line-height:1.9;color:var(--ink-2);transition:background var(--dur)}
.flash{background:var(--annot-soft)!important}
.evidence-boundary{display:flex;gap:7px;font-size:13px;color:var(--muted);line-height:1.7;margin-top:14px}
.evidence-boundary svg{flex:none;margin-top:4px}
.checklist{margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}
.checklist h4{display:flex;align-items:center;gap:7px;font-size:14px;color:var(--ink);margin:0 0 8px}
.checklist ol{margin:0;padding-left:20px;font-size:13px;color:var(--ink-2);line-height:2}

@media(min-width:1700px){
  .assistant-layout{grid-template-columns:248px minmax(0,1fr)}
  .assistant-layout.with-evidence{grid-template-columns:248px minmax(0,1fr) 340px}
  .result-body p{font-size:16px}
  .material-card textarea{font-size:16px}
}
@media(max-width:1280px){
  .assistant-layout,.assistant-layout.with-evidence{grid-template-columns:200px minmax(0,1fr)}
  .evidence{grid-column:2;position:static}
}
@media(max-width:900px){
  .assistant-layout,.assistant-layout.with-evidence{grid-template-columns:1fr}
  .assistant-rail{position:static}
  .evidence{grid-column:auto}
  .flow{grid-template-columns:1fr}
  .flow::before{display:none}
  .agent-head{flex-wrap:wrap}
}
</style>
