<script setup lang="ts">
import { computed } from 'vue'
import { segment, type Span } from '@/engines/text'
/** 原文渲染：高亮区间可点击定位；原文字符完整保留。 */
const props = defineProps<{ text: string; spans: (Span & { tag?: string; key?: string })[]; active?: string }>()
const emit = defineEmits<{ pick: [key: string] }>()
const segs = computed(() => segment(props.text, props.spans.map(s => ({ ...s, tag: `${s.tag || 'hl'}|${s.key || ''}` }))))
</script>
<template>
  <p class="clue-text"><template v-for="s in segs" :key="s.start"><mark v-if="s.tag" :class="[s.tag.split('|')[0], { active: active && s.tag.split('|')[1] === active }]" @click="emit('pick', s.tag.split('|')[1] || '')">{{ s.text }}</mark><span v-else>{{ s.text }}</span></template></p>
</template>
<style scoped>
.clue-text{font-size:15px;line-height:2;color:var(--text);white-space:pre-wrap;font-family:var(--font-serif)}
mark{background:transparent;color:inherit;cursor:pointer;border-radius:3px;padding:1px 1px;transition:background var(--dur)}
mark.field{background:var(--cream);box-shadow:inset 0 -2px 0 var(--gold)}
mark.risk{background:var(--risk-high-bg);color:#860B0F;box-shadow:inset 0 -2px 0 var(--risk-high)}
mark.match{background:#FFF0C2}
mark.active{background:var(--gold-soft);box-shadow:inset 0 -2px 0 var(--gold),0 0 0 2px var(--gold-line)}
mark.risk.active{background:#F9CFCD}
</style>
