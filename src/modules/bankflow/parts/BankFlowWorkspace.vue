<script setup lang="ts">
import { computed, onActivated, onDeactivated, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight,
  Download, FileSpreadsheet, Filter, Landmark, ListFilter, Network, RotateCcw,
  Scale, Search, Siren, SlidersHorizontal, Sparkles, UploadCloud, Users, Workflow,
} from 'lucide-vue-next'
import {
  AiNotice, RiskBadge, UiButton, UiCard, UiEmpty, UiModal, UiSelect, UiStat, UiTabs, UiTag,
} from '@/design/ui'
import FundFlowGraph from '@/charts/FundFlowGraph.vue'
import DateRangePicker from './DateRangePicker.vue'
import BankFlowImportModal from './BankFlowImportModal.vue'
import BankFlowDrawer from './BankFlowDrawer.vue'
import BankFlowAgentCard from './BankFlowAgentCard.vue'
import {
  ALERT_RULE_META, ALERT_RULE_ORDER, analyzeTransactions, computeOverview, fmtWanNumber,
  summarizeCounterparties, type AlertRuleKey, type BankBatch, type EnrichedTransaction, type ReviewStatus,
} from '@/engines/bankflow'
import type { BankAgentMode } from '@/engines/bankflow-agent'
import { downloadXlsx } from '@/engines/bankflow-xlsx'
import { requestDossier } from '@/app/useDossierAgent'
import { useBankFlowStore } from '@/stores/bankflow'
import { useSystemStore } from '@/stores/system'
import { today } from '@/stores/persist'
import { toast } from '@/app/toast'

const props = withDefaults(defineProps<{ section?: 'hub' | 'batches' | 'graph' | 'ledger' | 'agent' }>(), { section: 'hub' })

const store = useBankFlowStore()
const system = useSystemStore()
const route = useRoute()
const router = useRouter()

// hub 模式保留原两态；拆分后的独立子页模式由 section 决定展示区块
const inWorkspace = ref(props.section !== 'hub' && props.section !== 'batches')
const isSubpage = computed(() => props.section !== 'hub')
const showBatches = computed(() => props.section === 'batches' || (props.section === 'hub' && !inWorkspace.value))
const showGraphBlock = computed(() => props.section === 'graph' || (props.section === 'hub' && inWorkspace.value))
const showLedgerBlock = computed(() => props.section === 'ledger' || (props.section === 'hub' && inWorkspace.value))
const showAgentPage = computed(() => props.section === 'agent')
const batchSearch = ref('')

// 单案工作台视角、智能体展开与弹窗状态
const workspaceTab = ref<'split' | 'alerts' | 'counterparties'>('split')
const graphTab = ref<'graph' | 'counterparties'>('graph')
const ledgerTab = ref<'all' | 'alerts'>('all')
const graphScope = ref<'all' | 'alert'>('all')
const agentOpen = ref(props.section === 'agent')
const agentMode = ref<BankAgentMode>('chain')
const agentAutoRunKey = ref(0)
const importOpen = ref(false)
const configOpen = ref(false)
const cleanDetailOpen = ref(false)

// 右侧核查抽屉状态
const drawerOpen = ref(false)
const drawerMode = ref<'tx' | 'counterparty'>('tx')
const selectedTxId = ref<string | null>(null)
const selectedCounterparty = ref('')
const drawerDirFilter = ref<'' | 'in' | 'out'>('')

// 检索与分页状态
const filter = reactive({
  startDate: '',
  endDate: '',
  counterparty: '',
  direction: '' as '' | 'in' | 'out',
  minAmount: '',
  maxAmount: '',
  summary: '',
  rule: '' as '' | AlertRuleKey | 'any_alert',
  reviewStatus: '' as '' | ReviewStatus,
  sortBy: 'time_desc' as 'time_desc' | 'time_asc' | 'amount_desc' | 'amount_asc',
})
const page = ref(1)
const pageSize = ref('10')

// 批次列表卡片汇总（用于在首屏快速决策要看哪个案子）
const batchCards = computed(() => {
  const q = batchSearch.value.trim().toLowerCase()
  return store.batches
    .filter(b => !q || `${b.name} ${b.subjectName} ${b.subjectUnit} ${b.cleanSummary.banks.join(' ')}`.toLowerCase().includes(q))
    .map(b => {
      const ov = computeOverview(analyzeTransactions(b.transactions, store.ruleConfig, store.decisions))
      return { batch: b, overview: ov }
    })
})

const batchOptions = computed(() =>
  store.batches.map(b => ({
    value: b.id,
    label: b.name,
    hint: `${b.subjectName} · ${b.transactions.length} 笔 · ${b.cleanSummary.banks.join(' / ')}`,
  })),
)

const currentBatch = computed(() => store.currentBatch)
const overview = computed(() => store.overview)

const graphCounterparties = computed(() => {
  const list = store.counterparties
  return graphScope.value === 'alert' ? list.filter(c => c.alertCount > 0) : list
})

const topCounterparties = computed(() => store.counterparties.slice(0, 12))

function parseNumText(raw: unknown): number | null {
  const s = String(raw ?? '').trim().replace(/,/g, '')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// 主表过滤与排序
const filteredRows = computed<EnrichedTransaction[]>(() => {
  const minA = parseNumText(filter.minAmount)
  const maxA = parseNumText(filter.maxAmount)
  const cpQ = filter.counterparty.trim().toLowerCase()
  const sumQ = filter.summary.trim().toLowerCase()

  const list = store.analyzed.filter(t => {
    const onlyAlerts = props.section === 'ledger' ? ledgerTab.value === 'alerts' : workspaceTab.value === 'alerts'
    if (onlyAlerts && !t.alerts.length) return false
    const day = t.time.slice(0, 10)
    if (filter.startDate && day < filter.startDate) return false
    if (filter.endDate && day > filter.endDate) return false
    if (cpQ && !`${t.counterparty} ${t.counterpartyAccount}`.toLowerCase().includes(cpQ)) return false
    if (filter.direction && t.direction !== filter.direction) return false
    if (minA !== null && t.amount < minA) return false
    if (maxA !== null && t.amount > maxA) return false
    if (sumQ && !`${t.summary} ${t.channel} ${t.bank}`.toLowerCase().includes(sumQ)) return false
    if (filter.rule === 'any_alert' && !t.alerts.length) return false
    if (filter.rule && filter.rule !== 'any_alert' && !t.alerts.some(h => h.rule === filter.rule)) return false
    if (filter.reviewStatus && t.reviewStatus !== filter.reviewStatus) return false
    return true
  })

  return [...list].sort((a, b) => {
    if (filter.sortBy === 'time_asc') return a.time.localeCompare(b.time)
    if (filter.sortBy === 'amount_desc') return b.amount - a.amount || b.time.localeCompare(a.time)
    if (filter.sortBy === 'amount_asc') return a.amount - b.amount || b.time.localeCompare(a.time)
    return b.time.localeCompare(a.time)
  })
})

const sizeNum = computed(() => Math.max(5, Number(pageSize.value) || 10))
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / sizeNum.value)))
const pagedRows = computed(() => {
  const start = (page.value - 1) * sizeNum.value
  return filteredRows.value.slice(start, start + sizeNum.value)
})

watch([() => filteredRows.value.length, sizeNum], () => {
  if (page.value > totalPages.value) page.value = totalPages.value
  if (page.value < 1) page.value = 1
})

watch([workspaceTab, ledgerTab], () => { page.value = 1 })

watch(() => store.currentBatchId, () => {
  resetFilters()
  drawerOpen.value = false
  selectedCounterparty.value = ''
  selectedTxId.value = null
})

watch(configOpen, v => { if (!v) store.normalizeRules() })

// KeepAlive 多实例守卫：避免非当前激活子页响应 query 弹出重叠抽屉
let active = true
const myPath = route.path

function syncFromRoute() {
  if (!active) return
  if (props.section !== 'hub' && route.path !== myPath) return
  if (props.section === 'hub' && !route.path.includes('bankflow')) return

  const qBatch = route.query.batch
  const qId = route.query.id
  const qMode = route.query.mode
  const qAutorun = route.query.autorun

  if (qBatch) {
    const bid = String(qBatch)
    if (store.batches.some(b => b.id === bid)) {
      if (bid !== store.currentBatchId) store.selectBatch(bid, true)
      if (props.section === 'hub') inWorkspace.value = true
    }
  }
  if (qId) {
    const txId = String(qId)
    const ownerBatch = store.findBatchByTxId(txId)
    if (ownerBatch) {
      if (ownerBatch.id !== store.currentBatchId) store.selectBatch(ownerBatch.id, true)
      if (props.section === 'hub') inWorkspace.value = true
      selectedTxId.value = txId
      selectedCounterparty.value = ''
      drawerMode.value = 'tx'
      drawerOpen.value = true
    }
  }
  if (props.section === 'agent' && qAutorun === '1') {
    const m = (qMode === 'interview' || qMode === 'semantics' ? qMode : 'chain') as BankAgentMode
    launchAgentAnalysis(m)
    void router.replace({ path: route.path })
  }
}

onActivated(() => { active = true; syncFromRoute() })
onDeactivated(() => {
  active = false
  drawerOpen.value = false
  importOpen.value = false
  configOpen.value = false
  cleanDetailOpen.value = false
})

watch(() => [route.path, route.query.batch, route.query.id, route.query.autorun], syncFromRoute, { immediate: true })

function enterBatch(batchId: string, openAgent = false) {
  store.selectBatch(batchId)
  if (props.section === 'batches') {
    if (openAgent) void router.push({ path: '/bankflow/agent', query: { mode: 'chain', autorun: '1' } })
    else void router.push('/bankflow/graph')
    return
  }
  inWorkspace.value = true
  workspaceTab.value = 'split'
  if (openAgent) {
    launchAgentAnalysis('chain')
  } else {
    agentOpen.value = false
  }
}

function backToBatchList() {
  if (isSubpage.value) {
    void router.push('/bankflow/batches')
    return
  }
  inWorkspace.value = false
  agentOpen.value = false
  drawerOpen.value = false
}

function resetFilters() {
  filter.startDate = ''
  filter.endDate = ''
  filter.counterparty = ''
  filter.direction = ''
  filter.minAmount = ''
  filter.maxAmount = ''
  filter.summary = ''
  filter.rule = ''
  filter.reviewStatus = ''
  filter.sortBy = 'time_desc'
  page.value = 1
}

function toggleRuleEnabled(rule: AlertRuleKey) {
  const next = !store.ruleConfig[rule].enabled
  store.ruleConfig[rule].enabled = next
  if (!next && filter.rule === rule) {
    filter.rule = ''
    page.value = 1
  }
}

function filterByRule(rule: AlertRuleKey) {
  filter.rule = filter.rule === rule ? '' : rule
  if (workspaceTab.value === 'counterparties') workspaceTab.value = 'split'
  page.value = 1
}

function launchAgentAnalysis(mode: BankAgentMode = 'chain') {
  agentMode.value = mode
  agentOpen.value = true
  agentAutoRunKey.value++
}

function openTxDrawer(tx: EnrichedTransaction, keepCounterparty = false) {
  selectedTxId.value = tx.id
  if (!keepCounterparty) selectedCounterparty.value = ''
  drawerMode.value = 'tx'
  drawerOpen.value = true
}

function openTxById(txId: string) {
  selectedTxId.value = txId
  selectedCounterparty.value = ''
  drawerMode.value = 'tx'
  drawerOpen.value = true
}

function openCounterpartyDrawer(name: string, direction?: 'in' | 'out') {
  selectedCounterparty.value = name
  drawerDirFilter.value = direction || ''
  drawerMode.value = 'counterparty'
  drawerOpen.value = true
}

function onSelectTxFromDrawer(id: string) {
  selectedTxId.value = id
  drawerMode.value = 'tx'
  drawerOpen.value = true
}

function onImported(batch: BankBatch) {
  resetFilters()
  selectedCounterparty.value = ''
  if (props.section === 'batches') {
    void router.push('/bankflow/graph')
    return
  }
  inWorkspace.value = true
  agentOpen.value = props.section === 'agent'
  void batch
}

// 一键导出三工作表标准 Excel 核查底稿（统一口径）
function exportWorkbook(scope: 'filtered' | 'all' = 'filtered') {
  if (!system.can('export')) { toast('当前角色无导出权限', 'warn'); return }
  const b = currentBatch.value
  const sourceRows = scope === 'all' ? store.analyzed : filteredRows.value
  const statusLabelFn = (s: ReviewStatus) => ({ pending: '待核实', focus: '重点核查', excluded: '已排除' }[s])
  const dirLabel = (d: 'in' | 'out') => (d === 'in' ? '收入' : '支出')
  const levelLabel = (lv: string | null) => (lv === 'high' ? '红色预警' : lv === 'mid' ? '橙色预警' : lv === 'low' ? '黄色关注' : '正常')

  const detailSheetRows = sourceRows.map(t => [
    t.time,
    t.counterparty,
    t.counterpartyAccount,
    dirLabel(t.direction),
    t.amount,
    t.balance ?? '',
    t.bank,
    t.channel,
    t.summary,
    t.alerts.map(a => a.ruleName).join('、') || '无',
    levelLabel(t.maxLevel),
    statusLabelFn(t.reviewStatus),
    t.reviewNote || '',
  ])

  const alertRows = sourceRows
    .filter(t => t.alerts.length > 0)
    .map(t => [
      t.time,
      t.counterparty,
      t.counterpartyAccount,
      dirLabel(t.direction),
      t.amount,
      t.bank,
      t.summary,
      levelLabel(t.maxLevel),
      t.alerts.map(a => `${a.ruleName}：${a.reason}`).join('；'),
      statusLabelFn(t.reviewStatus),
      t.reviewNote || '',
    ])

  const cpSummaryRows = summarizeCounterparties(sourceRows).map(c => [
    c.name,
    c.relation,
    c.accounts.join('、') || '—',
    c.banks.join('、'),
    c.inCount,
    c.inAmount,
    c.outCount,
    c.outAmount,
    c.netAmount,
    c.totalCount,
    c.alertCount,
    c.alertRules.map(r => ALERT_RULE_META[r].short).join('、') || '无',
    c.focusCount,
  ])

  const fileName = `${b.subjectName}_银行流水核查底稿_${today()}.xlsx`
  downloadXlsx(fileName, [
    {
      name: scope === 'all' ? '全量流水明细' : '筛选流水明细',
      headers: ['交易时间', '对方户名', '对方账号', '借贷方向', '交易金额(元)', '交易后余额(元)', '所属机构', '交易渠道', '交易摘要', '命中预警规则', '风险等级', '核查状态', '核查备注'],
      rows: detailSheetRows,
    },
    {
      name: '异常预警线索清单',
      headers: ['交易时间', '对方户名', '对方账号', '借贷方向', '交易金额(元)', '所属机构', '交易摘要', '预警等级', '预警规则与量化依据', '核查状态', '核查备注'],
      rows: alertRows,
    },
    {
      name: '对手方资金汇总表',
      headers: ['对方户名', '关系分类', '涉及账号', '涉及机构', '转入笔数', '转入总额(元)', '转出笔数', '转出总额(元)', '净差额(元)', '往来总笔数', '预警笔数', '命中预警规则', '重点核查笔数'],
      rows: cpSummaryRows,
    },
  ])
  system.log('bankflow', '导出', fileName, `导出银行流水核查底稿（明细 ${detailSheetRows.length} 笔、异常线索 ${alertRows.length} 笔、对手方 ${cpSummaryRows.length} 户）`)
  toast(`已导出核查底稿（含 3 个工作表，明细 ${detailSheetRows.length} 笔）`, 'ok')
}

function applyRuleConfig() {
  store.normalizeRules()
  configOpen.value = false
  toast('模型阈值已规范应用，预警结果已实时刷新', 'ok')
}

const fmtMoney = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const statusLabel = (s: ReviewStatus) => ({ pending: '待核实', focus: '重点核查', excluded: '已排除' }[s])
const statusTone = (s: ReviewStatus) => ({ pending: 'ai', focus: 'red', excluded: 'gray' }[s] as 'ai' | 'red' | 'gray')
const hasActiveFilter = computed(() =>
  Boolean(filter.startDate || filter.endDate || filter.counterparty || filter.direction || String(filter.minAmount).trim() || String(filter.maxAmount).trim() || filter.summary || filter.rule || filter.reviewStatus),
)
</script>

<template>
  <div class="page">
    <!-- ==================== 视图一：核查批次列表首屏（先选案或新导入，再进入详情） ==================== -->
    <template v-if="showBatches">
      <section class="hub-bar">
        <label class="hub-search">
          <Search :size="15" />
          <input v-model="batchSearch" placeholder="搜索核查批次、被核查对象、单位或银行机构" aria-label="搜索核查批次" />
        </label>
        <span class="muted num">共 {{ batchCards.length }} 个核查批次</span>
        <span class="spacer" />
        <UiButton variant="secondary" :icon="SlidersHorizontal" @click="configOpen = true">异常模型阈值</UiButton>
        <UiButton variant="primary" :icon="UploadCloud" @click="importOpen = true">导入新案银行流水</UiButton>
      </section>

      <UiEmpty v-if="!batchCards.length" title="未找到匹配的核查批次" text="可清空搜索条件，或点击右上角导入新的多银行流水账单">
        <UiButton variant="primary" :icon="UploadCloud" @click="importOpen = true">导入新案银行流水</UiButton>
      </UiEmpty>

      <div v-else class="batch-list">
        <article v-for="{ batch: b, overview: ov } in batchCards" :key="b.id" class="batch-card">
          <div class="bc-head">
            <div class="bc-title">
              <h3>{{ b.name }}</h3>
              <div class="bc-meta">
                <UiTag tone="gold" size="sm">{{ b.subjectName }} · {{ b.subjectUnit }}</UiTag>
                <span class="muted num">流水时段 {{ b.periodStart }} 至 {{ b.periodEnd }}</span>
                <span class="muted">·</span>
                <span class="muted">{{ b.cleanSummary.banks.join('、') }}</span>
              </div>
            </div>
            <div class="bc-ops">
              <UiButton variant="soft" :icon="Sparkles" @click="enterBatch(b.id, true)">智能体解析</UiButton>
              <UiButton variant="primary" :icon="ArrowRight" @click="enterBatch(b.id, false)">进入查账分析</UiButton>
            </div>
          </div>

          <div class="bc-metrics">
            <div>
              <span>总流入 / 总流出</span>
              <strong class="num">
                <em class="txt-in">{{ fmtWanNumber(ov.totalIn) }}</em> / <em class="txt-out">{{ fmtWanNumber(ov.totalOut) }}</em> <small>万元</small>
              </strong>
            </div>
            <div>
              <span>清洗入库 / 去重</span>
              <strong class="num">{{ b.cleanSummary.importedRows }} <small>笔</small> <span class="muted sub">（去重 {{ b.cleanSummary.duplicateRows }}）</span></strong>
            </div>
            <div>
              <span>涉及对手方</span>
              <strong class="num">{{ ov.counterpartyCount }} <small>户</small></strong>
            </div>
            <div>
              <span>命中预警流水</span>
              <strong class="num txt-red">{{ ov.alertTxCount }} <small>条</small> <span class="muted sub">（红警 {{ ov.highAlertCount }} · 重点 {{ ov.focusCount }}）</span></strong>
            </div>
          </div>
        </article>
      </div>
    </template>

    <!-- ==================== 视图二：单案银行流水核查工作台 ==================== -->
    <template v-else>
      <!-- 1. 顶部返回与批次切换条 -->
      <section class="batch-bar">
        <div class="batch-left">
          <UiButton variant="ghost" size="sm" :icon="ArrowLeft" @click="backToBatchList">返回批次列表</UiButton>
          <span class="bar-div" />
          <UiSelect
            :model-value="store.currentBatchId"
            size="sm"
            class="batch-select"
            label="切换核查批次"
            :options="batchOptions"
            @update:model-value="store.selectBatch"
          />
          <UiTag tone="gold" size="sm">{{ currentBatch.subjectName }} · {{ currentBatch.subjectUnit }}</UiTag>
          <button type="button" class="clean-chip" @click="cleanDetailOpen = true">
            <FileSpreadsheet :size="13" />
            <span>已清洗 <b class="num">{{ currentBatch.cleanSummary.importedRows }}</b> · 去重 <b class="num">{{ currentBatch.cleanSummary.duplicateRows }}</b></span>
          </button>
        </div>
        <div class="batch-actions">
          <UiButton variant="secondary" size="sm" :icon="SlidersHorizontal" @click="configOpen = true">异常阈值</UiButton>
          <UiButton variant="secondary" size="sm" :icon="Download" :disabled="!system.can('export')" @click="exportWorkbook('all')">导出底稿</UiButton>
          <UiButton variant="primary" size="sm" :icon="UploadCloud" @click="importOpen = true">导入新案</UiButton>
        </div>
      </section>

      <!-- 2. 资金总览五项核心指标（图谱与单页完整展示，智能体页也展示辅助决策） -->
      <div v-if="showGraphBlock || showAgentPage" class="stats-5">
        <UiStat label="总流入金额" :value="fmtWanNumber(overview.totalIn)" unit="万元" :icon="ArrowDownLeft" tone="green" :hint="`共 ${overview.inCount} 笔转入`" />
        <UiStat label="总流出金额" :value="fmtWanNumber(overview.totalOut)" unit="万元" :icon="ArrowUpRight" tone="blue" :hint="`共 ${overview.outCount} 笔转出`" />
        <UiStat label="资金净差额" :value="`${overview.netDiff > 0 ? '+' : ''}${fmtWanNumber(overview.netDiff)}`" unit="万元" :icon="Scale" tone="gold" :hint="overview.netDiff >= 0 ? '流入大于流出' : '流出大于流入'" />
        <UiStat label="涉及对手方" :value="overview.counterpartyCount" unit="户" :icon="Users" tone="orange" :hint="`涉及 ${currentBatch.cleanSummary.banks.length} 家机构`" />
        <div class="stat-click" role="button" tabindex="0" @click="props.section === 'graph' || props.section === 'agent' ? router.push('/bankflow/ledger') : (filter.rule = filter.rule === 'any_alert' ? '' : 'any_alert', workspaceTab = 'split', page = 1)" @keydown.enter="props.section === 'graph' || props.section === 'agent' ? router.push('/bankflow/ledger') : (filter.rule = filter.rule === 'any_alert' ? '' : 'any_alert', workspaceTab = 'split', page = 1)">
          <UiStat label="命中预警流水" :value="overview.alertTxCount" unit="条" :icon="Siren" tone="red" :hint="`红警 ${overview.highAlertCount} · 重点 ${overview.focusCount}`" />
        </div>
      </div>

      <!-- 3. 醒目的纪检智能体解析直达条（仅在 hub 单页模式展示；独立大模块有专属 /bankflow/agent 子页） -->
      <section v-if="props.section === 'hub'" class="agent-banner" aria-label="纪检智能体解析入口">
        <div class="ab-lead">
          <span class="ab-ic"><Sparkles :size="17" /></span>
          <div>
            <strong>纪检智能体一键解析</strong>
            <span>串联本案 {{ overview.alertTxCount }} 笔预警与上下游对手方，流式生成可溯源研判初稿</span>
          </div>
        </div>
        <div class="ab-btns">
          <UiButton variant="primary" size="sm" :icon="Sparkles" @click="launchAgentAnalysis('chain')">资金链全景剖析</UiButton>
          <UiButton variant="secondary" size="sm" @click="launchAgentAnalysis('interview')">生成谈话提纲</UiButton>
          <UiButton variant="secondary" size="sm" @click="launchAgentAnalysis('semantics')">隐蔽手法识别</UiButton>
          <UiButton variant="soft" size="sm" :icon="Workflow" @click="requestDossier(currentBatch.subjectName)">跨库全景研判</UiButton>
        </div>
      </section>

      <!-- 原地展开的流式智能体研判工作区（在 agent 子页默认直出且无需关闭按钮） -->
      <BankFlowAgentCard
        v-if="showAgentPage || agentOpen"
        :initial-mode="agentMode"
        :auto-run-key="agentAutoRunKey"
        :closable="!showAgentPage"
        @open-tx="openTxById"
        @close="agentOpen = false"
      />

      <!-- 4. 纪检异常线索筛查模型条 -->
      <section v-if="showLedgerBlock" class="model-strip" aria-label="异常线索筛查模型">
        <div class="ms-head">
          <div class="row">
            <Siren :size="15" class="ms-ic" />
            <strong>异常线索自动筛查模型</strong>
            <span class="muted">勾选开启或关闭检测规则，点击规则名称快速筛出命中流水</span>
          </div>
          <UiButton size="sm" variant="ghost" :icon="SlidersHorizontal" @click="configOpen = true">调整判定阈值</UiButton>
        </div>
        <div class="ms-grid">
          <div
            v-for="rk in ALERT_RULE_ORDER"
            :key="rk"
            class="ms-pill"
            :class="{ on: filter.rule === rk, off: !store.ruleConfig[rk].enabled }"
          >
            <button
              type="button"
              class="chk"
              role="checkbox"
              :aria-checked="store.ruleConfig[rk].enabled"
              :aria-label="`开关${ALERT_RULE_META[rk].name}`"
              @click="toggleRuleEnabled(rk)"
            >
              <Check v-if="store.ruleConfig[rk].enabled" :size="12" :stroke-width="3" />
            </button>
            <button type="button" class="ms-pick" :disabled="!store.ruleConfig[rk].enabled" @click="filterByRule(rk)">
              <span class="ms-name">{{ ALERT_RULE_META[rk].short }}</span>
              <b class="num ms-cnt">{{ overview.ruleCounts[rk] }}</b>
            </button>
          </div>
        </div>
      </section>

      <!-- 5. 主工作区视角切换（按当前子页渲染最精准的 Tab） -->
      <div v-if="!showAgentPage" class="ws-tabs-row">
        <UiTabs
          v-if="props.section === 'hub'"
          v-model="workspaceTab"
          :items="[
            { value: 'split', label: '穿透图谱与流水明细' },
            { value: 'alerts', label: '异常预警清单', count: overview.alertTxCount },
            { value: 'counterparties', label: '对手方资金汇总', count: overview.counterpartyCount },
          ]"
        />
        <UiTabs
          v-else-if="props.section === 'graph'"
          v-model="graphTab"
          :items="[
            { value: 'graph', label: '资金穿透图谱与排行' },
            { value: 'counterparties', label: '对手方资金汇总表', count: overview.counterpartyCount },
          ]"
        />
        <UiTabs
          v-else-if="props.section === 'ledger'"
          v-model="ledgerTab"
          :items="[
            { value: 'all', label: '全部流水明细', count: store.analyzed.length },
            { value: 'alerts', label: '异常预警清单', count: overview.alertTxCount },
          ]"
        />
        <div class="ws-summary muted">
          <span>区间 <b class="num">{{ currentBatch.periodStart }}</b> 至 <b class="num">{{ currentBatch.periodEnd }}</b></span>
          <span>·</span>
          <span>重点核查 <b class="num txt-red">{{ overview.focusCount }}</b> 笔</span>
          <span>·</span>
          <span>已排除 <b class="num">{{ overview.excludedCount }}</b> 笔</span>
        </div>
      </div>

      <!-- 6. 资金流向穿透图谱 + 重点对手方排行 -->
      <div v-if="(props.section === 'hub' && workspaceTab === 'split') || (props.section === 'graph' && graphTab === 'graph')" class="graph-split">
        <UiCard
          :icon="Network"
          title="资金流向与人物关系穿透图谱"
          :subtitle="`以「${currentBatch.subjectName}」为中心展示上下游资金往来，点击节点或连线右侧联动核查`"
        >
          <template #extra>
            <UiTabs
              v-model="graphScope"
              size="sm"
              :items="[
                { value: 'all', label: '全部重点往来' },
                { value: 'alert', label: '仅预警对手方' },
              ]"
            />
          </template>
          <UiEmpty v-if="!graphCounterparties.length" title="当前筛选下无资金往来节点" text="可切换为「全部重点往来」或调整模型阈值" />
          <FundFlowGraph
            v-else
            :subject-name="currentBatch.subjectName"
            :subject-unit="currentBatch.subjectUnit"
            :total-in="overview.totalIn"
            :total-out="overview.totalOut"
            :counterparties="graphCounterparties"
            :selected="selectedCounterparty"
            :height="400"
            @select="openCounterpartyDrawer"
          />
        </UiCard>

        <UiCard
          :icon="Landmark"
          title="重点往来对手方排行"
          subtitle="按预警与交易总额排序，点击穿透"
          flush
          class="rank-card"
        >
          <ul class="cp-rank scroll-thin">
            <li
              v-for="c in topCounterparties"
              :key="c.name"
              :class="{ active: selectedCounterparty === c.name }"
              @click="openCounterpartyDrawer(c.name)"
            >
              <div class="cpr-top">
                <strong class="cpr-name">{{ c.name }}</strong>
                <UiTag size="sm" :tone="c.alertCount ? 'red' : 'gray'">{{ c.alertCount ? `预警 ${c.alertCount} 笔` : c.relation }}</UiTag>
              </div>
              <div class="cpr-mid num">
                <span class="in">入 {{ fmtWanNumber(c.inAmount) }}万</span>
                <span class="out">出 {{ fmtWanNumber(c.outAmount) }}万</span>
                <span class="muted">{{ c.totalCount }} 笔</span>
              </div>
              <div v-if="c.alertRules.length" class="cpr-tags">
                <UiTag v-for="r in c.alertRules.slice(0, 3)" :key="r" size="sm" tone="gold">{{ ALERT_RULE_META[r].short }}</UiTag>
              </div>
            </li>
          </ul>
        </UiCard>
      </div>

      <!-- 7A. 对手方汇总独立大表 -->
      <UiCard v-if="(props.section === 'hub' && workspaceTab === 'counterparties') || (props.section === 'graph' && graphTab === 'counterparties')" flush :icon="Users" title="对手方资金往来汇总表" subtitle="按户汇总上下游流入流出、净差额与命中异常模型，点击行右侧抽屉查看全部往来明细">
        <template #extra>
          <UiButton size="sm" variant="secondary" :icon="Download" :disabled="!system.can('export')" @click="exportWorkbook('all')">导出汇总底稿</UiButton>
        </template>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>对方户名</th>
                <th>分类 / 账号</th>
                <th>涉及机构</th>
                <th class="r">转入总额（元）</th>
                <th class="r">转出总额（元）</th>
                <th class="r">净差额（元）</th>
                <th class="r">笔数</th>
                <th>命中预警模型</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in store.counterparties"
                :key="c.name"
                :class="{ active: selectedCounterparty === c.name }"
                style="cursor:pointer"
                @click="openCounterpartyDrawer(c.name)"
              >
                <td><strong>{{ c.name }}</strong></td>
                <td>
                  <UiTag size="sm" tone="gray">{{ c.relation }}</UiTag>
                  <div class="muted sub num">{{ c.accounts.join('、') || '—' }}</div>
                </td>
                <td>{{ c.banks.join('、') }}</td>
                <td class="r num txt-in">{{ c.inAmount ? fmtMoney(c.inAmount) : '—' }}</td>
                <td class="r num txt-out">{{ c.outAmount ? fmtMoney(c.outAmount) : '—' }}</td>
                <td class="r num">{{ c.netAmount > 0 ? '+' : '' }}{{ fmtMoney(c.netAmount) }}</td>
                <td class="r num">{{ c.totalCount }}</td>
                <td>
                  <div class="tags">
                    <RiskBadge v-if="c.maxLevel" :level="c.maxLevel" />
                    <UiTag v-for="r in c.alertRules" :key="r" size="sm" tone="gold">{{ ALERT_RULE_META[r].short }}</UiTag>
                    <UiTag v-if="!c.alertRules.length" size="sm" tone="green">正常</UiTag>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>

      <!-- 7B. 多维流水检索与明细主表 -->
      <UiCard v-if="(props.section === 'hub' && workspaceTab !== 'counterparties') || props.section === 'ledger'" flush>
        <template #title>
          <span class="row">
            <ListFilter :size="15" />
            {{ (props.section === 'ledger' ? ledgerTab === 'alerts' : workspaceTab === 'alerts') ? '异常预警流水清单' : '银行流水明细核查台账' }}
            <span class="muted num">{{ filteredRows.length }} / {{ store.analyzed.length }} 笔</span>
          </span>
        </template>
        <template #extra>
          <UiSelect
            v-model="filter.sortBy"
            size="sm"
            class="w140"
            label="排序方式"
            :options="[
              { value: 'time_desc', label: '按时间降序' },
              { value: 'time_asc', label: '按时间升序' },
              { value: 'amount_desc', label: '按金额降序' },
              { value: 'amount_asc', label: '按金额升序' },
            ]"
          />
          <UiButton v-if="hasActiveFilter" size="sm" variant="ghost" :icon="RotateCcw" @click="resetFilters">重置筛选</UiButton>
          <UiButton size="sm" variant="soft" :icon="Download" :disabled="!system.can('export')" @click="exportWorkbook('filtered')">导出筛选底稿</UiButton>
        </template>

        <div class="filter-bar">
          <div class="f-item f-date">
            <DateRangePicker
              v-model:start="filter.startDate"
              v-model:end="filter.endDate"
              :min-date="currentBatch.periodStart"
              :max-date="currentBatch.periodEnd"
              @change="page = 1"
            />
          </div>
          <label class="f-search">
            <Search :size="14" />
            <input v-model="filter.counterparty" placeholder="对手方姓名 / 账号" aria-label="按对手方筛选" @input="page = 1" />
          </label>
          <UiSelect
            :model-value="filter.direction"
            size="sm"
            class="w110"
            label="借贷方向"
            :options="[
              { value: '', label: '全部方向' },
              { value: 'in', label: '资金收入' },
              { value: 'out', label: '资金支出' },
            ]"
            @update:model-value="v => { filter.direction = v as '' | 'in' | 'out'; page = 1 }"
          />
          <div class="f-amt">
            <input v-model="filter.minAmount" type="text" inputmode="decimal" placeholder="最低额" aria-label="最低金额" @input="page = 1" />
            <span>至</span>
            <input v-model="filter.maxAmount" type="text" inputmode="decimal" placeholder="最高额" aria-label="最高金额" @input="page = 1" />
          </div>
          <label class="f-search">
            <Filter :size="14" />
            <input v-model="filter.summary" placeholder="摘要 / 渠道 / 银行" aria-label="按摘要筛选" @input="page = 1" />
          </label>
          <UiSelect
            :model-value="filter.rule"
            size="sm"
            class="w130"
            label="预警标签"
            :options="[
              { value: '', label: '全部预警' },
              { value: 'any_alert', label: '仅命中预警' },
              ...ALERT_RULE_ORDER.map(k => ({ value: k, label: ALERT_RULE_META[k].short })),
            ]"
            @update:model-value="v => { filter.rule = v as typeof filter.rule; page = 1 }"
          />
          <UiSelect
            :model-value="filter.reviewStatus"
            size="sm"
            class="w115"
            label="核查状态"
            :options="[
              { value: '', label: '全部状态' },
              { value: 'focus', label: '重点核查' },
              { value: 'pending', label: '待核实' },
              { value: 'excluded', label: '已排除' },
            ]"
            @update:model-value="v => { filter.reviewStatus = v as typeof filter.reviewStatus; page = 1 }"
          />
        </div>

        <UiEmpty v-if="!pagedRows.length" title="没有符合筛选条件的银行流水" text="可点击上方「重置筛选」或放宽金额、日期区间条件" />
        <div v-else class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>交易时间</th>
                <th>对手方名称</th>
                <th>借贷方向</th>
                <th class="r">交易金额（元）</th>
                <th>交易摘要</th>
                <th>命中预警规则</th>
                <th>核查状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="t in pagedRows"
                :key="t.id"
                :class="{ active: selectedTxId === t.id && drawerOpen, dim: t.reviewStatus === 'excluded' }"
                style="cursor:pointer"
                @click="openTxDrawer(t)"
              >
                <td class="num col-time">
                  <div>{{ t.time.slice(0, 10) }}</div>
                  <span class="muted sub">{{ t.time.slice(11) }} · {{ t.bank }}</span>
                </td>
                <td>
                  <button type="button" class="cp-link" @click.stop="openCounterpartyDrawer(t.counterparty)">{{ t.counterparty }}</button>
                  <div class="muted sub num">{{ t.counterpartyAccount }}</div>
                </td>
                <td>
                  <UiTag size="sm" :tone="t.direction === 'in' ? 'green' : 'blue'">
                    {{ t.direction === 'in' ? '收入' : '支出' }}
                  </UiTag>
                </td>
                <td class="r num col-amt" :class="t.direction">
                  <strong>{{ t.direction === 'in' ? '+' : '-' }}{{ fmtMoney(t.amount) }}</strong>
                  <div v-if="t.balance != null" class="muted sub">余 {{ fmtMoney(t.balance) }}</div>
                </td>
                <td class="col-sum">
                  <div>{{ t.summary }}</div>
                  <span class="muted sub">{{ t.channel }}</span>
                </td>
                <td>
                  <div class="tags">
                    <RiskBadge v-if="t.maxLevel" :level="t.maxLevel" />
                    <UiTag v-for="h in t.alerts" :key="h.rule" size="sm" tone="gold">{{ h.ruleName }}</UiTag>
                    <span v-if="!t.alerts.length" class="muted sub">未命中</span>
                  </div>
                </td>
                <td>
                  <UiTag size="sm" :tone="statusTone(t.reviewStatus)" dot>{{ statusLabel(t.reviewStatus) }}</UiTag>
                  <div v-if="t.reviewNote" class="muted sub note-clip" :title="t.reviewNote">{{ t.reviewNote }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template v-if="filteredRows.length" #footer>
          <span class="muted num">共 {{ filteredRows.length }} 条 · 第 {{ page }} / {{ totalPages }} 页</span>
          <span class="spacer" />
          <div class="pager">
            <UiSelect
              v-model="pageSize"
              size="sm"
              class="w105"
              label="每页条数"
              :options="[
                { value: '10', label: '10 条/页' },
                { value: '20', label: '20 条/页' },
                { value: '50', label: '50 条/页' },
              ]"
            />
            <UiButton size="sm" variant="secondary" :icon="ChevronLeft" :disabled="page <= 1" @click="page--">上一页</UiButton>
            <UiButton size="sm" variant="secondary" :disabled="page >= totalPages" @click="page++">下一页<ChevronRight :size="14" /></UiButton>
          </div>
        </template>
      </UiCard>

      <AiNotice text="银行流水智能分析结果属于纪检监督辅助疑点，不作为违纪违法定性依据；重点预警流水请结合银行回单、合同台账与谈话核实情况作出人工研判。" />
    </template>

    <!-- 批量导入与自动清洗弹窗 -->
    <BankFlowImportModal v-model="importOpen" @imported="onImported" />

    <!-- 异常模型阈值设置弹窗 -->
    <UiModal v-model="configOpen" title="纪检异常模型阈值设置" :width="660">
      <div class="cfg-list">
        <div class="cfg-row">
          <div class="cfg-head">
            <strong>大额整存整取 / 大额转账</strong>
            <UiTag size="sm" :tone="store.ruleConfig.large.enabled ? 'red' : 'gray'">{{ store.ruleConfig.large.enabled ? '已启用' : '已停用' }}</UiTag>
          </div>
          <div class="cfg-fields">
            <label><span>大额单笔阈值（元）</span><input v-model.number="store.ruleConfig.large.threshold" type="number" step="5000" min="1000" class="input no-spin" /></label>
            <label><span>整数大额触发线（元）</span><input v-model.number="store.ruleConfig.large.roundThreshold" type="number" step="5000" min="1000" class="input no-spin" /></label>
          </div>
        </div>

        <div class="cfg-row">
          <div class="cfg-head">
            <strong>快进快出 / 过桥资金</strong>
            <UiTag size="sm" :tone="store.ruleConfig.bridge.enabled ? 'red' : 'gray'">{{ store.ruleConfig.bridge.enabled ? '已启用' : '已停用' }}</UiTag>
          </div>
          <div class="cfg-fields three">
            <label><span>时间窗口（小时）</span><input v-model.number="store.ruleConfig.bridge.windowHours" type="number" min="1" max="168" class="input no-spin" /></label>
            <label><span>金额容差（%）</span><input v-model.number="store.ruleConfig.bridge.tolerancePct" type="number" min="0" max="30" class="input no-spin" /></label>
            <label><span>最低金额（元）</span><input v-model.number="store.ruleConfig.bridge.minAmount" type="number" step="1000" min="1000" class="input no-spin" /></label>
          </div>
        </div>

        <div class="cfg-row">
          <div class="cfg-head">
            <strong>化整为零 / 拆分规避</strong>
            <UiTag size="sm" :tone="store.ruleConfig.split.enabled ? 'red' : 'gray'">{{ store.ruleConfig.split.enabled ? '已启用' : '已停用' }}</UiTag>
          </div>
          <div class="cfg-fields three">
            <label><span>连续观察天数</span><input v-model.number="store.ruleConfig.split.windowDays" type="number" min="1" max="60" class="input no-spin" /></label>
            <label><span>最少拆分笔数</span><input v-model.number="store.ruleConfig.split.minCount" type="number" min="2" max="50" class="input no-spin" /></label>
            <label><span>累计金额门槛（元）</span><input v-model.number="store.ruleConfig.split.minTotal" type="number" step="5000" min="5000" class="input no-spin" /></label>
          </div>
          <p class="cfg-hint muted">注：仅统计单笔低于上方「大额单笔阈值」的连续小额往来。</p>
        </div>

        <div class="cfg-row">
          <div class="cfg-head">
            <strong>特定时段交易（深夜 / 敏感节点）</strong>
            <button
              type="button"
              class="cfg-toggle"
              role="checkbox"
              :aria-checked="store.ruleConfig.odd_time.includeHolidays"
              @click="store.ruleConfig.odd_time.includeHolidays = !store.ruleConfig.odd_time.includeHolidays"
            >
              <span class="chk sm" :class="{ checked: store.ruleConfig.odd_time.includeHolidays }">
                <Check v-if="store.ruleConfig.odd_time.includeHolidays" :size="11" :stroke-width="3" />
              </span>
              包含春节、中秋、国庆等敏感节点
            </button>
          </div>
          <div class="cfg-fields three">
            <label><span>深夜起始（时）</span><input v-model.number="store.ruleConfig.odd_time.nightStartHour" type="number" min="19" max="23" class="input no-spin" /></label>
            <label><span>深夜结束（时）</span><input v-model.number="store.ruleConfig.odd_time.nightEndHour" type="number" min="1" max="9" class="input no-spin" /></label>
            <label><span>最低金额（元）</span><input v-model.number="store.ruleConfig.odd_time.minAmount" type="number" step="1000" min="500" class="input no-spin" /></label>
          </div>
        </div>

        <div class="cfg-row">
          <div class="cfg-head">
            <strong>高频重点往来（非亲属 / 特定企业）</strong>
            <button
              type="button"
              class="cfg-toggle"
              role="checkbox"
              :aria-checked="store.ruleConfig.frequent.excludeRoutine"
              @click="store.ruleConfig.frequent.excludeRoutine = !store.ruleConfig.frequent.excludeRoutine"
            >
              <span class="chk sm" :class="{ checked: store.ruleConfig.frequent.excludeRoutine }">
                <Check v-if="store.ruleConfig.frequent.excludeRoutine" :size="11" :stroke-width="3" />
              </span>
              自动排除工资、水电与亲属常规项
            </button>
          </div>
          <div class="cfg-fields">
            <label><span>最低往来笔数</span><input v-model.number="store.ruleConfig.frequent.minCount" type="number" min="2" max="100" class="input no-spin" /></label>
            <label><span>累计金额门槛（元）</span><input v-model.number="store.ruleConfig.frequent.minTotal" type="number" step="10000" min="5000" class="input no-spin" /></label>
          </div>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" :icon="RotateCcw" @click="store.resetRules(); toast('已恢复默认阈值')">恢复默认</UiButton>
        <span class="spacer" />
        <UiButton variant="primary" @click="applyRuleConfig">完成并应用</UiButton>
      </template>
    </UiModal>

    <!-- 批次清洗统计与映射详情弹窗 -->
    <UiModal v-model="cleanDetailOpen" title="批次清洗统计与字段映射明细" :width="680">
      <div class="cd-wrap">
        <div class="cd-kpis">
          <div><span class="muted">导入文件数</span><strong class="num">{{ currentBatch.cleanSummary.fileCount }} 份</strong></div>
          <div><span class="muted">原始记录数</span><strong class="num">{{ currentBatch.cleanSummary.rawRows }} 笔</strong></div>
          <div><span class="muted">清洗入库数</span><strong class="num txt-in">{{ currentBatch.cleanSummary.importedRows }} 笔</strong></div>
          <div><span class="muted">自动去重数</span><strong class="num txt-red">{{ currentBatch.cleanSummary.duplicateRows }} 笔</strong></div>
        </div>
        <div class="cd-list">
          <div v-for="m in currentBatch.cleanSummary.mappings" :key="m.fileName" class="cd-item">
            <div class="cd-top">
              <UiTag tone="gold" size="sm">{{ m.bank }}</UiTag>
              <strong>{{ m.fileName }}</strong>
              <span class="muted num">入库 {{ m.keptRows }} / 原始 {{ m.rawRows }}（去重 {{ m.dupRows }}）</span>
            </div>
            <div class="cd-cols">
              <span v-for="(v, k) in m.mapping" :key="k">{{ { time: '交易时间', direction: '借贷方向', amount: '交易金额', income: '收入金额', expense: '支出金额', balance: '余额', counterparty: '对方户名', counterpartyAccount: '对方账号', summary: '交易摘要', channel: '交易渠道' }[k] || k }} ← {{ v }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <UiButton variant="primary" @click="cleanDetailOpen = false">关闭</UiButton>
      </template>
    </UiModal>

    <!-- 右侧联动核查详情抽屉 -->
    <BankFlowDrawer
      v-model="drawerOpen"
      :mode="drawerMode"
      :tx-id="selectedTxId"
      :counterparty-name="selectedCounterparty"
      :direction-filter="drawerDirFilter"
      @select-tx="onSelectTxFromDrawer"
      @back-counterparty="drawerMode = 'counterparty'"
    />
  </div>
</template>

<style scoped>
/* 批次列表首屏 */
.hub-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow-1)}
.hub-search{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;width:340px;max-width:100%;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface-2);color:var(--text-3)}
.hub-search:focus-within{border-color:var(--red);background:var(--surface);box-shadow:0 0 0 3px var(--red-50)}
.hub-search input{flex:1;border:0;outline:0;background:none;font-size:14px;color:var(--text)}
.batch-list{display:flex;flex-direction:column;gap:12px}
.batch-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-md);box-shadow:var(--shadow-1);padding:16px 18px;display:flex;flex-direction:column;gap:12px;transition:border-color var(--dur),box-shadow var(--dur)}
.batch-card:hover{border-color:var(--red-line);box-shadow:var(--shadow-2)}
.bc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
.bc-title{min-width:0;flex:1}
.bc-title h3{font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px}
.bc-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}
.bc-ops{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.bc-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.bc-metrics>div{display:flex;flex-direction:column;gap:3px;padding:10px 13px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line)}
.bc-metrics span{font-size:12px;color:var(--text-3)}
.bc-metrics strong{font-size:19px;font-weight:700;color:var(--text);line-height:1.3}
.bc-metrics em{font-style:normal}
.bc-metrics small{font-size:12px;font-weight:500;color:var(--text-3)}

/* 单案工作台顶部与紧凑五指标带（压缩顶部高度，让首屏完整露出穿透图谱） */
.batch-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:9px 14px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-md);box-shadow:var(--shadow-1)}
.stats-5 :deep(.ui-stat){padding:10px 13px}
.stats-5 :deep(.st-v){font-size:21px;line-height:1.2}
.stats-5 :deep(.st-h){margin-top:2px;font-size:12px}
.batch-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0;flex:1}
.bar-div{width:1px;height:18px;background:var(--line-2)}
.batch-select{width:270px;max-width:100%}
.clean-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);color:var(--text-2);font-size:12px;transition:all var(--dur);white-space:nowrap}
.clean-chip:hover{border-color:var(--red-line);color:var(--red);background:var(--red-25)}
.batch-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}

.agent-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 16px;border-radius:var(--r-md);background:linear-gradient(115deg,var(--cream) 0%,var(--surface) 58%,var(--red-25) 100%);border:1px solid var(--gold-line);box-shadow:var(--shadow-1)}
.ab-lead{display:flex;align-items:center;gap:10px;min-width:0}
.ab-ic{width:34px;height:34px;border-radius:9px;background:var(--brand-grad);color:var(--brand-accent-ink);display:flex;align-items:center;justify-content:center;flex:none;box-shadow:var(--shadow-red)}
.ab-lead strong{display:block;font-size:14.5px;font-weight:700;color:var(--text)}
.ab-lead span{display:block;font-size:12.5px;color:var(--text-2)}
.ab-btns{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

.stats-5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.stats-5 :deep(.ui-stat){padding:13px 15px}
.stats-5 :deep(.ui-stat strong){font-size:24px}
.stats-5 :deep(.ui-stat .hint){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stat-click{cursor:pointer}
.stat-click :deep(.ui-stat){transition:transform var(--dur),border-color var(--dur),box-shadow var(--dur)}
.stat-click:hover :deep(.ui-stat){border-color:var(--red-line);transform:translateY(-1px);box-shadow:var(--shadow-2)}

.model-strip{padding:11px 15px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow-1);display:flex;flex-direction:column;gap:9px}
.ms-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:13px}
.ms-ic{color:var(--red)}
.ms-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.ms-pill{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line);transition:all var(--dur);min-width:0}
.ms-pill:hover{border-color:var(--red-line)}
.ms-pill.on{background:var(--red-50);border-color:var(--red)}
.ms-pill.off{opacity:.55}
.chk{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--line-2);background:var(--surface);color:var(--on-brand);display:inline-flex;align-items:center;justify-content:center;flex:none;transition:all var(--dur)}
.chk.sm{width:16px;height:16px;border-radius:4px}
.chk[aria-checked="true"],.chk.checked{background:var(--red);border-color:var(--red)}
.ms-pick{flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:13px;color:var(--text)}
.ms-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
.ms-cnt{font-size:13px;padding:1px 7px;border-radius:10px;background:var(--surface);color:var(--red);border:1px solid var(--line)}
.ms-pill.on .ms-cnt{background:var(--red);color:var(--on-brand);border-color:var(--red)}

.ws-tabs-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ws-summary{display:flex;align-items:center;gap:8px;font-size:13px;flex-wrap:wrap}
.txt-red{color:var(--red)}
.txt-in{color:var(--ok);font-weight:600}
.txt-out{color:var(--info);font-weight:600}

.graph-split{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px;align-items:start}
.rank-card :deep(.ui-card-body){max-height:466px;overflow-y:auto}
.cp-rank{display:flex;flex-direction:column}
.cp-rank li{padding:10px 15px;border-bottom:1px solid var(--line);cursor:pointer;transition:background var(--dur);display:flex;flex-direction:column;gap:4px}
.cp-rank li:last-child{border-bottom:0}
.cp-rank li:hover,.cp-rank li.active{background:var(--red-25)}
.cp-rank li.active{box-shadow:inset 3px 0 0 var(--red)}
.cpr-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cpr-name{font-size:13.5px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cpr-mid{display:flex;align-items:center;gap:10px;font-size:12px}
.cpr-mid .in{color:var(--ok)}
.cpr-mid .out{color:var(--info)}
.cpr-tags{display:flex;flex-wrap:wrap;gap:4px}

.filter-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 18px;border-bottom:1px solid var(--line);background:var(--surface-2)}
.f-date{width:198px}
.f-search{display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface);color:var(--text-3)}
.f-search:focus-within{border-color:var(--red);box-shadow:0 0 0 3px var(--red-50)}
.f-search input{border:0;outline:0;width:124px;font-size:13px;background:none;color:var(--text)}
.f-amt{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 9px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface);font-size:12px;color:var(--text-3)}
.f-amt:focus-within{border-color:var(--red);box-shadow:0 0 0 3px var(--red-50)}
.f-amt input{border:0;outline:0;width:72px;font-size:13px;background:none;color:var(--text)}
.w105{width:105px}.w110{width:110px}.w115{width:115px}.w140{width:140px}

.no-spin{-moz-appearance:textfield;appearance:textfield}
.no-spin::-webkit-outer-spin-button,.no-spin::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}

.r{text-align:right}
.sub{font-size:12px}
.col-time{white-space:nowrap}
.col-amt{white-space:nowrap}
.col-amt.in strong{color:var(--ok)}
.col-amt.out strong{color:var(--info)}
.col-sum{max-width:220px}
.cp-link{font-weight:600;color:var(--text);text-align:left}
.cp-link:hover{color:var(--red);text-decoration:underline}
.tags{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.note-clip{max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
tr.dim td{opacity:.52}
.pager{display:flex;align-items:center;gap:8px}

.cfg-list{display:flex;flex-direction:column;gap:12px}
.cfg-row{padding:10px 12px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line)}
.cfg-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px;font-size:13.5px;color:var(--text)}
.cfg-fields{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.cfg-fields.three{grid-template-columns:repeat(3,1fr)}
.cfg-fields label span{display:block;font-size:12px;color:var(--text-3);margin-bottom:4px}
.cfg-hint{font-size:12px;margin-top:6px}
.cfg-toggle{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-2)}
.cfg-toggle:hover{color:var(--red)}

.cd-wrap{display:flex;flex-direction:column;gap:12px}
.cd-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.cd-kpis>div{padding:10px 12px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line)}
.cd-kpis span{display:block;font-size:12px}
.cd-kpis strong{font-size:18px;color:var(--text)}
.cd-list{display:flex;flex-direction:column;gap:8px}
.cd-item{padding:10px 12px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface)}
.cd-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;font-size:13px}
.cd-cols{display:flex;flex-wrap:wrap;gap:5px}
.cd-cols span{font-size:12px;padding:2px 7px;border-radius:4px;background:var(--surface-2);color:var(--text-2);border:1px solid var(--line)}

@media(max-width:1360px){
  .stats-5{grid-template-columns:repeat(3,minmax(0,1fr))}
  .ms-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
  .graph-split{grid-template-columns:1fr}
}
@media(max-width:900px){
  .bc-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:780px){
  .stats-5,.ms-grid,.cfg-fields,.cfg-fields.three,.cd-kpis,.bc-metrics{grid-template-columns:1fr}
  .batch-select,.hub-search{width:100%}
}
</style>
