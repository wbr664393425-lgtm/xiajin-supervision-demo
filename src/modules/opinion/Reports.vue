<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  FileText, Printer, Download, Copy, Sparkles, Maximize2, Minimize2,
  TrendingUp, Table2, Eye, Plus, BookmarkCheck, Link2, ShieldAlert,
} from 'lucide-vue-next'
import { UiButton, UiTag, RiskBadge, AiNotice } from '@/design/ui'
import LineChart from '@/charts/LineChart.vue'
import BarList from '@/charts/BarList.vue'
import OpinionEvidenceDrawer from './components/OpinionEvidenceDrawer.vue'
import DispositionModal from './components/DispositionModal.vue'
import { useOpinionStore } from '@/stores/opinion'
import { useAssistantStore } from '@/stores/assistant'
import { useSystemStore } from '@/stores/system'
import { opinionReportPrompt, type OpinionReport, type ReportKind } from '@/engines/opinion'
import { SYSTEM_PROMPT, boundaryCheck, stripMarkdown } from '@/engines/prompts'
import { streamChat } from '@/app/llm'
import { downloadText } from '@/app/download'
import { presenting, setPresenting } from '@/app/opinionBus'
import { toast } from '@/app/toast'

const route = useRoute()
const store = useOpinionStore()
const assistant = useAssistantStore()
const system = useSystemStore()

const selectedId = ref<string>(store.presetReports[0]!.id)
const chartMode = ref<'chart' | 'table'>('chart')
const polishing = ref(false)
const drawerOpen = ref(false)
const drawerPostId = ref<string | null>(null)
const disposeOpen = ref(false)
const disposeTopicId = ref<string | null>(null)

watch(() => route.query.kind, k => {
  if (!k) return
  const target = store.presetReports.find(r => r.kind === String(k))
  if (target) selectedId.value = target.id
}, { immediate: true })

const report = computed<OpinionReport>(() =>
  store.allReports.find(r => r.id === selectedId.value) || store.presetReports[0]!,
)

const kindLabel: Record<ReportKind, string> = {
  weekly: '周期周报',
  campaign: '专项快报',
  clarify: '澄清建议',
}

const trendSeries = computed(() => [
  { name: '公开帖文量', color: 'var(--chart-1)', values: report.value.trendValues },
])

const categoryBars = computed(() => {
  const total = Math.max(1, report.value.categoryDist.reduce((s, x) => s + x.value, 0))
  return report.value.categoryDist.map(c => ({
    ...c,
    hint: `占本期公开信息 ${Math.round((c.value / total) * 100)}%`,
  }))
})

function createArchive(kind: ReportKind) {
  const archived = store.snapshotReport(kind)
  selectedId.value = archived.id
  toast(`已按当前最新研判状态生成冻结存档专报（${archived.id}）`, 'ok')
}

async function polishReport() {
  if (polishing.value) return
  polishing.value = true
  const cur = report.value
  let out = ''
  let engineName = '离线规则模板'
  if (assistant.engine === 'deepseek' && assistant.configured && assistant.status !== 'offline') {
    try {
      for await (const chunk of streamChat([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: opinionReportPrompt(cur) },
      ], { maxTokens: 1600 })) {
        if (chunk.type === 'content') {
          out = stripMarkdown(out + chunk.text)
          store.saveReportLlmDraft(cur.id, out)
        }
      }
      if (out.trim()) { engineName = '纪检大模型'; assistant.status = 'online' }
      else assistant.status = 'offline'
    } catch {
      assistant.status = 'offline'
    }
  }
  if (!out.trim()) {
    await new Promise(r => setTimeout(r, 450))
    out = [
      '一、总体态势',
      cur.conclusions.join(''),
      '',
      '二、重点苗头研判',
      ...cur.events.map(e => `[${e.n}] ${e.title}（${e.townText}，当前状态：${e.statusText}）：${e.summary}`),
      '',
      '三、工作建议',
      ...cur.recommendations.map((r, i) => `${i + 1}. ${r}`),
      '',
      '四、使用提醒',
      '本稿为系统智能辅助润色初稿，严格保留网传与群众反映的“待核实”事实边界，不构成违纪定性或处置意见，须经人工审核定稿。',
    ].join('\n')
  }
  const hits = boundaryCheck(out)
  if (hits.length) {
    out += `\n\n【边界自检提醒】检测到疑似定性/量纪表述（${hits.join('、')}），请人工核删后再呈报。`
  }
  store.saveReportLlmDraft(cur.id, out)
  system.log('opinion', '生成', cur.title, `${engineName}完成专报文字润色初稿`)
  toast(`${engineName}已生成专报润色初稿`, 'ok')
  polishing.value = false
}

async function copyMarkdown() {
  const txt = report.value.llmDraft
    ? `${report.value.markdown}\n\n## 附：智能辅助润色稿\n${report.value.llmDraft}`
    : report.value.markdown
  try {
    await navigator.clipboard.writeText(txt)
    toast('已复制专报完整文本到剪贴板', 'ok')
  } catch {
    toast('复制失败，请使用下载 Markdown 导出', 'warn')
  }
}

function downloadMd() {
  const txt = report.value.llmDraft
    ? `${report.value.markdown}\n\n## 附：智能辅助润色稿\n${report.value.llmDraft}`
    : report.value.markdown
  downloadText(`${report.value.title}-${report.value.id}.md`, txt, 'text/markdown;charset=utf-8')
  system.log('opinion', '导出', report.value.title, '导出 Markdown 专报')
}

function printReport() {
  system.log('opinion', '导出', report.value.title, '调用专版打印 / 另存 PDF')
  window.print()
}

function openRefPost(postId: string) {
  drawerPostId.value = postId
  drawerOpen.value = true
}
</script>

<template>
  <div class="rep-layout">
    <!-- 左侧专报清单与冻结生成区（打印时自动隐藏） -->
    <aside class="rep-aside no-print">
      <div class="ra-head">
        <strong>实时同步模板</strong>
        <small>随处置状态实时更新</small>
      </div>
      <div class="ra-list">
        <button
          v-for="r in store.presetReports"
          :key="r.id"
          type="button"
          class="ra-item"
          :class="{ on: report.id === r.id }"
          @click="selectedId = r.id"
        >
          <div class="rai-top">
            <UiTag size="sm" :tone="r.kind === 'clarify' ? 'green' : r.kind === 'campaign' ? 'orange' : 'red'">{{ kindLabel[r.kind] }}</UiTag>
            <span class="num">{{ r.events.length }} 项事件</span>
          </div>
          <strong>{{ r.title }}</strong>
          <small class="num">{{ r.period }}</small>
        </button>
      </div>

      <div class="ra-gen">
        <span>按当前最新研判状态冻结存档：</span>
        <div class="ra-gen-btns">
          <UiButton size="sm" variant="soft" :icon="Plus" @click="createArchive('weekly')">周报</UiButton>
          <UiButton size="sm" variant="secondary" :icon="Plus" @click="createArchive('campaign')">快报</UiButton>
          <UiButton size="sm" variant="secondary" :icon="Plus" @click="createArchive('clarify')">澄清</UiButton>
        </div>
      </div>

      <template v-if="store.savedReports.length">
        <div class="ra-head mt">
          <strong>已冻结历史存档</strong>
          <small class="num">{{ store.savedReports.length }} 份</small>
        </div>
        <div class="ra-list">
          <button
            v-for="r in store.savedReports"
            :key="r.id"
            type="button"
            class="ra-item"
            :class="{ on: report.id === r.id }"
            @click="selectedId = r.id"
          >
            <div class="rai-top">
              <UiTag size="sm" tone="gray" :icon="BookmarkCheck">冻结存档</UiTag>
              <span class="num">{{ r.generatedAt.slice(5) }}</span>
            </div>
            <strong>{{ r.title }}</strong>
            <small class="num">{{ r.id }}</small>
          </button>
        </div>
      </template>
    </aside>

    <!-- 右侧交互式专报预览（支持站内回链与打印专版） -->
    <section class="rep-main">
      <div class="rep-toolbar no-print">
        <div class="rt-l">
          <UiTag tone="gold" size="sm">{{ kindLabel[report.kind] }}</UiTag>
          <span class="num rt-meta">{{ report.id }} · {{ report.generatedAt.slice(5) }}</span>
        </div>
        <div class="rt-r">
          <UiButton size="sm" variant="soft" :icon="Sparkles" :loading="polishing" @click="polishReport">智能润色</UiButton>
          <UiButton size="sm" variant="secondary" :icon="Copy" @click="copyMarkdown">复制</UiButton>
          <UiButton size="sm" variant="secondary" :icon="Download" @click="downloadMd">导出</UiButton>
          <UiButton size="sm" variant="primary" :icon="Printer" @click="printReport">打印 / PDF</UiButton>
          <UiButton size="sm" variant="ghost" :icon="presenting ? Minimize2 : Maximize2" @click="setPresenting(!presenting)">
            {{ presenting ? '退出全屏' : '全屏' }}
          </UiButton>
        </div>
      </div>

      <article class="rep-sheet" data-wm="演示样例 · 非正式公文">
        <header class="rs-head">
          <div class="rs-kicker">夏津县纪检监察涉纪舆情研判专报（演示样例）</div>
          <h2>{{ report.title }}</h2>
          <p class="rs-sub">{{ report.subtitle }}</p>
          <div class="rs-meta num">
            <span>统计周期：{{ report.period }}</span>
            <span>生成时间：{{ report.generatedAt }}</span>
            <span>仅限内部研判参考 · 须人工审核定稿</span>
          </div>
        </header>

        <!-- 结论前置 4 数字卡 -->
        <section class="rs-sec">
          <h3>一、本期关键读数与态势结论</h3>
          <div class="rs-kpis">
            <div v-for="(k, idx) in report.kpis" :key="k.label" class="rsk" :class="{ accent: idx === 1 }">
              <span>{{ k.label }}</span>
              <strong class="num">{{ k.value }}<small>{{ k.unit }}</small></strong>
              <em>{{ k.hint }}</em>
            </div>
          </div>
          <ol class="rs-conclusions">
            <li v-for="(c, i) in report.conclusions" :key="i">{{ c }}</li>
          </ol>
        </section>

        <!-- 自动图表化区（支持图表 / 原数据表一键切换） -->
        <section class="rs-sec">
          <div class="rs-sec-head">
            <h3>二、声量走势与领域分布</h3>
            <div class="sw no-print">
              <button type="button" :class="{ on: chartMode === 'chart' }" @click="chartMode = 'chart'"><TrendingUp :size="13" />可视化图表</button>
              <button type="button" :class="{ on: chartMode === 'table' }" @click="chartMode = 'table'"><Table2 :size="13" />原始数据表</button>
            </div>
          </div>

          <div v-if="chartMode === 'chart'" class="rs-charts">
            <div class="rsc-box">
              <h4>近 14 日公开信息走势</h4>
              <LineChart :labels="report.trendLabels" :series="trendSeries" :height="175" unit=" 条" />
            </div>
            <div class="rsc-box">
              <h4>监督领域与占比分布</h4>
              <BarList :items="categoryBars" unit=" 条" />
            </div>
          </div>

          <div v-else class="tbl-wrap">
            <table class="tbl compact">
              <thead><tr><th>监督领域</th><th class="r">近 14 日公开帖文数</th><th class="r">占比</th></tr></thead>
              <tbody>
                <tr v-for="c in report.categoryDist" :key="c.label">
                  <td>{{ c.label }}</td>
                  <td class="num r"><b>{{ c.value }}</b> 条</td>
                  <td class="num r">{{ Math.round((c.value / Math.max(1, report.categoryDist.reduce((s, x) => s + x.value, 0))) * 100) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- 重点事件卡片 + 站内证据抽屉直达回链 -->
        <section class="rs-sec">
          <h3>三、重点关注事件与证据溯源（点击编号直查站内原文快照）</h3>
          <div class="rs-events">
            <div v-for="e in report.events" :key="e.topicId" class="rse">
              <div class="rse-top">
                <button type="button" class="cite-no num no-print" title="点击打开站内证据抽屉" @click="openRefPost(e.postId)">[{{ e.n }}]</button>
                <span class="cite-print num">[{{ e.n }}]</span>
                <RiskBadge v-if="e.level !== 'info'" :level="e.level" />
                <UiTag v-else tone="gray" size="sm">日常参考</UiTag>
                <strong>{{ e.title }}</strong>
                <UiTag tone="gold" size="sm">{{ e.category }}</UiTag>
                <span class="rse-town">{{ e.townText }}</span>
              </div>
              <p class="rse-sum">{{ e.summary }}</p>
              <div class="rse-foot">
                <span>首发渠道：{{ e.sourceShort }}</span>
                <span v-if="e.evidenceStatus !== '原帖在架'" class="rse-warn"><ShieldAlert :size="12" />{{ e.evidenceStatus }}</span>
                <span v-if="e.crossCount" class="rse-cross"><Link2 :size="12" />跨库印证 {{ e.crossCount }} 项</span>
                <span>当前状态：<b>{{ e.statusText }}</b></span>
                <button type="button" class="rse-open no-print" @click="openRefPost(e.postId)">
                  <Eye :size="13" />查看站内证据快照
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- 监督工作建议 -->
        <section class="rs-sec">
          <h3>四、监督工作建议</h3>
          <ol class="rs-rec">
            <li v-for="(rec, i) in report.recommendations" :key="i">{{ rec }}</li>
          </ol>
        </section>

        <!-- 可选智能辅助润色稿 -->
        <section v-if="report.llmDraft" class="rs-sec llm-sec">
          <h3><Sparkles :size="15" /> 附：智能辅助润色初稿（仅供人工审改参考）</h3>
          <pre class="llm-pre">{{ report.llmDraft }}</pre>
        </section>

        <AiNotice text="演示样例 · 非正式公文。本专报由系统汇总公开信息自动生成，不构成事实认定、违纪定性或处置决定，呈报前须经人工审核定稿。" />
      </article>
    </section>

    <OpinionEvidenceDrawer
      v-model="drawerOpen"
      :post-id="drawerPostId"
      @update:post-id="drawerPostId = $event"
      @dispose="id => { drawerOpen = false; disposeTopicId = id; disposeOpen = true }"
    />
    <DispositionModal v-model="disposeOpen" :topic-id="disposeTopicId" />
  </div>
</template>

<style scoped>
.rep-layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:16px;align-items:start}
.rep-aside{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-md);padding:14px;box-shadow:var(--shadow-1);display:flex;flex-direction:column;gap:10px;position:sticky;top:calc(var(--header-h) + 14px)}
.ra-head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid var(--line)}
.ra-head strong{font-size:14px;color:var(--text)}
.ra-head small{font-size:12px;color:var(--text-3)}
.ra-head.mt{margin-top:6px}
.ra-list{display:flex;flex-direction:column;gap:6px}
.ra-item{text-align:left;padding:10px 11px;border-radius:9px;border:1px solid var(--line);background:var(--surface-2);display:flex;flex-direction:column;gap:4px;transition:border-color var(--dur),background var(--dur)}
.ra-item:hover{border-color:var(--red-line)}
.ra-item.on{border-color:var(--red-line);background:var(--red-25);box-shadow:inset 3px 0 0 var(--red)}
.rai-top{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-3)}
.ra-item strong{font-size:13px;line-height:1.45;color:var(--text)}
.ra-item small{font-size:12px;color:var(--text-3)}

.ra-gen{padding:10px;border-radius:9px;background:var(--cream);border:1px solid var(--gold-line);display:flex;flex-direction:column;gap:8px}
.ra-gen span{font-size:12px;color:var(--accent-ink-2);font-weight:600}
.ra-gen-btns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.ra-gen-btns :deep(.ui-btn){width:100%;padding:0 6px}

.rep-main{display:flex;flex-direction:column;gap:12px;min-width:0}
.rep-toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-md);padding:10px 14px;box-shadow:var(--shadow-1)}
.rt-l,.rt-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rt-meta{font-size:12.5px;color:var(--text-3)}

.rep-sheet{position:relative;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-md);padding:26px 30px;box-shadow:var(--shadow-1);display:flex;flex-direction:column;gap:22px;overflow:hidden}
.rep-sheet::after{content:attr(data-wm);position:absolute;right:24px;top:18px;font-size:12px;font-weight:600;color:var(--text-4);opacity:.45;border:1px dashed var(--line-2);padding:2px 10px;border-radius:6px;pointer-events:none}

.rs-head{text-align:center;padding-bottom:16px;border-bottom:2px solid var(--red)}
.rs-kicker{font-size:12.5px;color:var(--red);font-weight:600;letter-spacing:.12em;margin-bottom:6px}
.rs-head h2{font-family:var(--font-serif);font-size:23px;font-weight:700;color:var(--text);line-height:1.35}
.rs-sub{font-size:13.5px;color:var(--text-3);margin-top:6px}
.rs-meta{display:flex;justify-content:center;flex-wrap:wrap;gap:16px;margin-top:10px;font-size:12px;color:var(--text-3)}

.rs-sec{display:flex;flex-direction:column;gap:12px}
.rs-sec h3{font-size:15.5px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px;padding-left:10px;border-left:3px solid var(--red)}
.rs-sec-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.sw{display:inline-flex;gap:3px;padding:2px;background:var(--surface-3);border-radius:8px}
.sw button{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 10px;border-radius:6px;font-size:12px;color:var(--text-2)}
.sw button.on{background:var(--surface);color:var(--red);font-weight:600;box-shadow:var(--shadow-1)}

.rs-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.rsk{padding:12px 14px;border-radius:9px;background:var(--surface-2);border:1px solid var(--line);display:flex;flex-direction:column;gap:2px}
.rsk span{font-size:12px;color:var(--text-3)}
.rsk strong{font-size:22px;color:var(--text)}
.rsk.accent strong{color:var(--red)}
.rsk strong small{font-size:12px;color:var(--text-3);margin-left:3px;font-weight:400}
.rsk em{font-style:normal;font-size:12px;color:var(--text-3)}

.rs-conclusions,.rs-rec{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:7px;font-size:14px;line-height:1.75;color:var(--text)}
.rs-charts{display:grid;grid-template-columns:1.06fr 1fr;gap:14px}
.rsc-box{padding:14px 16px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2)}
.rsc-box h4{font-size:13.5px;font-weight:600;color:var(--text);margin-bottom:10px}

.rs-events{display:flex;flex-direction:column;gap:10px}
.rse{padding:13px 15px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);display:flex;flex-direction:column;gap:7px}
.rse-top{display:flex;align-items:center;flex-wrap:wrap;gap:7px}
.cite-no{padding:1px 7px;border-radius:5px;background:var(--red-50);color:var(--red);font-size:12.5px;font-weight:700}
.cite-no:hover{background:var(--red);color:var(--on-brand)}
.cite-print{display:none;font-weight:700;color:var(--red)}
.rse-top strong{font-size:14.5px;color:var(--text)}
.rse-town{margin-left:auto;font-size:12px;color:var(--text-3)}
.rse-sum{font-size:13.5px;line-height:1.65;color:var(--text-2)}
.rse-foot{display:flex;align-items:center;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--text-3);padding-top:6px;border-top:1px dashed var(--line)}
.rse-warn{display:inline-flex;align-items:center;gap:4px;color:var(--risk-high);font-weight:600}
.rse-cross{display:inline-flex;align-items:center;gap:4px;color:var(--ai);font-weight:600}
.rse-open{margin-left:auto;display:inline-flex;align-items:center;gap:4px;color:var(--red);font-weight:600;font-size:12.5px}
.rse-open:hover{text-decoration:underline}

.llm-sec{padding:16px;border-radius:10px;background:var(--ai-bg);border:1px solid var(--ai-line)}
.llm-pre{white-space:pre-wrap;font-size:14px;line-height:1.85;color:var(--text);margin:0}
.tbl.compact th,.tbl.compact td{padding:7px 10px;font-size:13px}

@media(max-width:1100px){
  .rep-layout{grid-template-columns:1fr}
  .rep-aside{position:static}
  .rs-kpis{grid-template-columns:1fr 1fr}
  .rs-charts{grid-template-columns:1fr}
}
@media print{
  .no-print{display:none !important}
  .rep-layout{display:block !important}
  .rep-sheet{border:none !important;box-shadow:none !important;padding:0 !important}
  .cite-print{display:inline !important}
}
</style>
