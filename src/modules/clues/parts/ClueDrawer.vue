<script setup lang="ts">
import OfficialDoc from '@/design/doc/OfficialDoc.vue'
import { computed, ref, watch } from 'vue'
import { ArrowRight, ClipboardCheck, Network, Sparkles } from 'lucide-vue-next'
import { requestDossier } from '@/app/useDossierAgent'
import { UiDrawer, UiButton, UiTag, RiskBadge, UiTimeline, AiNotice } from '@/design/ui'
import { useCluesStore } from '@/stores/clues'
import { useSystemStore } from '@/stores/system'
import { fieldOrder } from '@/engines/clue-parse'
import { flowNodes } from '@/engines/deadline'
import { addDays } from '@/engines/deadline'
import { today } from '@/stores/persist'
import { toast } from '@/app/toast'

const props = defineProps<{ id: string | null }>()
const emit = defineEmits<{ close: [] }>()
const clues = useCluesStore(), system = useSystemStore()
const clue = computed(() => props.id ? clues.byId(props.id) : undefined)
const open = computed({ get: () => Boolean(clue.value), set: v => { if (!v) emit('close') } })
const active = ref(''), note = ref('')
watch(() => props.id, id => { active.value = ''; note.value = ''; if (id) system.log('clues', '查看', id, '查看线索原文、解析要素与办理流程') })
const spans = computed(() => {
  if (!clue.value) return []
  const f = fieldOrder.map(k => clue.value!.parsed.fields[k]).filter(x => x.span && !clue.value!.state.overrides[x.key]).map(x => ({ ...x.span!, tag: 'field', key: x.key }))
  const r = clue.value.grading.risks.map(x => ({ start: x.start, end: x.end, tag: 'risk', key: `risk:${x.word}` }))
  return [...r, ...f]
})
const task = computed(() => clue.value && system.taskFor(clue.value.id))
function advance() { if (!clue.value) return; clues.advance(clue.value.id, note.value.trim()); note.value = ''; toast(`已推进至「${flowNodes[clue.value.state.node]}」`) }
function makeTask() {
  const c = clue.value!
  const t = system.createTask({ title: `初核：${c.parsed.fields.accused.value || c.village}${c.parsed.fields.issue.value ? ' · ' + c.parsed.fields.issue.value : ''}`, module: 'clues', feature: 'ledger', sourceId: c.id, sourceLabel: `信访线索 ${c.id}`, level: c.grading.level, assignee: '监督检查室', deadline: c.dl.state === '已超期' ? addDays(today(), 7) : c.dl.deadline })
  toast(`已生成核查任务 ${t.id}`, 'ok', { label: '查看任务', to: `/home/tasks?id=${t.id}` })
}
</script>
<template>
  <UiDrawer v-model="open" :width="720" :title="clue ? `${clue.id} · ${clue.parsed.fields.accused.value || clue.village}` : ''" :subtitle="clue ? `${clue.channel} · ${clue.townName}${clue.village} · ${clue.receivedAt} 受理 · ${clue.reporter}` : ''">
    <template v-if="clue">
      <div class="head-tags"><RiskBadge :level="clue.grading.level" /><UiTag v-for="t in clue.grading.tags" :key="t.name" tone="gold">{{ t.name }}</UiTag><UiTag v-if="clue.state.screened" tone="red">{{ clue.state.screened }}</UiTag><UiTag v-if="clue.state.mergedInto" tone="blue">已并入 {{ clue.state.mergedInto }}</UiTag><UiTag v-if="clue.state.invalid" tone="gray">无效诉求 · 转办答复</UiTag><span class="spacer" /><UiTag :tone="clue.dl.state === '已超期' ? 'red' : clue.dl.state === '即将到期' ? 'orange' : clue.dl.state === '已办结' ? 'green' : 'gray'" dot>{{ clue.dl.state }}<template v-if="!clue.state.done"> · 时限 {{ clue.dl.deadline }}</template></UiTag></div>
      <section class="block"><h4>原始材料 <small>金色为提取要素，红色为风险词，点击可对应</small></h4><OfficialDoc :text="clue.content" title="信访举报材料" :meta="[['登记编号', clue.id], ['来源渠道', clue.channel], ['受理日期', clue.receivedAt], ['反映人', clue.reporter], ['涉及地点', clue.townName + clue.village]]" :spans="spans" :active="active" compact @pick="active = $event" /></section>
      <section class="block"><h4>结构化要素</h4>
        <dl class="fields"><div v-for="k in fieldOrder" :key="k" :class="{ active: active === k }" @click="active = k"><dt>{{ clue.parsed.fields[k].label }}</dt><dd>{{ clue.parsed.fields[k].value || '原文未明确，需人工补充' }}<UiTag v-if="clue.state.overrides[k]" size="sm" tone="green">人工修正</UiTag><UiTag v-else-if="clue.parsed.fields[k].confidence === 'low'" size="sm" tone="orange">需核对</UiTag></dd></div></dl>
      </section>
      <section class="block"><h4>研判依据</h4><ul class="reasons"><li v-for="r in clue.grading.reasons" :key="r">{{ r }}</li><li v-if="!clue.grading.reasons.length">未命中风险规则</li></ul><AiNotice text="分级仅用于初筛排序，不代表问题属实或违纪定性。" /></section>
      <section class="block"><h4>办理流程</h4><UiTimeline :items="clue.state.flow.map(f => ({ time: f.time, title: f.node, text: [f.actor, f.note].filter(Boolean).join(' · '), tone: 'green' }))" />
        <div v-if="!clue.state.done && !clue.state.invalid" class="advance"><input v-model="note" class="input" placeholder="办理说明（可选）" /><UiButton variant="secondary" :icon="ArrowRight" @click="advance">推进至「{{ flowNodes[clue.state.node + 1] }}」</UiButton></div>
      </section>
    </template>
    <template #footer>
      <RouterLink v-if="clue" :to="`/clues/graph?id=${clue.id}`" @click="emit('close')"><UiButton variant="ghost" :icon="Network">查看关联图谱</UiButton></RouterLink>
      <UiButton v-if="clue?.parsed.fields.accused.value" variant="ghost" :icon="Sparkles" @click="requestDossier(clue.parsed.fields.accused.value.replace(/（.*$/, '')); emit('close')">交给智能体研判</UiButton>
      <UiButton v-if="task" variant="soft" :icon="ClipboardCheck" @click="$router.push(`/home/tasks?id=${task.id}`)">已生成任务 {{ task.id }}</UiButton>
      <UiButton v-else-if="system.can('task') && clue && !clue.state.invalid" variant="primary" :icon="ClipboardCheck" @click="makeTask">人工确认 · 生成核查任务</UiButton>
    </template>
  </UiDrawer>
</template>
<style scoped>
.head-tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:14px}
.block{margin-bottom:20px}
h4{font-size:14px;font-weight:600;margin-bottom:8px;display:flex;align-items:baseline;gap:8px}
h4 small{font-size:12px;color:var(--text-3);font-weight:400}

.fields{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0}
.fields>div{padding:10px 12px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line);cursor:pointer;transition:border-color var(--dur)}
.fields>div:hover,.fields>div.active{border-color:var(--gold-line);background:var(--cream)}
.fields>div:last-child{grid-column:1/-1}
dt{font-size:12px;color:var(--text-3)}
dd{margin:2px 0 0;font-size:14px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.reasons{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.reasons li{font-size:14px;padding-left:14px;position:relative}
.reasons li::before{content:"";position:absolute;left:2px;top:10px;width:5px;height:5px;border-radius:50%;background:var(--red)}
.advance{display:flex;gap:8px;margin-top:4px}
</style>
