<script setup lang="ts">
import { showCode } from '@/app/code'
import { computed, ref, watch } from 'vue'
import { ArrowUpRight, CheckCheck, ClipboardList } from 'lucide-vue-next'
import { UiCard, UiTabs, UiTag, RiskBadge, UiButton, UiDrawer, UiEmpty, UiTimeline } from '@/design/ui'
import { useSystemStore } from '@/stores/system'
import { useRecordQuery } from '@/app/useRecordQuery'
import { moduleOf, featureOf } from '@/app/modules'
import { today } from '@/stores/persist'
import { toast } from '@/app/toast'

const system = useSystemStore()
const openId = useRecordQuery()
const filter = ref('处理中'), result = ref('')
const rows = computed(() => system.tasks.filter(t => filter.value === '全部' || (filter.value === '超期' ? t.status === '处理中' && t.deadline < today() : t.status === filter.value)))
const task = computed(() => system.tasks.find(t => t.id === openId.value))
const open = computed({ get: () => Boolean(task.value), set: v => { if (!v) openId.value = null } })
watch(openId, id => { result.value = ''; if (id && task.value) system.log(task.value.module, '查看', id, '查看核查任务') })
function complete() { if (!task.value || !result.value.trim()) return; system.completeTask(task.value.id, result.value.trim()); toast('已记录人工核查结果') }
const sourcePath = (t: { module: string; feature: string; sourceId: string }) => `/${t.module}/${t.feature}?id=${encodeURIComponent(t.sourceId)}`
</script>
<template>
  <div class="page">
    <UiCard flush>
      <template #title><UiTabs v-model="filter" size="sm" :items="[{ value: '处理中', label: '处理中', count: system.tasks.filter(t => t.status === '处理中').length }, { value: '超期', label: '超期', count: system.overdue.length }, { value: '已完成', label: '已完成' }, { value: '全部', label: '全部' }]" /></template>
      <template #extra><span class="muted note">任务均由工作人员人工确认疑点后生成，系统不自动立案</span></template>
      <UiEmpty v-if="!rows.length" :icon="ClipboardList" title="暂无任务" text="在各模块确认疑点或线索后生成核查任务，会同步到这里。" />
      <div v-else class="tbl-wrap"><table class="tbl">
        <thead><tr><th>任务编号</th><th>任务</th><th>来源</th><th>关注级别</th><th>承办</th><th>期限</th><th>状态</th></tr></thead>
        <tbody><tr v-for="t in rows" :key="t.id" :class="{ active: openId === t.id }" style="cursor:pointer" @click="openId = t.id">
          <td class="num link">{{ t.id }}</td><td><strong>{{ t.title }}</strong><div class="muted sub">{{ t.createdAt }} 创建</div></td>
          <td>{{ moduleOf(t.module)?.short }}<div class="muted sub">{{ t.sourceLabel }}</div></td>
          <td><RiskBadge :level="t.level" /></td><td>{{ t.assignee }}</td>
          <td class="num" :class="{ over: t.status === '处理中' && t.deadline < today() }">{{ t.deadline }}</td>
          <td><UiTag :tone="t.status === '已完成' ? 'green' : t.deadline < today() ? 'red' : 'blue'" dot>{{ t.status === '处理中' && t.deadline < today() ? '已超期' : t.status }}</UiTag></td>
        </tr></tbody>
      </table></div>
    </UiCard>
    <UiDrawer v-model="open" :title="task?.title" :subtitle="task ? `${task.id} · ${moduleOf(task.module)?.title} / ${featureOf(task.module, task.feature)?.title || task.sourceLabel}` : ''">
      <template v-if="task">
        <div class="tags"><RiskBadge :level="task.level" /><UiTag :tone="task.status === '已完成' ? 'green' : 'blue'">{{ task.status }}</UiTag><UiTag tone="gray">承办：{{ task.assignee }}</UiTag><UiTag :tone="task.deadline < today() && task.status === '处理中' ? 'red' : 'gray'">期限 {{ task.deadline }}</UiTag></div>
        <RouterLink :to="sourcePath(task)" class="source"><div><small>业务依据</small><strong>{{ task.sourceLabel }}</strong><span class="num">{{ showCode(task.sourceId) }}</span></div><ArrowUpRight :size="18" /></RouterLink>
        <UiTimeline :items="[{ time: task.createdAt, title: '人工确认并生成任务', text: `来源：${task.sourceLabel}`, tone: 'red' }, ...(task.completedAt ? [{ time: task.completedAt, title: '人工完成核查', text: task.result, tone: 'green' as const }] : [])]" />
        <div v-if="task.status === '处理中'" class="complete">
          <label class="label" for="task-result">核查结果（由承办人员填写）</label>
          <textarea id="task-result" v-model="result" class="textarea" rows="4" placeholder="例如：已调阅原始凭证，差额 24,000 元系分期收取，补充协议已归档。" />
        </div>
      </template>
      <template #footer><UiButton v-if="task?.status === '处理中'" variant="primary" :icon="CheckCheck" :disabled="!result.trim()" @click="complete">记录结果并完成</UiButton></template>
    </UiDrawer>
  </div>
</template>
<style scoped>
.note{font-size:13px}
.link{color:var(--red);font-weight:600}
.sub{font-size:12px}
.over{color:var(--risk-high);font-weight:600}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.source{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:var(--r-md);background:var(--cream);box-shadow:inset 0 0 0 1px var(--gold-line);margin-bottom:18px;color:#6E4E12}
.source div{flex:1}
.source small{display:block;font-size:12px;opacity:.8}
.source strong{display:block;font-size:15px}
.source span{font-size:12px}
.source:hover{box-shadow:inset 0 0 0 1px var(--gold)}
.complete{margin-top:8px}
</style>
