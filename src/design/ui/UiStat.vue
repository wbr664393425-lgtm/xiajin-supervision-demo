<script setup lang="ts">
defineProps<{ label: string; value: string | number; unit?: string; icon?: any; tone?: 'red' | 'orange' | 'blue' | 'gold' | 'green'; hint?: string; to?: any }>()
</script>
<template>
  <component :is="to ? 'RouterLink' : 'div'" :to="to" class="ui-stat" :class="[`t-${tone || 'red'}`, { link: to }]">
    <span class="icon"><component :is="icon" :size="20" /></span>
    <div><span class="label">{{ label }}</span><strong class="num">{{ value }}<small v-if="unit">{{ unit }}</small></strong><span v-if="hint" class="hint">{{ hint }}</span></div>
  </component>
</template>
<style scoped>
.ui-stat{display:flex;align-items:center;gap:14px;padding:16px 18px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow-1);transition:transform var(--dur),box-shadow var(--dur),border-color var(--dur);min-width:0}
.ui-stat.link:hover{transform:translateY(-2px);box-shadow:var(--shadow-2);border-color:var(--red-line)}
.icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:none}
.t-red .icon{background:var(--red-50);color:var(--red)}
.t-orange .icon{background:var(--risk-mid-bg);color:var(--risk-mid)}
.t-blue .icon{background:var(--info-bg);color:var(--info)}
.t-gold .icon{background:var(--cream);color:var(--gold)}
.t-green .icon{background:var(--ok-bg);color:var(--ok)}
.label{display:block;font-size:13px;color:var(--text-3)}
strong{display:block;font-size:28px;line-height:1.15;font-weight:700;color:var(--text);margin-top:2px}
small{font-size:13px;font-weight:500;color:var(--text-3);margin-left:3px;font-family:var(--font)}
.hint{display:block;font-size:12px;color:var(--text-3);margin-top:2px}
</style>
