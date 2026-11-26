<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { onBeforeUnmount, onDeactivated, watch } from 'vue'
const props = withDefaults(defineProps<{ modelValue: boolean; title?: string; subtitle?: string; width?: number }>(), { width: 560 })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
let downOnMask = false
function onMaskDown(e: MouseEvent) { downOnMask = e.target === e.currentTarget }
function onMaskUp(e: MouseEvent) { if (downOnMask && e.target === e.currentTarget) emit('update:modelValue', false); downOnMask = false }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('update:modelValue', false) }
watch(() => props.modelValue, open => open ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey), { immediate: true })
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
onDeactivated(() => { if (props.modelValue) emit('update:modelValue', false) })
</script>
<template>
  <Teleport to="body">
    <div v-if="modelValue" class="drawer-mask" @mousedown="onMaskDown" @mouseup="onMaskUp">
      <aside class="drawer" :style="{ width: `min(${width}px, 96vw)` }" role="dialog" :aria-label="title">
        <header><div><h2>{{ title }}</h2><p v-if="subtitle">{{ subtitle }}</p></div><slot name="extra" /><button class="close" aria-label="关闭" @click="emit('update:modelValue', false)"><X :size="18" /></button></header>
        <div class="drawer-body scroll-thin"><slot /></div>
        <footer v-if="$slots.footer"><slot name="footer" /></footer>
      </aside>
    </div>
  </Teleport>
</template>
<style scoped>
.drawer-mask{position:fixed;inset:0;z-index:300;background:var(--scrim);display:flex;justify-content:flex-end;animation:fade var(--dur) var(--ease)}
.drawer{height:100%;background:var(--surface);box-shadow:var(--shadow-2);display:flex;flex-direction:column;animation:slide-l 280ms var(--ease)}
header{display:flex;align-items:flex-start;gap:12px;padding:18px 20px;border-bottom:1px solid var(--line)}
header>div{flex:1;min-width:0}
h2{font-size:17px;font-weight:600;line-height:1.4}
header p{font-size:13px;color:var(--text-3);margin-top:2px}
.close{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-3)}
.close:hover{background:var(--surface-3);color:var(--text)}
.drawer-body{flex:1;overflow:auto;overscroll-behavior:contain;padding:18px 20px}
footer{padding:12px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;background:var(--surface-2)}
</style>
