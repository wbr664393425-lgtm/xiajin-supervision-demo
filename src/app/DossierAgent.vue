<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUp, Square, Check, Workflow, ClipboardCheck, Clipboard, RotateCcw } from 'lucide-vue-next'
import { useDossierAgent } from './useDossierAgent'
import { useCluesStore } from '@/stores/clues'
import { useSystemStore } from '@/stores/system'
import { splitCites, splitSections } from '@/engines/assistant'
import { addDays } from '@/engines/deadline'
import { today } from '@/stores/persist'
import { toast } from './toast'

const emit = defineEmits<{ navigate: [] }>()
const { current, start, stop, clear, busy } = useDossierAgent()
const clues = useCluesStore(), system = useSystemStore(), router = useRouter()
const q = ref(''), list = ref<HTMLElement>(), copied = ref(false)
const picks = computed(() => clues.graph.repeated.filter(n => n.type === 'person' || n.type === 'company').slice(0, 4))
const uniq = (refs: { n: number; title: string; to?: string }[]) => refs.filter((r, i) => r.to && refs.findIndex(x => x.to === r.to) === i)
const sections = computed(() => splitSections(current.value?.text || ''))
const refsByN = computed(() => Object.fromEntries((current.value?.dossier?.refs || []).map(r => [r.n, r])))
const task = computed(() => current.value?.dossier && system.taskFor(`DS-${current.value.subject}`))
async function go(subject = q.value) { q.value = ''; await start(subject) }
function open(to?: string) { if (!to) return; router.push(to); emit('navigate') }
function cite(n: number) { open(refsByN.value[n]?.to) }
function addTask() {
  const r = current.value; if (!r?.dossier || task.value) return
  const t = system.createTask({ title: `初核：${r.subject}相关问题线索`, module: 'clues', feature: 'graph', sourceId: `DS-${r.subject}`, sourceLabel: '智能体全景研判', level: r.dossier.findings.some(f => f.level === 'high') ? 'high' : 'mid', assignee: '监督检查室', deadline: addDays(today(), 15) })
  toast(`已生成初核任务 ${t.id}，由人工确认后办理`)
}
async function copy() { if (!current.value) return; await navigator.clipboard.writeText(`【智能初稿，人工审核】${current.value.subject} 初核工作方案\n\n${current.value.text}`); copied.value = true; setTimeout(() => { copied.value = false }, 2000) }
watch(() => [current.value?.text.length, current.value?.steps.map(s => s.status).join()], async () => { await nextTick(); list.value?.scrollTo({ top: list.value.scrollHeight }) })
</script>

<template>
  <div ref="list" class="dz scroll-thin">
    <div v-if="!current" class="intro">
      <div class="lead"><span class="ic"><Workflow :size="18" /></span><div><strong>对象全景研判</strong><p>输入人员或企业，智能体自动检索线索库、监督疑点、巡察台账、关联图谱、案卷与知识库，汇总后起草初核工作方案。</p></div></div>
      <h6>多次被反映对象</h6>
      <button v-for="n in picks" :key="n.id" class="pick" @click="go(n.label)"><span>{{ n.label }}</span><small>{{ n.type === 'company' ? '企业' : '人员' }} · 关联 {{ n.weight }} 条线索</small></button>
    </div>
    <template v-else>
      <div class="me">对「{{ current.subject }}」开展全景研判，起草初核方案</div>
      <div class="run">
        <ol class="steps">
          <li v-for="s in current.steps" :key="s.id" :class="s.status">
            <span class="mk"><Check v-if="s.status === 'done'" :size="10" :stroke-width="3" /></span>
            <div><strong>{{ s.label }}</strong><p v-if="s.status !== 'wait'">{{ s.detail }}</p>
              <div v-if="s.status === 'done' && s.refs.some(r => r.to)" class="chips"><button v-for="r in uniq(s.refs).slice(0, 4)" :key="r.n" @click="open(r.to)">{{ r.title.replace(/^信访线索 /, '').replace(/^巡察台账 · /, '') }}</button></div>
            </div>
          </li>
        </ol>
        <div v-if="current.phase === 'write' && !current.text" class="waiting"><i /><i /><i />正在起草…</div>
        <div v-if="sections.length" class="doc">
          <h4>{{ current.subject }} · 初核工作方案（初稿）</h4>
          <article v-for="(sec, i) in sections" :key="i"><h5>{{ sec.title.replace(/\s*\[\d+\]/g, '') }}</h5><p><template v-for="(p, j) in splitCites(sec.body)" :key="j"><button v-if="'cite' in p" class="cite" :title="refsByN[p.cite]?.title" @click="cite(p.cite)">{{ p.cite }}</button><template v-else>{{ p.text }}</template></template></p></article>
        </div>
        <footer v-if="current.phase === 'done'" class="acts">
          <span class="meta"><Check :size="12" />{{ current.engine === 'llm' ? '纪检大模型' : '离线引擎' }} · {{ (current.elapsed / 1000).toFixed(1) }} 秒 · 引用 {{ current.dossier?.refs.length }} 份资料{{ current.aborted ? ' · 已中止' : '' }}</span>
          <div class="row">
            <button class="pri" :disabled="!!task || current.aborted" @click="addTask"><ClipboardCheck :size="14" />{{ task ? `已生成 ${task.id}` : '生成初核任务' }}</button>
            <button @click="copy"><Clipboard :size="14" />{{ copied ? '已复制' : '复制' }}</button>
            <button @click="clear"><RotateCcw :size="14" />换个对象</button>
          </div>
        </footer>
      </div>
    </template>
  </div>
  <div class="box"><textarea v-model="q" rows="1" placeholder="输入人员或企业名称，如：张某军" aria-label="研判对象" :disabled="busy()" @keydown.enter.exact.prevent="go()" /><button v-if="busy()" class="send stop" aria-label="停止" @click="stop"><Square :size="11" fill="currentColor" /></button><button v-else class="send" :disabled="!q.trim()" aria-label="开始研判" @click="go()"><ArrowUp :size="16" /></button></div>
</template>

<style scoped>
.dz{flex:1;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.lead{display:flex;gap:10px;padding:12px;border-radius:12px;background:linear-gradient(120deg,var(--cream),var(--red-25));border:1px solid var(--gold-line)}
.lead .ic{width:32px;height:32px;flex:none;border-radius:9px;background:var(--red);color:var(--brand-accent-ink);display:flex;align-items:center;justify-content:center}
.lead strong{font-size:14px}
.lead p{font-size:12px;color:var(--text-2);line-height:1.7;margin-top:2px}
h6{font-size:12px;font-weight:500;color:var(--text-3);margin:12px 0 6px}
.pick{display:flex;align-items:baseline;justify-content:space-between;width:100%;padding:9px 12px;margin-bottom:6px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);font-size:13px;text-align:left}
.pick small{font-size:12px;color:var(--text-3)}
.pick:hover{border-color:var(--red);color:var(--red)}
.me{align-self:flex-end;max-width:88%;background:var(--red);color:var(--on-brand);padding:8px 12px;border-radius:12px 12px 4px 12px;font-size:13px;line-height:1.7}
.run{background:var(--surface-2);border:1px solid var(--line);border-radius:4px 12px 12px 12px;padding:10px 12px;animation:rise var(--dur) var(--ease)}
.steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.steps li{display:flex;gap:8px;font-size:12px;color:var(--text-4)}
.steps .mk{width:14px;height:14px;flex:none;margin-top:2px;border-radius:50%;box-shadow:inset 0 0 0 1.5px currentColor;display:flex;align-items:center;justify-content:center}
.steps li.run{color:var(--red)}
.steps li.run .mk{animation:pulse 1s ease-in-out infinite}
.steps li.done{color:var(--text-2)}
.steps li.done .mk{background:var(--ok);color:#fff;box-shadow:none}
.steps strong{font-size:13px;font-weight:600}
.steps li.done strong{color:var(--text)}
.steps p{color:var(--text-3);margin-top:1px}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.chips button{font-size:11px;padding:1px 7px;border-radius:6px;background:var(--surface);border:1px solid var(--line-2);color:var(--text-2)}
.chips button:hover{border-color:var(--red);color:var(--red)}
.waiting{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--ai);margin-top:10px}
.waiting i{width:5px;height:5px;border-radius:50%;background:currentColor;animation:pulse 1s infinite}
.waiting i:nth-child(2){animation-delay:.15s}.waiting i:nth-child(3){animation-delay:.3s}
.doc{margin-top:12px;padding-top:10px;border-top:1px dashed var(--line-2)}
.doc h4{font-size:14px;color:var(--red-700);margin-bottom:4px}
.doc h5{font-size:13px;margin-top:8px}
.doc p{font-size:13px;line-height:1.8;color:var(--text-2);white-space:pre-line}
.cite{font-size:10px;line-height:1;padding:2px 4px;margin:0 1px;border-radius:4px;background:var(--red-50);color:var(--red);font-weight:700;vertical-align:super}
.acts{margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
.meta{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--ok)}
.row{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.row button{display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 10px;border-radius:8px;font-size:12px;border:1px solid var(--line-2);background:var(--surface)}
.row button:hover:not(:disabled){border-color:var(--red);color:var(--red)}
.row .pri{background:var(--red);border-color:var(--red);color:var(--on-brand)}
.row .pri:hover:not(:disabled){color:#fff;filter:brightness(1.06)}
.row button:disabled{opacity:.7;cursor:default}
.box{display:flex;gap:6px;align-items:flex-end;margin:0 12px 12px;padding:6px 6px 6px 12px;border:1px solid var(--line-2);border-radius:12px}
.box:focus-within{border-color:var(--red)}
.box textarea{flex:1;border:0;outline:0;resize:none;font-size:13px;padding:6px 0;min-height:32px;max-height:100px;background:none}
.send{width:32px;height:32px;border-radius:9px;background:var(--red);color:var(--on-brand);display:flex;align-items:center;justify-content:center}
.send:disabled{background:var(--surface-3);color:var(--text-4)}
.send.stop{background:var(--stop-bg)}
@keyframes pulse{50%{opacity:.35}}
</style>
