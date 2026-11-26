<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CornerDownLeft, Search } from 'lucide-vue-next'
import { searchAll } from './search'
import { useSystemStore } from '@/stores/system'
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const router = useRouter(), system = useSystemStore()
const q = ref(''), index = ref(0), input = ref<HTMLInputElement>()
const results = computed(() => searchAll(q.value))
watch(() => props.open, async open => { if (open) { q.value = ''; index.value = 0; await nextTick(); input.value?.focus() } })
watch(q, () => { index.value = 0 })
function go(i = index.value) {
  const item = results.value[i]
  if (!item) return
  if (q.value.trim()) system.log('home', '查询', q.value.trim(), `全局检索并打开：${item.title}`)
  router.push(item.to); emit('close')
}
function key(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); index.value = Math.min(index.value + 1, results.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); index.value = Math.max(index.value - 1, 0) }
  else if (e.key === 'Enter') { e.preventDefault(); go() }
  else if (e.key === 'Escape') emit('close')
}
/** 只展示业务编号（线索、合同、项目、案卷、任务），内部记录键不展示 */
const isCode = (id: string) => /^[A-Z]{2}(-[A-Z]{2})?-\d{4}-\d{2,4}$/.test(id)
</script>
<template>
  <Teleport to="body">
    <div v-if="open" class="cmd-mask" @click.self="emit('close')">
      <div class="cmd" role="dialog" aria-label="全局检索">
        <div class="cmd-input"><Search :size="18" /><input ref="input" v-model="q" placeholder="搜索功能、线索编号、合同、案卷、人员…" aria-label="全局检索" @keydown="key" /><kbd>退出</kbd></div>
        <ul class="cmd-list scroll-thin">
          <li v-for="(item, i) in results" :key="item.id + i"><button :class="{ active: i === index }" @mouseenter="index = i" @click="go(i)"><span class="type">{{ item.type }}</span><strong>{{ item.title }}</strong><small v-if="isCode(item.id)" class="num">{{ item.id }}</small><CornerDownLeft v-if="i === index" :size="14" /></button></li>
          <li v-if="!results.length" class="none">没有匹配结果，换个关键词试试。检索行为会记入审计日志。</li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>
<style scoped>
.cmd-mask{position:fixed;inset:0;z-index:400;background:var(--scrim);display:flex;justify-content:center;padding-top:12vh;animation:fade var(--dur)}
.cmd{width:min(640px,94vw);max-height:66vh;background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--shadow-2);display:flex;flex-direction:column;overflow:hidden;animation:rise var(--dur) var(--ease)}
.cmd-input{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line);color:var(--text-3)}
.cmd-input input{flex:1;border:0;outline:0;font-size:16px;color:var(--text);background:none}
kbd{font-family:inherit;font-size:12px;border:1px solid var(--line-2);border-radius:4px;padding:1px 6px;color:var(--text-3)}
.cmd-list{overflow:auto;padding:6px}
.cmd-list button{width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;text-align:left}
.cmd-list button.active{background:var(--red-25)}
.type{font-size:12px;color:var(--red);background:var(--red-50);border-radius:4px;padding:0 6px;flex:none}
.cmd-list strong{font-weight:500;font-size:14px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cmd-list small{font-size:12px;color:var(--text-3)}
.none{padding:24px;text-align:center;color:var(--text-3);font-size:13px}
</style>
