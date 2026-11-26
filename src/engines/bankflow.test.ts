import { describe, expect, it } from 'vitest'
import { deflateRawSync } from 'node:zlib'
import {
  DEFAULT_RULE_CONFIG,
  analyzeTransactions,
  computeOverview,
  importBankFiles,
  inferRelation,
  normalizeAmount,
  normalizeDateTime,
  sanitizeRuleConfig,
  summarizeCounterparties,
  type BankTransaction,
} from './bankflow'
import { buildWorkbookXlsx, parseSpreadsheetBytes } from './bankflow-xlsx'
import { buildBankAgentContext, buildBankAgentLocalReport, buildBankAgentPrompt } from './bankflow-agent'
import { collectDossier } from './dossier'
import { buildDemoImportFiles, seedBankBatches, seedBankDecisions } from '@/mock/bankflow'

/** 构造真实 Deflate（method 8）压缩的 .xlsx 字节流，含大体积工作表、sharedStrings（含 rPh）和自闭合空单元格 */
function buildDeflatedXlsxFixture(rowCount: number): Uint8Array {
  const enc = new TextEncoder()
  const sharedStrings = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="4" uniqueCount="4">
  <si><t>交易时间</t></si>
  <si><t>借方发生额</t><rPh sb="0" eb="2"><t>jie</t></rPh></si>
  <si><t>贷方发生额</t></si>
  <si><t>夏润建设工程有限公司</t></si>
</sst>`

  const rows: string[] = [
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="inlineStr"><is><t>对方户名</t></is></c></row>',
    '<row r="2"/>',
  ]
  for (let i = 0; i < rowCount; i++) {
    const r = i + 3
    // 故意在 B 列放自闭合空单元格 <c r="B3" s="3"/>，考验解析器不吞列错位
    const isIn = i % 2 === 0
    const bCell = isIn ? `<c r="B${r}" s="3"/>` : `<c r="B${r}"><v>${10000 + i}</v></c>`
    const cCell = isIn ? `<c r="C${r}"><v>${50000 + i}</v></c>` : `<c r="C${r}" s="3"/>`
    rows.push(`<row r="${r}"><c r="A${r}" t="inlineStr"><is><t>2026-09-22 10:${String(i % 60).padStart(2, '0')}:00</t></is></c>${bCell}${cCell}<c r="D${r}" t="s"><v>3</v></c></row>`)
  }
  const sheetXml = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join('')}</sheetData></worksheet>`

  const entries = [
    { name: 'xl/sharedStrings.xml', raw: enc.encode(sharedStrings) },
    { name: 'xl/worksheets/sheet1.xml', raw: enc.encode(sheetXml) },
  ]

  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const e of entries) {
    const nameBytes = enc.encode(e.name)
    const comp = new Uint8Array(deflateRawSync(e.raw))
    const local = new Uint8Array(30 + nameBytes.length + comp.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(8, 8, true) // DEFLATE
    lv.setUint32(18, comp.length, true)
    lv.setUint32(22, e.raw.length, true)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    local.set(comp, 30 + nameBytes.length)
    locals.push(local)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(10, 8, true) // DEFLATE
    cv.setUint32(20, comp.length, true)
    cv.setUint32(24, e.raw.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centrals.push(central)
    offset += local.length
  }
  const cSize = centrals.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, cSize, true)
  ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + cSize + 22)
  let p = 0
  for (const l of locals) { out.set(l, p); p += l.length }
  for (const c of centrals) { out.set(c, p); p += c.length }
  out.set(eocd, p)
  return out
}

describe('bankflow xlsx & csv parser / exporter', () => {
  it('builds a valid multi-sheet xlsx workbook with control-char stripping and reads back sheet1', async () => {
    const bytes = buildWorkbookXlsx([
      {
        name: '筛选流水明细',
        headers: ['交易时间', '借贷方向', '交易金额(元)', '对方户名', '交易摘要'],
        rows: [
          ['2026-09-22 15:10:00', '收入', 120000, '鲁北工程\x00有限公司', '工程款结算 & 验收'],
          ['2026-09-22 20:00:00', '支出', 500, '孙某亮', '往来周转'],
        ],
      },
      { name: '异常预警线索清单', headers: ['对手方', '规则'], rows: [['鲁北工程有限公司', '大额转账']] },
      { name: '异常预警线索清单', headers: ['对手方', '笔数'], rows: [['鲁北工程有限公司', 1200]] },
    ])
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
    const parsed = await parseSpreadsheetBytes(bytes, 'test.xlsx')
    expect(parsed.length).toBe(3)
    expect(parsed[1]?.[3]).toBe('鲁北工程有限公司')
    expect(parsed[1]?.[4]).toBe('工程款结算 & 验收')
  })

  it('inflates >64KB deflated xlsx without deadlock and preserves self-closing empty cells + strips rPh', async () => {
    // 600 行解压后 XML > 110KB，覆盖并发 deflate-raw 解压与自闭合 <c .../> 防错位
    const bytes = buildDeflatedXlsxFixture(600)
    const grid = await parseSpreadsheetBytes(bytes, 'large-deflate.xlsx')
    expect(grid.length).toBe(601)
    expect(grid[0]).toEqual(['交易时间', '借方发生额', '贷方发生额', '对方户名'])
    expect(grid[1]).toEqual(['2026-09-22 10:00:00', '', '50000', '夏润建设工程有限公司'])
    expect(grid[2]).toEqual(['2026-09-22 10:01:00', '10001', '', '夏润建设工程有限公司'])
  })

  it('rejects legacy binary BIFF8 .xls with clear Chinese hint and parses HTML .xls with &nbsp;', async () => {
    const ole2 = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    await expect(parseSpreadsheetBytes(ole2, 'old.xls')).rejects.toThrow('另存为标准表格')

    const html = '<table><tr><th>交易时间</th><th>金额</th></tr><tr><td>2026-09-01&nbsp;10:00</td><td>1000</td></tr></table>'
    const parsed = await parseSpreadsheetBytes(new TextEncoder().encode(html), 'bank.xls')
    expect(parsed[1]?.[0]).toBe('2026-09-01 10:00')
  })

  it('normalizes mixed date & amount formats and classifies commercial entities properly', () => {
    expect(normalizeDateTime('2026/5/8 9:5:2')?.value).toBe('2026-05-08 09:05:02')
    expect(normalizeDateTime('20260214 231800')?.value).toBe('2026-02-14 23:18:00')
    expect(normalizeAmount('¥150,000.00')?.value).toBe(150000)
    expect(normalizeAmount('-58,200.5')?.value).toBe(-58200.5)
    expect(inferRelation('华泰名酒商行', '国庆采购')).toBe('企业')
  })
})

describe('bankflow import, cleaning & anomaly screening', () => {
  it('correctly maps debit-before-credit columns and negative expense values without flipping direction', async () => {
    const csv = [
      '交易时间,对方账号,对方户名,借方发生额,贷方发生额,账户余额,摘要',
      '2026-08-01 10:00:00,6222****0001,宏达建材商行,80000.00,,120000.00,付款',
      '2026-08-02 10:00:00,6222****0002,润通工程有限公司,,150000.00,270000.00,收款',
      '2026-08-03 10:00:00,6222****0003,孙某亮,-35000.00,,235000.00,负值记账支出',
    ].join('\n')

    const batch = await importBankFiles([{ fileName: '工行分列明细.csv', bytes: new TextEncoder().encode(csv) }], {
      batchName: '分列借贷方向验证',
      subjectName: '测试对象',
      subjectUnit: '测试单位',
      importedAt: '2026-11-07 10:00',
    })

    const m = batch.cleanSummary.mappings[0]!.mapping
    expect(m.expense).toBe('借方发生额')
    expect(m.income).toBe('贷方发生额')
    expect(m.counterpartyAccount).toBe('对方账号')
    expect(m.counterparty).toBe('对方户名')

    const pay1 = batch.transactions.find(t => t.counterparty === '宏达建材商行')
    const rec = batch.transactions.find(t => t.counterparty === '润通工程有限公司')
    const pay2 = batch.transactions.find(t => t.counterparty === '孙某亮')
    expect(pay1?.direction).toBe('out')
    expect(rec?.direction).toBe('in')
    expect(pay2?.direction).toBe('out')
    expect(pay2?.amount).toBe(35000)
  })

  it('imports multi-bank demo files, maps columns properly, deduplicates and flags all 5 rules', async () => {
    const enc = new TextEncoder()
    const files = buildDemoImportFiles().map(f => ({ fileName: f.fileName, bytes: enc.encode(f.text) }))
    const batch = await importBankFiles(files, {
      batchName: '多银行自动清洗测试批次',
      subjectName: '王某海',
      subjectUnit: '测试单位',
      importedAt: '2026-11-07 10:00',
    })

    expect(batch.cleanSummary.fileCount).toBe(2)
    expect(batch.cleanSummary.duplicateRows).toBe(1)
    expect(batch.cleanSummary.importedRows).toBe(11)
    expect(batch.cleanSummary.mappings[1]?.mapping.income).toBe('贷方发生额')
    expect(batch.cleanSummary.mappings[1]?.mapping.expense).toBe('借方发生额')

    const analyzed = analyzeTransactions(batch.transactions, DEFAULT_RULE_CONFIG())
    const overview = computeOverview(analyzed)
    expect(overview.ruleCounts.large).toBeGreaterThan(0)
    expect(overview.ruleCounts.bridge).toBeGreaterThan(0)
    expect(overview.ruleCounts.split).toBeGreaterThan(0)
    expect(overview.ruleCounts.odd_time).toBeGreaterThan(0)
    expect(overview.ruleCounts.frequent).toBeGreaterThan(0)
    const salary = analyzed.find(t => t.summary.includes('工资代发'))
    expect(salary?.alerts.length).toBe(0)
  })

  it('handles non-greedy multi-split bridge subsets, routine exclusion and invalid/empty rule configs safely', () => {
    const txs: BankTransaction[] = [
      { id: 'T1', batchId: 'B', bank: '工商银行', sourceFile: 'a.csv', time: '2026-07-01 10:00:00', direction: 'in', amount: 100000, balance: 100000, counterparty: '甲建筑公司', counterpartyAccount: '6222', counterpartyRelation: '企业', summary: '往来款', channel: '网银' },
      { id: 'T2', batchId: 'B', bank: '工商银行', sourceFile: 'a.csv', time: '2026-07-01 11:00:00', direction: 'out', amount: 30000, balance: 70000, counterparty: '乙个人', counterpartyAccount: '6228', counterpartyRelation: '个人', summary: '转出1', channel: '网银' },
      { id: 'T3', batchId: 'B', bank: '工商银行', sourceFile: 'a.csv', time: '2026-07-01 12:00:00', direction: 'out', amount: 60000, balance: 10000, counterparty: '丙个人', counterpartyAccount: '6228', counterpartyRelation: '个人', summary: '转出2', channel: '网银' },
      { id: 'T4', batchId: 'B', bank: '工商银行', sourceFile: 'a.csv', time: '2026-07-01 13:00:00', direction: 'out', amount: 40000, balance: 0, counterparty: '丁个人', counterpartyAccount: '6228', counterpartyRelation: '个人', summary: '转出3', channel: '网银' },
      { id: 'T5', batchId: 'B', bank: '工商银行', sourceFile: 'a.csv', time: '2026-07-10 09:00:00', direction: 'in', amount: 12000, balance: 12000, counterparty: '县财政统发工资专户', counterpartyAccount: '1612', counterpartyRelation: '常规机构', summary: '工资代发', channel: '代发' },
      { id: 'T6', batchId: 'B', bank: '工商银行', sourceFile: 'a.csv', time: '2026-07-10 10:00:00', direction: 'out', amount: 12000, balance: 0, counterparty: '房贷扣款专户', counterpartyAccount: '1612', counterpartyRelation: '常规机构', summary: '房贷还款', channel: '代扣' },
    ]
    // 10万入后 [3万, 6万, 4万] 转出，非贪心子集应匹配 6万(T3)+4万(T4) = 10万
    const res = analyzeTransactions(txs, DEFAULT_RULE_CONFIG())
    const t1Bridge = res.find(x => x.id === 'T1')?.alerts.find(a => a.rule === 'bridge')
    expect(t1Bridge?.pairedIds).toEqual(['T3', 'T4'])
    // 常规工资+房贷不应触发过桥误报
    expect(res.find(x => x.id === 'T5')?.alerts.length).toBe(0)
    expect(res.find(x => x.id === 'T6')?.alerts.length).toBe(0)

    // 传入被清空的空字符串/NaN 配置不应导致全量误报
    const dirtyCfg = {
      large: { enabled: true, threshold: '' as any, roundThreshold: NaN },
      bridge: { enabled: true, windowHours: 0, tolerancePct: -5, minAmount: '' as any },
      split: { enabled: true, windowDays: 0, minCount: 0, minTotal: 0 },
      odd_time: { enabled: true, nightStartHour: 23, nightEndHour: 5, includeHolidays: true, minAmount: 0 },
      frequent: { enabled: true, minCount: 0, minTotal: 0, excludeRoutine: true },
    }
    const clean = sanitizeRuleConfig(dirtyCfg)
    expect(clean.large.threshold).toBe(50000)
    expect(clean.split.minCount).toBe(2)
    expect(clean.bridge.minAmount).toBe(10000)
  })

  it('builds bankflow agent context/reports and integrates bank hits into global dossier agent', () => {
    const batch = seedBankBatches()[0]!
    const analyzed = analyzeTransactions(batch.transactions, DEFAULT_RULE_CONFIG(), seedBankDecisions())
    const overview = computeOverview(analyzed)
    const cps = summarizeCounterparties(analyzed)
    const ctx = buildBankAgentContext(batch, overview, cps, analyzed)

    expect(ctx.refs.length).toBeGreaterThan(0)
    const prompt = buildBankAgentPrompt(ctx, 'chain', '重点核查夏润建设')
    expect(prompt).toContain('夏润建设工程有限公司')
    expect(prompt).toContain('[1]')

    const chainReport = buildBankAgentLocalReport(ctx, 'chain')
    const interviewReport = buildBankAgentLocalReport(ctx, 'interview')
    const semanticsReport = buildBankAgentLocalReport(ctx, 'semantics')
    expect(chainReport).toContain('资金总体特征')
    expect(chainReport).toContain('[1]')
    expect(interviewReport).toContain('面向被核查对象核实要点')
    expect(semanticsReport).toContain('典型隐蔽流转手法')

    // 全局全景智能体应能归集银行流水预警
    const dossier = collectDossier({
      subject: '赵某明',
      clues: [],
      findings: [],
      inspDocs: [],
      cases: [],
      relations: [],
      kb: [],
      bankHits: ctx.alerts.slice(0, 3).map(t => ({
        id: t.id,
        batchName: batch.name,
        subject: batch.subjectName,
        counterparty: t.counterparty,
        time: t.time,
        direction: t.direction,
        amount: t.amount,
        bank: t.bank,
        rules: t.alerts.map(a => a.ruleName),
        summary: t.summary,
      })),
    })
    expect(dossier.bankHits.length).toBe(3)
    expect(dossier.refs.some(r => r.to?.startsWith('/bankflow/ledger?id='))).toBe(true)
  })
})
