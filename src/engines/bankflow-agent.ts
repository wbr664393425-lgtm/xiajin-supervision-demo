/**
 * 银行流水智能体研判引擎
 * - 构建结构化流水引用资料 [1]..[n]，每条可直达原流水抽屉
 * - 支持三种实战视角：全批资金链全景剖析、初核谈话提纲初稿、摘要语义与隐蔽手法识别
 * - 优先调用平台 DeepSeek 流式大模型，离线时自动回退本地规则起草，并统一执行 boundaryCheck 边界自检
 */
import {
  ALERT_RULE_META,
  fmtWan,
  type BankBatch,
  type BankFlowOverview,
  type CounterpartySummary,
  type EnrichedTransaction,
} from './bankflow'

export type BankAgentMode = 'chain' | 'interview' | 'semantics'

export interface BankAgentRef {
  n: number
  txId: string
  title: string
  excerpt: string
  counterparty: string
}

export interface BankAgentContext {
  batch: BankBatch
  overview: BankFlowOverview
  counterparties: CounterpartySummary[]
  alerts: EnrichedTransaction[]
  refs: BankAgentRef[]
}

export const BANK_AGENT_MODES: { key: BankAgentMode; label: string; desc: string }[] = [
  { key: 'chain', label: '资金链全景剖析', desc: '串联上下游过桥链路、拆分规避与重点对手方，输出研判与调证清单' },
  { key: 'interview', label: '初核谈话提纲', desc: '围绕关键疑点时间与金额，起草面向被核查对象及关联人的谈话核实提纲' },
  { key: 'semantics', label: '隐蔽手法与摘要语义', desc: '识别表面正常摘要背后的变相利益输送特征与异常节点规律' },
]

/** 抽取高价值可疑流水作为智能体可追溯引用资料 [1]..[n] */
export function buildBankAgentContext(
  batch: BankBatch,
  overview: BankFlowOverview,
  counterparties: CounterpartySummary[],
  analyzed: EnrichedTransaction[],
): BankAgentContext {
  const alerts = analyzed
    .filter(t => t.alerts.length > 0 && t.reviewStatus !== 'excluded')
    .sort((a, b) =>
      (b.reviewStatus === 'focus' ? 1 : 0) - (a.reviewStatus === 'focus' ? 1 : 0)
      || (b.maxLevel === 'high' ? 1 : 0) - (a.maxLevel === 'high' ? 1 : 0)
      || b.alerts.length - a.alerts.length
      || b.amount - a.amount,
    )

  const refs: BankAgentRef[] = alerts.slice(0, 12).map((t, i) => ({
    n: i + 1,
    txId: t.id,
    counterparty: t.counterparty,
    title: `${t.time.slice(0, 10)} ${t.counterparty}（${t.direction === 'in' ? '转入' : '转出'} ${fmtWan(t.amount)}）`,
    excerpt: `${t.time}｜${t.bank}｜${t.direction === 'in' ? '收入' : '支出'} ${t.amount.toLocaleString('zh-CN')} 元｜对方：${t.counterparty}（${t.counterpartyAccount}）｜摘要：${t.summary}｜命中：${t.alerts.map(a => `${a.ruleName}（${a.reason}）`).join('；')}`,
  }))

  return { batch, overview, counterparties, alerts, refs }
}

/** 构造提交给纪检大模型的提示词（严格遵守 SYSTEM_PROMPT 输出段落与边界规范） */
export function buildBankAgentPrompt(ctx: BankAgentContext, mode: BankAgentMode, question = ''): string {
  const { batch, overview, counterparties, refs } = ctx
  const topCps = counterparties
    .filter(c => c.alertCount > 0)
    .slice(0, 6)
    .map(c => `${c.name}（${c.relation}，转入 ${fmtWan(c.inAmount)} / ${c.inCount} 笔，转出 ${fmtWan(c.outAmount)} / ${c.outCount} 笔，命中：${c.alertRules.map(r => ALERT_RULE_META[r].short).join('、')}）`)

  const modeTask: Record<BankAgentMode, string> = {
    chain: '任务：围绕本批次银行流水开展资金链全景剖析，生成供办案人员使用的初核资金研判初稿。段落依次为：资金总体特征、重点可疑资金链路、关键对手方画像、建议调证与核查事项、使用提醒。',
    interview: '任务：围绕本批次银行流水核心疑点，起草一份初核谈话核实提纲初稿。段落依次为：核实背景与焦点、面向被核查对象核实要点、面向重点对手方核实要点、需同步印证书证材料、使用提醒。',
    semantics: '任务：重点分析本批次流水交易摘要、时间节点与资金拆转手法，识别“垫付款、咨询费、借款归还、往来款、节礼”等摘要背后的可疑特征。段落依次为：摘要语义异常归类、典型隐蔽流转手法、敏感节点规律分析、重点核查建议、使用提醒。',
  }

  return [
    modeTask[mode],
    question.trim() ? `补充关注点：${question.trim()}` : '',
    '严格要求：只依据下方提供的流水统计与编号资料 [n] 作答，引用具体交易必须在句末标注 [n]；不得编造未出现的金额、日期或人物；不得作出违纪违法定性或处分建议，一律表述为“疑点”“待核实”“疑似”。全文控制在 750 字以内，不使用 Markdown 符号。',
    '',
    `【批次概况】${batch.name}｜对象：${batch.subjectName}（${batch.subjectUnit}）｜时段：${batch.periodStart} 至 ${batch.periodEnd}｜总流入 ${fmtWan(overview.totalIn)}（${overview.inCount} 笔），总流出 ${fmtWan(overview.totalOut)}（${overview.outCount} 笔），净差额 ${overview.netDiff >= 0 ? '+' : '-'}${fmtWan(Math.abs(overview.netDiff))}｜涉及对手方 ${overview.counterpartyCount} 户｜命中预警 ${overview.alertTxCount} 笔（重点核查 ${overview.focusCount} 笔）。`,
    '',
    '【重点预警对手方】',
    ...(topCps.length ? topCps : ['暂无重点预警对手方']),
    '',
    '【核心预警流水资料】（引用时请标注对应序号 [n]）',
    ...(refs.length ? refs.map(r => `[${r.n}] ${r.excerpt}`) : ['当前批次暂无命中预警的流水记录']),
  ].filter(Boolean).join('\n')
}

/** 离线规则引擎兜底生成：结构与大模型完全一致，并附带真实 [n] 引用角标 */
export function buildBankAgentLocalReport(ctx: BankAgentContext, mode: BankAgentMode, question = ''): string {
  const { batch, overview, counterparties, refs } = ctx
  const refOf = (predicate: (t: EnrichedTransaction) => boolean) => {
    const hit = ctx.alerts.find(predicate)
    if (!hit) return ''
    const r = refs.find(x => x.txId === hit.id)
    return r ? ` [${r.n}]` : ''
  }
  const refsByRule = (rule: string) =>
    refs
      .filter(r => ctx.alerts.find(a => a.id === r.txId)?.alerts.some(h => h.rule === rule))
      .slice(0, 3)
      .map(r => `[${r.n}]`)
      .join('')

  const topIn = counterparties.filter(c => c.inAmount > 0 && c.alertCount > 0).slice(0, 3)
  const topOut = counterparties.filter(c => c.outAmount > 0 && c.alertCount > 0).slice(0, 3)
  const bridgeRefs = refsByRule('bridge')
  const splitRefs = refsByRule('split')
  const oddRefs = refsByRule('odd_time')
  const largeRefs = refsByRule('large')

  if (!refs.length) {
    return [
      `资金总体特征\n本批次涉及${batch.subjectName}（${batch.subjectUnit}）共 ${batch.transactions.length} 笔流水，总流入 ${fmtWan(overview.totalIn)}、总流出 ${fmtWan(overview.totalOut)}，在当前模型阈值下未检出待核实预警流水。`,
      '核查建议\n① 可结合业务需要适当调低大额转账或高频往来阈值后重新筛查\n② 如掌握特定关系人名单，可在检索栏按姓名或账号做定向穿透比对',
      '使用提醒\n本报告为智能初稿，需人工审核；不构成事实认定、违纪定性或处置意见。',
    ].join('\n\n')
  }

  if (mode === 'interview') {
    const q1 = topIn[0]
      ? `请说明 ${batch.periodStart} 至 ${batch.periodEnd} 期间多次接收「${topIn[0].name}」合计 ${fmtWan(topIn[0].inAmount)} 的具体事由、对应合同及履约依据${refOf(t => t.counterparty === topIn[0]!.name)}`
      : `请说明本批次多笔大额资金转入的具体来源及合理依据 ${largeRefs}`
    const q2 = topOut[0]
      ? `收到大额款项后短时向「${topOut[0].name}」转出合计 ${fmtWan(topOut[0].outAmount)}，二者之间是否存在资金代持、过桥周转或关联安排${refOf(t => t.counterparty === topOut[0]!.name)}`
      : `请说明大额转入后短时转出的资金去向与收款人关系 ${bridgeRefs}`
    const splitParty = counterparties.find(c => c.alertRules.includes('split'))
    const q3 = splitParty
      ? `短期内与「${splitParty.name}」连续发生多笔低于大额阈值的转账（合计 ${fmtWan(splitParty.totalAmount)}），请说明分笔结算原因${splitRefs}`
      : `请说明深夜及节假日敏感节点多笔资金往来的具体背景 ${oddRefs}`
    return [
      `核实背景与焦点\n本提纲围绕${batch.subjectName}（${batch.subjectUnit}）${batch.periodStart} 至 ${batch.periodEnd} 银行流水筛查出的 ${overview.alertTxCount} 笔疑点起草，重点聚焦大额转入、短时快进快出过桥、拆分结算及敏感节点往来${question.trim() ? `，并结合关注点「${question.trim()}」展开` : ''}。`,
      `面向被核查对象核实要点\n① ${q1}\n② ${q2}\n③ ${q3}\n④ 核对春节、中秋、国庆等节假日及深夜时段交易的真实发生场景与用途 ${oddRefs}`,
      `面向重点对手方核实要点\n① 向${topIn.map(c => `「${c.name}」`).join('、') || '上游资金来源方'}核实付款审批记录、业务合同、发票及资金真实流向 ${largeRefs}\n② 向${topOut.map(c => `「${c.name}」`).join('、') || '下游关联收款人'}核实收款用途、是否代为保管或转存理财房产等资产 ${bridgeRefs}`,
      '需同步印证书证材料\n① 相关工程项目招投标、合同台账、结算审批单及财务记账凭证\n② 涉事账户完整银行回单、柜面取现凭条及关联人名下理财房产购置记录\n③ 微信、支付宝原始对账单及对应聊天转款说明记录',
      '使用提醒\n本提纲为智能初稿，需人工审核；谈话核实前请逐笔核对原流水与书证，不构成事实认定或定性意见。',
    ].join('\n\n')
  }

  if (mode === 'semantics') {
    const disguised = ctx.alerts.filter(t => /垫付|咨询|借款|往来|分成|分红|礼|烟酒|定金|尾款|补贴/.test(t.summary))
    const dRefs = disguised.slice(0, 3).map(t => {
      const r = refs.find(x => x.txId === t.id)
      return `「${t.summary}」（${t.counterparty}，${fmtWan(t.amount)}）${r ? `[${r.n}]` : ''}`
    })
    return [
      `摘要语义异常归类\n本批次共识别 ${disguised.length} 笔摘要表述值得重点核对的流水，主要集中在工程往来款、咨询分红、借款归还及节礼烟酒采购等口径：${dRefs.join('；') || `详见重点预警记录 ${largeRefs}`}。`,
      `典型隐蔽流转手法\n① 短时过桥中转：检出 ${overview.ruleCounts.bridge} 笔快进快出流水，呈现“上游企业转入后数小时内等额或拆笔转至关联人”特征 ${bridgeRefs}\n② 化整为零规避：检出 ${overview.ruleCounts.split} 笔短期多笔小额集中转账，单笔均控制在监测阈值以下 ${splitRefs}\n③ 多机构分流：同一对象跨 ${batch.cleanSummary.banks.join('、')} 交替收付，单查一家银行易形成视野盲区`,
      `敏感节点规律分析\n共检出 ${overview.ruleCounts.odd_time} 笔深夜（23:00–05:00）或春节、中秋、国庆等节假日节点交易，部分摘要直接出现节礼、慰问、烟酒采购等敏感字样，需核实是否涉及违规收送礼品礼金或公款吃喝 ${oddRefs}。`,
      `重点核查建议\n① 对以“借款归还”“往来款”“垫付款”名义发生的转账，逐笔倒查原始借条、前期出借流水及真实业务背景\n② 将跨银行、第三方支付的同日同对手方流水合并时间轴比对，核实是否存在刻意隐匿资金轨迹情形${question.trim() ? `\n③ 针对补充关注点「${question.trim()}」，优先穿透相关对手方全部明细` : ''}`,
      '使用提醒\n本分析为智能初稿，需人工审核；摘要语义提示仅作核查方向参考，不构成事实认定或违纪定性意见。',
    ].join('\n\n')
  }

  // 默认：chain 资金链全景剖析
  const splitCp = counterparties.find(c => c.alertRules.includes('split'))
  return [
    `资金总体特征\n本批次汇聚${batch.subjectName}（${batch.subjectUnit}）在 ${batch.cleanSummary.banks.join('、')} 的 ${batch.transactions.length} 笔有效流水（自动去重 ${batch.cleanSummary.duplicateRows} 笔），累计流入 ${fmtWan(overview.totalIn)}（${overview.inCount} 笔）、流出 ${fmtWan(overview.totalOut)}（${overview.outCount} 笔），涉及对手方 ${overview.counterpartyCount} 户，检出疑点流水 ${overview.alertTxCount} 笔（其中红色预警 ${overview.highAlertCount} 笔、已标重点核查 ${overview.focusCount} 笔）。`,
    `重点可疑资金链路\n① 快进快出过桥链路：发现 ${overview.ruleCounts.bridge} 笔短时进出配对流水，上游资金入账后迅速向特定关联人等额或拆笔转移，疑似过桥中转 ${bridgeRefs}\n② 化整为零拆分链路：${splitCp ? `与「${splitCp.name}」在短期内连续多笔低于大额阈值交易，累计 ${fmtWan(splitCp.totalAmount)}，疑似规避大额监测` : `检出 ${overview.ruleCounts.split} 笔短期拆分转账`} ${splitRefs}\n③ 敏感节点集中交易：春节、中秋、国庆节点及深夜时段发生 ${overview.ruleCounts.odd_time} 笔异常往来 ${oddRefs}`,
    `关键对手方画像\n① 上游重点来源：${topIn.map(c => `「${c.name}」（转入 ${fmtWan(c.inAmount)} / ${c.inCount} 笔）`).join('、') || '暂无显著异常来源方'} ${largeRefs}\n② 下游重点去向：${topOut.map(c => `「${c.name}」（转出 ${fmtWan(c.outAmount)} / ${c.outCount} 笔）`).join('、') || '暂无显著异常去向方'} ${bridgeRefs}`,
    `建议调证与核查事项\n① 调取重点企业与${batch.subjectUnit}的工程合同、招投标及财务结算资料，核对资金往来与职务权限关联性\n② 核查关联收款人身份关系及下游资金最终去向（房产、车辆、理财、现金取现）\n③ 对已标记重点核查的 ${overview.focusCount} 笔流水逐笔生成核查任务并开展谈话核实${question.trim() ? `\n④ 围绕关注点「${question.trim()}」定向比对上下游往来明细` : ''}`,
    '使用提醒\n本剖析为智能初稿，需人工审核；不构成事实认定、违纪定性或处置意见。',
  ].join('\n\n')
}
