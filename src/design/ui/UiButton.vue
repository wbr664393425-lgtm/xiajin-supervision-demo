<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger'; size?: 'sm' | 'md' | 'lg'; icon?: any; loading?: boolean; disabled?: boolean; block?: boolean; type?: 'button' | 'submit' }>(), { variant: 'secondary', size: 'md', type: 'button' })
</script>
<template>
  <button :type="type" class="ui-btn" :class="[`v-${variant}`, `s-${size}`, { block }]" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <LoaderCircle v-if="loading" class="spin" :size="size === 'sm' ? 14 : 16" />
    <component :is="icon" v-else-if="icon" :size="size === 'sm' ? 14 : 16" />
    <span v-if="$slots.default"><slot /></span>
  </button>
</template>
<style scoped>
.ui-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:var(--r-sm);font-weight:500;white-space:nowrap;border:1px solid transparent;transition:background var(--dur),border-color var(--dur),color var(--dur),box-shadow var(--dur),transform .1s}
.ui-btn:active:not(:disabled){transform:translateY(1px)}
.ui-btn:disabled{opacity:.5}
.s-sm{height:30px;padding:0 10px;font-size:13px}
.s-md{height:36px;padding:0 14px;font-size:14px}
.s-lg{height:42px;padding:0 20px;font-size:15px}
.block{width:100%}
.v-primary{background:var(--red);color:var(--on-brand);box-shadow:0 1px 0 rgba(255,255,255,.18) inset,var(--shadow-red)}
.v-primary:hover:not(:disabled){background:var(--red-600)}
.v-secondary{background:var(--surface);color:var(--text);border-color:var(--line-2)}
.v-secondary:hover:not(:disabled){border-color:var(--red-line);color:var(--red)}
.v-ghost{color:var(--text-2)}
.v-ghost:hover:not(:disabled){background:var(--surface-3);color:var(--text)}
.v-soft{background:var(--red-50);color:var(--red-600)}
.v-soft:hover:not(:disabled){background:var(--soft-hover)}
.v-danger{color:var(--risk-high);border-color:var(--risk-high-line);background:var(--surface)}
.v-danger:hover:not(:disabled){background:var(--risk-high-bg)}
.spin{animation:spin 1s linear infinite}
</style>
