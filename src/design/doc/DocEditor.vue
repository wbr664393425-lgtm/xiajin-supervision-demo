<script setup lang="ts">
import { computed, ref } from 'vue'
import { Eye, PencilLine } from 'lucide-vue-next'
import { today } from '@/stores/persist'
const signDate = (() => { const [y, m, d] = today().split('-').map(Number); return `${y}年${m}月${d}日` })()
/** 生成文书的“版式预览 / 编辑”双视图：预览按公文格式排版（标题、一级黑体、二级楷体、正文首行缩进、说明小字）。 */
const props = withDefaults(defineProps<{ modelValue: string; rows?: number; org?: string; seal?: string; redHead?: string; editable?: boolean; highlight?: string }>(), { rows: 18, editable: true })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const mode = ref<'preview' | 'edit'>('preview')
const lines = computed(() => props.modelValue.split('\n'))
const title = computed(() => lines.value.find(l => l.trim())?.trim() || '')
const body = computed(() => { const i = lines.value.findIndex(l => l.trim()); return lines.value.slice(i + 1).filter(l => l.trim()) })
function parts(l: string) { const h = props.highlight?.trim(); if (!h || !l.includes(h)) return [{ t: l.trim(), hl: false }]; const [a, ...b] = l.trim().split(h); return [{ t: a!, hl: false }, { t: h, hl: true }, { t: b.join(h), hl: false }] }
function kind(l: string) {
  const t = l.trim()
  if (/^[一二三四五六七八九十]+、/.test(t)) return 'h4'
  if (/^（[一二三四五六七八九十]+）/.test(t) || /^【[^】]+】/.test(t)) return 'h5'
  if (/^(说明|注)：|^（本|^（.*初稿/.test(t)) return 'note'
  if (/^[^：]{2,12}：/.test(t) && t.length < 60 && !/。$/.test(t)) return 'meta'
  if (/^(镜头|  ·|·|\d+\.|[①②③④⑤])/.test(t)) return 'flat'
  return 'p'
}
</script>
<template>
  <div class="doc-editor">
    <div class="switch" role="tablist"><button :class="{ on: mode === 'preview' }" @click="mode = 'preview'"><Eye :size="14" />版式预览</button><button v-if="editable" :class="{ on: mode === 'edit' }" @click="mode = 'edit'"><PencilLine :size="14" />编辑正文</button></div>
    <textarea v-if="mode === 'edit'" class="textarea src" :rows="rows" :value="modelValue" aria-label="文书正文" @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" />
    <div v-else class="doc-desk">
      <article class="doc-page">
        <template v-if="redHead"><div class="red-head">{{ redHead }}</div><div class="red-rule" /></template>
        <h3 class="doc-title">{{ title }}</h3>
        <template v-for="(l, i) in body" :key="i">
          <h4 v-if="kind(l) === 'h4'">{{ l.trim() }}</h4>
          <h5 v-else-if="kind(l) === 'h5'">{{ l.trim() }}</h5>
          <p v-else-if="kind(l) === 'note'" class="note">{{ l.trim() }}</p>
          <p v-else-if="kind(l) === 'meta'" class="flat"><span class="k">{{ l.trim().split('：')[0] }}：</span><template v-for="(x, j) in parts(l.trim().split('：').slice(1).join('：'))" :key="j"><mark v-if="x.hl" class="risk active">{{ x.t }}</mark><template v-else>{{ x.t }}</template></template></p>
          <p v-else-if="kind(l) === 'flat'" class="flat ind">{{ l.trim() }}</p>
          <p v-else><template v-for="(x, j) in parts(l)" :key="j"><mark v-if="x.hl" class="risk active">{{ x.t }}</mark><template v-else>{{ x.t }}</template></template></p>
        </template>
        <p v-if="org" class="sign">{{ org }}<br />{{ signDate }}</p>
        <span v-if="seal" class="seal">{{ seal }}</span>
        <span class="page-no">— 1 —</span>
      </article>
    </div>
  </div>
</template>
<style scoped>
.doc-editor{display:flex;flex-direction:column;gap:10px}
.switch{display:flex;gap:2px;padding:3px;background:var(--surface-3);border-radius:9px;width:max-content}
.switch button{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 12px;border-radius:7px;font-size:13px;color:var(--text-2)}
.switch button.on{background:var(--surface);color:var(--red);font-weight:600;box-shadow:var(--shadow-1)}
.src{font-family:var(--font-serif);font-size:14px}
.ind{padding-left:2em}
</style>
