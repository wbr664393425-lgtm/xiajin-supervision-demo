<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Landmark, HandCoins, MessageSquareWarning, ArrowUpRight, Megaphone, Flag } from 'lucide-vue-next'
import { UiCard, UiTag, RiskBadge, UiButton, UiEmpty, AiNotice } from '@/design/ui'
import { useRiskStore, type RiskItem } from '@/stores/risk'
import { townName } from '@/mock/geo'

const risk = useRiskStore(), router = useRouter()
/** 集中整治聚焦的三个领域：农村集体“三资”、惠民惠农资金、群众反映强烈的身边问题 */
const fields = [
  { domain: '三资管理', title: '农村集体“三资”', icon: Landmark, to: '/supervision/assets' },
  { domain: '惠民资金', title: '惠民惠农资金', icon: HandCoins, to: '/supervision/subsidy' },
  { domain: '信访线索', title: '群众反映的身边问题', icon: MessageSquareWarning, to: '/clues/grading' },
]
const items = computed(() => risk.items.filter(i => fields.some(f => f.domain === i.domain)))
const handled = computed(() => items.value.filter(i => i.status !== 'open').length)
const progress = computed(() => items.value.length ? handled.value / items.value.length : 0)
const stat = (domain: string) => {
  const list = items.value.filter(i => i.domain === domain)
  return { total: list.length, high: list.filter(i => i.level === 'high').length, confirmed: list.filter(i => i.status === 'confirmed').length, amount: list.reduce((s, i) => s + (i.amount || 0), 0) }
}
const domain = ref(''), state = ref<'' | RiskItem['status']>('')
const order = { high: 0, mid: 1, low: 2 }
const rows = computed(() => items.value.filter(i => (!domain.value || i.domain === domain.value) && (!state.value || i.status === state.value)).sort((a, b) => order[a.level] - order[b.level] || (b.amount || 0) - (a.amount || 0)))
const byTown = computed(() => {
  const m = new Map<string, number>()
  items.value.filter(i => i.status !== 'dismissed' && i.town).forEach(i => m.set(i.town!, (m.get(i.town!) || 0) + 1))
  return [...m.entries()].map(([id, n]) => ({ id, name: townName(id), n })).sort((a, b) => b.n - a.n).slice(0, 8)
})
const money = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)} 万元` : `${n.toLocaleString()} 元`
const statusText = { open: '待研判', confirmed: '已转核查', dismissed: '已排除' }
</script>
<template>
  <div class="page">
    <section class="banner">
      <span class="flag"><Flag :size="22" /></span>
      <div class="bt"><h2>群众身边不正之风和腐败问题集中整治</h2><p>聚焦农村集体“三资”、惠民惠农资金和群众反映强烈的身边问题，数据比对发现、线索归集、逐条销号</p></div>
      <div class="bp">
        <div class="bpn"><span>问题处置进度</span><strong class="num">{{ handled }}<small> / {{ items.length }}</small></strong></div>
        <div class="bar"><i :style="{ width: `${progress * 100}%` }" /></div>
      </div>
    </section>

    <div class="fields">
      <button v-for="f in fields" :key="f.domain" class="field" :class="{ on: domain === f.domain }" @click="domain = domain === f.domain ? '' : f.domain">
        <span class="fi"><component :is="f.icon" :size="20" /></span>
        <div class="fb">
          <strong>{{ f.title }}</strong>
          <div class="fn"><span><b class="num">{{ stat(f.domain).total }}</b>问题</span><span class="h"><b class="num">{{ stat(f.domain).high }}</b>红色</span><span class="c"><b class="num">{{ stat(f.domain).confirmed }}</b>已转核查</span></div>
          <small v-if="stat(f.domain).amount">涉及金额 {{ money(stat(f.domain).amount) }}</small>
        </div>
        <RouterLink :to="f.to" class="go" :aria-label="`进入${f.title}`" @click.stop><ArrowUpRight :size="15" /></RouterLink>
      </button>
    </div>

    <div class="grid">
      <UiCard flush>
        <template #title><span>专题问题清单 <span class="muted num">{{ rows.length }} 条</span></span></template>
        <template #extra>
          <div class="seg"><button v-for="s in ([['', '全部'], ['open', '待研判'], ['confirmed', '已转核查'], ['dismissed', '已排除']] as const)" :key="s[0]" :class="{ on: state === s[0] }" @click="state = s[0]">{{ s[1] }}</button></div>
        </template>
        <UiEmpty v-if="!rows.length" title="没有符合条件的问题" />
        <div v-else class="tbl-wrap"><table class="tbl">
          <thead><tr><th>分级</th><th>问题</th><th>领域</th><th>乡镇</th><th style="text-align:right">涉及金额</th><th>状态</th></tr></thead>
          <tbody><tr v-for="i in rows" :key="i.id" style="cursor:pointer" @click="router.push(i.to)">
            <td><RiskBadge :level="i.level" /></td><td><strong class="t">{{ i.title }}</strong></td>
            <td><UiTag size="sm" tone="gold">{{ fields.find(f => f.domain === i.domain)?.title }}</UiTag></td>
            <td>{{ i.town ? townName(i.town) : '—' }}</td>
            <td class="num" style="text-align:right">{{ i.amount ? i.amount.toLocaleString() : '—' }}</td>
            <td><UiTag size="sm" :tone="i.status === 'confirmed' ? 'green' : i.status === 'dismissed' ? 'gray' : 'ai'">{{ statusText[i.status] }}</UiTag></td>
          </tr></tbody>
        </table></div>
      </UiCard>
      <div class="side">
        <UiCard title="乡镇分布" subtitle="未排除的问题数">
          <ol class="rank"><li v-for="(t, i) in byTown" :key="t.id" @click="router.push({ path: '/supervision/riskmap', query: { town: t.name } })"><span class="no num">{{ i + 1 }}</span><span class="nm">{{ t.name }}</span><i :style="{ width: `${(t.n / (byTown[0]?.n || 1)) * 100}%` }" /><b class="num">{{ t.n }}</b></li></ol>
        </UiCard>
        <UiCard :icon="Megaphone" title="以案促改" subtitle="典型问题转化为警示教育素材">
          <p class="muted tip">对查实的典型问题，可生成警示教育通报、案例剖析，在全县村（社区）“两委”干部中通报。</p>
          <UiButton block variant="soft" :icon="Megaphone" @click="router.push('/archive/materials')">生成警示教育素材</UiButton>
        </UiCard>
      </div>
    </div>
    <AiNotice text="专题清单由数据比对与信访研判自动归集，均为待核实问题；是否立行立改、移交线索由纪检干部研判决定。" />
  </div>
</template>
<style scoped>
.page{display:flex;flex-direction:column;gap:16px}
.banner{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:16px 22px;border-radius:var(--r-lg);background:var(--brand-grad);color:var(--on-brand);box-shadow:var(--shadow-red)}
.flag{width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;color:var(--brand-accent-ink);flex:none}
.bt{flex:1;min-width:280px}
.bt h2{font-size:18px;font-weight:700;letter-spacing:.04em}
.bt p{font-size:13px;opacity:.94;margin-top:2px}
.bp{width:260px}
.bpn{display:flex;align-items:baseline;justify-content:space-between}
.bpn span{font-size:12px;opacity:.94}
.bpn strong{font-size:24px;color:var(--brand-accent-ink)}
.bpn small{font-size:14px;opacity:.94}
.banner .bar{height:7px;border-radius:4px;background:rgba(255,255,255,.2);overflow:hidden;margin-top:6px}
.banner .bar i{display:block;height:100%;background:var(--brand-accent-ink);border-radius:4px}
.fields{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.field{position:relative;display:flex;align-items:flex-start;gap:12px;padding:14px 16px;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow-1);transition:border-color var(--dur),box-shadow var(--dur)}
.field:hover{border-color:var(--red-line)}
.field.on{border-color:var(--red);box-shadow:0 0 0 1px var(--red)}
.fi{width:40px;height:40px;border-radius:10px;background:var(--red-50);color:var(--red);display:flex;align-items:center;justify-content:center;flex:none}
.fb{flex:1;min-width:0}
.fb strong{font-size:15px;font-weight:700}
.fn{display:flex;gap:14px;margin:4px 0 2px;font-size:12px;color:var(--text-3)}
.fn b{font-size:20px;color:var(--text);margin-right:3px;font-weight:700}
.fn .h b{color:var(--risk-high)}
.fn .c b{color:var(--ok)}
.fb small{font-size:12px;color:var(--text-3)}
.go{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-3)}
.go:hover{background:var(--red-25);color:var(--red)}
.grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start}
.side{display:flex;flex-direction:column;gap:16px}
.seg{display:flex;gap:2px;padding:2px;border-radius:8px;background:var(--surface-3)}
.seg button{height:26px;padding:0 10px;border-radius:6px;font-size:12.5px;color:var(--text-2)}
.seg button.on{background:var(--surface);color:var(--red);font-weight:600;box-shadow:var(--shadow-1)}
.t{font-weight:600}
.tbl td:nth-child(4),.tbl td:nth-child(3){white-space:nowrap}
.rank{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.rank li{display:grid;grid-template-columns:18px 72px 1fr 24px;align-items:center;gap:6px;font-size:13px;cursor:pointer}
.no{width:18px;height:18px;border-radius:5px;background:var(--surface-3);font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:700}
.rank li:nth-child(-n+3) .no{background:var(--red);color:#fff}
.rank i{height:6px;border-radius:3px;background:var(--risk-mid)}
.rank b{text-align:right}
.nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tip{font-size:13px;line-height:1.6;margin-bottom:12px}
@media(max-width:1300px){.grid{grid-template-columns:1fr}.fields{grid-template-columns:1fr}}
</style>
