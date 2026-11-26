<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { X, ArrowUp, Square, Sparkles, Maximize2, Check, ScanLine } from 'lucide-vue-next'
import { useAgentRun } from './useAgentRun'
import DossierAgent from './DossierAgent.vue'
import { dossierRequest, useDossierAgent } from './useDossierAgent'
import { useAssistantStore } from '@/stores/assistant'
import { splitCites, splitSections, type Scene } from '@/engines/assistant'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const route = useRoute(), store = useAssistantStore()
const { run, execute, stop } = useAgentRun()
const q = ref(''), scene = ref<Scene>('qa'), list = ref<HTMLElement>(), mode = ref<'dossier' | 'chat'>('dossier')
const dossier = useDossierAgent()
// 其他页面发起的研判请求：切到全景研判并开始
watch(dossierRequest, async req => { if (!req) return; mode.value = 'dossier'; if (!dossier.busy()) { dossier.clear(); await dossier.start(req.name) } })
const history = computed(() => store.results.filter(r => r.panel).slice(-6))
const hints: Record<string, string[]> = {
  clues: ['初核阶段能不能作出违纪定性？', '补贴名单公示有什么要求？'],
  supervision: ['村集体资产出租需要走哪些程序？', '拆分发票报销餐费怎么认定？'],
  inspection: ['三重一大决策程序有什么要求？', '谈话笔录制作有哪些要求？'],
  bankflow: ['大额拆分与快进快出资金流如何核查取证？', '向银行协查调取流水需履行什么审批程序？'],
  cases: ['处分决定书制作要点有哪些？', '审理阶段证据审核看什么？'],
  archive: ['惠民资金优亲厚友怎么认定？'],
  opinion: ['如何把握网络舆情转问题线索的受理边界？', '对不实网传开展澄清正名需要履行哪些程序？'],
}
const suggestions = computed(() => hints[String(route.meta.module)] || ['对抗组织审查包括哪些行为？', '村干部吃拿卡要怎么认定？'])
async function ask(text = q.value) {
  const t = text.trim(); if (!t || run.value) return
  q.value = ''
  await nextTick(); list.value?.scrollTo({ top: list.value.scrollHeight })
  await execute({ scene: scene.value, input: t, panel: true })
  await nextTick(); list.value?.scrollTo({ top: list.value.scrollHeight, behavior: 'smooth' })
}
watch(() => props.open, async o => { if (o) { if (store.configured && store.status === 'unknown') void store.check(); await nextTick(); list.value?.scrollTo({ top: list.value.scrollHeight }) } })
</script>
<template>
  <Transition name="panel">
    <aside v-if="open" class="ai-panel" aria-label="智能助手">
      <header><span class="av"><Sparkles :size="16" /></span><div><strong>纪检智能助手</strong><small>{{ store.engine === 'deepseek' && store.status !== 'offline' ? '纪检大模型' : '离线引擎' }} · 智能初稿，人工审核</small></div><RouterLink to="/assistant/multimodal" class="ic" title="多模态识别（票据/合同/录音）" @click="emit('update:open', false)"><ScanLine :size="16" /></RouterLink><RouterLink to="/assistant/chat" class="ic" title="在完整页面打开" @click="emit('update:open', false)"><Maximize2 :size="16" /></RouterLink><button class="ic" aria-label="关闭" @click="emit('update:open', false)"><X :size="18" /></button></header>
      <div class="seg"><button :class="{ on: mode === 'dossier' }" @click="mode = 'dossier'">全景研判</button><button :class="{ on: mode === 'chat' && scene === 'qa' }" @click="mode = 'chat'; scene = 'qa'">日常问答</button><button :class="{ on: mode === 'chat' && scene === 'law' }" @click="mode = 'chat'; scene = 'law'">法规查询</button><button :class="{ on: mode === 'chat' && scene === 'summary' }" @click="mode = 'chat'; scene = 'summary'">摘要提炼</button></div>
      <DossierAgent v-if="mode === 'dossier'" @navigate="emit('update:open', false)" />
      <template v-else>
      <div ref="list" class="msgs scroll-thin">
        <div v-if="!history.length && !run" class="hello"><p>你好，我可以检索知识库、提炼材料、规范表述。试试：</p><button v-for="s in suggestions" :key="s" @click="ask(s)">{{ s }}</button></div>
        <template v-for="h in history" :key="h.id">
          <div class="me">{{ h.input }}</div>
          <div class="bot"><div class="done"><Check :size="12" />{{ h.engine === 'deepseek' ? '纪检大模型' : '离线引擎' }} · {{ (h.elapsedMs / 1000).toFixed(1) }} 秒</div><template v-for="(s, i) in splitSections(h.output)" :key="i"><h5>{{ s.title.replace(/\s*\[\d+\]/, '') }}</h5><p><template v-for="(p, j) in splitCites(s.body)" :key="j"><sup v-if="'cite' in p">[{{ p.cite }}]</sup><template v-else>{{ p.text }}</template></template></p></template><ol v-if="h.sources.length" class="srcs"><li v-for="s in h.sources" :key="s.n"><b>[{{ s.n }}]</b> {{ s.title }}</li></ol></div>
        </template>
        <div v-if="run" class="bot"><div v-for="s in run.steps" :key="s.id" class="step" :class="s.status"><i />{{ s.label }}</div><p v-if="run.reasoning && !run.text" class="think">{{ run.reasoning.slice(-160) }}</p><p v-if="run.text" class="stream">{{ run.text }}</p></div>
      </div>
      <div class="box"><textarea v-model="q" rows="1" placeholder="输入问题，回车发送" aria-label="向智能助手提问" :disabled="!!run" @keydown.enter.exact.prevent="ask()" /><button v-if="run" class="send stop" aria-label="停止" @click="stop"><Square :size="11" fill="currentColor" /></button><button v-else class="send" :disabled="!q.trim()" aria-label="发送" @click="ask()"><ArrowUp :size="16" /></button></div>
      </template>
    </aside>
  </Transition>
</template>
<style scoped>
.ai-panel{position:fixed;top:calc(var(--header-h) + 12px);right:12px;bottom:12px;width:420px;z-index:150;background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--shadow-2);border:1px solid var(--line);display:flex;flex-direction:column;overflow:hidden}
.panel-enter-active,.panel-leave-active{transition:transform 280ms var(--ease),opacity 280ms}
.panel-enter-from,.panel-leave-to{transform:translateX(24px);opacity:0}
header{display:flex;align-items:center;gap:10px;padding:14px 14px 12px;background:var(--panel-head);border-bottom:1px solid var(--line)}
.av{width:32px;height:32px;border-radius:10px;background:var(--brand-grad);color:var(--brand-accent-ink);display:flex;align-items:center;justify-content:center}
header div{flex:1}
header strong{display:block;font-size:15px}
header small{font-size:12px;color:var(--text-3)}
.ic{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-3)}
.ic:hover{background:rgba(255,255,255,.7);color:var(--text)}
.seg{display:flex;gap:4px;padding:10px 14px 0}
.seg button{flex:1;height:30px;border-radius:8px;font-size:13px;background:var(--surface-3);color:var(--text-2)}
.seg button.on{background:var(--red);color:var(--on-brand);font-weight:600}
.msgs{flex:1;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.hello p{font-size:13px;color:var(--text-2);margin-bottom:8px}
.hello button{display:block;width:100%;text-align:left;padding:8px 12px;margin-bottom:6px;border-radius:10px;border:1px solid var(--line);font-size:13px;background:var(--surface-2)}
.hello button:hover{border-color:var(--red);color:var(--red)}
.me{align-self:flex-end;max-width:85%;background:var(--red);color:var(--on-brand);padding:8px 12px;border-radius:12px 12px 4px 12px;font-size:13px;line-height:1.7;white-space:pre-line}
.bot{background:var(--surface-2);border:1px solid var(--line);border-radius:4px 12px 12px 12px;padding:10px 12px;font-size:13px;line-height:1.8;animation:rise var(--dur) var(--ease)}
.done{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--ok);margin-bottom:4px}
h5{font-size:13px;margin-top:6px}
.bot p{white-space:pre-line;color:var(--text-2)}
sup{color:var(--red);font-weight:700}
.srcs{margin-top:6px;padding-top:6px;border-top:1px dashed var(--line-2);font-size:12px;color:var(--text-3)}
.srcs b{color:var(--red)}
.step{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-4)}
.step i{width:8px;height:8px;border-radius:50%;box-shadow:inset 0 0 0 1.5px currentColor}
.step.run{color:var(--red)}.step.done{color:var(--ok)}.step.done i{background:var(--ok)}
.stream{margin-top:6px;white-space:pre-line}
.think{margin-top:6px;font-size:12px;color:var(--ai);background:var(--ai-bg);border-radius:6px;padding:6px 8px}
.box{display:flex;gap:6px;align-items:flex-end;margin:0 12px 12px;padding:6px 6px 6px 12px;border:1px solid var(--line-2);border-radius:12px}
.box:focus-within{border-color:var(--red)}
.box textarea{flex:1;border:0;outline:0;resize:none;font-size:13px;padding:6px 0;min-height:32px;max-height:100px;background:none}
.send{width:32px;height:32px;border-radius:9px;background:var(--red);color:var(--on-brand);display:flex;align-items:center;justify-content:center}
.send:disabled{background:var(--surface-3);color:var(--text-4)}
.send.stop{background:var(--stop-bg)}
</style>
