<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
defineProps<{title:string}>();const emit=defineEmits(['close']);const root=ref<HTMLElement>();let previous:HTMLElement|null=null
function key(e:KeyboardEvent){if(e.key==='Escape')emit('close');if(e.key==='Tab'&&root.value){const a=Array.from(root.value.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')).filter(el=>!el.hasAttribute('disabled'));const first=a[0],last=a[a.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}
onMounted(()=>{previous=document.activeElement as HTMLElement;root.value?.querySelector<HTMLElement>('button')?.focus();document.addEventListener('keydown',key)});onUnmounted(()=>{document.removeEventListener('keydown',key);previous?.focus()})
</script>
<template><Teleport to="body"><div class="modal-backdrop" @click.self="emit('close')"><section ref="root" class="modal" role="dialog" aria-modal="true" :aria-label="title"><div class="section-head"><h2>{{title}}</h2><button class="btn btn-quiet" aria-label="关闭弹窗" @click="emit('close')"><X :size="19"/></button></div><slot/></section></div></Teleport></template>
