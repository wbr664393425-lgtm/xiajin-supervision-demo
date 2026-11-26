<script setup lang="ts">
import DocEditor from '@/design/doc/DocEditor.vue'
import { computed, ref } from 'vue'
import { FileOutput, AlarmClock, Download, Printer, ClipboardList, Hourglass, CircleCheck, Siren } from 'lucide-vue-next'
import { UiCard, UiTabs, UiTag, RiskBadge, UiButton, UiModal, UiStat } from '@/design/ui'
import ClueDrawer from './parts/ClueDrawer.vue'
import { useCluesStore } from '@/stores/clues'
import { useSystemStore } from '@/stores/system'
import { useRecordQuery } from '@/app/useRecordQuery'
import { flowNodes, addDays } from '@/engines/deadline'
import { ledgerDraft } from '@/engines/ledger'
import { downloadText, printHtml } from '@/app/download'
import { today } from '@/stores/persist'
import { toast } from '@/app/toast'

const clues = useCluesStore(), system = useSystemStore()
const openId = useRecordQuery()
const filter = ref('all'), draftOpen = ref(false), draft = ref('')
const active = computed(() => clues.list.filter(c => !c.state.invalid && !c.state.mergedInto))
const count = (s: string) => active.value.filter(c => c.dl.state === s).length
const rows = computed(() => active.value.filter(c => filter.value === 'all' || c.dl.state === filter.value).sort((a, b) => (a.dl.state === '已办结' ? 1 : 0) - (b.dl.state === '已办结' ? 1 : 0) || a.dl.left - b.dl.left))
const levelText = { high: '红色', mid: '橙色', low: '黄色' }
function genDraft() {
  draft.value = ledgerDraft(active.value.map(c => ({ id: c.id, channel: c.channel, receivedAt: c.receivedAt, place: `${c.townName}${c.village}`, accused: c.parsed.fields.accused.value, issue: c.parsed.fields.issue.value, level: levelText[c.grading.level], node: flowNodes[c.state.node]!, deadline: c.dl.deadline, state: c.dl.state, assignee: c.state.assignee })), today())
  draftOpen.value = true
  system.log('clues', '生成', '线索处置台账初稿', `汇总 ${active.value.length} 条线索`)
}
function exportTxt() { downloadText(`线索处置台账_${today()}.txt`, draft.value); system.log('clues', '导出', '线索处置台账', '文本导出'); toast('台账已导出') }
function print() { printHtml('线索处置台账', `<h1>线索处置台账（初稿）</h1><pre>${draft.value.replace(/</g, '&lt;')}</pre>`); system.log('clues', '导出', '线索处置台账', '打印 / 另存为电子文档') }
function supervise() {
  const list = active.value.filter(c => c.dl.state === '已超期' && !system.taskFor(c.id))
  list.forEach(c => system.createTask({ title: `超期督办：${c.id} ${c.parsed.fields.accused.value || c.village}`, module: 'clues', feature: 'ledger', sourceId: c.id, sourceLabel: `信访线索 ${c.id}`, level: 'high', assignee: c.state.assignee === '待分办' ? '信访室' : c.state.assignee, deadline: addDays(today(), 5) }))
  toast(list.length ? `已对 ${list.length} 条超期线索发起督办任务` : '超期线索均已有督办任务', list.length ? 'ok' : 'info', list.length ? { label: '查看任务', to: '/home/tasks' } : undefined)
}
</script>
<template>
  <div class="page">
    <div class="stats">
      <UiStat label="在办线索" :value="active.length - count('已办结')" unit="条" :icon="ClipboardList" tone="blue" />
      <UiStat label="即将到期（≤3 日）" :value="count('即将到期')" unit="条" :icon="Hourglass" tone="orange" />
      <UiStat label="已超期" :value="count('已超期')" unit="条" :icon="AlarmClock" tone="red" />
      <UiStat label="已办结" :value="count('已办结')" unit="条" :icon="CircleCheck" tone="green" />
    </div>
    <UiCard flush>
      <template #title><UiTabs v-model="filter" size="sm" :items="[{ value: 'all', label: '全部' }, { value: '已超期', label: '已超期', count: count('已超期') }, { value: '即将到期', label: '即将到期', count: count('即将到期') }, { value: '正常', label: '正常' }, { value: '已办结', label: '已办结' }]" /></template>
      <template #extra><UiButton v-if="system.can('task')" size="sm" variant="danger" :icon="Siren" @click="supervise">超期一键督办</UiButton><UiButton size="sm" variant="primary" :icon="FileOutput" @click="genDraft">生成台账初稿</UiButton></template>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>线索编号</th><th>被反映人 / 问题</th><th>分级</th><th>受理</th><th>流转节点</th><th>承办</th><th>办理时限</th><th>状态</th></tr></thead>
        <tbody><tr v-for="c in rows" :key="c.id" :class="{ active: openId === c.id }" style="cursor:pointer" @click="openId = c.id">
          <td class="num link">{{ c.id }}</td>
          <td><strong class="who">{{ c.parsed.fields.accused.value || c.village }}</strong><div class="muted sub">{{ c.parsed.fields.issue.value || '待研判' }}</div></td>
          <td><RiskBadge :level="c.grading.level" /></td>
          <td class="num">{{ c.receivedAt }}<div class="muted sub">{{ c.channel }}</div></td>
          <td><div class="nodes"><i v-for="(n, i) in flowNodes" :key="n" :class="{ on: i <= c.state.node }" :title="n" /></div><span class="sub">{{ flowNodes[c.state.node] }}</span></td>
          <td>{{ c.state.assignee }}</td>
          <td class="num">{{ c.dl.deadline }}<div v-if="c.dl.state !== '已办结'" class="sub" :class="c.dl.left < 0 ? 'over' : ''">{{ c.dl.left < 0 ? `超期 ${-c.dl.left} 天` : `剩余 ${c.dl.left} 天` }}</div></td>
          <td><UiTag :tone="c.dl.state === '已超期' ? 'red' : c.dl.state === '即将到期' ? 'orange' : c.dl.state === '已办结' ? 'green' : 'gray'" dot>{{ c.dl.state }}</UiTag><div v-if="system.taskFor(c.id)" class="sub muted num">{{ system.taskFor(c.id)!.id }}</div></td>
        </tr></tbody>
      </table></div>
    </UiCard>
    <UiModal v-model="draftOpen" title="线索处置台账（初稿）" :width="820">
      <DocEditor v-model="draft" org="夏津县纪委监委信访室" />
      <p class="muted tip">可直接修改后导出；分级为初筛参考，正式使用前须核对。</p>
      <template #footer><UiButton :icon="Printer" @click="print">打印 / 另存为电子文档</UiButton><UiButton variant="primary" :icon="Download" @click="exportTxt">导出文本</UiButton></template>
    </UiModal>
    <ClueDrawer :id="openId" @close="openId = null" />
  </div>
</template>
<style scoped>
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.link{color:var(--red);font-weight:600}
.who{font-weight:600}
.sub{font-size:12px}
.over{color:var(--risk-high);font-weight:600}
.nodes{display:flex;gap:3px;margin-bottom:3px}
.nodes i{width:18px;height:5px;border-radius:3px;background:var(--surface-3)}
.nodes i.on{background:var(--red)}
.draft{font-family:var(--font-serif);font-size:14px}
.tip{font-size:13px;margin-top:6px}
</style>
