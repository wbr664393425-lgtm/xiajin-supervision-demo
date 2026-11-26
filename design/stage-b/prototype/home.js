import { caseData } from '../case.js';

/** Pure view: state and shared demo data are read, never modified. */
export function renderHome(state, ui) {
  const { icons, esc } = ui;
  const icon = (name, size = 18) => `<span class="home-icon" aria-hidden="true">${icons(name, size)}</span>`;
  const tenant = state.fields?.tenant || { value: caseData.aiTenant, status: 'pending' };
  const tenantValue = tenant.value || tenant.aiValue || caseData.aiTenant;
  const fields = Object.values(state.fields || {});
  const allConfirmed = fields.length > 0 && fields.every(field => field.status === 'confirmed');
  const saved = state.saved;
  const cleanSaved = Boolean(saved && !state.dirty);
  const analyzing = state.phase === 'analyzing';
  const initial = state.phase === 'initial';
  const extracted = state.phase === 'extracted';
  const pause = state.submitted && cleanSaved ? '人工检查已完成，摘要已提交复核'
    : state.summaryStale ? '基础信息已更新，摘要待重新整理'
    : saved && state.dirty ? '工作稿已有修改，尚未重新保存'
    : cleanSaved ? '待复核摘要已保存，可重新打开'
    : analyzing ? '正在辅助提取人物、事项与金额'
    : initial ? '原件已保留，等待辅助提取'
    : tenant.status !== 'confirmed' ? '承租方名称待核对'
    : allConfirmed ? '整理信息已确认，待保存摘要'
    : '承租方已核对，其余信息待确认';
  const previewLabel = cleanSaved ? '已保存的待复核摘要'
    : state.summaryStale ? '摘要待同步 · 基础信息已更新'
    : initial ? '原件片段 · 尚未辅助提取'
    : analyzing ? '原件片段 · 本地模拟提取中'
    : allConfirmed ? '人工已核对的整理笔记' : 'AI整理 · 待人工核对';
  const tenantDescription = tenant.status === 'confirmed' ? `承租主体提取文字已人工确认为${tenantValue}` : `AI提取承租方为${tenantValue}，该名称仍需对照原件核对`;
  const fallbackSummary = `材料反映青禾镇和盛村集体场地租金到账情况。${tenantDescription}。合同 ${caseData.contract} 约定年租${caseData.receivable}，于2026-06-30前支付；现有演示台账已见2026-03-18到账${caseData.received}，差额${caseData.difference}待核。现有材料不足以认定欠缴或违规。`;
  const preview = cleanSaved ? saved.summary : extracted ? state.summary || fallbackSummary : caseData.paragraphs[1];
  const relationLabels = {
    pending: '可能与当前工作稿相关',
    linked: '已关联，原件分别保留',
    separate: '已选择暂不关联',
    deferred: '关联关系暂记待核',
  };
  const relationLabel = relationLabels[state.relation] || relationLabels.pending;
  const currentStatus = cleanSaved ? (state.submitted ? '已提交演示复核' : '已保存待复核')
    : saved && state.dirty ? '有未保存修改' : analyzing ? '整理中' : '当前工作稿';
  const continueAction = cleanSaved ? 'summary' : 'resume';
  const continueLabel = cleanSaved ? '打开已保存摘要' : analyzing ? '查看正在整理的工作稿' : '继续整理这份工作稿';
  const tenantLabel = tenant.status === 'confirmed' ? '人工确认提取' : 'AI建议 · 待核对';
  const savedTime = saved?.savedAt ? `保存于 ${saved.savedAt}` : '';

  return `
  <section class="home-view" aria-label="我的案头">
    <header class="home-heading">
      <div class="home-heading-copy"><h1>我的案头</h1><p>先继续未完成的整理，再处理新收到的材料。</p></div>
      <button type="button" class="home-button home-primary home-new-button" data-action="new">${icon('plus', 19)}<span>整理新材料</span></button>
    </header>

    <div class="home-layout">
      <section class="home-active-workbook" aria-label="当前工作稿与续办位置">
        <nav class="home-document-tabs" aria-label="当前材料书签">
          <button type="button" class="home-document-tab home-document-tab-active" data-action="resume" aria-label="继续工作稿 ${esc(caseData.id)}">${icon('bookmark', 17)}<span>${esc(caseData.id)}</span><span class="home-tab-note">当前工作稿</span></button>
          <button type="button" class="home-document-tab" data-action="source" data-source="original">原件留存</button>
          <button type="button" class="home-document-tab" data-action="related" aria-label="对照相似材料 ${esc(caseData.relatedId)}">相似材料<span class="home-tab-count">1</span></button>
        </nav>

        <article class="home-workbook-page">
          <div class="home-workbook-heading"><div class="home-workbook-title"><h2>和盛村场地租赁收款情况</h2><span>${esc(caseData.area)}</span></div><span class="home-draft-state ${cleanSaved ? 'home-draft-saved' : ''}">${esc(currentStatus)}</span></div>
          <div class="home-resume-position">${icon(analyzing ? 'layers' : allConfirmed ? 'check' : 'pause', 18)}<span>上次停在</span><strong>${esc(pause)}</strong></div>

          <div class="home-preview-heading"><span class="home-preview-label ${allConfirmed && !initial && !analyzing ? 'home-confirmed-text' : ''}">${esc(previewLabel)}</span>${savedTime ? `<span class="home-saved-time">${esc(savedTime)}</span>` : ''}</div>
          <div class="home-draft-preview"><p>${esc(preview)}</p></div>

          <dl class="home-fact-rows">
            <div class="home-fact-row home-tenant-row"><dt>承租方</dt><dd>${extracted ? `<span class="home-extracted-tenant"><span class="home-provenance ${tenant.status === 'confirmed' ? 'home-provenance-human' : ''}">${esc(tenantLabel)}</span><b>${esc(tenantValue)}</b></span>` : ''}<button type="button" class="home-source-text" data-action="source" data-source="original" aria-label="查看承租方名称的原件来源"><span>原件陈述：</span>${esc(caseData.tenant)}（虚构）${icon('arrowRight', 15)}</button>${!extracted ? `<span class="home-provenance">${analyzing ? '本地模拟提取中' : '尚未辅助提取'}</span>` : ''}</dd></div>
            <div class="home-fact-row"><dt>合同约定</dt><dd><button type="button" class="home-fact-source-link" data-action="source" data-source="contract" aria-label="查看合同 ${esc(caseData.contract)}"><span class="home-fact-source-label">原件陈述：</span>${esc(caseData.contract)}</button><span>年租 <b>36,000元</b></span><span class="home-fact-secondary">2026-06-30 前支付</span></dd></div>
            <div class="home-fact-row"><dt>收款情况</dt><dd><button type="button" class="home-fact-source-link" data-action="source" data-source="receipt" aria-label="查看2026年3月18日12000元演示收款记录"><span class="home-fact-source-label">系统检索台账记录：</span>2026-03-18 已见到账 <b>12,000元</b></button><span class="home-difference">差额 <b>24,000元待核</b></span></dd></div>
          </dl>

          <div class="home-boundary-note">${icon('file', 17)}<p>保留原文与检索来源，不自动形成结论。</p></div>
          <footer class="home-workbook-footer"><span>${cleanSaved ? '保存后仍可修改，是否提交复核由您决定。' : '先对照原件核对，再确认本次整理信息。'}</span><button type="button" class="home-button home-primary home-resume-button" data-action="${continueAction}"><span>${continueLabel}</span>${icon('arrowRight', 20)}</button></footer>
        </article>
      </section>

      <aside class="home-support" aria-label="收到的来件与收纳位置">
        <section class="home-incoming"><header class="home-support-heading"><h2>收到的来件</h2></header><article class="home-incoming-record"><div class="home-incoming-id">${icon('file', 19)}<span>${esc(caseData.relatedId)}</span></div><h3>${esc(caseData.relatedTitle)}</h3><span class="home-incoming-meta">10-30 · 网络转办</span><p>请求核实付款节点与银行流水。</p>${state.relation !== 'pending' ? `<span class="home-relation-status">${esc(relationLabel)}</span>` : ''}<button type="button" class="home-button home-secondary home-related-button" data-action="related" aria-label="将 ${esc(caseData.relatedId)} 与当前工作稿对照"><span>与当前工作稿对照</span>${icon('arrowRight', 18)}</button></article></section>

        <section class="home-storage"><h2>收纳位置</h2><div class="home-storage-items">
          <button type="button" class="home-storage-item" data-action="source" data-source="original">${icon('folder', 20)}<span><b>原件留存</b><span>原文与检索来源</span></span>${icon('arrowRight', 16)}</button>
          <button type="button" class="home-storage-item" data-action="work">${icon('layers', 20)}<span><b>工作笔记</b><span>提取与核对过程</span></span>${icon('arrowRight', 16)}</button>
          <button type="button" class="home-storage-item ${saved ? '' : 'home-storage-unavailable'}" data-action="summary" ${saved ? '' : 'disabled aria-disabled="true"'}>${icon('file', 20)}<span><b>待复核摘要</b><span>${saved ? (state.dirty ? '保存稿待重新核对' : state.submitted ? '已提交演示复核' : '已保存，可重开') : '尚未保存'}</span></span>${saved ? icon('arrowRight', 16) : ''}</button>
        </div></section>
      </aside>
    </div>

    <section class="home-retained-sources" aria-label="已保留的来源"><h2>已保留的来源</h2><button type="button" data-action="source" data-source="original">${icon('file', 18)}<span>原始举报材料 · ${esc(caseData.id)}</span></button><button type="button" data-action="source" data-source="receipt">${icon('layers', 18)}<span>系统检索台账记录 · SK-20260318-01</span></button></section>
    <p class="home-demo-boundary">虚构演示材料 · 本地模拟提取 · AI建议需人工复核</p>
  </section>`;
}
