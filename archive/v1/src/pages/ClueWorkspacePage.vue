<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, Check, CircleCheck, CircleHelp, Clock3, FilePlus2, FileText, Info, Link2, RotateCcw, Save, Search, UserRound, X } from 'lucide-vue-next'
import ClueDesk from '../components/clues/ClueDesk.vue'
import ClueReader from '../components/clues/ClueReader.vue'
import WorkspaceDialog from '../components/clues/WorkspaceDialog.vue'
import MarkedMaterial from '../components/clues/MarkedMaterial.vue'
import { usePlatformStore } from '../stores/platform'
import { useClueWorkspaceStore } from '../stores/clue-workspace'
import { contractIds, fieldKeys, localDate, relationLabels, reviewBlockers } from '../services/clue-workspace'
import type { FieldKey, RelationDecision } from '../types/clue-workspace'
import '../styles/clue-workspace.css'

const route = useRoute(), router = useRouter(), platform = usePlatformStore(), workspace = useClueWorkspaceStore()
type Panel = 'intake' | 'source' | 'related' | 'summary' | 'history' | 'help' | null
const activeId = ref(''), search = ref(String(route.query.q || '')), panel = ref<Panel>(null), sourceKind = ref<'original' | 'contract' | 'receipt'>('original')
const notesOpen = ref(true), editingField = ref<FieldKey | null>(null), editValue = ref(''), editError = ref(''), sourceHighlight = ref<FieldKey | null>(null)
const error = ref(''), checked = ref(false), notice = ref(''), relatedId = ref(''), returnToSummary = ref(false)
const intake = ref({ title: '', area: '', source: '人工录入', content: '' }), fileNote = ref(''), fileBusy = ref(false)
const active = computed(() => platform.clues.find(item => item.id === activeId.value) || null)
const draft = computed(() => platform.clueWorkspaces[activeId.value] || null)
const view = computed(() => route.query.view === 'work' ? 'work' : 'home')
const today = computed(() => `${localDate()} ${new Intl.DateTimeFormat('zh-CN', { weekday: 'long', timeZone: 'Asia/Shanghai' }).format(new Date())}`)
const relatedClues = computed(() => platform.clues.filter(item => draft.value?.relatedIds.includes(item.id)))
const related = computed(() => relatedClues.value.find(item => item.id === relatedId.value) || relatedClues.value[0] || null)
const matchedIds = computed(() => active.value ? contractIds(active.value.content) : [])
const contracts = computed(() => platform.contracts.filter(item => matchedIds.value.includes(item.id)))
const payments = computed(() => platform.payments.filter(item => matchedIds.value.includes(item.contractId)))
const blockers = computed(() => draft.value ? reviewBlockers(draft.value) : ['请选择一份材料'])
const cleanSaved = computed(() => Boolean(draft.value?.saved && !draft.value.dirty && !draft.value.summaryStale))
const allConfirmed = computed(() => Boolean(draft.value && fieldKeys.every(key => draft.value!.fields[key].status === 'confirmed')))
const allDecided = computed(() => Boolean(draft.value && draft.value.relatedIds.every(id => draft.value!.relations[id] && draft.value!.relations[id] !== 'pending')))
const returnLabel = computed(() => returnToSummary.value ? '返回待复核摘要' : view.value === 'home' ? '返回我的案头' : '返回材料审阅')
const nextRelatedId = computed(() => draft.value?.relatedIds.find(id => id !== related.value?.id && currentDecision(id) === 'pending'))
let searchTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(searchTimer))

function select(id: string) {
  if (!workspace.open(id)) return
  if (activeId.value === id) return
  activeId.value = id; editingField.value = null; editError.value = ''; sourceHighlight.value = null; checked.value = false
}
function navigate(nextView: 'home' | 'work', id = activeId.value) {
  if (id) select(id)
  return router.push({ path: '/clues', query: { ...(id ? { id } : {}), ...(nextView === 'work' ? { view: 'work' } : {}), ...(search.value ? { q: search.value } : {}) } })
}
watch(() => [route.query.id, route.query.panel, route.query.source, route.query.from, route.query.related, route.query.q] as const, ([id, requestedPanel, source, from, candidateRelated, query]) => {
  const candidate = String(id || platform.activeClueId || platform.clues[0]?.id || '')
  if (platform.clues.some(item => item.id === candidate)) select(candidate)
  else { if (id) notice.value = '未找到指定材料，已打开当前可用工作稿。'; select(platform.clues[0]?.id || '') }
  search.value = String(query || '')
  sourceKind.value = source === 'contract' || source === 'receipt' ? source : 'original'
  returnToSummary.value = from === 'summary'
  const allowed: Exclude<Panel, null>[] = ['intake', 'source', 'related', 'summary', 'history', 'help']
  const target = allowed.includes(requestedPanel as Exclude<Panel, null>) ? requestedPanel as Panel : null
  if (target === 'summary' && draft.value?.phase !== 'extracted') {
    panel.value = null; notice.value = '这份材料尚未完成提取，请先阅读并核对材料。'
    void router.replace({ path: '/clues', query: { id: activeId.value, view: 'work', ...(search.value ? { q: search.value } : {}) } })
    return
  }
  if (target === 'summary') workspace.prepareSummary(activeId.value)
  relatedId.value = draft.value?.relatedIds.includes(String(candidateRelated || '')) ? String(candidateRelated) : draft.value?.relatedIds[0] || ''
  panel.value = target
}, { immediate: true })
watch(() => platform.clues.map(item => item.id).join(','), () => {
  if (activeId.value && !platform.clues.some(item => item.id === activeId.value)) navigate('home', platform.clues[0]?.id || '')
})
watch(() => draft.value?.revision, () => { checked.value = false })
watch(panel, () => { error.value = ''; checked.value = false })

function show(next: Panel) {
  if (!next) { closePanel(); return }
  error.value = ''
  if (next === 'summary') {
    if (draft.value?.phase !== 'extracted') { notice.value = '请先阅读材料并完成辅助提取，再整理摘要。'; return }
    workspace.prepareSummary(activeId.value)
  }
  if (next === 'intake') { intake.value = { title: '', area: '', source: '人工录入', content: '' }; fileNote.value = '' }
  const fromSummary = next !== 'summary' && (panel.value === 'summary' || returnToSummary.value)
  void router.push({ path: '/clues', query: { ...route.query, id: activeId.value || undefined, panel: next, from: fromSummary ? 'summary' : undefined, source: next === 'source' ? sourceKind.value : undefined, related: next === 'related' ? draft.value?.relatedIds[0] : undefined } })
}
function closePanel() {
  const { panel: _panel, from: _from, source: _source, related: _related, ...query } = route.query
  void router.push({ path: '/clues', query })
}
function closeSecondary() { if (returnToSummary.value) show('summary'); else closePanel() }
function openSource(kind: 'original' | 'contract' | 'receipt') { sourceKind.value = kind; show('source') }
function updateSearch(value: string) {
  search.value = value; clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { void router.replace({ path: '/clues', query: { ...route.query, q: value || undefined } }) }, 180)
}
function chooseRelated(id: string) { relatedId.value = id; void router.replace({ path: '/clues', query: { ...route.query, related: id } }) }
function useSample() {
  const sample = platform.clues.find(item => item.id === 'XF-2026-0108')
  if (!sample) { error.value = '当前没有内置样例，请直接粘贴虚构材料。'; return }
  intake.value = { title: '关于村集体场地租金到账情况的反映（演示新件）', content: sample.content, area: sample.area, source: '样例录入' }
  fileNote.value = '已载入虚构样例；登记后会获得独立编号，原有材料保留。'
}
async function readTextFile(event: Event) {
  const input = event.target as HTMLInputElement, file = input.files?.[0]
  if (!file) return
  error.value = ''
  if (!/\.txt$/i.test(file.name)) { error.value = '本轮支持读取UTF-8 TXT原文；图片/PDF尚未接入OCR，请粘贴转写文本。'; input.value = ''; return }
  if (file.size > 2 * 1024 * 1024) { error.value = '请导入2MB以内的文本材料。'; input.value = ''; return }
  fileBusy.value = true
  try { intake.value.content = await file.text(); intake.value.source = 'TXT文本导入'; if (!intake.value.title) intake.value.title = file.name.replace(/\.txt$/i, ''); fileNote.value = '已读取此TXT的实际文本，原文不会上传外网。' }
  catch { error.value = '文本读取失败，请重新选择或直接粘贴。' }
  finally { fileBusy.value = false; input.value = '' }
}
function register() {
  const result = workspace.register(intake.value)
  if (result.error) { error.value = result.error; return }
  navigate('work', result.id!); notice.value = ''
}
async function extract() { const result = await workspace.analyze(activeId.value); if (result) notice.value = result }
function edit(key: FieldKey) { editingField.value = key; editValue.value = draft.value!.fields[key].value; editError.value = ''; sourceHighlight.value = key; notesOpen.value = true }
function saveField(key: FieldKey) { editError.value = workspace.editField(activeId.value, key, editValue.value) || ''; if (!editError.value) editingField.value = null }
function confirm(key: FieldKey) { const result = workspace.confirmField(activeId.value, key); if (result) { edit(key); editError.value = result } }
function locate(key: FieldKey) { notesOpen.value = true; sourceHighlight.value = key }
async function inspectField(key: FieldKey) { await navigate('work'); await nextTick(); notesOpen.value = true; sourceHighlight.value = key }
function decide(value: RelationDecision) { if (related.value) error.value = workspace.decideRelation(activeId.value, related.value.id, value) || '' }
function saveSummary() { error.value = workspace.saveSummary(activeId.value) || ''; checked.value = false }
function submit() { error.value = workspace.submit(activeId.value, checked.value) || '' }
async function checkFields() { navigate('work'); notesOpen.value = true; await nextTick() }
function currentDecision(id: string) { return draft.value?.relations[id] || 'pending' }
</script>

<template>
  <div class="clues-scene clues-app">
    <a href="#clues-main" class="cw-skip-link">跳到主要内容</a>
    <header class="cw-header"><div class="cw-header-left"><RouterLink class="cw-brand" to="/" title="返回监督总览">夏津县纪检监察</RouterLink><span class="cw-product">信访材料研判</span><nav class="cw-nav" aria-label="工作区域"><button :aria-current="view === 'home' ? 'page' : undefined" @click="navigate('home')">我的案头</button><button :aria-current="view === 'work' ? 'page' : undefined" @click="navigate('work')">材料审阅</button></nav></div><div class="cw-header-right"><time>{{ today }}</time><RouterLink to="/" class="cw-return">返回监督总览</RouterLink><button class="cw-user-trigger" @click="show('help')"><UserRound :size="19"/><span>演示专员</span><CircleHelp :size="16"/></button></div></header>
    <div v-if="notice || platform.persistenceError" class="cw-notice" role="status"><Info :size="18"/><span>{{ platform.persistenceError || notice }}</span><button v-if="!platform.persistenceError" aria-label="关闭提示" @click="notice = ''"><X :size="17"/></button></div>
    <div id="clues-main" tabindex="-1">
      <ClueDesk v-if="view === 'home'" :clues="platform.clues" :active="active" :draft="draft" :search="search" @start="show('intake')" @open="id => navigate('work', id)" @source="openSource" @summary="show('summary')" @related="show('related')" @search="updateSearch" @inspect="inspectField"/>
      <ClueReader v-else-if="active && draft" :key="active.id" :clue="active" :draft="draft" :notes-open="notesOpen" :editing-field="editingField" :edit-value="editValue" :edit-error="editError" :source-highlight="sourceHighlight" @home="navigate('home')" @extract="extract" @toggle-notes="notesOpen = !notesOpen" @edit="edit" @save-field="saveField" @cancel-field="editingField = null" @confirm-field="confirm" @locate="locate" @source="openSource" @related="show('related')" @summary="show('summary')" @update:edit-value="editValue = $event"/>
      <main v-else class="cw-no-material"><FileText :size="34"/><h1>先整理一份新材料</h1><p>材料原文会保留在案头，提取结果由您逐项核对。</p><button class="cw-button cw-button-primary" @click="show('intake')">整理新材料</button></main>
    </div>

    <WorkspaceDialog v-if="panel === 'intake'" title="从一份来件开始" eyebrow="新材料 · 虚构演示" subtitle="粘贴文本或导入TXT，保留原件后开始阅读。" @close="closePanel">
      <p v-if="error" class="cw-dialog-error" role="alert">{{ error }}</p>
      <div class="cw-intake-meta"><label class="cw-form-label">材料标题<input v-model="intake.title" placeholder="简要说明这份材料反映什么" maxlength="120"></label><label class="cw-form-label">涉及地域<input v-model="intake.area" placeholder="地域待核对"></label><label class="cw-form-label">登记来源<select v-model="intake.source"><option>人工录入</option><option>来信登记</option><option>网络转办</option><option>样例录入</option><option>TXT文本导入</option></select></label></div>
      <label for="cw-intake-text" class="cw-form-label">举报材料原文 <span>所有材料仅用于本地虚构演示</span></label><textarea id="cw-intake-text" v-model="intake.content" class="intake-textarea" placeholder="粘贴一份虚构举报材料，或载入样例体验。" spellcheck="false"></textarea>
      <div class="intake-sample-row"><div class="cw-inline-actions"><button class="cw-button" @click="useSample"><FileText :size="17"/>载入虚构样例</button><label class="cw-button cw-file-label"><FilePlus2 :size="17"/>{{ fileBusy ? '读取中…' : '导入TXT' }}<input type="file" accept=".txt,text/plain" :disabled="fileBusy" @change="readTextFile"></label></div><p>直接读取原文，不自动作出受理决定。</p></div><p v-if="fileNote" class="cw-file-note" role="status">{{ fileNote }}</p>
      <template #footer><p class="cw-dialog-footer-note">登记会创建新的独立线索；原有材料与摘要保留。</p><div class="cw-dialog-actions"><button class="cw-button cw-button-quiet" @click="closePanel">取消</button><button class="cw-button cw-button-primary" :disabled="fileBusy || intake.title.trim().length < 2 || intake.content.trim().length < 10" @click="register">登记并开始阅读 <ArrowRight :size="17"/></button></div></template>
    </WorkspaceDialog>

    <WorkspaceDialog v-if="panel === 'source' && active" :title="sourceKind === 'original' ? '原始举报材料' : sourceKind === 'contract' ? '关联的合同材料' : '关联的收款台账'" :eyebrow="sourceKind === 'original' ? '原件陈述 · 全文保留' : '系统检索 · 本地虚构演示记录'" @close="closeSecondary">
      <div v-if="sourceKind === 'original'" class="source-prose"><div class="source-meta"><span>{{ active.id }}</span><span>{{ active.date }} · {{ active.source }}</span></div><p>{{ active.content }}</p></div>
      <template v-else-if="sourceKind === 'contract'"><article v-for="contract in contracts" :key="contract.id" class="source-prose source-transcript"><div class="source-meta"><span>{{ contract.id }}</span><span>{{ contract.asset }} · {{ contract.area }}</span></div><h3>{{ contract.tenant }}</h3><p>{{ contract.clause || '合同条款未录入，需补充原件。' }}</p><p>合同期限：{{ contract.start }} — {{ contract.end }}<br>台账年度应收：{{ contract.receivable.toLocaleString() }}元<br>付款节点：{{ contract.paymentNode || '未记录，需补正' }}</p></article><p v-if="!contracts.length" class="cw-empty-evidence">未检索到与本材料合同编号对应的台账。请补充合同原件，不套用其他样例记录。</p></template>
      <template v-else><article v-for="payment in payments" :key="payment.id" class="source-prose source-transcript"><div class="source-meta"><span>{{ payment.id }}</span><span>关联 {{ payment.contractId }}</span></div><p>台账日期：{{ payment.date }}<br>记录金额：{{ payment.amount.toLocaleString() }}元<br>凭证标记：{{ payment.voucher }}</p></article><p v-if="!payments.length" class="cw-empty-evidence">当前没有可关联的收款记录；未检索到不等于款项未到账。</p></template>
      <p class="source-boundary">原件陈述与检索记录分别保留。单条记录、金额差额或未关联凭证均不能直接证明欠缴、违纪或违法。</p>
      <template #footer><p class="cw-dialog-footer-note">依据来自现有演示台账，可与举报原文对照。</p><button class="cw-button cw-button-primary" @click="closeSecondary">{{ returnLabel }} <ArrowRight :size="17"/></button></template>
    </WorkspaceDialog>

    <WorkspaceDialog v-if="panel === 'related' && active && draft" title="对照材料，再判断是否关联" eyebrow="相似检索 · 辅助提示" subtitle="依据相同合同编号检索，不按举报频次定性，不自动合并原件。" wide @close="closeSecondary">
      <p v-if="error" class="cw-dialog-error" role="alert">{{ error }}</p>
      <template v-if="related"><nav class="cw-related-tabs" aria-label="选择相似材料"><button v-for="item in relatedClues" :key="item.id" :aria-pressed="related.id === item.id" @click="chooseRelated(item.id)">{{ item.id }}<span>{{ relationLabels[currentDecision(item.id)] }}</span></button></nav><div class="comparison-docs"><article class="comparison-document"><header class="comparison-document-header"><span class="source-origin"><FileText :size="15"/>当前原件陈述</span><h3>{{ active.title }}</h3><p class="comparison-id">{{ active.id }} · {{ active.date }} · {{ active.source }}</p></header><MarkedMaterial class="comparison-copy cw-original-copy" :text="active.content" :terms="matchedIds" whole-tokens/></article><article class="comparison-document"><header class="comparison-document-header"><span class="source-origin"><Search :size="15"/>检索到的原件</span><h3>{{ related.title }}</h3><p class="comparison-id">{{ related.id }} · {{ related.date }} · {{ related.source }}</p></header><MarkedMaterial class="comparison-copy cw-original-copy" :text="related.content" :terms="matchedIds" whole-tokens/></article></div><section class="comparison-basis"><h3>为什么提示相似</h3><dl><dt>编号一致</dt><dd>{{ matchedIds.filter(id => contractIds(related!.content).includes(id)).join('、') }}</dd><dt>原文比对</dt><dd>两份原件全文保留。金额、时间、主体和诉求是否一致，请逐项阅读核对。</dd><dt>仍待判断</dt><dd>相同合同编号不表示重复举报已经成立，也不证明反映事项已查实。</dd></dl></section><section class="comparison-decision"><h3>这两份材料，本次如何处理</h3><div class="decision-options"><button v-for="option in [{ value: 'linked', text: '人工关联' }, { value: 'separate', text: '暂不关联' }, { value: 'deferred', text: '标记待核' }]" :key="option.value" class="decision-option" :aria-pressed="currentDecision(related.id) === option.value" @click="decide(option.value as RelationDecision)"><CircleCheck v-if="currentDecision(related.id) === option.value" :size="17"/><Link2 v-else :size="16"/>{{ option.text }}</button></div><p class="decision-explanation" role="status">当前决定：{{ relationLabels[currentDecision(related.id)] }}。决定记入工作稿，原件分别保留。</p></section></template>
      <div v-else class="cw-empty-evidence"><Search :size="30"/><h3>{{ draft.phase === 'extracted' ? '本次未找到相同合同编号的其他材料' : '先完成辅助提取，再检索关联材料' }}</h3><p>未找到匹配不等于排除相关举报。您仍可核对原文，补充材料信息。</p></div>
      <template #footer><p class="cw-dialog-footer-note">{{ draft.relatedIds.filter(id => currentDecision(id) !== 'pending').length }} / {{ draft.relatedIds.length }} 份相似材料已作关联判断。保存摘要时一并收纳。</p><div class="cw-dialog-actions"><button v-if="nextRelatedId" class="cw-button cw-button-primary" @click="chooseRelated(nextRelatedId)">判断下一份材料 <ArrowRight :size="17"/></button><button class="cw-button" :class="{ 'cw-button-primary': !nextRelatedId }" @click="closeSecondary">{{ returnLabel }} <ArrowRight :size="17"/></button></div></template>
    </WorkspaceDialog>

    <WorkspaceDialog v-if="panel === 'summary' && active && draft" :title="draft.submittedAt ? '摘要已提交人工复核' : '待复核摘要'" :eyebrow="`${active.id} · 整理结果`" subtitle="先保存本次整理，再由您检查是否提交；不生成正式核查任务。" wide @close="closePanel">
      <p v-if="error" class="cw-dialog-error" role="alert">{{ error }}</p><section v-if="draft.submittedAt" class="summary-submitted" role="status"><h3><CircleCheck :size="20"/> 人工检查已完成，已提交复核</h3><p>演示专员 · {{ draft.submittedAt }}<br>当前等待复核人处理，材料反映事项仍待核实。</p></section>
      <div class="summary-layout"><section class="summary-main"><div class="summary-field-list"><div v-for="key in fieldKeys" :key="key" class="summary-field"><span>{{ draft.fields[key].label }}<span :class="draft.fields[key].status === 'confirmed' ? 'confirmed' : 'pending'"><Check v-if="draft.fields[key].status === 'confirmed'" :size="14"/><Info v-else :size="14"/>{{ draft.fields[key].status === 'confirmed' ? '人工已确认提取' : 'AI提取 · 待确认' }}</span></span><strong>{{ draft.fields[key].value || '未载明，待补正' }}</strong></div></div>
        <div v-if="draft.summaryStale" class="summary-stale-warning" role="status"><Info :size="18"/><div><strong>基础信息已更新，摘要仍是之前的版本。</strong><p>请核对并修订摘要，或按当前信息重整；旧稿保留供回看。</p><button class="cw-text-button" @click="workspace.refreshSummary(activeId)">按当前核对信息重整摘要 <ArrowRight :size="15"/></button></div></div>
        <label class="cw-form-label" for="cw-summary-text">本次整理摘要 <span>工作稿 · 可修改</span></label><textarea id="cw-summary-text" class="summary-textarea" :value="draft.summary" spellcheck="false" @input="workspace.setSummary(activeId, ($event.target as HTMLTextAreaElement).value)"></textarea><p class="summary-caption">确认的是整理文字，反映事项仍待核实。变更后须重新保存与人工检查。</p><button v-if="!draft.summaryStale" class="cw-text-button" @click="workspace.refreshSummary(activeId)"><RotateCcw :size="15"/>按当前核对信息重整摘要</button>
        <details v-if="draft.saved && draft.dirty" class="summary-saved-view"><summary>查看上次保存稿 · {{ draft.saved.savedAt }}</summary><p>{{ draft.saved.summary }}</p></details>
      </section><aside class="summary-review"><h3>提交前，检查这几项</h3><ul class="review-list"><li :class="{ 'is-done': allConfirmed }"><CircleCheck v-if="allConfirmed" :size="17"/><Info v-else :size="17"/><span>{{ fieldKeys.filter(key => draft!.fields[key].status === 'confirmed').length }} / 4 项提取内容已确认<br><button @click="checkFields">返回原文检查与修正</button></span></li><li :class="{ 'is-done': allDecided }"><CircleCheck v-if="allDecided" :size="17"/><Info v-else :size="17"/><span>{{ draft.relatedIds.length ? (allDecided ? '相似材料关联判断已完成' : '仍有相似材料待判断') : '本次没有相同编号的检索提示' }}<br><button @click="show('related')">查看原件与关联依据</button></span></li><li :class="{ 'is-done': cleanSaved }"><CircleCheck v-if="cleanSaved" :size="17"/><Info v-else :size="17"/><span>{{ cleanSaved ? '本次摘要与核对记录已保存' : '当前整理尚未保存' }}</span></li></ul>
        <label class="review-check" :class="{ 'is-disabled': blockers.length || draft.submittedAt }"><input v-model="checked" type="checkbox" :disabled="Boolean(blockers.length || draft.submittedAt)"><span>我已阅读摘要、核对来源与关联记录，同意提交人工复核。</span></label><p class="summary-caption">{{ draft.submittedAt ? '等待复核人处理。再次修订会撤回本次提交，需要重新检查。' : blockers.length ? blockers.join('；') : checked ? '已完成人工检查，可由您提交。' : '请完成最后一次人工检查。' }}</p>
        <div v-if="draft.saved" class="summary-saved-receipt" :class="{ 'is-stale': draft.dirty }"><h4><CircleCheck :size="17"/>{{ draft.dirty ? '保留了上次保存稿' : '已保存，可回案头继续' }}</h4><p>{{ draft.saved.savedAt }}<br>保存人：{{ draft.saved.confirmedBy }}</p><button class="cw-text-button" @click="show('history')">查看整理记录 <ArrowRight :size="14"/></button></div>
      </aside></div>
      <template #footer><p class="cw-dialog-footer-note">保存只收纳工作稿。AI不作定性，也不决定受理或处置。</p><div class="cw-dialog-actions"><button class="cw-button cw-button-quiet" @click="closePanel">继续整理</button><button class="cw-button" :class="{ 'cw-button-primary': !cleanSaved }" :disabled="cleanSaved || draft.summaryStale || !draft.summary.trim()" @click="saveSummary"><Save :size="17"/>{{ cleanSaved ? '摘要已保存' : '保存摘要' }}</button><button class="cw-button" :class="{ 'cw-button-primary': cleanSaved }" :disabled="Boolean(blockers.length || !checked || draft.submittedAt)" @click="submit"><Check :size="17"/>{{ draft.submittedAt ? '已提交复核' : '提交人工复核' }}</button></div></template>
    </WorkspaceDialog>

    <WorkspaceDialog v-if="panel === 'history' && draft" title="本次整理留下了什么" :eyebrow="`${activeId} · 本地操作记录`" @close="closeSecondary"><ol v-if="draft.events.length" class="events-list"><li v-for="event in [...draft.events].reverse()" :key="event.id"><time>{{ event.time }}</time><span><strong>{{ event.action }}</strong><br>{{ event.detail }}</span></li></ol><div v-else class="cw-empty-evidence">尚无本次整理记录。提取、修订、关联与保存后会自动留痕。</div><template #footer><p class="cw-dialog-footer-note">记录同步到原平台操作留痕，保留来源编号。</p><button class="cw-button cw-button-primary" @click="closeSecondary">返回{{ returnToSummary ? '摘要' : '工作稿' }}</button></template></WorkspaceDialog>
    <WorkspaceDialog v-if="panel === 'help'" title="从案头进入，围绕材料完成整理" eyebrow="信访举报与线索研判 · 本地演示" @close="closePanel"><div class="help-copy"><p><strong>我的案头</strong>接续当前工作稿，也可查找收到的其他来件；<strong>材料审阅</strong>保留原文，按需展开批注。</p><p>载入样例或粘贴虚构材料后，可逐项核对、修正提取结果。示例中的“禾川”会故意模拟误提取为“禾田”，用于演示人工纠错。</p><p>所有提取与检索使用本地规则，没有真实OCR、外部数据接口或大模型。TXT读取实际文件内容，原文保持不变。</p><p>摘要保存、人工检查与提交复核彼此独立。提交后等待复核人，不自动创建核查任务。</p></div><div class="help-links"><RouterLink to="/">返回监督总览</RouterLink><RouterLink to="/clues/archive">打开原线索工作台</RouterLink><button class="cw-text-button" @click="show('history')"><Clock3 :size="16"/>查看本件整理记录</button></div><template #footer><p class="cw-dialog-footer-note">所有人名、单位与事项均为虚构演示。</p><button class="cw-button cw-button-primary" @click="closePanel">继续工作</button></template></WorkspaceDialog>
  </div>
</template>
