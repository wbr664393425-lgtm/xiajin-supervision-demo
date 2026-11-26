import { caseData } from '../case.js';
import { renderHome } from './home.js';
import { renderWork } from './work.js';
import { icons } from './icons.js';
import { createState, applyAction, getReviewBlockers, buildSummary } from './model.js';

// A disposable design-prototype cache. This origin and key are separate from the Vue demo.
const cacheKey = 'xiajin-stage-c-prototype-v1';
const fieldNames = { tenant: '承租主体', event: '反映事项', deadline: '付款时间', amount: '材料金额' };
const relationNames = { pending: '尚未判断', linked: '已人工关联', separate: '暂不关联', deferred: '关联待核' };
const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const announcer = document.querySelector('#announcer');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let state = restore();
let analysisTimer;
let returnFocus;
const ui = { icons, esc, notesOpen: true, editingField: null, editValue: '', editError: '', sourceHighlight: null, modal: null, error: '', notice: '', noticeError: false, userMenu: false, intakeText: '', reviewChecked: false, summaryDraft: null };

function restore() {
  try {
    const stored = JSON.parse(localStorage.getItem(cacheKey));
    if (stored?.version === 1 && ['home', 'work'].includes(stored.state?.view) &&
        ['initial', 'analyzing', 'extracted'].includes(stored.state?.phase) &&
        Object.keys(fieldNames).every(key => stored.state.fields?.[key] && typeof stored.state.fields[key].value === 'string') &&
        Array.isArray(stored.state.events)) {
      const recovered = stored.state;
      if (recovered.phase === 'analyzing') recovered.phase = 'initial';
      return recovered;
    }
  } catch { /* A disabled cache does not stop the prototype. */ }
  return createState();
}

function persist() {
  try { localStorage.setItem(cacheKey, JSON.stringify({ version: 1, state })); }
  catch { ui.notice = '浏览器未保存本地缓存，本次操作仍可继续；刷新后将回到样例初始状态。'; }
}

function announce(text) { announcer.textContent = ''; requestAnimationFrame(() => { announcer.textContent = text; }); }

function update(action, payload = {}) {
  const result = applyAction(state, action, payload);
  state = result.state;
  if (result.error) return result.error;
  if (['START_READ', 'EDIT_FIELD', 'CONFIRM_FIELD', 'SET_RELATION', 'SET_SUMMARY', 'SAVE_SUMMARY', 'RESET'].includes(action)) ui.reviewChecked = false;
  persist();
  return '';
}

function header() {
  return `<header class="app-header"><div class="app-header-left"><div class="app-brand" title="夏津县纪检监察 AI 智能辅助监督平台">夏津县纪检监察</div><div class="app-product">信访材料研判</div><nav class="app-nav" aria-label="工作区域"><button data-action="home" ${state.view === 'home' ? 'aria-current="page"' : ''}>我的案头</button><button data-action="work" ${state.view === 'work' ? 'aria-current="page"' : ''}>材料审阅</button></nav></div><div class="app-header-right"><time datetime="2026-11-03">2026-11-03 星期二</time><div class="app-user"><button class="app-user-trigger" data-action="user-menu" aria-expanded="${ui.userMenu}" aria-controls="user-menu" aria-label="演示专员菜单">${icons('user', 20)}<span>演示专员</span>${icons('chevronDown', 15)}</button>${ui.userMenu ? `<div id="user-menu" class="app-user-menu"><p>阶段 C · 独立交互原型<br>全部材料与操作均为虚构演示</p><button data-action="help">${icons('info', 16)}原型说明</button><button data-action="history">${icons('clock', 16)}查看整理记录</button><a href="../combined/" target="_blank" rel="noopener">${icons('external', 16)}已选视觉方向</a><button data-action="reset-dialog">${icons('reset', 16)}重置此原型样例</button></div>` : ''}</div></div></header>`;
}

function focusDescriptor(element) {
  if (!element || element === document.body) return null;
  return { id: element.id, action: element.dataset?.action, field: element.dataset?.field, source: element.dataset?.source, relation: element.dataset?.relation };
}

function focusMatch(descriptor) {
  if (!descriptor) return null;
  if (descriptor.id) return document.getElementById(descriptor.id);
  if (!descriptor.action) return null;
  return [...document.querySelectorAll('[data-action]')].find(element =>
    element.dataset.action === descriptor.action &&
    (!descriptor.field || element.dataset.field === descriptor.field) &&
    (!descriptor.source || element.dataset.source === descriptor.source) &&
    (!descriptor.relation || element.dataset.relation === descriptor.relation));
}

function render({ focusId, focusField, preserveScroll = true } = {}) {
  const previousScroll = window.scrollY;
  const notesScroll = document.querySelector('.work-notes-scroll')?.scrollTop || 0;
  const previousFocus = focusDescriptor(document.activeElement);
  app.innerHTML = `${header()}${ui.notice ? `<div class="app-notice ${ui.noticeError ? 'is-error' : ''}" role="status">${icons('info', 18)}<span>${esc(ui.notice)}</span><button data-action="dismiss-notice" aria-label="关闭提示">${icons('close', 17)}</button></div>` : ''}<div id="main-content" tabindex="-1" ${state.view === 'home' ? 'role="main"' : ''}>${state.view === 'home' ? renderHome(state, ui) : renderWork(state, ui)}</div>`;
  renderModal();
  const notes = document.querySelector('.work-notes-scroll');
  if (notes) notes.scrollTop = notesScroll;
  document.title = `${state.view === 'home' ? '我的案头' : '材料审阅'} · 夏津县纪检监察 AI 智能辅助监督平台`;
  if (preserveScroll) window.scrollTo(0, previousScroll);
  requestAnimationFrame(() => {
    const target = focusId ? document.getElementById(focusId) : focusField ? document.querySelector(`[data-action="edit-field"][data-field="${focusField}"]`) : focusMatch(previousFocus);
    target?.focus({ preventScroll: true });
    if (focusId === 'field-edit-input') revealNoteEditor();
  });
}

function revealNoteEditor() {
  const editor = document.querySelector('.work-field-editor');
  const scroll = document.querySelector('.work-notes-scroll');
  if (!editor || !scroll) return;
  if (window.innerWidth <= 820) { editor.scrollIntoView({ block: 'nearest' }); return; }
  const box = editor.getBoundingClientRect(), frame = scroll.getBoundingClientRect();
  if (box.height > frame.height) scroll.scrollTop += box.top - frame.top - 8;
  else if (box.bottom > frame.bottom) scroll.scrollTop += box.bottom - frame.bottom + 12;
  else if (box.top < frame.top) scroll.scrollTop += box.top - frame.top - 8;
}

function go(view) {
  ui.userMenu = false;
  ui.editingField = null;
  ui.editError = '';
  update('VIEW', { view });
  closeModal(false);
  render({ preserveScroll: false, focusId: 'main-content' });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function openModal(name, source) {
  returnFocus = document.activeElement;
  ui.modal = name;
  ui.error = '';
  ui.userMenu = false;
  if (name === 'source') update('OPEN_SOURCE', { source });
  if (name === 'intake') ui.intakeText = '';
  if (name === 'summary') { ui.reviewChecked = false; ui.summaryDraft = state.summary || buildSummary(state); }
  render();
  requestAnimationFrame(() => modalRoot.querySelector('[data-initial-focus], textarea, .dialog button')?.focus({ preventScroll: true }));
}

function closeModal(restoreFocus = true) {
  ui.modal = null;
  ui.error = '';
  document.body.classList.remove('has-modal');
  app.inert = false;
  modalRoot.innerHTML = '';
  if (restoreFocus) {
    // Page renders may replace the trigger, so use its action as a fallback.
    const fallback = returnFocus?.dataset?.action;
    const target = returnFocus?.isConnected ? returnFocus : fallback ? app.querySelector(`[data-action="${fallback}"]`) : null;
    target?.focus({ preventScroll: true });
  }
}

function dialog({ eyebrow, title, subtitle = '', body, footer, wide = '', focus = false }) {
  return `<div class="modal-backdrop"><section class="dialog ${wide}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"${focus ? ' tabindex="-1"' : ''}><header class="dialog-header"><div><p class="dialog-eyebrow">${esc(eyebrow)}</p><h2 id="dialog-title">${title}</h2>${subtitle ? `<p class="dialog-subtitle">${subtitle}</p>` : ''}</div><button class="icon-button" data-action="close-modal" aria-label="关闭面板">${icons('close', 22)}</button></header><div class="dialog-body">${ui.error ? `<p class="dialog-error" role="alert">${esc(ui.error)}</p>` : ''}${body}</div><footer class="dialog-footer">${footer}</footer></section></div>`;
}

function renderModal() {
  const priorName = modalRoot.dataset.modal;
  const scroll = modalRoot.querySelector('.dialog-body')?.scrollTop || 0;
  document.body.classList.toggle('has-modal', Boolean(ui.modal));
  app.inert = Boolean(ui.modal);
  const views = { intake: intakeDialog, source: sourceDialog, related: relatedDialog, summary: summaryDialog, history: historyDialog, help: helpDialog, reset: resetDialog };
  modalRoot.innerHTML = ui.modal ? views[ui.modal]() : '';
  modalRoot.dataset.modal = ui.modal || '';
  if (priorName === ui.modal) {
    const body = modalRoot.querySelector('.dialog-body');
    if (body) body.scrollTop = scroll;
  }
}

function intakeDialog() {
  const ready = ui.intakeText.trim() === originalText().trim();
  return dialog({ eyebrow: '新材料 · 固定样例', title: '从一份来件开始', subtitle: '先保留原件，再阅读与核对。当前原型只演示同一份虚构案例。', body: `<div class="intake-empty">${icons('file', 32)}<div><h3>待整理的材料将在这里开始</h3><p>可以加载样例，体验从未提取到人工检查的完整过程。</p></div></div><label class="form-label" for="intake-text">举报材料原文 <span>虚构 · XF-2026-0108</span></label><textarea id="intake-text" class="intake-textarea" placeholder="点击“载入虚构样例”，或粘贴同一份样例原文。" spellcheck="false">${esc(ui.intakeText)}</textarea><div class="intake-sample-row"><button class="button" data-action="load-sample">${icons('file', 17)}载入虚构样例</button><p>重新开始会替换此原型中的当前工作稿。<br>原系统与业务数据独立保留。</p></div><p id="intake-readiness" class="intake-ready" ${ready ? '' : 'hidden'}>${icons('checkCircle', 17)}样例原件已就绪，可以开始阅读。</p>`, footer: `<p class="dialog-footer-note">本地模拟，不进行真实材料上传、OCR 或 AI 推理。</p><div class="dialog-actions"><button class="button button-quiet" data-action="close-modal">取消</button><button id="start-read-button" class="button button-primary" data-action="start-read" ${ready ? '' : 'disabled'}>开始阅读 ${icons('arrowRight', 17)}</button></div>` });
}

function originalText() { return caseData.paragraphs.join('\n\n'); }

function marked(text, terms) {
  let output = esc(text);
  for (const term of terms) output = output.replaceAll(esc(term), `<mark class="match-mark">${esc(term)}</mark>`);
  return output;
}

function sourceDialog() {
  const source = ['original', 'contract', 'receipt'].includes(state.lastSource) ? state.lastSource : 'original';
  const sources = {
    original: { label: '原件陈述', title: '原始举报材料', origin: caseData.id, date: `${caseData.date} · 来信登记`, body: `<div class="source-prose">${caseData.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>`, note: '以上是举报人陈述；保留原件，不代表已核实事实。' },
    contract: { label: '系统检索 · 演示材料', title: '场地租赁合同 · 条款摘录', origin: caseData.contract, date: '演示合同复印件 · 第 2 页', body: `<div class="source-prose"><h3>第三条　租金与支付</h3><div class="source-transcript"><p>承租方：<mark>禾川农机服务社（虚构）</mark><br>租赁标的：青禾镇和盛村集体场地。<br>2026 年度租金：<mark>人民币36,000元</mark>。<br>支付时间：<mark>2026年6月30日前</mark>支付当年度租金。</p></div><p>这是固定案例中的合同条款转写摘录。现有摘录未包含补充约定，需另行核对是否存在分期或变更安排。</p></div>`, note: '检索到的合同材料是核对依据之一；不据此推定款项实际欠缴。' },
    receipt: { label: '系统检索 · 演示台账', title: '租金收款记录', origin: 'SK-20260318-01', date: '2026-03-18 · 公开台账摘录', body: `<div class="source-prose"><div class="source-transcript"><p>关联合同：<mark>${esc(caseData.contract)}</mark><br>收款项目：和盛村集体场地年度租金<br>付款单位：禾川农机服务社（虚构）<br>到账日期：<mark>2026年3月18日</mark><br>本条记录金额：<mark>人民币12,000元</mark></p></div><p>当前演示检索只返回这一条收款记录。它不证明不存在其他收款、后续补录或补充协议。</p></div>`, note: '36,000元与12,000元的差额为24,000元；这是待核对项，不能直接认定欠缴或违规。' },
  };
  const item = sources[source];
  return dialog({ eyebrow: item.label, title: item.title, body: `<div class="source-meta"><span>材料编号 <strong>${esc(item.origin)}</strong></span><span>${esc(item.date)}</span><span>虚构演示 · 转写摘录</span></div>${item.body}<p class="source-boundary">${item.note}</p>`, footer: `<p class="dialog-footer-note">来源与修订结果分别保留，可返回原文继续核对。</p><div class="dialog-actions"><button class="button button-quiet" data-action="source-switch" data-source="${source === 'original' ? 'receipt' : 'original'}">${source === 'original' ? '看收款记录' : '看举报原件'}</button><button class="button button-primary" data-action="back-to-reading">回到材料审阅 ${icons('arrowRight', 17)}</button></div>` });
}

function relatedDialog() {
  const explanations = { pending: '请阅读两份材料及匹配依据，再决定是否关联。系统不会自动合并举报。', linked: '两份原件分别保留；摘要将记载“已人工关联”，仍需核对其反映事项是否相同。', separate: '保留相似提示与本次“不关联”决定，材料继续独立处理。', deferred: '关联关系标记为待核，摘要将保留需要补充的银行流水与付款安排。' };
  return dialog({ eyebrow: '相似检索 · 辅助提示', title: '同一份合同，两次不同诉求', subtitle: '相似依据来自材料文字和合同编号，不表示重复举报已经成立。', wide: 'dialog-wide', body: `<div class="comparison-intro"><h3>匹配的内容已标出</h3><p>1 份相似材料 · 固定样例检索</p></div><div class="comparison-docs"><article class="comparison-document"><header class="comparison-document-header"><span class="source-origin">${icons('file', 15)}当前原件陈述</span><h3>${esc(caseData.title)}</h3><p class="comparison-id">${caseData.id} · 11-01 · 来信登记</p></header><div class="comparison-copy"><p>${marked(caseData.paragraphs[1], [caseData.contract, '36,000元', '12,000元'])}</p><p>${esc(caseData.paragraphs[2])}</p></div><p class="comparison-difference">本次诉求：解释租金到账情况，并补充其他收款与约定。</p></article><article class="comparison-document"><header class="comparison-document-header"><span class="source-origin">${icons('search', 15)}系统检索到的原件</span><h3>${esc(caseData.relatedTitle)}</h3><p class="comparison-id">${caseData.relatedId} · 10-30 · 网络转办</p></header><div class="comparison-copy"><p>${marked(caseData.relatedText, [caseData.contract, '3.6万元', '1.2万元', '2.4万元'])}</p></div><p class="comparison-difference">此前诉求：公开付款节点与流水。未作违纪违法结论。</p></article></div><section class="comparison-basis"><h3>为什么提示相似</h3><dl><dt>编号一致</dt><dd>两份材料均明确引用合同 ${caseData.contract}。</dd><dt>金额一致</dt><dd>当前原文“36,000元 / 12,000元”，相似原文“3.6万元 / 1.2万元”；单位换算后一致，均为材料陈述。</dd><dt>仍待核对</dt><dd>来源与诉求不同，是否同一反映人仍待核对；相似不等于重复，应由工作人员决定。</dd></dl></section><section class="comparison-decision"><h3>本次如何处理这条关联</h3><div class="decision-options">${[['linked', '人工关联'], ['separate', '暂不关联'], ['deferred', '标记待核']].map(([key, label]) => `<button class="decision-option" data-action="set-relation" data-relation="${key}" aria-pressed="${state.relation === key}">${state.relation === key ? icons('checkCircle', 17) : icons('link', 16)}${label}</button>`).join('')}</div><p class="decision-explanation" role="status">${explanations[state.relation]}</p></section>`, footer: `<p class="dialog-footer-note">${state.relation === 'pending' ? '尚未作出关联判断。' : `当前决定：${relationNames[state.relation]}。决定已记入工作稿，摘要仍需另行保存。`}</p><div class="dialog-actions"><button class="button button-primary" data-action="return-from-related">${ui.relatedFrom === 'summary' ? '返回待复核摘要' : '返回工作稿'} ${icons('arrowRight', 17)}</button></div>` });
}

function summaryDialog() {
  const blockers = getReviewBlockers(state);
  const allConfirmed = Object.values(state.fields).every(field => field.status === 'confirmed');
  const relatedDone = state.relation !== 'pending';
  const cleanSaved = Boolean(state.saved && !state.dirty);
  const ready = cleanSaved && allConfirmed && relatedDone && !state.summaryStale;
  const text = ui.summaryDraft ?? (state.summary || buildSummary(state));
  return dialog({ eyebrow: `${caseData.id} · 整理结果`, title: state.submitted ? '摘要已提交人工复核' : '待复核摘要', subtitle: '先保存本次整理，再由您检查是否提交；不生成正式核查任务。', wide: 'dialog-summary', body: `${state.submitted ? `<section class="summary-submitted" role="status"><h3>${icons('checkCircle', 20)} 人工检查已完成，已提交复核</h3><p>提交人：演示专员 · ${esc(state.submittedAt || state.saved?.savedAt || '')}<br>当前等待复核人处理。材料反映事项仍待核实，原件与关联记录保持独立。</p></section>` : ''}<div class="summary-layout"><section class="summary-main" aria-label="整理内容"><div class="summary-field-list">${Object.entries(fieldNames).map(([key, label]) => { const field = state.fields[key]; return `<div class="summary-field"><span>${label}<span class="${field.status === 'confirmed' ? 'confirmed' : 'pending'}">${icons(field.status === 'confirmed' ? 'check' : 'info', 14)}${field.status === 'confirmed' ? '人工已确认提取' : 'AI提取 · 待确认'}</span></span><strong>${esc(field.value || '尚未提取')}</strong></div>`; }).join('')}</div>${state.summaryStale ? `<div id="summary-stale-warning" class="summary-stale-warning" role="status">${icons('info', 18)}<div><strong>基础信息已更新，摘要仍是之前的版本。</strong><p>请核对并修订摘要，或按当前信息重整；旧稿会保留供回看。</p><button class="text-button" data-action="refresh-summary">按当前核对信息重整摘要 ${icons('arrowRight', 15)}</button></div></div>` : ''}<label class="form-label" for="summary-text">本次整理摘要 <span>工作稿 · 可修改</span></label><textarea id="summary-text" class="summary-textarea" spellcheck="false">${esc(text)}</textarea><div class="summary-caption">明确区分原件陈述、台账检索与待核对事项。已确认的是整理内容，不是业务事实。</div>${!state.summaryStale ? `<button class="text-button" data-action="refresh-summary">${icons('reset', 15)}按当前核对信息重整摘要</button>` : ''}${state.saved && state.dirty ? `<details class="summary-saved-view"><summary>查看上次保存稿 · ${esc(state.saved.savedAt)}</summary><p>${esc(state.saved.summary)}</p></details>` : ''}</section><aside class="summary-review" aria-label="提交前人工检查"><h3>提交前，检查这几项</h3><ul class="review-list"><li class="${allConfirmed ? 'is-done' : ''}">${icons(allConfirmed ? 'checkCircle' : 'info', 17)}<span>${allConfirmed ? '4 项提取内容已人工核对' : `${Object.values(state.fields).filter(field => field.status === 'confirmed').length} / 4 项提取内容已确认`}<br><button data-action="review-fields">返回原文检查与修正</button></span></li><li class="${relatedDone ? 'is-done' : ''}">${icons(relatedDone ? 'checkCircle' : 'info', 17)}<span>相似材料：${relationNames[state.relation]}<br><button data-action="related">查看原件与关联依据</button></span></li><li class="${cleanSaved ? 'is-done' : ''}" id="saved-review-line">${icons(cleanSaved ? 'checkCircle' : 'info', 17)}<span>${cleanSaved ? '本次摘要与核对记录已保存' : state.saved ? '工作稿有修改，需要重新保存' : '本次摘要尚未保存'}</span></li></ul><label class="review-check ${ready ? '' : 'is-disabled'}" id="review-check-label"><input id="review-check" type="checkbox" ${ui.reviewChecked ? 'checked' : ''} ${!ready || state.submitted ? 'disabled' : ''}><span>我已阅读摘要、核对来源与关联记录，同意将这份整理结果提交人工复核。</span></label><p id="review-blockers" class="summary-caption">${state.submitted ? '已进入演示复核队列。再次修改内容会使本次提交失效，需要重新检查与保存。' : blockers.length ? esc(blockers.join('；')) : ui.reviewChecked ? '已完成提交前检查，可由您提交。' : '请完成最后一次人工检查。'}</p>${state.saved ? `<div class="summary-saved-receipt ${state.dirty ? 'is-stale' : ''}" id="saved-receipt"><h4>${icons(state.dirty ? 'info' : 'checkCircle', 17)}${state.dirty ? '保留了上次保存稿' : '已保存，可回案头继续'}</h4><p>${esc(state.saved.savedAt)}<br>保存人：${esc(state.saved.confirmedBy || '演示专员')}<br>关联决定：${relationNames[state.saved.relation] || '待判断'}</p><button class="text-button" data-action="history">查看整理记录 ${icons('arrowRight', 14)}</button></div>` : ''}</aside></div>`, footer: `<p class="dialog-footer-note">保存只收纳工作稿；提交需要人工检查。AI 不作定性，也不决定受理或处置。</p><div class="dialog-actions"><button class="button button-quiet" data-action="close-modal">继续整理</button><button class="button ${state.submitted || cleanSaved ? '' : 'button-primary'}" data-action="save-summary" ${cleanSaved || state.summaryStale ? 'disabled' : ''}>${icons('save', 17)}${cleanSaved ? '摘要已保存' : '保存摘要'}</button><button class="button ${cleanSaved ? 'button-primary' : ''}" id="submit-review-button" data-action="submit-review" ${!ready || !ui.reviewChecked || state.submitted ? 'disabled' : ''}>${icons('check', 17)}${state.submitted ? '已提交复核' : '提交人工复核'}</button></div>` });
}

function historyDialog() {
  return dialog({ eyebrow: `${caseData.id} · 工作稿记录`, title: '本次整理留下了什么', subtitle: '记录原型中的提取、修订、关联和保存动作。', body: `<ol class="events-list">${state.events.length ? [...state.events].reverse().map(event => `<li><time>${esc(event.time?.slice(-8) || '刚刚')}</time><span>${esc(event.detail || event.action)}</span></li>`).join('') : `<li><time>待开始</time><span>当前为预置续办样例；开始提取、修正或确认后，整理记录会出现在这里。</span></li>`}</ol>`, footer: `<p class="dialog-footer-note">记录仅属于独立原型，可通过重置样例清除。</p><div class="dialog-actions"><button class="button button-primary" data-action="return-from-history">返回${ui.historyFrom === 'summary' ? '摘要' : '工作稿'}</button></div>` });
}

function helpDialog() {
  return dialog({ eyebrow: '阶段 C · 独立原型', title: '从案头进入，围绕材料完成整理', body: `<div class="help-copy"><p><strong>我的案头</strong>保留当前工作稿和上次停下的位置；<strong>材料审阅</strong>让举报原文成为主体，批注可以收起。</p><p>当前固定演示租金到账材料：AI 将“禾川”误提取为“禾田”，需要您修正。其他提取项同样需人工确认，相似材料需您决定关联方式。</p><p>保存摘要与提交复核是两个动作。提交前必须确认四项提取内容、决定关联方式、保存当前稿，并勾选人工检查。</p><p>所有材料均为虚构，提取与检索采用本地确定性模拟。原型不会调用真实 AI、上传材料或创建正式核查任务。</p></div><div class="help-links"><a href="../combined/" target="_blank" rel="noopener">查看已选视觉稿 ${icons('external', 15)}</a><a href="../boards.html" target="_blank" rel="noopener">回看阶段 B 视觉探索 ${icons('external', 15)}</a></div>`, footer: `<p class="dialog-footer-note">原型缓存与原系统分开；本轮只评审交互与视觉。</p><button class="button button-primary" data-action="close-modal">继续体验</button>` });
}

function resetDialog() {
  return dialog({ eyebrow: '重置独立样例', title: '回到预置的续办工作稿？', body: `<div class="help-copy"><p>将清除此原型内的字段修订、关联决定、摘要和整理记录，恢复到“承租方名称待核对”的续办状态。</p><p>原系统、原始样例与阶段 B 设计稿保持原样。</p></div>`, footer: `<p class="dialog-footer-note">只影响当前浏览器中的阶段 C 样例缓存。</p><div class="dialog-actions"><button class="button button-quiet" data-action="close-modal">取消</button><button class="button button-primary" data-action="reset">重置原型样例</button></div>` });
}

function showNotice(message, error = false) { ui.notice = message; ui.noticeError = error; render(); announce(message); }

function locate(source) {
  if (!(source in fieldNames)) return;
  if (state.view !== 'work') go('work');
  ui.notesOpen = true;
  ui.sourceHighlight = source;
  render();
  const notesScroll = document.querySelector('.work-notes-scroll');
  if (notesScroll) {
    const note = document.querySelector(`#source-${source}`);
    const fieldIndex = Object.keys(fieldNames).indexOf(source);
    const target = document.querySelectorAll('.work-field-note')[fieldIndex];
    if (target) notesScroll.scrollTop += target.getBoundingClientRect().top - notesScroll.getBoundingClientRect().top - 10;
    note?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    note?.focus({ preventScroll: true });
  }
  announce(`已定位${fieldNames[source]}的举报原文依据。`);
}

function summaryDirtyUI() {
  ui.reviewChecked = false;
  if (!state.summaryStale) {
    const warning = document.querySelector('#summary-stale-warning');
    if (warning) { warning.querySelector('strong').textContent = '已在当前基础信息上修订摘要。'; warning.querySelector('p').textContent = '请核对修改后的文字，再保存本次整理。'; }
  }
  const checkbox = document.querySelector('#review-check');
  if (checkbox) { checkbox.checked = false; checkbox.disabled = true; }
  document.querySelector('#review-check-label')?.classList.add('is-disabled');
  document.querySelector('#submit-review-button')?.setAttribute('disabled', '');
  const save = document.querySelector('[data-action="save-summary"]');
  if (save) { save.disabled = false; save.classList.add('button-primary'); save.innerHTML = `${icons('save', 17)}保存摘要`; }
  const submit = document.querySelector('#submit-review-button');
  if (submit) { submit.classList.remove('button-primary'); submit.innerHTML = `${icons('check', 17)}提交人工复核`; }
  const savedLine = document.querySelector('#saved-review-line');
  if (savedLine) { savedLine.classList.remove('is-done'); savedLine.innerHTML = `${icons('info', 17)}<span>工作稿有修改，需要重新保存</span>`; }
  const blockers = document.querySelector('#review-blockers');
  if (blockers) blockers.textContent = getReviewBlockers(state).join('；');
  document.querySelector('.summary-submitted')?.remove();
  const title = document.querySelector('#dialog-title');
  if (title) title.textContent = '待复核摘要';
  const receipt = document.querySelector('#saved-receipt');
  if (receipt) { receipt.classList.add('is-stale'); receipt.querySelector('h4').innerHTML = `${icons('info', 17)}保留了上次保存稿`; }
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) {
    if (ui.userMenu && !event.target.closest('.app-user')) { ui.userMenu = false; render(); }
    return;
  }
  if (control.disabled) return;
  const action = control.dataset.action;
  ui.error = '';
  switch (action) {
    case 'home': go('home'); break;
    case 'work': case 'resume': go('work'); break;
    case 'user-menu': ui.userMenu = !ui.userMenu; render(); break;
    case 'dismiss-notice': ui.notice = ''; render(); break;
    case 'new': openModal('intake'); break;
    case 'load-sample': {
      ui.intakeText = originalText(); renderModal();
      document.querySelector('#intake-text')?.focus(); announce('虚构样例已载入。'); break;
    }
    case 'start-read': {
      if (ui.intakeText.trim() !== originalText().trim()) { ui.error = '本轮原型仅演示固定虚构样例，请使用“载入虚构样例”。'; renderModal(); break; }
      clearTimeout(analysisTimer); update('START_READ'); ui.notice = ''; ui.notesOpen = true; go('work'); announce('原件已保留，请先阅读或开始辅助提取。'); break;
    }
    case 'extract': {
      if (state.phase !== 'initial') break;
      update('BEGIN_ANALYSIS'); render(); announce('正在进行本地模拟辅助提取。');
      analysisTimer = setTimeout(() => { update('FINISH_ANALYSIS'); render(); announce('已提取四项内容。承租方名称需要核对，请对照原文修正。'); }, 1500);
      break;
    }
    case 'toggle-notes': ui.notesOpen = !ui.notesOpen; render(); announce(ui.notesOpen ? '随文批注已展开。' : '批注已收起，原文阅读区域已扩大。'); break;
    case 'edit-field': ui.editingField = control.dataset.field; ui.editValue = state.fields[ui.editingField].value; ui.editError = ''; ui.sourceHighlight = ui.editingField; render({ focusId: 'field-edit-input' }); break;
    case 'cancel-field': { const field = ui.editingField; ui.editingField = null; ui.editError = ''; render({ focusField: field }); break; }
    case 'save-field': {
      ui.editValue = document.querySelector('#field-edit-input')?.value ?? ui.editValue;
      const error = update('EDIT_FIELD', { field: control.dataset.field, value: ui.editValue });
      if (error) { ui.editError = error; render({ focusId: 'field-edit-input' }); break; }
      ui.editingField = null; ui.editError = ''; render({ focusField: control.dataset.field }); announce('修订已记录，原件保持不变。请保存摘要收纳本次整理。'); break;
    }
    case 'confirm-field': {
      const field = control.dataset.field;
      const error = update('CONFIRM_FIELD', { field });
      if (error) { ui.editingField = field; ui.editValue = state.fields[field].value; ui.editError = error; ui.sourceHighlight = field; render({ focusId: 'field-edit-input' }); }
      else { render({ focusField: field }); announce(`${fieldNames[field]}提取内容已人工确认。`); }
      break;
    }
    case 'locate': locate(control.dataset.source); break;
    case 'source': openModal('source', control.dataset.source); break;
    case 'source-switch': update('OPEN_SOURCE', { source: control.dataset.source }); render(); break;
    case 'back-to-reading': go('work'); break;
    case 'related': ui.relatedFrom = ui.modal === 'summary' ? 'summary' : state.view; openModal('related'); break;
    case 'set-relation': {
      const error = update('SET_RELATION', { relation: control.dataset.relation });
      if (error) ui.error = error;
      render(); announce(`关联决定已记入工作稿：${relationNames[state.relation]}。`); break;
    }
    case 'return-from-related': if (ui.relatedFrom === 'summary') openModal('summary'); else { closeModal(); render(); } break;
    case 'summary': if (state.phase === 'extracted') openModal('summary'); else showNotice('请先进入材料审阅，完成辅助提取后再整理摘要。'); break;
    case 'review-fields': closeModal(false); go('work'); ui.notesOpen = true; render(); break;
    case 'refresh-summary': ui.summaryDraft = buildSummary(state); update('SET_SUMMARY', { text: ui.summaryDraft, refreshed: true }); render(); announce('已按当前核对信息重整摘要，请阅读并保存。'); break;
    case 'save-summary': {
      ui.summaryDraft = document.querySelector('#summary-text').value;
      if (!ui.summaryDraft.trim()) { ui.error = '摘要内容不能为空，请补充整理内容后再保存。'; render(); break; }
      const textError = update('SET_SUMMARY', { text: ui.summaryDraft });
      if (textError) { ui.error = textError; render(); break; }
      const error = update('SAVE_SUMMARY', { at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }) });
      if (error) ui.error = error;
      render(); announce(error || '待复核摘要已保存。可回案头重新打开；是否提交复核由您决定。'); break;
    }
    case 'submit-review': {
      const error = update('SUBMIT_REVIEW', { checked: ui.reviewChecked, at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }) });
      if (error) ui.error = error;
      render(); announce(error || '人工检查已完成，摘要已提交复核，等待复核人处理。'); break;
    }
    case 'history': ui.historyFrom = ui.modal; openModal('history'); break;
    case 'return-from-history': if (ui.historyFrom === 'summary') openModal('summary'); else { closeModal(); render(); } break;
    case 'help': openModal('help'); break;
    case 'reset-dialog': openModal('reset'); break;
    case 'reset': clearTimeout(analysisTimer); update('RESET'); ui.notice = ''; ui.sourceHighlight = null; ui.editingField = null; ui.notesOpen = true; go('home'); announce('已恢复原型的预置续办样例。'); break;
    case 'close-modal': closeModal(); render(); break;
    default: throw new Error(`Unhandled prototype action: ${action}`);
  }
});

document.addEventListener('input', event => {
  if (event.target.id === 'intake-text') {
    ui.intakeText = event.target.value;
    const ready = ui.intakeText.trim() === originalText().trim();
    document.querySelector('#start-read-button').disabled = !ready;
    document.querySelector('#intake-readiness').hidden = !ready;
  }
  if (event.target.id === 'field-edit-input') ui.editValue = event.target.value;
  if (event.target.id === 'summary-text') { ui.summaryDraft = event.target.value; update('SET_SUMMARY', { text: event.target.value }); summaryDirtyUI(); }
});

document.addEventListener('change', event => {
  if (event.target.id === 'review-check') {
    ui.reviewChecked = event.target.checked;
    const ready = getReviewBlockers(state).length === 0;
    document.querySelector('#submit-review-button').disabled = !ready || !ui.reviewChecked || state.submitted;
    document.querySelector('#review-blockers').textContent = ui.reviewChecked ? '已完成提交前检查，可由您提交。' : '请完成最后一次人工检查。';
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (ui.modal) { closeModal(); render(); }
    else if (ui.editingField) { const field = ui.editingField; ui.editingField = null; render({ focusField: field }); }
    else if (ui.userMenu) { ui.userMenu = false; render(); }
  }
  if (event.key === 'Enter' && event.target.id === 'field-edit-input') {
    event.preventDefault(); document.querySelector('[data-action="save-field"]')?.click();
  }
  if (event.key === 'Tab' && ui.modal) {
    const focusable = [...modalRoot.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), summary')].filter(element => !element.hidden && element.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (!focusable.includes(document.activeElement)) { event.preventDefault(); first?.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});

render();
