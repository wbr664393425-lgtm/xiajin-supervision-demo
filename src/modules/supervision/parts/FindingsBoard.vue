<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search, ClipboardCheck, XCircle, Undo2, ListFilter, Sparkles } from 'lucide-vue-next'
import { requestDossier } from '@/app/useDossierAgent'
import { UiCard, UiTag, RiskBadge, UiButton, UiDrawer, UiEmpty, AiNotice, UiSelect } from '@/design/ui'
import { useSupervisionStore } from '@/stores/supervision'
import { useSystemStore } from '@/stores/system'
import { useRecordQuery } from '@/app/useRecordQuery'
import { townName } from '@/mock/geo'
import { toast } from '@/app/toast'
import type { Finding, RiskLevel } from '@/types'

const props = defineProps<{ findings: Finding[]; rules: string[]; title?: string }>()
/** 交给智能体的研判对象：取疑点对象的村社或单位（“和盛村 · 村北集体场地”取前者），收起抽屉后在右侧面板展开 */
function toAgent(x: Finding) { const s = (x.subject.split(/\s*·\s*/)[0] || x.subject).trim(); openId.value = null; requestDossier(s) }
const store = useSupervisionStore(), system = useSystemStore()
const openId = useRecordQuery()
const rule = ref(''), level = ref<RiskLevel | ''>(''), q = ref(''), state = ref<'' | 'pending' | 'confirmed' | 'dismissed'>('')
const dismissNote = ref(''), dismissing = ref(false)
const status = (x: Finding) => store.decisions[x.id]?.decision || 'pending'
const rows = computed(() => props.findings.filter(x => (!rule.value || x.rule === rule.value) && (!level.value || x.level === level.value) && (!state.value || status(x) === state.value) && (!q.value || `${x.title}${x.subject}`.includes(q.value)))
  .sort((a, b) => ({ high: 0, mid: 1, low: 2 }[a.level] - { high: 0, mid: 1, low: 2 }[b.level]) || (b.amount || 0) - (a.amount || 0)))
const ruleCounts = computed(() => props.rules.map(r => ({ r, n: props.findings.filter(x => x.rule === r).length })))
const current = computed(() => props.findings.find(x => x.id === openId.value))
const open = computed({ get: () => Boolean(current.value), set: v => { if (!v) openId.value = null } })
const task = computed(() => current.value && system.taskFor(current.value.id))
watch(openId, id => { dismissing.value = false; dismissNote.value = ''; if (id && current.value) system.log('supervision', '查看', id, `查看疑点：${current.value.title}`) })
function confirm() { const t = store.confirm(current.value!); toast(`已生成核查任务 ${t.id}`, 'ok', { label: '查看', to: `/home/tasks?id=${t.id}` }) }
function dismiss() { if (!dismissNote.value.trim()) return; store.dismiss(current.value!, dismissNote.value.trim()); dismissing.value = false; toast('已排除该疑点，理由已留痕') }
const money = (n?: number) => n ? n.toLocaleString('zh-CN') : '—'
defineExpose({ setRule: (r: string) => { rule.value = r } })
</script>
<template>
  <UiCard flush>
    <template #title><span class="row"><ListFilter :size="15" />{{ title || '疑点清单' }}<span class="muted num">{{ rows.length }} / {{ findings.length }}</span></span></template>
    <template #extra>
      <label class="search"><Search :size="14" /><input v-model="q" placeholder="搜索对象或疑点" aria-label="搜索疑点" /></label>
      <UiSelect :model-value="level" size="sm" class="w120" label="分级" :options="[{ value: '', label: '全部分级' }, { value: 'high', label: '红色预警' }, { value: 'mid', label: '橙色预警' }, { value: 'low', label: '黄色关注' }]" @update:model-value="v => level = v as RiskLevel | ''" />
      <UiSelect :model-value="state" size="sm" class="w120" label="状态" :options="[{ value: '', label: '全部状态' }, { value: 'pending', label: '待研判' }, { value: 'confirmed', label: '已转核查' }, { value: 'dismissed', label: '已排除' }]" @update:model-value="v => state = v as typeof state" />
    </template>
    <div class="rules"><button :class="{ on: !rule }" @click="rule = ''">全部 <b class="num">{{ findings.length }}</b></button><button v-for="r in ruleCounts" :key="r.r" :class="{ on: rule === r.r }" :disabled="!r.n" @click="rule = rule === r.r ? '' : r.r">{{ r.r }} <b class="num">{{ r.n }}</b></button></div>
    <UiEmpty v-if="!rows.length" title="没有符合条件的疑点" />
    <div v-else class="tbl-wrap"><table class="tbl">
      <thead><tr><th>分级</th><th>疑点</th><th>规则</th><th>对象</th><th>乡镇 / 部门</th><th style="text-align:right">涉及金额（元）</th><th>状态</th></tr></thead>
      <tbody><tr v-for="x in rows" :key="x.id" :class="{ active: openId === x.id, dim: status(x) === 'dismissed' }" style="cursor:pointer" @click="openId = x.id">
        <td><RiskBadge :level="x.level" /></td><td><strong class="t">{{ x.title }}</strong></td><td><UiTag size="sm" tone="gold">{{ x.rule }}</UiTag></td>
        <td class="sub2">{{ x.subject }}</td><td>{{ x.town ? townName(x.town) : x.subject.match(/^[^·]+/)?.[0] }}</td><td class="num" style="text-align:right">{{ money(x.amount) }}</td>
        <td><UiTag v-if="status(x) === 'confirmed'" tone="green" size="sm">已转核查</UiTag><UiTag v-else-if="status(x) === 'dismissed'" tone="gray" size="sm">已排除</UiTag><UiTag v-else tone="ai" size="sm">待研判</UiTag></td>
      </tr></tbody>
    </table></div>
  </UiCard>
  <UiDrawer v-model="open" :width="640" :title="current?.title" :subtitle="current ? `${current.rule} · ${current.subject}${current.town ? ' · ' + townName(current.town) : ''}` : ''">
    <template v-if="current">
      <div class="tags"><RiskBadge :level="current.level" /><UiTag tone="gold">{{ current.rule }}</UiTag><UiTag v-if="current.amount" tone="gray">涉及 {{ money(current.amount) }} 元</UiTag><UiTag tone="ai">疑点 · 非结论</UiTag></div>
      <h4>比对证据</h4>
      <dl class="evidence"><div v-for="e in current.evidence" :key="e.label + e.value"><dt>{{ e.label }}</dt><dd>{{ e.value }}</dd></div></dl>
      <slot name="detail" :finding="current" />
      <h4>规则依据</h4><p class="basis">{{ current.basis }}</p>
      <div v-if="store.decisions[current.id]" class="decided"><strong>{{ store.decisions[current.id]!.decision === 'confirmed' ? '已人工确认转核查' : '已人工排除' }}</strong><span>{{ store.decisions[current.id]!.by }} · {{ store.decisions[current.id]!.time }}</span><p>{{ store.decisions[current.id]!.note }}</p></div>
      <div v-if="dismissing" class="dismiss"><label class="label" for="dismiss-note">排除理由（必填，将记入审计日志）</label><textarea id="dismiss-note" v-model="dismissNote" class="textarea" rows="3" placeholder="例如：经核对，差额系合同约定分期支付，已于 10 月入账。" /></div>
      <AiNotice text="模型输出为疑点清单，需由工作人员线下核实；系统不作事实认定、违纪定性或处置决定。" />
    </template>
    <template #footer>
      <UiButton v-if="current" variant="ghost" :icon="Sparkles" @click="toAgent(current)">交给智能体研判</UiButton><span class="spacer" />
      <template v-if="current && system.can('confirm')">
        <UiButton v-if="status(current) === 'dismissed'" variant="ghost" :icon="Undo2" @click="store.reopen(current)">撤销排除</UiButton>
        <template v-else-if="status(current) === 'pending'">
          <UiButton v-if="!dismissing" variant="secondary" :icon="XCircle" @click="dismissing = true">排除</UiButton>
          <UiButton v-else variant="secondary" :disabled="!dismissNote.trim()" @click="dismiss">人工确认 · 排除</UiButton>
          <UiButton v-if="system.can('task')" variant="primary" :icon="ClipboardCheck" @click="confirm">人工确认 · 生成核查任务</UiButton>
        </template>
        <UiButton v-else-if="task" variant="soft" :icon="ClipboardCheck" @click="$router.push(`/home/tasks?id=${task.id}`)">查看任务 {{ task.id }}</UiButton>
      </template>
    </template>
  </UiDrawer>
</template>
<style scoped>
.search{display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:1px solid var(--line-2);border-radius:8px;color:var(--text-3);background:var(--surface)}
.search input{border:0;outline:0;width:130px;font-size:13px;background:none}
.mini{height:30px;padding:0 8px;font-size:13px;width:auto}
.rules{display:flex;flex-wrap:wrap;gap:6px;padding:12px 18px;border-bottom:1px solid var(--line)}
.rules button{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:15px;font-size:13px;background:var(--surface-2);border:1px solid var(--line);transition:all var(--dur)}
.rules button:hover:not(:disabled){border-color:var(--red-line);color:var(--red)}
.rules button.on{background:var(--red);color:#fff;border-color:var(--red)}
.rules button:disabled{opacity:.4}
.rules b{font-weight:700}
.t{font-weight:600}
.sub2{font-size:13px;color:var(--text-2);max-width:240px}
tr.dim td{opacity:.5}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
h4{font-size:14px;font-weight:600;margin:16px 0 8px}
.evidence{margin:0;border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden}
.evidence div{display:grid;grid-template-columns:150px 1fr;border-bottom:1px solid var(--line)}
.evidence div:last-child{border-bottom:0}
dt{padding:9px 12px;font-size:13px;color:var(--text-3);background:var(--surface-2)}
dd{margin:0;padding:9px 12px;font-size:14px;line-height:1.7}
.basis{font-size:14px;color:var(--text-2);line-height:1.8;margin-bottom:12px}
.decided{padding:10px 12px;border-radius:var(--r-sm);background:var(--ok-bg);color:var(--ok);margin-bottom:12px;font-size:13px}
.decided strong{margin-right:8px}
.decided p{color:var(--text-2);margin-top:2px}
.dismiss{margin-bottom:12px}
</style>
