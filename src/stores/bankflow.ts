import { computed } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_RULE_CONFIG,
  analyzeTransactions,
  computeOverview,
  importBankFiles,
  sanitizeRuleConfig,
  summarizeCounterparties,
  type BankBatch,
  type BankRuleConfig,
  type EnrichedTransaction,
  type ParsedFileInput,
  type ReviewDecision,
  type ReviewStatus,
} from '@/engines/bankflow'
import { seedBankBatches, seedBankDecisions } from '@/mock/bankflow'
import { addDays } from '@/engines/deadline'
import { registerSearch } from '@/app/search'
import { nowText, persisted, today, uid } from './persist'
import { useSystemStore } from './system'

export const useBankFlowStore = defineStore('bankflow', () => {
  const system = useSystemStore()

  const batches = persisted<BankBatch[]>('bankflow.batches', () => seedBankBatches())
  const currentBatchId = persisted<string>('bankflow.currentBatch', () => seedBankBatches()[0]!.id)
  const ruleConfig = persisted<BankRuleConfig>('bankflow.ruleConfig', () => DEFAULT_RULE_CONFIG())
  const decisions = persisted<Record<string, ReviewDecision>>('bankflow.decisions', () => seedBankDecisions())

  // 防止旧版本缓存导致字段缺失或非法值
  ruleConfig.value = sanitizeRuleConfig(ruleConfig.value)

  const currentBatch = computed<BankBatch>(() =>
    batches.value.find(b => b.id === currentBatchId.value) || batches.value[0]!,
  )

  const analyzed = computed<EnrichedTransaction[]>(() =>
    currentBatch.value ? analyzeTransactions(currentBatch.value.transactions, ruleConfig.value, decisions.value) : [],
  )

  /** 汇总全部批次的预警流水，供全景智能体跨库检索调用 */
  const allAlertTransactions = computed<{ batch: BankBatch; tx: EnrichedTransaction }[]>(() =>
    batches.value.flatMap(b =>
      analyzeTransactions(b.transactions, ruleConfig.value, decisions.value)
        .filter(t => t.alerts.length > 0 && t.reviewStatus !== 'excluded')
        .map(tx => ({ batch: b, tx })),
    ),
  )

  const overview = computed(() => computeOverview(analyzed.value))
  const counterparties = computed(() => summarizeCounterparties(analyzed.value))

  function selectBatch(id: string, silent = false) {
    if (currentBatchId.value === id || !batches.value.some(b => b.id === id)) return
    currentBatchId.value = id
    if (!silent) {
      const b = batches.value.find(x => x.id === id)!
      system.log('bankflow', '查看', b.name, `切换银行流水核查批次（${b.transactions.length} 笔）`)
    }
  }

  /** 按交易 ID 反查所属批次并自动定位 */
  function findBatchByTxId(txId: string): BankBatch | undefined {
    return batches.value.find(b => b.transactions.some(t => t.id === txId))
  }

  async function addImportedBatch(
    files: ParsedFileInput[],
    meta: { batchName: string; subjectName: string; subjectUnit: string },
  ) {
    const batch = await importBankFiles(files, {
      ...meta,
      batchId: uid('PC'),
      importedAt: nowText(),
    })
    if (!batch.transactions.length) {
      throw new Error('未识别到有效交易流水记录，请确认文件包含交易时间与交易金额列')
    }
    batches.value.unshift(batch)
    currentBatchId.value = batch.id
    system.log(
      'bankflow',
      '生成',
      batch.name,
      `批量导入 ${batch.cleanSummary.fileCount} 份银行流水，入库 ${batch.cleanSummary.importedRows} 笔，自动去重 ${batch.cleanSummary.duplicateRows} 笔`,
    )
    return batch
  }

  function setReview(tx: EnrichedTransaction, status: ReviewStatus, note: string): boolean {
    if (!system.can('confirm')) return false
    const cleanNote = note.trim()
    if (status === 'excluded' && !cleanNote) return false
    decisions.value[tx.id] = {
      status,
      note: cleanNote,
      by: system.user,
      time: nowText(),
    }
    const label = status === 'focus' ? '重点核查' : status === 'excluded' ? '已排除' : '待核实'
    system.log(
      'bankflow',
      '确认',
      `${tx.counterparty}（${tx.amount.toLocaleString('zh-CN')} 元）`,
      `银行流水核查标记为「${label}」${cleanNote ? `：${cleanNote}` : ''}`,
    )
    return true
  }

  function createVerifyTask(tx: EnrichedTransaction, note = '') {
    if (!system.can('task')) return null
    if (tx.reviewStatus !== 'focus' && system.can('confirm')) {
      setReview(tx, 'focus', note || tx.reviewNote || '人工标记重点核查并转核查任务')
    }
    return system.createTask({
      title: `流水核查：${currentBatch.value.subjectName} 与 ${tx.counterparty}（${tx.amount.toLocaleString('zh-CN')} 元）`,
      module: 'bankflow',
      feature: 'ledger',
      sourceId: tx.id,
      sourceLabel: `银行流水 ${tx.bank}`,
      level: tx.maxLevel || 'mid',
      assignee: '监督检查室',
      deadline: addDays(today(), tx.maxLevel === 'high' ? 7 : 15),
    })
  }

  function normalizeRules() {
    ruleConfig.value = sanitizeRuleConfig(ruleConfig.value)
  }

  function resetRules() {
    ruleConfig.value = DEFAULT_RULE_CONFIG()
  }

  registerSearch(() =>
    batches.value.flatMap(b => [
      { id: b.id, title: b.name, type: '银行流水批次', to: `/bankflow/graph?batch=${b.id}` },
    ]),
  )

  return {
    batches,
    currentBatchId,
    currentBatch,
    ruleConfig,
    decisions,
    analyzed,
    allAlertTransactions,
    overview,
    counterparties,
    selectBatch,
    findBatchByTxId,
    addImportedBatch,
    setReview,
    createVerifyTask,
    normalizeRules,
    resetRules,
  }
})
