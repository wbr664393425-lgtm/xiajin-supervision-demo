import { caseData as data } from '../case.js';

const initialWork = new URLSearchParams(location.search).get('view') === 'work';
const state = { view: initialWork ? 'work' : 'entry', extracted: initialWork, selected: initialWork ? 'tenant' : null, corrected: false, tenant: data.aiTenant, tenantDraft: data.aiTenant, relation: 'pending', modal: null, busy: false, intake: '', intakeError: '', summary: data.summary, saved: false, dirty: false, checked: false, submitted: false, savedAt: '', source: 'primary' };
const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
let observer;
const e = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tag = (type, label) => `<span class="tag ${type}">${label}</span>`;
const arrow = '<span class="arrow" aria-hidden="true">→</span>';
const fullOriginal = data.paragraphs.join('\n\n');
const time = () => new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});

function invalidateSaved() {
  state.saved = false;
  state.dirty = true;
  state.checked = false;
  state.submitted = false;
}

function refreshInputState(field, selectionStart, selectionEnd) {
  render();
  const input = document.querySelector(`[data-field="${field}"]`);
  if(input) {
    input.focus({preventScroll:true});
    if(typeof selectionStart === 'number') input.setSelectionRange(selectionStart, selectionEnd);
  }
}


function navigate(view) {
  state.view = view;
  const url = new URL(location.href);
  if(view === 'work') url.searchParams.set('view','work'); else url.searchParams.delete('view');
  history.replaceState(null,'',url);
  render();
  window.scrollTo({top:0,behavior:'instant'});
}

function header() {
  return `<header class="appbar"><a href="?" class="wordmark" data-action="home"><span class="wordmark-index">络</span>事项脉络<span>信访材料初筛</span></a><nav class="view-switch" aria-label="方案界面"><button class="${state.view==='entry'?'active':''}" data-action="home">入口</button><button class="${state.view==='work'?'active':''}" data-action="work">研判</button></nav><span class="environment">方案 C · 虚构演示样例</span></header>`;
}

function entry() {
  return `<main class="page entry-page"><div class="entry-intro"><section class="entry-title"><p class="eyebrow">先理解材料，再形成判断。</p><h1 class="heading">从一份材料，<br>找到值得厘清的关系。</h1><p class="subtext">把人物、事项和来源放在一起。哪些已经看见，哪些还待核对，让下一步有据可循。</p><button class="btn btn-primary primary-start" data-action="new">＋ 开始处理新材料 ${arrow}</button><p class="start-caption">粘贴一份材料，或从虚构样例开始。</p><div class="entry-context"><span class="context-index">↳</span><div><strong>这里整理的是材料，不是事实结论。</strong><p>AI 建议、原件陈述与人工确认分开保留。<br>每一次关联，都可以回到它的来源。</p></div></div></section><section class="question-index"><div class="index-title"><h2>这件事，哪些还待厘清？</h2><span>和盛村场地租赁</span></div><button class="question-row" data-action="question" data-node="difference"><span class="question-number">1</span><div class="question-copy"><h3>收款记录，是否已经完整？</h3><p>应收 36,000 元，已见记录 12,000 元。<br>24,000 元的差额，还需要哪些依据？</p><span class="question-sources">合同条款 <span>↔</span> 演示收款台账</span></div><span class="arrow">↗</span></button><button class="question-row" data-action="question" data-node="material-b"><span class="question-number">2</span><div class="question-copy"><h3>两份材料，说的是同一件事吗？</h3><p>同一份合同、相同金额，不同来源。<br>对照原句后，再决定是否关联。</p><span class="question-sources">XF-2026-0108 <span>↔</span> XF-2026-0106</span></div><span class="arrow">↗</span></button><button class="question-row" data-action="question" data-node="tenant"><span class="question-number">3</span><div class="question-copy"><h3>承租主体名称，和原文一致吗？</h3><p>提取结果中有一个字需要核对。<br>确认修正后，保留你的判断记录。</p><span class="question-sources">原件陈述 <span>↔</span> AI 辅助提取</span></div><span class="arrow">↗</span></button></section></div><section class="continue-section"><div class="section-label">继续未完成的整理<small>无需从头再读一遍</small></div><div><div class="continue-record"><span class="record-index">01</span><div class="record-info"><div><span>${data.id}</span>${tag(state.saved?'human':'ai',state.submitted?'已提交复核':state.saved?'摘要已保存':state.dirty?'有未保存修改':'已有辅助提取')}<span>${data.area}</span></div><h3>${data.title}</h3><p>${state.saved?'整理结果已在当前预览内保存，可继续查看待复核摘要。':'材料与合同已有关联提示，承租主体与相似材料仍待人工核对。'}</p></div><button class="btn" data-action="continue">继续整理 ${arrow}</button></div><div class="home-relation-note">一项租赁事项 · 两份原始材料 · 一组演示台账</div></div></section><footer class="page-foot"><span>夏津纪检监察 AI 智能辅助监督平台 · 独立设计探索</span><span>本预览仅保留当前页面内的轻交互 <a href="./concept.png" target="_blank">查看视觉探索图 ↗</a></span></footer></main>`;
}

function node(id, cls, source, title, text, extra='') {
  return `<button class="relation-node ${cls} ${state.selected===id?'selected':''}" data-node-id="${id}" data-action="node" data-node="${id}" aria-label="查看${e(title)}的依据"><header>${source}<span class="node-code">${extra||'↗'}</span></header><strong>${title}</strong><p>${text}</p></button>`;
}

function map() {
  const tenantTag = state.corrected ? tag('human','人工确认') : tag('ai','AI 辅助建议');
  return `<section class="map-zone"><div class="map-topline"><h2 class="map-title">事项脉络 <small>点击任一节点，查看它的来源</small></h2><div class="provenance" aria-label="来源图例"><span><i class="raw"></i>原件陈述</span><span><i class="ledger"></i>系统检索台账</span><span><i class="ai"></i>AI 辅助建议</span><span><i class="human"></i>人工确认</span></div></div><div class="relation-space"><svg class="relation-edges" aria-hidden="true"></svg><div class="relation-grid">${node('project','project',tag('raw','原件陈述'),'和盛村集体场地','村集体资产 · 租赁事项')}${node('contract','contract',tag('ledger','系统检索台账'),data.contract,'年度租金 36,000 元')}${node('due','due',tag('raw','原件陈述'),'2026-06-30 前支付','合同约定的年度付款节点')}${node('tenant',`tenant ${state.corrected?'manual':'warning'}`,tenantTag,e(state.tenant),state.corrected?'<span class="node-confirmed">已对照原文修正 · 可再编辑</span>':'<span class="node-warning">名称待核对 · 原文有不同用字</span>')}${node('receipt','receipt',tag('ledger','系统检索台账'),'已见到账 12,000 元','2026-03-18 · 一笔演示记录')}${node('material-a','material-a',tag('raw','原件陈述'),data.id,'11-01 来信登记 · 主要材料')}${node('material-b','material-b',tag('raw','原件陈述'),data.relatedId,state.relation==='linked'?'<span class="node-confirmed">已人工关联 · 原件分别保留</span>':state.relation==='separate'?'暂不关联 · 保留比对记录':state.relation==='review'?'关联关系待核 · 仍保留原件':'10-30 网络转办 · 相似材料')}${node('difference','difference warning',tag('ai','AI 辅助建议'),'24,000 元待核对','记录差额，不等于实际欠缴')}</div></div><div class="map-caption"><span><strong>线表示关联依据，不代表事实已经查明。</strong><br>原件分别保留；AI 提取可修正，相似材料由人工决定是否关联。</span><span>${state.corrected?'主体名称已修正':'1 项提取字段待核对'} · ${state.relation==='linked'?'相似材料已关联':'相似材料待判断'}</span></div></section>`;
}

function inspector() {
  if(!state.selected) return '';
  const titles = {tenant:'核对承租主体',project:'查看事项来源',contract:'查看合同依据',due:'核对付款节点',receipt:'查看到账记录',difference:'厘清待核差额','material-a':'阅读主要材料','material-b':'核对相似材料'};
  let content = '';
  if(state.selected==='tenant') {
    content = `<section class="inspector-section">${tag('raw','原件陈述')}<p>承租方为<mark>${data.tenant}</mark>（虚构）。</p><p class="source-reference">${data.id} · 原文第 2 段</p></section><section class="inspector-section">${state.corrected?tag('human','人工确认'):tag('ai','AI 辅助建议')}${state.corrected?`<div class="manual-confirmation"><div><strong>名称已对照原文修正</strong>${data.aiTenant} → ${e(state.tenant)}<br>本次仅确认文字提取，未确认业务事实。</div></div>`:`<p class="field-note">这里有一个字与原文不一致，请核对。</p><div class="extracted-value">${data.aiTenant}</div>`}<label class="edit-label">${state.corrected?'已确认的提取字段，可继续修订':'修正为'}<input class="edit-input" data-field="tenantDraft" aria-label="承租主体名称" value="${e(state.tenantDraft)}"></label><button class="btn btn-primary" data-action="correct">${state.corrected?'保存字段修订':'确认修正'} ${arrow}</button></section><section class="inspector-section"><h3>回到原始依据</h3><p>修正的是材料中的主体名称。该主体与事项的实际关系，仍需后续人工核实。</p><button class="text-link" data-action="original">查看完整原文 ↗</button></section>`;
  } else if(state.selected==='contract') {
    content = `<section class="inspector-section">${tag('ledger','系统检索台账')}<p>${data.record}</p><p class="source-reference">演示检索来源 · 合同第三条 / 收款记录</p></section><section class="inspector-section"><h3>两份材料都提及这份合同</h3><p>合同编号是当前关联提示的主要依据。尚未确认两份材料完全重复。</p><button class="text-link" data-action="compare">对照两份原文 ${arrow}</button></section>`;
  } else if(state.selected==='receipt') {
    content = `<section class="inspector-section">${tag('ledger','系统检索台账')}<div class="inspector-math"><span>到账日期</span><strong>2026-03-18</strong><span>记录金额</span><strong>12,000 元</strong></div><p class="source-reference">SK-20260318-01 · 演示收款记录</p></section><section class="inspector-section"><h3>当前只能确认“记录可见”</h3><p>这笔演示记录与合同关联，但不能据此排除其他未录入、跨期或线下收款。</p><button class="text-link" data-action="node" data-node="difference">查看待核差额 ${arrow}</button></section>`;
  } else if(state.selected==='difference') {
    content = `<section class="inspector-section">${tag('ai','AI 辅助建议')}<div class="inspector-math"><span>合同约定年租</span><strong>36,000 元</strong><span>已见关联记录</span><strong>− 12,000 元</strong><span class="math-result">待核对差额</span><strong class="math-result">24,000 元</strong></div><p class="source-reference">按现有演示台账比对，非核查结论</p></section><section class="inspector-section"><h3>接下来需要什么依据？</h3><p>完整收款流水、银行回单，以及是否有分期或补充协议。</p><div class="evidence-question">尚不能判断实际欠缴。摘要中应保留“记录差额待核对”的限定。</div><button class="text-link" data-action="node" data-node="receipt">查看现有到账记录 ${arrow}</button></section>`;
  } else if(state.selected==='due') {
    content = `<section class="inspector-section">${tag('raw','原件陈述')}<p>合同约定 2026 年度租金 36,000 元，应于 <mark>6月30日前交付</mark>。</p><p class="source-reference">${data.id} · 原文第 2 段</p></section><section class="inspector-section">${tag('ledger','系统检索台账')}<p>合同 ${data.contract} 第三条：年度租金 36,000 元。</p><div class="evidence-question">付款安排是否另有补充约定？需要调阅原始合同及补充协议。</div><button class="text-link" data-action="original">查看完整原文 ↗</button></section>`;
  } else if(state.selected==='material-b') {
    content = `<section class="inspector-section">${tag('raw','原件陈述')}<p>${data.relatedTitle}</p><p class="source-reference">${data.relatedId} · 2026-10-30 · 网络转办</p></section><section class="inspector-section"><h3>为什么提示相似？</h3><p>同合同编号；3.6万元与36,000元、1.2万元与12,000元金额一致；都请求核对付款与流水。</p><p class="source-reference">相似只提示可能相关，不自动认定重复。</p><button class="btn btn-primary" data-action="compare">查看双方原文与依据 ${arrow}</button><div class="context-action">${state.relation==='linked'?'已人工关联 · 可重新选择':state.relation==='separate'?'已选择暂不关联':state.relation==='review'?'已标记关联关系待核':'当前关联关系尚待人工判断'}</div></section>`;
  } else if(state.selected==='material-a') {
    content = `<section class="inspector-section">${tag('raw','原件陈述')}<p>${data.title}</p><p class="source-reference">${data.id} · ${data.date} · ${data.source}</p></section><section class="inspector-section"><h3>材料中的核心诉求</h3><p>核对是否有其他收款凭证、分期补充约定或尚未录入的到账款项。</p><button class="btn btn-primary" data-action="original">阅读完整原文 ${arrow}</button></section>`;
  } else {
    content = `<section class="inspector-section">${tag('raw','原件陈述')}<p>涉及单位：${data.area}<br>事项：村集体场地租赁款收取情况。</p><p class="source-reference">${data.id} · 原文第 1、2 段</p></section><section class="inspector-section"><h3>以事项组织材料</h3><p>同一场地、同一合同与相关收款记录放在一起，便于逐项核对，而非给主体贴风险标签。</p><button class="text-link" data-action="original">查看事项原文 ↗</button></section>`;
  }
  return `<aside class="inspector" aria-label="节点依据"><div class="inspector-heading"><div><small>当前选择 · 点击节点可切换</small><h2>${titles[state.selected]}</h2></div><button class="close-button" data-action="close-inspector" aria-label="收起来源面板">×</button></div>${content}</aside>`;
}

function readingStart() {
  return `<section class="reading-start"><div class="reading-copy">${tag('raw','原件陈述')}<h2>${data.title}</h2><p>${e(data.paragraphs[1]).replaceAll(data.tenant,`<strong>${data.tenant}</strong>`)}</p><button class="text-link" data-action="original">阅读全文 ↗</button></div><div class="reading-instruction"><p class="eyebrow">从材料，展开事项脉络。</p><h3>先读懂这份材料，<br>再看哪些要素值得核对。</h3><p>模拟提取人物、合同、时间和金额；所有要素都保留原文出处，提取有误时可以更正。</p><button class="btn btn-primary" data-action="extract" ${state.busy?'disabled':''}>${state.busy?'正在模拟提取…':'开始辅助提取'} ${arrow}</button>${state.busy?'<div class="extraction-progress">正在整理合同、主体与付款记录…<div class="progress-line"></div></div>':''}<p class="modal-caption">本地演示规则 · 未接入真实 OCR 或大模型</p></div></section>`;
}

function work() {
  return `<main class="page work-page"><div class="work-heading"><div><p class="eyebrow">信访材料初筛 / 事项脉络</p><h1 class="heading">把同一件事，放在同一条脉络里。</h1><div class="work-meta"><span>${data.id}</span><i></i><span>${data.area}</span><i></i><span>虚构演示 · 需人工复核</span></div></div><div class="work-heading-actions">${state.saved?`<span class="save-status">${state.submitted?'已提交复核':'摘要已保存'} · ${state.savedAt}</span>`:state.dirty?'<span class="save-status">有未保存修改</span>':''}<button class="btn" data-action="original">读原始材料 ↗</button><button class="btn btn-quiet" data-action="home">返回入口</button></div></div>${state.extracted?`<div class="work-layout ${state.selected?'inspecting':''}">${map()}${inspector()}</div>`:readingStart()}<footer class="work-actionbar"><div class="work-action-main">${state.extracted?`<button class="btn btn-primary" data-action="summary">${state.saved?'查看待复核摘要':'保存待复核摘要'} ${arrow}</button><span class="action-note">${state.submitted?'仅提交人工复核，未发起核查。':'只保存材料整理结果，不作处置决定。'}</span>`:'<span class="source-state">原始材料已载入 · 尚未提取</span>'}</div><span class="memory-note">仅当前预览内保留状态<br>刷新后恢复固定样例</span></footer></main>`;
}

function render() {
  observer?.disconnect();
  app.innerHTML = header() + (state.view==='entry' ? entry() : work());
  renderModal();
  const space = document.querySelector('.relation-space');
  if(space) {
    observer = new ResizeObserver(() => requestAnimationFrame(drawEdges));
    observer.observe(space);
    requestAnimationFrame(drawEdges);
  }
}

function drawEdges() {
  const space = document.querySelector('.relation-space');
  if(!space) return;
  const svg = space.querySelector('svg');
  const base = space.getBoundingClientRect();
  const box = id => {
    const r = space.querySelector(`[data-node-id="${id}"]`).getBoundingClientRect();
    return {x:r.x-base.x+space.scrollLeft,y:r.y-base.y,w:r.width,h:r.height,cx:r.x-base.x+space.scrollLeft+r.width/2,cy:r.y-base.y+r.height/2};
  };
  const p=box('project'), c=box('contract'), d=box('due'), t=box('tenant'), r=box('receipt'), a=box('material-a'), b=box('material-b'), diff=box('difference');
  const edges = [];
  const label = (text,x,y) => {const width=text.length*14.3+14;return `<rect x="${x-width/2}" y="${y-10}" width="${width}" height="21" rx="5"/><text x="${x}" y="${y+4}" text-anchor="middle">${text}</text>`;};
  const add = (path,text,x,y,cls='') => edges.push(`<g class="${cls==='amber'?'edge-amber':''}"><path class="connector ${cls==='dashed'?'dashed':''}" d="${path}" marker-end="url(#arrowhead)"/>${label(text,x,y)}</g>`);
  add(`M${p.x+p.w},${p.cy} H${c.x}`, '合同依据',(p.x+p.w+c.x)/2,p.cy);
  add(`M${c.x+c.w},${c.cy} H${d.x}`, '约定支付',(c.x+c.w+d.x)/2,c.cy);
  const tenantLane = t.y-30;
  add(`M${t.cx},${t.y} V${tenantLane+8} Q${t.cx},${tenantLane} ${t.cx+8},${tenantLane} H${c.cx-8} Q${c.cx},${tenantLane} ${c.cx},${tenantLane-8} V${c.y+c.h}`, '承租主体',(t.cx+c.cx)/2,tenantLane);
  add(`M${d.cx},${d.y+d.h} V${r.y}`, '已见记录',d.cx+42,(d.y+d.h+r.y)/2);
  add(`M${r.cx},${r.y+r.h} V${diff.y}`, '账面比对',r.cx+42,(r.y+r.h+diff.y)/2,'amber');
  const sourceLane = a.y-25;
  const spine = c.cx-36;
  add(`M${a.cx},${a.y} V${sourceLane+8} Q${a.cx},${sourceLane} ${a.cx+8},${sourceLane} H${spine-8} Q${spine},${sourceLane} ${spine},${sourceLane-8} V${c.y+c.h+13} Q${spine},${c.y+c.h+5} ${spine+8},${c.y+c.h+5} H${c.cx-7}`, '提及合同与收款',(a.cx+spine)/2,sourceLane);
  const secondarySpine=c.cx+28;
  add(`M${b.cx},${b.y} H${secondarySpine} V${c.y+c.h+17} Q${secondarySpine},${c.y+c.h+7} ${secondarySpine-10},${c.y+c.h+7} H${c.cx+7}`, state.relation==='linked'?'人工关联':'相似待核',secondarySpine+7,t.cy+28,state.relation==='linked'?'':'dashed');
  svg.setAttribute('viewBox',`0 0 ${Math.max(base.width,space.scrollWidth)} ${base.height}`);
  svg.innerHTML = `<defs><marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="#8B9FB6" stroke-width="1"/></marker></defs>${edges.join('')}`;
}

function modalShell(kicker,title,content,wide=false) {
  return `<div class="modal-backdrop" data-action="backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${e(title)}"><header class="modal-head"><div><p class="eyebrow">${kicker}</p><h2>${title}</h2></div><button class="close-button" data-action="close-modal" aria-label="关闭">×</button></header>${content}</section></div>`;
}

function highlight(text) {
  let result=e(text);
  for(const fragment of [data.contract,data.tenant,'36,000元','12,000元','3.6万元','1.2万元']) result=result.replaceAll(fragment,`<mark>${fragment}</mark>`);
  return result;
}

function renderModal() {
  if(!state.modal){modalRoot.innerHTML='';document.body.style.overflow='';return;}
  document.body.style.overflow='hidden';
  if(state.modal==='intake') {
    modalRoot.innerHTML=modalShell('开始新材料 / 独立静态演示','先放入一份举报材料',`<p class="modal-intro">这里仅演示材料阅读与信息整理。不会接收真实举报，也不会发起核查。</p><div class="intake-sample-actions"><button class="text-link" data-action="load-sample">载入和盛村租赁样例 ${arrow}</button><span>全部人物、单位与金额均为虚构</span></div><textarea class="intake-text" data-field="intake" aria-label="举报材料文本" placeholder="在这里粘贴演示材料，或点击上方载入样例…">${e(state.intake)}</textarea>${state.intakeError?`<p class="inline-error">${state.intakeError}</p>`:''}<div class="modal-actions"><button class="btn btn-quiet" data-action="close-modal">先返回</button><button class="btn btn-primary" data-action="open-material">阅读这份材料 ${arrow}</button></div><p class="modal-caption">此阶段使用固定演示案例；任意粘贴文本只用于预览入口，不伪装真实智能解析。</p>`);
  } else if(state.modal==='original') {
    const secondary=state.source==='related';
    modalRoot.innerHTML=modalShell('原始材料 / 原件陈述',secondary?data.relatedTitle:data.title,`<div class="document-meta"><span>${secondary?data.relatedId:data.id}</span><span>${secondary?'2026-10-30 · 网络转办':`${data.date} · ${data.source}`}</span><span>${data.area}</span>${tag('raw','虚构演示原件')}</div><article class="original-document">${secondary?`<p>${highlight(data.relatedText)}</p>`:data.paragraphs.map(p=>`<p>${highlight(p)}</p>`).join('')}</article><div class="modal-actions">${state.extracted?`<button class="btn" data-action="compare">对照相似材料 ↗</button><button class="btn btn-primary" data-action="close-modal">返回事项脉络 ${arrow}</button>`:`<button class="btn btn-quiet" data-action="close-modal">继续阅读</button><button class="btn btn-primary" data-action="extract">开始辅助提取 ${arrow}</button>`}</div><p class="modal-caption">高亮仅用于定位材料语句，不表示内容已被核实。</p>`,true);
  } else if(state.modal==='compare') {
    const feedback=state.relation==='linked'?'已选择关联。两份材料分别保留，摘要将记录关联依据。':state.relation==='separate'?'已选择暂不关联。原件与相似提示仍保留，可重新判断。':state.relation==='review'?'已标记为待核。当前不建立确认关联，原始材料均保留。':'';
    modalRoot.innerHTML=modalShell('相似提示 / 查看依据后再判断','这两份材料，可能指向同一事项。',`<div class="compare-grid"><article class="compare-document"><h3>${data.title}</h3><div class="document-meta"><span>${data.id}</span><span>11-01 · 来信登记</span></div><p>${highlight(data.paragraphs[1])}</p><button class="text-link" data-action="original" data-source="primary">阅读全文 ↗</button></article><article class="compare-document"><h3>${data.relatedTitle}</h3><div class="document-meta"><span>${data.relatedId}</span><span>10-30 · 网络转办</span></div><p>${highlight(data.relatedText)}</p><button class="text-link" data-action="original" data-source="related">阅读全文 ↗</button></article></div><section class="comparison-reasons"><h3>AI 辅助提示的匹配依据</h3><div class="reason-row"><strong>同一合同</strong><span>双方均明确写到 ${data.contract}</span></div><div class="reason-row"><strong>金额表述一致</strong><span>3.6万元 = 36,000元；1.2万元 = 12,000元</span></div><div class="reason-row"><strong>相近核对诉求</strong><span>均要求核对付款安排与收款凭证，第二份明确提出银行流水。</span></div></section><p class="comparison-boundary">相似不等于重复，也不代表反映内容属实。请同时留意新增事实、证据与不同诉求。</p>${feedback?`<div class="choice-feedback">${feedback}</div>`:''}<div class="compare-actions"><button class="text-link" data-action="relate" data-value="review">先标记待核</button><div><button class="btn" data-action="relate" data-value="separate">暂不关联</button><button class="btn btn-primary" data-action="relate" data-value="linked">人工关联，保留原件 ${arrow}</button></div></div>`,true);
  } else if(state.modal==='summary') {
    const relationText=state.relation==='linked'?'已人工关联相似材料':state.relation==='separate'?'人工选择暂不关联':state.relation==='review'?'关联关系待核':'相似提示尚未确认';
    modalRoot.innerHTML=modalShell('整理结果 / 待复核摘要','先保存整理，再决定是否提交。',`<div class="summary-facts">${tag(state.corrected?'human':'ai',state.corrected?'主体文字已人工修正':'主体文字仍待核对')}<span>${relationText}</span></div><p class="modal-intro">摘要可编辑；保存不等于受理或线索处置决定。</p><textarea class="summary-text" data-field="summary" aria-label="待复核摘要">${e(state.summary)}</textarea><div class="summary-status-panel ${state.submitted?'submitted':''}"><h3>${state.submitted?'已提交人工复核':state.saved?'待复核摘要已保存':state.dirty?'有未保存修改':'尚未保存'}</h3>${state.submitted?'本预览记录了你的提交动作。没有生成核查任务，也没有作出处置决定。':state.saved?`${data.id} · ${state.savedAt} 保存于当前预览。你可以继续修改，或人工检查后另行提交复核。`:'将保留摘要、字段修正和材料关联选择，供后续人工查看。'}</div>${!state.submitted?`<label class="review-checkbox"><input type="checkbox" data-field="checked" ${state.checked?'checked':''}><span>我已人工检查原文、字段修正与关联依据<small>此项默认不勾选。提交复核为可选动作，未完成检查时可以只保存。</small></span></label>`:''}<p class="summary-log">原始来源：${data.id} / ${data.relatedId}（分别保留）<br>本次确认：${state.corrected?`${data.aiTenant} → ${e(state.tenant)}，仅修正提取文字`:'承租主体提取尚待人工核对'}<br>关联选择：${relationText}</p><div class="modal-actions"><button class="btn" data-action="save">${state.saved?'保存摘要修改':'保存待复核摘要'}</button>${!state.submitted?`<button class="btn btn-primary" data-action="submit" ${!state.saved||!state.checked?'disabled':''}>人工检查后提交复核 ${arrow}</button>`:'<button class="btn btn-primary" data-action="close-modal">返回事项脉络</button>'}</div>`);
  }
}

async function extract() {
  if(state.busy)return;
  state.modal=null;state.busy=true;state.extracted=false;state.selected=null;navigate('work');
  await new Promise(resolve=>setTimeout(resolve,1150));
  state.busy=false;state.extracted=true;state.selected='tenant';state.corrected=false;state.tenant=data.aiTenant;state.tenantDraft=data.aiTenant;render();
}

document.addEventListener('click',async event=>{
  const control=event.target.closest('[data-action]');
  if(!control)return;
  const action=control.dataset.action;
  if(action==='backdrop' && event.target!==control)return;
  event.preventDefault();
  if(action==='home'){state.modal=null;navigate('entry');}
  else if(action==='work'||action==='continue'){state.extracted=true;state.selected=state.selected||'tenant';navigate('work');}
  else if(action==='new'){state.intake='';state.intakeError='';state.modal='intake';renderModal();}
  else if(action==='load-sample'){state.intake=fullOriginal;state.intakeError='';renderModal();}
  else if(action==='open-material'){
    if(state.intake.trim().length<20){state.intakeError='请先载入样例，或粘贴至少一段演示材料。';renderModal();return;}
    if(!state.intake.includes(data.contract)){state.intakeError='此阶段仅使用和盛村固定样例演示，请先载入样例。已输入的文本暂留在这里，不会伪装成真实解析结果。';renderModal();return;}
    state.modal=null;state.extracted=false;state.selected=null;navigate('work');
  }
  else if(action==='question'){state.extracted=true;state.selected=control.dataset.node;navigate('work');}
  else if(action==='node'){state.selected=control.dataset.node;render();}
  else if(action==='close-inspector'){state.selected=null;render();}
  else if(action==='original'){state.source=control.dataset.source||'primary';state.modal='original';renderModal();}
  else if(action==='extract'){await extract();}
  else if(action==='correct'){
    if(!state.tenantDraft.trim())return;
    state.tenant=state.tenantDraft.trim();state.corrected=true;invalidateSaved();render();
  }
  else if(action==='compare'){state.modal='compare';renderModal();}
  else if(action==='relate'){state.relation=control.dataset.value;invalidateSaved();render();}
  else if(action==='summary'){state.modal='summary';renderModal();}
  else if(action==='save'){state.saved=true;state.dirty=false;state.checked=false;state.submitted=false;state.savedAt=time();render();}
  else if(action==='submit'&&state.saved&&state.checked){state.submitted=true;render();}
  else if(action==='close-modal'||action==='backdrop'){state.modal=null;render();}
});

document.addEventListener('input',event=>{
  const field=event.target.dataset.field;
  if(!field || !(field in state) || event.target.type === 'checkbox') return;
  const changed = state[field] !== event.target.value;
  state[field] = event.target.value;
  if(changed && (field === 'summary' || field === 'tenantDraft')) {
    const refresh = state.saved || state.checked || state.submitted || !state.dirty;
    const {selectionStart, selectionEnd} = event.target;
    invalidateSaved();
    if(refresh) refreshInputState(field, selectionStart, selectionEnd);
  }
});
document.addEventListener('change',event=>{
  if(event.target.dataset.field==='checked'){
    state.checked=event.target.checked;
    const submit=modalRoot.querySelector('[data-action="submit"]');
    if(submit)submit.disabled=!state.saved||!state.checked;
  }
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&state.modal){state.modal=null;render();}
});
render();
