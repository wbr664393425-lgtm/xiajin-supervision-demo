<script setup lang="ts">
import { computed, ref } from 'vue'
const props = withDefaults(defineProps<{ items: { label: string; value: number; color: string }[]; centerLabel?: string; size?: number }>(), { size: 168 })
const emit = defineEmits<{ select: [label: string] }>()
const hover = ref(-1)
const total = computed(() => props.items.reduce((s, i) => s + i.value, 0) || 1)
const arcs = computed(() => { let acc = 0; const R = 70, r = 48; return props.items.map(item => { const a0 = (acc / total.value) * Math.PI * 2 - Math.PI / 2; acc += item.value; const a1 = (acc / total.value) * Math.PI * 2 - Math.PI / 2 - 0.0001; const big = a1 - a0 > Math.PI ? 1 : 0; const p = (a: number, rad: number) => `${(80 + rad * Math.cos(a)).toFixed(2)},${(80 + rad * Math.sin(a)).toFixed(2)}`; return { ...item, d: `M${p(a0, R)}A${R},${R} 0 ${big} 1 ${p(a1, R)}L${p(a1, r)}A${r},${r} 0 ${big} 0 ${p(a0, r)}Z`, pct: Math.round((item.value / total.value) * 100) } }) })
</script>
<template>
  <div class="donut">
    <svg :width="size" :height="size" viewBox="0 0 160 160" role="img" :aria-label="centerLabel">
      <path v-for="(a, i) in arcs" :key="a.label" :d="a.d" :fill="a.color" :opacity="hover < 0 || hover === i ? 1 : .35" class="arc" @mouseenter="hover = i" @mouseleave="hover = -1" @click="emit('select', a.label)" />
      <text x="80" y="76" text-anchor="middle" class="c-label">{{ hover >= 0 ? arcs[hover]!.label : centerLabel }}</text>
      <text x="80" y="98" text-anchor="middle" class="c-value num">{{ hover >= 0 ? arcs[hover]!.value : total }}</text>
    </svg>
    <ul>
      <li v-for="(a, i) in arcs" :key="a.label" :class="{ dim: hover >= 0 && hover !== i }" @mouseenter="hover = i" @mouseleave="hover = -1" @click="emit('select', a.label)"><i :style="{ background: a.color }" /><span>{{ a.label }}</span><b class="num">{{ a.value }}</b><small class="num">{{ a.pct }}%</small></li>
    </ul>
  </div>
</template>
<style scoped>
.donut{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}
.arc{cursor:pointer;transition:opacity var(--dur)}
.c-label{font-size:11px;fill:var(--text-3)}
.c-value{font-size:24px;font-weight:700;fill:var(--text)}
ul{flex:1 1 156px;min-width:0;display:flex;flex-direction:column;gap:6px}
li{display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer;transition:opacity var(--dur)}
li.dim{opacity:.45}
li i{width:8px;height:8px;border-radius:3px;flex:none}
li span{flex:1;min-width:0;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
li b{font-weight:600;flex:none}
li small{color:var(--text-3);min-width:28px;text-align:right;flex:none}
</style>
