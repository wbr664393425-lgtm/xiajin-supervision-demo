import { describe, expect, it } from 'vitest'
import * as m from '@/mock/supervision'
import { screenAssets, screenSubsidy, screenProcurement, screenExpense, aggregateByTown } from './supervision'

const T = '2026-11-06'
const assets = screenAssets({ contracts: m.contracts, receipts: m.receipts, idle: m.idleAssets, vouchers: m.vouchers }, T)
const subsidy = screenSubsidy({ grants: m.grants, residents: m.residents, lands: m.lands, insurance: m.insurance })
const procurement = screenProcurement({ projects: m.projects, companies: m.companies })
const expense = screenExpense({ allowances: m.allowances, approved: m.approvedAllowances, receptions: m.receptions, meals: m.meals, trips: m.carTrips })
const rules = (list: { rule: string }[]) => [...new Set(list.map(x => x.rule))].sort()

describe('supervision engines', () => {
  it('三资 covers all six required risk types', () => {
    expect(rules(assets)).toEqual(expect.arrayContaining(['到期未收', '低价发包', '长期闲置', '重复报账', '白条入账', '程序缺失']))
    const unpaid = assets.find(x => x.id === 'AS-SZ-HT-2026-018-unpaid')!
    expect(unpaid.amount).toBe(24000)
    expect(assets.some(x => x.subject.includes('农产品展销棚'))).toBe(false)
  })
  it('惠民资金 finds multi-claims, deceased, duplicates and ineligible recipients', () => {
    expect(rules(subsidy)).toEqual(['一人多领', '死亡继续领取', '资格不符', '重复申领'].sort())
    expect(subsidy.filter(x => x.rule === '死亡继续领取').map(x => x.subject.split(' ')[0])).toEqual(['赵某兰', '王某秀'])
    expect(subsidy.some(x => x.subject.startsWith('褚某平'))).toBe(false)
  })
  it('招投标 flags convergence, related bidders, cloned bids, scoring and duration anomalies', () => {
    expect(rules(procurement)).toEqual(expect.arrayContaining(['报价趋同', '供应商关联', '标书雷同', '评分异常', '工期异常']))
    expect(procurement.some(x => x.id.startsWith('CG-BT-CG-2026-02'))).toBe(false)
  })
  it('公务支出 covers allowances, receptions, meals and cars', () => {
    expect(rules(expense)).toEqual(['公车异常使用', '高频同城接待', '异常餐饮票据', '违规发放津补贴'].sort())
    expect(expense.find(x => x.title.includes('拆分'))!.amount).toBe(2930)
    expect(expense.some(x => x.id === 'ZC-JB-02')).toBe(false)
  })
  it('every finding carries evidence and a basis, and ids are unique', () => {
    const all = [...assets, ...subsidy, ...procurement, ...expense]
    expect(new Set(all.map(x => x.id)).size).toBe(all.length)
    for (const x of all) { expect(x.evidence.length).toBeGreaterThan(0); expect(x.basis.length).toBeGreaterThan(10) }
    const map = aggregateByTown(all)
    expect(map.qinghe!.count).toBeGreaterThan(0)
  })
})
