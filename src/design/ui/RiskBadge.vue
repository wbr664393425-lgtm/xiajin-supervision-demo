<script setup lang="ts">
import { computed } from 'vue'
import { OctagonAlert, TriangleAlert, CircleAlert } from 'lucide-vue-next'
import type { RiskLevel } from '@/types'
const props = defineProps<{ level: RiskLevel; label?: string }>()
const meta = computed(() => ({ high: { text: '红色预警', icon: OctagonAlert }, mid: { text: '橙色预警', icon: TriangleAlert }, low: { text: '黄色关注', icon: CircleAlert } }[props.level]))
</script>
<template><span class="risk" :class="level"><component :is="meta.icon" :size="13" />{{ label || meta.text }}</span></template>
<style scoped>
.risk{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:600;padding:1px 8px;border-radius:5px;white-space:nowrap;line-height:1.5}
.high{color:var(--risk-high);background:var(--risk-high-bg)}
.mid{color:var(--risk-mid);background:var(--risk-mid-bg)}
.low{color:var(--risk-low);background:var(--risk-low-bg)}
</style>
