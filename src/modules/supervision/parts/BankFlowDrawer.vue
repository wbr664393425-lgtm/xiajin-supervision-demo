<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  ArrowDownLeft, ArrowLeft, ArrowUpRight, CheckCircle2, ClipboardCheck,
  Flag, HelpCircle, Link2, Workflow, XCircle,
} from 'lucide-vue-next'
import { AiNotice, RiskBadge, UiButton, UiDrawer, UiEmpty, UiTag } from '@/design/ui'
import { ALERT_RULE_META, type CounterpartySummary, type EnrichedTransaction, type ReviewStatus } from '@/engines/bankflow'
import { requestDossier } from '@/app/useDossierAgent'
import { useBankFlowStore } from '@/stores/bankflow'
import { useSystemStore } from '@/stores/system'
import { toast } from '@/app/toast'

const props = defineProps<{
  modelValue: boolean
  mode: 'tx' | 'counterparty'
  txId: string | null
  counterpartyName: string
  directionFilter?: '' | 'in' | 'out'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'select-tx': [id: string]
  'back-counterparty': []
}>()

const store = useBankFlowStore()
const system = useSystemStore()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const currentTx = computed<EnrichedTransaction | undefined>(() =>
  props.txId ? store.analyzed.find(t => t.id === props.txId) : undefined,
)

const cpSummary = computed<CounterpartySummary | undefined>(() =>
  props.counterpartyName ? store.counterparties.find(c => c.name === props.counterpartyName) : undefined,
)

const cpDir = ref<'' | 'in' | 'out'>('')
watch(
  [() => props.directionFilter, () => props.counterpartyName, () => props.modelValue],
  ([dir, , isOpen]) => { if (isOpen) cpDir.value = dir || '' },
  { immediate: true },
)

const cpTransactions = computed(() =>
  store.analyzed.filter(t => t.counterparty === props.counterpartyName && (!cpDir.value || t.direction === cpDir.value)),
)

const pairedTransactions = computed(() => {
  if (!currentTx.value) return []
  const ids = new Set<string>()
  currentTx.value.alerts.forEach(a => a.pairedIds?.forEach(id => ids.add(id)))
  return store.analyzed.filter(t => ids.has(t.id))
})

const editStatus = ref<ReviewStatus>('pending')
const editNote = ref('')
const noteInput = ref<HTMLTextAreaElement>()
const pendingExcludeTxId = ref<string | null>(null)

watch(currentTx, async tx => {
  if (!tx) return
  if (pendingExcludeTxId.value === tx.id) {
    editStatus.value = 'excluded'
    editNote.value = tx.reviewNote
    pendingExcludeTxId.value = null
    await nextTick()
    noteInput.value?.focus()
    return
  }
  editStatus.value = tx.reviewStatus
  editNote.value = tx.reviewNote
}, { immediate: true })

const linkedTask = computed(() => (currentTx.value ? system.taskFor(currentTx.value.id) : undefined))

const title = computed(() => {
  if (props.mode === 'tx' && currentTx.value) {
    return `${currentTx.value.counterparty} · ${currentTx.value.direction === 'in' ? '转入' : '转出'} ${currentTx.value.amount.toLocaleString('zh-CN')} 元`
  }
  return props.counterpartyName ? `对手方穿透明细 · ${props.counterpartyName}` : '核查详情'
})

const subtitle = computed(() => {
  if (props.mode === 'tx' && currentTx.value) {
    return `${currentTx.value.bank} · ${currentTx.value.time} · ${currentTx.value.channel}`
  }
  if (cpSummary.value) {
    return `${cpSummary.value.relation} · 涉及 ${cpSummary.value.banks.join('、')} · 共 ${cpSummary.value.totalCount} 笔往来`
  }
  return ''
})

function saveReview() {
  if (!currentTx.value) return
  if (!system.can('confirm')) {
    toast('当前角色无核查确认权限', 'warn')
    return
  }
  if (editStatus.value === 'excluded' && !editNote.value.trim()) {
    toast('排除预警线索须填写核查说明以便留痕', 'warn')
    noteInput.value?.focus()
    return
  }
  if (store.setReview(currentTx.value, editStatus.value, editNote.value)) {
    toast('核查状态与备注已保存并记入审计日志', 'ok')
  }
}

function quickFocus(tx: EnrichedTransaction) {
  if (!system.can('confirm')) { toast('当前角色无核查确认权限', 'warn'); return }
  if (tx.reviewStatus === 'focus') return
  store.setReview(tx, 'focus', tx.reviewNote || '图谱穿透核查标记为重点线索')
  toast('已标记为「重点核查」', 'ok')
}

function jumpToExclude(tx: EnrichedTransaction) {
  if (!system.can('confirm')) { toast('当前角色无核查确认权限', 'warn'); return }
  pendingExcludeTxId.value = tx.id
  emit('select-tx', tx.id)
  toast('请填写排除依据后保存，系统将自动记入审计日志')
}

function sendToTask() {
  if (!currentTx.value) return
  const task = store.createVerifyTask(currentTx.value, editNote.value)
  if (!task) { toast('当前角色无发起核查任务权限', 'warn'); return }
  toast(`已生成核查任务 ${task.id}`, 'ok', { label: '查看任务', to: `/home/tasks?id=${task.id}` })
}

function toDossierAgent(targetName: string) {
  open.value = false
  requestDossier(targetName)
}

const statusText = (s: ReviewStatus) => ({ pending: '待核实', focus: '重点核查', excluded: '已排除' }[s])
const statusTone = (s: ReviewStatus) => ({ pending: 'ai', focus: 'red', excluded: 'gray' }[s] as 'ai' | 'red' | 'gray')
const fmtMoney = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtSigned = (n: number, dir: 'in' | 'out') => (n === 0 ? '0.00' : `${dir === 'in' ? '+' : '-'}${fmtMoney(n)}`)
</script>

<template>
  <UiDrawer v-model="open" :width="640" :title="title" :subtitle="subtitle">
    <!-- 模式一：对手方穿透视图 -->
    <template v-if="mode === 'counterparty' && cpSummary">
      <div class="cp-kpis">
        <div class="cp-kpi">
          <span>累计转入（{{ cpSummary.inCount }} 笔）</span>
          <strong class="num" :class="{ in: cpSummary.inAmount > 0 }">{{ fmtSigned(cpSummary.inAmount, 'in') }}</strong>
        </div>
        <div class="cp-kpi">
          <span>累计转出（{{ cpSummary.outCount }} 笔）</span>
          <strong class="num" :class="{ out: cpSummary.outAmount > 0 }">{{ fmtSigned(cpSummary.outAmount, 'out') }}</strong>
        </div>
        <div class="cp-kpi">
          <span>净差额（入 − 出）</span>
          <strong class="num">{{ cpSummary.netAmount > 0 ? '+' : '' }}{{ fmtMoney(cpSummary.netAmount) }}</strong>
        </div>
      </div>

      <div class="cp-meta">
        <div><span>对手账号</span><strong class="num">{{ cpSummary.accounts.length ? cpSummary.accounts.join('、') : '未披露账号' }}</strong></div>
        <div>
          <span>命中模型</span>
          <div class="tags">
            <UiTag v-for="r in cpSummary.alertRules" :key="r" size="sm" tone="red">{{ ALERT_RULE_META[r].short }}</UiTag>
            <UiTag v-if="!cpSummary.alertRules.length" size="sm" tone="green">未命中预警规则</UiTag>
          </div>
        </div>
      </div>

      <div class="cp-head">
        <h4>全部往来流水明细 <span class="muted num">（{{ cpTransactions.length }} 笔）</span></h4>
        <div class="dir-pills">
          <button type="button" :class="{ on: cpDir === '' }" @click="cpDir = ''">全部</button>
          <button type="button" :class="{ on: cpDir === 'in' }" @click="cpDir = 'in'">转入</button>
          <button type="button" :class="{ on: cpDir === 'out' }" @click="cpDir = 'out'">转出</button>
        </div>
      </div>

      <UiEmpty v-if="!cpTransactions.length" title="该方向暂无交易记录" />
      <ul v-else class="tx-list">
        <li v-for="t in cpTransactions" :key="t.id" class="tx-item" @click="emit('select-tx', t.id)">
          <div class="tx-top">
            <span class="num tx-time">{{ t.time }}</span>
            <UiTag size="sm" :tone="t.direction === 'in' ? 'green' : 'blue'">{{ t.direction === 'in' ? '收入' : '支出' }}</UiTag>
            <UiTag size="sm" tone="gray">{{ t.bank }}</UiTag>
            <span class="spacer" />
            <strong class="num tx-amt" :class="t.direction">{{ fmtSigned(t.amount, t.direction) }} 元</strong>
          </div>
          <p class="tx-sum">{{ t.summary }} · <span class="muted">{{ t.channel }}</span></p>
          <div class="tx-foot">
            <div class="tags">
              <RiskBadge v-if="t.maxLevel" :level="t.maxLevel" />
              <UiTag v-for="h in t.alerts" :key="h.rule" size="sm" tone="gold">{{ h.ruleName }}</UiTag>
              <UiTag size="sm" :tone="statusTone(t.reviewStatus)">{{ statusText(t.reviewStatus) }}</UiTag>
            </div>
            <div v-if="system.can('confirm')" class="quick-ops" @click.stop>
              <button
                type="button"
                class="qop"
                :class="t.reviewStatus === 'focus' ? 'done' : 'focus'"
                :disabled="t.reviewStatus === 'focus'"
                @click="quickFocus(t)"
              >{{ t.reviewStatus === 'focus' ? '已标重点' : '标为重点' }}</button>
              <button type="button" class="qop" @click="jumpToExclude(t)">填报排除</button>
            </div>
          </div>
        </li>
      </ul>
    </template>

    <!-- 模式二：单笔流水核查详情 -->
    <template v-else-if="mode === 'tx' && currentTx">
      <div v-if="counterpartyName" class="back-bar">
        <UiButton size="sm" variant="ghost" :icon="ArrowLeft" @click="emit('back-counterparty')">返回「{{ counterpartyName }}」全部往来明细</UiButton>
      </div>

      <div class="tags" style="margin-bottom:14px">
        <RiskBadge v-if="currentTx.maxLevel" :level="currentTx.maxLevel" />
        <UiTag v-else tone="green">常规流水</UiTag>
        <UiTag :tone="currentTx.direction === 'in' ? 'green' : 'blue'" :icon="currentTx.direction === 'in' ? ArrowDownLeft : ArrowUpRight">
          {{ currentTx.direction === 'in' ? '资金转入（贷方）' : '资金转出（借方）' }}
        </UiTag>
        <UiTag :tone="statusTone(currentTx.reviewStatus)">{{ statusText(currentTx.reviewStatus) }}</UiTag>
      </div>

      <dl class="detail-dl">
        <div><dt>交易时间</dt><dd class="num">{{ currentTx.time }}</dd></div>
        <div><dt>交易金额</dt><dd class="num strong-amt" :class="currentTx.direction">{{ fmtSigned(currentTx.amount, currentTx.direction) }} 元</dd></div>
        <div><dt>交易后余额</dt><dd class="num">{{ currentTx.balance != null ? `${fmtMoney(currentTx.balance)} 元` : '账单未提供' }}</dd></div>
        <div><dt>对方户名</dt><dd>{{ currentTx.counterparty }}（{{ currentTx.counterpartyRelation || '个人' }}）</dd></div>
        <div><dt>对方账号</dt><dd class="num">{{ currentTx.counterpartyAccount }}</dd></div>
        <div><dt>交易机构与渠道</dt><dd>{{ currentTx.bank }} · {{ currentTx.channel }}</dd></div>
        <div><dt>交易摘要</dt><dd>{{ currentTx.summary }}</dd></div>
        <div><dt>来源文件</dt><dd>{{ currentTx.sourceFile }}</dd></div>
      </dl>

      <h4>命中异常模型与量化依据</h4>
      <div v-if="currentTx.alerts.length" class="alert-cards">
        <div v-for="h in currentTx.alerts" :key="h.rule" class="alert-box" :class="h.level">
          <div class="ab-head">
            <strong>{{ ALERT_RULE_META[h.rule].name }}</strong>
            <RiskBadge :level="h.level" />
          </div>
          <p>{{ h.reason }}</p>
        </div>
      </div>
      <p v-else class="muted" style="font-size:13px">当前阈值设置下该笔流水未触发预警模型，仍可人工补充核查标注。</p>

      <template v-if="pairedTransactions.length">
        <h4>关联链路流水（点击直接跳转核对）</h4>
        <ul class="paired-list">
          <li v-for="p in pairedTransactions" :key="p.id" @click="emit('select-tx', p.id)">
            <Link2 :size="14" />
            <span class="num">{{ p.time }}</span>
            <strong>{{ p.counterparty }}</strong>
            <UiTag size="sm" :tone="p.direction === 'in' ? 'green' : 'blue'">{{ p.direction === 'in' ? '收入' : '支出' }}</UiTag>
            <b class="num">{{ fmtMoney(p.amount) }} 元</b>
          </li>
        </ul>
      </template>

      <h4>人工核查标记与备注</h4>
      <div class="status-group" role="radiogroup" aria-label="核查状态">
        <button type="button" class="st-btn" :class="{ on: editStatus === 'focus', focus: true }" :disabled="!system.can('confirm')" @click="editStatus = 'focus'">
          <Flag :size="14" />重点核查
        </button>
        <button type="button" class="st-btn" :class="{ on: editStatus === 'pending' }" :disabled="!system.can('confirm')" @click="editStatus = 'pending'">
          <HelpCircle :size="14" />待核实
        </button>
        <button type="button" class="st-btn" :class="{ on: editStatus === 'excluded' }" :disabled="!system.can('confirm')" @click="editStatus = 'excluded'">
          <XCircle :size="14" />已排除
        </button>
      </div>
      <textarea
        ref="noteInput"
        v-model="editNote"
        class="textarea"
        rows="3"
        :disabled="!system.can('confirm')"
        placeholder="填写核查研判依据、关联工程或合同核对情况、拟谈话核实要点（标记已排除时必填）"
        aria-label="核查备注"
      />
      <p v-if="currentTx.reviewedAt" class="muted rev-meta">最近核查记录：{{ currentTx.reviewedBy }} · {{ currentTx.reviewedAt }}</p>

      <AiNotice text="模型预警仅为资金异常线索初筛参考，请结合银行回单、合同台账与谈话笔录开展线下核实并作出人工结论。" />
    </template>

    <template #footer>
      <template v-if="mode === 'tx' && currentTx">
        <UiButton variant="ghost" :icon="Workflow" @click="toDossierAgent(currentTx.counterparty)">交给智能体研判</UiButton>
        <span class="spacer" />
        <UiButton
          v-if="linkedTask"
          variant="soft"
          :icon="ClipboardCheck"
          @click="$router.push(`/home/tasks?id=${linkedTask.id}`)"
        >查看任务 {{ linkedTask.id }}</UiButton>
        <UiButton
          v-else-if="system.can('task')"
          variant="secondary"
          :icon="ClipboardCheck"
          @click="sendToTask"
        >转核查任务</UiButton>
        <UiButton variant="primary" :icon="CheckCircle2" :disabled="!system.can('confirm')" @click="saveReview">保存核查标记</UiButton>
      </template>
      <template v-else-if="cpSummary">
        <UiButton variant="soft" :icon="Workflow" @click="toDossierAgent(cpSummary.name)">交给智能体研判「{{ cpSummary.name }}」</UiButton>
        <span class="spacer" />
        <UiButton @click="open = false">关闭抽屉</UiButton>
      </template>
    </template>
  </UiDrawer>
</template>

<style scoped>
.cp-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.cp-kpi{padding:10px 12px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line)}
.cp-kpi span{display:block;font-size:12px;color:var(--text-3)}
.cp-kpi strong{display:block;font-size:16px;font-weight:700;margin-top:3px;color:var(--text)}
.cp-kpi strong.in{color:var(--ok)}
.cp-kpi strong.out{color:var(--info)}
.cp-meta{border:1px solid var(--line);border-radius:var(--r-sm);margin-bottom:16px;overflow:hidden}
.cp-meta>div{display:grid;grid-template-columns:92px 1fr;gap:10px;padding:8px 12px;border-bottom:1px solid var(--line);align-items:center;font-size:13px}
.cp-meta>div:last-child{border-bottom:0}
.cp-meta span{color:var(--text-3)}
.cp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.cp-head h4{margin:0}
.dir-pills{display:inline-flex;gap:3px;padding:2px;border-radius:8px;background:var(--surface-3)}
.dir-pills button{padding:3px 10px;font-size:12px;border-radius:6px;color:var(--text-2)}
.dir-pills button.on{background:var(--surface);color:var(--red);font-weight:600;box-shadow:var(--shadow-1)}
.tx-list{display:flex;flex-direction:column;gap:8px}
.tx-item{padding:11px 12px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface);cursor:pointer;transition:border-color var(--dur),background var(--dur)}
.tx-item:hover{border-color:var(--red-line);background:var(--red-25)}
.tx-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tx-time{font-size:12.5px;color:var(--text-2)}
.tx-amt{font-size:15px}
.tx-amt.in{color:var(--ok)}
.tx-amt.out{color:var(--info)}
.tx-sum{font-size:13px;color:var(--text);margin:5px 0 8px}
.tx-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.quick-ops{display:flex;gap:6px}
.qop{font-size:12px;padding:2px 8px;border-radius:5px;border:1px solid var(--line-2);background:var(--surface);color:var(--text-2);transition:all var(--dur)}
.qop:hover:not(:disabled){border-color:var(--red-line);color:var(--red)}
.qop.focus{color:var(--red);border-color:var(--red-line);background:var(--red-50)}
.qop.done{color:var(--text-3);background:var(--surface-3);border-color:var(--line);cursor:default}
.back-bar{margin-bottom:10px}
.tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
h4{font-size:14px;font-weight:600;margin:16px 0 8px;color:var(--text)}
.detail-dl{margin:0;border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden}
.detail-dl>div{display:grid;grid-template-columns:124px 1fr;border-bottom:1px solid var(--line)}
.detail-dl>div:last-child{border-bottom:0}
dt{padding:8px 12px;font-size:13px;color:var(--text-3);background:var(--surface-2)}
dd{margin:0;padding:8px 12px;font-size:14px;color:var(--text)}
.strong-amt{font-weight:700;font-size:15px}
.strong-amt.in{color:var(--ok)}
.strong-amt.out{color:var(--info)}
.alert-cards{display:flex;flex-direction:column;gap:8px}
.alert-box{padding:10px 12px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2)}
.alert-box.high{background:var(--risk-high-bg);border-color:var(--red-line)}
.alert-box.mid{background:var(--risk-mid-bg);border-color:var(--gold-line)}
.ab-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;font-size:13px}
.alert-box p{font-size:13px;color:var(--text-2);line-height:1.6}
.paired-list{display:flex;flex-direction:column;gap:6px}
.paired-list li{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2);font-size:13px;cursor:pointer}
.paired-list li:hover{border-color:var(--red-line);background:var(--red-25)}
.paired-list strong{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.paired-list b{color:var(--text)}
.status-group{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
.st-btn{display:flex;align-items:center;justify-content:center;gap:6px;height:36px;border-radius:var(--r-sm);border:1px solid var(--line-2);background:var(--surface);font-size:13px;font-weight:500;color:var(--text-2);transition:all var(--dur)}
.st-btn:hover:not(:disabled){border-color:var(--red-line);color:var(--text)}
.st-btn.on{border-color:var(--red);background:var(--red-50);color:var(--red);font-weight:600}
.st-btn.on.focus{background:var(--red);color:var(--on-brand);border-color:var(--red)}
.rev-meta{font-size:12px;margin:6px 0 12px}
</style>
