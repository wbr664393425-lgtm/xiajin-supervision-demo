<script setup lang="ts">
defineProps<{ items: { time: string; title: string; text?: string; tone?: 'red' | 'green' | 'gray' | 'ai' | 'orange' }[] }>()
</script>
<template>
  <ol class="ui-timeline">
    <li v-for="(item, i) in items" :key="i" :class="`t-${item.tone || 'gray'}`">
      <span class="dot" /><div><div class="head"><strong>{{ item.title }}</strong><time class="num">{{ item.time }}</time></div><p v-if="item.text">{{ item.text }}</p></div>
    </li>
  </ol>
</template>
<style scoped>
.ui-timeline{position:relative}
li{display:flex;gap:12px;padding:0 0 16px;position:relative}
li:not(:last-child)::before{content:"";position:absolute;left:5px;top:16px;bottom:0;width:1px;background:var(--line-2)}
.dot{width:11px;height:11px;border-radius:50%;margin-top:5px;flex:none;background:var(--surface);box-shadow:inset 0 0 0 2px var(--text-4)}
.t-red .dot{box-shadow:inset 0 0 0 2px var(--red)}
.t-green .dot{background:var(--ok);box-shadow:none}
.t-ai .dot{box-shadow:inset 0 0 0 2px var(--ai)}
.t-orange .dot{box-shadow:inset 0 0 0 2px var(--risk-mid)}
li>div{flex:1;min-width:0}
.head{display:flex;justify-content:space-between;gap:10px}
strong{font-size:14px;font-weight:600}
time{font-size:12px;color:var(--text-3);white-space:nowrap}
p{font-size:13px;color:var(--text-2);margin-top:2px;line-height:1.7}
</style>
