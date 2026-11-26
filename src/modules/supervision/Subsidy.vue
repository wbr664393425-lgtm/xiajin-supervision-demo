<script setup lang="ts">
import { computed, ref } from 'vue'
import { Database, Users, Map, HeartPulse, PiggyBank, Wallet, Play, Check } from 'lucide-vue-next'
import { UiCard, UiButton, AiNotice } from '@/design/ui'
import FindingsBoard from './parts/FindingsBoard.vue'
import { useSupervisionStore } from '@/stores/supervision'
import { useSystemStore } from '@/stores/system'
import { subsidyRules } from '@/engines/supervision'

const store = useSupervisionStore(), system = useSystemStore()
const d = store.data
const findings = computed(() => store.byFeature('subsidy'))
const sources = [
  { name: '补贴发放', icon: Wallet, n: d.grants.length, note: '一卡通发放明细' },
  { name: '户籍', icon: Users, n: d.residents.length, note: '公安人口库（死亡/迁出）' },
  { name: '耕地确权', icon: Map, n: d.lands.length, note: '农业农村确权登记' },
  { name: '医保', icon: HeartPulse, n: d.insurance.length, note: '医保参保类型' },
  { name: '养老', icon: PiggyBank, n: d.insurance.length, note: '养老保险类别' },
]
const running = ref(false), ran = ref(true), step = ref(5)
const ruleHits = computed(() => Object.values(subsidyRules).map(r => ({ r, n: findings.value.filter(x => x.rule === r).length, amount: findings.value.filter(x => x.rule === r).reduce((s, x) => s + (x.amount || 0), 0) })))
async function run() { running.value = true; ran.value = false; for (step.value = 0; step.value < 5; step.value++) await new Promise(r => setTimeout(r, 260)); running.value = false; ran.value = true; system.log('supervision', '生成', '惠民资金比对', `多表比对完成，产生 ${findings.value.length} 条疑点`) }
</script>
<template>
  <div class="page">
    <UiCard title="多源数据比对模型" :icon="Database" subtitle="补贴发放 × 户籍 × 耕地 × 医保 × 养老，筛查一人多领、死亡继续领取、重复申领、资格不符">
      <template #extra><UiButton variant="primary" size="sm" :icon="Play" :loading="running" @click="run">重新比对</UiButton></template>
      <div class="model">
        <div class="sources"><div v-for="(s, i) in sources" :key="s.name" class="src" :class="{ lit: i < step }"><component :is="s.icon" :size="18" /><div><strong>{{ s.name }}</strong><small>{{ s.note }}</small></div><b class="num">{{ s.n }}</b><Check v-if="i < step" :size="14" class="ok" /></div></div>
        <div class="flow" :class="{ on: ran }"><span /><em>关联键：身份证号 · 地块编号</em><span /></div>
        <div class="hits"><div v-for="h in ruleHits" :key="h.r" class="hit" :class="{ show: ran }"><span>{{ h.r }}</span><strong class="num">{{ h.n }}<small>条</small></strong><em class="num">{{ h.amount.toLocaleString() }} 元</em></div></div>
      </div>
      <p class="muted note">正式部署经政务共享平台授权接入，身份证号全程脱敏展示。</p>
    </UiCard>
    <FindingsBoard :findings="findings" :rules="Object.values(subsidyRules)" title="惠民资金疑点" />
    <AiNotice />
  </div>
</template>
<style scoped>
.model{display:grid;grid-template-columns:minmax(0,1.2fr) 120px minmax(0,1fr);gap:16px;align-items:center}
.sources{display:flex;flex-direction:column;gap:6px}
.src{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface-2);color:var(--text-3);transition:all var(--dur)}
.src.lit{border-color:var(--red-line);background:var(--red-25);color:var(--red)}
.src div{flex:1}
.src strong{display:block;font-size:14px;color:var(--text)}
.src small{font-size:12px;color:var(--text-3)}
.src b{font-size:16px;color:var(--text)}
.ok{color:var(--ok)}
.flow{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.flow span{width:2px;height:40px;background:var(--line-2);transition:background .4s}
.flow.on span{background:var(--red)}
.flow em{font-style:normal;font-size:12px;color:var(--text-3)}
.hits{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hit{padding:12px;border-radius:10px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-1);opacity:.35;transition:opacity .4s}
.hit.show{opacity:1}
.hit span{font-size:13px;color:var(--text-2)}
.hit strong{display:block;font-size:24px;color:var(--red);line-height:1.2}
.hit strong small{font-size:12px;color:var(--text-3);margin-left:2px}
.hit em{font-style:normal;font-size:12px;color:var(--text-3)}
.note{font-size:12px;margin-top:10px}
</style>
