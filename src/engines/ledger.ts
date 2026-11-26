/** 线索处置台账初稿：按登记、时限与流转节点汇总，供人工修改后使用。 */
export interface LedgerRow { id: string; channel: string; receivedAt: string; place: string; accused: string; issue: string; level: string; node: string; deadline: string; state: string; assignee: string }
export function ledgerDraft(rows: LedgerRow[], date: string) {
  const count = (s: string) => rows.filter(r => r.state === s).length
  const lines = rows.map((r, i) => `${i + 1}. ${r.id}｜${r.channel}｜${r.receivedAt} 受理｜${r.place}｜被反映人：${r.accused || '未明确'}｜问题类型：${r.issue || '待研判'}｜初筛分级：${r.level}｜当前节点：${r.node}｜承办：${r.assignee}｜办理时限：${r.deadline}（${r.state}）`)
  return [
    `线索处置台账（初稿）`,
    `统计截至：${date}　共 ${rows.length} 条；正常 ${count('正常')} 条，即将到期 ${count('即将到期')} 条，已超期 ${count('已超期')} 条，已办结 ${count('已办结')} 条。`,
    ``,
    ...lines,
    ``,
    `督办提示：已超期线索请承办部门说明原因并明确办结时间；即将到期线索请在时限内完成初步处置。`,
    `说明：本台账由系统按登记与流转记录自动汇总，分级为初筛参考，内容须经承办人员核对后使用。`,
  ].join('\n')
}
