<script setup lang="ts">
/** 选项卡：传 to 时为路由导航（URL 可直达），否则用 v-model。 */
defineProps<{ items: { value: string; label: string; count?: number; to?: any }[]; modelValue?: string; size?: 'sm' | 'md' }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template>
  <nav class="ui-tabs" :class="size === 'sm' ? 'sm' : ''" role="tablist">
    <template v-for="item in items" :key="item.value">
      <RouterLink v-if="item.to" :to="item.to" class="tab" active-class="active" role="tab">{{ item.label }}<span v-if="item.count != null" class="count num">{{ item.count }}</span></RouterLink>
      <button v-else type="button" class="tab" :class="{ active: modelValue === item.value }" role="tab" :aria-selected="modelValue === item.value" @click="$emit('update:modelValue', item.value)">{{ item.label }}<span v-if="item.count != null" class="count num">{{ item.count }}</span></button>
    </template>
  </nav>
</template>
<style scoped>
.ui-tabs{display:flex;gap:4px;padding:3px;background:var(--surface-3);border-radius:10px;width:max-content;max-width:100%;overflow-x:auto}
.tab{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;border-radius:8px;font-size:14px;color:var(--text-2);white-space:nowrap;transition:background var(--dur),color var(--dur),box-shadow var(--dur)}
.tab:hover{color:var(--text)}
.tab.active{background:var(--surface);color:var(--red);font-weight:600;box-shadow:var(--shadow-1)}
.count{font-size:12px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--line);color:var(--text-2);display:inline-flex;align-items:center;justify-content:center}
.tab.active .count{background:var(--red-50);color:var(--red)}
.sm .tab{height:28px;padding:0 10px;font-size:13px}
</style>
