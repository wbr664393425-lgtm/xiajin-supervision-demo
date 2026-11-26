<script setup lang="ts">
import { computed, ref } from 'vue'
import { Radio, ShieldCheck, FilePlus2, Eye, EyeOff, Flame } from 'lucide-vue-next'
import { UiCard, UiTag, RiskBadge, UiButton, UiEmpty } from '@/design/ui'
import { useOutreachStore } from '@/stores/outreach'
import { useSystemStore } from '@/stores/system'
import { townName } from '@/mock/geo'
import { toast } from '@/app/toast'

const store = useOutreachStore(), system = useSystemStore()
const sel = ref(store.clusters[0]?.topic || '')
const cluster = computed(() => store.clusters.find(c => c.topic === sel.value))
const days = ['10-28', '10-29', '10-30', '10-31', '11-01', '11-02', '11-03', '11-04']
const spark = (posts: { time: string }[]) => days.map(d => posts.filter(p => p.time.slice(5, 10) === d).length)
const maxSpark = computed(() => Math.max(1, ...store.clusters.flatMap(c => spark(c.posts))))
function decide(d: '已转线索' | '持续关注' | '已忽略') { if (!cluster.value) return; store.alerts[cluster.value.topic] = d; system.log('opinion', '确认', cluster.value.topic, `舆情热点处置：${d}`); toast(d === '已转线索' ? '已转为问题线索，请到信访模块登记研判' : `已标记：${d}`, 'ok', d === '已转线索' ? { label: '去登记', to: '/clues/intake' } : undefined) }
</script>
<template>
  <div class="page">
    <div class="compliance"><ShieldCheck :size="16" />仅对授权的属地公开平台与社区群开展语义监测，遵守网络信息管理规定，不采集个人身份信息。</div>
    <div class="op-grid">
      <UiCard :icon="Radio" title="热点诉求聚类" :subtitle="`近 8 天 ${store.posts.length} 条帖文 → ${store.clusters.length} 个话题`" flush>
        <ul class="clusters"><li v-for="c in store.clusters" :key="c.topic"><button :class="{ on: sel === c.topic }" @click="sel = c.topic">
          <div class="ch"><strong>{{ c.topic }}</strong><RiskBadge v-if="c.level" :level="c.level" :label="c.level === 'high' ? '苗头预警' : c.level === 'mid' ? '持续升温' : '一般关注'" /></div>
          <div class="cm"><UiTag size="sm" :tone="c.category === '作风问题' ? 'red' : c.category === '基层治理' ? 'gold' : 'blue'">{{ c.category }}</UiTag><span>{{ c.posts.length }} 条 · <Flame :size="12" /> {{ c.heat }}</span><span>{{ c.towns.map(townName).join('、') }}</span></div>
          <div class="spark"><i v-for="(v, i) in spark(c.posts)" :key="i" :style="{ height: `${(v / maxSpark) * 100}%` }" /></div>
          <UiTag v-if="store.alerts[c.topic]" size="sm" tone="green">{{ store.alerts[c.topic] }}</UiTag>
        </button></li></ul>
      </UiCard>
      <UiCard v-if="cluster" :title="cluster.topic" :subtitle="`首次 ${cluster.first} · 最近 ${cluster.last} · 负面表达 ${cluster.negative} 条`">
        <ul class="posts"><li v-for="p in cluster.posts" :key="p.id"><div class="ph"><UiTag size="sm" tone="gray">{{ p.platform }}</UiTag><span class="num">{{ p.time }}</span><span>{{ townName(p.town) }}</span><span class="heat"><Flame :size="12" />{{ p.heat }}</span></div><p>{{ p.text }}</p></li></ul>
        <template #footer><span class="muted note">处置结果记入审计日志</span><span class="spacer" /><UiButton size="sm" variant="ghost" :icon="EyeOff" @click="decide('已忽略')">忽略</UiButton><UiButton size="sm" variant="secondary" :icon="Eye" @click="decide('持续关注')">持续关注</UiButton><UiButton v-if="system.can('task')" size="sm" variant="primary" :icon="FilePlus2" @click="decide('已转线索')">转为问题线索</UiButton></template>
      </UiCard>
      <UiEmpty v-else title="选择左侧话题" />
    </div>
  </div>
</template>
<style scoped>
.compliance{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:var(--r-md);background:var(--info-bg);color:var(--info);font-size:13px}
.op-grid{display:grid;grid-template-columns:420px minmax(0,1fr);gap:16px;align-items:start}
.clusters button{width:100%;text-align:left;padding:12px 16px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:6px}
.clusters button.on{background:var(--red-25);box-shadow:inset 3px 0 0 var(--red)}
.ch{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ch strong{font-size:15px}
.cm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--text-3)}
.cm span{display:inline-flex;align-items:center;gap:3px}
.spark{display:flex;align-items:flex-end;gap:3px;height:26px}
.spark i{flex:1;background:var(--red-line);border-radius:2px 2px 0 0;min-height:2px}
.clusters button.on .spark i{background:var(--red)}
.posts{display:flex;flex-direction:column;gap:8px}
.posts li{padding:10px 12px;border-radius:8px;background:var(--surface-2);border:1px solid var(--line)}
.ph{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-3);margin-bottom:4px}
.heat{display:inline-flex;align-items:center;gap:2px;margin-left:auto;color:var(--risk-mid)}
.posts p{font-size:14px;line-height:1.7}
.note{font-size:13px}
@media(max-width:1100px){.op-grid{grid-template-columns:1fr}}
</style>
