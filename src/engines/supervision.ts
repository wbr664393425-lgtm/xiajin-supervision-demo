/** 大数据穿透监督规则引擎。输出为疑点清单，不是结论；每条疑点都附比对证据与规则依据。 */
import type { Finding, RiskLevel } from '@/types'
import { similarity } from './text'
import { daysBetween } from './deadline'
import type { Contract, Receipt, IdleAsset, Voucher, Grant, Resident, Land, Insurance, Company, Project, Allowance, Reception, MealInvoice, CarTrip } from '@/mock/supervision'

const yuan = (n: number) => `${n.toLocaleString('zh-CN')} 元`
const f = (x: Omit<Finding, 'module'>): Finding => ({ module: 'supervision', ...x })

// ───────── 农村三资 ─────────
export const assetRules = { unpaid: '到期未收', lowprice: '低价发包', idle: '长期闲置', duplicate: '重复报账', whiteslip: '白条入账', procedure: '程序缺失', expired: '到期未续', cash: '非对公收款' } as const
export function screenAssets(d: { contracts: Contract[]; receipts: Receipt[]; idle: IdleAsset[]; vouchers: Voucher[] }, today: string): Finding[] {
  const out: Finding[] = []
  for (const c of d.contracts) {
    const paid = d.receipts.filter(r => r.contractId === c.id)
    const received = paid.reduce((s, r) => s + r.amount, 0)
    const place = `${c.village} · ${c.asset}`
    if (c.dueDate < today && received < c.annualRent && c.end >= today) {
      const gap = c.annualRent - received
      out.push(f({ id: `AS-${c.id}-unpaid`, feature: 'assets', rule: assetRules.unpaid, level: gap >= 20000 ? 'high' : 'mid', title: `${c.village}租金到期未足额收取，差额 ${yuan(gap)}`, subject: place, town: c.town, amount: gap, date: c.dueDate,
        evidence: [{ label: '合同编号', value: c.id }, { label: '约定年租金', value: yuan(c.annualRent) }, { label: '应付日期', value: c.dueDate }, { label: '流水已收', value: paid.length ? paid.map(r => `${r.date} ${yuan(r.amount)}（${r.method}）`).join('；') : '无' }, { label: '待核差额', value: yuan(gap) }],
        basis: '合同约定付款日已过，银行流水与收款记录合计低于约定租金。可能存在分期约定、未入账或欠缴，需调阅补充协议与完整流水。' }))
    }
    const ratio = c.annualRent / c.marketRent
    if (ratio < 0.7) out.push(f({ id: `AS-${c.id}-lowprice`, feature: 'assets', rule: assetRules.lowprice, level: ratio < 0.6 ? 'high' : 'mid', title: `${c.village}${c.kind}租金为参考价的 ${Math.round(ratio * 100)}%`, subject: place, town: c.town, amount: c.marketRent - c.annualRent, date: c.start,
      evidence: [{ label: '合同编号', value: c.id }, { label: '承租方', value: c.tenant }, { label: '合同年租金', value: yuan(c.annualRent) }, { label: '同类参考价', value: `${yuan(c.marketRent)}（周边同类资产均价）` }, { label: '合同期限', value: `${c.start} 至 ${c.end}` }],
      basis: '合同租金低于同区域同类资产参考价 70%。需核查是否经过公开竞价、价格评估及民主决策程序。' }))
    if (!c.meeting || !c.publicity) out.push(f({ id: `AS-${c.id}-procedure`, feature: 'assets', rule: assetRules.procedure, level: !c.meeting && !c.publicity ? 'high' : 'mid', title: `${c.village}资产发包${[!c.meeting && '无民主决策记录', !c.publicity && '未公示'].filter(Boolean).join('、')}`, subject: place, town: c.town, date: c.start,
      evidence: [{ label: '合同编号', value: c.id }, { label: '村民代表会议记录', value: c.meeting ? '有' : '未见' }, { label: '结果公示', value: c.publicity ? '有' : '未见' }, { label: '合同期限', value: `${c.start} 至 ${c.end}` }],
      basis: '集体资产发包应经村民代表会议决策并公示结果。系统未在台账中找到对应记录，需调阅原始材料。' }))
    if (c.end < today && c.renewed === false) out.push(f({ id: `AS-${c.id}-expired`, feature: 'assets', rule: assetRules.expired, level: 'mid', title: `${c.village}合同已于 ${c.end} 到期，未见续签或收回`, subject: place, town: c.town, date: c.end,
      evidence: [{ label: '合同编号', value: c.id }, { label: '到期日期', value: c.end }, { label: '续签记录', value: '未见' }, { label: '到期后收款', value: '无' }],
      basis: '合同到期后既未续签也无收回记录，可能存在继续占用不收租的情况。' }))
    const cash = paid.filter(r => r.method !== '银行转账')
    if (cash.length) out.push(f({ id: `AS-${c.id}-cash`, feature: 'assets', rule: assetRules.cash, level: 'low', title: `${c.village}租金以${cash.map(r => r.method).join('、')}方式收取`, subject: place, town: c.town, amount: cash.reduce((s, r) => s + r.amount, 0), date: cash[0]!.date,
      evidence: cash.map(r => ({ label: r.date, value: `${yuan(r.amount)}（${r.method}）` })), basis: '集体资金收入应通过对公账户结算。现金或收据收款需核实是否及时足额入账。' }))
  }
  for (const a of d.idle) {
    const months = Math.floor(daysBetween(a.idleSince, today) / 30)
    if (months >= 12) out.push(f({ id: `AS-${a.id}-idle`, feature: 'assets', rule: assetRules.idle, level: months >= 24 ? 'high' : 'mid', title: `${a.village}${a.name}闲置 ${months} 个月`, subject: `${a.village} · ${a.name}`, town: a.town, amount: a.value, date: a.idleSince,
      evidence: [{ label: '资产编号', value: a.id }, { label: '账面价值', value: yuan(a.value) }, { label: '闲置起始', value: a.idleSince }, { label: '闲置时长', value: `${months} 个月` }], basis: '集体资产闲置超过 12 个月，需核查是否存在管理不善、项目建成即闲置等问题。' }))
  }
  const byNo = new Map<string, Voucher[]>()
  d.vouchers.filter(v => v.voucherNo !== '—').forEach(v => byNo.set(v.voucherNo, [...(byNo.get(v.voucherNo) || []), v]))
  for (const [no, list] of byNo) if (list.length > 1) out.push(f({ id: `AS-dup-${no}`, feature: 'assets', rule: assetRules.duplicate, level: 'high', title: `${list[0]!.village}同一张发票 ${no} 报账 ${list.length} 次`, subject: `${list[0]!.village} · ${list[0]!.item}`, town: list[0]!.town, amount: list.slice(1).reduce((s, v) => s + v.amount, 0), date: list[0]!.date,
    evidence: list.map(v => ({ label: `${v.id} · ${v.date}`, value: `${v.item} ${yuan(v.amount)}，发票号 ${v.voucherNo}，审批 ${v.approver}` })), basis: '同一发票号在多张凭证中出现。' }))
  for (let i = 0; i < d.vouchers.length; i++) for (let j = i + 1; j < d.vouchers.length; j++) {
    const a = d.vouchers[i]!, b = d.vouchers[j]!
    if (a.village === b.village && a.item === b.item && a.amount === b.amount && a.voucherNo !== b.voucherNo && a.voucherNo !== '—' && Math.abs(daysBetween(a.date, b.date)) <= 30)
      out.push(f({ id: `AS-dup-${a.id}-${b.id}`, feature: 'assets', rule: assetRules.duplicate, level: 'mid', title: `${a.village}30 日内同事项同金额报账两次`, subject: `${a.village} · ${a.item}`, town: a.town, amount: b.amount, date: b.date,
        evidence: [a, b].map(v => ({ label: `${v.id} · ${v.date}`, value: `${v.item} ${yuan(v.amount)}，发票号 ${v.voucherNo}` })), basis: '同一事项、相同金额在短期内重复报账，需核实是否为两次真实采购。' }))
  }
  const slips = new Map<string, Voucher[]>()
  d.vouchers.filter(v => v.type !== '发票').forEach(v => slips.set(v.village, [...(slips.get(v.village) || []), v]))
  for (const [village, list] of slips) { const sum = list.reduce((s, v) => s + v.amount, 0); const white = list.some(v => v.type === '白条'); out.push(f({ id: `AS-slip-${village}`, feature: 'assets', rule: assetRules.whiteslip, level: white ? 'mid' : 'low', title: `${village}${white ? '白条' : '收据'}入账 ${list.length} 笔，合计 ${yuan(sum)}`, subject: `${village} · ${[...new Set(list.map(v => v.item))].join('、')}`, town: list[0]!.town, amount: sum, date: list[0]!.date,
    evidence: list.map(v => ({ label: `${v.id} · ${v.date}`, value: `${v.item} ${yuan(v.amount)}（${v.type}），审批 ${v.approver}` })), basis: '以白条或非正规票据列支集体资金，需补充合法票据或说明。' })) }
  return out
}

// ───────── 惠民惠农资金 ─────────
export const subsidyRules = { multi: '一人多领', dead: '死亡继续领取', repeat: '重复申领', ineligible: '资格不符' } as const
export function screenSubsidy(d: { grants: Grant[]; residents: Resident[]; lands: Land[]; insurance: Insurance[] }): Finding[] {
  const out: Finding[] = []
  const person = (id: string) => d.residents.find(r => r.idNo === id)
  const groups = new Map<string, Grant[]>()
  d.grants.forEach(g => groups.set(`${g.idNo}|${g.item}|${g.period}`, [...(groups.get(`${g.idNo}|${g.item}|${g.period}`) || []), g]))
  for (const list of groups.values()) if (list.length > 1) {
    const g = list[0]!, villages = new Set(list.map(x => x.village))
    const rule = villages.size > 1 ? subsidyRules.multi : subsidyRules.repeat
    out.push(f({ id: `SB-${rule === subsidyRules.multi ? 'multi' : 'repeat'}-${g.id}`, feature: 'subsidy', rule, level: 'high', title: `${g.name}${villages.size > 1 ? `在 ${[...villages].join('、')} 重复领取` : '同一期次重复申领'}${g.item}`, subject: `${g.name} · ${g.idNo}`, town: g.town, amount: list.slice(1).reduce((s, x) => s + x.amount, 0), date: g.period,
      evidence: list.map(x => ({ label: `${x.id} · ${x.village}`, value: `${x.item} ${yuan(x.amount)}${x.parcel ? `，地块 ${x.parcel}` : ''}` })), basis: '同一身份证号在同一期次同一补贴项目中出现多条发放记录（发放数据 × 户籍数据比对）。' }))
  }
  const parcels = new Map<string, Grant[]>()
  d.grants.filter(g => g.parcel).forEach(g => parcels.set(g.parcel!, [...(parcels.get(g.parcel!) || []), g]))
  for (const [parcel, list] of parcels) if (new Set(list.map(x => x.idNo)).size > 1) out.push(f({ id: `SB-parcel-${parcel}`, feature: 'subsidy', rule: subsidyRules.repeat, level: 'mid', title: `地块 ${parcel} 被 ${list.length} 人同时申领耕地补贴`, subject: list.map(x => x.name).join('、'), town: list[0]!.town, amount: list.slice(1).reduce((s, x) => s + x.amount, 0), date: list[0]!.period,
    evidence: [...list.map(x => ({ label: `${x.id} · ${x.name}`, value: `${x.item} ${yuan(x.amount)}` })), { label: '耕地确权', value: `${parcel} 权属人 ${d.lands.find(l => l.parcel === parcel)?.owner || '未登记'}` }], basis: '同一确权地块对应多名领取人（发放数据 × 耕地确权数据比对）。' }))
  for (const g of d.grants) {
    const p = person(g.idNo)
    if (p?.status === '死亡' && p.date && p.date < `${g.period}-12-31`) out.push(f({ id: `SB-dead-${g.id}`, feature: 'subsidy', rule: subsidyRules.dead, level: 'high', title: `${g.name}已于 ${p.date} 死亡注销，仍发放 ${g.period} 年${g.item}`, subject: `${g.name} · ${g.idNo}`, town: g.town, amount: g.amount, date: p.date,
      evidence: [{ label: '发放记录', value: `${g.id} ${g.item} ${yuan(g.amount)}（${g.period}）` }, { label: '户籍状态', value: `死亡注销，${p.date}` }, { label: '年龄', value: `${p.age} 岁` }], basis: '户籍数据显示已死亡注销，补贴发放数据仍有当期记录。' }))
    if (p?.status === '迁出') out.push(f({ id: `SB-moved-${g.id}`, feature: 'subsidy', rule: subsidyRules.ineligible, level: 'mid', title: `${g.name}户籍已于 ${p.date} 迁出，仍领取${g.item}`, subject: `${g.name} · ${g.idNo}`, town: g.town, amount: g.amount, date: p.date,
      evidence: [{ label: '发放记录', value: `${g.id} ${g.item} ${yuan(g.amount)}` }, { label: '户籍状态', value: `迁出，${p.date}` }], basis: '户籍迁出后可能不再符合属地发放条件，需核实土地经营情况。' }))
    if (g.item === '高龄津贴' && p && p.status === '正常' && p.age < 80) out.push(f({ id: `SB-age-${g.id}`, feature: 'subsidy', rule: subsidyRules.ineligible, level: 'mid', title: `${g.name}年龄 ${p.age} 岁，不满 80 周岁领取高龄津贴`, subject: `${g.name} · ${g.idNo}`, town: g.town, amount: g.amount, date: g.period,
      evidence: [{ label: '发放记录', value: `${g.id} ${yuan(g.amount)}` }, { label: '户籍年龄', value: `${p.age} 岁` }, { label: '发放条件', value: '年满 80 周岁' }], basis: '户籍年龄与发放条件不符。' }))
    const ins = d.insurance.find(i => i.idNo === g.idNo)
    if (g.item === '困难群众救助' && ins && (ins.pension === '机关事业养老' || ins.medical === '职工医保')) out.push(f({ id: `SB-ins-${g.id}`, feature: 'subsidy', rule: subsidyRules.ineligible, level: 'high', title: `${g.name}参加${ins.pension}、${ins.medical}，领取困难群众救助`, subject: `${g.name} · ${g.idNo}`, town: g.town, amount: g.amount, date: g.period,
      evidence: [{ label: '发放记录', value: `${g.id} ${yuan(g.amount)}` }, { label: '养老保险', value: ins.pension }, { label: '医疗保险', value: ins.medical }], basis: '财政供养或有稳定职工收入人员原则上不符合救助条件（发放 × 医保 × 养老数据比对）。' }))
    if (g.parcel) { const land = d.lands.find(l => l.parcel === g.parcel); if (land && land.owner !== g.idNo && !d.grants.some(x => x !== g && x.parcel === g.parcel)) out.push(f({ id: `SB-owner-${g.id}`, feature: 'subsidy', rule: subsidyRules.ineligible, level: 'mid', title: `${g.name}领取的地块 ${g.parcel} 确权人不是本人`, subject: `${g.name} · ${g.idNo}`, town: g.town, amount: g.amount, date: g.period,
      evidence: [{ label: '发放记录', value: `${g.id} ${g.village} ${yuan(g.amount)}` }, { label: '地块确权人', value: land.owner }], basis: '耕地地力补贴应发放给确权承包户，需核实是否有流转协议。' })) }
  }
  return out
}

// ───────── 招投标 ─────────
export const procurementRules = { converge: '报价趋同', related: '供应商关联', docsim: '标书雷同', score: '评分异常', duration: '工期异常', repeat: '同一企业多次中标' } as const
export function screenProcurement(d: { projects: Project[]; companies: Company[] }): Finding[] {
  const out: Finding[] = []
  const co = (n: string) => d.companies.find(c => c.name === n)
  for (const p of d.projects) {
    const prices = p.bids.map(b => b.price), mean = prices.reduce((s, x) => s + x, 0) / prices.length
    const cv = Math.sqrt(prices.reduce((s, x) => s + (x - mean) ** 2, 0) / prices.length) / mean
    const base = { feature: 'procurement', subject: `${p.id} · ${p.name}`, town: p.town, date: p.date }
    if (p.bids.length >= 3 && cv < 0.015) out.push(f({ ...base, id: `CG-${p.id}-converge`, rule: procurementRules.converge, level: 'mid', title: `${p.name}报价离散度仅 ${(cv * 100).toFixed(2)}%`, amount: p.budget,
      evidence: [...p.bids.map(b => ({ label: b.company, value: `${yuan(b.price)}，工期 ${b.days} 天` })), { label: '预算 / 离散系数', value: `${yuan(p.budget)} / ${(cv * 100).toFixed(2)}%` }], basis: '多家投标报价高度接近（变异系数低于 1.5%），且均贴近预算上限，存在协同报价可能。' }))
    for (let i = 0; i < p.bids.length; i++) for (let j = i + 1; j < p.bids.length; j++) {
      const a = co(p.bids[i]!.company), b = co(p.bids[j]!.company)
      if (!a || !b) continue
      const shared = [a.legalRep === b.legalRep && `法定代表人均为 ${a.legalRep}`, a.phone === b.phone && `联系电话相同 ${a.phone}`, a.address.slice(0, 8) === b.address.slice(0, 8) && `注册地址相近（${a.address} / ${b.address}）`].filter(Boolean) as string[]
      if (shared.length) out.push(f({ ...base, id: `CG-${p.id}-related-${i}${j}`, rule: procurementRules.related, level: 'high', title: `${p.name}投标人 ${a.name.replace(/有限公司|工程/g, '')} 与 ${b.name.replace(/有限公司|工程/g, '')} 存在关联`, amount: p.budget, evidence: shared.map(s => ({ label: '关联信息', value: s })).concat([{ label: '中标人', value: p.winner }]), basis: '同一项目的不同投标人之间存在法人、电话或地址重合（企业登记数据比对）。' }))
      const sim = similarity(p.bids[i]!.doc, p.bids[j]!.doc)
      if (sim >= 0.8) out.push(f({ ...base, id: `CG-${p.id}-doc-${i}${j}`, rule: procurementRules.docsim, level: 'high', title: `${p.name}两份标书技术方案文本相似度 ${Math.round(sim * 100)}%`, amount: p.budget,
        evidence: [{ label: a.name, value: p.bids[i]!.doc }, { label: b.name, value: p.bids[j]!.doc }, { label: '相似度', value: `${Math.round(sim * 100)}%` }], basis: '不同投标人的技术方案文本高度雷同，可能由同一人编制。' }))
    }
    const sorted = [...p.bids].sort((a, b) => b.score - a.score), win = p.bids.find(b => b.company === p.winner)!
    const lowest = [...p.bids].sort((a, b) => a.price - b.price)[0]!
    if (sorted[0]!.score - sorted[1]!.score >= 15 || (lowest.company !== p.winner && (win.price - lowest.price) / lowest.price > 0.15)) out.push(f({ ...base, id: `CG-${p.id}-score`, rule: procurementRules.score, level: 'mid', title: lowest.company !== p.winner && (win.price - lowest.price) / lowest.price > 0.15 ? `${p.name}报价高出最低价 ${Math.round(((win.price - lowest.price) / lowest.price) * 100)}% 仍中标` : `${p.name}中标人得分领先 ${(sorted[0]!.score - sorted[1]!.score).toFixed(1)} 分`, amount: win.price,
      evidence: p.bids.map(b => ({ label: b.company + (b.company === p.winner ? '（中标）' : ''), value: `报价 ${yuan(b.price)}，得分 ${b.score}` })), basis: '评分分差或价格与得分倒挂明显，需调阅评分细则和评委打分表。' }))
    const others = p.bids.filter(b => b.company !== p.winner).map(b => b.days).sort((a, b) => a - b)
    const median = others[Math.floor(others.length / 2)] || win.days
    if (win.days < median * 0.5) out.push(f({ ...base, id: `CG-${p.id}-days`, rule: procurementRules.duration, level: 'mid', title: `${p.name}中标工期 ${win.days} 天，不足其他投标人一半`, amount: win.price, evidence: p.bids.map(b => ({ label: b.company, value: `工期 ${b.days} 天` })), basis: '中标工期明显短于同类报价，需核实是否具备履约能力或存在事后变更。' }))
  }
  const wins = new Map<string, Project[]>()
  d.projects.forEach(p => wins.set(p.winner, [...(wins.get(p.winner) || []), p]))
  for (const [name, list] of wins) if (list.length >= 3) out.push(f({ id: `CG-repeat-${name}`, feature: 'procurement', rule: procurementRules.repeat, level: 'low', title: `${name}年内中标 ${list.length} 个村级项目`, subject: name, town: list[0]!.town, amount: list.reduce((s, p) => s + (p.bids.find(b => b.company === name)?.price || 0), 0), date: list[0]!.date,
    evidence: list.map(p => ({ label: p.id, value: `${p.name}，${p.date}` })), basis: '同一企业在同一区域高频中标，结合关联关系综合研判。' }))
  return out
}

// ───────── 公务支出 ─────────
export const expenseRules = { allowance: '违规发放津补贴', reception: '高频同城接待', meal: '异常餐饮票据', car: '公车异常使用' } as const
export function screenExpense(d: { allowances: Allowance[]; approved: string[]; receptions: Reception[]; meals: MealInvoice[]; trips: CarTrip[] }): Finding[] {
  const out: Finding[] = []
  for (const a of d.allowances) if (!d.approved.includes(a.item)) out.push(f({ id: `ZC-${a.id}`, feature: 'expense', rule: expenseRules.allowance, level: a.basis === '无' || a.basis === '镇自定' ? 'high' : 'mid', title: `${a.dept}发放「${a.item}」${yuan(a.amount)}`, subject: a.dept, town: a.town, amount: a.amount, date: a.month,
    evidence: [{ label: '发放对象', value: a.person }, { label: '项目', value: a.item }, { label: '发放依据', value: a.basis }, { label: '规范项目', value: d.approved.join('、') }], basis: '发放项目不在规范津补贴目录内，需核查是否有上级批准依据。' }))
  const group = new Map<string, Reception[]>()
  d.receptions.filter(r => r.local).forEach(r => { const k = `${r.dept}|${r.date.slice(0, 7)}`; group.set(k, [...(group.get(k) || []), r]) })
  for (const [k, list] of group) if (list.length >= 3) { const [dept, month] = k.split('|'); const noLetter = list.filter(r => !r.letter).length; out.push(f({ id: `ZC-rec-${dept}-${month}`, feature: 'expense', rule: expenseRules.reception, level: noLetter >= 2 ? 'high' : 'mid', title: `${dept} ${month} 同城公务接待 ${list.length} 次，${noLetter} 次无公函`, subject: dept!, town: list[0]!.town, amount: list.reduce((s, r) => s + r.amount, 0), date: month,
    evidence: list.map(r => ({ label: r.date, value: `${r.guest}，${r.people} 人，${yuan(r.amount)}，人均 ${Math.round(r.amount / r.people)} 元，${r.letter ? '有公函' : '无公函'}` })), basis: '同城公务活动原则上不安排接待；高频接待且缺少公函，需核查真实性。' })) }
  for (const r of d.receptions.filter(x => !x.local)) { const per = r.amount / r.people; if (per > 200) out.push(f({ id: `ZC-rec-${r.id}`, feature: 'expense', rule: expenseRules.reception, level: 'mid', title: `${r.dept}接待人均 ${Math.round(per)} 元`, subject: r.dept, town: r.town, amount: r.amount, date: r.date, evidence: [{ label: r.date, value: `${r.guest}，${r.people} 人，${yuan(r.amount)}` }, { label: '演示标准', value: '人均不超过 200 元' }], basis: '接待费用超出演示标准，需核对接待清单。' })) }
  const days = new Map<string, MealInvoice[]>()
  d.meals.forEach(m => { const k = `${m.dept}|${m.vendor}|${m.date}`; days.set(k, [...(days.get(k) || []), m]) })
  for (const list of days.values()) if (list.length >= 2) out.push(f({ id: `ZC-meal-split-${list[0]!.id}`, feature: 'expense', rule: expenseRules.meal, level: 'high', title: `${list[0]!.dept}同日同店开具 ${list.length} 张餐饮发票，疑似拆分报销`, subject: list[0]!.dept, town: list[0]!.town, amount: list.reduce((s, m) => s + m.amount, 0), date: list[0]!.date,
    evidence: list.map(m => ({ label: `${m.id} · ${m.time}`, value: `${m.vendor} ${yuan(m.amount)}` })), basis: '同一商户、同一天、相隔数分钟的多张发票金额均略低于 1,000 元，存在规避审批的可能。' }))
  for (const m of d.meals) if ((m.weekend || m.time >= '21:00') && !(days.get(`${m.dept}|${m.vendor}|${m.date}`)!.length >= 2)) out.push(f({ id: `ZC-meal-${m.id}`, feature: 'expense', rule: expenseRules.meal, level: 'mid', title: `${m.dept}${m.weekend ? '周末' : '深夜'}餐饮发票 ${yuan(m.amount)}`, subject: m.dept, town: m.town, amount: m.amount, date: m.date, evidence: [{ label: m.id, value: `${m.date} ${m.time}${m.weekend ? '（周末）' : ''}，${m.vendor}，${yuan(m.amount)}` }], basis: '非工作时间餐饮支出需核实公务事由与接待清单。' }))
  for (const t of d.trips) if (t.weekend && (t.purpose === '未登记' || /商场|景区/.test(t.route))) out.push(f({ id: `ZC-car-${t.id}`, feature: 'expense', rule: expenseRules.car, level: t.purpose === '未登记' ? 'high' : 'mid', title: `${t.plate} · ${t.date}（周末）${t.route}，${t.km} 公里`, subject: t.dept, town: t.town, date: t.date,
    evidence: [{ label: '车辆', value: `${t.plate}（${t.dept}）` }, { label: '行程', value: `${t.route}，${t.km} 公里` }, { label: '用车事由', value: t.purpose }], basis: '周末行驶至非公务场所或无用车登记（公车定位与派车单比对）。' }))
  return out
}

// ───────── 风险一张图 ─────────
export function levelFor(count: number): RiskLevel | null { return count >= 5 ? 'high' : count >= 3 ? 'mid' : count >= 1 ? 'low' : null }
export function aggregateByTown(items: { town?: string }[]) {
  const map: Record<string, { count: number; level: RiskLevel | null }> = {}
  for (const x of items) if (x.town) { map[x.town] = map[x.town] || { count: 0, level: null }; map[x.town]!.count++ }
  for (const k of Object.keys(map)) map[k]!.level = levelFor(map[k]!.count)
  return map
}
