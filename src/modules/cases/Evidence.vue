<script setup lang="ts">
import { computed } from 'vue'
import { ListChecks, Workflow, ShieldCheck, ShieldAlert, Check, Plus } from 'lucide-vue-next'
import { UiCard, UiTag, UiButton, AiNotice } from '@/design/ui'
import CasePicker from './parts/CasePicker.vue'
import { useCasesStore } from '@/stores/cases'
import { useSystemStore } from '@/stores/system'
import { evidenceChain } from '@/engines/cases'
import { evidenceRequirements } from '@/mock/cases'
import { toast } from '@/app/toast'

const store = useCasesStore(), system = useSystemStore()
const chain = computed(() => evidenceChain(store.active, evidenceRequirements[store.active.violation] || [], store.supplemented[store.active.id] || []))
const done = computed(() => chain.value.items.filter(i => i.status !== 'missing').length + chain.value.nodes.filter(n => n.ok).length)
const total = computed(() => chain.value.items.length + chain.value.nodes.length)
function add(name: string) { store.supplement(store.active.id, name); system.log('cases', '确认', store.active.id, `人工确认补充：${name}`); toast(`已标记补充「${name}」`) }
</script>
<template>
  <div class="page">
    <CasePicker />
    <div class="banner" :class="{ ready: chain.ready }">
      <component :is="chain.ready ? ShieldCheck : ShieldAlert" :size="22" />
      <div><strong>{{ chain.ready ? '证据要件与程序节点齐全，可提请移送审理' : `尚缺 ${chain.missing} 项证据或程序节点` }}</strong><span>{{ store.active.title }} · 违纪类型：{{ store.active.violation }}</span></div>
      <div class="prog"><i :style="{ width: `${(done / total) * 100}%` }" /></div><b class="num">{{ done }}/{{ total }}</b>
    </div>
    <div class="ev-grid">
      <UiCard :icon="ListChecks" title="要件证据清单" subtitle="按违纪类型对照要件">
        <ul class="items"><li v-for="i in chain.items" :key="i.name" :class="i.status"><span class="mark"><Check v-if="i.status !== 'missing'" :size="13" :stroke-width="3" /></span><strong>{{ i.name }}</strong><UiTag size="sm" :tone="i.status === 'have' ? 'green' : i.status === 'added' ? 'blue' : 'red'">{{ i.status === 'have' ? '已在卷' : i.status === 'added' ? '已补充' : '缺失' }}</UiTag><UiButton v-if="i.status === 'missing' && system.can('confirm')" size="sm" variant="ghost" :icon="Plus" @click="add(i.name)">标记已补充</UiButton></li></ul>
      </UiCard>
      <UiCard :icon="Workflow" title="程序节点" subtitle="谈话审批、告知程序等关键节点">
        <ol class="nodes"><li v-for="n in chain.nodes" :key="n.name" :class="{ ok: n.ok }"><span class="dot" /><div><strong>{{ n.name }}</strong><small class="num">{{ n.date || (n.ok ? '已人工补充' : '未见记录') }}</small></div><UiTag v-if="!n.ok" size="sm" tone="red">程序风险</UiTag><UiButton v-if="!n.ok && system.can('confirm')" size="sm" variant="ghost" :icon="Plus" @click="add(n.name)">标记已完成</UiButton></li></ol>
        <p v-for="o in chain.order" :key="o" class="order">⚠ {{ o }}</p>
      </UiCard>
    </div>
    <AiNotice text="证据链校验依据要件清单提示缺项，证据是否确实充分由审理人员判断。" />
  </div>
</template>
<style scoped>
.banner{display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:var(--r-md);background:var(--red-25);border:1px solid var(--red-line);color:var(--red)}
.banner.ready{background:var(--ok-bg);border-color:var(--ok-line);color:var(--ok)}
.banner strong{display:block;font-size:16px;color:var(--text)}
.banner span{font-size:13px;color:var(--text-2)}
.banner>div:nth-child(2){flex:1}
.prog{width:200px;height:8px;border-radius:4px;background:rgba(255,255,255,.7);overflow:hidden}
.prog i{display:block;height:100%;background:currentColor;transition:width .4s var(--ease)}
.banner b{font-size:18px}
.ev-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.items li{display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--line)}
.items li:last-child{border:0}
.items strong{flex:1;font-size:14px;font-weight:500}
.mark{width:20px;height:20px;border-radius:6px;box-shadow:inset 0 0 0 1.5px var(--red-line);display:flex;align-items:center;justify-content:center;color:#fff}
.have .mark{background:var(--ok);box-shadow:none}
.added .mark{background:var(--info);box-shadow:none}
.nodes li{display:flex;align-items:center;gap:12px;padding:10px 0;position:relative}
.nodes li:not(:last-child)::before{content:"";position:absolute;left:6px;top:28px;bottom:-8px;width:1px;background:var(--line-2)}
.dot{width:13px;height:13px;border-radius:50%;box-shadow:inset 0 0 0 2px var(--red);background:var(--surface);flex:none}
.nodes li.ok .dot{background:var(--ok);box-shadow:none}
.nodes div{flex:1}
.nodes strong{display:block;font-size:14px;font-weight:500}
.nodes small{font-size:12px;color:var(--text-3)}
.order{font-size:13px;color:var(--risk-mid);margin-top:8px}
@media(max-width:1100px){.ev-grid{grid-template-columns:1fr}}
</style>
