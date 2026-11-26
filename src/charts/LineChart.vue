<script setup lang="ts">
import { computed, ref } from 'vue'
const props = withDefaults(defineProps<{ labels: string[]; series: { name: string; color: string; values: number[] }[]; height?: number; unit?: string }>(), { height: 220, unit: '' })
const W = 640, P = { l: 34, r: 12, t: 14, b: 26 }
const hover = ref<number | null>(null)
const max = computed(() => {
  const m = Math.max(1, ...props.series.flatMap(s => s.values))
  if (m <= 4) return 4
  if (m <= 8) return 8
  if (m <= 10) return 10
  if (m <= 12) return 12
  if (m <= 20) return Math.ceil(m / 4) * 4
  const mag = Math.pow(10, Math.floor(Math.log10(m)))
  const norm = m / mag
  const nice = norm <= 1.2 ? 1.2 : norm <= 2 ? 2 : norm <= 4 ? 4 : norm <= 5 ? 5 : norm <= 8 ? 8 : 10
  return Math.ceil(nice * mag)
})
const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, props.labels.length - 1)
const y = (v: number) => P.t + (1 - v / max.value) * (props.height - P.t - P.b)
const paths = computed(() => props.series.map(s => { const pts = s.values.map((v, i) => [x(i), y(v)] as const); const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(''); return { ...s, line, area: `${line}L${x(s.values.length - 1)},${y(0)}L${x(0)},${y(0)}Z` } }))
const ticks = computed(() => {
  const divisions = max.value === 10 || max.value % 5 === 0 ? 5 : 4
  return Array.from({ length: divisions + 1 }, (_, i) => Math.round((max.value * i) / divisions))
})
const step = computed(() => Math.ceil(props.labels.length / 7))
const showLabel = (i: number) => {
  const last = props.labels.length - 1
  if (i === last) return true
  if (last - i < step.value) return false
  return i % step.value === 0
}
function move(e: MouseEvent) { const box = (e.currentTarget as SVGElement).getBoundingClientRect(); const px = ((e.clientX - box.left) / box.width) * W; hover.value = Math.max(0, Math.min(props.labels.length - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (props.labels.length - 1)))) }
</script>
<template>
  <div class="chart">
    <div class="legend"><span v-for="s in series" :key="s.name"><i :style="{ background: s.color }" />{{ s.name }}</span></div>
    <svg :viewBox="`0 0 ${W} ${height}`" preserveAspectRatio="none" :style="{ height: height + 'px' }" role="img" :aria-label="series.map(s => s.name).join('、') + '趋势'" @mousemove="move" @mouseleave="hover = null">
      <defs><linearGradient v-for="s in paths" :id="`g-${s.name}`" :key="s.name" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="s.color" stop-opacity=".22" /><stop offset="1" :stop-color="s.color" stop-opacity="0" /></linearGradient></defs>
      <g v-for="t in ticks" :key="t"><line :x1="P.l" :x2="W - P.r" :y1="y(t)" :y2="y(t)" stroke="var(--line)" /><text :x="P.l - 6" :y="y(t) + 4" text-anchor="end" class="tick">{{ t }}</text></g>
      <text v-for="(l, i) in labels" v-show="showLabel(i)" :key="l + i" :x="x(i)" :y="height - 6" text-anchor="middle" class="tick">{{ l }}</text>
      <path v-for="(s, i) in paths" v-show="i === 0" :key="'a' + s.name" :d="s.area" :fill="`url(#g-${s.name})`" />
      <path v-for="s in paths" :key="s.name" :d="s.line" fill="none" :stroke="s.color" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      <g v-if="hover !== null"><line :x1="x(hover)" :x2="x(hover)" :y1="P.t" :y2="height - P.b" stroke="var(--line-2)" stroke-dasharray="3 3" /><circle v-for="s in series" :key="s.name" :cx="x(hover)" :cy="y(s.values[hover] || 0)" r="4" :fill="s.color" stroke="#fff" stroke-width="2" /></g>
    </svg>
    <div v-if="hover !== null" class="tip"><strong>{{ labels[hover] }}</strong><span v-for="s in series" :key="s.name"><i :style="{ background: s.color }" />{{ s.name }} <b class="num">{{ s.values[hover] }}</b>{{ unit }}</span></div>
  </div>
</template>
<style scoped>
.chart{position:relative}
svg{width:100%;display:block;overflow:visible}
.tick{font-size:11px;fill:var(--text-3)}
.legend{display:flex;gap:14px;font-size:13px;color:var(--text-2);margin-bottom:6px;flex-wrap:wrap}
.legend span,.tip span{display:inline-flex;align-items:center;gap:5px}
.legend i,.tip i{width:8px;height:8px;border-radius:2px}
.tip{position:absolute;top:28px;right:8px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-1);border-radius:8px;padding:6px 10px;font-size:12px;display:flex;flex-direction:column;gap:2px;pointer-events:none}
</style>
