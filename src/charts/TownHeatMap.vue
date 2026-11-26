<script setup lang="ts">
import { computed, ref } from 'vue'
import { towns } from '@/mock/geo'
import { countyOutline, townLayout, MAP_W, MAP_H, type MapPoint } from '@/mock/xiajin-map'
import type { RiskLevel } from '@/types'
/**
 * 县域风险一张图：在夏津县界内按演示点做 Voronoi 剖分，显示样例数据的风险等级。
 */
const props = withDefaults(defineProps<{ data: Record<string, { count: number; level: RiskLevel | null }>; selected?: string; legend?: boolean }>(), { legend: true })
const emit = defineEmits<{ select: [townId: string] }>()
type P = MapPoint
const outline = countyOutline
const seeds = townLayout
function clip(poly: P[], a: P, b: P): P[] {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = b[0] - a[0], ny = b[1] - a[1]
  const side = (p: P) => (p[0] - mx) * nx + (p[1] - my) * ny
  const out: P[] = []
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i]!, d = poly[(i + 1) % poly.length]!, sc = side(c), sd = side(d)
    if (sc <= 0) out.push(c)
    if ((sc < 0 && sd > 0) || (sc > 0 && sd < 0)) { const t = sc / (sc - sd); out.push([c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t]) }
  }
  return out
}
const cells = computed(() => towns.map(t => {
  let poly = outline
  for (const o of towns) if (o.id !== t.id) poly = clip(poly, seeds[t.id]!, seeds[o.id]!)
  const d = 'M' + poly.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z'
  // 面积质心作为标签位置；多边形退化时回落到分区中心
  let A = 0, X = 0, Y = 0
  for (let i = 0; i < poly.length; i++) { const p = poly[i]!, q = poly[(i + 1) % poly.length]!, c = p[0] * q[1] - q[0] * p[1]; A += c; X += (p[0] + q[0]) * c; Y += (p[1] + q[1]) * c }
  const seat = seeds[t.id]!
  const cx = Math.abs(A) > 1 ? X / (3 * A) : seat[0], cy = Math.abs(A) > 1 ? Y / (3 * A) : seat[1]
  const small = Math.abs(A) / 2 < 2600
  return { ...t, d, cx, cy, small, info: props.data[t.id] || { count: 0, level: null } }
}))
const outlinePath = 'M' + outline.map(p => p.join(',')).join('L') + 'Z'
const hover = ref('')
const hot = computed(() => cells.value.find(c => c.id === hover.value))
const grad = (l: RiskLevel | null) => l ? `url(#g-${l})` : 'url(#g-none)'
const ink = (l: RiskLevel | null) => l === 'high' || l === 'mid' ? '#fff' : l === 'low' ? '#5B4A2E' : 'var(--map-none-ink)'
const total = computed(() => cells.value.reduce((s, c) => s + c.info.count, 0))
</script>
<template>
  <div class="county">
    <svg :viewBox="`0 0 ${MAP_W} ${MAP_H}`" role="img" aria-label="夏津县乡镇风险分布图" @mouseleave="hover = ''">
      <defs>
        <linearGradient id="g-high" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E5393D" /><stop offset="1" stop-color="#B81216" /></linearGradient>
        <linearGradient id="g-mid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F29A4A" /><stop offset="1" stop-color="#DB6A1F" /></linearGradient>
        <linearGradient id="g-low" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8D978" /><stop offset="1" stop-color="#E9B23A" /></linearGradient>
        <linearGradient id="g-none" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--map-none-1)" /><stop offset="1" stop-color="var(--map-none-2)" /></linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#7A1A0B" flood-opacity=".22" /></filter>
        <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" fill="var(--map-dots)" /></pattern>
      </defs>
      <rect x="0" y="0" :width="MAP_W" :height="MAP_H" fill="url(#dots)" opacity=".7" rx="12" />
      <g class="compass" :transform="`translate(${MAP_W - 26},${MAP_H - 26})`"><circle r="14" fill="var(--surface)" stroke="var(--line-2)" /><path d="M0,-10 L4,2 L0,-1 L-4,2Z" fill="var(--red)" /><text y="11" text-anchor="middle">北</text></g>
      <path :d="outlinePath" transform="translate(0,10)" fill="var(--map-base)" opacity=".9" />
      <g filter="url(#soft)">
        <path v-for="c in cells" :key="c.id + 's'" :d="c.d" transform="translate(0,7)" :fill="c.info.level === 'high' ? '#8E0C10' : c.info.level === 'mid' ? '#A8501A' : c.info.level === 'low' ? '#B98A22' : 'var(--map-none-side)'" />
      </g>
      <g v-for="c in cells" :key="c.id" class="cell" :class="{ sel: selected === c.id, hov: hover === c.id }" tabindex="0" role="button" :aria-label="`${c.name}，疑点线索 ${c.info.count} 条`" @mouseenter="hover = c.id" @focus="hover = c.id" @click="emit('select', c.id)" @keydown.enter="emit('select', c.id)">
        <path :d="c.d" :fill="grad(c.info.level)" />
        <circle v-if="c.info.level === 'high'" :cx="c.cx" :cy="c.cy - (c.small ? 18 : 22)" r="4.5" class="pulse" />
        <text :x="c.cx" :y="c.cy - 2" text-anchor="middle" :fill="ink(c.info.level)" class="name" :class="{ sm: c.small }">{{ c.name }}</text>
        <text :x="c.cx" :y="c.cy + (c.small ? 13 : 16)" text-anchor="middle" :fill="ink(c.info.level)" class="count num" :class="{ sm: c.small }">{{ c.info.count }}</text>
      </g>
      <path :d="outlinePath" fill="none" stroke="var(--map-edge)" stroke-width="2.2" stroke-linejoin="round" opacity=".55" pointer-events="none" />
    </svg>
    <div v-if="hot" class="tip" :style="{ left: `${(hot.cx / MAP_W) * 100}%`, top: `${(hot.cy / MAP_H) * 100}%` }"><strong>{{ hot.name }}</strong><span>疑点线索 <b class="num">{{ hot.info.count }}</b> 条 · 占全县 {{ total ? Math.round((hot.info.count / total) * 100) : 0 }}%</span><em>{{ hot.info.level === 'high' ? '红色预警' : hot.info.level === 'mid' ? '橙色预警' : hot.info.level === 'low' ? '黄色关注' : '暂无疑点' }} · 点击查看</em></div>
    <div v-if="legend" class="legend"><span><i class="h" />红色预警 ≥5</span><span><i class="m" />橙色 3–4</span><span><i class="l" />黄色 1–2</span><span><i class="n" />暂无</span><em>乡镇名称与位置均为演示示意</em></div>
  </div>
</template>
<style scoped>
.county{position:relative}
svg{width:100%;height:auto;display:block}
.cell{cursor:pointer;outline:none}
.cell path{stroke:#fff;stroke-width:2;stroke-linejoin:round;transition:transform 220ms var(--ease),filter 220ms}
.cell.hov path,.cell:focus-visible path{transform:translateY(-4px);filter:brightness(1.07) saturate(1.05)}
.cell.sel path{stroke:#3A1410;stroke-width:2.6}
.cell.hov text{transform:translateY(-4px)}
.cell text{transition:transform 220ms var(--ease);pointer-events:none}
.name{font-size:12px;font-weight:700;letter-spacing:.04em;paint-order:stroke;stroke:rgba(0,0,0,.06);stroke-width:2px}
.count{font-size:16px;font-weight:800}
.name.sm{font-size:11px;letter-spacing:0}
.count.sm{font-size:13px}
.pulse{fill:#fff;opacity:.9;transform-box:fill-box;transform-origin:center;animation:pulse 1.8s ease-out infinite}
@keyframes pulse{0%{opacity:.95;transform:scale(.7)}70%{opacity:0;transform:scale(2.4)}100%{opacity:0}}
.compass text{font-size:9px;fill:var(--accent-ink);font-weight:700}
.tip{position:absolute;transform:translate(-50%,calc(-100% - 22px));background:rgba(43,35,33,.94);color:#fff;border-radius:10px;padding:8px 12px;font-size:12px;line-height:1.6;white-space:nowrap;pointer-events:none;box-shadow:var(--shadow-2);animation:fade 140ms}
.tip strong{display:block;font-size:14px}
.tip span,.tip em{display:block;font-style:normal;color:#EADFCF}
.tip b{color:#FFD27A;font-size:14px}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--text-2);margin-top:8px}
.legend span{display:inline-flex;align-items:center;gap:5px}
.legend i{width:12px;height:12px;border-radius:3px}
.legend .h{background:linear-gradient(135deg,#E5393D,#B81216)}.legend .m{background:linear-gradient(135deg,#F29A4A,#DB6A1F)}.legend .l{background:linear-gradient(135deg,#F8D978,#E9B23A)}.legend .n{background:var(--map-none-2)}
.legend em{font-style:normal;color:var(--text-3);margin-left:auto}
@media(prefers-reduced-motion:reduce){.pulse{animation:none}}
</style>
