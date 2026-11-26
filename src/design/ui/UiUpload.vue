<script setup lang="ts">
import { ref } from 'vue'
import { UploadCloud } from 'lucide-vue-next'
const props = defineProps<{ accept?: string; hint?: string; multiple?: boolean }>()
const emit = defineEmits<{ files: [files: File[]] }>()
const over = ref(false), input = ref<HTMLInputElement>()
function take(list: FileList | null | undefined) { if (list?.length) emit('files', [...list]) }
</script>
<template>
  <div class="ui-upload" :class="{ over }" role="button" tabindex="0" @click="input?.click()" @keydown.enter="input?.click()" @dragover.prevent="over = true" @dragleave="over = false" @drop.prevent="over = false; take($event.dataTransfer?.files)">
    <UploadCloud :size="22" /><div><strong>点击或拖入文件</strong><span>{{ hint || '支持文本文件' }}</span></div>
    <input ref="input" type="file" class="sr-only" :accept="props.accept" :multiple="multiple" @change="take(($event.target as HTMLInputElement).files); ($event.target as HTMLInputElement).value = ''" />
  </div>
</template>
<style scoped>
.ui-upload{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1.5px dashed var(--line-2);border-radius:var(--r-md);background:var(--surface-2);color:var(--text-3);cursor:pointer;transition:border-color var(--dur),background var(--dur),color var(--dur)}
.ui-upload:hover,.ui-upload.over{border-color:var(--red);background:var(--red-25);color:var(--red)}
strong{display:block;font-size:14px;color:var(--text);font-weight:600}
span{font-size:13px}
</style>
