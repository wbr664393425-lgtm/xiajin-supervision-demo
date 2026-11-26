<script setup lang="ts">
import { CircleCheck, Info, TriangleAlert } from 'lucide-vue-next'
import { toasts } from './toast'
</script>
<template>
  <div class="toaster" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.tone"><component :is="t.tone === 'ok' ? CircleCheck : t.tone === 'warn' ? TriangleAlert : Info" :size="17" /><span>{{ t.text }}</span><RouterLink v-if="t.action" :to="t.action.to">{{ t.action.label }}</RouterLink></div>
  </div>
</template>
<style scoped>
.toaster{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:500;display:flex;flex-direction:column;gap:8px;align-items:center}
.toast{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;background:var(--toast-bg);color:#fff;font-size:14px;box-shadow:var(--shadow-2);animation:rise var(--dur) var(--ease)}
.toast.ok svg{color:#7FD3A4}.toast.warn svg{color:#FFC36B}.toast.info svg{color:#9FB7E8}
.toast a{color:#F6D08A;font-weight:600;margin-left:6px}
</style>
