<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ArrowDownToLine, BookOpen, Check, CheckCheck, ChevronRight, Clipboard, FileCheck2, FileText, Highlighter, ListChecks, Search, ShieldCheck, Sparkles } from 'lucide-vue-next'
import { usePlatformStore } from '../stores/platform'
import { buildAssistantOutput, getReviewFindings, reviewChecks } from '../services/professional'

const store = usePlatformStore()
const mode = ref<'document' | 'knowledge'>('document')
const selectedIssue = ref('')
const editor = ref<HTMLTextAreaElement>()
const busy = ref(false)
const copied = ref(false)
const query = ref('集体资产租赁事项，核查材料应当关注哪些要素？')
const searched = ref(false)
const issues = reviewChecks
const activeIssues = computed(() => store.reviewChecked ? getReviewFindings(store.reviewDocument) : [])
const selected = computed(() => activeIssues.value.find(i => i.id === selectedIssue.value))
const modified = computed(() => store.reviewApplied.length)

async function runCheck() {
  busy.value = true
  await new Promise(resolve => setTimeout(resolve, 850))
  store.reviewChecked = true
  selectedIssue.value = activeIssues.value[0]?.id || ''
  store.addEvent('文书辅助校核', '完成虚构线索处置材料的要素与一致性检查')
  busy.value = false
}
async function locate(id: string) {
  selectedIssue.value = id
  mode.value = 'document'
  await nextTick()
  const issue = issues.find(i => i.id === id)
  if (!issue || !editor.value) return
  const start = store.reviewDocument.indexOf(issue.excerpt)
  editor.value.focus()
  if (start >= 0) editor.value.setSelectionRange(start, start + issue.excerpt.length)
}
function apply(id: string) {
  const issue = issues.find(i => i.id === id)
  if (!issue) return
  store.reviewDocument = store.reviewDocument.replace(issue.excerpt, issue.replacement)
  if (!store.reviewApplied.includes(id)) store.reviewApplied.push(id)
  store.addEvent('人工采纳修订', `案卷审理：${issue.title}`)
  selectedIssue.value = activeIssues.value[0]?.id || ''
}
function summarize() {
  store.reviewSummary = `【AI 辅助摘要初稿 · 演示数据 · 需人工审核】\n\n${buildAssistantOutput(store.reviewDocument, 'summary')}\n\n当前已由人工采纳 ${modified.value} 项修订建议。`
  store.addEvent('生成文书摘要', '本地演示适配器生成摘要初稿，保留人工审核要求')
}
async function copyDraft() {
  const text = store.reviewSummary || `【演示数据 · AI 辅助初稿，需人工审核】\n${store.reviewDocument}`
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => copied.value = false, 2200)
}
function download() {
  const text = `【演示数据 · AI 辅助初稿，需人工审核】\n\n${store.reviewDocument}${store.reviewSummary ? '\n\n' + store.reviewSummary : ''}`
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = '线索处置材料_演示初稿.txt'; anchor.click()
  URL.revokeObjectURL(url)
  store.addEvent('导出文书初稿', '导出包含演示数据与人工复核提示的文本文件')
}
</script>

<template>
  <div class="review-page">
    <div class="page-heading review-heading">
      <div><div class="eyebrow">材料审查与依据检索</div><h1>案卷审理助手</h1><p>对照原文检查材料要素，逐项确认修订建议。</p></div>
      <button class="btn" @click="download"><ArrowDownToLine :size="16" />导出文本</button>
    </div>
    <div class="review-workspace panel">
      <aside class="document-nav">
        <div class="nav-label">工作空间</div>
        <button class="workspace-tab" :class="{ active: mode === 'document' }" @click="mode = 'document'"><FileCheck2 :size="17" /><span>文书校核</span><ChevronRight :size="14" /></button>
        <button class="workspace-tab" :class="{ active: mode === 'knowledge' }" @click="mode = 'knowledge'"><BookOpen :size="17" /><span>法规与依据</span><ChevronRight :size="14" /></button>
        <div class="nav-label files-label">当前材料 <span>01</span></div>
        <button class="current-file" @click="mode = 'document'"><FileText :size="23" /><strong>线索处置初核情况单</strong><span>XF-2026-0108</span><small>虚构样本 · 可编辑</small></button>
        <div class="nav-label related-label">关联附件</div>
        <div class="attachment"><FileText :size="15" /><span>合同要素摘录<span>演示附件 · 1 页</span></span></div>
        <div class="attachment"><ListChecks :size="15" /><span>收款关联明细<span>演示附件 · {{ store.payments.filter(p => p.contractId === 'SZ-HT-2026-018').length }} 条</span></span></div>
        <div class="nav-safety"><ShieldCheck :size="20" /><strong>人机协同审理</strong><p>AI 提供校核建议。修改、采纳与业务结论均由工作人员确认。</p></div>
      </aside>

      <main class="document-main">
        <template v-if="mode === 'document'">
          <div class="editor-toolbar"><span><FileText :size="15" />正文编辑</span><span class="saved"><Check :size="13" />本地自动保存</span></div>
          <div class="paper-wrap">
            <div class="document-paper">
              <div class="paper-classification">演示文书 · 非真实案件材料</div>
              <h2>线索处置初核情况单</h2><div class="paper-rule"></div>
              <div class="paper-meta"><span>材料编号 <b>XF-2026-0108</b></span><span>承办单位 <b>第一监督检查组（演示）</b></span></div>
              <div v-if="selected" class="document-locate"><Highlighter :size="15" /><span>当前定位：{{ selected.label }} · {{ selected.excerpt }}</span></div>
              <textarea ref="editor" v-model="store.reviewDocument" aria-label="线索处置材料正文" class="document-editor" spellcheck="false"></textarea>
              <div class="paper-footer"><span>AI 辅助初稿，需人工审核</span><span>01 / 01</span></div>
            </div>
            <div v-if="store.reviewSummary" class="summary-preview"><div><Sparkles :size="17" /><strong>摘要初稿</strong><span class="badge">待人工审核</span></div><p>{{ store.reviewSummary }}</p></div>
          </div>
          <div class="editor-bottom"><span>{{ store.reviewDocument.length }} 字 · 已采纳 {{ modified }} 项建议</span><div><button class="btn btn-quiet" @click="summarize"><Sparkles :size="15" />生成摘要初稿</button><button class="btn" @click="copyDraft"><Check v-if="copied" :size="15" /><Clipboard v-else :size="15" />{{ copied ? '已复制初稿' : '复制初稿' }}</button></div></div>
        </template>
        <template v-else>
          <div class="knowledge-view"><span class="knowledge-icon"><BookOpen :size="26" /></span><div class="eyebrow">内置演示资料 · 可追溯检索</div><h2>从材料问题，找到审查要点</h2><p class="knowledge-desc">仅在系统内置演示条目中检索。正式适用须查询现行有效的权威文本。</p><label class="knowledge-search"><Search :size="18" /><input v-model="query" aria-label="法规演示检索问题" @keyup.enter="searched = true" /><button class="btn btn-primary" @click="searched = true">检索</button></label>
            <template v-if="searched"><div class="search-caption">匹配到 2 条内置演示资料 <span>本地模拟检索</span></div><article class="knowledge-result" v-for="(name, index) in ['集体资产租赁材料核对要点', '线索处置材料形式审查指引']" :key="name"><div><span class="reference-num">0{{ index + 1 }}</span><h3>{{ name }}</h3><span class="badge">演示条目</span></div><p>{{ index === 0 ? '关注合同主体、租赁期间、收款节点、到账凭证与关联台账是否一致；差额应结合完整收款记录核验。' : '关注事项来源、接收时间、承办意见及复核信息是否齐备；记录之间存在矛盾时，应回查原始材料。' }}</p><footer>来源：平台内置示例 · 非真实法规原文 · 无真实法条编号</footer></article><div class="ai-note"><ShieldCheck :size="16" />上述内容用于展示检索与溯源交互，不构成法规适用意见。</div></template>
            <div v-else class="knowledge-empty"><BookOpen :size="34" /><h3>依据可回溯，适用须审慎</h3><p>输入材料问题，查看演示匹配摘录与适用提醒。</p><button class="btn btn-quiet" @click="searched = true">查看内置检索示例<ChevronRight :size="15" /></button></div>
          </div>
        </template>
      </main>

      <aside class="check-panel"><div class="check-title"><span class="sparkle-icon"><Sparkles :size="19" /></span><div><h3>辅助校核</h3><p>结构、要素与一致性检查</p></div></div><div class="ai-note">本地模拟校核 · 辅助结果需人工复核</div><button class="btn btn-primary run-check" :disabled="busy" @click="runCheck"><Sparkles :size="16" />{{ busy ? '正在比对材料要素…' : store.reviewChecked ? '重新校核材料' : '开始校核' }}</button>
        <template v-if="store.reviewChecked"><div class="check-summary"><strong>{{ activeIssues.length.toString().padStart(2, '0') }}</strong><div>项待确认建议<span>已由人工采纳 {{ modified }} 项</span></div><span class="check-dot"></span></div><div class="issue-list"><article v-for="issue in activeIssues" :key="issue.id" class="review-issue" :class="{ selected: selectedIssue === issue.id }"><div class="issue-type"><span class="issue-mark" :class="issue.severity"></span>{{ issue.kind }}<small>{{ issue.label }}</small></div><button class="issue-title" @click="locate(issue.id)">{{ issue.title }}</button><p>{{ issue.detail }}</p><div class="issue-actions"><button @click="locate(issue.id)"><Highlighter :size="13" />定位原文</button><button @click="apply(issue.id)"><Check :size="13" />采纳建议</button></div></article><div v-if="!activeIssues.length" class="checks-complete"><CheckCheck :size="36" /><h3>示例建议已处理</h3><p>3 项建议已由人工采纳。正式流转前，仍需复核原始凭证与事实。</p></div></div></template>
        <div v-else class="check-empty"><ListChecks :size="35" /><h3>把细节留在流转之前</h3><p>检查日期、金额与必填信息，定位材料中需要人工关注的内容。</p><div><span>01 日期一致性</span><span>02 金额一致性</span><span>03 必填与程序要素</span></div></div>
        <div class="check-foot"><ShieldCheck :size="16" /><span>校核建议不替代事实认定、法规适用及人工审理。</span></div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.review-heading{margin-bottom:26px}.review-heading h1{font-size:30px}.review-heading .eyebrow{font-size:13px;color:var(--muted);margin-bottom:5px}.review-heading p{font-size:14px}
.review-workspace{display:grid;grid-template-columns:184px minmax(380px,1fr) 310px;height:calc(100vh - 236px);min-height:660px;max-height:840px;overflow:hidden;border-color:var(--line);border-radius:14px}
.document-nav{background:var(--surface-2);border-right:1px solid var(--line);padding:25px 14px;display:flex;flex-direction:column;min-height:0}.nav-label{font-size:13px;color:var(--muted);padding:0 8px;margin-bottom:13px;display:flex;justify-content:space-between}.workspace-tab{display:flex;align-items:center;gap:9px;border:0;width:100%;background:none;border-radius:7px;color:var(--ink-2);padding:13px 10px;font-size:14px;cursor:pointer;text-align:left}.workspace-tab span{flex:1}.workspace-tab:hover{background:var(--paper-2)}.workspace-tab.active{background:var(--accent-soft);color:var(--blue);font-weight:600}.files-label{margin-top:31px}.files-label span{color:var(--muted)}.current-file{background:var(--surface);border:0;border-left:2px solid var(--blue);border-radius:0 7px 7px 0;padding:16px 11px;text-align:left;color:var(--blue);cursor:pointer;display:flex;flex-direction:column;gap:9px}.current-file strong{font-size:14px;color:var(--ink);line-height:1.65;font-weight:550}.current-file span,.current-file small{font-size:13px;color:var(--muted);line-height:1.5}.related-label{margin-top:28px}.attachment{display:flex;gap:8px;padding:10px 7px;align-items:flex-start;color:var(--muted);font-size:13px}.attachment>svg{margin-top:2px}.attachment span{color:var(--ink-2);line-height:1.6}.attachment span span{display:block;font-size:13px;color:var(--muted);margin-top:3px}.nav-safety{margin-top:auto;padding:26px 8px 0;color:var(--muted)}.nav-safety strong{display:block;color:var(--ink-2);font-size:13px;margin-top:9px;font-weight:550}.nav-safety p{font-size:13px;line-height:1.9;color:var(--muted);margin:7px 0 0}
.document-main{min-width:0;min-height:0;background:var(--paper-2);display:flex;flex-direction:column}.editor-toolbar{height:57px;flex:none;border-bottom:1px solid var(--line);background:white;padding:0 25px;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13px;color:var(--ink-2)}.editor-toolbar>span{display:flex;gap:7px;align-items:center}.editor-toolbar .saved{font-size:13px;color:var(--muted)}.paper-wrap{padding:24px;flex:1;min-height:0;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--accent-line) transparent}.document-paper{background:white;max-width:800px;margin:auto;box-shadow:0 3px 12px #17263805;padding:24px 32px 18px}.paper-classification{font-size:13px;text-align:right;color:var(--muted)}.document-paper h2{font-size:24px;text-align:center;font-family:"Songti SC",SimSun,serif;font-weight:600;letter-spacing:2px;margin:25px 0 22px;color:var(--ink)}.paper-rule{height:1px;background:var(--muted);margin-bottom:18px}.paper-meta{display:flex;justify-content:space-between;font-size:13px;gap:18px;color:var(--muted);line-height:1.75;margin-bottom:24px}.paper-meta b{display:block;font-size:13px;font-weight:450;color:var(--ink-2);margin-top:3px}.document-editor{width:100%;height:455px;resize:vertical;border:0;outline:0;background:transparent;color:var(--ink);font-size:14px;line-height:2;font-family:inherit;padding:0;border-radius:0}.document-editor:focus{outline:0}.document-editor::selection{background:var(--accent-soft)}.document-locate{display:flex;align-items:flex-start;gap:7px;font-size:13px;color:var(--state-pending);background:var(--state-pending-soft);padding:11px 12px;margin-bottom:16px;line-height:1.7;border-radius:5px}.document-locate svg{flex:none;margin-top:3px}.paper-footer{display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:14px;color:var(--muted);font-size:13px;margin-top:18px;gap:12px}.editor-bottom{flex:none;border-top:1px solid var(--line);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;background:white;gap:12px}.editor-bottom>span{font-size:13px;color:var(--muted);line-height:1.6}.editor-bottom>div{display:flex;gap:8px;flex:none}.editor-bottom .btn{font-size:13px;padding:9px 12px;min-height:40px}
.check-panel{background:var(--surface);border-left:1px solid var(--line);padding:24px 20px 19px;display:flex;flex-direction:column;min-height:0}.check-title{display:flex;align-items:center;gap:11px;margin-bottom:17px;flex:none}.sparkle-icon{width:41px;height:41px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--accent-soft);color:var(--blue)}.check-title h3{font-size:18px;margin:0 0 5px;font-weight:600}.check-title p{font-size:13px;color:var(--muted);margin:0;line-height:1.5}.check-panel>.ai-note{font-size:13px;background:var(--paper-2);padding:10px 11px;border-radius:6px;color:var(--ink-2);flex:none;line-height:1.8}.run-check{margin-top:17px;justify-content:center;width:100%;font-size:14px;min-height:40px;flex:none}.check-summary{display:flex;gap:12px;align-items:center;margin:22px 0 0;padding-bottom:18px;border-bottom:1px solid var(--line);flex:none}.check-summary>strong{font-size:36px;line-height:1;letter-spacing:-1px;font-weight:500;color:var(--ink)}.check-summary>div{font-size:13px;color:var(--ink-2)}.check-summary>div>span{display:block;font-size:13px;color:var(--muted);margin-top:6px}.check-dot{margin-left:auto;width:6px;height:6px;background:var(--state-pending);border-radius:50%}.issue-list{display:flex;flex-direction:column;gap:0;flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--accent-soft) transparent}.review-issue{border:0;border-bottom:1px solid var(--line);border-radius:0;padding:19px 2px}.review-issue.selected{background:var(--surface-2);padding-left:11px;padding-right:11px;border-left:2px solid var(--blue)}.issue-type{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--state-pending);line-height:1.5}.issue-type small{margin-left:auto;color:var(--muted);font-size:13px}.issue-mark{width:5px;height:5px;border-radius:50%;display:inline-block;background:var(--state-pending)}.issue-mark.blue{background:var(--blue)}.issue-title{border:0;padding:0;text-align:left;background:none;font-size:15px;line-height:1.65;font-weight:550;color:var(--ink);margin-top:10px;cursor:pointer}.issue-title:hover{color:var(--blue)}.review-issue p{font-size:13px;line-height:1.85;color:var(--muted);margin:9px 0 15px}.issue-actions{display:flex;justify-content:space-between;gap:10px;padding-top:2px}.issue-actions button{display:flex;align-items:center;gap:5px;border:0;padding:4px 0;background:none;cursor:pointer;font-size:13px;color:var(--blue)}.issue-actions button:first-child{color:var(--ink-2)}.issue-actions button:hover{text-decoration:underline}.check-foot{display:flex;align-items:flex-start;gap:7px;padding-top:17px;color:var(--muted);font-size:13px;line-height:1.8;flex:none}.check-foot svg{flex:none;margin-top:3px}.check-empty{padding:34px 3px 20px;color:var(--faint);text-align:center;flex:1}.check-empty h3{font-size:16px;font-weight:550;color:var(--ink-2);margin-top:19px}.check-empty p{font-size:13px;line-height:1.9;color:var(--muted);margin-top:11px}.check-empty>div{padding:19px 6px 0;margin-top:24px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:16px;text-align:left;color:var(--ink-2);font-size:13px}.checks-complete{text-align:center;color:var(--cyan);padding:40px 5px}.checks-complete h3{font-size:16px;color:var(--ink-2);margin-top:15px}.checks-complete p{font-size:13px;color:var(--muted);line-height:1.9;margin-top:10px}.summary-preview{margin-top:22px;background:white;border:0;border-radius:0;padding:25px}.summary-preview>div{display:flex;align-items:center;gap:8px;color:var(--blue);font-size:15px}.summary-preview .badge{margin-left:auto;font-size:13px}.summary-preview p{font-size:14px;line-height:1.9;white-space:pre-wrap;color:var(--ink-2);margin:16px 0 0}
.knowledge-view{background:white;padding:35px 32px;flex:1;min-height:0;overflow:auto}.knowledge-icon{width:54px;height:54px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:var(--accent-soft);color:var(--blue);margin-bottom:24px}.knowledge-view .eyebrow{font-size:13px}.knowledge-view h2{font-size:24px;line-height:1.55;margin:10px 0 12px;font-weight:550}.knowledge-desc{font-size:14px;line-height:1.85;color:var(--muted)}.knowledge-search{display:flex;align-items:center;gap:10px;border:1px solid var(--accent-line);border-radius:8px;padding:6px 7px 6px 13px;margin-top:26px;color:var(--muted);background:var(--surface-2)}.knowledge-search input{width:100%;min-width:0;border:0;background:transparent;outline:0;font-family:inherit;font-size:14px;color:var(--ink-2)}.knowledge-search .btn{font-size:14px;flex:none;min-height:40px;padding:8px 17px}.knowledge-empty{text-align:center;padding:53px 0 15px;color:var(--faint)}.knowledge-empty h3{font-size:18px;color:var(--ink-2);margin-top:21px;font-weight:550}.knowledge-empty p{font-size:14px;color:var(--muted);margin-top:12px}.knowledge-empty .btn{margin:23px auto 0;font-size:14px}.search-caption{margin:29px 0 17px;font-size:13px;color:var(--ink-2);line-height:1.7}.search-caption span{float:right;font-size:13px;color:var(--muted)}.knowledge-result{border-top:1px solid var(--line);padding:24px 0}.knowledge-result>div{display:flex;align-items:center;gap:9px}.reference-num{color:var(--cyan);font-size:13px}.knowledge-result h3{font-size:16px;margin:0;line-height:1.6}.knowledge-result .badge{margin-left:auto;font-size:13px}.knowledge-result p{font-size:14px;line-height:1.9;color:var(--ink-2);margin:14px 0}.knowledge-result footer{font-size:13px;color:var(--muted);line-height:1.8}.knowledge-view>.ai-note{font-size:13px;display:flex;align-items:flex-start;gap:7px;line-height:1.8;margin-top:18px}.knowledge-view>.ai-note svg{flex:none;margin-top:3px}
@media(min-width:1700px){.review-workspace{grid-template-columns:208px minmax(550px,1fr) 350px}.document-nav{padding:28px 17px}.check-panel{padding:28px 26px 23px}.paper-wrap{padding:30px 38px}.document-paper{padding:29px 46px 21px}.document-editor{height:480px;font-size:15px}.current-file strong{font-size:15px}.current-file span,.current-file small,.attachment,.attachment span span,.nav-safety p{font-size:13px}.review-issue p{font-size:14px}.issue-title{font-size:16px}.editor-bottom{padding:17px 28px}.knowledge-view{padding:40px}.knowledge-result h3{font-size:18px}}
@media(max-width:1250px){.review-workspace{grid-template-columns:160px minmax(320px,1fr) 290px}.document-nav{padding:23px 10px}.paper-wrap{padding:18px}.document-paper{padding:21px}.current-file{padding:13px 9px}.current-file strong{font-size:13px}.paper-meta{gap:12px}.editor-bottom{align-items:flex-start;flex-direction:column;gap:8px}.editor-bottom>div{align-self:flex-end}.check-panel{padding:22px 16px}.knowledge-view{padding:28px 24px}.knowledge-view h2{font-size:22px}}
@media(max-width:1050px){.review-workspace{grid-template-columns:minmax(320px,1fr) 285px}.document-nav{display:none}.paper-meta{flex-direction:column;gap:9px}.paper-meta b{display:inline;margin-left:9px}.knowledge-result>div{flex-wrap:wrap}.knowledge-result .badge{margin-left:0}}
</style>
