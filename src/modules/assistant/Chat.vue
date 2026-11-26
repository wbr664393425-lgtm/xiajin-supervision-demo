<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ArrowUp, BookOpen, Check, ChevronDown, Clipboard, FilePenLine, FileText, GitCompare, History, ListChecks, MessageSquareText, MessagesSquare, PanelRightClose, PanelRightOpen, PencilLine, Plus, Quote, RotateCcw, ShieldCheck, Sparkles, Square, AudioLines, Cpu, Brain, RefreshCw } from 'lucide-vue-next'
import { UiButton, UiTag } from '@/design/ui'
import { useAssistantStore, type AiResult } from '@/stores/assistant'
import { useSystemStore } from '@/stores/system'
import { useAgentRun } from '@/app/useAgentRun'
import { sceneMeta, refineLabels, detectRefineMode, splitCites, splitSections, changedSections, type Scene, type RefineMode } from '@/engines/assistant'
import { addDays } from '@/engines/deadline'
import { today } from '@/stores/persist'
import { toast } from '@/app/toast'

const store = useAssistantStore(), system = useSystemStore()
const { run, execute, stop } = useAgentRun()
const scenes: { id: Scene; icon: any }[] = [{ id: 'qa', icon: MessagesSquare }, { id: 'law', icon: BookOpen }, { id: 'polish', icon: FilePenLine }, { id: 'summary', icon: FileText }, { id: 'transcribe', icon: AudioLines }, { id: 'minutes', icon: MessageSquareText }]
const quick: RefineMode[] = ['concise', 'checklist', 'formal']
const scene = ref<Scene>('qa')
const versionsOf = (s: Scene) => store.results.filter(r => r.scene === s && !r.panel)
const versions = computed(() => versionsOf(scene.value))
const activeId = ref(versions.value.at(-1)?.id || '')
const active = computed(() => versions.value.find(v => v.id === activeId.value) || versions.value.at(-1))
const revision = computed(() => active.value ? versions.value.indexOf(active.value) + 1 : 0)
const material = ref(active.value?.input || sceneMeta.qa.example)
const editing = ref(!active.value), followUp = ref(''), evidenceOpen = ref(false), flash = ref(false), compare = ref(false), stepsOpen = ref(false), copied = ref(false)
const busy = computed(() => Boolean(run.value))
const parent = computed(() => active.value && (versions.value.find(v => v.id === active.value!.parentId) || versions.value[versions.value.indexOf(active.value) - 1]))
const changed = computed(() => compare.value && active.value ? changedSections(active.value.output, parent.value?.output) : new Set<string>())
const sections = computed(() => splitSections(run.value?.phase === 'stream' ? run.value.text : active.value?.output || ''))
const task = computed(() => active.value && system.taskFor(active.value.id))
const dirty = computed(() => Boolean(active.value && material.value !== active.value.input))
const reasoningOpen = ref(false)
onMounted(() => { if (store.configured && store.status === 'unknown') void store.check() })
async function recheck() { const ok = await store.check(); toast(ok ? '纪检大模型已连接' : '大模型暂不可用，将由离线引擎处理', ok ? 'ok' : 'warn') }
const statusText = computed(() => ({ unknown: '待检测', checking: '检测中…', online: '在线', offline: '离线 · 由离线引擎处理' })[store.status])
const label = (r: AiResult, i: number) => `v${i + 1} · ${r.refine ? refineLabels[r.refine as RefineMode] : '初稿'}`

function choose(s: Scene) { if (busy.value) return; scene.value = s; const last = versionsOf(s).at(-1); activeId.value = last?.id || ''; material.value = last?.input || sceneMeta[s].example; editing.value = !last; compare.value = false }
function pick(id: string) { if (busy.value) return; activeId.value = id; material.value = active.value?.input || material.value; compare.value = false }
async function go(mode?: RefineMode, note = '') {
  if (mode && !active.value) return
  editing.value = false; compare.value = false; stepsOpen.value = true
  const r = await execute({ scene: scene.value, input: mode ? active.value!.input : material.value, base: mode ? active.value : undefined, mode, note, revision: revision.value })
  if (r) { activeId.value = r.id; stepsOpen.value = false }
}
async function send() { const t = followUp.value.trim(); if (!t || busy.value || !active.value) return; followUp.value = ''; await go(detectRefineMode(t), t) }
function key(e: KeyboardEvent) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); active.value && !dirty.value ? void send() : void go() } }
async function edit() { editing.value = true; await nextTick(); document.getElementById('ai-material')?.focus() }
function openCite() { evidenceOpen.value = true; flash.value = true; setTimeout(() => { flash.value = false }, 1600) }
async function copy() { if (!active.value) return; await navigator.clipboard.writeText(`【智能初稿，人工审核】\n\n${active.value.output}`); copied.value = true; setTimeout(() => { copied.value = false }, 2000) }
function review() { if (!active.value || active.value.reviewed) return; active.value.reviewed = true; system.log('assistant', '确认', active.value.id, `${sceneMeta[active.value.scene].title} v${revision.value} 已人工逐项核对`) }
function addTask() { if (!active.value || task.value) return; const t = system.createTask({ title: `人工复核：${sceneMeta[active.value.scene].title} 智能初稿`, module: 'assistant', feature: 'chat', sourceId: active.value.id, sourceLabel: '智能助手初稿', level: 'low', assignee: system.user, deadline: addDays(today(), 3) }); toast(`已加入复核任务 ${t.id}`) }
</script>

<template>
  <div class="ai-layout" :class="{ ev: evidenceOpen }">
    <aside class="rail">
      <div class="rh">工作场景</div>
      <button v-for="s in scenes" :key="s.id" class="scene" :class="{ on: scene === s.id }" :disabled="busy && scene !== s.id" @click="choose(s.id)">
        <span class="si"><component :is="s.icon" :size="17" /></span><span class="sc"><strong>{{ sceneMeta[s.id].title }}</strong><small>{{ sceneMeta[s.id].subtitle }}</small></span><span v-if="versionsOf(s.id).length" class="cnt num">{{ versionsOf(s.id).length }}</span>
      </button>
      <div class="rh vh"><History :size="14" />本场景版本</div>
      <p v-if="!versions.length" class="empty">每次生成或调整都会留下一个版本，可随时切换回看。</p>
      <ol v-else class="vers"><li v-for="(v, i) in versions" :key="v.id"><button :class="{ on: active?.id === v.id }" :disabled="busy" @click="pick(v.id)"><i :class="{ ok: v.reviewed, ab: v.aborted }" /><span><strong>{{ label(v, i) }}</strong><small>{{ v.createdAt.slice(11) }}{{ v.aborted ? ' · 已中止' : v.reviewed ? ' · 已审阅' : '' }}</small></span></button></li></ol>
    </aside>

    <main class="center">
      <div class="engine-bar">
        <span class="eb-ic"><Cpu :size="16" /></span>
        <div class="eb-seg" role="tablist" aria-label="生成引擎"><button :class="{ on: store.engine === 'deepseek' }" :disabled="!store.configured || busy" @click="store.engine = 'deepseek'">纪检大模型</button><button :class="{ on: store.engine === 'local' }" :disabled="busy" @click="store.engine = 'local'">离线引擎</button></div>
        <template v-if="store.engine === 'deepseek'">
          <span class="eb-status" :class="store.status"><i />{{ statusText }}</span>
          <button class="eb-btn" :disabled="store.status === 'checking'" title="重新检测连接" @click="recheck"><RefreshCw :size="14" /></button>
          <label class="eb-think" :class="{ on: store.thinking }"><input v-model="store.thinking" type="checkbox" :disabled="busy" /><Brain :size="14" />深度思考</label>
        </template>
        <span v-else-if="!store.configured" class="eb-status offline"><i />内置规则与知识库 · 断网可用</span>
        <span v-else class="eb-status"><i />内置规则与知识库 · 断网可用</span>
      </div>
      <section class="mat">
        <header><span class="mi"><component :is="scenes.find(s => s.id === scene)!.icon" :size="19" /></span><div><h2>{{ sceneMeta[scene].title }}</h2><p>{{ sceneMeta[scene].subtitle }}</p></div><UiButton v-if="!editing" size="sm" variant="ghost" :icon="PencilLine" :disabled="busy || scene === 'transcribe'" @click="edit">编辑</UiButton><span v-else class="muted num cnt2">{{ material.length }} 字</span></header>
        <textarea v-if="editing" id="ai-material" v-model="material" class="textarea" rows="5" :disabled="busy" :readonly="scene === 'transcribe'" aria-label="问题或材料" @keydown="key" />
        <button v-else class="preview" :disabled="busy" @click="edit"><span>{{ material }}</span></button>
        <footer v-if="!busy && (editing || dirty || !active)"><span><ShieldCheck :size="14" />请勿输入涉密资料</span><UiButton variant="primary" :icon="Sparkles" :disabled="!material.trim()" @click="go()">{{ active ? '按新内容重新生成' : '交给助手处理' }}</UiButton></footer>
      </section>

      <section v-if="!run && !active" class="flow-empty">
        <ol><li><span><FileText :size="18" /></span><strong>提出问题或材料</strong><p>确认或修改上方样例</p></li><li><span class="agent"><Sparkles :size="18" /></span><strong>助手逐步处理</strong><p>步骤可见，结果逐段写出</p></li><li><span class="human"><ShieldCheck :size="18" /></span><strong>人工审核</strong><p>核对依据，再决定是否使用</p></li></ol>
      </section>

      <section v-else class="agent-card">
        <header class="ah">
          <span class="av" :class="{ thinking: busy }"><Sparkles :size="17" /></span>
          <div class="at"><strong>{{ run ? run.title : `${sceneMeta[active!.scene].title} · ${label(active!, revision - 1)}` }}</strong><small v-if="run">{{ run.phase === 'steps' ? '正在逐步处理…' : '正在写出结果…' }}</small><small v-else>{{ active!.createdAt }} · 用时 {{ (active!.elapsedMs / 1000).toFixed(1) }} 秒</small></div>
          <UiTag v-if="run ? run.engine === 'deepseek' : active?.engine === 'deepseek'" tone="red" size="sm">大模型</UiTag><UiTag v-else size="sm" tone="gray">离线引擎</UiTag><UiTag v-if="run" tone="ai">{{ run.phase === 'stream' && run.engine === 'deepseek' ? '实时生成中' : '处理中' }}</UiTag><UiTag v-else-if="active!.reviewed" tone="green" :icon="Check">人工已审阅</UiTag><UiTag v-else-if="active!.aborted" tone="orange">已中止 · 内容不完整</UiTag><UiTag v-else tone="ai">智能初稿 · 待人工审核</UiTag>
          <UiButton v-if="!run" size="sm" variant="ghost" :icon="evidenceOpen ? PanelRightClose : PanelRightOpen" @click="evidenceOpen = !evidenceOpen">依据 {{ active!.sources.length }}</UiButton>
        </header>
        <div v-if="run || active?.steps.length" class="steps">
          <button v-if="!run" class="st-toggle" @click="stepsOpen = !stepsOpen"><Check :size="14" />已完成 {{ active!.steps.length }} 个步骤<ChevronDown :size="15" :class="{ rot: stepsOpen }" /></button>
          <ol v-if="run || stepsOpen"><li v-for="s in (run ? run.steps : active!.steps.map(x => ({ ...x, status: 'done' })))" :key="s.id" :class="`is-${s.status}`"><span class="mk"><Check v-if="s.status === 'done'" :size="11" :stroke-width="3" /></span><div><strong>{{ s.label }}</strong><p v-if="s.status !== 'wait'">{{ s.detail }}</p></div></li></ol>
        </div>
        <div v-if="run?.reasoning || active?.reasoning" class="reason" :class="{ open: reasoningOpen || (run && !run.text) }">
          <button @click="reasoningOpen = !reasoningOpen"><Brain :size="14" />{{ run && !run.text ? '深度思考中…' : '思考过程' }}<ChevronDown :size="14" :class="{ rot: reasoningOpen }" /></button>
          <p v-if="reasoningOpen || (run && !run.text)">{{ run ? run.reasoning : active?.reasoning }}</p>
        </div>
        <div v-if="run && run.engine === 'deepseek' && !run.text && !run.reasoning && run.phase === 'stream'" class="waiting"><i /><i /><i />纪检大模型正在思考…</div>
        <div v-if="sections.length" class="body" :class="{ streaming: run?.phase === 'stream' }">
          <article v-for="(sec, i) in sections" :key="sec.title + i" :class="{ changed: changed.has(sec.title) }">
            <h3><span class="no num">{{ String(i + 1).padStart(2, '0') }}</span><template v-for="(p, j) in splitCites(sec.title)" :key="j"><button v-if="'cite' in p" class="cite" @click="openCite">{{ p.cite }}</button><template v-else>{{ p.text }}</template></template><span v-if="changed.has(sec.title)" class="chg">本版调整</span></h3>
            <p><template v-for="(p, j) in splitCites(sec.body)" :key="j"><button v-if="'cite' in p" class="cite" @click="openCite">{{ p.cite }}</button><template v-else>{{ p.text }}</template></template></p>
          </article>
        </div>
        <footer v-if="!run && active" class="acts">
          <div class="row"><UiButton :variant="active.reviewed ? 'soft' : 'primary'" :icon="Check" :disabled="active.reviewed" @click="review">{{ active.reviewed ? '已标记人工审阅' : '我已逐项核对' }}</UiButton><UiButton :icon="task ? Check : Plus" :disabled="!!task" @click="addTask">{{ task ? `已加入 ${task.id}` : '加入复核任务' }}</UiButton></div>
          <div class="row"><UiButton v-if="parent" size="sm" :variant="compare ? 'soft' : 'ghost'" :icon="GitCompare" @click="compare = !compare">对比上一版</UiButton><UiButton size="sm" variant="ghost" :icon="copied ? Check : Clipboard" @click="copy">{{ copied ? '已复制' : '复制' }}</UiButton><UiButton size="sm" variant="ghost" :icon="RotateCcw" @click="go()">重新生成</UiButton></div>
        </footer>
      </section>

      <section v-if="active || run" class="composer">
        <div v-if="active && !run" class="chips"><button v-for="m in quick" :key="m" @click="go(m)"><ListChecks v-if="m === 'checklist'" :size="13" /><PencilLine v-else-if="m === 'formal'" :size="13" /><Sparkles v-else :size="13" />{{ refineLabels[m] }}</button></div>
        <div class="box"><textarea v-model="followUp" rows="1" :disabled="busy || !active" placeholder="继续提要求，如“再简洁一些”“列出待核对项”… ⌘ 或控制键加回车发送" aria-label="继续追问" @keydown="key" /><button v-if="run" class="send stop" aria-label="停止生成" @click="stop"><Square :size="12" fill="currentColor" /></button><button v-else class="send" aria-label="发送" :disabled="!followUp.trim() || dirty" @click="send"><ArrowUp :size="17" /></button></div>
        <p class="note"><Sparkles :size="12" />智能初稿，人工审核；不构成事实认定、定性或处置意见</p>
      </section>
    </main>

    <aside v-if="evidenceOpen && active" class="evidence">
      <header><h3><Quote :size="16" />所依据的资料</h3><button aria-label="收起" @click="evidenceOpen = false"><PanelRightClose :size="16" /></button></header>
      <div v-for="s in active.sources" :key="s.n" class="src" :class="{ flash }"><span class="cite static">{{ s.n }}</span><div><h4>{{ s.title }}</h4><blockquote>{{ s.excerpt }}</blockquote></div></div>
      <div class="check"><h4><ListChecks :size="15" />使用前请再确认</h4><ol><li>金额、日期与原始材料一致</li><li>事实表述未超出已有依据</li><li>条规依据已人工核验</li><li>初稿已经责任人员审核</li></ol></div>
    </aside>
  </div>
</template>

<style scoped>
.ai-layout{display:grid;grid-template-columns:232px minmax(0,1fr);gap:22px;align-items:start}
.ai-layout.ev{grid-template-columns:232px minmax(0,1fr) 300px}
.rail{position:sticky;top:76px}
.rh{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-3);letter-spacing:.06em;margin:0 8px 8px}
.vh{margin-top:20px}
.scene{width:100%;display:flex;align-items:center;gap:10px;padding:9px;border-radius:10px;border:1px solid transparent;text-align:left;margin-bottom:2px;transition:all var(--dur)}
.scene:hover:not(:disabled){background:var(--surface)}
.scene.on{background:var(--surface);border-color:var(--line);box-shadow:var(--shadow-1)}
.si{width:32px;height:32px;border-radius:9px;background:var(--surface-3);color:var(--text-3);display:flex;align-items:center;justify-content:center;flex:none}
.scene.on .si{background:var(--red);color:#fff;box-shadow:var(--shadow-red)}
.sc{flex:1;min-width:0}
.sc strong{display:block;font-size:14px}
.sc small{font-size:12px;color:var(--text-3)}
.cnt{font-size:11px;min-width:20px;height:18px;border-radius:9px;background:var(--surface-3);display:flex;align-items:center;justify-content:center}
.scene.on .cnt{background:var(--red-50);color:var(--red)}
.empty{font-size:12px;color:var(--text-3);margin:0 8px;line-height:1.7}
.vers{position:relative;padding-left:12px}
.vers::before{content:"";position:absolute;left:16px;top:12px;bottom:12px;width:1px;background:var(--line-2)}
.vers button{width:100%;display:flex;gap:10px;padding:6px 6px 6px 0;text-align:left}
.vers i{position:relative;z-index:1;width:9px;height:9px;margin-top:6px;border-radius:50%;background:var(--bg);box-shadow:inset 0 0 0 1.5px var(--ai);flex:none}
.vers i.ok{background:var(--ok);box-shadow:none}.vers i.ab{box-shadow:inset 0 0 0 1.5px var(--risk-mid)}
.vers button.on i{box-shadow:inset 0 0 0 1.5px var(--red),0 0 0 4px var(--red-50)}
.vers strong{display:block;font-size:13px;font-weight:500}
.vers button.on strong{color:var(--red);font-weight:600}
.vers small{font-size:12px;color:var(--text-3)}
.center{min-width:0;display:flex;flex-direction:column;gap:14px}
.engine-bar{display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:8px 10px 8px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-1)}
.eb-ic{width:28px;height:28px;border-radius:8px;background:var(--red-50);color:var(--red);display:flex;align-items:center;justify-content:center}
.eb-seg{display:flex;gap:2px;padding:3px;background:var(--surface-3);border-radius:9px}
.eb-seg button{height:28px;padding:0 12px;border-radius:7px;font-size:13px;color:var(--text-2)}
.eb-seg button.on{background:var(--red);color:#fff;font-weight:600;box-shadow:var(--shadow-red)}
.eb-seg button:disabled:not(.on){opacity:.45}
.eb-status{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text-2)}
.eb-status i{width:8px;height:8px;border-radius:50%;background:var(--text-4)}
.eb-status.online i{background:#2C9A62;box-shadow:0 0 0 3px rgba(44,154,98,.18)}
.eb-status.checking i{background:var(--gold);animation:blink 1s infinite}
.eb-status.offline{color:var(--risk-mid)}.eb-status.offline i{background:var(--risk-mid)}
.eb-btn{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-3)}
.eb-btn:hover{background:var(--surface-3);color:var(--text)}
.eb-think{margin-left:auto;display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:14px;border:1px solid var(--line-2);font-size:13px;color:var(--text-2);cursor:pointer}
.eb-think input{display:none}
.eb-think.on{background:var(--ai-bg);color:var(--ai);border-color:var(--ai-line)}
.reason{margin:10px 18px 0;border-radius:10px;background:var(--ai-bg);border:1px solid var(--ai-line)}
.reason button{display:flex;align-items:center;gap:6px;width:100%;padding:8px 12px;font-size:13px;color:var(--ai)}
.reason button svg:last-child{margin-left:auto;transition:transform var(--dur)}
.reason .rot{transform:rotate(180deg)}
.reason p{padding:0 12px 10px;font-size:13px;line-height:1.8;color:var(--text-2);white-space:pre-wrap;max-height:220px;overflow:auto}
.waiting{display:flex;align-items:center;gap:5px;padding:16px 20px;font-size:13px;color:var(--text-3)}
.waiting i{width:6px;height:6px;border-radius:50%;background:var(--red);animation:blink 1s infinite}
.waiting i:nth-child(2){animation-delay:.15s}.waiting i:nth-child(3){animation-delay:.3s}
@keyframes blink{50%{opacity:.2}}
.mat{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow-1);padding:16px 18px}
.mat header{display:flex;align-items:center;gap:12px}
.mat header>div{flex:1;min-width:0}
.mat h2{font-size:17px}
.mat header p{font-size:13px;color:var(--text-3)}
.mi{width:38px;height:38px;border-radius:10px;background:var(--red-50);color:var(--red);display:flex;align-items:center;justify-content:center;flex:none}
.cnt2{font-size:12px}
.mat .textarea{margin-top:12px;min-height:110px}
.preview{display:block;width:100%;margin-top:12px;padding:10px 12px;border-left:2px solid var(--gold-line);background:var(--surface-2);text-align:left;font-size:14px;line-height:1.8;color:var(--text-2);cursor:text}
.preview span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line}
.mat footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
.mat footer>span{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-3)}
.flow-empty{padding:30px 20px;border:1.5px dashed var(--line-2);border-radius:var(--r-lg)}
.flow-empty ol{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;position:relative}
.flow-empty ol::before{content:"";position:absolute;top:21px;left:16%;right:16%;height:1px;background:repeating-linear-gradient(90deg,var(--gold-line) 0 6px,transparent 6px 11px)}
.flow-empty li{text-align:center;position:relative}
.flow-empty li>span{width:42px;height:42px;margin:0 auto 10px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line-2);color:var(--text-2)}
.flow-empty .agent{background:var(--red);color:#fff;box-shadow:var(--shadow-red)}
.flow-empty .human{background:var(--ok-bg);color:var(--ok)}
.flow-empty strong{font-size:14px}
.flow-empty p{font-size:12px;color:var(--text-3)}
.agent-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow-1);overflow:hidden;animation:rise var(--dur) var(--ease)}
.ah{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line)}
.av{position:relative;width:34px;height:34px;border-radius:10px;background:linear-gradient(140deg,var(--red),var(--red-700));color:#FFE6B8;display:flex;align-items:center;justify-content:center;flex:none}
.av.thinking::after{content:"";position:absolute;inset:-4px;border-radius:13px;border:1.5px solid var(--gold);animation:pulse 1.4s var(--ease) infinite}
@keyframes pulse{0%{opacity:.8;transform:scale(.92)}100%{opacity:0;transform:scale(1.14)}}
.at{flex:1;min-width:0}
.at strong{display:block;font-size:15px}
.at small{font-size:12px;color:var(--text-3)}
.steps{padding:2px 18px;background:var(--surface-2);border-bottom:1px solid var(--line)}
.st-toggle{display:flex;align-items:center;gap:6px;width:100%;padding:9px 0;font-size:13px;color:var(--text-3)}
.st-toggle>svg:first-child{color:var(--ok)}
.st-toggle .rot{transform:rotate(180deg)}
.st-toggle>svg:last-child{margin-left:auto;transition:transform var(--dur)}
.steps ol{padding:6px 0 12px}
.steps li{display:flex;gap:10px;padding:6px 0;position:relative;animation:rise var(--dur) var(--ease) both}
.steps li:not(:last-child)::before{content:"";position:absolute;left:8px;top:24px;bottom:-6px;width:1px;background:var(--line-2)}
.mk{width:17px;height:17px;margin-top:3px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--line-2);color:#fff;flex:none}
.is-run .mk{box-shadow:inset 0 0 0 2px var(--red),0 0 0 4px var(--red-50)}
.is-done .mk{background:var(--ok);box-shadow:none}
.steps strong{display:block;font-size:13px}
.is-wait strong{color:var(--text-4);font-weight:500}
.steps p{font-size:12px;color:var(--text-3)}
.body{padding:18px 20px 6px}
.body article{padding-bottom:16px}
.body article.changed{margin:0 -10px 8px;padding:10px 10px 12px;border-radius:8px;background:var(--cream)}
.body h3{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:15px;font-weight:600;margin-bottom:4px}
.no{font-size:12px;color:var(--red);font-weight:700;letter-spacing:.05em}
.chg{font-size:11px;color:#8A6418;border:1px solid var(--gold-line);border-radius:4px;padding:0 5px}
.body p{white-space:pre-line;font-size:14px;line-height:1.95;color:var(--text-2);padding-left:26px}
.streaming article:last-child p::after{content:"";display:inline-block;width:2px;height:1em;margin-left:2px;vertical-align:-2px;background:var(--red);animation:caret 1s steps(1) infinite}
@keyframes caret{50%{opacity:0}}
.cite{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:17px;padding:0 4px;margin:0 2px;border-radius:4px;background:var(--red-50);color:var(--red);font-size:11px;font-weight:700;vertical-align:2px}
.cite:hover{background:var(--red);color:#fff}
.cite.static{margin:2px 0 0;flex:none}
.acts{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:12px 18px;border-top:1px solid var(--line);background:var(--surface-2)}
.composer{position:sticky;bottom:0;z-index:5;background:linear-gradient(180deg,transparent,var(--bg) 20px);padding:18px 0 10px;margin-top:-6px}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.chips button{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 12px;border-radius:15px;border:1px solid var(--line-2);background:var(--surface);font-size:13px}
.chips button:hover{border-color:var(--red);color:var(--red);background:var(--red-25)}
.box{display:flex;align-items:flex-end;gap:8px;padding:7px 7px 7px 14px;background:var(--surface);border:1px solid var(--line-2);border-radius:14px;box-shadow:var(--shadow-2)}
.box:focus-within{border-color:var(--red)}
.box textarea{flex:1;border:0;outline:0;resize:none;min-height:36px;max-height:120px;padding:7px 0;font-size:14px;background:none}
.send{width:36px;height:36px;border-radius:10px;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;flex:none}
.send:disabled{background:var(--surface-3);color:var(--text-4)}
.send.stop{background:#3A2A27}
.note{display:flex;align-items:center;justify-content:center;gap:5px;font-size:12px;color:var(--text-3);margin-top:6px;text-align:center}
.evidence{position:sticky;top:76px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow-1);padding:16px;animation:slide-l var(--dur) var(--ease)}
.evidence header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.evidence h3{display:flex;align-items:center;gap:6px;font-size:15px}
.evidence h3 svg{color:var(--red)}
.src{display:flex;gap:8px;padding:8px;margin:0 -8px 6px;border-radius:8px;transition:background var(--dur)}
.src.flash{background:var(--red-25)}
.src h4{font-size:13px;line-height:1.6}
blockquote{margin:6px 0 0;padding:8px 10px;border-left:2px solid var(--gold);background:var(--surface-2);font-family:var(--font-serif);font-size:13px;line-height:1.8;color:var(--text-2)}
.check{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
.check h4{display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:6px}
.check ol{list-style:decimal;padding-left:18px;font-size:13px;color:var(--text-2);line-height:2}
@media(max-width:1280px){.ai-layout,.ai-layout.ev{grid-template-columns:200px minmax(0,1fr)}.evidence{grid-column:2;position:static}}
</style>
