<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'
defineProps<{ title: string; text?: string; icon?: any }>()
</script>
<template><div class="ui-empty"><span class="art"><component :is="icon || Inbox" :size="22" /></span><strong>{{ title }}</strong><p v-if="text">{{ text }}</p><slot /></div></template>
<style scoped>
.ui-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px;padding:32px 16px;color:var(--text-3)}
.art{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:var(--cream);color:var(--gold);margin-bottom:6px;box-shadow:inset 0 0 0 1px var(--gold-line)}
strong{color:var(--text);font-size:15px;font-weight:600}
p{font-size:13px;max-width:320px}
</style>
