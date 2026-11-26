<script setup lang="ts">
import { computed, ref, watch } from 'vue'
export interface GNode { id: string; label: string; type: 'person' | 'village' | 'project' | 'company' | 'fund' | 'clue'; weight?: number; hint?: string }
export interface GEdge { source: string; target: string; label?: string }
const props = defineProps<{ nodes: GNode[]; edges: GEdge[]; selected?: string; height?: number }>()
const emit = defineEmits<{ select: [id: string] }>()
const W = 760, H = computed(() => props.height || 460)
const colors: Record<GNode['type'], string> = { person: '#C91519', village: '#2C7A57', project: '#C8601A', company: '#4C55A6', fund: '#A57A0C', clue: '#8A837B' }
const pos = ref<Record<string, { x: number; y: number }>>({})
const radius = (n: GNode) => 14 + Math.min(14, (n.weight || 1) * 3)
/** 确定性力导向布局：同一数据每次得到相同位置。 */
function layout() {
  const n = props.nodes.length, p: Record<string, { x: number; y: number; vx: number; vy: number }> = {}
  props.nodes.forEach((node, i) => { const a = (i / n) * Math.PI * 2; p[node.id] = { x: W / 2 + Math.cos(a) * 180, y: H.value / 2 + Math.sin(a) * 140, vx: 0, vy: 0 } })
  for (let it = 0; it < 260; it++) {
    for (const a of props.nodes) for (const b of props.nodes) { if (a.id >= b.id) continue; const pa = p[a.id]!, pb = p[b.id]!; let dx = pa.x - pb.x, dy = pa.y - pb.y; const d2 = Math.max(dx * dx + dy * dy, 80), f = 7800 / d2, d = Math.sqrt(d2); dx /= d; dy /= d; pa.vx += dx * f; pa.vy += dy * f; pb.vx -= dx * f; pb.vy -= dy * f }
    for (const e of props.edges) { const pa = p[e.source], pb = p[e.target]; if (!pa || !pb) continue; const dx = pb.x - pa.x, dy = pb.y - pa.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 110) * 0.02; pa.vx += (dx / d) * f * d * 0.05; pa.vy += (dy / d) * f * d * 0.05; pb.vx -= (dx / d) * f * d * 0.05; pb.vy -= (dy / d) * f * d * 0.05 }
    for (const node of props.nodes) { const q = p[node.id]!; q.vx += (W / 2 - q.x) * 0.006; q.vy += (H.value / 2 - q.y) * 0.006; q.x = Math.max(50, Math.min(W - 50, q.x + q.vx * 0.5)); q.y = Math.max(34, Math.min(H.value - 34, q.y + q.vy * 0.5)); q.vx *= 0.6; q.vy *= 0.6 }
  }
  // 碰撞分离：每个节点按“圆 + 下方标签”的包围盒处理，沿重叠较小的方向推开，保证标签可读
  const box = (id: string) => { const n = props.nodes.find(x => x.id === id)!, r = radius(n); return { w: Math.max(r * 2, n.label.length * 12.5 + 10), h: r * 2 + 22 } }
  for (let it = 0; it < 160; it++) {
    let moved = false
    for (const a of props.nodes) for (const b of props.nodes) {
      if (a.id >= b.id) continue
      const pa = p[a.id]!, pb = p[b.id]!, ba = box(a.id), bb = box(b.id)
      const dx = pb.x - pa.x, dy = (pb.y + bb.h / 2) - (pa.y + ba.h / 2)
      const ox = (ba.w + bb.w) / 2 + 6 - Math.abs(dx), oy = (ba.h + bb.h) / 2 + 4 - Math.abs(dy)
      if (ox <= 0 || oy <= 0) continue
      moved = true
      if (ox < oy) { const m = (ox / 2) * (dx >= 0 ? 1 : -1); pa.x -= m; pb.x += m } else { const m = (oy / 2) * (dy >= 0 ? 1 : -1); pa.y -= m; pb.y += m }
    }
    for (const q of Object.values(p)) { q.x = Math.max(60, Math.min(W - 60, q.x)); q.y = Math.max(30, Math.min(H.value - 44, q.y)) }
    if (!moved) break
  }
  pos.value = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { x: v.x, y: v.y }]))
}
watch(() => [props.nodes, props.edges], layout, { immediate: true, deep: true })
const neighbors = computed(() => { const s = new Set<string>(); if (!props.selected) return s; s.add(props.selected); props.edges.forEach(e => { if (e.source === props.selected) s.add(e.target); if (e.target === props.selected) s.add(e.source) }); return s })
const dim = (id: string) => props.selected && !neighbors.value.has(id)
</script>
<template>
  <div class="graph">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="线索关联关系图">
      <g v-for="(e, i) in edges" :key="i" :opacity="dim(e.source) || dim(e.target) ? .12 : 1">
        <line v-if="pos[e.source] && pos[e.target]" :x1="pos[e.source]!.x" :y1="pos[e.source]!.y" :x2="pos[e.target]!.x" :y2="pos[e.target]!.y" stroke="var(--line-2)" stroke-width="1.5" />
        <text v-if="e.label && pos[e.source] && pos[e.target] && selected" :x="(pos[e.source]!.x + pos[e.target]!.x) / 2" :y="(pos[e.source]!.y + pos[e.target]!.y) / 2 - 4" text-anchor="middle" class="elabel">{{ e.label }}</text>
      </g>
      <g v-for="n in nodes" :key="n.id" class="node" :opacity="dim(n.id) ? .2 : 1" :transform="`translate(${pos[n.id]?.x || 0},${pos[n.id]?.y || 0})`" tabindex="0" role="button" :aria-label="n.label" @click="emit('select', n.id)" @keydown.enter="emit('select', n.id)">
        <circle :r="radius(n)" :fill="n.type === 'clue' ? '#fff' : colors[n.type]" :stroke="n.type === 'clue' ? colors.clue : '#fff'" :stroke-width="n.id === selected ? 4 : 2" :class="{ sel: n.id === selected }" />
        <title v-if="n.hint">{{ n.hint }}</title>
        <text :y="radius(n) + 14" text-anchor="middle" class="nlabel">{{ n.label }}</text>
        <text v-if="(n.weight || 0) > 1 && n.type !== 'clue'" y="5" text-anchor="middle" class="nweight num">{{ n.weight }}</text>
      </g>
    </svg>
    <div class="legend"><span v-for="(c, k) in colors" :key="k"><i :style="{ background: k === 'clue' ? '#fff' : c, borderColor: c }" />{{ { person: '人员', village: '村社', project: '项目', company: '企业', fund: '资金', clue: '线索' }[k] }}</span><em>圆内数字 = 被关联线索数</em></div>
  </div>
</template>
<style scoped>
svg{width:100%;height:auto;display:block}
.node{cursor:pointer;transition:opacity var(--dur)}
.node circle{transition:stroke-width var(--dur)}
.node circle.sel{filter:drop-shadow(0 4px 10px rgba(201,21,25,.35))}
.nlabel{font-size:12px;fill:var(--text);font-weight:500}
.nweight{font-size:13px;fill:#fff;font-weight:700;pointer-events:none}
.elabel{font-size:11px;fill:var(--text-3)}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--text-2)}
.legend span{display:inline-flex;align-items:center;gap:5px}
.legend i{width:10px;height:10px;border-radius:50%;border:1.5px solid transparent}
.legend em{font-style:normal;color:var(--text-3);margin-left:auto}
</style>
