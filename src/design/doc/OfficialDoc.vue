<script setup lang="ts">
import { computed } from 'vue'
import DocRun from './DocRun.vue'
import { segmentRange, type Span } from '@/engines/text'
/**
 * 把原始材料排成公文 / 表单版式（红头、标题、登记表、问答笔录、正文段落、落款）。
 * 高亮区间使用原文全局偏移，排版不改动任何原文字符。
 */
const props = defineProps<{ text: string; title: string; org?: string; docNo?: string; kind?: string; date?: string; meta?: [string, string][]; spans?: (Span & { tag?: string; key?: string })[]; active?: string; compact?: boolean; seal?: string }>()
const emit = defineEmits<{ pick: [key: string] }>()
const TABLE = /^(会议时间|会议地点|主持人|参会人员|记录人|议题|表决情况|时间|地点|谈话人|公示时间|公示地点|公示内容|监督电话|决定)$/
type Block = { type: 'row' | 'para' | 'qa' | 'head'; key?: string; s: number; e: number }
const all = computed(() => (props.spans || []).map(s => ({ ...s, tag: `${s.tag || 'hl'}|${s.key || ''}` })))
const blocks = computed<Block[]>(() => {
  const out: Block[] = []
  let off = 0
  for (const line of props.text.split('\n')) {
    const start = off; off += line.length + 1
    if (!line.trim()) continue
    const pieces: [number, number][] = []
    const qa = [...line.matchAll(/(问|答)：/g)].map(m => m.index!)
    if (qa.length > 1 || (qa.length === 1 && qa[0]! > 0)) { const cuts = [0, ...qa.filter(i => i > 0), line.length]; for (let i = 0; i < cuts.length - 1; i++) pieces.push([start + cuts[i]!, start + cuts[i + 1]!]) } else pieces.push([start, start + line.length])
    for (const [s, e] of pieces) {
      const t = props.text.slice(s, e)
      const m = /^([一-龥]{1,6})：/.exec(t.trim())
      const lead = t.length - t.trimStart().length
      if (m && (m[1] === '问' || m[1] === '答')) out.push({ type: 'qa', key: m[1], s: s + lead + m[0].length, e })
      else if (m && TABLE.test(m[1]!)) out.push({ type: 'row', key: m[1], s: s + lead + m[0].length, e })
      else if (m) out.push({ type: 'head', key: m[1], s: s + lead + m[0].length, e })
      else out.push({ type: 'para', s, e })
    }
  }
  return out
})
const rows = computed(() => blocks.value.filter(b => b.type === 'row'))
const body = computed(() => blocks.value.filter(b => b.type !== 'row'))
const segs = (b: Block) => segmentRange(props.text, all.value, b.s, b.e)
const redHead = computed(() => props.org && /三重一大|会议记录|公示|党建/.test(props.kind || ''))
</script>
<template>
  <div class="doc-desk" :class="{ compact }">
    <article class="doc-page">
      <template v-if="redHead"><div class="red-head">{{ org }}</div><div v-if="docNo" class="red-no">{{ docNo }}</div><div class="red-rule" /></template>
      <h3 class="doc-title">{{ title }}</h3>
      <table v-if="meta?.length || rows.length" class="form">
        <tr v-for="m in meta || []" :key="m[0]"><th>{{ m[0] }}</th><td>{{ m[1] }}</td></tr>
        <tr v-for="r in rows" :key="r.s"><th>{{ r.key }}</th><td><DocRun :segs="segs(r)" :active="active" @pick="emit('pick', $event)" /><span v-if="r.e === r.s" class="blank">（空）</span></td></tr>
      </table>
      <template v-for="b in body" :key="b.s">
        <p v-if="b.type === 'qa'" class="qa"><span class="k">{{ b.key }}：</span><DocRun :segs="segs(b)" :active="active" @pick="emit('pick', $event)" /></p>
        <p v-else-if="b.type === 'head'"><span class="k">{{ b.key }}：</span><DocRun :segs="segs(b)" :active="active" @pick="emit('pick', $event)" /></p>
        <p v-else><DocRun :segs="segs(b)" :active="active" @pick="emit('pick', $event)" /></p>
      </template>
      <p v-if="org || date" class="sign">{{ org }}<br v-if="org && date" />{{ date }}</p>
      <span v-if="seal" class="seal">{{ seal }}</span>
      <span class="page-no">— 1 —</span>
    </article>
  </div>
</template>
<style scoped>
.blank{color:#B33}
</style>
