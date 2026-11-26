/**
 * 银行流水智能分析核心引擎
 * - 多银行/第三方支付明细自动识别、字段映射、日期金额标准化与自动去重
 * - 五大纪检办案高频异常模型筛查（支持勾选开关、阈值边界清洗与实时重算）
 * - 资金总览、对手方分方向预警聚合与图谱数据生成
 */
import type { RiskLevel } from '@/types'
import { parseSpreadsheetBytes } from './bankflow-xlsx'

export type BankInstitution =
  | '工商银行'
  | '农业银行'
  | '建设银行'
  | '中国银行'
  | '邮储银行'
  | '农商行'
  | '微信支付'
  | '支付宝'
  | '其他银行'

export type FlowDirection = 'in' | 'out'

export type AlertRuleKey = 'large' | 'bridge' | 'split' | 'odd_time' | 'frequent'

export type ReviewStatus = 'pending' | 'focus' | 'excluded'

export interface BankTransaction {
  id: string
  batchId: string
  bank: BankInstitution
  sourceFile: string
  time: string // 标准格式：YYYY-MM-DD HH:mm:ss
  direction: FlowDirection
  amount: number // 正数，单位：元
  balance: number | null
  counterparty: string
  counterpartyAccount: string
  counterpartyRelation?: '亲属' | '关联人' | '企业' | '商户' | '常规机构' | '个人'
  summary: string
  channel: string
}

export interface BankFieldMapping {
  time?: string
  direction?: string
  income?: string
  expense?: string
  amount?: string
  balance?: string
  counterpartyAccount?: string
  counterparty?: string
  summary?: string
  channel?: string
}

export interface CleanSummary {
  fileCount: number
  rawRows: number
  importedRows: number
  duplicateRows: number
  fixedFormatRows: number
  skippedRows: number
  banks: BankInstitution[]
  mappings: { fileName: string; bank: BankInstitution; rawRows: number; keptRows: number; dupRows: number; mapping: BankFieldMapping }[]
}

export interface BankBatch {
  id: string
  name: string
  subjectName: string
  subjectUnit: string
  importedAt: string
  periodStart: string
  periodEnd: string
  cleanSummary: CleanSummary
  transactions: BankTransaction[]
}

export interface BankRuleConfig {
  large: { enabled: boolean; threshold: number; roundThreshold: number }
  bridge: { enabled: boolean; windowHours: number; tolerancePct: number; minAmount: number }
  split: { enabled: boolean; windowDays: number; minCount: number; minTotal: number }
  odd_time: { enabled: boolean; nightStartHour: number; nightEndHour: number; includeHolidays: boolean; minAmount: number }
  frequent: { enabled: boolean; minCount: number; minTotal: number; excludeRoutine: boolean }
}

export interface AlertHit {
  rule: AlertRuleKey
  ruleName: string
  level: RiskLevel
  reason: string
  pairedIds?: string[]
}

export interface EnrichedTransaction extends BankTransaction {
  alerts: AlertHit[]
  maxLevel: RiskLevel | null
  reviewStatus: ReviewStatus
  reviewNote: string
  reviewedBy?: string
  reviewedAt?: string
}

export interface ReviewDecision {
  status: ReviewStatus
  note: string
  by: string
  time: string
}

export interface CounterpartySummary {
  name: string
  accounts: string[]
  banks: BankInstitution[]
  relation: string
  inAmount: number
  inCount: number
  outAmount: number
  outCount: number
  totalAmount: number
  totalCount: number
  netAmount: number
  alertCount: number
  inAlertCount: number
  outAlertCount: number
  inMaxLevel: RiskLevel | null
  outMaxLevel: RiskLevel | null
  alertRules: AlertRuleKey[]
  maxLevel: RiskLevel | null
  focusCount: number
  txIds: string[]
}

export interface BankFlowOverview {
  totalIn: number
  totalOut: number
  inCount: number
  outCount: number
  netDiff: number
  counterpartyCount: number
  alertTxCount: number
  highAlertCount: number
  focusCount: number
  excludedCount: number
  ruleCounts: Record<AlertRuleKey, number>
}

export const ALERT_RULE_META: Record<AlertRuleKey, { name: string; short: string; desc: string; defaultLevel: RiskLevel }> = {
  large: {
    name: '大额整存整取 / 大额转账',
    short: '大额转账',
    desc: '单笔超过设定大额阈值，或出现较高金额的整数万/整千存取转账',
    defaultLevel: 'high',
  },
  bridge: {
    name: '快进快出 / 过桥资金',
    short: '快进快出',
    desc: '资金转入后在短时间窗口内以等额或相近金额转出，疑似中转过桥',
    defaultLevel: 'high',
  },
  split: {
    name: '化整为零 / 拆分规避',
    short: '拆分规避',
    desc: '同一对手方在短期内多笔低于大额阈值的转账且累计金额较高',
    defaultLevel: 'high',
  },
  odd_time: {
    name: '特定时段交易',
    short: '特定时段',
    desc: '深夜时段或春节、中秋、国庆等敏感节点发生较大额资金转账',
    defaultLevel: 'mid',
  },
  frequent: {
    name: '高频重点往来',
    short: '高频往来',
    desc: '与同一非亲属对手方或特定企业存在高频或大额资金往来',
    defaultLevel: 'mid',
  },
}

export const ALERT_RULE_ORDER: AlertRuleKey[] = ['large', 'bridge', 'split', 'odd_time', 'frequent']

export const DEFAULT_RULE_CONFIG = (): BankRuleConfig => ({
  large: { enabled: true, threshold: 50000, roundThreshold: 20000 },
  bridge: { enabled: true, windowHours: 24, tolerancePct: 5, minAmount: 10000 },
  split: { enabled: true, windowDays: 7, minCount: 3, minTotal: 50000 },
  odd_time: { enabled: true, nightStartHour: 23, nightEndHour: 5, includeHolidays: true, minAmount: 3000 },
  frequent: { enabled: true, minCount: 4, minTotal: 80000, excludeRoutine: true },
})

function clampNum(raw: unknown, fallback: number, min: number, max: number): number {
  if (raw === '' || raw === null || raw === undefined) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** 清洗并规范化规则配置，防止清空输入框、NaN、0 或旧版本缓存字段缺失引发误报 */
export function sanitizeRuleConfig(raw?: Partial<BankRuleConfig> | null): BankRuleConfig {
  const def = DEFAULT_RULE_CONFIG()
  const c = raw || {}
  return {
    large: {
      enabled: c.large?.enabled ?? def.large.enabled,
      threshold: clampNum(c.large?.threshold, def.large.threshold, 1000, 100000000),
      roundThreshold: clampNum(c.large?.roundThreshold, def.large.roundThreshold, 1000, 100000000),
    },
    bridge: {
      enabled: c.bridge?.enabled ?? def.bridge.enabled,
      windowHours: clampNum(c.bridge?.windowHours, def.bridge.windowHours, 1, 168),
      tolerancePct: clampNum(c.bridge?.tolerancePct, def.bridge.tolerancePct, 0, 30),
      minAmount: clampNum(c.bridge?.minAmount, def.bridge.minAmount, 1000, 100000000),
    },
    split: {
      enabled: c.split?.enabled ?? def.split.enabled,
      windowDays: clampNum(c.split?.windowDays, def.split.windowDays, 1, 60),
      minCount: Math.round(clampNum(c.split?.minCount, def.split.minCount, 2, 50)),
      minTotal: clampNum(c.split?.minTotal, def.split.minTotal, 5000, 100000000),
    },
    odd_time: {
      enabled: c.odd_time?.enabled ?? def.odd_time.enabled,
      nightStartHour: Math.round(clampNum(c.odd_time?.nightStartHour, def.odd_time.nightStartHour, 19, 23)),
      nightEndHour: Math.round(clampNum(c.odd_time?.nightEndHour, def.odd_time.nightEndHour, 1, 9)),
      includeHolidays: c.odd_time?.includeHolidays ?? def.odd_time.includeHolidays,
      minAmount: clampNum(c.odd_time?.minAmount, def.odd_time.minAmount, 500, 100000000),
    },
    frequent: {
      enabled: c.frequent?.enabled ?? def.frequent.enabled,
      minCount: Math.round(clampNum(c.frequent?.minCount, def.frequent.minCount, 2, 100)),
      minTotal: clampNum(c.frequent?.minTotal, def.frequent.minTotal, 5000, 100000000),
      excludeRoutine: c.frequent?.excludeRoutine ?? def.frequent.excludeRoutine,
    },
  }
}

/** 2025–2026 纪检监督关注敏感节假日窗口 */
const SENSITIVE_HOLIDAYS: { label: string; start: string; end: string }[] = [
  { label: '2025年春节前夕及假期', start: '2025-01-20', end: '2025-02-06' },
  { label: '2025年端午节', start: '2025-05-29', end: '2025-06-02' },
  { label: '2025年中秋国庆节点', start: '2025-09-25', end: '2025-10-08' },
  { label: '2026年元旦', start: '2025-12-30', end: '2026-01-03' },
  { label: '2026年春节前夕及假期', start: '2026-02-08', end: '2026-02-24' },
  { label: '2026年端午节', start: '2026-06-17', end: '2026-06-21' },
  { label: '2026年中秋节节点', start: '2026-09-20', end: '2026-09-27' },
  { label: '2026年国庆节节点', start: '2026-09-29', end: '2026-10-07' },
]

// ───────── 字段识别、银行判断与数据清洗 ─────────

const BANK_SIGNATURES: { bank: BankInstitution; patterns: RegExp[] }[] = [
  { bank: '工商银行', patterns: [/工商|工行|ICBC/i] },
  { bank: '农业银行', patterns: [/农业银行|农行|ABC/i] },
  { bank: '建设银行', patterns: [/建设银行|建行|CCB/i] },
  { bank: '中国银行', patterns: [/中国银行|中行|BOC/i] },
  { bank: '邮储银行', patterns: [/邮储|邮政储蓄|PSBC/i] },
  { bank: '农商行', patterns: [/农商|农村商业|农村信用|信合|SDRCB/i] },
  { bank: '微信支付', patterns: [/微信|财付通|wechat|零钱通/i] },
  { bank: '支付宝', patterns: [/支付宝|alipay|余额宝/i] },
]

/** 注意：更具体的分列字段（income/expense/counterpartyAccount）必须排在通用字段（amount/counterparty）之前 */
const FIELD_ALIASES: [keyof BankFieldMapping, RegExp[]][] = [
  ['time', [/交易时间|记账时间|交易日期|记账日期|发生时间|入账时间|创建时间|付款时间/]],
  ['direction', [/借贷方向|收\/支|收支|借贷标志|交易方向|资金流向|方向/]],
  ['income', [/贷方发生额|收入金额|转入金额|存入金额|贷方金额|^收入$|^贷方$/]],
  ['expense', [/借方发生额|支出金额|转出金额|支取金额|借方金额|^支出$|^借方$/]],
  ['amount', [/^(?!.*(借方|贷方|收入|支出|转入|转出|存入|支取|余额)).*(交易金额|发生额|金额\(元\)|金额（元）|交易额|^金额$)/]],
  ['balance', [/账户余额|本次余额|交易后余额|当前余额|余额/]],
  ['counterpartyAccount', [/对方账号|对方卡号|对方账户(?!名)|对手账号|交易对方账号|对方银行卡/]],
  ['counterparty', [/对方户名|对方名称|交易对方|对方姓名|收付款人|对手方|商户名称|对方账户名/]],
  ['summary', [/交易摘要|摘要|附言|备注|用途|商品说明|商品名称|交易说明|业务摘要/]],
  ['channel', [/交易渠道|渠道|支付方式|交易方式|网点名称|交易类型|终端/]],
]

export function detectBank(fileName: string, previewText: string): BankInstitution {
  const joined = `${fileName} ${previewText}`
  for (const sig of BANK_SIGNATURES) {
    if (sig.patterns.some(p => p.test(joined))) return sig.bank
  }
  return '其他银行'
}

export function detectHeaderRowAndMapping(rows: string[][]): { headerIndex: number; mapping: BankFieldMapping; colIndex: Partial<Record<keyof BankFieldMapping, number>> } {
  let bestIdx = 0
  let bestScore = -1
  let bestMapping: BankFieldMapping = {}
  let bestCols: Partial<Record<keyof BankFieldMapping, number>> = {}

  const limit = Math.min(rows.length, 25)
  for (let i = 0; i < limit; i++) {
    const r = rows[i]!
    const mapping: BankFieldMapping = {}
    const cols: Partial<Record<keyof BankFieldMapping, number>> = {}
    let score = 0

    r.forEach((cell, ci) => {
      const text = cell.replace(/\s+/g, '')
      if (!text) return
      for (const [field, regs] of FIELD_ALIASES) {
        if (cols[field] !== undefined) continue
        if (regs.some(re => re.test(text))) {
          cols[field] = ci
          mapping[field] = cell.trim()
          score += (field === 'time' || field === 'amount' || field === 'income' || field === 'expense' || field === 'counterparty') ? 3 : 1
          break
        }
      }
    })
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
      bestMapping = mapping
      bestCols = cols
    }
  }
  return { headerIndex: bestIdx, mapping: bestMapping, colIndex: bestCols }
}

/** 标准化日期时间为 YYYY-MM-DD HH:mm:ss */
export function normalizeDateTime(raw: string): { value: string; fixed: boolean } | null {
  const s = String(raw || '').trim()
  if (!s) return null

  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const num = Number(s)
    if (num > 30000 && num < 70000) {
      const ms = Math.round((num - 25569) * 86400 * 1000)
      const d = new Date(ms)
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0')
        const value = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
        return { value, fixed: true }
      }
    }
  }

  const compact = /^(\d{4})(\d{2})(\d{2})(?:[\sT]?(\d{2})(\d{2})(\d{2})?)?$/.exec(s)
  if (compact) {
    const value = `${compact[1]}-${compact[2]}-${compact[3]} ${compact[4] || '00'}:${compact[5] || '00'}:${compact[6] || '00'}`
    return { value, fixed: true }
  }

  const norm = s.replace(/[年月]/g, '-').replace(/日/g, '').replace(/\./g, '-').replace(/\//g, '-').replace('T', ' ').trim()
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(norm)
  if (!m) return null
  const pad = (n: string | undefined, fb = '00') => (n ?? fb).padStart(2, '0')
  const value = `${m[1]}-${pad(m[2])}-${pad(m[3])} ${pad(m[4])}:${pad(m[5])}:${pad(m[6])}`
  return { value, fixed: value !== s }
}

/** 标准化金额数字 */
export function normalizeAmount(raw: string): { value: number; fixed: boolean } | null {
  const s = String(raw ?? '').trim()
  if (!s || s === '-' || s === '--' || s === '—') return null
  const cleaned = s.replace(/[¥￥元,\s]/g, '').replace(/^\+/, '')
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return { value: Math.round(n * 100) / 100, fixed: cleaned !== s || /[¥￥,]/.test(s) }
}

function inferDirection(rawDir: string, signedAmount: number | null, hasIncome: boolean, hasExpense: boolean): FlowDirection {
  const d = (rawDir || '').trim()
  if (/收入|转入|存入|贷|收款|入账|\+|CR|C$/i.test(d)) return 'in'
  if (/支出|转出|支取|借|付款|扣款|消费|-|DR|D$/i.test(d)) return 'out'
  if (hasIncome && !hasExpense) return 'in'
  if (hasExpense && !hasIncome) return 'out'
  if (signedAmount !== null && signedAmount < 0) return 'out'
  return 'in'
}

export function inferRelation(name: string, summary: string): BankTransaction['counterpartyRelation'] {
  const text = `${name} ${summary}`
  if (/工资|代发|财政|社保|公积金|供电|自来水|燃气|移动|联通|电信|税务|物业|医院|学校|电力/.test(text)) return '常规机构'
  if (/公司|商贸|建材|建筑|工程|合作社|服务社|劳务|装饰|机械|科技|酒店|餐饮|实业|有限|商行|经销部|酒业|事务所|中心|工作室|经营部/.test(name)) return '企业'
  if (/超市|加油站|药房|便利店|商城|电商|美团|滴滴|铁路|航空/.test(name)) return '商户'
  return '个人'
}

export interface ParsedFileInput {
  fileName: string
  bytes: Uint8Array
}

/** 批量解析、清洗并合并多份银行流水文件 */
export async function importBankFiles(
  files: ParsedFileInput[],
  meta: { batchName: string; subjectName: string; subjectUnit: string; batchId?: string; importedAt: string },
): Promise<BankBatch> {
  const batchId = meta.batchId || `PC-${Date.now().toString(36).toUpperCase()}`
  const seen = new Set<string>()
  const transactions: BankTransaction[] = []
  const bankSet = new Set<BankInstitution>()
  const mappings: CleanSummary['mappings'] = []

  let rawRows = 0
  let duplicateRows = 0
  let fixedFormatRows = 0
  let skippedRows = 0

  for (const file of files) {
    const grid = await parseSpreadsheetBytes(file.bytes, file.fileName)
    if (grid.length < 2) continue

    const preview = grid.slice(0, 6).map(r => r.join(' ')).join(' ')
    const bank = detectBank(file.fileName, preview)
    bankSet.add(bank)

    const { headerIndex, mapping, colIndex } = detectHeaderRowAndMapping(grid)
    let fileRaw = 0
    let fileKept = 0
    let fileDup = 0

    for (let i = headerIndex + 1; i < grid.length; i++) {
      const row = grid[i]!
      if (row.every(c => !c)) continue
      const firstCell = row[0] || ''
      if (/^(合计|总计|小计|统计|制表|打印|备注说明)/.test(firstCell)) continue

      fileRaw++
      rawRows++

      const get = (k: keyof BankFieldMapping) => (colIndex[k] !== undefined ? (row[colIndex[k]!] || '').trim() : '')
      const dt = normalizeDateTime(get('time'))
      if (!dt) { skippedRows++; continue }

      const inc = colIndex.income !== undefined ? normalizeAmount(get('income')) : null
      const exp = colIndex.expense !== undefined ? normalizeAmount(get('expense')) : null
      const amt = colIndex.amount !== undefined ? normalizeAmount(get('amount')) : null

      let amount = 0
      let fixed = dt.fixed
      let signedAmt: number | null = null
      const hasInc = Boolean(inc && inc.value !== 0)
      const hasExp = Boolean(exp && exp.value !== 0)

      if (hasInc && !hasExp) { amount = Math.abs(inc!.value); fixed = fixed || inc!.fixed }
      else if (hasExp && !hasInc) { amount = Math.abs(exp!.value); fixed = fixed || exp!.fixed }
      else if (amt && amt.value !== 0) { signedAmt = amt.value; amount = Math.abs(amt.value); fixed = fixed || amt.fixed }
      else { skippedRows++; continue }

      const direction = inferDirection(get('direction'), signedAmt, hasInc, hasExp)
      const bal = colIndex.balance !== undefined ? normalizeAmount(get('balance')) : null
      const counterparty = get('counterparty') || '未披露对手方'
      const counterpartyAccount = get('counterpartyAccount') || '—'
      const summary = get('summary') || (direction === 'in' ? '转入资金' : '转出资金')
      const channel = get('channel') || (bank === '微信支付' ? '微信转账' : bank === '支付宝' ? '支付宝转账' : '网银 / 手机银行')

      const dedupeKey = [
        bank,
        dt.value,
        direction,
        amount.toFixed(2),
        counterparty,
        counterpartyAccount,
        bal ? bal.value.toFixed(2) : summary.slice(0, 16),
      ].join('|')

      if (seen.has(dedupeKey)) {
        duplicateRows++
        fileDup++
        continue
      }
      seen.add(dedupeKey)
      if (fixed) fixedFormatRows++

      fileKept++
      transactions.push({
        id: `${batchId}-${String(transactions.length + 1).padStart(4, '0')}`,
        batchId,
        bank,
        sourceFile: file.fileName,
        time: dt.value,
        direction,
        amount,
        balance: bal ? bal.value : null,
        counterparty,
        counterpartyAccount,
        counterpartyRelation: inferRelation(counterparty, summary),
        summary,
        channel,
      })
    }

    mappings.push({ fileName: file.fileName, bank, rawRows: fileRaw, keptRows: fileKept, dupRows: fileDup, mapping })
  }

  transactions.sort((a, b) => b.time.localeCompare(a.time))
  const dates = transactions.map(t => t.time.slice(0, 10)).sort()

  return {
    id: batchId,
    name: meta.batchName.trim() || `${meta.subjectName || '核查对象'}流水批次`,
    subjectName: meta.subjectName.trim() || '被核查对象',
    subjectUnit: meta.subjectUnit.trim() || '核查对象所属单位',
    importedAt: meta.importedAt,
    periodStart: dates[0] || meta.importedAt.slice(0, 10),
    periodEnd: dates[dates.length - 1] || meta.importedAt.slice(0, 10),
    cleanSummary: {
      fileCount: files.length,
      rawRows,
      importedRows: transactions.length,
      duplicateRows,
      fixedFormatRows,
      skippedRows,
      banks: [...bankSet],
      mappings,
    },
    transactions,
  }
}

// ───────── 五大纪检异常模型筛查引擎 ─────────

function toEpochMs(ts: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(ts)
  if (!m) return 0
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0)).getTime()
}

export function fmtWan(amount: number): string {
  return amount >= 10000
    ? `${(Math.round(amount / 100) / 100).toFixed(amount % 10000 === 0 ? 0 : 2)} 万元`
    : `${amount.toLocaleString('zh-CN')} 元`
}

export function fmtWanNumber(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  return `${sign}${(Math.round(abs / 100) / 100).toFixed(2)}`
}

function fmtHours(ms: number): string {
  const hours = Math.max(0.05, ms / 3600000)
  return hours < 1 ? `${Math.max(1, Math.round(hours * 60))} 分钟` : `${hours.toFixed(1)} 小时`
}

function isRoutineTransaction(tx: BankTransaction): boolean {
  if (tx.counterpartyRelation === '亲属' || tx.counterpartyRelation === '常规机构') return true
  return /工资|薪资|公积金|社保|水电|燃气|话费|房贷|税费|食堂|物业|超市/.test(`${tx.counterparty} ${tx.summary}`)
}

function matchHoliday(dateStr: string): string | null {
  for (const h of SENSITIVE_HOLIDAYS) {
    if (dateStr >= h.start && dateStr <= h.end) return h.label
  }
  return null
}

/** 受限深度（2~4 笔）子集搜索，解决多笔拆出过桥时单趟贪心漏判 */
function findBridgeSubset(candidates: BankTransaction[], target: number, tol: number): BankTransaction[] | null {
  const pool = candidates.slice(0, 12)
  const low = target * (1 - tol)
  const high = target * (1 + tol)
  let best: BankTransaction[] | null = null
  let bestDiff = Infinity

  function dfs(idx: number, picked: BankTransaction[], sum: number) {
    if (picked.length >= 2 && sum >= low && sum <= high) {
      const diff = Math.abs(sum - target)
      if (diff < bestDiff) { bestDiff = diff; best = [...picked] }
    }
    if (picked.length >= 4 || sum > high) return
    for (let i = idx; i < pool.length; i++) {
      const item = pool[i]!
      if (sum + item.amount > high) continue
      picked.push(item)
      dfs(i + 1, picked, sum + item.amount)
      picked.pop()
    }
  }
  dfs(0, [], 0)
  return best
}

const LEVEL_WEIGHT: Record<RiskLevel, number> = { high: 3, mid: 2, low: 1 }

/** 运行五大纪检异常模型并合并人工核查标记 */
export function analyzeTransactions(
  transactions: BankTransaction[],
  rawConfig: BankRuleConfig,
  decisions: Record<string, ReviewDecision> = {},
): EnrichedTransaction[] {
  const config = sanitizeRuleConfig(rawConfig)
  const hitMap = new Map<string, AlertHit[]>()
  const addHit = (id: string, hit: AlertHit) => {
    const list = hitMap.get(id) || []
    const existing = list.find(x => x.rule === hit.rule)
    if (!existing) {
      list.push(hit)
      hitMap.set(id, list)
    } else if (hit.pairedIds?.length) {
      const merged = new Set([...(existing.pairedIds || []), ...hit.pairedIds])
      merged.delete(id)
      existing.pairedIds = [...merged]
    }
  }

  // 同时间戳时收入排在支出前，避免仅含日期的同日快进快出漏判
  const chrono = [...transactions].sort(
    (a, b) => toEpochMs(a.time) - toEpochMs(b.time) || (a.direction === 'in' ? 0 : 1) - (b.direction === 'in' ? 0 : 1),
  )

  // 1. 大额整存整取 / 大额转账
  if (config.large.enabled) {
    const { threshold, roundThreshold } = config.large
    for (const tx of chrono) {
      if (tx.counterpartyRelation === '常规机构' && /工资|公积金|代发/.test(tx.summary)) continue
      const isOver = tx.amount >= threshold
      const isRound = tx.amount >= roundThreshold && tx.amount % 10000 === 0
      const isNearRound = tx.amount >= roundThreshold && tx.amount % 5000 === 0 && /现金|整存|整取|取现|存入/.test(`${tx.summary} ${tx.channel}`)
      if (isOver || isRound || isNearRound) {
        const reasons: string[] = []
        if (isOver) reasons.push(`单笔达到 ${fmtWan(tx.amount)}（超设定阈值 ${fmtWan(threshold)}）`)
        if (isRound) reasons.push(`整数万元${tx.direction === 'in' ? '转入' : '转出'}`)
        else if (isNearRound) reasons.push('整额现金存取')
        addHit(tx.id, {
          rule: 'large',
          ruleName: ALERT_RULE_META.large.short,
          level: isOver ? 'high' : 'mid',
          reason: reasons.join('，'),
        })
      }
    }
  }

  // 2. 快进快出 / 过桥资金
  if (config.bridge.enabled) {
    const winMs = config.bridge.windowHours * 3600 * 1000
    const tol = config.bridge.tolerancePct / 100
    const minAmt = config.bridge.minAmount
    const usedOut = new Set<string>()

    for (let i = 0; i < chrono.length; i++) {
      const inflow = chrono[i]!
      if (inflow.direction !== 'in' || inflow.amount < minAmt || isRoutineTransaction(inflow)) continue
      const tIn = toEpochMs(inflow.time)

      let matchedSingle: BankTransaction | null = null
      for (let j = i + 1; j < chrono.length; j++) {
        const out = chrono[j]!
        const dt = toEpochMs(out.time) - tIn
        if (dt > winMs) break
        if (out.direction !== 'out' || usedOut.has(out.id) || isRoutineTransaction(out)) continue
        const diffRatio = Math.abs(out.amount - inflow.amount) / inflow.amount
        if (diffRatio <= tol) {
          matchedSingle = out
          break
        }
      }

      if (matchedSingle) {
        usedOut.add(matchedSingle.id)
        const timeText = fmtHours(toEpochMs(matchedSingle.time) - tIn)
        const ratioDiff = Math.abs(matchedSingle.amount - inflow.amount)
        const diffDesc = ratioDiff === 0 ? '等额转出' : `差额仅 ${ratioDiff.toLocaleString('zh-CN')} 元`
        const sameParty = matchedSingle.counterparty === inflow.counterparty
        const lv: RiskLevel = sameParty ? 'mid' : 'high'
        addHit(inflow.id, {
          rule: 'bridge',
          ruleName: ALERT_RULE_META.bridge.short,
          level: lv,
          reason: sameParty
            ? `转入后 ${timeText} 内向同一对手方原路转回（${fmtWan(matchedSingle.amount)}），需核实是否退款或走账`
            : `转入后 ${timeText} 内向「${matchedSingle.counterparty}」${diffDesc}（${fmtWan(matchedSingle.amount)}）`,
          pairedIds: [matchedSingle.id],
        })
        addHit(matchedSingle.id, {
          rule: 'bridge',
          ruleName: ALERT_RULE_META.bridge.short,
          level: lv,
          reason: sameParty
            ? `与 ${timeText} 前「${inflow.counterparty}」转入资金（${fmtWan(inflow.amount)}）构成短时原路往返`
            : `承接「${inflow.counterparty}」${timeText} 前转入资金（${fmtWan(inflow.amount)}），疑似过桥中转`,
          pairedIds: [inflow.id],
        })
        continue
      }

      const windowOuts = chrono
        .slice(i + 1)
        .filter(o =>
          o.direction === 'out'
          && !usedOut.has(o.id)
          && !isRoutineTransaction(o)
          && toEpochMs(o.time) - tIn <= winMs
          && o.amount >= minAmt * 0.2,
        )
      if (windowOuts.length >= 2) {
        const picked = findBridgeSubset(windowOuts, inflow.amount, tol)
        if (picked && picked.length >= 2) {
          const sum = picked.reduce((s, p) => s + p.amount, 0)
          const lastText = fmtHours(toEpochMs(picked[picked.length - 1]!.time) - tIn)
          const pIds = picked.map(p => p.id)
          pIds.forEach(id => usedOut.add(id))
          addHit(inflow.id, {
            rule: 'bridge',
            ruleName: ALERT_RULE_META.bridge.short,
            level: 'high',
            reason: `转入后 ${lastText} 内分 ${picked.length} 笔集中转出合计 ${fmtWan(sum)}，疑似拆转过桥`,
            pairedIds: pIds,
          })
          for (const p of picked) {
            addHit(p.id, {
              rule: 'bridge',
              ruleName: ALERT_RULE_META.bridge.short,
              level: 'high',
              reason: `与同窗 ${picked.length} 笔转出合计 ${fmtWan(sum)}，对应「${inflow.counterparty}」转入 ${fmtWan(inflow.amount)}`,
              pairedIds: [inflow.id, ...pIds.filter(id => id !== p.id)],
            })
          }
        }
      }
    }
  }

  // 3. 化整为零 / 拆分规避
  if (config.split.enabled) {
    const winMs = config.split.windowDays * 86400 * 1000
    const { minCount, minTotal } = config.split
    const upperCap = config.large.threshold
    const byCounterparty = new Map<string, BankTransaction[]>()

    for (const tx of chrono) {
      if (isRoutineTransaction(tx)) continue
      if (tx.amount >= upperCap) continue
      const key = `${tx.counterparty}|${tx.direction}`
      const arr = byCounterparty.get(key) || []
      arr.push(tx)
      byCounterparty.set(key, arr)
    }

    for (const group of byCounterparty.values()) {
      if (group.length < minCount) continue
      for (let i = 0; i < group.length; i++) {
        const t0 = toEpochMs(group[i]!.time)
        const win = group.filter((x, idx) => idx >= i && toEpochMs(x.time) - t0 <= winMs)
        const total = win.reduce((s, x) => s + x.amount, 0)
        if (win.length >= minCount && total >= minTotal) {
          const ids = win.map(x => x.id)
          const dirLabel = win[0]!.direction === 'in' ? '转入' : '转出'
          for (const tx of win) {
            addHit(tx.id, {
              rule: 'split',
              ruleName: ALERT_RULE_META.split.short,
              level: 'high',
              reason: `${config.split.windowDays} 日内与「${tx.counterparty}」分 ${win.length} 笔${dirLabel}累计 ${fmtWan(total)}，单笔均低于 ${fmtWan(upperCap)}`,
              pairedIds: ids.filter(id => id !== tx.id),
            })
          }
        }
      }
    }
  }

  // 4. 特定时段交易（深夜 / 敏感节假日）
  if (config.odd_time.enabled) {
    const { nightStartHour, nightEndHour, includeHolidays, minAmount } = config.odd_time
    for (const tx of chrono) {
      if (tx.amount < minAmount) continue
      if (isRoutineTransaction(tx)) continue
      const hour = Number(tx.time.slice(11, 13))
      const isNight = nightStartHour > nightEndHour
        ? (hour >= nightStartHour || hour < nightEndHour)
        : (hour >= nightStartHour && hour < nightEndHour)
      const holiday = includeHolidays ? matchHoliday(tx.time.slice(0, 10)) : null

      if (isNight || holiday) {
        const parts: string[] = []
        if (isNight) parts.push(`深夜 ${tx.time.slice(11, 16)} 转账`)
        if (holiday) parts.push(`处于${holiday}敏感节点`)
        addHit(tx.id, {
          rule: 'odd_time',
          ruleName: ALERT_RULE_META.odd_time.short,
          level: isNight && holiday ? 'high' : 'mid',
          reason: `${parts.join('且')}，交易金额 ${fmtWan(tx.amount)}`,
        })
      }
    }
  }

  // 5. 高频重点往来（非亲属 / 特定企业）
  if (config.frequent.enabled) {
    const { minCount, minTotal, excludeRoutine } = config.frequent
    const byName = new Map<string, BankTransaction[]>()
    for (const tx of chrono) {
      if (excludeRoutine && isRoutineTransaction(tx)) continue
      const arr = byName.get(tx.counterparty) || []
      arr.push(tx)
      byName.set(tx.counterparty, arr)
    }
    for (const [name, list] of byName.entries()) {
      const total = list.reduce((s, x) => s + x.amount, 0)
      if (list.length >= minCount && total >= minTotal) {
        const isCorp = list.some(x => x.counterpartyRelation === '企业')
        const level: RiskLevel = total >= minTotal * 2 || isCorp ? 'high' : 'mid'
        for (const tx of list) {
          addHit(tx.id, {
            rule: 'frequent',
            ruleName: ALERT_RULE_META.frequent.short,
            level,
            reason: `与${isCorp ? '特定企业' : '非亲属对象'}「${name}」累计往来 ${list.length} 笔、总额 ${fmtWan(total)}`,
          })
        }
      }
    }
  }

  return transactions.map(tx => {
    const alerts = hitMap.get(tx.id) || []
    const maxLevel = alerts.reduce<RiskLevel | null>((best, h) => {
      if (!best) return h.level
      return LEVEL_WEIGHT[h.level] > LEVEL_WEIGHT[best] ? h.level : best
    }, null)
    const dec = decisions[tx.id]
    return {
      ...tx,
      alerts,
      maxLevel,
      reviewStatus: dec?.status || 'pending',
      reviewNote: dec?.note || '',
      reviewedBy: dec?.by,
      reviewedAt: dec?.time,
    }
  })
}

/** 汇总资金总览指标 */
export function computeOverview(rows: EnrichedTransaction[]): BankFlowOverview {
  let totalIn = 0
  let totalOut = 0
  let inCount = 0
  let outCount = 0
  let alertTxCount = 0
  let highAlertCount = 0
  let focusCount = 0
  let excludedCount = 0
  const counterparties = new Set<string>()
  const ruleCounts: Record<AlertRuleKey, number> = { large: 0, bridge: 0, split: 0, odd_time: 0, frequent: 0 }

  for (const r of rows) {
    counterparties.add(r.counterparty)
    if (r.direction === 'in') { totalIn += r.amount; inCount++ }
    else { totalOut += r.amount; outCount++ }

    if (r.alerts.length) {
      alertTxCount++
      if (r.maxLevel === 'high') highAlertCount++
      for (const h of r.alerts) ruleCounts[h.rule]++
    }
    if (r.reviewStatus === 'focus') focusCount++
    else if (r.reviewStatus === 'excluded') excludedCount++
  }

  return {
    totalIn: Math.round(totalIn * 100) / 100,
    totalOut: Math.round(totalOut * 100) / 100,
    inCount,
    outCount,
    netDiff: Math.round((totalIn - totalOut) * 100) / 100,
    counterpartyCount: counterparties.size,
    alertTxCount,
    highAlertCount,
    focusCount,
    excludedCount,
    ruleCounts,
  }
}

/** 按对手方聚合，分方向统计预警，驱动穿透图谱、对手方排行及底稿导出 */
export function summarizeCounterparties(rows: EnrichedTransaction[]): CounterpartySummary[] {
  const map = new Map<string, CounterpartySummary>()
  for (const r of rows) {
    let item = map.get(r.counterparty)
    if (!item) {
      item = {
        name: r.counterparty,
        accounts: [],
        banks: [],
        relation: r.counterpartyRelation || '个人',
        inAmount: 0,
        inCount: 0,
        outAmount: 0,
        outCount: 0,
        totalAmount: 0,
        totalCount: 0,
        netAmount: 0,
        alertCount: 0,
        inAlertCount: 0,
        outAlertCount: 0,
        inMaxLevel: null,
        outMaxLevel: null,
        alertRules: [],
        maxLevel: null,
        focusCount: 0,
        txIds: [],
      }
      map.set(r.counterparty, item)
    }
    if (r.counterpartyAccount && r.counterpartyAccount !== '—' && !item.accounts.includes(r.counterpartyAccount)) {
      item.accounts.push(r.counterpartyAccount)
    }
    if (!item.banks.includes(r.bank)) item.banks.push(r.bank)
    if (r.direction === 'in') { item.inAmount += r.amount; item.inCount++ }
    else { item.outAmount += r.amount; item.outCount++ }
    item.totalAmount += r.amount
    item.totalCount++
    item.netAmount = Math.round((item.inAmount - item.outAmount) * 100) / 100
    item.txIds.push(r.id)

    if (r.alerts.length) {
      item.alertCount++
      if (r.direction === 'in') item.inAlertCount++
      else item.outAlertCount++
      for (const h of r.alerts) {
        if (!item.alertRules.includes(h.rule)) item.alertRules.push(h.rule)
        if (!item.maxLevel || LEVEL_WEIGHT[h.level] > LEVEL_WEIGHT[item.maxLevel]) item.maxLevel = h.level
        if (r.direction === 'in') {
          if (!item.inMaxLevel || LEVEL_WEIGHT[h.level] > LEVEL_WEIGHT[item.inMaxLevel]) item.inMaxLevel = h.level
        } else if (!item.outMaxLevel || LEVEL_WEIGHT[h.level] > LEVEL_WEIGHT[item.outMaxLevel]) {
          item.outMaxLevel = h.level
        }
      }
    }
    if (r.reviewStatus === 'focus') item.focusCount++
  }

  return [...map.values()]
    .map(c => ({
      ...c,
      inAmount: Math.round(c.inAmount * 100) / 100,
      outAmount: Math.round(c.outAmount * 100) / 100,
      totalAmount: Math.round(c.totalAmount * 100) / 100,
    }))
    .sort((a, b) => (b.alertCount > 0 ? 1 : 0) - (a.alertCount > 0 ? 1 : 0) || b.totalAmount - a.totalAmount)
}
