<script setup lang="ts">
import { computed } from 'vue'
import { Scale, Fingerprint } from 'lucide-vue-next'
import { UiCard, UiTag, AiNotice, UiEmpty } from '@/design/ui'
import BarList from '@/charts/BarList.vue'
import CasePicker from './parts/CasePicker.vue'
import { useCasesStore } from '@/stores/cases'
import { similarTo, caseBehaviors } from '@/engines/cases'
import { similarCases } from '@/mock/cases'

const store = useCasesStore()
const list = computed(() => similarTo(store.active, similarCases))
const behaviors = computed(() => caseBehaviors(store.active))
const dist = computed(() => { const m: Record<string, number> = {}; list.value.forEach(s => { m[s.result] = (m[s.result] || 0) + 1 }); return Object.entries(m).map(([label, value]) => ({ label, value, color: 'var(--gold)' })).sort((a, b) => b.value - a.value) })
</script>
<template>
  <div class="page">
    <CasePicker />
    <div class="sim-grid">
      <div class="stack">
        <UiCard :icon="Fingerprint" title="本案要素" :subtitle="store.active.title">
          <dl class="feat"><div><dt>违纪类型</dt><dd>{{ store.active.violation }}</dd></div><div><dt>职务</dt><dd>{{ store.active.role }}</dd></div><div><dt>情节</dt><dd><UiTag v-for="b in behaviors" :key="b" size="sm" tone="gold">{{ b }}</UiTag></dd></div></dl>
        </UiCard>
        <UiCard title="同类案件处理结果分布" subtitle="仅供参考尺度"><BarList :items="dist" unit="件" /><UiEmpty v-if="!dist.length" title="暂无" /></UiCard>
      </div>
      <UiCard :icon="Scale" title="类案推送" :subtitle="`本县、省内已办结同类案例 ${list.length} 件`">
        <ul class="cases"><li v-for="s in list" :key="s.id">
          <div class="ring" :style="{ '--p': s.score }"><span class="num">{{ s.score }}%</span></div>
          <div class="body"><div class="row"><strong>{{ s.title }}</strong><UiTag size="sm" :tone="s.region === '本县' ? 'red' : 'blue'">{{ s.region }}</UiTag><span class="muted num yr">{{ s.year }}</span></div>
            <div class="reasons"><span v-for="r in s.reasons" :key="r">{{ r }}</span></div>
            <p class="res">处理结果（参考）：<b>{{ s.result }}</b>{{ s.amount ? ` · 涉及 ${s.amount.toLocaleString()} 元` : '' }}</p></div>
        </li></ul>
      </UiCard>
    </div>
    <AiNotice text="类案仅用于参考量纪尺度、促进统一平衡，不替代集体研究和审理定性。" />
  </div>
</template>
<style scoped>
.sim-grid{display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px;align-items:start}
.stack{display:flex;flex-direction:column;gap:16px}
.feat{margin:0;display:flex;flex-direction:column;gap:10px}
dt{font-size:12px;color:var(--text-3)}
dd{margin:2px 0 0;font-size:14px;display:flex;flex-wrap:wrap;gap:4px}
.cases{display:flex;flex-direction:column;gap:10px}
.cases li{display:flex;gap:14px;padding:14px;border-radius:var(--r-md);border:1px solid var(--line);background:var(--surface-2);animation:rise var(--dur) var(--ease) both}
.ring{--p:50;width:56px;height:56px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--red) calc(var(--p)*1%),var(--surface-3) 0)}
.ring span{width:46px;height:46px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--red)}
.body{flex:1;min-width:0}
.body strong{font-size:15px}
.yr{font-size:12px;margin-left:auto}
.reasons{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.reasons span{font-size:12px;padding:1px 8px;border-radius:5px;background:var(--cream);color:#7A5410}
.res{font-size:13px;color:var(--text-2)}
.res b{color:var(--text)}
@media(max-width:1100px){.sim-grid{grid-template-columns:1fr}}
</style>
