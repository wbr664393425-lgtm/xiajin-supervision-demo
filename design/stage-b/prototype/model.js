import { caseData } from '../case.js';

const keys = ['tenant', 'event', 'deadline', 'amount'];
const names = { tenant: '承租主体', event: '反映事项', deadline: '付款时间', amount: '材料金额' };
const aiValues = {
  tenant: caseData.aiTenant,
  event: '和盛村集体场地租赁款收取情况',
  deadline: '2026年6月30日前',
  amount: '年租36,000元，已见到账12,000元，差额24,000元待核',
};
const relationLabels = { pending: '尚未判断', linked: '已人工关联', separate: '暂不关联', deferred: '关联待核' };
const copy = value => JSON.parse(JSON.stringify(value));
const now = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });

function fields(extracted) {
  return Object.fromEntries(keys.map(key => [key, { value: extracted ? aiValues[key] : '', aiValue: extracted ? aiValues[key] : '', status: 'pending', lowConfidence: extracted && key === 'tenant', revisions: [] }]));
}

export function createState() {
  return { phase: 'extracted', view: 'home', fields: fields(true), relation: 'pending', summary: '', summaryStale: false, saved: null, submitted: false, dirty: false, lastSource: 'original', events: [], recordCreated: true };
}

function changed(state, affectsSummary = false) {
  state.dirty = true;
  state.submitted = false;
  if (affectsSummary && state.summary.trim()) state.summaryStale = true;
  delete state.submittedAt;
}

function record(state, action, detail, time) {
  state.events.push({ id: state.events.length + 1, action, detail, time });
}

function tenantMatches(value) {
  return value.replace(/\s/g, '').replace(/（虚构）|\(虚构\)/g, '') === caseData.tenant;
}

export function buildSummary(state) {
  const field = key => state.fields[key]?.value || '尚未提取';
  const confirmed = keys.filter(key => state.fields[key]?.status === 'confirmed').length;
  return `【原件陈述】材料反映青禾镇和盛村集体场地租赁款收取情况，涉及合同 ${caseData.contract}。\n\n【整理内容 · ${confirmed}/4项提取已人工确认】承租主体：${field('tenant')}；反映事项：${field('event')}；付款时间：${field('deadline')}；涉及金额：${field('amount')}。\n\n【系统检索记录】演示收款台账 SK-20260318-01 记录2026年3月18日到账12,000元。当前仅见这一条记录，不表示不存在其他收款。\n\n【人工关联决定】相似材料 ${caseData.relatedId}：${relationLabels[state.relation] || '尚未判断'}。两份原件分别保留。\n\n【仍待核对】需补充完整收款凭证、银行流水、付款节点和补充约定。24,000元差额是待核对项，现有材料不足以认定欠缴或违规。人工确认提取文字不等于查明业务事实。`;
}

export function getReviewBlockers(state) {
  const blockers = [];
  if (state.phase !== 'extracted') blockers.push('尚未完成辅助提取');
  const pending = keys.filter(key => !state.fields[key]?.value?.trim() || state.fields[key]?.status !== 'confirmed');
  if (pending.length) blockers.push(`${pending.map(key => names[key]).join('、')}尚未人工确认`);
  if (!tenantMatches(state.fields.tenant?.value || '')) {
    if (!pending.includes('tenant')) blockers.push('承租主体与本样例原件不一致');
  }
  if (state.relation === 'pending' || !relationLabels[state.relation]) blockers.push('尚未完成相似材料关联判断');
  if (state.summaryStale) blockers.push('基础信息已更新，摘要需要重新整理或修订');
  if (!state.saved) blockers.push('尚未保存待复核摘要');
  else if (state.dirty) blockers.push('工作稿修改后尚未重新保存');
  if (state.saved && (!state.saved.summary?.trim() || state.saved.summary !== state.summary)) blockers.push('当前摘要与保存稿不一致');
  return blockers;
}

// Mutations are limited to this disposable prototype state. No application store or API.
export function applyAction(state, action, payload = {}) {
  const fail = error => ({ state, error });
  const time = payload.at || now();
  switch (action) {
    case 'RESET': return { state: createState() };
    case 'VIEW':
      if (!['home', 'work'].includes(payload.view)) return fail('工作区域无效。');
      state.view = payload.view;
      break;
    case 'START_READ':
      state = { ...createState(), phase: 'initial', view: 'work', fields: fields(false), dirty: true };
      record(state, action, '保留虚构举报原件，建立新的演示工作稿。', time);
      break;
    case 'BEGIN_ANALYSIS':
      if (state.phase !== 'initial') return fail('请从尚未提取的原件开始。');
      state.phase = 'analyzing';
      changed(state);
      record(state, action, '开始本地模拟辅助提取，未调用真实 OCR 或模型。', time);
      break;
    case 'FINISH_ANALYSIS':
      if (state.phase !== 'analyzing') return fail('当前没有进行中的辅助提取。');
      state.phase = 'extracted';
      state.fields = fields(true);
      changed(state);
      record(state, action, '模拟提取完成：4项内容待人工核对，承租主体存在低置信提示。', time);
      break;
    case 'EDIT_FIELD': {
      const key = payload.field;
      if (state.phase !== 'extracted' || !keys.includes(key)) return fail('请在完成辅助提取后修订对应字段。');
      const value = String(payload.value ?? '').trim();
      if (!value) return fail('修订内容不能为空，请对照原文补充。');
      if (key === 'tenant' && !tenantMatches(value)) return fail(`本样例原文为“${caseData.tenant}”，请对照原文修正后再确认。`);
      const field = state.fields[key];
      if (value === field.value && field.status === 'confirmed') break;
      field.revisions.push({ before: field.value, after: value, by: '演示专员', at: time });
      field.value = value;
      field.status = 'confirmed';
      field.lowConfidence = false;
      changed(state, true);
      record(state, action, `人工修订并确认${names[key]}：${value}。原件保持不变。`, time);
      break;
    }
    case 'CONFIRM_FIELD': {
      const key = payload.field;
      if (state.phase !== 'extracted' || !keys.includes(key)) return fail('尚无可确认的提取内容。');
      const field = state.fields[key];
      if (!field.value.trim()) return fail('提取内容为空，请补充后再确认。');
      if (key === 'tenant' && !tenantMatches(field.value)) return fail(`请对照原文，将承租方修正为“${caseData.tenant}”后再确认。`);
      if (field.status === 'confirmed') break;
      field.status = 'confirmed';
      field.lowConfidence = false;
      changed(state, true);
      record(state, action, `人工确认${names[key]}的提取文字；不代表业务事实已经核实。`, time);
      break;
    }
    case 'SET_RELATION':
      if (!['linked', 'separate', 'deferred'].includes(payload.relation)) return fail('请选择人工关联、暂不关联或标记待核。');
      if (state.relation === payload.relation) break;
      state.relation = payload.relation;
      changed(state, true);
      record(state, action, `人工判断相似材料 ${caseData.relatedId}：${relationLabels[state.relation]}。两份原件分别保留。`, time);
      break;
    case 'SET_SUMMARY': {
      const value = String(payload.text ?? '');
      if (state.summary === value && !payload.refreshed) break;
      state.summary = value;
      state.summaryStale = false;
      changed(state);
      // Do not create an audit entry for every typed character. Saving records the revision.
      break;
    }
    case 'SAVE_SUMMARY':
      if (state.phase !== 'extracted') return fail('请完成辅助提取后再整理摘要。');
      if (!state.summary.trim()) return fail('摘要内容不能为空，请补充整理内容后再保存。');
      if (state.summaryStale) return fail('提取内容或关联决定已更新，请按当前信息重整或修订摘要后再保存。');
      state.saved = { summary: state.summary, savedAt: time, fields: copy(state.fields), relation: state.relation, confirmedBy: '演示专员' };
      state.dirty = false;
      state.submitted = false;
      delete state.submittedAt;
      record(state, action, '保存待复核摘要及当前核对、关联记录；未自动提交或生成任务。', time);
      break;
    case 'SUBMIT_REVIEW': {
      const blockers = getReviewBlockers(state);
      if (blockers.length) return fail(blockers.join('；'));
      if (payload.checked !== true) return fail('请先完成人工检查并勾选确认。');
      if (state.submitted) break;
      state.submitted = true;
      state.submittedAt = time;
      record(state, action, '演示专员完成人工检查并提交摘要，等待复核人处理；未作受理或处置决定。', time);
      break;
    }
    case 'OPEN_SOURCE':
      if (!['original', 'contract', 'receipt'].includes(payload.source)) return fail('来源不存在。');
      state.lastSource = payload.source;
      break;
    default: return fail('原型不支持此操作。');
  }
  return { state };
}

export function snapshotForStorage(state) { return copy(state); }
