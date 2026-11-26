<script setup lang="ts">
import { onActivated } from 'vue'
import { useRoute } from 'vue-router'
import { FolderOpen } from 'lucide-vue-next'
import { UiTag } from '@/design/ui'
import { useCasesStore } from '@/stores/cases'
const store = useCasesStore(), route = useRoute()
const sync = () => { const id = String(route.query.case || ''); if (id && store.cases.some(c => c.id === id)) store.activeId = id }
sync(); onActivated(sync)
</script>
<template>
  <div class="picker">
    <button v-for="c in store.cases" :key="c.id" :class="{ on: store.activeId === c.id }" @click="store.activeId = c.id">
      <FolderOpen :size="18" /><div><strong>{{ c.title }}</strong><small class="num">{{ c.id }} · {{ c.accused }}（{{ c.role }}）</small></div><UiTag size="sm" :tone="c.stage === '审理' ? 'blue' : 'gold'">{{ c.stage }}</UiTag>
    </button>
  </div>
</template>
<style scoped>
.picker{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px}
button{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--r-md);background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-1);text-align:left;color:var(--text-3);transition:all var(--dur)}
button:hover{border-color:var(--red-line)}
button.on{border-color:var(--red);box-shadow:0 0 0 1px var(--red);color:var(--red)}
div{flex:1;min-width:0}
strong{display:block;font-size:14px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
small{font-size:12px;color:var(--text-3)}
</style>
