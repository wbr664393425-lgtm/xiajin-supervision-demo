/** Local-only demo rules. No network or model calls are made here. */
export const reviewChecks = [
  { id: 'time', kind: '前后矛盾', title: '接收与核查时间先后待核对', excerpt: '于2026年10月18日完成首次核实', replacement: '于2026年10月22日完成首次核实（待经办人核验）', detail: '材料记载于 10 月 20 日接收，但首次核实日期为 10 月 18 日。建议核对原始登记记录后确认。', label: '日期一致性', severity: 'orange' },
  { id: 'amount', kind: '前后矛盾', title: '差额计算与基础金额不一致', excerpt: '待核对差额为26,000元', replacement: '待核对差额为24,000元（待人工核验）', detail: '合同应收 36,000 元、已关联到账 12,000 元，计算差额为 24,000 元，正文却记为 26,000 元。', label: '金额一致性', severity: 'orange' },
  { id: 'required', kind: '要素缺失', title: '承办人员信息有待补充', excerpt: '承办人员：\n', replacement: '承办人员：演示专员甲（人工补充示例）\n', detail: '承办人员信息为空，责任要素尚未填写。建议补充经办人员信息并核实复核记录后再行流转。', label: '程序待核', severity: 'blue' },
]

export function getReviewFindings(document: string) {
  return reviewChecks.filter(check => document.includes(check.excerpt))
}

export function compareCapabilityRows(type: string, input: string) {
  const rows = input.split('\n').map(line => line.split('|').map(s => s.trim())).filter(row => row.length > 1)
  const dataRows = rows.slice(1)
  let matches: string[] = []
  if (type === 'subsidy' || type === 'expense') {
    const seen = new Map<string, string[]>()
    dataRows.forEach(row => {
      if (!(type === 'subsidy' ? row[0] : row[1])) return
      const key = type === 'subsidy' ? `${row[0]} / ${row[3] || '未标明批次'}` : row[1]!
      seen.set(key, [...(seen.get(key) || []), row[0] || '未命名记录'])
    })
    matches = [...seen].filter(([key, ids]) => key && ids.length > 1).map(([key, ids]) => `${key} · 出现 ${ids.length} 次（${ids.join('、')}）`)
  } else if (type === 'education') {
    matches = dataRows.filter(row => row[3] === '已审核').map(row => `${row[0]} · ${row[2]}（可供人工编排）`)
  } else {
    const keyword = type === 'public' ? '待核验' : '缺失'
    matches = dataRows.filter(row => row.some(value => value === keyword)).map(row => `${row[0]} · ${row.slice(1).join(' / ')}`)
  }
  return { recordCount: dataRows.length, matches }
}

export function buildAssistantOutput(text: string, type: string) {
  const clean = text.replace(/【[^】]*】/g, '').trim()
  const amounts = [...new Set(clean.match(/[\d,]+\s*元|[一二三四五六七八九十两]+万[一二三四五六七八九十千百]*|[\d.]+万元/g) || [])]
  const excerpt = clean.length > 180 ? clean.slice(0, 180) + '…' : clean
  const amountText = amounts.length ? amounts.join('、') : '原文未提供明确金额，不作补充推断'
  if (type === 'knowledge') return `检索问题\n${excerpt}\n\n内置演示要点 [1]\n① 核对合同主体、资产名称、租赁期间与付款约定。\n② 对照银行回单和收款台账，确认关联范围是否完整。\n③ 对存在差额的记录，补查漏录收款、分期安排及补充协议。\n\n适用提醒\n本结果来自内置演示条目，不是真实法规原文，无真实法条编号。正式业务须查阅现行有效的权威文本并由专业人员判断。`
  if (type === 'polish') return `原意提取\n${excerpt}\n\n规范表述初稿 [1]\n经对现有材料进行初步梳理，合同约定金额与已关联到账记录尚需进一步核对。建议调阅完整银行回单、收款台账及补充协议，确认是否存在收款未录入、未关联等情况。相关情况核实前，暂不作事实认定。\n\n保留与待确认\n原文涉及金额：${amountText}。本地演示仅提供表达结构，正式使用前请逐项核验与原文一致性。`
  if (type === 'meeting') return `会议主题初稿\n材料核对工作专题会议（根据用户输入整理）\n\n记录提要 [1]\n${excerpt}\n\n议定事项清单\n① 补齐原始材料，对照合同、收款及相关附件。\n② 复核台账关联范围，分别记录已核实信息与待核事项。\n③ 责任人员、期限与参会信息按原始记录逐项确认。\n\n待人工确认\n涉及金额：${amountText}。请核对议定事项与会议记录是否一致，并由参会人员确认后使用。`
  return `事项摘要 [1]\n${excerpt}\n\n原文关键要素\n涉及金额：${amountText}。\n事项性质：材料反映的情况与核查诉求，尚未经过事实核验。\n\n建议核查清单\n① 回查原始材料，确认事项主体、时间和金额。\n② 对照完整合同、台账与收付款凭证，核验关联范围。\n③ 补充尚缺的佐证材料，由工作人员记录核查结论。\n\n使用提醒\n本结果为本地模拟整理，不代表事实认定、违纪定性或处置决定。`
}

export type RefineMode = 'concise' | 'checklist' | 'formal' | 'custom'
export const refineLabels: Record<RefineMode, string> = { concise: '更简洁', checklist: '补充核查清单', formal: '改为公文语气', custom: '补充要求' }
const boundaryTitles = /提醒|待人工确认|保留与待确认/

function blocks(output: string) {
  return output.split('\n\n').map(block => { const [title = '', ...body] = block.split('\n'); return { title, body } })
}
function join(list: { title: string; body: string[] }[]) {
  return list.map(block => [block.title, ...block.body].join('\n')).join('\n\n')
}
/** 从原文中提取可核对的要素；只返回原文里出现过的字符串。 */
export function sourceFacts(text: string) {
  const clean = text.replace(/【[^】]*】/g, '')
  const uniq = (list: string[] | null) => [...new Set(list || [])]
  return {
    amounts: uniq(clean.match(/[\d,]+(?:\.\d+)?\s*元|[\d.]+万元/g)),
    dates: uniq(clean.match(/\d{4}\s*年\s*\d{1,2}\s*月(?:\s*\d{1,2}\s*日)?|\d{1,2}\s*月\s*\d{1,2}\s*日/g)),
    codes: uniq(clean.match(/[A-Z]{2,}(?:-[A-Z0-9]+){2,}/g)),
  }
}

/** 本地规则改写上一版初稿：只调整结构与表达，不新增原文以外的事实。 */
export function refineAssistantOutput(previous: string, input: string, mode: RefineMode, note = '') {
  const list = blocks(previous)
  if (mode === 'concise') {
    return join(list.map(block => {
      if (boundaryTitles.test(block.title)) return block
      const text = block.body.join('')
      const items = block.body.filter(line => /^[①②③④⑤]/.test(line))
      if (items.length) return { title: block.title, body: items.slice(0, 2) }
      const first = text.split(/(?<=。)/)[0] || text
      return { title: block.title, body: [first.length > 90 ? first.slice(0, 90) + '…' : first] }
    }))
  }
  if (mode === 'checklist') {
    const facts = sourceFacts(input)
    const items = [
      ...facts.codes.map(code => `调阅编号 ${code} 对应的原件，核对主体与期限。`),
      ...facts.amounts.map(amount => `核对金额 ${amount} 与原始凭证、台账记载是否一致。`),
      ...facts.dates.map(date => `核对 ${date} 的原始记录或登记信息。`),
      '记录每项核对的材料来源、核对人及时间，未核实内容保持待核状态。',
    ].slice(0, 8)
    const marks = '①②③④⑤⑥⑦⑧'
    const section = { title: '补充核查清单（按原文要素生成）', body: items.map((item, index) => `${marks[index]} ${item}`) }
    const at = list.findIndex(block => boundaryTitles.test(block.title))
    const without = list.filter(block => !block.title.startsWith('补充核查清单'))
    const insertAt = at < 0 ? without.length : without.findIndex(block => boundaryTitles.test(block.title))
    without.splice(insertAt < 0 ? without.length : insertAt, 0, section)
    return join(without)
  }
  if (mode === 'formal') {
    const pairs: [RegExp, string][] = [
      [/这份合同写的/g, '该合同约定'], [/还有/g, '尚有'], [/没对上/g, '尚未核对一致'], [/找齐/g, '补齐'], [/看看/g, '核实'],
      [/是不是/g, '是否'], [/我们想/g, '拟'], [/我们/g, '工作组'], [/但目前只找到/g, '目前仅查见'], [/再/g, '后续'],
    ]
    const marks: Record<string, string> = { '①': '（一）', '②': '（二）', '③': '（三）', '④': '（四）', '⑤': '（五）' }
    return join(list.map(block => ({
      title: block.title,
      body: block.body.map(line => pairs.reduce((text, [from, to]) => text.replace(from, to), line).replace(/^[①②③④⑤]\s?/, mark => marks[mark.trim()] || mark)),
    })))
  }
  const request = note.trim().slice(0, 120) || '（未填写）'
  return join([...list.filter(block => !block.title.startsWith('补充要求')), {
    title: '补充要求（按本地规则处理）',
    body: [`已记录要求：「${request}」`, '本地演示引擎不解析自由语义，上方初稿未作改动，也未新增事实。请工作人员据此人工修改，或选择“更简洁”“补充核查清单”“改为公文语气”。'],
  }])
}
