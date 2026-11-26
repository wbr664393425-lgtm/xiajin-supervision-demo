<script setup lang="ts">
import { computed, onActivated, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Map, FileBarChart, Download, Printer, History, ArrowUpRight } from 'lucide-vue-next'
import { UiCard, UiTabs, UiTag, RiskBadge, UiButton, UiModal, UiEmpty, AiNotice, UiSelect } from '@/design/ui'
import TownHeatMap from '@/charts/TownHeatMap.vue'
import DonutChart from '@/charts/DonutChart.vue'
import BarList from '@/charts/BarList.vue'
import { useRiskStore, domainColors } from '@/stores/risk'
import { useSupervisionStore } from '@/stores/supervision'
import { useSystemStore } from '@/stores/system'
import { useQueryTab } from '@/app/useQueryTab'
import { towns, townName } from '@/mock/geo'
import { aggregateByTown } from '@/engines/supervision'
import { buildReport, renderReportHtml } from '@/engines/report'
import { downloadText, printHtml, reportDocument } from '@/app/download'
import { toast } from '@/app/toast'

const risk = useRiskStore(), sup = useSupervisionStore(), system = useSystemStore()
const dim = useQueryTab('dim', 'town')
const domains = ref<string[]>([])
const route = useRoute()
const town = ref('qinghe')
// 从工作台点击乡镇进入时定位到该乡镇（页面被缓存时同样生效）
const syncTown = () => {
  const selected = towns.find(t => t.name === route.query.town || t.id === route.query.town)
  if (selected) { town.value = selected.id; dim.value = 'town' }
}
watch(() => route.query.town, () => { if (route.path === '/supervision/riskmap') syncTown() })
onActivated(syncTown)
const scoped = computed(() => risk.active.filter(i => !domains.value.length || domains.value.includes(i.domain)))
const heat = computed(() => aggregateByTown(scoped.value))
const townItems = computed(() => scoped.value.filter(i => i.town === town.value).sort((a, b) => ({ high: 0, mid: 1, low: 2 }[a.level] - { high: 0, mid: 1, low: 2 }[b.level])))
const ranking = computed(() => towns.map(t => ({ label: t.name, value: heat.value[t.id]?.count || 0, color: heat.value[t.id]?.level === 'high' ? 'var(--risk-high)' : heat.value[t.id]?.level === 'mid' ? '#E07B2A' : '#E5B53A' })).filter(x => x.value).sort((a, b) => b.value - a.value))
const domainLevels = computed(() => Object.keys(domainColors).map(d => ({ d, items: scoped.value.filter(i => i.domain === d) })).filter(x => x.items.length))
const depts = computed(() => { const m: Record<string, typeof scoped.value> = {}; scoped.value.forEach(i => { (m[i.dept] = m[i.dept] || []).push(i) }); return Object.entries(m).map(([dept, items]) => ({ dept, items, high: items.filter(i => i.level === 'high').length })).sort((a, b) => b.high - a.high || b.items.length - a.items.length) })
function toggle(d: string) { domains.value = domains.value.includes(d) ? domains.value.filter(x => x !== d) : [...domains.value, d] }
function pickTown(id: string) { town.value = id; system.log('supervision', '查看', townName(id), '查看乡镇风险详情') }

const reportOpen = ref(false), scope = ref<'领域' | '乡镇'>('领域'), focus = ref(''), month = ref('2026-10')
const report = computed(() => buildReport(risk.active.map(i => ({ domain: i.domain, townName: i.town ? townName(i.town) : '县直部门', level: i.level, title: i.title, status: i.status, amount: i.amount })), { month: month.value, scope: scope.value, focus: focus.value || undefined }))
const focusOptions = computed(() => scope.value === '领域' ? Object.keys(domainColors) : towns.map(t => t.name))
function openReport() { reportOpen.value = true; system.log('supervision', '生成', '监督分析月报', `按${scope.value}生成初稿`) }
function exportHtml() { downloadText(`${report.value.title}.html`, reportDocument(report.value.title, renderReportHtml(report.value)), 'text/html;charset=utf-8'); sup.addReport(report.value.title, scope.value); system.log('supervision', '导出', report.value.title, 'HTML 导出'); toast('月报已导出') }
function print() { printHtml(report.value.title, renderReportHtml(report.value)); sup.addReport(report.value.title, scope.value); system.log('supervision', '导出', report.value.title, '打印 / 另存为电子文档') }
</script>
<template>
  <div class="page">
    <div class="row toolbar">
      <UiTabs v-model="dim" :items="[{ value: 'town', label: '按乡镇' }, { value: 'domain', label: '按领域' }, { value: 'dept', label: '按部门' }]" />
      <div class="domains"><button v-for="(c, d) in domainColors" :key="d" :class="{ on: domains.includes(String(d)) }" @click="toggle(String(d))"><i :style="{ background: c }" />{{ d }}</button></div>
      <span class="spacer" />
      <UiButton variant="primary" :icon="FileBarChart" @click="openReport">生成监督分析月报</UiButton>
    </div>

    <div v-if="dim === 'town'" class="map-grid">
      <UiCard :icon="Map" title="县域风险一张图" subtitle="红橙黄分级预警，点击乡镇查看疑点">
        <TownHeatMap :data="heat" :selected="town" @select="pickTown" />
      </UiCard>
      <div class="side">
        <UiCard :title="townName(town)" :subtitle="`${townItems.length} 条疑点线索`">
          <template #extra><RiskBadge v-if="heat[town]?.level" :level="heat[town]!.level!" /></template>
          <UiEmpty v-if="!townItems.length" title="该乡镇暂无疑点" />
          <ul class="items"><li v-for="i in townItems.slice(0, 8)" :key="i.id"><RouterLink :to="i.to"><i :style="{ background: domainColors[i.domain] }" /><div><strong>{{ i.title }}</strong><small>{{ i.domain }}{{ i.status === 'confirmed' ? ' · 已转核查' : '' }}</small></div><ArrowUpRight :size="14" /></RouterLink></li></ul>
        </UiCard>
        <UiCard title="乡镇风险排行"><BarList :items="ranking.slice(0, 6)" unit="条" @select="l => pickTown(towns.find(t => t.name === l)!.id)" /></UiCard>
      </div>
    </div>

    <div v-else-if="dim === 'domain'" class="dom-grid">
      <UiCard title="风险领域分布"><DonutChart :items="risk.byDomain.filter(d => !domains.length || domains.includes(d.label))" center-label="疑点总数" @select="toggle" /></UiCard>
      <UiCard title="各领域分级构成" flush>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>领域</th><th>红色</th><th>橙色</th><th>黄色</th><th style="width:40%">构成</th></tr></thead>
          <tbody><tr v-for="x in domainLevels" :key="x.d"><td><span class="dl"><i :style="{ background: domainColors[x.d] }" />{{ x.d }}</span></td><td class="num">{{ x.items.filter(i => i.level === 'high').length }}</td><td class="num">{{ x.items.filter(i => i.level === 'mid').length }}</td><td class="num">{{ x.items.filter(i => i.level === 'low').length }}</td>
            <td><div class="stack"><i class="h" :style="{ flex: x.items.filter(i => i.level === 'high').length }" /><i class="m" :style="{ flex: x.items.filter(i => i.level === 'mid').length }" /><i class="l" :style="{ flex: x.items.filter(i => i.level === 'low').length }" /></div></td></tr></tbody></table></div>
      </UiCard>
    </div>

    <UiCard v-else title="按部门 / 单位" subtitle="县直部门与村级组织的疑点分布" flush>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>部门 / 单位</th><th>疑点数</th><th>红色预警</th><th>涉及领域</th><th>典型疑点</th></tr></thead>
        <tbody><tr v-for="d in depts" :key="d.dept"><td><strong>{{ d.dept }}</strong></td><td class="num">{{ d.items.length }}</td><td><UiTag v-if="d.high" tone="red">{{ d.high }}</UiTag><span v-else class="muted">0</span></td><td><div class="chips"><UiTag v-for="x in [...new Set(d.items.map(i => i.domain))]" :key="x" size="sm" tone="gold">{{ x }}</UiTag></div></td><td><RouterLink :to="d.items[0]!.to" class="link">{{ d.items[0]!.title }}</RouterLink></td></tr></tbody></table></div>
    </UiCard>

    <UiCard :icon="History" title="月报记录" flush>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>编号</th><th>标题</th><th>维度</th><th>生成时间</th></tr></thead><tbody><tr v-for="r in sup.reports" :key="r.id"><td class="num">{{ r.id }}</td><td>{{ r.title }}</td><td>{{ r.scope }}</td><td class="num">{{ r.time }}</td></tr></tbody></table></div>
    </UiCard>
    <AiNotice text="热力图与月报使用样例数据，乡镇名称与分区均为演示示意。" />

    <UiModal v-model="reportOpen" title="监督分析月报（初稿预览）" :width="860">
      <div class="report-opts">
        <div><span class="label">统计月份</span><UiSelect v-model="month" label="统计月份" :options="[{ value: '2026-10', label: '2026年10月' }, { value: '2026-09', label: '2026年9月' }]" /></div>
        <div><span class="label">汇总维度</span><UiSelect :model-value="scope" label="汇总维度" :options="[{ value: '领域', label: '按领域' }, { value: '乡镇', label: '按乡镇' }]" @update:model-value="v => { scope = v as '领域' | '乡镇'; focus = '' }" /></div>
        <div><span class="label">导出范围</span><UiSelect v-model="focus" label="导出范围" :options="[{ value: '', label: '全部' }, ...focusOptions]" /></div>
      </div>
      <div class="doc-desk compact"><article class="doc-page report" v-html="renderReportHtml(report)" /></div>
      <template #footer><UiButton :icon="Printer" @click="print">打印 / 另存为电子文档</UiButton><UiButton variant="primary" :icon="Download" @click="exportHtml">导出网页版</UiButton></template>
    </UiModal>
  </div>
</template>
<style scoped>
.toolbar{flex-wrap:wrap}
.domains{display:flex;flex-wrap:wrap;gap:6px}
.domains button{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:16px;background:var(--surface);border:1px solid var(--line);font-size:13px}
.domains button i{width:8px;height:8px;border-radius:50%}
.domains button.on{border-color:var(--text);box-shadow:inset 0 0 0 1px var(--text);font-weight:600}
.map-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,1fr);gap:16px;align-items:start}
.side{display:flex;flex-direction:column;gap:16px}
.items{display:flex;flex-direction:column;gap:2px}
.items a{display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px}
.items a:hover{background:var(--red-25)}
.items i{width:8px;height:8px;border-radius:50%;flex:none}
.items div{flex:1;min-width:0}
.items strong{display:block;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.items small{font-size:12px;color:var(--text-3)}
.dom-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:16px;align-items:start}
.dl{display:inline-flex;align-items:center;gap:6px}
.dl i{width:9px;height:9px;border-radius:3px}
.stack{display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--surface-3)}
.stack .h{background:var(--risk-high)}.stack .m{background:#E07B2A}.stack .l{background:#E5B53A}
.chips{display:flex;flex-wrap:wrap;gap:4px}
.link{color:var(--red);font-size:13px}
.report-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.doc-desk{max-height:58vh;overflow:auto;align-items:flex-start}
.report :deep(h1){font-family:'STZhongsong','Songti SC',serif;font-size:22px;text-align:center;color:#111;margin:0 0 4px}
.report :deep(p){text-indent:2em}
.report :deep(h2){font-family:'SimHei','Heiti SC',sans-serif;font-size:16px;margin:14px 0 4px}
.report :deep(h3){font-family:'KaiTi','STKaiti',serif;font-size:16px;margin:10px 0 2px}
.report :deep(table){margin:6px 0}
.report :deep(th){background:var(--cream)}
@media(max-width:1200px){.map-grid,.dom-grid{grid-template-columns:1fr}}
</style>
