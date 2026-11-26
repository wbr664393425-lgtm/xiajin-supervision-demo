<script lang="ts">
export interface MaterialSegment {
  text: string
  matched: boolean
  start: number
}

/** Find literal terms without changing any character in the source material. */
export function segmentMaterial(text: string, terms: string[], wholeTokens = false): MaterialSegment[] {
  const needles = [...new Set(terms.filter(term => term.length > 0))]
    .sort((a, b) => b.length - a.length)
  const segments: MaterialSegment[] = []
  let cursor = 0

  while (cursor < text.length) {
    let next = -1
    let matchedTerm = ''
    for (const term of needles) {
      let position = text.indexOf(term, cursor)
      while (wholeTokens && position !== -1 && (/[A-Za-z0-9_-]/.test(text[position - 1] || '') || /[A-Za-z0-9_-]/.test(text[position + term.length] || ''))) position = text.indexOf(term, position + 1)
      if (position !== -1 && (next === -1 || position < next)) {
        next = position
        matchedTerm = term
      }
    }
    if (next === -1) {
      segments.push({ text: text.slice(cursor), matched: false, start: cursor })
      break
    }
    if (next > cursor) {
      segments.push({ text: text.slice(cursor, next), matched: false, start: cursor })
    }
    segments.push({ text: matchedTerm, matched: true, start: next })
    cursor = next + matchedTerm.length
  }
  return segments
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ text: string; terms: string[]; wholeTokens?: boolean }>()
const segments = computed(() => segmentMaterial(props.text, props.terms, props.wholeTokens))
</script>

<template>
  <div class="matched-material"><template v-for="segment in segments" :key="segment.start"><mark v-if="segment.matched">{{ segment.text }}</mark><span v-else>{{ segment.text }}</span></template></div>
</template>

<style scoped>
.matched-material {
  white-space:pre-wrap;
  overflow-wrap:anywhere;
}
.matched-material mark {
  padding:0;
  border-radius:2px;
  background:var(--accent-soft);
  color:var(--accent);
  font:inherit;
  box-decoration-break:clone;
  -webkit-box-decoration-break:clone;
}
</style>
