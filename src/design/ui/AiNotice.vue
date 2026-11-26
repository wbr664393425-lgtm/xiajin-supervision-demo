<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'
defineProps<{ text?: string }>()
</script>
<template><p class="ai-notice"><ShieldCheck :size="14" />{{ text || '智能初稿，人工审核。模型输出为疑点、初稿或参考，不构成事实认定、定性或处置意见。' }}</p></template>
<style scoped>
.ai-notice{display:flex;align-items:flex-start;gap:6px;font-size:13px;line-height:1.6;color:var(--ai);background:var(--ai-bg);border-radius:var(--r-sm);padding:8px 12px}
.ai-notice svg{margin-top:3px}
</style>
