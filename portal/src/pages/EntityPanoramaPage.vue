<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileCheck2,
  Megaphone,
  Network,
  PlusCircle,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from 'lucide-vue-next'
import StatusBadge from '@/components/StatusBadge.vue'
import {
  CADRES,
  CASE_FILES,
  FEEDBACK_ISSUES,
  INTEGRATION_LIST,
  PLATFORM_CAPABILITIES,
  PUBLIC_OPINIONS,
  TODAY,
  townName,
} from '@/domain/mockData'
import { addDays, buildEntityGraph, synthesizeEntityBrief, type GraphNode } from '@/domain/engines'
import {
  addNewClue,
  allSupervisionFindings,
  createTaskFromPanorama,
  navigateTo,
  portalState,
} from '@/domain/store'
import type { PublicOpinionPost } from '@/domain/types'

type SubTab = 'graph' | 'cadres' | 'outreach'
const subTab = ref<SubTab>('graph')

const presets = ['张某军', '王某民', '李某华', '鑫路建设工程有限公司', '禾川农机服务社', '和盛村']

const queryInput = computed({
  get: () => portalState.panoramaQuery,
  set: (v: string) => {
    portalState.panoramaQuery = v
  },
})

const graphFocusOnly = ref(false)

const fullGraph = computed(() => buildEntityGraph(portalState.clues))

const activeNodeIds = computed(() => {
  const q = queryInput.value.trim()
  if (!q) return new Set<string>()
  const matched = fullGraph.value.nodes.filter((n) => n.label.includes(q) || n.id.includes(q))
  const set = new Set<string>(matched.map((n) => n.id))
  for (const e of fullGraph.value.edges) {
    if (matched.some((m) => m.id === e.source)) set.add(e.target)
    if (matched.some((m) => m.id === e.target)) set.add(e.source)
  }
  return set
})

const visibleGraph = computed(() => {
  const { nodes, edges } = fullGraph.value
  if (!graphFocusOnly.value || activeNodeIds.value.size === 0) {
    return { nodes, edges }
  }
  const fNodes = nodes.filter((n) => activeNodeIds.value.has(n.id))
  const fEdges = edges.filter((e) => activeNodeIds.value.has(e.source) && activeNodeIds.value.has(e.target))
  return { nodes: fNodes, edges: fEdges }
})

interface PositionedNode extends GraphNode {
  x: number
  y: number
  isDirectHit: boolean
  isNeighbor: boolean
}

const layoutNodes = computed<PositionedNode[]>(() => {
  const nodes = visibleGraph.value.nodes
  if (!nodes.length) return []
  const q = queryInput.value.trim()

  // 按节点语义分列排布，保证零随机抖动且长中文标签可读
  const columns: Record<GraphNode['type'], number> = {
    village: 96,
    clue: 266,
    person: 446,
    project: 618,
    company: 752,
  }

  const buckets: Record<GraphNode['type'], GraphNode[]> = {
    village: [],
    clue: [],
    person: [],
    project: [],
    company: [],
  }
  for (const n of nodes) buckets[n.type].push(n)

  const height = 400
  const padY = 44
  const usableH = height - padY * 2
  const placed: PositionedNode[] = []

  ;(Object.keys(buckets) as GraphNode['type'][]).forEach((type) => {
    const arr = buckets[type]
    arr.forEach((node, idx) => {
      const y = arr.length === 1 ? height / 2 : padY + (usableH * idx) / (arr.length - 1)
      const isDirectHit = Boolean(q && (node.label.includes(q) || node.id.includes(q)))
      const isNeighbor = activeNodeIds.value.has(node.id)
      placed.push({
        ...node,
        x: columns[type],
        y,
        isDirectHit,
        isNeighbor,
      })
    })
  })

  return placed
})

const nodeMap = computed(() => {
  const map = new Map<string, PositionedNode>()
  for (const n of layoutNodes.value) map.set(n.id, n)
  return map
})

const layoutEdges = computed(() => {
  return visibleGraph.value.edges
    .map((e) => {
      const src = nodeMap.value.get(e.source)
      const tgt = nodeMap.value.get(e.target)
      if (!src || !tgt) return null
      const active = activeNodeIds.value.has(src.id) && activeNodeIds.value.has(tgt.id)
      return {
        ...e,
        x1: src.x,
        y1: src.y,
        x2: tgt.x,
        y2: tgt.y,
        mx: (src.x + tgt.x) / 2,
        my: (src.y + tgt.y) / 2 - 5,
        active,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
})

const brief = computed(() =>
  synthesizeEntityBrief(
    queryInput.value,
    portalState.clues,
    allSupervisionFindings.value,
    FEEDBACK_ISSUES,
    CASE_FILES,
    CADRES,
  ),
)

const existingPanoramaTask = computed(() => {
  const q = queryInput.value.trim()
  if (!q) return null
  return portalState.tasks.find((t) => t.domain === '全景研判' && t.sourceId === q) || null
})

const taskAssignee = ref('第一监督检查室')
const taskDeadline = ref(addDays(TODAY, 7))
const taskNotice = ref('')

function dispatchPanoramaTask() {
  const q = queryInput.value.trim()
  if (!q) return
  const task = createTaskFromPanorama(q, taskAssignee.value, taskDeadline.value)
  if (task) {
    taskNotice.value = `已下发初核任务 ${task.id} 至 ${task.assignee}，可在监督门户首页台账实时办理。`
  }
}

function selectGraphNode(node: PositionedNode) {
  const cleanLabel = node.id.startsWith('o:')
    ? node.id.slice(2)
    : node.id.startsWith('c:')
      ? node.id.slice(2)
      : node.label
  queryInput.value = cleanLabel
  taskNotice.value = ''
}

function nodeTypeLabel(type: GraphNode['type']) {
  const map: Record<GraphNode['type'], string> = {
    village: '村级/单位',
    clue: '信访线索',
    person: '关键人员',
    project: '合同工程',
    company: '市场主体',
  }
  return map[type]
}

// 干部廉政档案
const selectedCadreId = ref(CADRES[0]!.id)
const selectedCadre = computed(() => CADRES.find((c) => c.id === selectedCadreId.value) || CADRES[0]!)

function cadreTagStats(cadre: (typeof CADRES)[number]) {
  const bySource = new Map<string, number>()
  let openCount = 0
  for (const r of cadre.records) {
    bySource.set(r.source, (bySource.get(r.source) || 0) + 1)
    if (r.open) openCount += 1
  }
  return {
    sources: [...bySource.entries()].map(([source, count]) => `${source} ${count}条`),
    openCount,
  }
}

function inspectCadreInGraph(name: string) {
  portalState.panoramaQuery = name
  subTab.value = 'graph'
}

// 属地舆情转线索
const convertedOpinionIds = ref<Record<string, string>>({})

function convertOpinionToClue(post: PublicOpinionPost) {
  const existingClueId = convertedOpinionIds.value[post.id]
  if (existingClueId) {
    navigateTo('clues', { clueId: existingClueId })
    return
  }
  const clue = addNewClue({
    channel: '网络举报',
    town: post.town,
    village: `${townName(post.town)}属地舆情转办`,
    reporter: `${post.platform}舆情监测（${post.id}）`,
    content: `【属地舆情转待研判线索 · 来源 ${post.platform} · ${post.time}】${post.text}`,
  })
  convertedOpinionIds.value[post.id] = clue.id
}
</script>

<template>
  <div class="panorama-page">
    <section class="page-intro">
      <div>
        <p class="eyebrow">全域透视与能力中心 · 跨库穿透串联</p>
        <h1 class="font-editorial page-title">全域实体图谱、廉政档案与平台能力全景</h1>
        <p class="page-sub">
          围绕「人、村、合同、项目、企业」开展一键穿透关联与初核方案起草；同时展示二期深度对接的干部廉政客观事实档案与属地舆情苗头转线索机制。
        </p>
      </div>
      <div class="subtab-wrap">
        <div class="civic-tablist" role="tablist" aria-label="全域透视功能区">
          <button
            type="button"
            class="civic-tab"
            role="tab"
            :aria-selected="subTab === 'graph'"
            @click="subTab = 'graph'"
          >
            <Network :size="15" aria-hidden="true" />
            <span>实体图谱与初核方案</span>
          </button>
          <button
            type="button"
            class="civic-tab"
            role="tab"
            :aria-selected="subTab === 'cadres'"
            @click="subTab = 'cadres'"
          >
            <UserCheck :size="15" aria-hidden="true" />
            <span>干部廉政档案（事实红线）</span>
            <span class="tab-count num-tabular">{{ CADRES.length }}</span>
          </button>
          <button
            type="button"
            class="civic-tab"
            role="tab"
            :aria-selected="subTab === 'outreach'"
            @click="subTab = 'outreach'"
          >
            <Megaphone :size="15" aria-hidden="true" />
            <span>舆情监测、数据对接与能力版图</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Tab 1：实体关联图谱 + 一键全景研判 + 下发任务 -->
    <template v-if="subTab === 'graph'">
      <section class="paper-card search-bar-card" aria-label="全域实体检索">
        <div class="search-row">
          <label class="search-field">
            <Search :size="16" aria-hidden="true" />
            <input
              v-model="queryInput"
              type="search"
              placeholder="输入人员姓名、企业名称、合同编号或村名（如：张某军、王某民、鑫路建设）…"
              aria-label="检索全域关联实体"
            />
          </label>
          <label class="filter-toggle">
            <input v-model="graphFocusOnly" type="checkbox" />
            <span>仅看当前实体直接关联邻域</span>
          </label>
        </div>
        <div class="preset-row">
          <span class="preset-label">常用透视对象：</span>
          <button
            v-for="p in presets"
            :key="p"
            type="button"
            class="preset-chip"
            :class="{ 'is-active': queryInput.trim() === p }"
            @click="queryInput = p; taskNotice = ''"
          >
            {{ p }}
          </button>
        </div>
      </section>

      <div class="panorama-grid">
        <!-- 左：互动式实体关联图谱 -->
        <section class="paper-card graph-panel" aria-labelledby="graph-title">
          <div class="panel-head">
            <div>
              <h2 id="graph-title" class="panel-title">跨库实体关联网络图谱</h2>
              <p class="panel-desc">自动提取线索中的被反映人、村居、合同编号、涉案企业及工商同人同电话关联边，点击节点可切换透视焦点</p>
            </div>
            <div class="legend-row" aria-label="节点图例">
              <span class="legend-item"><i class="dot dot-village" />村居</span>
              <span class="legend-item"><i class="dot dot-clue" />信访线索</span>
              <span class="legend-item"><i class="dot dot-person" />关键人</span>
              <span class="legend-item"><i class="dot dot-project" />合同/工程</span>
              <span class="legend-item"><i class="dot dot-company" />涉案企业</span>
            </div>
          </div>

          <div class="svg-stage">
            <svg viewBox="0 0 850 400" class="graph-svg" role="img" aria-label="夏津县纪检监察跨库实体关系图谱">
              <!-- 分层栏位浅色底标 -->
              <g class="col-guides" aria-hidden="true">
                <text x="96" y="22" text-anchor="middle">村居 / 单位</text>
                <text x="266" y="22" text-anchor="middle">信访材料</text>
                <text x="446" y="22" text-anchor="middle">关键人员</text>
                <text x="618" y="22" text-anchor="middle">合同 / 工程</text>
                <text x="752" y="22" text-anchor="middle">关联企业</text>
              </g>

              <!-- 关联边 -->
              <g>
                <g v-for="(edge, idx) in layoutEdges" :key="`${edge.source}-${edge.target}-${idx}`">
                  <line
                    :x1="edge.x1"
                    :y1="edge.y1"
                    :x2="edge.x2"
                    :y2="edge.y2"
                    :class="['graph-edge', { 'is-active': edge.active }]"
                  />
                  <text
                    v-if="edge.active"
                    :x="edge.mx"
                    :y="edge.my"
                    text-anchor="middle"
                    class="edge-label"
                  >
                    {{ edge.label }}
                  </text>
                </g>
              </g>

              <!-- 节点 -->
              <g>
                <g
                  v-for="node in layoutNodes"
                  :key="node.id"
                  class="graph-node"
                  :class="[`type-${node.type}`, { 'is-hit': node.isDirectHit, 'is-dim': activeNodeIds.size > 0 && !node.isNeighbor }]"
                  tabindex="0"
                  role="button"
                  :aria-label="`${nodeTypeLabel(node.type)} ${node.label}，关联 ${node.clues.length} 件线索，点击透视`"
                  @click="selectGraphNode(node)"
                  @keydown.enter="selectGraphNode(node)"
                >
                  <circle
                    :cx="node.x"
                    :cy="node.y"
                    :r="node.isDirectHit ? 20 : Math.min(18, 12 + node.weight * 1.5)"
                    class="node-circle"
                  />
                  <rect
                    :x="node.x - 46"
                    :y="node.y + 19"
                    width="92"
                    height="20"
                    rx="4"
                    class="node-pill-bg"
                  />
                  <text :x="node.x" :y="node.y + 32" text-anchor="middle" class="node-label">
                    {{ node.label.length > 8 ? node.label.slice(0, 7) + '…' : node.label }}
                  </text>
                </g>
              </g>
            </svg>
          </div>
        </section>

        <!-- 右：跨库足迹汇总 + 智能起草初核方案初稿 + 下发核查 -->
        <aside class="brief-panel">
          <section class="paper-card brief-card" aria-labelledby="brief-title">
            <div class="brief-head">
              <div>
                <h2 id="brief-title" class="panel-title">
                  {{ brief ? `「${brief.query}」跨库足迹汇总` : '请选择或输入实体名称' }}
                </h2>
                <p class="panel-desc">自动贯通 5 大业务库命中记录，所有建议均可点击追溯原始依据</p>
              </div>
              <StatusBadge v-if="brief" :tone="brief.totalHits >= 3 ? 'high' : 'info'" :label="`命中 ${brief.totalHits} 处记录`" />
            </div>

            <div v-if="brief && brief.totalHits > 0" class="brief-body">
              <div class="hit-grid">
                <div class="hit-block" v-if="brief.hitClues.length">
                  <div class="hit-head">
                    <span>信访举报线索</span>
                    <strong class="num-tabular">{{ brief.hitClues.length }} 件</strong>
                  </div>
                  <div class="hit-links">
                    <button
                      v-for="c in brief.hitClues"
                      :key="c.id"
                      type="button"
                      class="hit-chip"
                      @click="navigateTo('clues', { clueId: c.id })"
                    >
                      <span>{{ c.id }} · {{ townName(c.town) }}{{ c.village }}</span>
                      <ArrowRight :size="13" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div class="hit-block" v-if="brief.hitFindings.length">
                  <div class="hit-head">
                    <span>大数据穿透疑点</span>
                    <strong class="num-tabular">{{ brief.hitFindings.length }} 条</strong>
                  </div>
                  <div class="hit-links">
                    <button
                      v-for="f in brief.hitFindings"
                      :key="f.id"
                      type="button"
                      class="hit-chip"
                      @click="navigateTo('radar')"
                    >
                      <span>{{ f.rule }} · {{ f.subject }}</span>
                      <ArrowRight :size="13" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div class="hit-block" v-if="brief.hitIssues.length">
                  <div class="hit-head">
                    <span>巡察反馈问题</span>
                    <strong class="num-tabular">{{ brief.hitIssues.length }} 项</strong>
                  </div>
                  <div class="hit-links">
                    <button
                      v-for="i in brief.hitIssues"
                      :key="i.id"
                      type="button"
                      class="hit-chip"
                      @click="navigateTo('inspection')"
                    >
                      <span>{{ i.id }} · {{ i.title }}</span>
                      <ArrowRight :size="13" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div class="hit-block" v-if="brief.hitCases.length || brief.hitCadres.length">
                  <div class="hit-head">
                    <span>在办案卷与廉政档案</span>
                    <strong class="num-tabular">{{ brief.hitCases.length + brief.hitCadres.length }} 项</strong>
                  </div>
                  <div class="hit-links">
                    <button
                      v-for="ca in brief.hitCases"
                      :key="ca.id"
                      type="button"
                      class="hit-chip"
                      @click="navigateTo('inspection')"
                    >
                      <span>案卷 {{ ca.id }}（{{ ca.stage }}）· {{ ca.accused }}</span>
                      <ArrowRight :size="13" aria-hidden="true" />
                    </button>
                    <button
                      v-for="cd in brief.hitCadres"
                      :key="cd.id"
                      type="button"
                      class="hit-chip"
                      @click="selectedCadreId = cd.id; subTab = 'cadres'"
                    >
                      <span>廉政档案 {{ cd.name }}（{{ cd.unit }} · {{ cd.records.length }} 条客观记录）</span>
                      <ArrowRight :size="13" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- AI 建议态虚线框：初核方案初稿 -->
              <div class="track-ai-suggested draft-box">
                <div class="draft-title">
                  <Sparkles :size="15" aria-hidden="true" />
                  <span>智能起草初核方案要点（AI 辅助建议，待人工核定签发）</span>
                </div>
                <ol v-if="brief.focusPoints.length" class="focus-list">
                  <li v-for="(pt, i) in brief.focusPoints" :key="i">{{ pt }}</li>
                </ol>
                <p v-else class="draft-empty">已命中基础档案，建议调阅相关主体财务账簿及任职履历核对细节。</p>
              </div>

              <!-- 人工下发初核任务闭环 -->
              <div v-if="existingPanoramaTask" class="track-human-confirmed confirmed-task-box">
                <div class="confirmed-top">
                  <CheckCircle2 :size="16" aria-hidden="true" />
                  <strong>已纳入核查任务：{{ existingPanoramaTask.id }}</strong>
                </div>
                <p>
                  承办室室：{{ existingPanoramaTask.assignee }} · 限期 {{ existingPanoramaTask.deadline }} · 状态：{{ existingPanoramaTask.status }}
                </p>
                <button type="button" class="btn btn-secondary btn-sm" @click="navigateTo('home')">
                  去门户台账办理
                </button>
              </div>

              <div v-else class="dispatch-form">
                <h3 class="dispatch-title">人工审核签发初核任务</h3>
                <div class="dispatch-row">
                  <label>
                    <span>承办部门</span>
                    <select v-model="taskAssignee">
                      <option value="第一监督检查室">第一监督检查室</option>
                      <option value="第二监督检查室">第二监督检查室</option>
                      <option value="第三纪检监察室">第三纪检监察室</option>
                      <option value="县纪委信访室">县纪委信访室</option>
                    </select>
                  </label>
                  <label>
                    <span>办结限期</span>
                    <input v-model="taskDeadline" type="date" />
                  </label>
                </div>
                <button type="button" class="btn btn-primary" @click="dispatchPanoramaTask">
                  <Send :size="15" aria-hidden="true" />
                  <span>基于初核方案下发核查任务</span>
                </button>
                <p v-if="taskNotice" class="notice-ok">{{ taskNotice }}</p>
              </div>
            </div>

            <div v-else class="empty-brief">
              <p>未检出「{{ queryInput }}」对应的跨库关联记录，请点击左侧常用对象芯片或图谱节点进行透视。</p>
            </div>
          </section>
        </aside>
      </div>
    </template>

    <!-- Tab 2：干部廉政档案（严格客观事实标签，禁绝黑盒打分） -->
    <template v-else-if="subTab === 'cadres'">
      <section class="paper-card redline-banner" role="note" aria-label="干部廉政档案红线原则">
        <ShieldAlert :size="20" class="redline-icon" aria-hidden="true" />
        <div>
          <strong>系统建设刚性红线：仅展示客观事实时间轴，严禁廉政评分与 AI 定性</strong>
          <p>
            按纪检监察干部监督规范，本模块仅如实汇聚信访、谈话函询、巡察、处分、审计与个人事项等客观文书台账，不计算“风险指数”，不作“好/坏干部”标签定性。
          </p>
        </div>
      </section>

      <div class="cadre-layout">
        <aside class="paper-card cadre-list-panel" aria-label="干部廉政档案名录">
          <h2 class="panel-title">抽样干部档案名录</h2>
          <ul class="cadre-list" role="list">
            <li v-for="c in CADRES" :key="c.id">
              <button
                type="button"
                class="cadre-item"
                :class="{ 'is-selected': selectedCadre.id === c.id }"
                :aria-current="selectedCadre.id === c.id ? 'true' : undefined"
                @click="selectedCadreId = c.id"
              >
                <div class="cadre-item-top">
                  <strong>{{ c.name }}</strong>
                  <span class="cadre-level">{{ c.level }}</span>
                </div>
                <div class="cadre-item-sub">{{ c.unit }} · {{ c.title }}</div>
                <div class="cadre-item-meta num-tabular">
                  历史事实 {{ c.records.length }} 条 · 未结 {{ cadreTagStats(c).openCount }} 条
                </div>
              </button>
            </li>
          </ul>
        </aside>

        <section class="paper-card cadre-detail-panel" aria-labelledby="cadre-name-title">
          <div class="cadre-detail-head">
            <div>
              <div class="cadre-id-line">
                <span class="font-mono-code">{{ selectedCadre.id }}</span>
                <span>任职时间：{{ selectedCadre.since }} 至今</span>
              </div>
              <h2 id="cadre-name-title" class="font-editorial cadre-name">
                {{ selectedCadre.name }} · {{ selectedCadre.unit }} {{ selectedCadre.title }}
              </h2>
            </div>
            <button type="button" class="btn btn-secondary" @click="inspectCadreInGraph(selectedCadre.name)">
              <Network :size="15" aria-hidden="true" />
              <span>带入全域图谱穿透核验</span>
            </button>
          </div>

          <div class="fact-tag-bar" aria-label="客观事实分类标签">
            <span class="fact-chip" v-for="tag in cadreTagStats(selectedCadre).sources" :key="tag">{{ tag }}</span>
            <StatusBadge
              :tone="cadreTagStats(selectedCadre).openCount > 0 ? 'mid' : 'ok'"
              :label="`未办结/进行中事项 ${cadreTagStats(selectedCadre).openCount} 项`"
            />
          </div>

          <h3 class="timeline-heading">跨来源客观事实时间轴</h3>
          <ol class="timeline-list">
            <li v-for="(rec, idx) in selectedCadre.records" :key="idx" class="timeline-item">
              <div class="timeline-date font-mono-code">{{ rec.date }}</div>
              <div class="timeline-content">
                <div class="timeline-top">
                  <span class="source-pill">{{ rec.source }}</span>
                  <strong>{{ rec.title }}</strong>
                  <StatusBadge :tone="rec.open ? 'mid' : 'ok'" :label="rec.open ? '办理中 / 待销号' : '已办结 / 期满'" />
                </div>
                <p class="timeline-result">客观处置/核实结论：{{ rec.result }}</p>
              </div>
            </li>
          </ol>
        </section>
      </div>
    </template>

    <!-- Tab 3：属地舆情苗头 + 数据对接状态 + 平台8大能力版图 -->
    <template v-else>
      <section class="paper-card outreach-panel" aria-labelledby="opinion-heading">
        <div class="panel-head">
          <div>
            <h2 id="opinion-heading" class="panel-title">属地社情舆情苗头监测（支持一键转为待研判信访线索）</h2>
            <p class="panel-desc">自动归拢本地论坛、政务留言板与短视频评论涉基层作风与村级工程反馈，经人工研判可正式导入信访线索台账</p>
          </div>
          <span class="count-chip num-tabular">监测样本 {{ PUBLIC_OPINIONS.length }} 条</span>
        </div>

        <div class="opinion-grid">
          <article v-for="post in PUBLIC_OPINIONS" :key="post.id" class="opinion-card">
            <div class="opinion-top">
              <span class="platform-tag">{{ post.platform }}</span>
              <span class="town-tag">{{ townName(post.town) }}</span>
              <span class="heat-tag num-tabular">热度 {{ post.heat }}</span>
            </div>
            <p class="opinion-text">{{ post.text }}</p>
            <div class="opinion-foot">
              <span class="font-mono-code muted-time">{{ post.time }}</span>
              <button type="button" class="btn btn-secondary btn-sm" @click="convertOpinionToClue(post)">
                <PlusCircle v-if="!convertedOpinionIds[post.id]" :size="14" aria-hidden="true" />
                <FileCheck2 v-else :size="14" aria-hidden="true" />
                <span>{{ convertedOpinionIds[post.id] ? `已导入 ${convertedOpinionIds[post.id]} · 去研判` : '核实并转为待研判线索' }}</span>
              </button>
            </div>
          </article>
        </div>
      </section>

      <div class="infra-split">
        <section class="paper-card infra-panel" aria-labelledby="integration-heading">
          <div class="panel-head">
            <div>
              <h2 id="integration-heading" class="panel-title">系统数据对接与安全架构说明</h2>
              <p class="panel-desc">演示门户全部运行于浏览器本地确定性规则引擎，严守内网隔离与数据边界</p>
            </div>
            <Database :size="18" class="muted-icon" aria-hidden="true" />
          </div>
          <ul class="integration-list" role="list">
            <li v-for="item in INTEGRATION_LIST" :key="item.name" class="integration-item">
              <div class="int-top">
                <span class="int-group">{{ item.group }}</span>
                <StatusBadge
                  :tone="item.status === '预留接口' ? 'info' : 'ok'"
                  :label="item.status"
                />
              </div>
              <strong class="int-name">{{ item.name }}</strong>
              <p class="int-desc">{{ item.desc }}</p>
            </li>
          </ul>
        </section>

        <section class="paper-card cap-summary-panel" aria-labelledby="cap-heading">
          <div class="panel-head">
            <div>
              <h2 id="cap-heading" class="panel-title">平台 8 大核心能力建设分期总览</h2>
              <p class="panel-desc">点击卡片即可跳转到对应工作门户开展实战演练</p>
            </div>
          </div>
          <div class="cap-list">
            <button
              v-for="cap in PLATFORM_CAPABILITIES"
              :key="cap.key"
              type="button"
              class="cap-row"
              @click="navigateTo(cap.targetPage)"
            >
              <div class="cap-row-top">
                <strong>{{ cap.title }}</strong>
                <StatusBadge :tone="cap.phase.includes('已实现') ? 'ok' : 'info'" :label="cap.phase" />
              </div>
              <p class="cap-row-sub">{{ cap.summary }}</p>
            </button>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.panorama-page {
  display: grid;
  gap: 1.25rem;
}

.page-intro {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  padding-block-end: 0.5rem;
}

.eyebrow {
  margin: 0 0 0.2rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--brand-teal);
  letter-spacing: 0.04em;
}

.page-title {
  margin: 0;
  font-size: clamp(1.3rem, 2.2vw, 1.7rem);
  line-height: 1.3;
  color: var(--ink-primary);
}

.page-sub {
  margin: 0.35rem 0 0;
  color: var(--ink-secondary);
  font-size: 0.88rem;
  max-inline-size: 74ch;
}

.subtab-wrap {
  max-inline-size: 100%;
}

/* 搜索条 */
.search-bar-card {
  padding: 1rem 1.2rem;
  display: grid;
  gap: 0.75rem;
}

.search-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem 1.2rem;
}

.search-field {
  flex: 1 1 320px;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  color: var(--ink-muted);
}

.search-field input {
  flex: 1;
  border: 0;
  background: transparent;
  font-size: 0.92rem;
  color: var(--ink-primary);
  outline: none;
}

.filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.84rem;
  color: var(--ink-secondary);
  cursor: pointer;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.preset-label {
  font-size: 0.8rem;
  color: var(--ink-muted);
}

.preset-chip {
  min-block-size: 30px;
  padding: 0.15rem 0.65rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  background: var(--bg-elevated);
  color: var(--ink-secondary);
  font-size: 0.8rem;
  transition: all 0.14s var(--ease-ui);
}

.preset-chip:hover,
.preset-chip.is-active {
  background: var(--brand-indigo);
  border-color: var(--brand-indigo);
  color: #ffffff;
}

/* 主网格 */
.panorama-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 1080px) {
  .panorama-grid {
    grid-template-columns: 1fr;
  }
}

.graph-panel,
.brief-card,
.outreach-panel,
.infra-panel,
.cap-summary-panel {
  padding: 1.2rem;
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.6rem;
  margin-block-end: 0.9rem;
}

.panel-title {
  margin: 0;
  font-size: 1.05rem;
  color: var(--ink-primary);
}

.panel-desc {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: var(--ink-muted);
}

.legend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  font-size: 0.76rem;
  color: var(--ink-secondary);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.dot {
  inline-size: 9px;
  block-size: 9px;
  border-radius: 50%;
  display: inline-block;
}

.dot-village { background: #475569; }
.dot-clue { background: #155e75; }
.dot-person { background: #b02e23; }
.dot-project { background: #944706; }
.dot-company { background: #173f5f; }

.svg-stage {
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, #faf9f5 0%, #f4f2ea 100%);
  overflow: hidden;
}

.graph-svg {
  display: block;
  inline-size: 100%;
  block-size: auto;
}

.col-guides text {
  font-size: 11px;
  font-weight: 700;
  fill: var(--ink-muted);
}

.graph-edge {
  stroke: #cbd5e1;
  stroke-width: 1.25;
  transition: stroke 0.16s ease, stroke-width 0.16s ease;
}

.graph-edge.is-active {
  stroke: var(--brand-teal);
  stroke-width: 2.2;
}

.edge-label {
  font-size: 9.5px;
  fill: var(--brand-indigo);
  font-weight: 600;
}

.graph-node {
  cursor: pointer;
  transition: opacity 0.16s ease;
}

.graph-node.is-dim {
  opacity: 0.35;
}

.node-circle {
  stroke: #ffffff;
  stroke-width: 2;
}

.type-village .node-circle { fill: #475569; }
.type-clue .node-circle { fill: #155e75; }
.type-person .node-circle { fill: #b02e23; }
.type-project .node-circle { fill: #944706; }
.type-company .node-circle { fill: #173f5f; }

.graph-node.is-hit .node-circle {
  stroke: #f59e0b;
  stroke-width: 3.5;
}

.node-pill-bg {
  fill: rgb(255 255 255 / 0.92);
  stroke: var(--border-hairline);
  stroke-width: 0.8;
}

.graph-node.is-hit .node-pill-bg {
  fill: var(--brand-indigo);
  stroke: var(--brand-indigo);
}

.node-label {
  font-size: 10.5px;
  font-weight: 600;
  fill: var(--ink-primary);
}

.graph-node.is-hit .node-label {
  fill: #ffffff;
}

/* 右侧简报与任务签发 */
.brief-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-block-end: 0.9rem;
}

.brief-body {
  display: grid;
  gap: 0.95rem;
}

.hit-grid {
  display: grid;
  gap: 0.65rem;
}

.hit-block {
  padding: 0.65rem 0.8rem;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-hairline);
}

.hit-head {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--ink-secondary);
  margin-block-end: 0.4rem;
}

.hit-links {
  display: grid;
  gap: 0.35rem;
}

.hit-chip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  text-align: start;
  padding: 0.38rem 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-hairline);
  background: var(--bg-surface);
  color: var(--brand-indigo);
  font-size: 0.82rem;
  font-weight: 500;
}

.hit-chip:hover {
  border-color: var(--brand-teal);
  background: var(--brand-teal-tint);
}

.draft-box {
  padding: 0.85rem 0.95rem;
}

.draft-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--brand-teal);
  margin-block-end: 0.45rem;
}

.focus-list {
  margin: 0;
  padding-inline-start: 1.15rem;
  display: grid;
  gap: 0.35rem;
  font-size: 0.84rem;
  color: var(--ink-primary);
}

.draft-empty {
  margin: 0;
  font-size: 0.84rem;
  color: var(--ink-secondary);
}

.confirmed-task-box {
  padding: 0.85rem 0.95rem;
  display: grid;
  gap: 0.45rem;
}

.confirmed-top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--pine);
}

.confirmed-task-box p {
  margin: 0;
  font-size: 0.84rem;
  color: var(--ink-secondary);
}

.dispatch-form {
  padding-block-start: 0.65rem;
  border-block-start: 1px solid var(--border-hairline);
  display: grid;
  gap: 0.65rem;
}

.dispatch-title {
  margin: 0;
  font-size: 0.88rem;
  color: var(--ink-primary);
}

.dispatch-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.dispatch-row label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: var(--ink-muted);
}

.dispatch-row select,
.dispatch-row input {
  min-block-size: 36px;
  padding: 0.3rem 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--bg-surface);
  color: var(--ink-primary);
}

.notice-ok {
  margin: 0;
  font-size: 0.82rem;
  color: var(--pine);
  font-weight: 600;
}

.empty-brief {
  padding: 1.5rem 0.5rem;
  text-align: center;
  color: var(--ink-muted);
  font-size: 0.86rem;
}

/* 干部廉政档案 */
.redline-banner {
  padding: 0.95rem 1.15rem;
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  background: linear-gradient(90deg, var(--brand-teal-tint), #ffffff 70%);
  border-color: var(--brand-teal-border);
}

.redline-icon {
  flex: none;
  color: var(--brand-indigo);
  margin-block-start: 2px;
}

.redline-banner strong {
  display: block;
  font-size: 0.92rem;
  color: var(--brand-indigo);
}

.redline-banner p {
  margin: 0.2rem 0 0;
  font-size: 0.83rem;
  color: var(--ink-secondary);
}

.cadre-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 920px) {
  .cadre-layout {
    grid-template-columns: 1fr;
  }
}

.cadre-list-panel,
.cadre-detail-panel {
  padding: 1.15rem;
}

.cadre-list {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.cadre-item {
  width: 100%;
  text-align: start;
  padding: 0.7rem 0.8rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
  display: grid;
  gap: 0.2rem;
}

.cadre-item.is-selected {
  border-color: var(--brand-indigo);
  background: var(--brand-teal-tint);
}

.cadre-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cadre-level {
  font-size: 0.74rem;
  color: var(--ink-muted);
}

.cadre-item-sub {
  font-size: 0.82rem;
  color: var(--ink-secondary);
}

.cadre-item-meta {
  font-size: 0.76rem;
  color: var(--brand-teal);
  font-weight: 600;
}

.cadre-detail-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  padding-block-end: 0.85rem;
  border-block-end: 1px solid var(--border-hairline);
}

.cadre-id-line {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--ink-muted);
}

.cadre-name {
  margin: 0.25rem 0 0;
  font-size: 1.25rem;
}

.fact-tag-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin-block: 0.9rem;
}

.fact-chip {
  padding: 0.2rem 0.65rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  background: var(--bg-elevated);
  font-size: 0.78rem;
  color: var(--ink-secondary);
  font-weight: 600;
}

.timeline-heading {
  margin: 0.6rem 0 0.75rem;
  font-size: 0.92rem;
  color: var(--ink-primary);
}

.timeline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.timeline-item {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 0.8rem;
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
}

.timeline-date {
  font-size: 0.82rem;
  color: var(--brand-indigo);
  font-weight: 600;
}

.timeline-content {
  display: grid;
  gap: 0.3rem;
}

.timeline-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.source-pill {
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-sm);
  background: var(--brand-indigo);
  color: #ffffff;
  font-size: 0.74rem;
  font-weight: 600;
}

.timeline-result {
  margin: 0;
  font-size: 0.84rem;
  color: var(--ink-secondary);
}

/* 舆情与系统对接 */
.count-chip {
  padding: 0.2rem 0.65rem;
  border-radius: var(--radius-pill);
  background: var(--bg-subtle);
  color: var(--ink-secondary);
  font-size: 0.8rem;
  font-weight: 600;
}

.opinion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.85rem;
}

.opinion-card {
  padding: 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
  display: grid;
  gap: 0.55rem;
}

.opinion-top {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.76rem;
}

.platform-tag {
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-sm);
  background: var(--brand-teal-tint);
  color: var(--brand-teal);
  font-weight: 600;
}

.town-tag {
  color: var(--ink-secondary);
  font-weight: 600;
}

.heat-tag {
  margin-inline-start: auto;
  color: var(--vermilion);
  font-weight: 700;
}

.opinion-text {
  margin: 0;
  font-size: 0.88rem;
  color: var(--ink-primary);
}

.opinion-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding-block-start: 0.35rem;
  border-block-start: 1px solid var(--border-hairline);
}

.muted-time {
  font-size: 0.75rem;
  color: var(--ink-muted);
}

.infra-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 960px) {
  .infra-split {
    grid-template-columns: 1fr;
  }
}

.integration-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.integration-item {
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
  display: grid;
  gap: 0.25rem;
}

.int-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.int-group {
  font-size: 0.75rem;
  color: var(--brand-teal);
  font-weight: 600;
}

.int-name {
  font-size: 0.9rem;
  color: var(--ink-primary);
}

.int-desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-secondary);
}

.cap-list {
  display: grid;
  gap: 0.55rem;
}

.cap-row {
  text-align: start;
  padding: 0.72rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
  display: grid;
  gap: 0.25rem;
  transition: border-color 0.14s ease, background 0.14s ease;
}

.cap-row:hover {
  border-color: var(--brand-indigo);
  background: var(--brand-teal-tint);
}

.cap-row-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--ink-primary);
}

.cap-row-sub {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ink-secondary);
}

.muted-icon {
  color: var(--ink-muted);
}
</style>
