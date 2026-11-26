/** 线索督办时限：演示规则为受理后 15 日内完成初步处置；剩余 3 日内为即将到期。 */
export const flowNodes = ['登记受理', '分办交办', '初步核实', '处置办结'] as const
export type FlowNode = typeof flowNodes[number]
const DAY = 86400000
export function addDays(date: string, days: number) { const d = new Date(`${date}T00:00:00+08:00`); d.setTime(d.getTime() + days * DAY); return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }) }
export function daysBetween(from: string, to: string) { return Math.round((new Date(`${to}T00:00:00+08:00`).getTime() - new Date(`${from}T00:00:00+08:00`).getTime()) / DAY) }
export function deadlineState(receivedAt: string, today: string, done: boolean, limit = 15) {
  const deadline = addDays(receivedAt, limit)
  const left = daysBetween(today, deadline)
  const state = done ? '已办结' : left < 0 ? '已超期' : left <= 3 ? '即将到期' : '正常'
  return { deadline, left, state: state as '已办结' | '已超期' | '即将到期' | '正常' }
}
