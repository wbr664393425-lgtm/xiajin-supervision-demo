<script setup lang="ts">
import OfficialDoc from '@/design/doc/OfficialDoc.vue'
import { computed, ref, watch } from 'vue'
import { FileAudio, FileText, ScanLine, MessagesSquare, Sparkles, Search, Check, CircleAlert } from 'lucide-vue-next'
import { UiCard, UiButton, UiTag, AiNotice, UiEmpty } from '@/design/ui'
import CasePicker from './parts/CasePicker.vue'
import { useCasesStore } from '@/stores/cases'
import { useSystemStore } from '@/stores/system'
import { extractElements, crossCheck } from '@/engines/cases'

const store = useCasesStore(), system = useSystemStore()
const matId = ref('M1'), running = ref(false), q = ref(''), activeLabel = ref('')
const icons: Record<string, any> = { 谈话笔录: MessagesSquare, 书证: FileText, 录音转写: FileAudio, 扫描件: ScanLine }
const labels = ['时间', '金额', '涉案人员', '关系', '事由', '地点']
const done = computed(() => store.extracted.includes(store.active.id))
const mat = computed(() => store.active.materials.find(m => m.id === matId.value) || store.active.materials[0]!)
const elements = computed(() => done.value ? extractElements(mat.value) : [])
const spans = computed(() => elements.value.filter(e => !activeLabel.value || e.label === activeLabel.value).map(e => ({ start: e.start, end: e.end, tag: e.label === '金额' || e.label === '关系' ? 'risk' : 'field', key: e.label })))
const table = computed(() => labels.map(l => ({ l, values: [...new Set(elements.value.filter(e => e.label === l).map(e => e.value))] })).filter(r => r.values.length))
const checks = computed(() => done.value ? crossCheck(store.active) : [])
const results = computed(() => { const k = q.value.trim(); if (!k) return []; return store.cases.flatMap(c => c.materials.filter(m => m.text.includes(k) || m.title.includes(k)).map(m => { const i = m.text.indexOf(k); return { c, m, snip: i >= 0 ? `…${m.text.slice(Math.max(0, i - 18), i + k.length + 24)}…` : m.title } })) })
watch(() => store.activeId, () => { matId.value = 'M1'; activeLabel.value = '' })
async function run() { running.value = true; store.extracted = store.extracted.filter(id => id !== store.active.id); await new Promise(r => setTimeout(r, 1100)); store.extracted.push(store.active.id); running.value = false; system.log('cases', '生成', store.active.id, `案卷 ${store.active.materials.length} 份材料要素抽取（含录音转写、扫描件）`) }
function searchLog() { if (q.value.trim()) system.log('cases', '查询', q.value.trim(), '历史案卷检索') }
</script>
<template>
  <div class="page">
    <CasePicker />
    <div class="ex-grid">
      <UiCard title="案卷材料" :subtitle="`${store.active.materials.length} 份 · 笔录、书证、录音转写、扫描件`" flush>
        <ul class="mats"><li v-for="m in store.active.materials" :key="m.id"><button :class="{ on: mat.id === m.id }" @click="matId = m.id"><span class="ic"><component :is="icons[m.type]" :size="16" /></span><div><strong>{{ m.title }}</strong><small>{{ m.type }}</small></div><UiTag v-if="done" size="sm" tone="ai">{{ extractElements(m).length }}</UiTag></button></li></ul>
        <template #footer><UiButton variant="primary" block :icon="Sparkles" :loading="running" @click="run">{{ done ? '重新抽取全部材料' : '一键抽取全部材料' }}</UiButton></template>
      </UiCard>
      <UiCard :title="mat.title" :subtitle="mat.type">
        <template #extra><div class="filters"><button v-for="l in labels" :key="l" :class="{ on: activeLabel === l }" :disabled="!done" @click="activeLabel = activeLabel === l ? '' : l">{{ l }}</button></div></template>
        <OfficialDoc class="doc" :text="mat.text" :title="mat.title" :meta="[['案件编号', store.active.id], ['材料类别', mat.type]]" :spans="spans" compact :org="mat.type === '谈话笔录' ? '被谈话人签字：（已核对）' : undefined" />
        <dl v-if="table.length" class="els"><div v-for="r in table" :key="r.l"><dt>{{ r.l }}</dt><dd><UiTag v-for="v in r.values" :key="v" size="sm" :tone="r.l === '金额' ? 'red' : r.l === '涉案人员' ? 'blue' : 'gold'">{{ v }}</UiTag></dd></div></dl>
        <UiEmpty v-else-if="!done" title="尚未抽取" text="点击左侧「一键抽取全部材料」" />
      </UiCard>
    </div>
    <div class="ex-grid2">
      <UiCard title="跨材料印证" subtitle="同一事实在多份材料中的相互印证情况">
        <UiEmpty v-if="!checks.length" title="抽取后显示" />
        <ul class="checks"><li v-for="c in checks" :key="c.fact" :class="{ ok: c.ok }"><component :is="c.ok ? Check : CircleAlert" :size="16" /><div><strong>{{ c.fact }}</strong><span>{{ c.note }} · {{ c.materials.join('、') }}</span></div></li></ul>
      </UiCard>
      <UiCard :icon="Search" title="历史案卷检索" subtitle="全文检索所有案卷材料">
        <input v-model="q" class="input" placeholder="输入人名、金额、事由，如：补助、12,000" aria-label="检索历史案卷" @change="searchLog" />
        <ul class="results"><li v-for="r in results" :key="r.c.id + r.m.id"><button @click="store.activeId = r.c.id; matId = r.m.id"><strong>{{ r.c.title }} · {{ r.m.title }}</strong><span>{{ r.snip }}</span></button></li></ul>
        <p v-if="q && !results.length" class="muted none">无匹配材料</p>
      </UiCard>
    </div>
    <AiNotice text="抽取要素须与原件核对，作为审查调查的辅助，不替代审查人员判断。" />
  </div>
</template>
<style scoped>
.ex-grid{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px;align-items:start}
.ex-grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
.mats button{width:100%;display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line);text-align:left}
.mats button.on{background:var(--red-25);box-shadow:inset 3px 0 0 var(--red)}
.ic{width:30px;height:30px;border-radius:8px;background:var(--cream);color:var(--gold);display:flex;align-items:center;justify-content:center;flex:none}
.mats div{flex:1;min-width:0}
.mats strong{display:block;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mats small{font-size:12px;color:var(--text-3)}
.filters{display:flex;gap:4px;flex-wrap:wrap}
.filters button{height:26px;padding:0 9px;border-radius:13px;border:1px solid var(--line);font-size:12px;background:var(--surface-2)}
.filters button.on{background:var(--red);color:#fff;border-color:var(--red)}
.filters button:disabled{opacity:.4}
.doc{margin-bottom:14px}
.els{margin:0;display:flex;flex-direction:column;gap:6px}
.els div{display:grid;grid-template-columns:80px 1fr;align-items:flex-start;gap:8px}
dt{font-size:13px;color:var(--text-3);padding-top:2px}
dd{margin:0;display:flex;flex-wrap:wrap;gap:4px}
.checks{display:flex;flex-direction:column;gap:6px}
.checks li{display:flex;gap:10px;padding:10px 12px;border-radius:8px;background:var(--risk-mid-bg);color:var(--risk-mid)}
.checks li.ok{background:var(--ok-bg);color:var(--ok)}
.checks strong{display:block;font-size:14px;color:var(--text)}
.checks span{font-size:12px;color:var(--text-2)}
.results{display:flex;flex-direction:column;gap:4px;margin-top:10px}
.results button{width:100%;text-align:left;padding:8px 10px;border-radius:8px}
.results button:hover{background:var(--red-25)}
.results strong{display:block;font-size:13px}
.results span{font-size:12px;color:var(--text-2)}
.none{font-size:13px;margin-top:8px}
@media(max-width:1200px){.ex-grid,.ex-grid2{grid-template-columns:1fr}}
</style>
