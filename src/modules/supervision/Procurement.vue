<script setup lang="ts">
import { computed } from 'vue'
import { Gavel, Building2 } from 'lucide-vue-next'
import { UiCard, UiTag, AiNotice } from '@/design/ui'
import FindingsBoard from './parts/FindingsBoard.vue'
import { useSupervisionStore } from '@/stores/supervision'
import { procurementRules } from '@/engines/supervision'
import { useQueryTab } from '@/app/useQueryTab'
import { townName } from '@/mock/geo'

const store = useSupervisionStore()
const projectId = useQueryTab('project', '')
const projects = store.data.projects
const all = computed(() => store.byFeature('procurement'))
const findings = computed(() => projectId.value ? all.value.filter(x => x.id.includes(projectId.value) || x.subject.includes(projectId.value)) : all.value)
const flags = (id: string) => [...new Set(all.value.filter(x => x.id.includes(id)).map(x => x.rule))]
const min = (p: typeof projects[number]) => Math.min(...p.bids.map(b => b.price))
const max = (p: typeof projects[number]) => Math.max(p.budget, ...p.bids.map(b => b.price))
</script>
<template>
  <div class="page">
    <div class="projects">
      <button v-for="p in projects" :key="p.id" class="proj" :class="{ on: projectId === p.id }" @click="projectId = projectId === p.id ? '' : p.id">
        <div class="ph"><Gavel :size="16" /><strong>{{ p.name }}</strong></div>
        <small class="num">{{ p.id }} · {{ townName(p.town) }} · 预算 {{ (p.budget / 10000).toFixed(1) }} 万</small>
        <ul class="bids"><li v-for="b in p.bids" :key="b.company" :class="{ win: b.company === p.winner }"><span>{{ b.company.replace(/工程有限公司|有限公司|公司/, '') }}</span><i :style="{ width: `${((b.price - min(p) * 0.9) / (max(p) - min(p) * 0.9)) * 100}%` }" /><b class="num">{{ (b.price / 10000).toFixed(2) }}</b></li></ul>
        <div class="flags"><UiTag v-for="r in flags(p.id)" :key="r" size="sm" tone="red">{{ r }}</UiTag><UiTag v-if="!flags(p.id).length" size="sm" tone="green">未见异常</UiTag></div>
      </button>
    </div>
    <UiCard v-if="projectId" :icon="Building2" :title="`已筛选项目：${projectId}`" subtitle="再次点击项目卡片取消筛选" />
    <FindingsBoard :findings="findings" :rules="Object.values(procurementRules)" title="围标串标风险疑点" />
    <AiNotice text="围标串标疑点基于报价、企业登记、标书文本与评分数据比对，仅为线索提示，需结合调查核实。" />
  </div>
</template>
<style scoped>
.projects{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
@media(max-width:1300px){.projects{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}}
.proj{text-align:left;padding:14px 16px;border-radius:var(--r-md);background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-1);transition:all var(--dur);display:flex;flex-direction:column;gap:6px}
.proj:hover{border-color:var(--red-line);transform:translateY(-1px)}
.proj.on{border-color:var(--red);box-shadow:0 0 0 1px var(--red),var(--shadow-2)}
.ph{display:flex;align-items:center;gap:6px;color:var(--red)}
.ph strong{color:var(--text);font-size:14px}
small{font-size:12px;color:var(--text-3)}
.bids{display:flex;flex-direction:column;gap:4px;margin:4px 0}
.bids li{display:grid;grid-template-columns:72px 1fr 44px;align-items:center;gap:6px;font-size:12px;color:var(--text-2)}
.bids li span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bids li i{height:6px;border-radius:3px;background:var(--line-2)}
.bids li.win i{background:var(--red)}
.bids li.win span{color:var(--red);font-weight:600}
.bids b{text-align:right;font-weight:600}
.flags{display:flex;flex-wrap:wrap;gap:4px}
</style>
