<script setup lang="ts">
import { showCode } from '@/app/code'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Inbox, Siren, ClipboardList, AlarmClock, FilePlus2, Map, Sparkles, ArrowUpRight, Star, Activity, Bot, Gauge, Network, ClipboardCheck, Scale, BadgeCheck, Megaphone, Radio } from 'lucide-vue-next'
import { useInspectionStore } from '@/stores/inspection'
import { useCasesStore } from '@/stores/cases'
import { useSessionStore } from '@/stores/session'
import BrandMark from '@/app/BrandMark.vue'
import { educationCases } from '@/mock/outreach'
import { UiCard, UiTag, RiskBadge, UiEmpty } from '@/design/ui'
import LineChart from '@/charts/LineChart.vue'
import DonutChart from '@/charts/DonutChart.vue'
import TownHeatMap from '@/charts/TownHeatMap.vue'
import { useSystemStore } from '@/stores/system'
import { useCluesStore } from '@/stores/clues'
import { useSupervisionStore } from '@/stores/supervision'
import { useRiskStore } from '@/stores/risk'
import { useOpinionStore } from '@/stores/opinion'
import { roles } from '@/app/permissions'
import { addDays } from '@/engines/deadline'
import { today } from '@/stores/persist'
import { moduleOf } from '@/app/modules'
import { towns, townName } from '@/mock/geo'
import { archivedWeekly } from '@/mock/clues'

const system = useSystemStore(), clues = useCluesStore(), sup = useSupervisionStore(), risk = useRiskStore(), insp = useInspectionStore(), cs = useCasesStore(), opinion = useOpinionStore(), router = useRouter()
const pendingClues = computed(() => clues.list.filter(c => !c.state.done && !c.state.invalid && !c.state.mergedInto))
const openFindings = computed(() => sup.all.filter(x => !sup.decisions[x.id]))
const doing = computed(() => system.tasks.filter(t => t.status === '处理中'))
const weeks = computed(() => Array.from({ length: 8 }, (_, i) => addDays(today(), -7 * (7 - i))))
const inWeek = (d: string | undefined, start: string) => !!d && d > addDays(start, -7) && d <= start
const trend = computed(() => [
  { name: '线索登记', color: 'var(--chart-1)', values: weeks.value.map(w => (archivedWeekly[w]?.[0] || 0) + clues.list.filter(c => inWeek(c.receivedAt, w)).length) },
  { name: '核查任务', color: 'var(--chart-2)', values: weeks.value.map(w => (archivedWeekly[w]?.[1] || 0) + system.tasks.filter(t => inWeek(t.createdAt.slice(0, 10), w)).length) },
])
const highValue = computed(() => clues.list.filter(c => (c.state.screened === '高价值' || c.grading.highValue) && !c.state.done && !c.state.mergedInto).slice(0, 5))
const todo = computed(() => [...doing.value].sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 5))
const topTowns = computed(() => towns.map(t => ({ id: t.id, name: t.name, ...(risk.byTown[t.id] || { count: 0, level: null }) })).filter(t => t.count).sort((a, b) => b.count - a.count).slice(0, 5))
const levelCount = (l: string) => Object.values(risk.byTown).filter(x => x.level === l).length
// 线索全生命周期：每个环节的数字均来自当前业务数据，点击进入对应功能
const lifecycle = computed(() => [
  { label: '信访受理', icon: Inbox, value: clues.list.length, unit: '条', note: '多渠道解析入库', to: '/clues/intake' },
  { label: '研判分级', icon: Gauge, value: clues.list.filter(c => c.grading.level === 'high' && !c.state.mergedInto).length, unit: '条', note: '红色预警线索', to: '/clues/grading' },
  { label: '关联研判', icon: Network, value: clues.graph.repeated.length, unit: '个', note: '多次出现的人员与单位', to: '/clues/graph' },
  { label: '初步核实', icon: ClipboardCheck, value: doing.value.length, unit: '项', note: '办理中核查任务', to: '/home/tasks' },
  { label: '审查审理', icon: Scale, value: cs.cases.length, unit: '件', note: '在办案卷', to: '/cases/evidence' },
  { label: '整改销号', icon: BadgeCheck, value: insp.issues.length, unit: '项', note: '巡察整改问题', to: '/inspection/rectify' },
  { label: '以案促改', icon: Megaphone, value: educationCases.length, unit: '个', note: '警示教育典型案例', to: '/archive/materials' },
])
// 智能处理工作量：按业务数据与审计日志统计；节省工时按人工逐份处理的平均用时估算
const aiWork = computed(() => {
  const parsed = clues.list.length, findings = sup.all.length + insp.findings.length, read = insp.readIds.length
  const generated = system.audit.filter(a => a.action === '生成').length
  const hours = Math.round(parsed * 0.5 + findings * 1 + read * 0.75 + generated * 1)
  return { parsed, findings, read, generated, hours }
})
const highOpen = computed(() => openFindings.value.filter(x => x.level === 'high').length)
const kpis = computed(() => [
  { label: '待处置线索', value: pendingClues.value.length, unit: '条', icon: Inbox, to: '/clues/ledger', hint: `其中高价值 ${highValue.value.length} 条` },
  { label: '预警疑点待研判', value: openFindings.value.length, unit: '条', icon: Siren, to: '/supervision/riskmap', hint: `红色 ${highOpen.value} · 橙色 ${openFindings.value.filter(x => x.level === 'mid').length}` },
  { label: '办理中任务', value: doing.value.length, unit: '项', icon: ClipboardList, to: '/home/tasks', hint: '均由人工确认生成' },
  { label: '超期提醒', value: system.overdue.length + clues.list.filter(c => c.dl.state === '已超期').length, unit: '项', icon: AlarmClock, to: '/clues/ledger', hint: `任务 ${system.overdue.length} · 线索 ${clues.list.filter(c => c.dl.state === '已超期').length}` },
])
// 刚登录进入时：品牌色幕布淡出，页面区块依次上浮出现（只播放一次）
const session = useSessionStore()
const entering = ref(session.justSignedIn)
if (entering.value) { session.justSignedIn = false; setTimeout(() => { entering.value = false }, 1600) }
const hour = new Date().getHours()
const dateText = (() => { const [y, m, d] = today().split('-').map(Number); return `${y}年${m}月${d}日 星期${'日一二三四五六'[new Date(y!, m! - 1, d).getDay()]}` })()
const greet = hour < 11 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
</script>
<template>
  <div class="page" :class="{ entering }">
    <Teleport to="body"><div v-if="entering" class="enter-veil" aria-hidden="true"><BrandMark :size="64" /></div></Teleport>
    <section class="cmd">
      <div class="cmd-main">
        <div class="cmd-hi">
          <h2>{{ greet }}，{{ system.user }}</h2>
          <p>{{ dateText }} · {{ roles[system.role].name }}</p>
          <div class="alerts">
            <RouterLink to="/home/tasks" class="alert"><AlarmClock :size="15" />今日 <b class="num">{{ system.overdue.length }}</b> 项任务超期</RouterLink>
            <RouterLink to="/supervision/riskmap" class="alert"><Siren :size="15" /><b class="num">{{ highOpen }}</b> 条红色预警待研判</RouterLink>
            <RouterLink v-if="opinion.pendingTopics.length" to="/opinion/overview" class="alert"><Radio :size="15" /><b class="num">{{ opinion.pendingTopics.length }}</b> 项涉纪舆情待研判</RouterLink>
          </div>
          <div class="quick">
            <button class="qa primary" @click="router.push('/clues/intake')"><FilePlus2 :size="16" />登记新线索</button>
            <button class="qa" @click="router.push('/supervision/riskmap')"><Map :size="16" />风险一张图</button>
            <button class="qa" @click="router.push('/assistant/chat')"><Sparkles :size="16" />问智能助手</button>
          </div>
        </div>
        <div class="kpis">
          <RouterLink v-for="k in kpis" :key="k.label" :to="k.to" class="kpi">
            <span class="ki"><component :is="k.icon" :size="18" /></span>
            <span class="kl">{{ k.label }}</span>
            <strong class="num">{{ k.value }}<small>{{ k.unit }}</small></strong>
            <span class="kh">{{ k.hint }}</span>
          </RouterLink>
        </div>
      </div>
      <div class="ai-strip" title="按人工逐份处理平均用时估算节省工时">
        <span class="ai-tag"><Bot :size="15" />智能引擎累计</span>
        <span>线索解析 <b class="num">{{ aiWork.parsed }}</b></span><i />
        <span>疑点识别 <b class="num">{{ aiWork.findings }}</b></span><i />
        <span>台账阅卷 <b class="num">{{ aiWork.read }}</b></span><i />
        <span>初稿与摘要 <b class="num">{{ aiWork.generated }}</b></span>
        <span class="save">折合节省人工约 <b class="num">{{ aiWork.hours }}</b> 小时<small>（估算）</small></span>
      </div>
    </section>

    <div class="row-a">
      <UiCard class="b-map" title="县域风险一张图" subtitle="汇总信访、三资、惠民、招投标、公务支出、巡察疑点，按乡镇分级预警">
        <template #extra><RouterLink to="/supervision/riskmap" class="more">进入详情 <ArrowUpRight :size="13" /></RouterLink></template>
        <div class="map-wrap">
          <TownHeatMap :data="risk.byTown" @select="id => router.push({ path: '/supervision/riskmap', query: { town: townName(id) } })" />
          <aside class="map-side">
            <div class="ms-total"><span>全县疑点线索</span><strong class="num">{{ risk.active.length }}</strong></div>
            <div class="ms-levels"><div class="h"><b class="num">{{ levelCount('high') }}</b><span>红色乡镇</span></div><div class="m"><b class="num">{{ levelCount('mid') }}</b><span>橙色乡镇</span></div><div class="l"><b class="num">{{ levelCount('low') }}</b><span>黄色乡镇</span></div></div>
            <h5>风险靠前乡镇</h5>
            <ol class="ms-rank"><li v-for="(t, i) in topTowns" :key="t.id" @click="router.push({ path: '/supervision/riskmap', query: { town: t.name } })"><span class="no num">{{ i + 1 }}</span><span class="nm">{{ t.name }}</span><i :style="{ width: `${(t.count / (topTowns[0]?.count || 1)) * 100}%` }" :class="t.level || ''" /><b class="num">{{ t.count }}</b></li></ol>
          </aside>
        </div>
      </UiCard>
      <div class="side">
        <UiCard class="b-todo" :icon="ClipboardList" title="我的待办" flush>
          <template #extra><RouterLink to="/home/tasks" class="more">全部 <ArrowUpRight :size="13" /></RouterLink></template>
          <UiEmpty v-if="!todo.length" title="暂无待办" />
          <ul class="list"><li v-for="t in todo" :key="t.id"><RouterLink :to="`/home/tasks?id=${t.id}`"><RiskBadge :level="t.level" /><div><strong>{{ t.title }}</strong><small>{{ moduleOf(t.module)?.short }} · {{ t.assignee }}</small></div><UiTag :tone="t.deadline < today() ? 'red' : 'gray'" size="sm">{{ t.deadline < today() ? '已超期' : t.deadline.slice(5) }}</UiTag></RouterLink></li></ul>
        </UiCard>
        <UiCard class="dist" title="风险领域分布">
          <DonutChart :items="risk.byDomain" center-label="疑点总数" :size="130" @select="router.push('/supervision/riskmap?dim=domain')" />
        </UiCard>
      </div>
    </div>

    <UiCard class="life" title="线索全生命周期" subtitle="从信访受理到以案促改，各环节数据实时汇总，点击进入对应功能">
      <ol class="stages">
        <li v-for="(st, i) in lifecycle" :key="st.label">
          <RouterLink :to="st.to">
            <span class="si"><component :is="st.icon" :size="18" /></span>
            <small class="sn num">{{ String(i + 1).padStart(2, '0') }}</small>
            <strong>{{ st.label }}</strong>
            <b class="num">{{ st.value }}<em>{{ st.unit }}</em></b>
            <span class="sd">{{ st.note }}</span>
          </RouterLink>
        </li>
      </ol>
    </UiCard>

    <div class="row-b">
      <UiCard title="线索与任务趋势" subtitle="近 8 周，含已办结归档，按业务日期统计">
        <LineChart :labels="weeks.map(w => w.slice(5))" :series="trend" :height="190" unit=" 条" />
      </UiCard>
      <UiCard class="b-clue" :icon="Star" title="高价值线索" flush>
        <template #extra><RouterLink to="/clues/grading" class="more">初筛 <ArrowUpRight :size="13" /></RouterLink></template>
        <ul class="list"><li v-for="c in highValue" :key="c.id"><RouterLink :to="`/clues/ledger?id=${c.id}`"><span class="num cid">{{ c.id.slice(-4) }}</span><div><strong>{{ c.parsed.fields.accused.value }} · {{ c.parsed.fields.issue.value }}</strong><small>{{ c.townName }}{{ c.village }} · {{ c.channel }}</small></div><UiTag :tone="c.dl.state === '已超期' ? 'red' : 'gray'" size="sm">{{ c.dl.state }}</UiTag></RouterLink></li></ul>
      </UiCard>
      <UiCard class="b-log" :icon="Activity" title="最新动态" flush>
        <ul class="log"><li v-for="a in system.audit.slice(0, 6)" :key="a.id"><i /><div><strong>{{ a.user }} {{ a.action }} · {{ showCode(a.target) }}</strong><small>{{ a.detail }}</small></div><time class="num">{{ a.time.slice(11) || a.time.slice(5) }}</time></li></ul>
      </UiCard>
    </div>
  </div>
</template>
<style scoped>
.entering>*:not(.enter-veil){animation:enter .7s var(--ease) both}
.entering>*:nth-child(2){animation-delay:.18s}
.entering>*:nth-child(3){animation-delay:.3s}
.entering>*:nth-child(4){animation-delay:.42s}
.entering>*:nth-child(5){animation-delay:.52s}
.entering .kpi{animation:enter .6s var(--ease) both}
.entering .kpi:nth-child(1){animation-delay:.3s}.entering .kpi:nth-child(2){animation-delay:.38s}.entering .kpi:nth-child(3){animation-delay:.46s}.entering .kpi:nth-child(4){animation-delay:.54s}
.enter-veil{position:fixed;inset:0;z-index:500;display:grid;place-items:center;background:var(--brand-grad);pointer-events:none;animation:veil .7s .05s var(--ease) forwards}
.enter-veil svg{animation:veilmark .5s var(--ease) forwards}
@keyframes enter{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes veil{to{opacity:0;visibility:hidden}}
@keyframes veilmark{to{opacity:0;transform:scale(1.15)}}
@media(prefers-reduced-motion:reduce){.entering>*,.entering .kpi,.enter-veil{animation:none}.enter-veil{display:none}}
.cmd{position:relative;overflow:hidden;border-radius:var(--r-lg);background:var(--brand-grad);color:var(--on-brand);box-shadow:var(--shadow-red)}
.cmd::before,.cmd::after{content:"";position:absolute;border-radius:50%;pointer-events:none;border:1px solid rgba(255,255,255,.13)}
.cmd::before{width:460px;height:460px;right:-120px;top:-220px;box-shadow:0 0 0 50px rgba(255,255,255,.035),0 0 0 100px rgba(255,255,255,.025)}
.cmd::after{width:200px;height:200px;left:30%;bottom:-150px}
.cmd-main{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);gap:20px 28px;padding:24px 28px 20px;align-items:center}
.cmd-hi h2{font-size:26px;font-weight:700;letter-spacing:.04em;line-height:1.3}
.cmd-hi>p{font-size:13.5px;opacity:.94;margin-top:2px}
.alerts{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.alert{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:15px;font-size:13px;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);transition:background var(--dur)}
.alert:hover{background:rgba(255,255,255,.24)}
.alert b{font-size:16px;color:var(--brand-accent-ink)}
.quick{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.qa{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:9px;font-size:14px;font-weight:500;color:var(--on-brand);background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.28);transition:background var(--dur)}
.qa:hover{background:rgba(255,255,255,.2)}
.qa.primary{background:var(--ai-btn-bg);color:var(--ai-btn-ink);box-shadow:var(--ai-btn-shadow);font-weight:600}
.qa.primary:hover{filter:brightness(1.05)}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.kpi{display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);transition:background var(--dur),transform var(--dur)}
.kpi:hover{background:rgba(255,255,255,.18);transform:translateY(-2px)}
.ki{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.16);color:var(--brand-accent-ink);margin-bottom:6px}
.kl{font-size:13px;opacity:.95;white-space:nowrap}
.kpi strong{font-size:36px;line-height:1.1;font-weight:700;color:#fff}
.kpi strong small{font-size:13px;font-weight:500;opacity:.95;margin-left:3px;font-family:var(--font)}
.kh{font-size:12px;opacity:.95;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ai-strip{position:relative;z-index:1;display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px;padding:10px 28px;font-size:13px;background:rgba(0,0,0,.14);border-top:1px solid rgba(255,255,255,.12)}
.ai-strip>i{width:1px;height:12px;background:rgba(255,255,255,.25)}
.ai-strip b{font-size:16px;color:var(--brand-accent-ink);margin-left:2px}
.ai-tag{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--brand-accent-ink)}
.save{margin-left:auto}
.save small{font-size:11.5px;opacity:.94;margin-left:2px}
.row-a{display:grid;grid-template-columns:minmax(0,2fr) minmax(300px,1fr);gap:16px}
.side{display:flex;flex-direction:column;gap:16px;min-width:0}
.dist{flex:1}
.dist :deep(.ui-card-body){display:flex;align-items:center}
.dist :deep(.ui-card-body)>*{flex:1}
.row-b{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.stages{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));position:relative}
.stages::before{content:"";position:absolute;left:7%;right:7%;top:21px;height:2px;background:linear-gradient(90deg,var(--red-line),var(--gold-line))}
.stages a{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:0 4px 4px;border-radius:10px;transition:background var(--dur)}
.stages a:hover{background:var(--red-25)}
.si{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--red);box-shadow:0 0 0 2px var(--red-line),var(--shadow-1);margin-bottom:6px;transition:background var(--dur),color var(--dur)}
.stages a:hover .si{background:var(--red);color:var(--on-brand)}
.sn{font-size:11px;color:var(--text-4)}
.stages strong{font-size:14px;font-weight:600}
.stages b{font-size:22px;line-height:1.2;color:var(--red);font-weight:700}
.stages em{font-style:normal;font-size:12px;color:var(--text-3);margin-left:2px;font-family:var(--font)}
.sd{font-size:12px;color:var(--text-3)}
.map-wrap{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:16px;align-items:center}
.map-side{display:flex;flex-direction:column;gap:12px}
.ms-total{padding:14px;border-radius:12px;background:var(--brand-grad);color:var(--brand-accent-ink);box-shadow:var(--shadow-red)}
.ms-total span{font-size:12px;opacity:.94}
.ms-total strong{display:block;font-size:34px;line-height:1.1;color:#fff}
.ms-levels{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.ms-levels div{padding:8px 4px;border-radius:9px;text-align:center}
.ms-levels b{display:block;font-size:20px;line-height:1.2}
.ms-levels span{font-size:11px}
.ms-levels .h{background:var(--risk-high-bg);color:var(--risk-high)}.ms-levels .m{background:var(--risk-mid-bg);color:var(--risk-mid)}.ms-levels .l{background:var(--risk-low-bg);color:var(--risk-low)}
.map-side h5{font-size:12px;color:var(--text-3);font-weight:500}
.ms-rank{display:flex;flex-direction:column;gap:7px}
.ms-rank li{display:grid;grid-template-columns:18px 66px 1fr 22px;align-items:center;gap:6px;font-size:13px;cursor:pointer}
.ms-rank .no{width:18px;height:18px;border-radius:5px;background:var(--surface-3);font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:700}
.ms-rank li:nth-child(-n+3) .no{background:var(--red);color:#fff}
.ms-rank i{height:6px;border-radius:3px;background:#E5B53A}
.ms-rank i.high{background:var(--risk-high)}.ms-rank i.mid{background:#E07B2A}
.ms-rank b{text-align:right;font-weight:700}
.ms-rank .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12.5px}
.more{display:inline-flex;align-items:center;gap:2px;font-size:13px;color:var(--red)}
.list{padding:6px 8px}
.list a{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px}
.list a:hover{background:var(--red-25)}
.list div{flex:1;min-width:0}
.list strong{display:block;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.list small{font-size:12px;color:var(--text-3)}
.cid{width:38px;height:28px;border-radius:7px;background:var(--red-50);color:var(--red);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.log{padding:8px 18px 12px}
.log li{display:flex;gap:10px;padding:7px 0;position:relative}
.log li:not(:last-child)::before{content:"";position:absolute;left:4px;top:20px;bottom:-6px;width:1px;background:var(--line)}
.log i{width:9px;height:9px;border-radius:50%;margin-top:6px;background:var(--surface);box-shadow:inset 0 0 0 2px var(--red);flex:none}
.log div{flex:1;min-width:0}
.log strong{display:block;font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.log small{display:block;font-size:12px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.log time{font-size:12px;color:var(--text-4)}
@media(max-width:1300px){.cmd-main,.row-a{grid-template-columns:1fr}.row-b{grid-template-columns:1fr 1fr}}
@media(max-width:1500px){.map-wrap{grid-template-columns:minmax(0,1fr) 170px}}
</style>
