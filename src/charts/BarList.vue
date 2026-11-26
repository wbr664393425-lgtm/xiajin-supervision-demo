<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ items: { label: string; value: number; color?: string; hint?: string }[]; unit?: string }>()
const emit = defineEmits<{ select: [label: string] }>()
const max = computed(() => Math.max(1, ...props.items.map(i => i.value)))
</script>
<template>
  <ul class="bars">
    <li v-for="item in items" :key="item.label" @click="emit('select', item.label)">
      <div class="top"><span>{{ item.label }}</span><b class="num">{{ item.value }}<small>{{ unit }}</small></b></div>
      <div class="track"><i :style="{ width: `${(item.value / max) * 100}%`, background: item.color || 'var(--red)' }" /></div>
      <small v-if="item.hint" class="hint">{{ item.hint }}</small>
    </li>
  </ul>
</template>
<style scoped>
.bars{display:flex;flex-direction:column;gap:12px}
li{cursor:pointer}
.top{display:flex;justify-content:space-between;font-size:13px;color:var(--text-2);margin-bottom:5px}
b{color:var(--text);font-weight:600}
b small{font-size:12px;color:var(--text-3);margin-left:2px;font-weight:400}
.track{height:7px;border-radius:4px;background:var(--surface-3);overflow:hidden}
.track i{display:block;height:100%;border-radius:4px;transition:width .5s var(--ease)}
.hint{font-size:12px;color:var(--text-3)}
</style>
