<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Bookmark, Check, FileText, Folder, Layers, Pause, Plus, Search, X } from 'lucide-vue-next'
import type { Clue } from '../../types'
import type { ClueWorkspace, FieldKey, WorkspaceField } from '../../types/clue-workspace'
import './desk.css'

const props = defineProps<{
  clues: Clue[]
  active: Clue | null
  draft: ClueWorkspace | null
  search: string
}>()

const emit = defineEmits<{
  start: []
  open: [id: string]
  source: [kind: 'original' | 'contract' | 'receipt']
  summary: []
  related: []
  inspect: [field: FieldKey]
  search: [value: string]
}>()

const extracted = computed(() => props.draft?.phase === 'extracted')
const analyzing = computed(() => props.draft?.phase === 'analyzing')
const fields = computed(() => props.draft ? Object.entries(props.draft.fields) as [FieldKey, WorkspaceField][] : [])
const pendingFields = computed(() => fields.value.filter(([, field]) => field.status !== 'confirmed'))
const relatedTotal = computed(() => props.draft?.relatedIds.length ?? 0)
const decidedRelated = computed(() => props.draft?.relatedIds.filter(id => {
  const decision = props.draft?.relations[id]
  return decision && decision !== 'pending'
}).length ?? 0)
const allConfirmed = computed(() => extracted.value && fields.value.length > 0 && fields.value.every(([, field]) => field.status === 'confirmed'))
const saved = computed(() => props.draft?.saved ?? null)
const cleanSaved = computed(() => Boolean(saved.value && !props.draft?.dirty && !props.draft?.summaryStale))
const pause = computed(() => {
  if (!props.active) return '选择一份来件，或开始整理新材料'
  if (props.draft?.submittedAt && cleanSaved.value) return '人工检查已完成，摘要已提交复核'
  if (props.draft?.summaryStale) return '基础信息已更新，摘要待重新整理'
  if (saved.value && props.draft?.dirty) return '工作稿已有修改，尚未重新保存'
  if (cleanSaved.value) return '待复核摘要已保存，可重新打开'
  if (analyzing.value) return '正在辅助整理材料内容'
  if (!extracted.value) return '原件已保留，等待辅助提取'
  if (allConfirmed.value && decidedRelated.value < relatedTotal.value) return '字段已核对，相似材料待决定'
  if (allConfirmed.value && !props.draft?.summary) return '材料已核对，待整理摘要'
  if (allConfirmed.value) return '材料已核对，待保存摘要'
  const pending = fields.value.find(([, field]) => field.status !== 'confirmed')
  return pending ? `${pending[1].label}待核对` : '继续检查本次整理信息'
})
const previewLabel = computed(() => {
  if (cleanSaved.value) return '已保存的待复核摘要'
  if (!extracted.value) return analyzing.value ? '原件片段 · 正在辅助整理' : '原件片段 · 尚未辅助提取'
  if (props.draft?.summaryStale) return '摘要待同步 · 基础信息已更新'
  if (!props.draft?.summary) return '原文片段 · 下方为提取结果'
  return allConfirmed.value ? '人工已核对的整理笔记' : 'AI整理 · 待人工核对'
})
const preview = computed(() => {
  if (cleanSaved.value) return saved.value?.summary ?? ''
  if (extracted.value && props.draft?.summary) return props.draft.summary
  const paragraphs = props.active?.content.split(/\n\s*\n/).filter(part => part.trim()) || []
  return paragraphs.find(part => !/^(?:【|反映人[：:]|涉及单位[：:]|涉及人员[：:])/.test(part.trim())) || props.active?.content || ''
})
const currentStatus = computed(() => {
  if (cleanSaved.value) return props.draft?.submittedAt ? '已提交复核' : '已保存待复核'
  if (saved.value && props.draft?.dirty) return '有未保存修改'
  return analyzing.value ? '整理中' : '当前工作稿'
})
const continueLabel = computed(() => cleanSaved.value ? '打开已保存摘要' : analyzing.value ? '查看材料整理进度' : extracted.value ? '继续核对材料' : '开始研判这份材料')
const progress = computed(() => {
  if (!props.active) return ''
  if (analyzing.value) return '正在辅助整理材料。完成后，请逐项对照原件核对。'
  if (!extracted.value) return '下一步：开始研判，辅助提取材料信息，再由您逐项核对。'
  const checked = fields.value.length - pendingFields.value.length
  const counts = `字段已核对 ${checked}/${fields.value.length} 项，相似材料已决定 ${decidedRelated.value}/${relatedTotal.value} 份。`
  if (cleanSaved.value) return `${counts}${props.draft?.submittedAt ? '摘要已提交复核，可打开查看。' : '下一步：打开已保存摘要，完成检查后提交复核。'}`
  if (pendingFields.value.length) return `${counts}下一步：核对${pendingFields.value[0]?.[1].label}。`
  if (decidedRelated.value < relatedTotal.value) return `${counts}下一步：对照相似材料，逐份作出关联决定。`
  if (props.draft?.summaryStale || !props.draft?.summary) return `${counts}下一步：整理待复核摘要。`
  return `${counts}下一步：检查并保存待复核摘要。`
})
const incoming = computed(() => {
  const keyword = props.search.trim().toLowerCase()
  return props.clues.filter(clue => clue.id !== props.active?.id && (!keyword || `${clue.id} ${clue.title} ${clue.area} ${clue.source} ${clue.content}`.toLowerCase().includes(keyword)))
})
const hasContract = computed(() => Boolean(props.active && /合同|租赁|承租|租金/.test(props.active.content)))
const hasReceipt = computed(() => Boolean(props.active && /收款|到账|流水|付款|支付/.test(props.active.content)))
const summaryHint = computed(() => !saved.value ? '尚未保存' : props.draft?.dirty || props.draft?.summaryStale ? '已保存稿 · 当前有修改' : props.draft?.submittedAt ? '已提交人工复核' : '已保存，可重新打开')

function continueWork() {
  if (cleanSaved.value) emit('summary')
  else if (props.active) emit('open', props.active.id)
}

function updateSearch(event: Event) {
  emit('search', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <section class="desk-view" aria-label="我的案头">
    <header class="desk-heading">
      <div class="desk-heading-copy">
        <h1>我的案头</h1>
        <p>先继续未完成的整理，再处理新收到的材料。</p>
      </div>
      <button type="button" class="desk-button desk-primary desk-new-button" @click="emit('start')"><Plus :size="19" aria-hidden="true" /><span>整理新材料</span></button>
    </header>

    <div class="desk-layout">
      <section class="desk-active-workbook" aria-label="当前工作稿与续办位置">
        <nav class="desk-document-tabs" aria-label="当前材料书签">
          <button type="button" class="desk-document-tab desk-document-tab-active" :disabled="!active" :aria-label="active ? `继续工作稿 ${active.id}` : '当前没有工作稿'" @click="active && emit('open', active.id)"><Bookmark :size="17" aria-hidden="true" /><span>{{ active?.id || '当前工作稿' }}</span><span v-if="active" class="desk-tab-note">当前工作稿</span></button>
          <button type="button" class="desk-document-tab" :disabled="!active" @click="emit('source', 'original')">原件留存</button>
          <button type="button" class="desk-document-tab" :disabled="!active" @click="emit('related')">相似材料对照</button>
        </nav>

        <article v-if="active" class="desk-workbook-page">
          <header class="desk-workbook-heading">
            <h2>{{ active.title }}</h2>
            <span class="desk-draft-state" :class="{ 'desk-confirmed-text': cleanSaved }">{{ currentStatus }}</span>
          </header>
          <p class="desk-material-meta"><span class="desk-workbook-id">工作稿编号：{{ active.id }}</span><span>{{ active.area }}</span><span>{{ active.source }}</span><time>{{ active.date }}</time></p>
          <div class="desk-resume-position"><Layers v-if="analyzing" :size="18" aria-hidden="true" /><Check v-else-if="allConfirmed" :size="18" aria-hidden="true" /><Pause v-else :size="18" aria-hidden="true" /><span>当前进度</span><strong>{{ pause }}</strong></div>
          <p class="desk-progress-note" aria-live="polite">{{ progress }}</p>

          <div class="desk-preview-heading"><span class="desk-preview-label" :class="{ 'desk-confirmed-text': allConfirmed }">{{ previewLabel }}</span><span v-if="saved" class="desk-saved-time">保存于 {{ saved.savedAt }}</span></div>
          <div class="desk-draft-preview"><p>{{ preview }}</p></div>

          <dl v-if="extracted" class="desk-fact-rows">
            <div v-for="[key, field] in fields" :key="key" class="desk-fact-row">
              <dt>{{ field.label }}</dt>
              <dd><span class="desk-field-value" :title="field.value">{{ field.value || '尚未提取到明确内容' }}</span><span class="desk-provenance" :class="{ 'desk-provenance-human': field.status === 'confirmed' }">{{ field.status === 'confirmed' ? '人工已核对' : field.lowConfidence ? 'AI建议 · 重点核对' : 'AI建议 · 待核对' }}</span><button type="button" class="desk-inspect-button" :class="{ 'desk-inspect-confirmed': field.status === 'confirmed' }" :aria-label="`${field.label}：${field.status === 'confirmed' ? '已确认，可查看来源' : '核对字段与来源'}`" @click="emit('inspect', key)">{{ field.status === 'confirmed' ? '已确认，可查看' : '核对' }}<ArrowRight :size="15" aria-hidden="true" /></button></dd>
            </div>
          </dl>
          <div v-else class="desk-unextracted-note"><FileText :size="18" aria-hidden="true" /><p>{{ analyzing ? '辅助整理正在进行。原件完整保留，整理完成后可逐项核对。' : '还没有生成整理信息。进入材料审阅后，可辅助提取并逐项核对。' }}</p></div>

          <div class="desk-boundary-note"><FileText :size="17" aria-hidden="true" /><p>AI整理仅供辅助，请对照来源人工核对。</p></div>
          <footer class="desk-workbook-footer"><span>{{ cleanSaved ? '保存后仍可修改，是否提交复核由您决定。' : '先对照原件核对，再确认本次整理信息。' }}</span><button type="button" class="desk-button desk-primary desk-resume-button" @click="continueWork"><span>{{ continueLabel }}</span><ArrowRight :size="20" aria-hidden="true" /></button></footer>
        </article>
        <article v-else class="desk-workbook-page desk-empty-workbook">
          <div class="desk-empty-symbol"><Bookmark :size="30" aria-hidden="true" /></div><h2>从一份材料开始整理</h2><p>收到的来件可以直接打开；新材料录入后，原文与工作笔记会保留在案头。</p><button type="button" class="desk-button desk-primary" @click="emit('start')"><Plus :size="18" aria-hidden="true" />整理新材料</button>
        </article>
      </section>

      <aside class="desk-support" aria-label="收到的来件与收纳位置">
        <section class="desk-incoming">
          <header class="desk-support-heading"><h2>收到的来件</h2><span>{{ incoming.length }} 份</span></header>
          <label class="desk-clue-search"><Search :size="17" aria-hidden="true" /><input :value="search" type="search" placeholder="搜索编号、材料或地区" aria-label="搜索收到的来件" @input="updateSearch" /><button v-if="search" type="button" aria-label="清空来件搜索" @click="emit('search', '')"><X :size="16" aria-hidden="true" /></button></label>
          <div v-if="incoming.length" class="desk-incoming-list">
            <button v-for="clue in incoming" :key="clue.id" type="button" class="desk-incoming-choice" :aria-label="`打开来件 ${clue.id} ${clue.title}`" @click="emit('open', clue.id)">
              <span class="desk-incoming-id"><FileText :size="17" aria-hidden="true" /><span>{{ clue.id }}</span><ArrowRight :size="16" aria-hidden="true" /></span>
              <strong>{{ clue.title }}</strong><span class="desk-incoming-status">{{ clue.status }}</span><span class="desk-incoming-meta">{{ clue.area }} · {{ clue.source }} · {{ clue.date }}</span>
            </button>
          </div>
          <p v-else class="desk-no-incoming">{{ search ? '没有找到匹配的来件，可调整关键词。' : '其他来件会显示在这里，也可以整理一份新材料。' }}</p>
        </section>

        <section class="desk-storage"><h2>收纳位置</h2><div class="desk-storage-items">
          <button type="button" class="desk-storage-item" :disabled="!active" @click="emit('source', 'original')"><Folder :size="20" aria-hidden="true" /><span><b>原件留存</b><span>{{ active ? '原文完整保留' : '选择材料后查看' }}</span></span><ArrowRight :size="16" aria-hidden="true" /></button>
          <button type="button" class="desk-storage-item" :disabled="!active" @click="active && emit('open', active.id)"><Layers :size="20" aria-hidden="true" /><span><b>工作笔记</b><span>{{ extracted ? '提取与人工核对过程' : '等待整理与核对' }}</span></span><ArrowRight :size="16" aria-hidden="true" /></button>
          <button type="button" class="desk-storage-item" :class="{ 'desk-storage-unavailable': !saved }" :disabled="!saved" @click="emit('summary')"><FileText :size="20" aria-hidden="true" /><span><b>待复核摘要</b><span>{{ summaryHint }}</span></span><ArrowRight v-if="saved" :size="16" aria-hidden="true" /></button>
        </div></section>
      </aside>
    </div>

    <section v-if="active" class="desk-retained-sources" aria-label="可回看的来源"><h2>可回看的来源</h2><button type="button" @click="emit('source', 'original')"><FileText :size="18" aria-hidden="true" /><span>原始来件 · {{ active.id }}</span></button><button v-if="hasContract" type="button" @click="emit('source', 'contract')"><Folder :size="18" aria-hidden="true" /><span>查看合同相关来源</span></button><button v-if="hasReceipt" type="button" @click="emit('source', 'receipt')"><Layers :size="18" aria-hidden="true" /><span>查看收款相关来源</span></button></section>
    <p class="desk-demo-boundary">虚构演示材料 · AI辅助整理 · 结论由人工复核</p>
  </section>
</template>
