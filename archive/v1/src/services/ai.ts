import type { Clue, ClueAnalysis } from '../types'
import { contractIds, extractWorkspaceFields, matchingClues } from './clue-workspace'

const pause = (duration = 650) => new Promise<void>(resolve => setTimeout(resolve, duration))
export interface AIService { analyzeClue(clue: Clue, allClues: Clue[]): Promise<ClueAnalysis> }
export interface OCRService { parse(file: File): Promise<{ text: string; simulated: boolean; note: string }> }
export interface KnowledgeService { search(query: string): Promise<{ title: string; excerpt: string; note: string }[]> }
export const aiService: AIService = {
  async analyzeClue(clue, allClues) {
    await pause(600)
    const asset = ['XF-2026-0108', 'XF-2026-0106'].includes(clue.id) && contractIds(clue.content).includes('SZ-HT-2026-018')
    const subsidy = clue.id === 'XF-2026-0104' && /清源村/.test(clue.content) && /8,000|8，000|8000/.test(clue.content) && /48,000|48，000|48000/.test(clue.content)
    const serviceRequest = clue.id === 'XF-2026-0101' && /路灯|照明维修/.test(clue.content)
    if (!asset && !subsidy && !serviceRequest) {
      const lines = clue.content.replace(/【[^】]*】/g, '').split('\n').map(x => x.trim()).filter(Boolean)
      const amounts = clue.content.match(/\d[\d,.，]*\s*(?:万元|元)/g) || []
      const period = extractWorkspaceFields(clue).deadline.value
      const ids = contractIds(clue.content)
      const duplicates = matchingClues(clue, allClues).filter(id => allClues.find(item => item.id === id)?.status !== '已合并')
      return {
        subject: '材料涉及对象待工作人员确认', category: '自录材料 · 待人工分类',
        period: period || '材料未提取到明确日期',
        amount: amounts.length ? [...new Set(amounts)].slice(0, 4).join('、') + '（仅原文提取）' : '材料未提取到明确金额',
        discipline: ['待人工分类'], keywords: ['自录材料', '要素待核对'], related: ids,
        summary: '已按本地演示规则提取材料中的日期、金额和合同编号。该材料不属于内置专项样例，尚不能据此判断问题性质；请工作人员核实原始来源、涉及对象与具体诉求后决定办理方式。',
        evidence: [{ source: `${clue.id} · 自录原文摘录`, excerpt: lines.join(' ').slice(0, 150), rule: '本地文本规则提取，不调用外网模型，不推断材料未载明的事实', question: '原始材料是否完整、反映事项是否属于本单位职责、还需补充哪些凭据？' }],
        duplicateIds: duplicates,
        duplicateReason: duplicates.length ? `原文包含相同合同编号 ${ids.join('、')}，是否同一事项需人工确认。` : undefined,
      }
    }
    const duplicateIds = asset ? matchingClues(clue, allClues).filter(id => allClues.find(item => item.id === id)?.status !== '已合并') : []
    return {
      subject: asset ? '村集体经办人员（匿名占位，具体人员待核）' : subsidy ? '补助审核及采购经办人员（匿名占位）' : '暂未提及具体被反映对象',
      category: asset ? '农村集体资产租赁 · 收款信息核对' : subsidy ? '惠农资金申报与采购程序核对' : '公共设施维修 · 职责范围待确认',
      period: asset ? '2026年度，付款节点6月30日' : subsidy ? '2026年第三季度' : '材料未载明具体发生日期',
      amount: asset ? '约定36,000元 / 已见12,000元 / 待核24,000元' : subsidy ? '补助8,000元；工程预算48,000元' : '未涉及具体金额',
      discipline: asset || subsidy ? ['工作纪律（辅助标签）', '群众纪律（辅助标签）'] : ['待人工分类'],
      keywords: asset ? ['集体场地', '租赁合同', '收款公开', '付款节点'] : subsidy ? ['惠农补助', '申报材料', '询价记录', '公开资料'] : ['道路照明', '维修诉求', '转办建议'],
      related: asset ? ['SZ-HT-2026-018', '禾川农机服务社（虚构）', '和盛村集体场地'] : subsidy ? ['演示经营户丙', '道路整修项目（虚构）'] : ['新桥村公共道路（虚构）'],
      summary: asset ? '材料反映合同约定应收与现有公开到账记录存在24,000元差额。应先核对完整银行回单、付款节点与补充协议，现有材料不足以认定欠缴或违规。' : subsidy ? '补助申报要素及项目询价附件存在待核对事项。建议分别调阅申报、验收、公示与采购记录，分项核实材料一致性。' : '材料主要为照明维修和政策咨询，暂未包含明确干部履职问题。建议工作人员核实职责范围后决定转办，保留受理记录。',
      evidence: asset ? [
        { source: `${clue.id} · 原始材料`, excerpt: '合同编号 SZ-HT-2026-018，全年租金36,000元；已见到账12,000元。', rule: '合同编号与金额要素提取，非事实认定', question: '是否存在未录入收款、补充协议或后续到账？' },
        { source: '关联线索交叉对照', excerpt: '同一村集体场地、同一承租方及同一合同编号在两份材料中出现。', rule: '合同编号一致，项目名称与金额一致', question: '两份材料是否反映同一事项，是否适合合并核查？' },
      ] : subsidy ? [
        { source: `${clue.id} · 第2段`, excerpt: '申报补助8,000元，公开说明与申报材料的设施面积可能不一致。', rule: '材料要素一致性辅助检查', question: '申报表、现场验收与公开材料是否一致？' },
        { source: `${clue.id} · 第3段`, excerpt: '道路整修项目预算48,000元，暂未看到三方报价附件。', rule: '关键附件完整性检查', question: '询价附件是否未公开、未归档或确实缺失？' },
      ] : [{ source: `${clue.id} · 原始诉求`, excerpt: '两盏路灯不亮，希望安排维修并咨询申请流程。', rule: '诉求类别辅助识别，不自动丢弃材料', question: '是否转交公共设施维修主管部门？由人工确认。' }],
      duplicateIds,
      duplicateReason: duplicateIds.length ? '合同编号 SZ-HT-2026-018 完全一致；涉及同一集体场地、承租方与年度租金。举报频次不作为违规认定依据。' : undefined,
      scopeNote: !asset && !subsidy ? '本诉求可能属于便民服务办理范围，需由工作人员确认后按职责转办。系统保留原始材料。' : undefined,
    }
  },
}
export const ocrService: OCRService = {
  async parse(file) {
    await pause(450)
    if (/\.txt$/i.test(file.name)) return { text: await file.text(), simulated: false, note: '已读取本地文本；文件未上传外网。' }
    return { text: `【演示模拟解析 · 非真实OCR识别】\n文件名：${file.name}\n\n本演示未接入OCR服务。以下使用内置合同材料展示解析流程，不代表附件实际内容。\n\n青禾镇和盛村集体场地租赁合同 SZ-HT-2026-018，2026年度租金36,000元，已关联到账12,000元，其余24,000元待核对完整收款资料。`, simulated: true, note: '图片/PDF使用内置样例模拟解析，未识别附件实际内容。' }
  },
}
export const knowledgeService: KnowledgeService = {
  async search(query) { await pause(350); return [{ title: '基层监督材料审核参考条目（内置演示）', excerpt: `检索词“${query}”关联材料要素完整性、原始凭证核对与人工复核要求。`, note: '系统内置演示条目，非真实法规全文或正式法律意见。' }] },
}
