<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowLeft, Check, ChevronDown, FileText, Info, Link2, LoaderCircle, Search, SquarePen, X } from 'lucide-vue-next'
import type { Clue } from '../../types'
import type { ClueWorkspace, FieldKey } from '../../types/clue-workspace'
import './reader.css'

const props = defineProps<{
  clue: Clue
  draft: ClueWorkspace
  notesOpen: boolean
  editingField: FieldKey | null
  editValue: string
  editError: string
  sourceHighlight: FieldKey | null
}>()
const emit = defineEmits<{
  home: []
  extract: []
  toggleNotes: []
  edit: [field: FieldKey]
  saveField: [field: FieldKey]
  cancelField: []
  confirmField: [field: FieldKey]
  locate: [field: FieldKey]
  source: [kind: 'original' | 'contract' | 'receipt']
  related: []
  summary: []
  'update:editValue': [value: string]
}>()

const fieldKeys: FieldKey[] = ['tenant', 'event', 'deadline', 'amount']
const root = ref<HTMLElement>()
const notesScroll = ref<HTMLElement>()
const extracted = computed(() => props.draft.phase === 'extracted')
const analyzing = computed(() => props.draft.phase === 'analyzing')
const fieldItems = computed(() => fieldKeys.map((key, index) => ({ key, number: index + 1, field: props.draft.fields[key] })))
const confirmed = computed(() => fieldItems.value.filter(item => item.field.status === 'confirmed').length)
// 提取完成的一次性揭示编排：仅在 analyzing → extracted 时播放，重新打开已提取材料不重复播放。
const revealing = ref(false)
let revealTimer: ReturnType<typeof setTimeout> | undefined
watch(() => props.draft.phase, (phase, previous) => {
  if (phase !== 'extracted' || previous !== 'analyzing' || reducedMotion()) return
  revealing.value = true
  clearTimeout(revealTimer)
  revealTimer = setTimeout(() => { revealing.value = false }, 2000)
})
onBeforeUnmount(() => clearTimeout(revealTimer))
const nextUnconfirmed = computed(() => fieldKeys.find(key => props.draft.fields[key].status !== 'confirmed'))

// Source offsets are exclusive at the end. Rendering always preserves every original character.
// Invalid or overlapping ranges remain ordinary source text rather than inventing an anchor.
const sourceRanges = computed(() => {
  const contentLength = props.clue.content.length
  const candidates = fieldItems.value.map(item => ({
    key: item.key, number: item.number, start: item.field.sourceStart, end: item.field.sourceEnd,
  })).filter(item => Number.isInteger(item.start) && Number.isInteger(item.end) && item.start >= 0 && item.end > item.start && item.end <= contentLength)
    .sort((a, b) => a.start - b.start || a.end - b.end)
  const ranges: typeof candidates = []
  let end = 0
  for (const candidate of candidates) {
    if (candidate.start < end) continue
    ranges.push(candidate)
    end = candidate.end
  }
  return ranges
})
const segments = computed(() => {
  const result: { text: string; key: FieldKey | null; number?: number; start: number }[] = []
  let cursor = 0
  for (const range of sourceRanges.value) {
    if (range.start > cursor) result.push({ text: props.clue.content.slice(cursor, range.start), key: null, start: cursor })
    result.push({ text: props.clue.content.slice(range.start, range.end), key: range.key, number: range.number, start: range.start })
    cursor = range.end
  }
  if (cursor < props.clue.content.length) result.push({ text: props.clue.content.slice(cursor), key: null, start: cursor })
  return result
})
const hasSource = (key: FieldKey) => sourceRanges.value.some(range => range.key === key)
const isSaved = computed(() => Boolean(props.draft.saved && !props.draft.dirty && !props.draft.summaryStale))
const primaryLabel = computed(() => analyzing.value ? '正在辅助提取…'
  : extracted.value ? isSaved.value ? '查看已保存摘要' : '整理并保存摘要'
    : '开始辅助提取')
const status = computed(() => props.draft.submittedAt ? '已提交人工复核'
  : props.draft.summaryStale ? '基础信息已更新 · 摘要待重整'
    : props.draft.dirty ? '有未保存修改'
      : props.draft.saved ? '摘要已保存 · 待复核'
        : extracted.value ? `${confirmed.value} / 4 项提取内容已确认`
          : analyzing.value ? '正在模拟辅助提取' : '原始材料已就绪')

function reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches }
function revealInNotes(target: HTMLElement) {
  const container = notesScroll.value
  if (!container || getComputedStyle(container).overflowY === 'visible') return
  const viewport = container.getBoundingClientRect()
  const box = target.getBoundingClientRect()
  if (box.bottom > viewport.bottom - 12) container.scrollTop += box.bottom - viewport.bottom + 12
  if (box.top < viewport.top + 12) container.scrollTop -= viewport.top + 12 - box.top
}
function revealNote(key: FieldKey) {
  const note = root.value?.querySelector<HTMLElement>(`#reader-note-${key}`)
  const container = notesScroll.value
  if (note && container && getComputedStyle(container).overflowY !== 'visible') {
    container.scrollTop += note.getBoundingClientRect().top - container.getBoundingClientRect().top - 10
  }
}
async function revealEditor() {
  await nextTick()
  if (!props.editingField || !props.notesOpen) return
  const input = root.value?.querySelector<HTMLInputElement>('#field-edit-input')
  const editor = input?.closest<HTMLElement>('.reader-field-editor')
  if (!input || !editor) return
  revealInNotes(editor)
  input.focus({ preventScroll: true })
}
async function focusField(key: FieldKey) {
  await nextTick()
  const button = root.value?.querySelector<HTMLButtonElement>(`#reader-edit-${key}`)
  if (button) { revealInNotes(button); button.focus({ preventScroll: true }) }
}
watch(() => props.editingField, (key, previous) => {
  if (key) void revealEditor()
  else if (previous) void focusField(previous)
})
watch(() => props.editError, () => { if (props.editingField) void revealEditor() })
watch(() => [props.sourceHighlight, props.notesOpen] as const, async ([key, open]) => {
  if (!key || !open) return
  await nextTick()
  if (props.editingField) { void revealEditor(); return }
  revealNote(key)
  const source = root.value?.querySelector<HTMLButtonElement>(`#source-${key}`)
  if (source) {
    source.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'instant' : 'smooth' })
    source.focus({ preventScroll: true })
  }
})
async function requestLocate(key: FieldKey) {
  emit('locate', key)
  // Repeated clicks on the same source still return the source to view.
  await nextTick()
  revealNote(key)
  const source = root.value?.querySelector<HTMLButtonElement>(`#source-${key}`)
  source?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'instant' : 'smooth' })
  source?.focus({ preventScroll: true })
}
async function confirmField(key: FieldKey) {
  emit('confirmField', key)
  await nextTick()
  if (props.editingField !== key) void focusField(key)
}
function primaryAction() {
  if (analyzing.value) return
  if (extracted.value) emit('summary')
  else emit('extract')
}
async function reviewNextField() {
  const key = nextUnconfirmed.value
  if (!key) return
  await requestLocate(key)
  if (!hasSource(key)) {
    root.value?.querySelector<HTMLElement>(`#reader-note-${key}`)?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'instant' : 'smooth' })
    await focusField(key)
  }
}
function updateInput(event: Event) { emit('update:editValue', (event.target as HTMLInputElement).value) }

defineExpose({ focusField })
</script>

<template>
  <div ref="root" class="reader-surface" :class="{ 'is-revealing': revealing }">
    <main class="reader-main" :data-reader-phase="draft.phase">
      <div class="reader-stage-heading">
        <div class="reader-stage-title">
          <button type="button" class="reader-back" aria-label="返回我的案头" @click="emit('home')"><ArrowLeft :size="21" /></button>
          <h1>材料审阅 <span>· {{ clue.id }}</span></h1>
        </div>
        <div class="reader-provenance" aria-label="内容来源标识">
          <span><FileText :size="17" />原件陈述</span><span><Search :size="17" />台账检索记录</span>
          <span class="reader-provenance-ai"><Info :size="17" />AI 辅助建议</span><span class="reader-provenance-human"><Check :size="17" />人工确认</span>
        </div>
      </div>
      <nav class="reader-source-bar" aria-label="相关材料">
        <span class="reader-source-label">材料与对照</span>
        <button type="button" @click="emit('source', 'original')"><FileText :size="16" />举报原件</button>
        <button type="button" @click="emit('source', 'contract')"><Link2 :size="16" />合同材料</button>
        <button type="button" @click="emit('source', 'receipt')"><Link2 :size="16" />收款台账</button>
        <button type="button" @click="emit('related')"><Link2 :size="16" />相似材料 <span>{{ draft.relatedIds.length }} 份检索提示</span></button>
        <button v-if="!notesOpen" type="button" class="reader-show-notes" @click="emit('toggleNotes')"><SquarePen :size="16" />展开批注<span v-if="extracted"> · 4</span></button>
      </nav>
      <div class="reader-reading-layout" :class="notesOpen ? 'has-notes' : 'notes-closed'">
        <article class="reader-document" aria-label="原始举报材料">
          <header class="reader-document-heading">
            <h2>{{ clue.title }}</h2>
            <div class="reader-document-meta"><span>材料编号 <strong>{{ clue.id }}</strong></span><span>{{ clue.area }}</span><span>{{ clue.date }} · {{ clue.source }} · 虚构演示</span></div>
          </header>
          <div class="reader-prose"><template v-for="segment in segments" :key="`${clue.id}-${segment.start}`"><button v-if="segment.key" :id="`source-${segment.key}`" type="button" class="reader-source-anchor" :class="{ 'is-located': sourceHighlight === segment.key, 'is-extracted': extracted }" :style="{ '--n': segment.number }" :aria-label="`${segment.text}；定位${draft.fields[segment.key].label}的原文依据`" @click="requestLocate(segment.key)">{{ segment.text }}<sup v-if="extracted" aria-hidden="true">{{ segment.number }}</sup></button><span v-else>{{ segment.text }}</span></template></div>
          <div class="reader-reading-boundary"><Info :size="16" /><p>原件全文保留。点击带编号的原句可定位批注；修订只作用于提取结果，不改变原件。</p></div>
          <div class="reader-record-sources"><span>可对照的来源</span><button type="button" @click="emit('source', 'contract')">查看合同材料 <Link2 :size="14" /></button><button type="button" @click="emit('source', 'receipt')">查看收款台账 <Link2 :size="14" /></button></div>
        </article>
        <aside v-if="notesOpen" class="reader-notes" aria-label="随文批注">
          <div class="reader-notes-head"><div><h2>随文批注</h2><template v-if="extracted"><p class="reader-confirmation-progress" role="status" aria-live="polite"><strong>{{ confirmed }} / {{ fieldKeys.length }}</strong> 项已人工确认</p><button v-if="nextUnconfirmed" type="button" class="reader-next-field" @click="reviewNextField">核对下一项 <ChevronDown :size="15" /></button><p v-else class="reader-confirmation-complete"><Check :size="15" />全部提取内容已确认</p></template><p v-else>与原文对应，按需核对</p></div><button type="button" class="reader-close-notes" aria-label="收起批注，扩大阅读区域" title="收起批注" @click="emit('toggleNotes')"><X :size="19" /></button></div>
          <div ref="notesScroll" class="reader-notes-scroll">
            <div v-if="analyzing" class="reader-notes-state reader-analyzing" role="status"><span class="reader-state-symbol"><Search :size="26" /></span><h3>正在整理材料…</h3><p>模拟识别要素，并把提取结果与原文出处对应。</p><ol class="reader-analysis-steps"><li class="is-active"><span></span>读取原件中的主体与事项</li><li><span></span>整理时间、金额与出处</li><li><span></span>准备供人工核对的结果</li></ol><p class="reader-state-boundary">演示模拟 · 未调用真实 OCR 或大模型</p></div>
            <div v-else-if="!extracted" class="reader-notes-state"><span class="reader-state-symbol"><FileText :size="28" /></span><h3>尚未提取</h3><p>先读这份材料。辅助提取会整理主体、事项、时间和金额，每项都可对照原文。</p><p class="reader-extract-guidance">阅读后，点击底部“开始辅助提取”。</p><p class="reader-state-boundary">只整理材料，不作事实判断。<br>本地虚构样例模拟。</p></div>
            <template v-else>
              <div class="reader-field-list">
                <section v-for="item in fieldItems" :id="`reader-note-${item.key}`" :key="item.key" class="reader-field-note" :style="{ '--n': item.number }" :class="{ 'is-confirmed': item.field.status === 'confirmed', 'is-located': sourceHighlight === item.key, 'is-editing': editingField === item.key }">
                  <div class="reader-note-kicker"><span class="reader-note-number">{{ item.number }}</span><span>{{ item.field.status === 'confirmed' ? '人工确认 · 提取内容' : 'AI 提取 · 待核对' }}</span><span v-if="item.field.lowConfidence && item.field.status !== 'confirmed'" class="reader-low-confidence">需核对</span></div>
                  <div class="reader-field-heading"><h3>{{ item.field.label }}</h3><Check v-if="item.field.status === 'confirmed'" :size="17" /></div>
                  <p class="reader-field-value">{{ item.field.value || '未提取到明确内容' }}</p>
                  <p v-if="item.key === 'amount' && item.field.sourceText && item.field.value !== item.field.sourceText" class="reader-source-correction">标注仅定位原文首个金额“{{ item.field.sourceText }}”；其余金额请在全文中逐项核对。</p>
                  <p v-if="item.field.lowConfidence && item.field.sourceText && item.field.status !== 'confirmed'" class="reader-source-correction">原文：{{ item.field.sourceText }}</p>
                  <p v-if="item.field.status === 'confirmed'" class="reader-confirmed-note">已确认提取文字，业务事实仍需核实。</p>
                  <div v-if="editingField === item.key" class="reader-field-editor">
                    <div class="reader-editor-heading">修正提取结果<span>原件保持不变</span></div>
                    <label class="reader-edit-label" for="field-edit-input">{{ item.field.label }}</label>
                    <div class="reader-ai-original"><span>AI 原始提取</span><span>{{ item.field.aiValue || '未提取到明确内容' }}</span></div>
                    <input id="field-edit-input" class="reader-edit-input" type="text" :value="editValue" :aria-label="`修正${item.field.label}`" :aria-invalid="Boolean(editError)" :aria-describedby="editError ? 'reader-edit-error' : undefined" autocomplete="off" spellcheck="false" @input="updateInput" @keydown.enter.prevent="emit('saveField', item.key)" @keydown.esc.prevent.stop="emit('cancelField')">
                    <p v-if="editError" id="reader-edit-error" class="reader-edit-error" role="alert"><Info :size="15" />{{ editError }}</p>
                    <div class="reader-edit-actions"><button type="button" class="reader-button reader-button-quiet" @click="emit('cancelField')">取消</button><button type="button" class="reader-button reader-button-primary" @click="emit('saveField', item.key)"><Check :size="15" />保存修订</button></div>
                  </div>
                  <div v-else class="reader-field-actions"><button type="button" :disabled="!hasSource(item.key)" @click="requestLocate(item.key)"><Search :size="14" />{{ hasSource(item.key) ? '定位原文' : '原文未自动定位' }}</button><button :id="`reader-edit-${item.key}`" type="button" @click="emit('edit', item.key)"><SquarePen :size="14" />修正</button><button v-if="item.field.status !== 'confirmed'" type="button" @click="confirmField(item.key)"><Check :size="14" />确认提取</button></div>
                </section>
              </div>
              <div class="reader-notes-boundary"><Info :size="15" /><p>确认、修正的都是提取内容；不改变原件，也不代表材料反映内容已被查实。</p></div>
            </template>
          </div>
        </aside>
      </div>
    </main>
    <footer class="reader-actionbar"><div class="reader-action-status"><Check v-if="draft.submittedAt || isSaved" :size="18" /><Info v-else :size="18" /><div><strong>{{ status }}</strong><span>{{ extracted ? '保存整理结果，不作受理或处置决定。' : '先提取并核对内容，再整理摘要。' }}</span></div></div><div class="reader-bottom-actions"><button type="button" class="reader-button" :disabled="analyzing" @click="emit('related')"><Search :size="18" />查看相似材料</button><button type="button" class="reader-button reader-button-primary" :disabled="analyzing" :aria-busy="analyzing" @click="primaryAction"><LoaderCircle v-if="analyzing" class="reader-button-spinner" :size="18" aria-hidden="true" /><FileText v-else :size="18" />{{ primaryLabel }}</button></div></footer>
  </div>
</template>
