<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import type { CounterpartySummary } from '@/engines/bankflow'

const props = withDefaults(defineProps<{
  subjectName: string
  subjectUnit?: string
  totalIn: number
  totalOut: number
  counterparties: CounterpartySummary[]
  selected?: string
  height?: number
}>(), { height: 400 })

const emit = defineEmits<{ select: [counterpartyName: string, direction?: 'in' | 'out'] }>()

const uid = useId()
const W = 920
const H = computed(() => props.height || 400)
const hovered = ref<string>('')

const fmtWan = (n: number) => {
  if (n >= 10000) {
    const val = Math.round(n / 100) / 100
    return `${val.toFixed(n % 10000 === 0 ? 0 : 1)}万`
  }
  return `${Math.round(n).toLocaleString('zh-CN')}元`
}

interface FlowNode {
  key: string
  name: string
  side: 'left' | 'right'
  x: number
  y: number
  amount: number
  count: number
  alertCount: number
  maxLevel: 'high' | 'mid' | 'low' | null
  summary: CounterpartySummary
}

interface FlowEdge {
  key: string
  counterparty: string
  direction: 'in' | 'out'
  d: string
  labelX: number
  labelY: number
  label: string
  strokeWidth: number
  isAlert: boolean
  isHigh: boolean
}

const leftTotal = computed(() => props.counterparties.filter(c => c.inAmount > 0).length)
const rightTotal = computed(() => props.counterparties.filter(c => c.outAmount > 0).length)

const layout = computed(() => {
  const cx = W / 2
  const cy = H.value / 2
  const leftItems = props.counterparties.filter(c => c.inAmount > 0).sort((a, b) => b.inAmount - a.inAmount).slice(0, 7)
  const rightItems = props.counterparties.filter(c => c.outAmount > 0).sort((a, b) => b.outAmount - a.outAmount).slice(0, 7)

  const maxAmt = Math.max(
    1,
    ...leftItems.map(i => i.inAmount),
    ...rightItems.map(i => i.outAmount),
  )

  const padY = 48
  const spanY = Math.max(120, H.value - padY * 2)
  const posY = (idx: number, len: number) => (len <= 1 ? cy : padY + (idx * spanY) / (len - 1))

  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []

  leftItems.forEach((c, i) => {
    const x = 110
    const y = posY(i, leftItems.length)
    nodes.push({
      key: `L:${c.name}`,
      name: c.name,
      side: 'left',
      x,
      y,
      amount: c.inAmount,
      count: c.inCount,
      alertCount: c.inAlertCount,
      maxLevel: c.inMaxLevel,
      summary: c,
    })
    const x1 = x + 94
    const y1 = y
    const x2 = cx - 76
    const y2 = cy + (y - cy) * 0.24
    const mx = (x1 + x2) / 2
    const sw = 1.6 + Math.pow(c.inAmount / maxAmt, 0.55) * 4.4
    edges.push({
      key: `E:in:${c.name}`,
      counterparty: c.name,
      direction: 'in',
      d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`,
      labelX: mx - 6,
      labelY: (y1 + y2) / 2 - 5,
      label: `${c.inCount}笔 · ${fmtWan(c.inAmount)}`,
      strokeWidth: sw,
      isAlert: c.inAlertCount > 0,
      isHigh: c.inMaxLevel === 'high',
    })
  })

  rightItems.forEach((c, i) => {
    const x = W - 110
    const y = posY(i, rightItems.length)
    nodes.push({
      key: `R:${c.name}`,
      name: c.name,
      side: 'right',
      x,
      y,
      amount: c.outAmount,
      count: c.outCount,
      alertCount: c.outAlertCount,
      maxLevel: c.outMaxLevel,
      summary: c,
    })
    const x1 = cx + 74
    const y1 = cy + (y - cy) * 0.24
    const x2 = x - 98
    const y2 = y
    const mx = (x1 + x2) / 2
    const sw = 1.6 + Math.pow(c.outAmount / maxAmt, 0.55) * 4.4
    edges.push({
      key: `E:out:${c.name}`,
      counterparty: c.name,
      direction: 'out',
      d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`,
      labelX: mx + 6,
      labelY: (y1 + y2) / 2 - 5,
      label: `${c.outCount}笔 · ${fmtWan(c.outAmount)}`,
      strokeWidth: sw,
      isAlert: c.outAlertCount > 0,
      isHigh: c.outMaxLevel === 'high',
    })
  })

  return { cx, cy, nodes, edges }
})

const activeName = computed(() => hovered.value || props.selected || '')
const isDim = (name: string) => Boolean(activeName.value && activeName.value !== name)
const clipText = (s: string, max = 12) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)
const clippedHint = computed(() => {
  const parts: string[] = []
  if (leftTotal.value > 7) parts.push(`上游共 ${leftTotal.value} 户展示前 7 户`)
  if (rightTotal.value > 7) parts.push(`下游共 ${rightTotal.value} 户展示前 7 户`)
  return parts.join(' · ')
})
</script>

<template>
  <div class="ff-wrap">
    <div class="ff-cols" aria-hidden="true">
      <span class="col-tag in">上游资金来源方（{{ leftTotal }} 户）</span>
      <span class="col-tag center">被核查对象（中心节点）</span>
      <span class="col-tag out">下游资金去向方（{{ rightTotal }} 户）</span>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="ff-svg" role="img" :aria-label="`${subjectName}资金流向穿透图谱`">
      <defs>
        <!-- 使用 markerUnits="userSpaceOnUse" 固定箭头像素尺寸，防止粗线把箭头放大压盖节点 -->
        <marker :id="`${uid}-in`" viewBox="0 0 10 10" refX="7.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto">
          <path d="M1,1.8 L8.5,5 L1,8.2 Z" fill="var(--ok)" />
        </marker>
        <marker :id="`${uid}-out`" viewBox="0 0 10 10" refX="7.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto">
          <path d="M1,1.8 L8.5,5 L1,8.2 Z" fill="var(--info)" />
        </marker>
        <marker :id="`${uid}-high`" viewBox="0 0 10 10" refX="7.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto">
          <path d="M1,1.8 L8.5,5 L1,8.2 Z" fill="var(--risk-high)" />
        </marker>
        <marker :id="`${uid}-mid`" viewBox="0 0 10 10" refX="7.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto">
          <path d="M1,1.8 L8.5,5 L1,8.2 Z" fill="var(--risk-mid)" />
        </marker>
      </defs>

      <!-- 连线层 -->
      <g
        v-for="e in layout.edges"
        :key="e.key"
        class="ff-edge"
        :class="{ dim: isDim(e.counterparty), sel: selected === e.counterparty }"
        @mouseenter="hovered = e.counterparty"
        @mouseleave="hovered = ''"
        @click="emit('select', e.counterparty, e.direction)"
      >
        <path :d="e.d" fill="none" stroke="transparent" stroke-width="14" />
        <path
          :d="e.d"
          fill="none"
          :stroke="e.isHigh ? 'var(--risk-high)' : e.isAlert ? 'var(--risk-mid)' : e.direction === 'in' ? 'var(--ok)' : 'var(--info)'"
          :stroke-width="e.strokeWidth"
          :stroke-opacity="selected === e.counterparty || hovered === e.counterparty ? 0.94 : 0.65"
          stroke-linecap="round"
          :marker-end="`url(#${uid}-${e.isHigh ? 'high' : e.isAlert ? 'mid' : e.direction})`"
        />
        <g :transform="`translate(${e.labelX}, ${e.labelY})`">
          <rect x="-46" y="-11" width="92" height="17" rx="4" class="elabel-bg" />
          <text text-anchor="middle" y="1" class="elabel num">{{ e.label }}</text>
        </g>
      </g>

      <!-- 上下游对手方节点 -->
      <g
        v-for="n in layout.nodes"
        :key="n.key"
        class="ff-node"
        :class="{ dim: isDim(n.name), sel: selected === n.name, alert: n.alertCount > 0 }"
        :transform="`translate(${n.x}, ${n.y})`"
        tabindex="0"
        role="button"
        :aria-label="`${n.name}，${n.side === 'left' ? '流入' : '流出'}${fmtWan(n.amount)}，点击查看交易明细`"
        @mouseenter="hovered = n.name"
        @mouseleave="hovered = ''"
        @click="emit('select', n.name, n.side === 'left' ? 'in' : 'out')"
        @keydown.enter="emit('select', n.name, n.side === 'left' ? 'in' : 'out')"
      >
        <rect x="-94" y="-22" width="188" height="44" rx="9" class="node-box" />
        <rect
          x="-94"
          y="-22"
          width="4"
          height="44"
          rx="2"
          :fill="n.maxLevel === 'high' ? 'var(--risk-high)' : n.alertCount > 0 ? 'var(--risk-mid)' : n.side === 'left' ? 'var(--ok)' : 'var(--info)'"
        />
        <text x="-82" y="-3" class="node-name">{{ clipText(n.name, 12) }}</text>
        <text x="-82" y="13" class="node-meta num">{{ n.summary.relation }} · {{ n.count }}笔 · {{ fmtWan(n.amount) }}</text>
        <g v-if="n.alertCount > 0" :transform="`translate(${n.alertCount >= 10 ? 74 : 80}, -12)`">
          <rect
            :x="n.alertCount >= 10 ? -11 : -7"
            y="-7"
            :width="n.alertCount >= 10 ? 22 : 14"
            height="14"
            rx="7"
            :fill="n.maxLevel === 'high' ? 'var(--risk-high)' : 'var(--risk-mid)'"
          />
          <text y="3.5" text-anchor="middle" class="node-badge num">{{ n.alertCount }}</text>
        </g>
        <title>{{ `${n.name}（${n.summary.relation}）\n${n.side === 'left' ? '累计转入' : '累计转出'}：${n.amount.toLocaleString('zh-CN')} 元（${n.count} 笔）\n本方向预警：${n.alertCount} 笔` }}</title>
      </g>

      <!-- 中心：被核查对象 -->
      <g :transform="`translate(${layout.cx}, ${layout.cy})`" class="ff-center">
        <rect x="-72" y="-44" width="144" height="88" rx="14" class="center-ring" />
        <rect x="-66" y="-38" width="132" height="76" rx="11" class="center-box" />
        <text y="-10" text-anchor="middle" class="center-title">{{ clipText(subjectName, 7) }}</text>
        <text y="8" text-anchor="middle" class="center-sub num">入 {{ fmtWan(totalIn) }}</text>
        <text y="24" text-anchor="middle" class="center-sub num">出 {{ fmtWan(totalOut) }}</text>
        <title>{{ `${subjectName}${subjectUnit ? `（${subjectUnit}）` : ''}\n总流入：${totalIn.toLocaleString('zh-CN')} 元\n总流出：${totalOut.toLocaleString('zh-CN')} 元` }}</title>
      </g>
    </svg>

    <div class="ff-legend">
      <span><i class="swatch" style="background:var(--risk-high)" />红色预警链路</span>
      <span><i class="swatch" style="background:var(--risk-mid)" />橙色关注链路</span>
      <span><i class="swatch" style="background:var(--ok)" />常规流入</span>
      <span><i class="swatch" style="background:var(--info)" />常规流出</span>
      <em>{{ clippedHint ? `${clippedHint} · ` : '' }}连线粗细代表金额 · 点击节点或连线右侧穿透</em>
    </div>
  </div>
</template>

<style scoped>
.ff-wrap{display:flex;flex-direction:column;gap:8px;min-width:0}
.ff-cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 12px}
.col-tag{font-size:12px;font-weight:600;color:var(--text-3);display:inline-flex;align-items:center;gap:6px}
.col-tag.center{justify-content:center;color:var(--red)}
.col-tag.out{justify-content:flex-end}
.ff-svg{width:100%;height:auto;display:block;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm)}
.ff-edge{cursor:pointer;transition:opacity var(--dur)}
.ff-edge.dim{opacity:.18}
.elabel-bg{fill:var(--surface);stroke:var(--line);stroke-width:1;opacity:.96}
.elabel{font-size:10.5px;fill:var(--text-2);font-weight:500;pointer-events:none}
.ff-node{cursor:pointer;transition:opacity var(--dur)}
.ff-node.dim{opacity:.24}
.node-box{fill:var(--surface);stroke:var(--line-2);stroke-width:1;transition:stroke var(--dur),fill var(--dur)}
.ff-node:hover .node-box,.ff-node.sel .node-box{stroke:var(--red);stroke-width:1.8;fill:var(--red-25)}
.node-name{font-size:12.5px;font-weight:600;fill:var(--text)}
.node-meta{font-size:10.5px;fill:var(--text-3)}
.node-badge{font-size:9.5px;fill:var(--on-brand);font-weight:700}
.center-ring{fill:var(--red-50);stroke:var(--red-line);stroke-width:1.2}
.center-box{fill:var(--red);stroke:var(--surface);stroke-width:2}
.center-title{font-size:15px;font-weight:700;fill:var(--on-brand)}
.center-sub{font-size:11px;fill:var(--on-brand);opacity:.92}
.ff-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:12px;color:var(--text-2)}
.ff-legend span{display:inline-flex;align-items:center;gap:5px}
.swatch{width:10px;height:10px;border-radius:3px}
.ff-legend em{font-style:normal;color:var(--text-3);margin-left:auto}
</style>
