<script setup lang="ts">
import { computed, ref } from 'vue'
import { BadgeJapaneseYen, UtensilsCrossed, Receipt, Car } from 'lucide-vue-next'
import { AiNotice } from '@/design/ui'
import FindingsBoard from './parts/FindingsBoard.vue'
import { useSupervisionStore } from '@/stores/supervision'
import { expenseRules } from '@/engines/supervision'

const store = useSupervisionStore()
const board = ref<InstanceType<typeof FindingsBoard>>()
const findings = computed(() => store.byFeature('expense'))
const cards = [
  { rule: expenseRules.allowance, icon: BadgeJapaneseYen, src: '工资发放 · 津补贴目录' },
  { rule: expenseRules.reception, icon: UtensilsCrossed, src: '公务接待清单 · 公函' },
  { rule: expenseRules.meal, icon: Receipt, src: '报销单据 · 电子发票' },
  { rule: expenseRules.car, icon: Car, src: '公车定位 · 派车单' },
]
const stat = (rule: string) => { const list = findings.value.filter(x => x.rule === rule); return { n: list.length, high: list.filter(x => x.level === 'high').length, amount: list.reduce((s, x) => s + (x.amount || 0), 0) } }
</script>
<template>
  <div class="page">
    <div class="cards">
      <button v-for="c in cards" :key="c.rule" class="card" @click="board?.setRule(c.rule)">
        <span class="ic"><component :is="c.icon" :size="20" /></span>
        <div><strong>{{ c.rule }}</strong><small>{{ c.src }}</small></div>
        <div class="nums"><b class="num">{{ stat(c.rule).n }}</b><span>其中红色 {{ stat(c.rule).high }}</span><em v-if="stat(c.rule).amount" class="num">{{ stat(c.rule).amount.toLocaleString() }} 元</em></div>
      </button>
    </div>
    <FindingsBoard ref="board" :findings="findings" :rules="Object.values(expenseRules)" title="四风问题疑点" />
    <AiNotice />
  </div>
</template>
<style scoped>
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.card{display:flex;align-items:center;gap:10px;padding:14px;border-radius:var(--r-md);background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-1);text-align:left;transition:all var(--dur)}
.card:hover{border-color:var(--red-line);transform:translateY(-2px);box-shadow:var(--shadow-2)}
.ic{width:42px;height:42px;border-radius:12px;background:var(--red-50);color:var(--red);display:flex;align-items:center;justify-content:center;flex:none}
.card>div:nth-child(2){flex:1;min-width:0}
strong{display:block;font-size:15px}
small{display:block;font-size:12px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nums{text-align:right}
.nums b{display:block;font-size:26px;line-height:1.1;color:var(--red)}
.nums span,.nums em{display:block;font-size:12px;color:var(--text-3);font-style:normal;white-space:nowrap}
</style>
