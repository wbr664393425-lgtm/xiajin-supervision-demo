<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  CheckCircle2,
  DatabaseZap,
  Eye,
  Play,
  RotateCcw,
  Send,
  ShieldX,
  X,
} from 'lucide-vue-next'
import StatusBadge from '@/components/StatusBadge.vue'
import { CONTRACTS, RECEIPTS, townName } from '@/domain/mockData'
import {
  allSupervisionFindings,
  confirmSupervisionFinding,
  dismissSupervisionFinding,
  navigateTo,
  portalState,
  restoreSupervisionFinding,
} from '@/domain/store'
import type { RadarTabKey, SupervisionFinding } from '@/domain/types'

const activeTab = ref<RadarTabKey>('assets')
const statusFilter = ref<'all' | 'pending' | 'handled'>('all')
const isScanning = ref(false)
const scanStep = ref(0)

// 证据对照原生弹窗
const activeFinding = ref<SupervisionFinding | null>(null)
const evidenceDialogRef = ref<HTMLDialogElement | null>(null)
const assignDept = ref('第一监督检查室')
const assignDeadline = ref('2026-11-18')
const dismissReason = ref('经调阅原始补充协议及流水凭证核实，系合法分期结算，排除疑点。')

const tabs: { key: RadarTabKey; label: string; desc: string }[] = [
  { key: 'assets', label: '农村“三资”穿透', desc: '合同台账 × 银行流水 × 发票与白条凭证' },
  { key: 'subsidy', label: '惠民惠农资金', desc: '发放名册 × 公安户籍 × 耕地确权 × 社保医保' },
  { key: 'procurement', label: '招投标围串标', desc: '报价离散度 × 标书文本相似度 × 工商关联' },
  { key: 'expense', label: '津补贴与公务支出', desc: '电子餐饮票据 × 公务接待公函 × 公车轨迹' },
]

function tabCount(key: RadarTabKey) {
  return allSupervisionFindings.value.filter((f) => f.tab === key).length
}

const currentFindings = computed(() => {
  return allSupervisionFindings.value.filter((f) => {
    if (f.tab !== activeTab.value) return false
    const dec = portalState.findingDecisions[f.id]
    if (statusFilter.value === 'pending' && dec) return false
    if (statusFilter.value === 'handled' && !dec) return false
    return true
  })
})

const contractRows = computed(() =>
  CONTRACTS.map((c) => {
    const paid = RECEIPTS.filter((r) => r.contractId === c.id).reduce((s, r) => s + r.amount, 0)
    const gap = Math.max(0, c.annualRent - paid)
    const ratio = Math.round((c.annualRent / c.marketRent) * 100)
    return { ...c, paid, gap, ratio }
  }),
)

function triggerScan() {
  if (isScanning.value) return
  isScanning.value = true
  scanStep.value = 1
  const timers = [
    setTimeout(() => (scanStep.value = 2), 320),
    setTimeout(() => (scanStep.value = 3), 680),
    setTimeout(() => {
      scanStep.value = 4
      isScanning.value = false
    }, 1050),
  ]
  void timers
}

watch(activeFinding, (val) => {
  const dlg = evidenceDialogRef.value
  if (!dlg) return
  if (val && !dlg.open) dlg.showModal()
  else if (!val && dlg.open) dlg.close()
})

function closeEvidenceDialog() {
  if (evidenceDialogRef.value) evidenceDialogRef.value.returnValue = ''
  activeFinding.value = null
}

function handleTabKeydown(e: KeyboardEvent, index: number) {
  let next = index
  if (e.key === 'ArrowRight') next = (index + 1) % tabs.length
  else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
  else return
  e.preventDefault()
  activeTab.value = tabs[next]!.key
}

function doConfirmFinding() {
  if (!activeFinding.value) return
  confirmSupervisionFinding(activeFinding.value, assignDept.value, assignDeadline.value)
  evidenceDialogRef.value?.close()
}

function doDismissFinding() {
  if (!activeFinding.value) return
  dismissSupervisionFinding(activeFinding.value.id, dismissReason.value)
  evidenceDialogRef.value?.close()
}
</script>

<template>
  <div class="radar-page">
    <!-- 顶部说明与扫描演示控制 -->
    <header class="page-head paper-card">
      <div>
        <h1 class="page-h1 font-editorial">大数据跨库穿透监督中心</h1>
        <p class="page-sub">
          不输出黑盒分数：每一条疑点均由跨库规则碰撞产生，并附“数据源碰撞路径 + 原始凭证明细 + 人工确认/排除入口”。
        </p>
      </div>
      <div class="head-actions">
        <button type="button" class="btn btn-teal" :disabled="isScanning" @click="triggerScan">
          <Play :size="15" aria-hidden="true" />
          <span>{{ isScanning ? '规则碰撞核验中…' : '运行规则碰撞核验' }}</span>
        </button>
      </div>
    </header>

    <!-- 规则碰撞步骤反馈条 -->
    <div v-if="scanStep > 0" class="scan-banner paper-card-subtle" role="status" aria-live="polite">
      <DatabaseZap :size="17" class="scan-icon" aria-hidden="true" />
      <div class="scan-steps">
        <span :class="{ done: scanStep >= 1 }">1. 载入四域台账</span>
        <span aria-hidden="true">→</span>
        <span :class="{ done: scanStep >= 2 }">2. 跨库主键关联碰撞</span>
        <span aria-hidden="true">→</span>
        <span :class="{ done: scanStep >= 3 }">3. 校验差额与程序规则</span>
        <span aria-hidden="true">→</span>
        <span :class="{ done: scanStep >= 4 }">
          4. 产出 {{ allSupervisionFindings.length }} 条待核疑点（演示样本）
        </span>
      </div>
    </div>

    <!-- 4 透镜切换 Tablist -->
    <section class="paper-card lens-shell">
      <div class="lens-bar">
        <div class="civic-tablist" role="tablist" aria-label="大数据监督领域切换">
          <button
            v-for="(t, idx) in tabs"
            :key="t.key"
            :id="`radar-tab-${t.key}`"
            type="button"
            role="tab"
            class="civic-tab"
            :aria-selected="activeTab === t.key"
            @click="activeTab = t.key"
            @keydown="handleTabKeydown($event, idx)"
          >
            <span>{{ t.label }}</span>
            <span class="tab-count num-tabular">{{ tabCount(t.key) }}</span>
          </button>
        </div>

        <div class="filter-pills">
          <button type="button" class="fp-btn" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">
            全部
          </button>
          <button type="button" class="fp-btn" :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">
            待核查
          </button>
          <button type="button" class="fp-btn" :class="{ active: statusFilter === 'handled' }" @click="statusFilter = 'handled'">
            已处置
          </button>
        </div>
      </div>

      <div
        role="tabpanel"
        :aria-labelledby="`radar-tab-${activeTab}`"
        class="lens-content"
      >
        <p class="lens-desc">
          碰撞路径：<strong>{{ tabs.find(t => t.key === activeTab)?.desc }}</strong>
        </p>

        <!-- 三资专有：合同与到账结构化对账表 -->
        <div v-if="activeTab === 'assets'" class="assets-table-wrap">
          <div tabindex="0" role="region" aria-labelledby="assets-cap" class="table-scroll-region">
            <table class="civic-table">
              <caption id="assets-cap">
                农村集体资产租赁合同与流水实时比对台账（演示基准日 2026-11-07）
              </caption>
              <thead>
                <tr>
                  <th scope="col">合同编号</th>
                  <th scope="col">乡镇与资产</th>
                  <th scope="col">承租方</th>
                  <th scope="col">约定年租</th>
                  <th scope="col">流水已收</th>
                  <th scope="col">待核差额</th>
                  <th scope="col">占参考价比例</th>
                  <th scope="col">民主议事 / 公示</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in contractRows" :key="row.id" :class="{ 'highlight-row': row.id === 'SZ-HT-2026-018' }">
                  <th scope="row" class="font-mono-code">{{ row.id }}</th>
                  <td>{{ townName(row.town) }} · {{ row.village }}（{{ row.asset }}）</td>
                  <td>{{ row.tenant }}</td>
                  <td class="num-tabular">{{ row.annualRent.toLocaleString('zh-CN') }} 元</td>
                  <td class="num-tabular">{{ row.paid.toLocaleString('zh-CN') }} 元</td>
                  <td class="num-tabular">
                    <strong v-if="row.gap > 0" class="text-vermilion">{{ row.gap.toLocaleString('zh-CN') }} 元</strong>
                    <span v-else class="text-pine">0 元</span>
                  </td>
                  <td class="num-tabular">
                    <StatusBadge v-if="row.ratio < 70" tone="high" :label="`${row.ratio}%（偏低）`" />
                    <span v-else>{{ row.ratio }}%</span>
                  </td>
                  <td>
                    <span v-if="!row.meeting || !row.publicity" class="text-amber">
                      {{ !row.meeting ? '缺民主会议' : '' }} {{ !row.publicity ? '未公示' : '' }}
                    </span>
                    <span v-else class="text-pine">程序齐备</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 疑点卡片流 -->
        <ul class="findings-grid" role="list">
          <li v-for="f in currentFindings" :key="f.id" class="finding-card">
            <div class="f-top">
              <div class="f-badges">
                <StatusBadge :tone="f.level" :label="f.rule" />
                <span class="source-chip">{{ f.sourceSystem }}</span>
              </div>
              <span v-if="f.amount" class="f-amount num-tabular">涉及 {{ f.amount.toLocaleString('zh-CN') }} 元</span>
            </div>

            <h2 class="f-title">{{ f.title }}</h2>
            <p class="f-subject">{{ f.subject }}</p>

            <div class="f-evidence-preview">
              <div v-for="ev in f.evidence.slice(0, 3)" :key="ev.label" class="ev-line">
                <span class="ev-k">{{ ev.label }}：</span>
                <span class="ev-v">{{ ev.value }}</span>
              </div>
            </div>

            <div class="f-foot">
              <div v-if="portalState.findingDecisions[f.id]" class="handled-tag">
                <StatusBadge
                  :tone="portalState.findingDecisions[f.id]!.status === 'confirmed' ? 'human' : 'ok'"
                  :label="portalState.findingDecisions[f.id]!.status === 'confirmed' ? '已转核查任务' : '已人工排除'"
                />
                <span class="handled-note">{{ portalState.findingDecisions[f.id]!.note }}</span>
              </div>
              <span v-else class="pending-note">AI 提示待人工核实</span>

              <button type="button" class="btn btn-secondary btn-sm" @click="activeFinding = f">
                <Eye :size="14" aria-hidden="true" />
                <span>证据对照与处置</span>
              </button>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- 原生 <dialog> 证据链对照与人工处置抽屉 -->
    <dialog
      ref="evidenceDialogRef"
      aria-labelledby="ev-dlg-title"
      closedby="any"
      class="ev-dialog"
      @close="closeEvidenceDialog"
    >
      <template v-if="activeFinding">
        <div class="ev-dlg-head">
          <div>
            <div class="ev-dlg-tags">
              <StatusBadge :tone="activeFinding.level" :label="activeFinding.rule" />
              <span class="font-mono-code">{{ activeFinding.id }}</span>
            </div>
            <h2 id="ev-dlg-title">{{ activeFinding.title }}</h2>
            <p class="ev-dlg-sub">数据碰撞来源：{{ activeFinding.sourceSystem }}</p>
          </div>
          <form method="dialog">
            <button type="submit" value="close" class="btn btn-ghost btn-sm" aria-label="关闭证据对照框">
              <X :size="18" aria-hidden="true" />
            </button>
          </form>
        </div>

        <div class="ev-dlg-body">
          <div class="ev-compare-box">
            <h3>1. 系统比对命中的证据链条</h3>
            <dl class="ev-dl">
              <div v-for="item in activeFinding.evidence" :key="item.label" class="ev-dl-row">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
          </div>

          <div class="ev-basis-box track-ai-suggested">
            <strong>2. 规则判断逻辑与局限说明（不作违规认定）</strong>
            <p>{{ activeFinding.basis }}</p>
          </div>

          <!-- 人工处置区 -->
          <div v-if="portalState.findingDecisions[activeFinding.id]" class="track-human-confirmed handled-panel">
            <div class="hp-top">
              <CheckCircle2 :size="17" aria-hidden="true" />
              <strong>
                当前状态：{{ portalState.findingDecisions[activeFinding.id]!.status === 'confirmed' ? '已人工确认转核查' : '已人工填写理由排除' }}
              </strong>
            </div>
            <p>
              处置说明：{{ portalState.findingDecisions[activeFinding.id]!.note }}
              （{{ portalState.findingDecisions[activeFinding.id]!.by }} · {{ portalState.findingDecisions[activeFinding.id]!.at }}）
            </p>
            <div class="hp-actions">
              <button type="button" class="btn btn-secondary btn-sm" @click="restoreSupervisionFinding(activeFinding.id)">
                <RotateCcw :size="14" aria-hidden="true" />
                <span>撤回重审</span>
              </button>
              <button type="button" class="btn btn-primary btn-sm" @click="() => { closeEvidenceDialog(); navigateTo('home') }">
                去门户首页查看任务台账
              </button>
            </div>
          </div>

          <div v-else class="dispose-grid">
            <div class="dispose-col">
              <h4>路径 A：确认为疑点，发起人工核查</h4>
              <div class="disp-fields">
                <label for="ev-dept" class="f-label">交办组室</label>
                <select id="ev-dept" v-model="assignDept" class="f-input">
                  <option value="第一监督检查室">第一监督检查室</option>
                  <option value="第二监督检查室">第二监督检查室</option>
                  <option v-if="activeFinding.town" :value="`${townName(activeFinding.town)}纪委`">
                    {{ townName(activeFinding.town) }}纪委
                  </option>
                </select>
                <label for="ev-ddl" class="f-label">要求反馈时限</label>
                <input id="ev-ddl" v-model="assignDeadline" type="date" class="f-input" />
              </div>
              <button type="button" class="btn btn-primary full-w" @click="doConfirmFinding">
                <Send :size="15" aria-hidden="true" />
                <span>确认转核查任务</span>
              </button>
            </div>

            <div class="dispose-col">
              <h4>路径 B：核对原件无误，填写理由排除</h4>
              <label for="ev-dismiss" class="f-label">排除依据说明（写入审计日志）</label>
              <textarea id="ev-dismiss" v-model="dismissReason" rows="3" class="f-textarea" />
              <button type="button" class="btn btn-secondary full-w" @click="doDismissFinding">
                <ShieldX :size="15" aria-hidden="true" />
                <span>记录理由并排除该疑点</span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </dialog>
  </div>
</template>

<style scoped>
.radar-page {
  display: grid;
  gap: 1.15rem;
}

.page-head {
  padding: 1.2rem 1.4rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-h1 {
  font-size: 1.45rem;
  font-weight: 700;
}

.page-sub {
  font-size: 0.86rem;
  color: var(--ink-muted);
  margin-block-start: 0.2rem;
}

.scan-banner {
  padding: 0.75rem 1.15rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-color: var(--brand-teal-border);
}

.scan-icon {
  color: var(--brand-teal);
  flex: none;
}

.scan-steps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.83rem;
  color: var(--ink-muted);
}

.scan-steps .done {
  color: var(--brand-indigo);
  font-weight: 700;
}

.lens-shell {
  overflow: hidden;
}

.lens-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-inline: 1.15rem;
  background: var(--bg-elevated);
  border-block-end: 1px solid var(--border-hairline);
}

.lens-bar .civic-tablist {
  border-block-end: 0;
}

.filter-pills {
  display: inline-flex;
  gap: 0.3rem;
  padding-block: 0.45rem;
}

.fp-btn {
  border: 1px solid var(--border-hairline);
  background: var(--bg-surface);
  color: var(--ink-secondary);
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-weight: 600;
}

.fp-btn.active {
  background: var(--brand-indigo);
  color: #ffffff;
  border-color: var(--brand-indigo);
}

.lens-content {
  padding: 1.25rem 1.35rem;
  display: grid;
  gap: 1.1rem;
}

.lens-desc {
  font-size: 0.84rem;
  color: var(--ink-secondary);
}

.highlight-row td,
.highlight-row th {
  background: #fff9ec;
}

.findings-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 0.9rem;
}

.finding-card {
  padding: 1rem 1.1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-surface);
  display: grid;
  gap: 0.55rem;
  align-content: start;
}

.f-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.f-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.source-chip {
  font-size: 0.73rem;
  color: var(--ink-muted);
  background: var(--bg-subtle);
  padding: 0.14rem 0.45rem;
  border-radius: 4px;
}

.f-amount {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--vermilion);
}

.f-title {
  font-size: 0.96rem;
  font-weight: 700;
  line-height: 1.4;
}

.f-subject {
  font-size: 0.8rem;
  color: var(--ink-muted);
}

.f-evidence-preview {
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--border-hairline);
  display: grid;
  gap: 0.25rem;
  font-size: 0.8rem;
}

.ev-k {
  color: var(--ink-muted);
  font-weight: 600;
}

.f-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-block-start: 0.35rem;
}

.handled-tag {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-inline-size: 0;
}

.handled-note {
  font-size: 0.76rem;
  color: var(--pine);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-inline-size: 160px;
}

.pending-note {
  font-size: 0.76rem;
  color: var(--brand-teal);
  font-weight: 600;
}

.ev-dialog {
  inline-size: min(94dvw, 760px);
}

.ev-dlg-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.35rem;
  border-block-end: 1px solid var(--border-hairline);
}

.ev-dlg-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-end: 0.35rem;
}

.ev-dlg-head h2 {
  font-size: 1.08rem;
}

.ev-dlg-sub {
  font-size: 0.8rem;
  color: var(--ink-muted);
  margin-block-start: 0.2rem;
}

.ev-dlg-body {
  padding: 1.2rem 1.35rem 1.4rem;
  display: grid;
  gap: 1rem;
  max-block-size: 72dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.ev-compare-box h3 {
  font-size: 0.9rem;
  color: var(--brand-indigo);
  margin-block-end: 0.5rem;
}

.ev-dl {
  margin: 0;
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.ev-dl-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 0.75rem;
  padding: 0.6rem 0.85rem;
  border-block-end: 1px solid var(--border-hairline);
  font-size: 0.85rem;
}

.ev-dl-row:last-child {
  border-block-end: 0;
}

.ev-dl-row dt {
  font-weight: 600;
  color: var(--ink-secondary);
}

.ev-dl-row dd {
  margin: 0;
  color: var(--ink-primary);
}

.ev-basis-box {
  padding: 0.85rem 1rem;
  font-size: 0.85rem;
  display: grid;
  gap: 0.3rem;
}

.handled-panel {
  padding: 0.9rem 1rem;
  display: grid;
  gap: 0.5rem;
}

.hp-top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--pine);
}

.hp-actions {
  display: flex;
  gap: 0.6rem;
}

.dispose-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
}

.dispose-col {
  padding: 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
  display: grid;
  gap: 0.65rem;
  align-content: space-between;
}

.dispose-col h4 {
  font-size: 0.88rem;
  font-weight: 700;
}

.disp-fields {
  display: grid;
  gap: 0.4rem;
}

.f-label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--ink-secondary);
}

.f-input,
.f-textarea {
  inline-size: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  font-size: 0.84rem;
}

.full-w {
  inline-size: 100%;
}

.text-vermilion { color: var(--vermilion); }
.text-pine { color: var(--pine); }
.text-amber { color: var(--amber); }

@media (max-width: 720px) {
  .findings-grid,
  .dispose-grid,
  .ev-dl-row {
    grid-template-columns: 1fr;
  }
}
</style>
