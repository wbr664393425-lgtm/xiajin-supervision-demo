<script setup lang="ts">
import { onBeforeUnmount, onDeactivated, watch } from 'vue'
const props = defineProps<{ modelValue: boolean; title?: string; width?: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
let downOnMask = false
function onMaskDown(e: MouseEvent) { downOnMask = e.target === e.currentTarget }
function onMaskUp(e: MouseEvent) { if (downOnMask && e.target === e.currentTarget) emit('update:modelValue', false); downOnMask = false }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('update:modelValue', false) }
watch(() => props.modelValue, open => open ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey), { immediate: true })
// 页面被缓存隐藏时关闭弹窗，避免浮层留在其他页面上
onDeactivated(() => { if (props.modelValue) emit('update:modelValue', false) })
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>
<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-mask" @mousedown="onMaskDown" @mouseup="onMaskUp">
      <div class="modal" role="dialog" :aria-label="title" :style="{ width: `min(${width || 480}px, 94vw)` }">
        <h2 v-if="title">{{ title }}</h2>
        <div class="modal-body"><slot /></div>
        <footer v-if="$slots.footer"><slot name="footer" /></footer>
      </div>
    </div>
  </Teleport>
</template>
<style scoped>
.modal-mask{position:fixed;inset:0;z-index:320;background:var(--scrim);display:flex;align-items:center;justify-content:center;padding:20px;animation:fade var(--dur)}
.modal{background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--shadow-2);padding:22px 24px;max-height:88vh;overflow:auto;overscroll-behavior:contain;animation:rise var(--dur) var(--ease)}
h2{font-size:18px;font-weight:600;margin-bottom:12px}
.modal-body{font-size:14px;color:var(--text-2)}
footer{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
</style>
