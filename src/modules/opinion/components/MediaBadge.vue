<script setup lang="ts">
import { computed } from 'vue'
import { sourceById, type MediaSourceId } from '@/mock/opinion'

const props = withDefaults(defineProps<{ sourceId: MediaSourceId; size?: 'sm' | 'md'; showTier?: boolean }>(), {
  size: 'sm',
  showTier: false,
})
const src = computed(() => sourceById(props.sourceId))
const initial = computed(() => src.value.short.slice(0, 1))
</script>

<template>
  <span class="media-badge" :class="`s-${size}`" :title="`${src.name}（${src.tier}）`">
    <img v-if="src.logo" :src="src.logo" :alt="src.short" class="mb-logo" />
    <i v-else class="mb-mono" :style="{ background: src.badgeColor }">{{ initial }}</i>
    <span class="mb-name">{{ src.short }}</span>
    <em v-if="showTier" class="mb-tier">{{ src.tier }}</em>
  </span>
</template>

<style scoped>
.media-badge{display:inline-flex;align-items:center;gap:5px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);color:var(--text-2);white-space:nowrap;vertical-align:middle;line-height:1.4}
.s-sm{padding:1px 7px 1px 4px;font-size:12px}
.s-md{padding:3px 9px 3px 6px;font-size:13px}
.mb-logo{width:16px;height:16px;border-radius:4px;object-fit:contain;background:#fff;flex:none;box-shadow:0 0 0 1px rgba(0,0,0,.05)}
.s-md .mb-logo{width:18px;height:18px}
.mb-mono{width:16px;height:16px;border-radius:4px;color:#fff;font-style:normal;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:none}
.s-md .mb-mono{width:18px;height:18px;font-size:11px}
.mb-name{font-weight:500;color:var(--text)}
.mb-tier{font-style:normal;font-size:11px;color:var(--text-3);padding-left:4px;border-left:1px solid var(--line)}
</style>
