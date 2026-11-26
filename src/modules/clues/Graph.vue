<script setup lang="ts">
import { computed, onActivated, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Network, Repeat, Workflow } from 'lucide-vue-next'
import { UiCard, UiTag, UiTabs, AiNotice, UiEmpty, UiButton } from '@/design/ui'
import RelationGraph from '@/charts/RelationGraph.vue'
import { requestDossier } from '@/app/useDossierAgent'
import ClueDrawer from './parts/ClueDrawer.vue'
import { useCluesStore } from '@/stores/clues'
import { useSystemStore } from '@/stores/system'

const clues = useCluesStore(), system = useSystemStore(), route = useRoute()
const scope = ref('repeat'), selected = ref(''), openId = ref<string | null>(null)
const typeName: Record<string, string> = { person: '人员', village: '村社', project: '合同/项目', company: '企业', fund: '资金', clue: '线索' }
const view = computed(() => {
  const g = clues.graph
  if (scope.value === 'all') return g
  const keep = new Set<string>()
  g.repeated.forEach(n => { keep.add(n.id); n.clues.forEach(c => keep.add(`c:${c}`)) })
  g.edges.forEach(e => { if (keep.has(e.source) && e.source.startsWith('c:')) keep.add(e.target) })
  return { ...g, nodes: g.nodes.filter(n => keep.has(n.id)), edges: g.edges.filter(e => keep.has(e.source) && keep.has(e.target)) }
})
const node = computed(() => clues.graph.nodes.find(n => n.id === selected.value))
function pick(id: string) { selected.value = selected.value === id ? '' : id; if (node.value) system.log('clues', '查看', node.value.label, '在关联图谱中查看节点关系') }
onActivated(() => { const id = route.query.id ? `c:${route.query.id}` : ''; if (id) { selected.value = id; scope.value = 'all' } })
</script>
<template>
  <div class="page">
    <div class="graph-grid">
      <UiCard :icon="Network" title="线索关联关系图" subtitle="由线索中的人员、村社、合同/项目、企业与资金自动抽取；点击节点查看关联">
        <template #extra><UiTabs v-model="scope" size="sm" :items="[{ value: 'all', label: '全部关系' }, { value: 'repeat', label: '只看多次被举报' }]" /></template>
        <RelationGraph :nodes="view.nodes" :edges="view.edges" :selected="selected" :height="scope === 'all' ? 600 : 480" @select="pick" />
      </UiCard>
      <div class="side">
        <UiCard v-if="node" :title="node.label" :subtitle="`${typeName[node.type]}${node.hint ? ` ${node.hint}` : ''} · 关联 ${node.weight} 条线索`">
          <ul class="linked"><li v-for="id in node.clues" :key="id"><button @click="openId = id"><span class="num">{{ id }}</span><span>{{ clues.byId(id)?.parsed.fields.issue.value || '信访线索' }}</span><UiTag size="sm" :tone="clues.byId(id)?.grading.level === 'high' ? 'red' : clues.byId(id)?.grading.level === 'mid' ? 'orange' : 'yellow'">{{ clues.byId(id)?.channel }}</UiTag></button></li></ul>
          <p v-if="node.weight > 1 && node.type !== 'clue'" class="hint">该{{ typeName[node.type] }}在 {{ node.weight }} 条线索中出现，建议合并研判视角，统筹核查。</p>
          <UiButton v-if="node.type === 'person' || node.type === 'company'" class="agent-btn" block variant="primary" :icon="Workflow" @click="requestDossier(node.label)">交给智能体全景研判</UiButton>
        </UiCard>
        <UiCard :icon="Repeat" title="多次被举报对象" subtitle="同一人、同一项目、同一企业被多次反映">
          <UiEmpty v-if="!clues.graph.repeated.length" title="暂无" />
          <ul class="rank"><li v-for="(n, i) in clues.graph.repeated" :key="n.id" :class="{ on: selected === n.id }" @click="pick(n.id)"><span class="no num">{{ i + 1 }}</span><div><strong>{{ n.label }}</strong><small>{{ typeName[n.type] }} · {{ n.clues.join('、') }}</small></div><b class="num">{{ n.weight }}<small>次</small></b></li></ul>
        </UiCard>
        <AiNotice text="关系图仅辅助发现关联，“利益关联待核”等连线不代表关系成立，不作定性。" />
      </div>
    </div>
    <ClueDrawer :id="openId" @close="openId = null" />
  </div>
</template>
<style scoped>
.graph-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
.side{display:flex;flex-direction:column;gap:16px}
.linked{display:flex;flex-direction:column;gap:4px}
.linked button{width:100%;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;text-align:left;font-size:14px}
.linked button:hover{background:var(--red-25)}
.linked button span:nth-child(2){flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hint{font-size:13px;color:#7A5410;background:var(--cream);border-radius:8px;padding:8px 10px;margin-top:8px}
.rank li{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:8px;cursor:pointer;transition:background var(--dur)}
.rank li:hover,.rank li.on{background:var(--red-25)}
.no{width:22px;height:22px;border-radius:6px;background:var(--red);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.rank li:nth-child(n+4) .no{background:var(--surface-3);color:var(--text-2)}
.rank div{flex:1;min-width:0}
.rank strong{display:block;font-size:14px}
.rank small{font-size:12px;color:var(--text-3)}
.rank b{font-size:18px;color:var(--red)}
.rank b small{font-size:12px;margin-left:1px}
@media(max-width:1200px){.graph-grid{grid-template-columns:1fr}}
.agent-btn{margin-top:12px}
</style>
