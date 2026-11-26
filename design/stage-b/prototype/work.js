import { caseData } from '../case.js';

const fieldDefinitions = [
  { key: 'tenant', number: '1', label: '承租主体', original: '禾川农机服务社（虚构）', note: '名称中有一个字需要对照原文。' },
  { key: 'event', number: '2', label: '反映事项', original: '和盛村集体场地租赁款收取情况', note: '保留材料反映的事项，不将表述改写为查明事实。' },
  { key: 'deadline', number: '3', label: '约定付款时间', original: '2026年度，应于6月30日前交付', note: '以原文为依据，付款安排是否变化仍待核实。' },
  { key: 'amount', number: '4', label: '材料涉及金额', original: '年租36,000元，已见到账12,000元', note: '差额24,000元待核对，不等于实际欠缴。' },
];

export function renderWork(state, ui) {
  const esc = ui.esc;
  const icon = (name, size = 17) => ui.icons(name, size);
  const phase = state.phase || 'initial';
  const extracted = phase === 'extracted';
  const analyzing = phase === 'analyzing';
  const fields = state.fields || {};
  const confirmed = fieldDefinitions.filter(field => fields[field.key]?.status === 'confirmed').length;
  const notesOpen = ui.notesOpen !== false;
  const relationText = ({ linked: '已人工关联', separate: '暂不关联', deferred: '关联待核', pending: '待人工判断' })[state.relation] || '待人工判断';

  function sourceAnchor(key, text) {
    const definition = fieldDefinitions.find(item => item.key === key);
    return `<button id="source-${key}" class="work-source-anchor ${ui.sourceHighlight === key ? 'is-located' : ''} ${extracted ? 'is-extracted' : ''}" data-action="locate" data-source="${key}" aria-label="定位${definition.label}的原文依据">${esc(text)}${extracted ? `<sup>${definition.number}</sup>` : ''}</button>`;
  }

  function editor(key, definition, field) {
    return `<div class="work-field-editor"><div class="work-editor-heading">修正提取结果<span>原件保持不变</span></div><label class="work-edit-label" for="field-edit-input">${definition.label}</label><div class="work-ai-original"><span>AI 原始提取</span><span>${esc(field.aiValue || field.value || '尚未提取')}</span></div><input id="field-edit-input" class="work-edit-input" type="text" value="${esc(ui.editValue || '')}" aria-label="修正${definition.label}" autocomplete="off" spellcheck="false">${ui.editError ? `<p class="work-edit-error" role="alert">${icon('info', 15)}${esc(ui.editError)}</p>` : ''}<div class="work-edit-actions"><button class="work-button work-button-quiet" data-action="cancel-field">取消</button><button class="work-button work-button-primary" data-action="save-field" data-field="${key}">${icon('check', 15)}保存修订</button></div></div>`;
  }

  function fieldNote(definition) {
    const field = fields[definition.key] || { value: '', aiValue: '', status: 'pending' };
    const isConfirmed = field.status === 'confirmed';
    const isEditing = ui.editingField === definition.key;
    const isLocated = ui.sourceHighlight === definition.key;
    return `<section class="work-field-note ${isConfirmed ? 'is-confirmed' : ''} ${isLocated ? 'is-located' : ''} ${isEditing ? 'is-editing' : ''}"><div class="work-note-kicker"><span class="work-note-number">${definition.number}</span><span>${isConfirmed ? '人工确认 · 提取内容' : 'AI 提取 · 待核对'}</span>${field.lowConfidence && !isConfirmed ? '<span class="work-low-confidence">需核对</span>' : ''}</div><div class="work-field-heading"><h3>${definition.label}</h3>${isConfirmed ? icon('check', 17) : ''}</div><p class="work-field-value">${esc(field.value || '待核对')}</p>${definition.key === 'tenant' && !isConfirmed ? `<p class="work-source-correction">原文：${esc(definition.original)}</p>` : ''}${isConfirmed ? '<p class="work-confirmed-note">已确认提取文字，业务事实仍需核实。</p>' : ''}${isEditing ? editor(definition.key, definition, field) : `<div class="work-field-actions"><button data-action="locate" data-source="${definition.key}">${icon('search', 14)}定位原文</button><button data-action="edit-field" data-field="${definition.key}">${icon('edit', 14)}修正</button>${!isConfirmed ? `<button data-action="confirm-field" data-field="${definition.key}">${icon('check', 14)}确认提取</button>` : ''}</div>`}</section>`;
  }

  function notes() {
    if (!notesOpen) return '';
    let content = '';
    if (analyzing) {
      content = `<div class="work-notes-state work-analyzing" role="status"><span class="work-state-symbol">${icon('search', 26)}</span><h3>正在整理材料…</h3><p>模拟识别要素，并把每条提取结果与原文出处对应。</p><ol class="work-analysis-steps"><li class="is-active"><span></span>读取原件中的主体与事项</li><li><span></span>整理时间、金额与出处</li><li><span></span>准备供人工核对的结果</li></ol><p class="work-state-boundary">演示模拟 · 未调用真实 OCR 或大模型</p></div>`;
    } else if (!extracted) {
      content = `<div class="work-notes-state"><span class="work-state-symbol">${icon('file', 28)}</span><h3>尚未提取</h3><p>先读这份材料。辅助提取会整理主体、事项、时间和金额，每一项都能回到原句。</p><button class="work-button work-button-primary work-extract-button" data-action="extract">开始辅助提取 ${icon('chevronDown', 16)}</button><p class="work-state-boundary">只整理材料，不作事实判断。<br>本原型使用本地固定样例模拟。</p></div>`;
    } else {
      content = `<div class="work-field-list">${fieldDefinitions.map(fieldNote).join('')}</div><div class="work-notes-boundary">${icon('info', 15)}<p>确认、修正的都是提取内容；不改变原件，也不代表材料反映内容已被查实。</p></div>`;
    }
    return `<aside class="work-notes" aria-label="随文批注"><div class="work-notes-head"><div><h2>随文批注 ${extracted ? '<span>4</span>' : ''}</h2>${extracted ? `<p>${confirmed} / 4 项提取内容已人工确认</p>` : '<p>与原文对应，按需核对</p>'}</div><button class="work-close-notes" data-action="toggle-notes" aria-label="收起批注，扩大阅读区域" title="收起批注">${icon('close', 19)}</button></div><div class="work-notes-scroll">${content}</div></aside>`;
  }

  const status = state.submitted ? '已提交人工复核' : state.dirty ? '有未保存修改' : state.saved ? '摘要已保存 · 待复核' : extracted ? `${confirmed} / 4 项提取内容已确认` : analyzing ? '正在模拟辅助提取' : '原始材料已就绪';

  return `<main class="work-main" data-work-phase="${phase}"><div class="work-stage-heading"><div class="work-stage-title"><button class="work-back" data-action="home" aria-label="返回我的案头">${icon('arrowLeft', 21)}</button><h1>材料审阅 <span>· ${esc(caseData.id)}</span></h1></div><div class="work-provenance" aria-label="内容来源标识"><span>${icon('file', 17)}原件陈述</span><span>${icon('search', 17)}台账检索记录</span><span class="work-provenance-ai">${icon('info', 17)}AI 辅助建议</span><span class="work-provenance-human">${icon('check', 17)}人工确认</span></div></div><nav class="work-source-bar" aria-label="相关材料"><span class="work-source-label">相关材料 <b>3</b></span><button class="${state.lastSource === 'contract' ? 'is-active' : ''}" data-action="source" data-source="contract">${icon('link', 16)}合同条款 <span>${esc(caseData.contract)}</span></button><button class="${state.lastSource === 'receipt' ? 'is-active' : ''}" data-action="source" data-source="receipt">${icon('link', 16)}收款记录 <span>2026-03-18</span></button><button data-action="related">${icon('link', 16)}相似材料 <span>1 · ${relationText}</span></button>${!notesOpen ? `<button class="work-show-notes" data-action="toggle-notes">${icon('edit', 16)}展开批注${extracted ? ' · 4' : ''}</button>` : ''}</nav><div class="work-reading-layout ${notesOpen ? 'has-notes' : 'notes-closed'}"><article class="work-document" aria-label="原始举报材料"><header class="work-document-heading"><h2>${esc(caseData.title)}</h2><div class="work-document-meta"><span>材料编号 <strong>${esc(caseData.id)}</strong></span><span>反映人 <strong>${esc(caseData.reporter)}</strong></span><span>${esc(caseData.area)}</span><span class="work-meta-origin">${esc(caseData.date)} · ${esc(caseData.source)} · 虚构演示</span></div></header><div class="work-prose"><p>本人反映${sourceAnchor('event', '和盛村集体场地租赁款收取情况')}。场地租赁合同编号为 ${esc(caseData.contract)}，承租方为${sourceAnchor('tenant', `${caseData.tenant}（虚构）`)}。合同约定 2026 年度租金${sourceAnchor('amount', '36,000元')}，应于${sourceAnchor('deadline', '6月30日前交付')}。村级公开记录中仅见 2026 年 3 月 18 日到账 12,000 元，其余款项未见对应记录。</p><p>${esc(caseData.paragraphs[2])}</p><p class="work-original-disclaimer">${esc(caseData.paragraphs[3])}</p></div><div class="work-reading-boundary">${icon('info', 16)}<p>原件始终保留。点击带编号的原句可定位批注；修订只作用于提取结果。</p></div><div class="work-record-sources"><span>可对照的演示依据</span><button data-action="source" data-source="contract">合同第三条 ${icon('link', 14)}</button><button data-action="source" data-source="receipt">收款记录 SK-20260318-01 ${icon('link', 14)}</button></div></article>${notes()}</div></main><footer class="work-actionbar"><div class="work-action-status">${icon(state.submitted || (state.saved && !state.dirty) ? 'check' : 'info', 18)}<div><strong>${status}</strong><span>保存整理结果，不作受理或处置决定。</span></div></div><div class="work-bottom-actions"><button class="work-button" data-action="related" ${analyzing ? 'disabled' : ''}>${icon('search', 18)}查看相似材料</button><button class="work-button work-button-primary" data-action="summary" ${!extracted ? 'disabled' : ''}>${icon('file', 18)}${state.saved && !state.dirty ? '查看待复核摘要' : '保存待复核摘要'}</button></div></footer>`;
}
