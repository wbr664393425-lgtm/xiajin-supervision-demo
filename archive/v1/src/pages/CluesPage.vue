<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, CircleCheck, Copy, FileCheck2, FilePlus2, FileText, GitMerge, Info, Link2, LoaderCircle, Plus, Search, ShieldCheck, Sparkles, Upload, X } from 'lucide-vue-next'
import { usePlatformStore } from '../stores/platform'
import { aiService, ocrService } from '../services/ai'
import type { Clue } from '../types'

const store = usePlatformStore()
const route = useRoute()
const selectedId = ref(String(route.query.id || store.clues[0]?.id || ''))
const activeFilter = ref('全部')
const search = ref(String(route.query.q || ''))
const analyzing = ref(false)
const analysisStep = ref(0)
const showIntake = ref(false)
const showAssignment = ref(false)
const showDuplicate = ref(false)
const uploadBusy = ref(false)
const copied = ref(false)
const feedback = ref('')
const assignee = ref('第一监督检查组')
const deadline = ref('2026-11-12')
const intakeTitle = ref('')
const intakeText = ref('')
const intakeSource = ref('材料录入')
const intakeArea = ref('青禾镇 · 和盛村')
const uploadNote = ref('')
const fileInput = ref<HTMLInputElement>()
const selected = computed(() => store.clues.find(x => x.id === selectedId.value) || store.clues[0])
const analysis = computed(() => selected.value?.analysis)
const task = computed(() => store.tasks.find(x => x.source === '信访线索' && x.sourceId === selected.value?.id))
const duplicateClues = computed(() => store.clues.filter(x => analysis.value?.duplicateIds.includes(x.id)))
const duplicateCount = computed(() => {
  const count = store.clues.filter(x => /SZ-HT-2026-018/.test(x.content) && x.status !== '已合并').length
  return count > 1 ? count : 0
})
const filteredClues = computed(() => store.clues.filter(x => {
  const matches = `${x.title}${x.id}${x.area}${x.content}`.includes(search.value.trim())
  const filter = activeFilter.value === '全部' || (activeFilter.value === '待研判' && x.status === '待研判') || (activeFilter.value === '疑似相关' && /SZ-HT-2026-018/.test(x.content)) || (activeFilter.value === '已分派' && !!x.taskId)
  return matches && filter
}))
const segments = computed(() => selected.value?.content.split(/(SZ-HT-2026-018|36,000元|12,000元|24,000元|3\.6万元|1\.2万元|2\.4万元)/g) || [])
const highlighted = (value: string) => /^(SZ-HT-2026-018|36,000元|12,000元|24,000元|3\.6万元|1\.2万元|2\.4万元)$/.test(value) && !!analysis.value
const steps = ['提取材料要素', '比对关联线索', '整理证据依据', '生成人工复核建议']
watch(() => route.query.id, value => { if (value) selectedId.value = String(value) })
watch(() => route.query.q, value => { if (value) search.value = String(value) })
watch(selectedId, () => { feedback.value = ''; copied.value = false })
watch(() => store.clues, () => { if (!store.clues.some(x => x.id === selectedId.value)) selectedId.value = store.clues[0]?.id || '' })
function statusClass(status: string) { return status === '已完成' ? 'status-green' : status === '处理中' ? 'status-blue' : status === '待人工确认' ? 'status-orange' : 'status-neutral' }
async function analyze() {
  if (!selected.value || analyzing.value) return
  const clue = selected.value
  analyzing.value = true; analysisStep.value = 0
  try {
    const result = aiService.analyzeClue(clue, store.clues)
    for (let i = 1; i <= 4; i++) { await new Promise(resolve => setTimeout(resolve, 260)); analysisStep.value = i }
    clue.analysis = await result
    if (clue.status === '待研判') clue.status = '待人工确认'
    store.addEvent('完成演示辅助研判', `${clue.id} 已生成材料要素、证据依据与人工复核建议`)
  } finally { analyzing.value = false }
}
function assign() {
  if (!selected.value || !assignee.value || !deadline.value) return
  const created = store.addTask({ source: '信访线索', sourceId: selected.value.id, title: selected.value.title, area: selected.value.area, priority: selected.value.priority, assignee: assignee.value, deadline: deadline.value })
  showAssignment.value = false
  feedback.value = `已形成核查任务 ${created.id}，监督总览已同步更新。`
}
function merge() {
  if (!selected.value) return
  const targets = duplicateClues.value.filter(x => x.status !== '已合并' && !x.taskId)
  if (!targets.length) return
  for (const clue of targets) { clue.status = '已合并'; clue.mergedInto = selected.value.id }
  store.addEvent('人工确认合并相关线索', `${targets.map(x => x.id).join('、')} 合并至 ${selected.value.id}，原始材料及来源记录保留`)
  showDuplicate.value = false
  feedback.value = `已关联归并 ${targets.length} 份材料，原始来源完整保留。`
}
async function readFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadBusy.value = true
  try {
    const parsed = await ocrService.parse(file)
    intakeText.value = parsed.text; uploadNote.value = parsed.note; intakeSource.value = parsed.simulated ? '附件模拟解析' : '文本导入'
    if (!intakeTitle.value) intakeTitle.value = file.name.replace(/\.[^.]+$/, '')
  } finally { uploadBusy.value = false }
}
function useSample() {
  const sample = store.clues.find(x => x.id === 'XF-2026-0108') || store.clues[0]
  if (sample) { intakeTitle.value = '集体场地收款补充材料（演示）'; intakeText.value = sample.content; intakeArea.value = sample.area; intakeSource.value = '样例录入'; uploadNote.value = '已载入内置虚构样例，可以编辑后登记。' }
}
function createClue() {
  if (!intakeTitle.value.trim() || intakeText.value.trim().length < 10) return
  let suffix = Math.max(108, ...store.clues.map(x => Number(x.id.split('-').at(-1)) || 0)) + 1
  const clue: Clue = { id: `XF-2026-${String(suffix).padStart(4, '0')}`, title: intakeTitle.value.trim(), area: intakeArea.value, source: intakeSource.value, date: '2026-11-02', status: '待研判', priority: '一般关注', content: `【演示数据 · 本地录入材料】\n${intakeText.value.trim()}` }
  store.clues.unshift(clue); store.addEvent('登记新的演示信访材料', `${clue.id} · ${clue.title}，等待辅助研判与人工复核`)
  selectedId.value = clue.id; activeFilter.value = '全部'; search.value = ''; showIntake.value = false
  intakeTitle.value = ''; intakeText.value = ''; uploadNote.value = ''
}
async function copySummary() {
  if (!analysis.value) return
  try { await navigator.clipboard.writeText(`【演示数据 · AI辅助结果，需人工复核】\n${analysis.value.summary}`); copied.value = true } catch { feedback.value = '请在下方研判摘要中选择文本复制。' }
}
function withdrawAnalysis() {
  if (!selected.value || selected.value.taskId) return
  selected.value.analysis = undefined; selected.value.status = '待研判'
  store.addEvent('撤回演示辅助研判', `${selected.value.id} 回到待研判，原始材料保留`)
}
</script>

<template>
  <div class="clues-page">
    <div class="clue-heading">
      <div><div class="eyebrow">信访受理 · 辅助研判</div><h1>信访线索研判</h1><p>对照原始材料，整理关联线索，由人工确认核查方向。</p></div>
      <button class="btn btn-primary" @click="showIntake = true"><Plus :size="17" />录入信访材料</button>
    </div>

    <div class="clue-summary">
      <div><span>待辅助研判</span><strong>{{ store.metrics.pendingClues.toString().padStart(2, '0') }}</strong><i></i></div>
      <div><span>待人工确认</span><strong>{{ store.metrics.awaitingConfirmation.toString().padStart(2, '0') }}</strong><i></i></div>
      <div><span>已形成核查任务</span><strong>{{ store.tasks.filter(x => x.source === '信访线索').length.toString().padStart(2, '0') }}</strong><i></i></div>
      <div><span>疑似相关材料</span><strong class="orange-number">{{ duplicateCount.toString().padStart(2, '0') }}</strong><span class="summary-note">需人工判断</span></div>
      <div class="summary-boundary"><ShieldCheck :size="18" /><span>本地演示研判<br><b>不作事实认定</b></span></div>
    </div>

    <div class="clue-workspace">
      <aside class="clue-list panel">
        <div class="list-heading"><h2>线索收件箱</h2><span>{{ store.clues.length }} 件</span></div>
        <label class="clue-search"><Search :size="15" /><input v-model="search" placeholder="搜索编号、摘要或单位" aria-label="搜索线索" /></label>
        <div class="clue-filters"><button v-for="filter in ['全部', '待研判', '疑似相关', '已分派']" :key="filter" :class="{ active: activeFilter === filter }" @click="activeFilter = filter">{{ filter }}</button></div>
        <div class="clue-items">
          <button v-for="clue in filteredClues" :key="clue.id" class="clue-item" :class="{ selected: selected?.id === clue.id }" @click="selectedId = clue.id">
            <div class="clue-item-top"><span class="clue-code">{{ clue.id }}</span><span class="priority-dot" :class="clue.priority === '高关注' ? 'priority-high' : clue.priority === '优先核查' ? 'priority-medium' : 'priority-low'"></span></div>
            <h3>{{ clue.title }}</h3><p>{{ clue.area }}</p>
            <div class="clue-item-bottom"><span class="clue-state" :class="statusClass(clue.status)">{{ clue.status }}</span><span>{{ clue.date.slice(5) }} · {{ clue.source }}</span></div>
          </button>
          <div v-if="!filteredClues.length" class="list-empty"><Search :size="24" /><p>没有匹配的线索</p><button @click="search = ''; activeFilter = '全部'">清除筛选</button></div>
        </div>
        <div class="list-foot"><Info :size="13" />虚构材料 · 仅用于演示</div>
      </aside>

      <section v-if="selected" class="material-panel panel">
        <div class="section-bar"><div><FileText :size="17" /><h2>原始举报材料</h2></div><span class="material-label">来源保留</span></div>
        <div class="material-main">
          <div class="material-meta"><span>{{ selected.id }}</span><span :class="statusClass(selected.status)">{{ selected.status }}</span></div>
          <h2 class="material-title">{{ selected.title }}</h2>
          <div class="material-properties"><span>归属区域<b>{{ selected.area }}</b></span><span>材料来源<b>{{ selected.source }}</b></span><span>登记日期<b>{{ selected.date }}</b></span></div>
          <div v-if="selected.status === '已合并'" class="merged-banner"><GitMerge :size="16" /><span>经人工确认，已归并至 <button @click="selectedId = selected.mergedInto || selected.id">{{ selected.mergedInto }}</button>，本材料继续保留。</span></div>
          <div class="material-paper"><span class="paper-corner">原文</span><p><template v-for="(segment, index) in segments" :key="index"><mark v-if="highlighted(segment)">{{ segment }}</mark><template v-else>{{ segment }}</template></template></p></div>
          <div class="source-preserved"><ShieldCheck :size="15" /><span>原文完整保留，辅助提取结果由人工核对。</span></div>
        </div>
        <div class="material-footer"><span><span class="green-dot"></span>原始材料已本地保存</span><button class="text-button" @click="showIntake = true"><FilePlus2 :size="15" />补充材料<ArrowUpRight :size="14" /></button></div>
      </section>

      <aside v-if="selected" class="analysis-panel panel">
        <div class="section-bar"><div><Sparkles :size="17" /><h2>AI 辅助研判</h2></div><span class="ai-mode">演示模式</span></div>
        <div v-if="analyzing" class="analysis-processing"><div class="processing-symbol"><Sparkles :size="27" /></div><h3>正在整理材料中的关键信息</h3><p>本地模拟研判，不请求外网模型。</p><ol><li v-for="(step, index) in steps" :key="step" :class="{ done: analysisStep > index, current: analysisStep === index }"><CircleCheck v-if="analysisStep > index" :size="18" /><LoaderCircle v-else-if="analysisStep === index" class="spin" :size="18" /><span v-else class="step-number">{{ index + 1 }}</span>{{ step }}</li></ol></div>
        <div v-else-if="!analysis" class="analysis-idle">
          <div class="analysis-illustration"><div class="illustration-paper"><span></span><span></span><span></span><span></span></div><div class="illustration-spark"><Sparkles :size="25" /></div><div class="illustration-check"><Check :size="17" /></div></div>
          <span class="eyebrow">材料提取 · 人工确认</span><h3>从原文找到<br>下一步核查依据</h3><p>提取事项要素，查看来源与关联，<br>由工作人员判断并确认。</p>
          <button class="btn btn-primary analyze-button" :disabled="selected.status === '已合并'" @click="analyze"><Sparkles :size="16" />开始辅助研判<ArrowRight :size="16" /></button>
          <div class="analysis-idle-features"><span><Check :size="13" />提取核心要素</span><span><Check :size="13" />保留来源证据</span><span><Check :size="13" />识别相关材料</span><span><Check :size="13" />建议人工核实</span></div>
          <div class="analysis-boundary"><Info :size="14" /><p>研判仅提供线索与建议，不作违纪定性。所有关键操作均需人工确认。</p></div>
        </div>
        <div v-else class="analysis-results">
          <div class="analysis-result-head"><span><CircleCheck :size="15" />演示研判已完成</span><button v-if="!selected.taskId" @click="withdrawAnalysis">撤回研判</button></div>
          <section class="analysis-section"><div class="analysis-section-title"><span>01</span><h3>材料核心要素</h3></div><dl class="analysis-facts"><div><dt>问题类型</dt><dd>{{ analysis.category }}</dd></div><div><dt>涉及对象</dt><dd>{{ analysis.subject }}</dd></div><div><dt>时间 / 金额</dt><dd>{{ analysis.period }}<br>{{ analysis.amount }}</dd></div></dl><div class="keyword-tags"><span v-for="word in analysis.keywords" :key="word">{{ word }}</span></div><div v-if="analysis.related.length" class="related-objects"><span>关联对象</span><p>{{ analysis.related.join(" · ") }}</p></div><div class="discipline-tags"><span v-for="tag in analysis.discipline" :key="tag">{{ tag }}</span></div></section>
          <button v-if="duplicateClues.length" class="duplicate-alert" @click="showDuplicate = true"><Link2 :size="17" /><span><b>发现 {{ duplicateClues.length }} 份疑似相关材料</b><small>{{ duplicateClues[0]?.status === '已合并' ? '已人工合并 · 原始来源保留' : '合同编号、项目与金额要素一致' }}</small></span><ChevronRight :size="17" /></button>
          <section class="analysis-section summary-section"><div class="analysis-section-title"><span>02</span><h3>疑点摘要与核实建议</h3><button title="复制研判摘要" @click="copySummary"><Check v-if="copied" :size="14" /><Copy v-else :size="14" /></button></div><p>{{ analysis.summary }}</p><div v-if="analysis.scopeNote" class="scope-note"><Info :size="14" />{{ analysis.scopeNote }}</div></section>
          <section class="analysis-section evidence-section"><div class="analysis-section-title"><span>03</span><h3>来源证据与待核问题</h3></div><article v-for="(evidence, index) in analysis.evidence" :key="index" class="evidence-card"><h4><FileCheck2 :size="13" />{{ evidence.source }}</h4><blockquote>{{ evidence.excerpt }}</blockquote><p><b>比对依据</b>{{ evidence.rule }}</p><p><b>待核问题</b>{{ evidence.question }}</p></article></section>
          <div class="ai-disclaimer"><ShieldCheck :size="14" /><span>AI 辅助结果，需人工复核。<br>材料关联不代表事实成立。</span></div>
        </div>
        <div v-if="analysis && !analyzing" class="analysis-action">
          <div v-if="feedback" class="operation-feedback"><CheckCheck :size="15" />{{ feedback }}</div>
          <template v-if="task"><div class="linked-task"><FileCheck2 :size="17" /><div><b>{{ task.id }} · {{ task.status }}</b><span>{{ task.assignee }} · {{ task.deadline }}</span></div></div><button v-if="task.status !== '已完成'" class="btn btn-quiet full-width" @click="store.completeTask(task.id); feedback = '人工核查已完成，来源线索与总览统计同步更新。'"><CircleCheck :size="16" />完成人工核查</button></template>
          <button v-else-if="selected.status !== '已合并'" class="btn btn-primary full-width" @click="showAssignment = true"><ShieldCheck :size="16" />人工确认 · 转核查<ArrowRight :size="15" /></button>
        </div>
      </aside>
    </div>

    <Teleport to="body">
      <div v-if="showIntake" class="clue-modal-overlay" @click.self="showIntake = false"><section class="clue-modal intake-modal" role="dialog" aria-modal="true" aria-labelledby="intake-heading"><div class="clue-modal-header"><div><span class="eyebrow">材料登记</span><h2 id="intake-heading">录入信访材料</h2><p>粘贴原文或导入本地附件，登记后可继续辅助研判。</p></div><button class="icon-button" aria-label="关闭录入窗口" @click="showIntake = false"><X :size="20" /></button></div><div class="intake-form"><div class="intake-upload"><Upload :size="23" /><div><b>{{ uploadBusy ? '正在读取材料…' : '导入 TXT、图片或 PDF' }}</b><p>TXT 实际读取；图片 / PDF 使用内置样例模拟解析。</p></div><button class="btn btn-quiet" :disabled="uploadBusy" @click="fileInput?.click()">选择文件</button><input ref="fileInput" type="file" accept=".txt,.pdf,image/*" hidden @change="readFile" /></div><div v-if="uploadNote" class="intake-note"><Info :size="14" />{{ uploadNote }}</div><div class="intake-form-row"><label class="field"><span>事项标题 <i>*</i></span><input v-model="intakeTitle" placeholder="请概括反映的主要事项" /></label><label class="field area-field"><span>归属区域</span><select v-model="intakeArea"><option>青禾镇 · 和盛村</option><option>清源镇 · 清源村</option><option>新桥镇 · 新桥村</option><option>西河镇 · 西河村</option></select></label></div><label class="field"><span>原始材料 <i>*</i><button class="text-button" @click="useSample">载入演示样例<ArrowUpRight :size="12" /></button></span><textarea v-model="intakeText" rows="9" placeholder="在此粘贴材料文本。请勿录入真实个人信息或涉密资料。演示内容仅保存在当前浏览器中。" /></label><div class="intake-safety"><ShieldCheck :size="15" />演示数据 · 本地处理 · 不上传公网</div></div><div class="clue-modal-footer"><button class="btn btn-quiet" @click="showIntake = false">取消</button><button class="btn btn-primary" :disabled="!intakeTitle.trim() || intakeText.trim().length < 10 || uploadBusy" @click="createClue"><Check :size="16" />登记并查看材料</button></div></section></div>
      <div v-if="showAssignment && selected" class="clue-modal-overlay" @click.self="showAssignment = false"><section class="clue-modal assignment-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-heading"><div class="clue-modal-header"><div><span class="eyebrow">人工确认</span><h2 id="assignment-heading">确认转为人工核查任务</h2><p>AI 仅整理核实方向，任务由您确认后发起。</p></div><button class="icon-button" aria-label="关闭确认窗口" @click="showAssignment = false"><X :size="20" /></button></div><div class="assignment-body"><div class="assignment-summary"><span>{{ selected.id }}</span><h3>{{ selected.title }}</h3><p>{{ selected.area }} · {{ selected.priority }}</p></div><label class="field"><span>责任组</span><select v-model="assignee"><option>第一监督检查组</option><option>第二监督检查组</option><option>农村集体“三资”核查组</option><option>信访受理协调组</option></select></label><label class="field"><span>核查截止日期</span><input v-model="deadline" type="date" min="2026-11-02" /></label><div class="confirmation-notice"><ShieldCheck :size="18" /><span>已阅研判依据并确认进入人工核查。本操作将更新线索状态，在监督总览生成待办，并保留操作记录。</span></div></div><div class="clue-modal-footer"><button class="btn btn-quiet" @click="showAssignment = false">返回核对</button><button class="btn btn-primary" :disabled="!deadline || !assignee" @click="assign"><Check :size="16" />确认并生成核查任务</button></div></section></div>
      <div v-if="showDuplicate && selected && analysis" class="clue-modal-overlay" @click.self="showDuplicate = false"><section class="clue-modal duplicate-modal" role="dialog" aria-modal="true" aria-labelledby="duplicate-heading"><div class="clue-modal-header"><div><span class="eyebrow">相关材料对照</span><h2 id="duplicate-heading">疑似相关线索 · 证据对照</h2><p>对照双方原始材料后决定是否合并，所有原始来源继续保留。</p></div><button class="icon-button" aria-label="关闭证据对照" @click="showDuplicate = false"><X :size="20" /></button></div><div class="duplicate-body"><div class="duplicate-reason"><Link2 :size="19" /><span><b>匹配依据</b>{{ analysis.duplicateReason }}</span></div><div class="duplicate-columns"><article><header><span>当前线索</span><b>{{ selected.id }}</b></header><h3>{{ selected.title }}</h3><p>{{ selected.content }}</p></article><article v-for="duplicate in duplicateClues" :key="duplicate.id"><header><span>{{ duplicate.status === '已合并' ? '已人工归并' : '疑似相关线索' }}</span><b>{{ duplicate.id }}</b></header><h3>{{ duplicate.title }}</h3><p>{{ duplicate.content }}</p></article></div><div class="duplicate-retain"><ShieldCheck :size="16" /><span>合并仅关联材料与核查流程，不合并事实结论。举报频次不作为个人违规认定依据。</span></div></div><div class="clue-modal-footer"><button class="btn btn-quiet" @click="showDuplicate = false">暂不合并</button><button class="btn btn-primary" :disabled="!duplicateClues.some(x => x.status !== '已合并' && !x.taskId)" @click="merge"><GitMerge :size="16" />人工确认合并</button></div></section></div>
    </Teleport>
  </div>
</template>

<style scoped>
.clues-page{--clue-panel-height:calc(100vh - 348px);color:var(--ink)}
.clue-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:22px}
.clue-heading .eyebrow{font-size:13px;line-height:20px;color:var(--muted);letter-spacing:.3px}
.clue-heading h1{font-size:30px;line-height:1.3;letter-spacing:-.7px;font-weight:650;margin:6px 0 8px;color:var(--ink)}
.clue-heading p{font-size:14px;line-height:1.7;color:var(--muted);margin:0}
.clue-heading>.btn{min-height:42px;font-size:14px;padding:10px 17px}
.clue-summary{display:flex;align-items:center;background:transparent;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:16px 0;margin-bottom:22px;gap:0}
.clue-summary>div{display:flex;align-items:center;gap:15px;flex:1;min-width:0;white-space:nowrap}
.clue-summary>div>span:first-child{font-size:13px;color:var(--muted)}
.clue-summary strong{font-size:26px;line-height:1.2;font-weight:600;font-variant-numeric:tabular-nums;color:var(--ink)}
.clue-summary i{height:20px;width:1px;background:var(--line);margin-left:auto;margin-right:23px}
.clue-summary .orange-number{color:var(--state-pending)}
.summary-note{font-size:13px;color:var(--state-pending);margin-left:-7px}
.clue-summary .summary-boundary{flex:0 0 auto;padding-left:22px;border-left:1px solid var(--line);gap:9px;color:var(--cyan)}
.summary-boundary span{font-size:13px;line-height:1.6;color:var(--muted)}
.summary-boundary b{font-weight:400;color:var(--muted)}
.clue-workspace{display:grid;grid-template-columns:248px minmax(310px,1fr) 344px;gap:18px;align-items:stretch}
.clue-list,.material-panel,.analysis-panel{overflow:hidden;border-radius:13px;min-width:0;display:flex;flex-direction:column;height:var(--clue-panel-height);min-height:540px;background:var(--surface);border:1px solid var(--line)}
.list-heading{display:flex;align-items:center;justify-content:space-between;padding:21px 18px 17px;gap:12px}
.list-heading h2,.section-bar h2{font-size:18px;line-height:1.45;margin:0;font-weight:600;color:var(--ink)}
.list-heading>span{font-size:13px;color:var(--muted);white-space:nowrap}
.clue-search{display:flex;align-items:center;margin:0 16px 14px;padding:10px;border:1px solid var(--line);border-radius:7px;gap:7px;color:var(--muted);background:var(--surface-2)}
.clue-search input{width:100%;min-width:0;border:0;outline:0;background:none;font-family:inherit;font-size:13px;color:var(--ink)}
.clue-search input::placeholder{color:var(--muted)}
.clue-filters{display:flex;margin:0 13px 10px;padding:3px;border-radius:6px;background:var(--paper-2);gap:1px}
.clue-filters button{border:0;background:transparent;color:var(--muted);font-size:13px;padding:6px 4px;border-radius:4px;flex:1;white-space:nowrap;cursor:pointer;transition:background .16s,color .16s}
.clue-filters button.active{background:var(--surface);box-shadow:0 1px 3px #1726380A;color:var(--blue);font-weight:600}
.clue-items{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--accent-line) transparent}
.clue-item{display:block;cursor:pointer;background:var(--surface);border:0;border-left:3px solid transparent;border-bottom:1px solid var(--line);text-align:left;width:100%;padding:18px 15px 18px 13px;transition:background .18s}
.clue-item:hover{background:var(--surface-2)}
.clue-item.selected{border-left-color:var(--blue);background:var(--accent-soft)}
.clue-item-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;gap:8px}
.clue-code{font-size:13px;letter-spacing:.1px;font-family:ui-monospace,SFMono-Regular,monospace;color:var(--muted)}
.priority-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.priority-high{background:var(--danger)}.priority-medium{background:var(--state-pending)}.priority-low{background:var(--muted)}
.clue-item h3{font-size:15px;line-height:1.65;color:var(--accent);font-weight:550;margin:0 0 6px;overflow-wrap:anywhere}
.clue-item.selected h3{color:var(--accent)}
.clue-item p{font-size:13px;line-height:1.6;color:var(--muted);margin:0 0 12px}
.clue-item-bottom{display:flex;align-items:center;justify-content:space-between;gap:5px;flex-wrap:wrap}
.clue-item-bottom>span:last-child{font-size:13px;line-height:1.7;color:var(--muted)}
.clue-state{font-size:13px;line-height:1.6;border-radius:4px;padding:2px 6px;white-space:nowrap}
.status-green{color:var(--state-confirmed);background:var(--paper-2)}.status-blue{color:var(--accent);background:var(--accent-soft)}.status-orange{color:var(--state-pending);background:var(--state-pending-soft)}.status-neutral{color:var(--muted);background:var(--paper-2)}
.list-foot{display:flex;flex-shrink:0;align-items:center;justify-content:center;font-size:13px;line-height:1.7;color:var(--muted);padding:13px 7px;gap:5px;border-top:1px solid var(--line);background:var(--surface-2)}
.section-bar{flex-shrink:0;min-height:62px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding:0 20px;gap:12px}
.section-bar>div{display:flex;align-items:center;gap:9px;color:var(--muted);min-width:0}
.material-label{font-size:13px;color:var(--muted);white-space:nowrap}
.material-main{padding:23px 24px 16px;flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--accent-line) transparent}
.material-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}
.material-meta>span:first-child{font-size:13px;letter-spacing:.3px;font-family:ui-monospace,SFMono-Regular,monospace;color:var(--muted)}
.material-meta>span:last-child{font-size:13px;border-radius:4px;padding:4px 8px;white-space:nowrap}
.material-title{font-size:20px;line-height:1.6;letter-spacing:-.3px;font-weight:600;color:var(--ink);margin:17px 0 19px}
.material-properties{display:grid;grid-template-columns:1.25fr .8fr .9fr;gap:14px;margin-bottom:22px;padding-bottom:20px;border-bottom:1px solid var(--line)}
.material-properties>span{font-size:13px;line-height:1.6;color:var(--muted);display:flex;flex-direction:column;gap:5px;min-width:0}
.material-properties b{font-size:13px;font-weight:500;color:var(--ink-2);overflow-wrap:anywhere}
.material-paper{position:relative;background:var(--surface-2);border:0;border-radius:7px;padding:35px 19px 24px;min-height:350px}
.paper-corner{position:absolute;top:12px;right:16px;font-size:13px;letter-spacing:1px;color:var(--muted)}
.material-paper p{font-size:14px;line-height:2.1;color:var(--ink-2);white-space:pre-wrap;margin:0;word-break:break-word}
.material-paper mark{background:var(--accent-soft);border-bottom:1px solid var(--accent);color:var(--accent);padding:1px 2px;border-radius:2px}
.source-preserved{display:flex;gap:7px;color:var(--muted);align-items:flex-start;margin-top:16px;line-height:1.8;font-size:13px}
.source-preserved svg{flex-shrink:0;margin-top:3px}
.material-footer{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);gap:10px;padding:14px 20px;color:var(--muted);font-size:13px;line-height:1.7;background:var(--surface-2)}
.material-footer>span{display:flex;align-items:center;gap:6px}
.green-dot{width:5px;height:5px;display:inline-block;border-radius:50%;background:var(--cyan)}
.text-button{border:0;background:none;display:inline-flex;align-items:center;gap:5px;font-family:inherit;font-size:13px;color:var(--blue);cursor:pointer;padding:0;white-space:nowrap}
.text-button:hover{color:var(--accent)}
.ai-mode{font-size:13px;font-weight:500;color:var(--accent);background:var(--accent-soft);padding:4px 7px;border-radius:4px;white-space:nowrap}
.analysis-panel .section-bar>div{color:var(--blue)}
.analysis-idle{padding:22px 22px 18px;text-align:center;flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;align-items:center;scrollbar-width:thin}
.analysis-illustration{width:132px;height:88px;flex-shrink:0;position:relative;margin:0 auto 13px}
.illustration-paper{position:absolute;top:2px;left:31px;width:66px;height:78px;border:1px solid var(--accent-line);border-radius:8px;background:var(--surface-2);padding:17px 13px;transform:rotate(-7deg);box-shadow:0 7px 16px #254F6C09}
.illustration-paper span{display:block;height:3px;width:36px;margin-bottom:9px;background:var(--accent-soft);border-radius:4px}
.illustration-paper span:nth-child(2){width:25px}.illustration-paper span:nth-child(3){width:30px;background:var(--accent-line)}.illustration-paper span:nth-child(4){width:19px}
.illustration-spark{position:absolute;right:13px;top:7px;color:var(--blue)}
.illustration-check{position:absolute;bottom:7px;right:17px;width:28px;height:28px;background:var(--paper-2);color:var(--state-confirmed);border:3px solid var(--line);border-radius:50%;display:grid;place-items:center}
.analysis-idle>.eyebrow{font-size:13px;line-height:1.6;color:var(--muted);letter-spacing:.2px}
.analysis-idle h3{font-size:20px;line-height:1.6;font-weight:550;color:var(--accent);margin:10px 0 10px;letter-spacing:-.3px}
.analysis-idle>p{font-size:14px;line-height:1.8;color:var(--muted);margin:0 0 20px}
.analyze-button{justify-content:center;width:100%;font-size:14px;min-height:42px;flex-shrink:0}
.analysis-idle-features{display:grid;grid-template-columns:1fr 1fr;gap:13px 10px;width:100%;margin:20px 0 24px}
.analysis-idle-features>span{display:flex;align-items:center;gap:5px;justify-content:center;color:var(--muted);font-size:13px;line-height:1.7;white-space:nowrap}
.analysis-idle-features svg{color:var(--cyan)}
.analysis-boundary{flex-shrink:0;display:flex;align-items:flex-start;text-align:left;gap:7px;background:var(--paper-2);border-radius:7px;padding:12px;margin-top:auto;color:var(--muted)}
.analysis-boundary svg{flex-shrink:0;margin-top:3px}.analysis-boundary p{font-size:13px;line-height:1.8;margin:0}
.analysis-processing{padding:37px 25px;flex:1;overflow-y:auto}
.processing-symbol{display:grid;place-items:center;width:60px;height:60px;border-radius:14px;background:var(--accent-soft);color:var(--blue);margin:0 auto 24px}
.analysis-processing h3{font-size:18px;line-height:1.6;color:var(--ink);text-align:center}
.analysis-processing>p{font-size:13px;color:var(--muted);text-align:center;margin:13px 0 31px;line-height:1.8}
.analysis-processing ol{padding:0;list-style:none;display:grid;gap:23px}
.analysis-processing li{display:flex;gap:12px;align-items:center;font-size:14px;color:var(--muted)}
.analysis-processing li.current{color:var(--blue)}.analysis-processing li.done{color:var(--state-confirmed)}
.step-number{display:grid;place-items:center;width:19px;height:19px;border:1px solid var(--accent-line);border-radius:50%;font-size:13px}
.spin{animation:clue-spin 1.2s linear infinite}@keyframes clue-spin{to{transform:rotate(360deg)}}
.analysis-results{padding:20px 20px 0;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--accent-line) transparent;flex:1}
.analysis-result-head{display:flex;align-items:center;justify-content:space-between;font-size:13px;margin-bottom:23px;color:var(--state-confirmed);gap:10px}
.analysis-result-head>span{display:flex;align-items:center;gap:5px}.analysis-result-head>button{font-size:13px;background:none;border:0;color:var(--muted);cursor:pointer;padding:0;white-space:nowrap}
.analysis-result-head>button:hover{color:var(--blue)}
.analysis-section{margin-bottom:24px}
.analysis-section-title{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.analysis-section-title>span{font-size:13px;letter-spacing:.3px;color:var(--muted)}
.analysis-section-title h3{font-size:16px;line-height:1.5;color:var(--accent);margin:0;font-weight:600}
.analysis-section-title>button{margin-left:auto;background:none;border:0;padding:2px;color:var(--muted);cursor:pointer}
.analysis-facts{margin:0;display:grid;gap:12px}
.analysis-facts>div{display:grid;grid-template-columns:68px minmax(0,1fr);gap:7px;font-size:14px;line-height:1.8}
.analysis-facts dt{color:var(--muted);white-space:nowrap;font-size:13px;padding-top:1px}.analysis-facts dd{margin:0;color:var(--ink-2);overflow-wrap:anywhere}
.keyword-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:15px}
.keyword-tags>span{font-size:13px;line-height:1.6;padding:3px 7px;background:var(--paper-2);color:var(--ink-2);border-radius:4px}
.related-objects{margin-top:16px;font-size:13px;line-height:1.8}.related-objects>span{color:var(--muted)}.related-objects>p{font-size:14px;color:var(--ink-2);margin-top:4px;word-break:break-word}
.discipline-tags{display:flex;gap:7px;margin-top:11px;flex-wrap:wrap}.discipline-tags>span{font-size:13px;line-height:1.6;border:0;background:var(--paper-2);border-radius:4px;color:var(--muted);padding:4px 6px}
.duplicate-alert{display:flex;align-items:center;text-align:left;padding:14px 12px;background:var(--state-pending-soft);border:0;border-radius:7px;color:var(--state-pending);gap:8px;width:100%;cursor:pointer;margin-bottom:24px}
.duplicate-alert>span{flex:1;min-width:0}.duplicate-alert b{font-size:14px;font-weight:550;line-height:1.6;display:block}.duplicate-alert small{display:block;font-size:13px;margin-top:4px;color:var(--ink-2);line-height:1.7}.duplicate-alert>svg{flex-shrink:0}.duplicate-alert:hover{background:var(--state-pending-soft)}
.summary-section>p{font-size:14px;color:var(--ink-2);line-height:1.95;margin:0}
.scope-note{font-size:13px;color:var(--state-pending);background:var(--state-pending-soft);display:flex;gap:6px;padding:12px;margin-top:12px;line-height:1.8;border-radius:5px}.scope-note>svg{flex-shrink:0;margin-top:3px}
.evidence-card{border:0;border-top:1px solid var(--line);background:transparent;border-radius:0;padding:16px 0 0;margin-top:16px}
.evidence-card h4{display:flex;align-items:flex-start;gap:6px;font-size:13px;line-height:1.8;color:var(--ink-2);font-weight:500;margin:0 0 11px}.evidence-card h4 svg{margin-top:4px;flex-shrink:0}
.evidence-card blockquote{font-size:14px;color:var(--ink-2);line-height:1.9;margin:0 0 13px;padding:9px 0 9px 12px;border-left:2px solid var(--accent)}
.evidence-card p{font-size:14px;line-height:1.9;color:var(--ink-2);margin:7px 0 0}.evidence-card p b{display:block;font-size:13px;line-height:1.7;font-weight:500;color:var(--muted);margin-bottom:3px}
.ai-disclaimer{display:flex;gap:7px;align-items:flex-start;font-size:13px;line-height:1.8;color:var(--muted);margin:22px 0 18px}.ai-disclaimer svg{flex-shrink:0;margin-top:3px}
.analysis-action{flex-shrink:0;border-top:1px solid var(--line);padding:14px 18px;background:var(--surface)}
.full-width{width:100%;justify-content:center;font-size:14px;min-height:42px}
.operation-feedback{display:flex;align-items:flex-start;gap:7px;color:var(--state-confirmed);line-height:1.8;font-size:13px;background:var(--paper-2);padding:11px;border-radius:6px;margin-bottom:12px}.operation-feedback svg{flex-shrink:0;margin-top:3px}
.linked-task{display:flex;align-items:center;gap:9px;color:var(--accent);margin:0 0 12px}.linked-task b{font-size:14px;line-height:1.7;display:block;font-weight:500}.linked-task span{display:block;font-size:13px;line-height:1.7;color:var(--muted);margin-top:3px}
.list-empty{padding:40px 15px;color:var(--muted);text-align:center;font-size:14px}.list-empty>p{margin:12px 0}.list-empty>button{background:none;border:0;color:var(--blue);font-size:13px;cursor:pointer}
.merged-banner{display:flex;align-items:flex-start;gap:7px;padding:12px;background:var(--accent-soft);font-size:13px;color:var(--ink-2);line-height:1.8;border-radius:6px;margin-bottom:16px}.merged-banner>svg{flex-shrink:0;margin-top:3px}.merged-banner button{padding:0;color:var(--blue);background:none;border:0;cursor:pointer;font-size:13px}
.clue-modal-overlay{position:fixed;inset:0;z-index:410;background:#102B4854;backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:30px}
.clue-modal{background:white;border:1px solid var(--line);border-radius:16px;max-height:calc(100vh - 60px);overflow-y:auto;box-shadow:0 25px 90px #142A4B25;color:var(--ink);width:100%;font-family:inherit}
.intake-modal{max-width:760px}.assignment-modal{max-width:550px}.duplicate-modal{max-width:1000px}
.clue-modal-header{padding:26px 28px 23px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--line);gap:16px}
.clue-modal-header .eyebrow{font-size:13px;color:var(--muted);letter-spacing:.3px}
.clue-modal-header h2{font-size:24px;line-height:1.5;margin:7px 0 8px;font-weight:600;letter-spacing:-.5px}.clue-modal-header p{font-size:14px;color:var(--muted);margin:0;line-height:1.8}
.icon-button{width:31px;height:31px;flex-shrink:0;border:0;background:var(--paper-2);border-radius:7px;display:grid;place-items:center;color:var(--muted);cursor:pointer}
.clue-modal-footer{display:flex;justify-content:flex-end;gap:10px;padding:18px 28px;border-top:1px solid var(--line);background:var(--surface-2)}.clue-modal-footer .btn{font-size:14px;min-height:42px}
.intake-form,.assignment-body,.duplicate-body{padding:25px 28px}
.intake-upload{display:flex;align-items:center;gap:15px;background:var(--surface-2);border:1px dashed var(--accent-line);border-radius:9px;padding:19px;color:var(--accent)}.intake-upload>div{flex:1;min-width:0}.intake-upload b{font-size:15px;font-weight:500;color:var(--accent)}.intake-upload p{font-size:13px;line-height:1.8;margin:6px 0 0;color:var(--muted)}.intake-upload .btn{font-size:14px;white-space:nowrap}
.intake-note{display:flex;gap:7px;font-size:13px;line-height:1.8;color:var(--ink-2);padding:11px 0 0}.intake-note>svg{flex-shrink:0;margin-top:4px}
.intake-form-row{display:flex;gap:16px;margin-top:23px}.intake-form-row .field{flex:1;min-width:0}.intake-form-row .area-field{flex:0 0 195px}
.field{display:flex;flex-direction:column;gap:9px;margin-bottom:19px}.field>span{font-size:14px;color:var(--ink-2);display:flex;align-items:center;gap:4px}.field i{font-style:normal;color:var(--muted)}.field>span>.text-button{margin-left:auto}
.field input,.field textarea,.field select{font-family:inherit;color:var(--ink-2);border:1px solid var(--accent-line);border-radius:7px;background:var(--surface);padding:10px 12px;font-size:14px;outline:none;line-height:1.8;width:100%;box-sizing:border-box}.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--accent);box-shadow:0 0 0 3px #0875D10C}.field textarea{resize:vertical;min-height:190px}.field input::placeholder,.field textarea::placeholder{color:var(--muted)}
.intake-safety{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--muted)}
.assignment-summary{padding:17px 19px;border:0;border-radius:8px;background:var(--paper-2);margin-bottom:23px}.assignment-summary>span{font-size:13px;color:var(--muted)}.assignment-summary h3{font-size:18px;line-height:1.6;font-weight:550;color:var(--accent);margin:8px 0}.assignment-summary p{font-size:13px;line-height:1.8;color:var(--muted);margin:0}
.confirmation-notice{display:flex;align-items:flex-start;gap:10px;padding:14px;background:var(--accent-soft);border-radius:7px;color:var(--ink-2);font-size:13px;line-height:1.9}.confirmation-notice>svg{flex-shrink:0;margin-top:3px}
.duplicate-reason{display:flex;align-items:flex-start;gap:12px;background:var(--state-pending-soft);border:0;border-radius:8px;padding:17px;color:var(--state-pending);line-height:1.9;font-size:14px;margin-bottom:23px}.duplicate-reason>svg{flex-shrink:0;margin-top:4px}.duplicate-reason b{display:block;color:var(--state-pending);font-weight:550;margin-bottom:4px}
.duplicate-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.duplicate-columns article{min-width:0;border:0;border-radius:0;padding:0}.duplicate-columns article+article{padding-left:24px;border-left:1px solid var(--line)}.duplicate-columns header{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);gap:8px}.duplicate-columns header span{background:var(--accent-soft);color:var(--accent);padding:5px 8px;border-radius:4px}.duplicate-columns header b{font-size:13px;font-weight:400}.duplicate-columns h3{font-size:18px;line-height:1.7;color:var(--accent);font-weight:550;margin:17px 0}.duplicate-columns article>p{font-size:14px;line-height:2;color:var(--ink-2);white-space:pre-wrap;max-height:350px;overflow-y:auto;margin:0;scrollbar-width:thin}.duplicate-retain{display:flex;align-items:flex-start;gap:8px;font-size:13px;line-height:1.8;color:var(--muted);margin-top:23px}.duplicate-retain>svg{flex-shrink:0;margin-top:3px}
@media(min-width:1700px){
 .clues-page{--clue-panel-height:calc(100vh - 358px)}
 .clue-workspace{grid-template-columns:294px minmax(410px,1fr) 408px;gap:22px}
 .clue-heading h1{font-size:32px}.clue-heading p{font-size:15px}
 .clue-summary{padding:18px 0;margin-bottom:24px}.clue-summary>div>span:first-child{font-size:14px}.clue-summary strong{font-size:28px}
 .clue-item{padding:21px 20px 21px 18px}.clue-item h3{font-size:16px}.clue-item p,.clue-item-bottom>span:last-child{font-size:13px}
 .list-heading{padding:23px 21px 20px}.clue-search{margin:0 20px 16px;padding:11px}.clue-search input{font-size:14px}.clue-filters{margin-left:17px;margin-right:17px}
 .section-bar{min-height:65px;padding:0 25px}.material-main{padding:29px 31px 20px}.material-title{font-size:22px}.material-properties{margin-bottom:25px;padding-bottom:23px;gap:20px}.material-properties b{font-size:14px}
 .material-paper{min-height:410px;padding:38px 25px 27px}.material-paper p{font-size:15px}.material-footer{font-size:13px;padding:15px 25px}
 .analysis-idle{padding:35px 31px 24px}.analysis-illustration{height:100px;margin-bottom:19px}.analysis-idle h3{font-size:22px}.analysis-idle>p{font-size:15px}.analysis-idle-features{margin:23px 0 29px;gap:17px}.analysis-idle-features>span{font-size:14px}
 .analysis-results{padding:24px 25px 0}.analysis-facts>div{font-size:15px;grid-template-columns:75px minmax(0,1fr)}.analysis-facts dt{font-size:14px}.analysis-section-title h3{font-size:18px}.summary-section>p,.related-objects>p,.evidence-card blockquote,.evidence-card p{font-size:15px}.analysis-action{padding:16px 23px}
}
@media(max-width:1350px){
 .clue-workspace{grid-template-columns:225px minmax(275px,1fr) 315px;gap:14px}.clue-summary>div{gap:10px}.clue-summary i{margin-right:17px}.clue-summary .summary-boundary{display:none}.summary-note{font-size:13px}
 .material-main{padding:21px 18px 15px}.material-title{font-size:19px}.material-properties{gap:10px;grid-template-columns:1.2fr .85fr 1fr}.material-properties>span,.material-properties b{font-size:13px}.material-paper{padding:32px 15px 22px}.material-footer{padding:12px 15px;gap:7px;flex-wrap:wrap}
 .section-bar{padding:0 16px}.section-bar h2,.list-heading h2{font-size:17px}.analysis-results{padding:18px 16px 0}.analysis-facts>div{grid-template-columns:64px minmax(0,1fr);gap:6px}.analysis-facts dd{font-size:14px}.analysis-idle{padding:21px 18px 18px}.analysis-idle h3{font-size:19px}.analysis-idle-features{gap:12px 6px}.analysis-idle-features>span{font-size:13px}
 .clue-item{padding-right:12px;padding-left:11px}.clue-item h3{font-size:14px}.clue-filters button{font-size:13px}.clue-item-bottom>span:last-child{font-size:13px}
}
@media(max-width:1100px){
 .clue-workspace{grid-template-columns:225px minmax(300px,1fr)}.analysis-panel{grid-column:1/-1;min-height:0;height:auto}.analysis-idle{min-height:460px}.analysis-idle-features,.analysis-idle .analyze-button,.analysis-boundary{max-width:350px}.analysis-results{max-height:630px}.clue-summary .summary-note{display:none}
}
@media(max-width:700px){
 .clue-heading{align-items:flex-start;flex-direction:column;gap:16px}.clue-summary{flex-wrap:wrap;gap:15px}.clue-summary>div{flex:1 1 40%}.clue-summary i{display:none}.clue-workspace{grid-template-columns:minmax(0,1fr)}.clue-list{min-height:330px;height:380px}.material-panel{height:650px;min-height:0}.analysis-panel{grid-column:auto}.intake-form-row{flex-direction:column;gap:0}.intake-form-row .area-field{flex:auto}.intake-upload{flex-wrap:wrap}.duplicate-columns{grid-template-columns:1fr}.duplicate-columns article+article{padding:22px 0 0;border-left:0;border-top:1px solid var(--line)}.clue-modal-overlay{padding:15px}.clue-modal{max-height:calc(100vh - 30px)}.clue-modal-header,.intake-form,.assignment-body,.duplicate-body{padding:21px}.clue-modal-footer{padding:16px 21px;flex-wrap:wrap}.clue-modal-header h2{font-size:22px}.clue-heading h1{font-size:28px}
}
@media(prefers-reduced-motion:reduce){.spin{animation:none}.clue-item,.clue-filters button{transition:none}}
</style>
