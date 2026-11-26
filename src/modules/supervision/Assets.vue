<script setup lang="ts">
import { computed } from 'vue'
import { FileSignature, Wallet, Scale, Warehouse, ScanLine, Check } from 'lucide-vue-next'
import { UiCard, UiStat, UiTabs, UiTag, UiButton } from '@/design/ui'
import FindingsBoard from './parts/FindingsBoard.vue'
import { useSupervisionStore } from '@/stores/supervision'
import { assetRules } from '@/engines/supervision'
import { useQueryTab } from '@/app/useQueryTab'
import { townName } from '@/mock/geo'

const store = useSupervisionStore()
const view = useQueryTab('view', 'findings')
if (view.value === 'ocr') view.value = 'findings'
const { contracts, receipts, idleAssets } = store.data
const findings = computed(() => store.byFeature('assets'))
const ledger = computed(() => contracts.map(c => { const got = receipts.filter(r => r.contractId === c.id).reduce((s, r) => s + r.amount, 0); return { ...c, got, gap: c.annualRent - got, ratio: got / c.annualRent, flags: findings.value.filter(x => x.id.startsWith(`AS-${c.id}-`)).map(x => x.rule) } }))
const total = computed(() => ({ rent: contracts.reduce((s, c) => s + c.annualRent, 0), got: receipts.reduce((s, r) => s + r.amount, 0) }))
const w = (n: number) => (n / 10000).toFixed(1)

</script>
<template>
  <div class="page">
    <div class="stats">
      <UiStat label="监管租赁合同" :value="contracts.length" unit="份" :icon="FileSignature" tone="blue" />
      <UiStat label="应收租金 / 已收" :value="`${w(total.rent)} / ${w(total.got)}`" unit="万元" :icon="Wallet" tone="gold" />
      <UiStat label="待核差额" :value="w(total.rent - total.got)" unit="万元" :icon="Scale" tone="red" />
      <UiStat label="闲置资产" :value="idleAssets.length" unit="处" :icon="Warehouse" tone="orange" />
    </div>
    <UiTabs v-model="view" :items="[{ value: 'findings', label: '风险疑点', count: findings.length }, { value: 'ledger', label: '合同与流水比对' }]" />

    <FindingsBoard v-if="view === 'findings'" :findings="findings" :rules="Object.values(assetRules)" title="三资风险疑点" />

    <UiCard v-else-if="view === 'ledger'" title="合同租期、租金与收款流水比对" subtitle="合同台账 × 银行流水 × 收款凭证" flush>
      <template #extra><UiButton size="sm" variant="soft" :icon="ScanLine" @click="$router.push('/assistant/multimodal?kind=contract')">合同、票据照片识别</UiButton></template>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>合同</th><th>标的 / 承租方</th><th>租期</th><th style="text-align:right">年租金</th><th style="width:200px">已收进度</th><th>比对结果</th></tr></thead>
        <tbody><tr v-for="c in ledger" :key="c.id">
          <td class="num">{{ c.id }}<div class="muted sub">{{ townName(c.town) }}{{ c.village }}</div></td>
          <td>{{ c.asset }}<div class="muted sub">{{ c.tenant }}</div></td>
          <td class="num sub">{{ c.start }}<br />{{ c.end }}</td>
          <td class="num" style="text-align:right">{{ c.annualRent.toLocaleString() }}<div class="muted sub">参考 {{ c.marketRent.toLocaleString() }}</div></td>
          <td><div class="bar"><i :style="{ width: `${Math.min(100, c.ratio * 100)}%` }" :class="{ warn: c.ratio < 1 }" /></div><span class="sub num">{{ c.got.toLocaleString() }} 元 · {{ Math.round(c.ratio * 100) }}%</span></td>
          <td><div class="chips"><UiTag v-for="r in c.flags" :key="r" size="sm" :tone="r === '非对公收款' ? 'yellow' : 'red'">{{ r }}</UiTag><UiTag v-if="!c.flags.length" size="sm" tone="green" :icon="Check">一致</UiTag></div></td>
        </tr></tbody>
      </table></div>
    </UiCard>

  </div>
</template>
<style scoped>
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.sub{font-size:12px}
.chips{display:flex;flex-wrap:wrap;gap:4px}
.bar{height:7px;border-radius:4px;background:var(--surface-3);overflow:hidden;margin:6px 0 3px}
.bar i{display:block;height:100%;background:var(--ok);border-radius:4px}
.bar i.warn{background:var(--risk-high)}
dt{font-size:13px;color:var(--text-3)}
dd{margin:0;font-size:14px;font-weight:600}
</style>
