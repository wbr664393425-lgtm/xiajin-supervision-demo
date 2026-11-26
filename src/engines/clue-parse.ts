/** 信访文本要素抽取：被反映人、问题类型、时间、金额、诉求，均回指原文位置；只使用原文中出现的字符。 */
import { findAll, parseAmount, sentences, type Span } from './text'
import { towns } from '@/mock/geo'

const UNIT_RE = new RegExp(`(?:${towns.map(t => t.name).join('|')})(?:${towns.flatMap(t => t.villages).join('|')}|[\\u4e00-\\u9fa5]{2,8}?(?:服务站|站|所|党委))?`)

export type FieldKey = 'accused' | 'unit' | 'issue' | 'time' | 'amount' | 'demand'
export interface ParsedField { key: FieldKey; label: string; value: string; span?: Span; confidence: 'high' | 'low' }
export interface ParsedClue { fields: Record<FieldKey, ParsedField>; persons: string[]; codes: string[]; companies: string[]; amounts: number[]; issueTypes: string[] }

const TITLE = '(?:村委会主任|村委会委员|村主任|党支部书记|支部书记|党委书记|党委委员|原村委会主任|会计|站长|镇干部|干部|书记|主任|委员)'
const NAME = '[\\u4e00-\\u9fa5]某(?:(?![把在的将对于是和与让也又给被向从说就利用多次])[\\u4e00-\\u9fa5])?'
export const issueRules: { type: string; re: RegExp }[] = [
  { type: '对抗组织审查', re: /串供|销毁[^。]{0,8}凭证|对抗组织审查/ },
  { type: '工程回扣', re: /回扣|帮助[^。]{0,12}承揽|利益关系/ },
  { type: '围标串标', re: /围标|串标|商量好/ },
  { type: '优亲厚友', re: /(亲属|亲戚|关系户|侄子|妻弟)[^。]{0,30}|(租给|列入|评上|交给|列为)[^。]{0,12}(亲属|亲戚|侄子|妻弟)/ },
  { type: '低价发包', re: /低于[^。]{0,10}市场|才\s*[\d,]+元|周边[^。]{0,10}都要/ },
  { type: '违规处置集体资产', re: /擅自[^。]{0,20}(出租|处置)|未经[^。]{0,20}研究/ },
  { type: '吃拿卡要', re: /吃拿卡要|请吃饭|送烟酒|跑腿费/ },
  { type: '违规公款吃喝', re: /吃喝|接待|工作餐/ },
  { type: '违规补贴', re: /(补助|补贴)[^。]{0,30}(不符合|虚报|收取)|不符合条件[^。]{0,20}(补助|补贴)/ },
  { type: '挪用集体资金', re: /个人账户|挪用|代为保管/ },
  { type: '选人用人违规', re: /选拔|提拔|后备干部|民主推荐/ },
  { type: '作风问题', re: /饮酒|作风/ },
  { type: '咨询求助', re: /咨询|报修|政策何时/ },
]

export function parseClue(text: string): ParsedClue {
  const accusedHits = findAll(text, new RegExp(`${TITLE}(${NAME})`))
  const nameHits = findAll(text, new RegExp(NAME))
  const persons = [...new Set(nameHits.map(h => h.text))]
  const first = accusedHits[0]
  const name = first ? first.text.match(new RegExp(NAME))![0] : nameHits[0]?.text
  const title = first ? first.text.replace(name || '', '') : ''
  const nameStart = first ? first.start + first.text.indexOf(name!) : nameHits[0]?.start
  const accused: ParsedField = name
    ? { key: 'accused', label: '被反映人', value: title ? `${name}（${title}）` : name, span: { start: nameStart!, end: nameStart! + name.length }, confidence: first ? 'high' : 'low' }
    : { key: 'accused', label: '被反映人', value: '', confidence: 'low' }

  const unitHit = findAll(text, UNIT_RE)[0]
  const unit: ParsedField = unitHit ? { key: 'unit', label: '涉及单位', value: unitHit.text, span: unitHit, confidence: 'high' } : { key: 'unit', label: '涉及单位', value: '', confidence: 'low' }

  const issueTypes: string[] = []
  let issueSpan: Span | undefined
  for (const rule of issueRules) { const hit = findAll(text, rule.re)[0]; if (hit) { issueTypes.push(rule.type); issueSpan ??= hit } }
  const issue: ParsedField = issueTypes.length ? { key: 'issue', label: '问题类型', value: issueTypes.slice(0, 3).join('、'), span: issueSpan, confidence: issueTypes.length > 0 ? 'high' : 'low' } : { key: 'issue', label: '问题类型', value: '', confidence: 'low' }

  const timeHit = findAll(text, /20\d\d年(?:第[一二三四]季度|\d{1,2}月(?:\d{1,2}日)?|以来)?|\d{1,2}月\d{1,2}日/)[0]
  const time: ParsedField = timeHit ? { key: 'time', label: '时间', value: timeHit.text, span: timeHit, confidence: /月|季度/.test(timeHit.text) ? 'high' : 'low' } : { key: 'time', label: '时间', value: '', confidence: 'low' }

  const amountHits = findAll(text, /(?:约)?[\d,]+(?:\.\d+)?元/)
  const amounts = amountHits.map(h => parseAmount(h.text))
  const amount: ParsedField = amountHits.length ? { key: 'amount', label: '涉及金额', value: amountHits.map(h => h.text).join('、'), span: amountHits[0], confidence: 'high' } : { key: 'amount', label: '涉及金额', value: '', confidence: 'low' }

  const demandSentence = [...sentences(text)].reverse().find(s => /希望|要求|请求|请(?:上级|纪委|组织)?/.test(s.text))
  const demand: ParsedField = demandSentence ? { key: 'demand', label: '诉求', value: demandSentence.text.replace(/。$/, ''), span: { start: demandSentence.start, end: demandSentence.start + demandSentence.text.length }, confidence: 'high' } : { key: 'demand', label: '诉求', value: '', confidence: 'low' }

  const codes = [...new Set(findAll(text, /[A-Z]{2}-[A-Z]{2}-\d{4}-\d{2,3}/).map(h => h.text))]
  const companies = [...new Set(findAll(text, /[\u4e00-\u9fa5]{2}(?:建设工程有限公司|农机服务社|园林公司|有限公司|服务社)/).map(h => h.text))]
  return { fields: { accused, unit, issue, time, amount, demand }, persons, codes, companies, amounts, issueTypes }
}
export const fieldOrder: FieldKey[] = ['accused', 'unit', 'issue', 'time', 'amount', 'demand']
