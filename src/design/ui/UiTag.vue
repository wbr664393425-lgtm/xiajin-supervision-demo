<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'gray' | 'ai' | 'gold'; icon?: any; dot?: boolean; size?: 'sm' | 'md' }>(), { tone: 'gray', size: 'md' })
</script>
<template><span class="ui-tag" :class="[`t-${tone}`, `s-${size}`]"><i v-if="dot" class="dot" /><component :is="icon" v-if="icon" :size="12" /><slot /></span></template>
<style scoped>
.ui-tag{display:inline-flex;align-items:center;gap:4px;border-radius:5px;font-weight:500;white-space:nowrap;line-height:1.5}
.s-md{font-size:13px;padding:1px 8px}
.s-sm{font-size:12px;padding:0 6px}
.dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.t-red{background:var(--risk-high-bg);color:var(--risk-high)}
.t-orange{background:var(--risk-mid-bg);color:var(--risk-mid)}
.t-yellow{background:var(--risk-low-bg);color:var(--risk-low)}
.t-green{background:var(--ok-bg);color:var(--ok)}
.t-blue{background:var(--info-bg);color:var(--info)}
.t-gray{background:var(--surface-3);color:var(--text-2)}
.t-ai{background:var(--ai-bg);color:var(--ai);box-shadow:inset 0 0 0 1px var(--ai-line)}
.t-gold{background:var(--gold-soft);color:var(--accent-ink)}
</style>
