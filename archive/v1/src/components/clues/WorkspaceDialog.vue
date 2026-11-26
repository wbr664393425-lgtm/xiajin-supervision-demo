<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
defineProps<{ title: string; eyebrow?: string; subtitle?: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const previousFocus = typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => { dialog.value?.close(); previousFocus?.focus({ preventScroll: true }) })
</script>
<template>
  <dialog ref="dialog" class="cw-dialog" :class="{ 'cw-dialog-wide': wide }" aria-labelledby="cw-dialog-title" @cancel.prevent="emit('close')">
    <header class="cw-dialog-header"><div><p v-if="eyebrow" class="cw-dialog-eyebrow">{{ eyebrow }}</p><h2 id="cw-dialog-title">{{ title }}</h2><p v-if="subtitle" class="cw-dialog-subtitle">{{ subtitle }}</p></div><button class="cw-icon-button" aria-label="关闭面板" @click="emit('close')"><X :size="22"/></button></header>
    <div class="cw-dialog-body"><slot/></div>
    <footer v-if="$slots.footer" class="cw-dialog-footer"><slot name="footer"/></footer>
  </dialog>
</template>
