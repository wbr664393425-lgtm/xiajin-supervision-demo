<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FilePlus2,
  Network,
  ShieldAlert,
  Sparkles,
} from 'lucide-vue-next'
import BrandCrest from '@/components/BrandCrest.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TaskCompleteDialog from '@/components/TaskCompleteDialog.vue'
import { FEEDBACK_ISSUES, PLATFORM_CAPABILITIES, TODAY, TOWNS, townName } from '@/domain/mockData'
import { deadlineState, parseClueText } from '@/domain/engines'
import {
  activeTasks,
  allSupervisionFindings,
  completedTasks,
  currentRoleDef,
  navigateTo,
  overdueTasks,
  pendingClues,
  pendingFindingsCount,
  portalState,
  rectifyOpenCount,
  townshipSummary,
} from '@/domain/store'
import type { VerifyTask } from '@/domain/types'

const taskTab = ref<'active' | 'done'>('active')
const completingTask = ref<VerifyTask | null>(null)

const selectedTownId = computed({
  get: () => (portalState.selectedTownFilter && portalState.selectedTownFilter !== 'all' ? portalState.selectedTownFilter : 'qinghe'),
  set: (v: string) => {
    portalState.selectedTownFilter = v
  },
})

const selectedTownData = computed(() => townshipSummary(selectedTownId.value))

interface PriorityItem {
  id: string
  domain: string
  level: 'high' | 'mid' | 'low'
  badge: string
  title: string
  basis: string
  actionLabel: string
  onAction: () => void
}

const priorityQueue = computed<PriorityItem[]>(() => {
  const list: PriorityItem[] = []

  for (const t of overdueTasks.value) {
    list.push({
      id: `overdue-${t.id}`,
      domain: t.domain,
      level: 'high',
      badge: `已超期（限 ${t.deadline}）`,
      title: t.title,
      basis: `承办单位：${t.assignee} · 源自 ${t.sourceId}`,
      actionLabel: '立即办结或督办',
      onAction: () => {
        completingTask.value = t
      },
    })
  }

  const urgentClue = portalState.clues.find((c) => c.id === 'XF-2026-0117') || pendingClues.value[0]
  if (urgentClue && !urgentClue.humanConfirmed) {
    const p = parseClueText(urgentClue.content, urgentClue.overrides)
    list.push({
      id: `clue-${urgentClue.id}`,
      domain: '信访线索',
      level: 'high',
      badge: '高关注待研判',
      title: `${urgentClue.id} · ${townName(urgentClue.town)}${urgentClue.village} ${p.fields.accused.value || ''}（${p.fields.issue.value || '待核'}）`,
      basis: `来信时间 ${urgentClue.receivedAt} · 建议人工核对原文后转核查`,
      actionLabel: '进入原文批注研判',
      onAction: () => navigateTo('clues', { clueId: urgentClue.id }),
    })
  }

  const pendingHighFinding = allSupervisionFindings.value.find(
    (f) => f.level === 'high' && !portalState.findingDecisions[f.id],
  )
  if (pendingHighFinding) {
    list.push({
      id: `find-${pendingHighFinding.id}`,
      domain: '大数据穿透',
      level: 'high',
      badge: pendingHighFinding.rule,
      title: pendingHighFinding.title,
      basis: `碰撞来源：${pendingHighFinding.sourceSystem}`,
      actionLabel: '查看证据链对照',
      onAction: () => navigateTo('radar'),
    })
  }

  const vagueRectify = FEEDBACK_ISSUES.find((i) => i.id === 'ZG-02' && !portalState.rectifyStatus[i.id]?.closed)
  if (vagueRectify) {
    list.push({
      id: `rect-${vagueRectify.id}`,
      domain: '智能巡察',
      level: 'mid',
      badge: '表态式整改退回',
      title: `${vagueRectify.id} · ${vagueRectify.title}`,
      basis: `责任单位：${vagueRectify.owner} · 仅见表态发言、无佐证附件`,
      actionLabel: '复核整改材料',
      onAction: () => navigateTo('inspection'),
    })
  }

  return list
})

const shownTasks = computed(() => (taskTab.value === 'active' ? activeTasks.value : completedTasks.value))

const lifeCounts = computed(() => {
  const totalClues = portalState.clues.length
  const confirmedClues = portalState.clues.filter((c) => c.humanConfirmed || c.flowStage !== '登记受理').length
  const totalFindings = allSupervisionFindings.value.length
  const handledFindings = Object.keys(portalState.findingDecisions).length
  return {
    totalClues,
    confirmedClues,
    totalFindings,
    handledFindings,
    activeTasks: activeTasks.value.length,
    doneTasks: completedTasks.value.length,
  }
})
</script>

<template>
  <div class="home-page">
    <!-- 1. 门户晨间导引区 -->
    <section class="hero-strip paper-card" aria-labelledby="home-hero-title">
      <div class="hero-copy">
        <div class="hero-meta-line">
          <span class="role-pill">{{ currentRoleDef().label }}</span>
          <span class="date-pill num-tabular">基准日期：{{ TODAY }}</span>
          <span class="guard-pill">AI 辅助出疑点 · 人工最终定性</span>
        </div>
        <h1 id="home-hero-title" class="hero-title font-editorial">
          监督事项，一屏澄明；核查线索，闭环留痕
        </h1>
        <p class="hero-summary">
          当前全县在办核查任务 <strong class="num-tabular">{{ activeTasks.length }}</strong> 项（含超期预警
          <strong class="text-vermilion num-tabular">{{ overdueTasks.length }}</strong> 项），
          待人工研判信访 <strong class="num-tabular">{{ pendingClues.length }}</strong> 件，
          大数据跨库待核疑点 <strong class="num-tabular">{{ pendingFindingsCount }}</strong> 处，
          未销号巡察反馈问题 <strong class="num-tabular">{{ rectifyOpenCount }}</strong> 项。
        </p>
      </div>

      <div class="hero-actions">
        <button type="button" class="btn btn-primary hero-cta" @click="navigateTo('clues')">
          <FilePlus2 :size="17" aria-hidden="true" />
          <span>导入 / 粘贴信访材料研判</span>
        </button>
        <button type="button" class="btn btn-secondary hero-cta" @click="navigateTo('panorama')">
          <Network :size="17" aria-hidden="true" />
          <span>发起人员 / 企业全域透视</span>
        </button>
      </div>
    </section>

    <!-- 2. 非对称双栏主舞台：左（今日盯办重点） + 右（核查任务闭环与态势） -->
    <div class="main-split">
      <!-- 今日盯办重点队列 -->
      <section class="paper-card panel-block" aria-labelledby="priority-heading">
        <div class="panel-head">
          <div>
            <h2 id="priority-heading" class="panel-title">今日重点盯办与预警队列</h2>
            <p class="panel-desc">自动聚拢超期红牌、政治纪律线索、跨库高关注疑点与退回整改项，点击直达处置</p>
          </div>
          <span class="count-chip num-tabular">{{ priorityQueue.length }} 项需关注</span>
        </div>

        <ul v-if="priorityQueue.length" class="priority-list" role="list">
          <li v-for="item in priorityQueue" :key="item.id" class="priority-item">
            <div class="priority-top">
              <div class="priority-tags">
                <span class="domain-tag">{{ item.domain }}</span>
                <StatusBadge :tone="item.level" :label="item.badge" />
              </div>
              <button type="button" class="btn btn-secondary btn-sm" @click="item.onAction()">
                <span>{{ item.actionLabel }}</span>
                <ArrowRight :size="14" aria-hidden="true" />
              </button>
            </div>
            <h3 class="priority-title">{{ item.title }}</h3>
            <p class="priority-basis">{{ item.basis }}</p>
          </li>
        </ul>
        <div v-else class="empty-queue">
          <BrandCrest variant="dossier" :size="140" />
          <p>当前重点高关注预警已全部人工处置完毕</p>
        </div>
      </section>

      <!-- 右栏：闭环流转进度 + 我的核查任务 -->
      <aside class="right-column">
        <section class="paper-card panel-block" aria-labelledby="funnel-heading">
          <div class="panel-head">
            <h2 id="funnel-heading" class="panel-title">人机协同闭环统计</h2>
            <span class="sync-note">全站数据实时联动</span>
          </div>

          <div class="funnel-grid">
            <button type="button" class="funnel-cell" @click="navigateTo('clues')">
              <span class="funnel-k">信访材料核定</span>
              <span class="funnel-v num-tabular">{{ lifeCounts.confirmedClues }} / {{ lifeCounts.totalClues }}</span>
              <span class="funnel-sub">已完成要素确认</span>
            </button>
            <button type="button" class="funnel-cell" @click="navigateTo('radar')">
              <span class="funnel-k">穿透疑点处置</span>
              <span class="funnel-v num-tabular">{{ lifeCounts.handledFindings }} / {{ lifeCounts.totalFindings }}</span>
              <span class="funnel-sub">已转核查或人工排除</span>
            </button>
            <div class="funnel-cell is-static">
              <span class="funnel-k">在办核查任务</span>
              <span class="funnel-v num-tabular text-teal">{{ lifeCounts.activeTasks }}</span>
              <span class="funnel-sub">含 {{ overdueTasks.length }} 项超期</span>
            </div>
            <div class="funnel-cell is-static">
              <span class="funnel-k">已办结核查</span>
              <span class="funnel-v num-tabular text-pine">{{ lifeCounts.doneTasks }}</span>
              <span class="funnel-sub">结论已归档留痕</span>
            </div>
          </div>
        </section>

        <section class="paper-card panel-block" aria-labelledby="tasks-heading">
          <div class="panel-head">
            <h2 id="tasks-heading" class="panel-title">核查任务办理台账</h2>
            <div class="seg-switch" role="tablist" aria-label="核查任务状态切换">
              <button
                type="button"
                role="tab"
                class="seg-btn"
                :aria-selected="taskTab === 'active'"
                @click="taskTab = 'active'"
              >
                在办 ({{ activeTasks.length }})
              </button>
              <button
                type="button"
                role="tab"
                class="seg-btn"
                :aria-selected="taskTab === 'done'"
                @click="taskTab = 'done'"
              >
                已办结 ({{ completedTasks.length }})
              </button>
            </div>
          </div>

          <ul class="task-list" role="list">
            <li v-for="task in shownTasks" :key="task.id" class="task-item">
              <div class="task-head">
                <span class="font-mono-code task-id">{{ task.id }}</span>
                <StatusBadge
                  v-if="task.status === '处理中' && task.deadline < TODAY"
                  tone="high"
                  :label="`超期 · 限 ${task.deadline}`"
                />
                <StatusBadge v-else-if="task.status === '处理中'" tone="info" :label="`限 ${task.deadline}`" />
                <StatusBadge v-else tone="ok" label="已核查办结" />
              </div>
              <p class="task-title">{{ task.title }}</p>
              <div class="task-foot">
                <span>{{ task.domain }} · {{ task.assignee }}</span>
                <button
                  v-if="task.status === '处理中'"
                  type="button"
                  class="btn btn-teal btn-sm"
                  @click="completingTask = task"
                >
                  <CheckCircle2 :size="14" aria-hidden="true" />
                  记录结果办结
                </button>
              </div>
              <p v-if="task.result" class="task-result">核查结论：{{ task.result }}</p>
            </li>
          </ul>
        </section>
      </aside>
    </div>

    <!-- 3. 夏津县十四乡镇街道监督矩阵 -->
    <section class="paper-card panel-block" aria-labelledby="township-heading">
      <div class="panel-head">
        <div>
          <h2 id="township-heading" class="panel-title">县域十四乡镇街道监督覆盖态势</h2>
          <p class="panel-desc">示意分区布局（乡镇A–乡镇N，非真实地理测绘边界），点击任意乡镇即时展开“一镇一账”透视</p>
        </div>
        <div class="legend-row" aria-label="关注级别图例">
          <span class="legend-item"><ShieldAlert :size="13" class="text-vermilion" aria-hidden="true" /> 重点盯办</span>
          <span class="legend-item"><AlertCircle :size="13" class="text-amber" aria-hidden="true" /> 优先核查</span>
          <span class="legend-item"><Clock :size="13" class="text-teal" aria-hidden="true" /> 常态监督</span>
        </div>
      </div>

      <div class="town-split">
        <div class="town-matrix" role="listbox" aria-label="14个乡镇街道选择列表">
          <button
            v-for="t in TOWNS"
            :key="t.id"
            type="button"
            role="option"
            :aria-selected="selectedTownId === t.id"
            class="town-tile"
            :class="[`level-${townshipSummary(t.id).level}`, { selected: selectedTownId === t.id }]"
            @click="selectedTownId = t.id"
          >
            <div class="town-tile-top">
              <strong>{{ t.name }}</strong>
              <span class="town-zone">{{ t.zone }}</span>
            </div>
            <div class="town-metrics num-tabular">
              <span>线索 {{ townshipSummary(t.id).cluesCount }}</span>
              <span>疑点 {{ townshipSummary(t.id).findingsCount }}</span>
            </div>
            <div class="town-villages">{{ t.villages.join(' · ') }}</div>
            <span v-if="townshipSummary(t.id).overdueCount > 0" class="town-overdue-flag">
              超期 {{ townshipSummary(t.id).overdueCount }}
            </span>
          </button>
        </div>

        <div class="town-detail paper-card-subtle">
          <div class="town-detail-head">
            <div>
              <span class="town-eyebrow">一镇一账 · 属地透视</span>
              <h3>{{ selectedTownData.name }}（{{ TOWNS.find(x => x.id === selectedTownId)?.villages.join('、') }}）</h3>
            </div>
            <StatusBadge
              :tone="selectedTownData.level"
              :label="selectedTownData.level === 'high' ? '重点关注区域' : selectedTownData.level === 'mid' ? '需优先核查' : '常态平稳'"
            />
          </div>

          <div class="town-kpi-row num-tabular">
            <div>
              <span>在库信访</span>
              <strong>{{ selectedTownData.cluesCount }} 件</strong>
            </div>
            <div>
              <span>穿透疑点</span>
              <strong>{{ selectedTownData.findingsCount }} 处</strong>
            </div>
            <div>
              <span>在办任务</span>
              <strong>{{ selectedTownData.activeTasksCount }} 项</strong>
            </div>
            <div>
              <span>未销号整改</span>
              <strong>{{ selectedTownData.openRectifyCount }} 项</strong>
            </div>
          </div>

          <div class="town-records">
            <p class="sub-cap">关联信访线索与穿透疑点摘录</p>
            <ul v-if="selectedTownData.clues.length || selectedTownData.findings.length" class="town-list">
              <li v-for="c in selectedTownData.clues.slice(0, 3)" :key="c.id">
                <button type="button" class="town-link-btn" @click="navigateTo('clues', { clueId: c.id })">
                  <span class="font-mono-code">{{ c.id }}</span>
                  <span class="tl-text">{{ c.village }} · {{ c.content.slice(0, 34) }}…</span>
                  <span class="tl-status">{{ deadlineState(c.receivedAt, TODAY, c.flowStage === '处置办结').state }}</span>
                </button>
              </li>
              <li v-for="f in selectedTownData.findings.slice(0, 3)" :key="f.id">
                <button type="button" class="town-link-btn" @click="navigateTo('radar')">
                  <span class="tl-badge">疑点</span>
                  <span class="tl-text">{{ f.rule }} · {{ f.title.slice(0, 32) }}…</span>
                </button>
              </li>
            </ul>
            <p v-else class="town-empty">该乡镇当前暂无待核查信访或异常疑点样例。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. 全平台八大能力门户直达矩阵 -->
    <section class="paper-card panel-block" aria-labelledby="cap-heading">
      <div class="panel-head">
        <div>
          <h2 id="cap-heading" class="panel-title">一体化平台八大能力版图</h2>
          <p class="panel-desc">覆盖问题发现、审查审理、日常监督与内网安全管控全链条，点击卡片进入对应业务门户</p>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" @click="navigateTo('panorama')">
          <Sparkles :size="14" aria-hidden="true" />
          <span>查看全部对接清单</span>
        </button>
      </div>

      <div class="cap-grid">
        <button
          v-for="cap in PLATFORM_CAPABILITIES"
          :key="cap.key"
          type="button"
          class="cap-card"
          @click="navigateTo(cap.targetPage)"
        >
          <div class="cap-top">
            <span class="cap-phase" :class="{ live: cap.phase === '本期已实现' }">{{ cap.phase }}</span>
            <ArrowRight :size="15" class="cap-arrow" aria-hidden="true" />
          </div>
          <h3 class="cap-title">{{ cap.title }}</h3>
          <p class="cap-summary">{{ cap.summary }}</p>
          <div class="cap-io">
            <span><strong>输入：</strong>{{ cap.input }}</span>
            <span><strong>产出：</strong>{{ cap.output }}</span>
          </div>
        </button>
      </div>
    </section>

    <TaskCompleteDialog :task="completingTask" @close="completingTask = null" />
  </div>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: 1.35rem;
}

.hero-strip {
  padding: 1.5rem 1.75rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  background:
    linear-gradient(125deg, #ffffff 62%, #f1f5f7 100%);
}

.hero-copy {
  flex: 1 1 540px;
  min-inline-size: 0;
}

.hero-meta-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-block-end: 0.55rem;
}

.role-pill,
.date-pill,
.guard-pill {
  padding: 0.18rem 0.6rem;
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-weight: 600;
}

.role-pill {
  background: var(--brand-indigo);
  color: #ffffff;
}

.date-pill {
  background: var(--bg-subtle);
  color: var(--ink-secondary);
}

.guard-pill {
  background: var(--amber-tint);
  color: var(--amber);
  border: 1px solid var(--amber-border);
}

.hero-title {
  font-size: clamp(1.45rem, 2.2vw, 1.85rem);
  font-weight: 700;
  color: var(--ink-primary);
  line-height: 1.25;
}

.hero-summary {
  margin-block-start: 0.55rem;
  font-size: 0.94rem;
  color: var(--ink-secondary);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.hero-cta {
  min-block-size: 44px;
  padding-inline: 1.15rem;
}

.main-split {
  display: grid;
  grid-template-columns: 1.35fr 0.95fr;
  gap: 1.25rem;
  align-items: start;
}

.right-column {
  display: grid;
  gap: 1.25rem;
}

.panel-block {
  padding: 1.25rem 1.35rem;
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-block-end: 1rem;
}

.panel-title {
  font-size: 1.06rem;
  font-weight: 700;
  color: var(--ink-primary);
}

.panel-desc {
  font-size: 0.82rem;
  color: var(--ink-muted);
  margin-block-start: 0.15rem;
}

.count-chip {
  padding: 0.22rem 0.65rem;
  border-radius: var(--radius-pill);
  background: var(--vermilion-tint);
  color: var(--vermilion);
  font-size: 0.8rem;
  font-weight: 700;
}

.sync-note {
  font-size: 0.78rem;
  color: var(--brand-teal);
  font-weight: 600;
}

.priority-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.75rem;
}

.priority-item {
  padding: 0.9rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
  display: grid;
  gap: 0.4rem;
}

.priority-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.priority-tags {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.domain-tag {
  padding: 0.18rem 0.5rem;
  border-radius: 5px;
  font-size: 0.76rem;
  font-weight: 700;
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  color: var(--brand-indigo);
}

.priority-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink-primary);
}

.priority-basis {
  font-size: 0.82rem;
  color: var(--ink-muted);
}

.empty-queue {
  display: grid;
  place-items: center;
  gap: 0.65rem;
  padding: 2rem 1rem;
  color: var(--ink-muted);
}

.funnel-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.65rem;
}

.funnel-cell {
  display: grid;
  gap: 0.18rem;
  padding: 0.8rem 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
  text-align: start;
}

button.funnel-cell:hover {
  border-color: var(--brand-teal);
  background: var(--brand-teal-tint);
}

.funnel-k {
  font-size: 0.78rem;
  color: var(--ink-muted);
  font-weight: 600;
}

.funnel-v {
  font-size: 1.38rem;
  font-weight: 700;
  color: var(--ink-primary);
}

.funnel-sub {
  font-size: 0.75rem;
  color: var(--ink-muted);
}

.seg-switch {
  display: inline-flex;
  background: var(--bg-subtle);
  padding: 3px;
  border-radius: var(--radius-sm);
}

.seg-btn {
  border: 0;
  background: transparent;
  padding: 0.3rem 0.65rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-secondary);
}

.seg-btn[aria-selected="true"] {
  background: var(--bg-surface);
  color: var(--brand-indigo);
  box-shadow: var(--shadow-xs);
}

.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.65rem;
}

.task-item {
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-md);
  display: grid;
  gap: 0.35rem;
}

.task-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.task-id {
  color: var(--ink-muted);
}

.task-title {
  font-size: 0.88rem;
  font-weight: 600;
}

.task-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: var(--ink-muted);
}

.task-result {
  padding: 0.45rem 0.65rem;
  border-radius: var(--radius-sm);
  background: var(--pine-tint);
  color: var(--pine);
  font-size: 0.8rem;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  font-size: 0.8rem;
  color: var(--ink-secondary);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.town-split {
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 1.1rem;
  align-items: start;
}

.town-matrix {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.6rem;
}

.town-tile {
  position: relative;
  display: grid;
  gap: 0.25rem;
  padding: 0.7rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-hairline);
  background: var(--bg-surface);
  text-align: start;
  transition: border-color 0.14s ease, transform 0.12s ease;
}

.town-tile:hover {
  border-color: var(--brand-teal);
}

.town-tile.level-high {
  border-inline-start: 4px solid var(--vermilion);
}

.town-tile.level-mid {
  border-inline-start: 4px solid var(--amber);
}

.town-tile.level-low {
  border-inline-start: 4px solid var(--brand-teal);
}

.town-tile.selected {
  background: var(--brand-teal-tint);
  border-color: var(--brand-indigo);
  box-shadow: var(--shadow-xs);
}

.town-tile-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.3rem;
}

.town-zone {
  font-size: 0.72rem;
  color: var(--ink-muted);
}

.town-metrics {
  display: flex;
  gap: 0.6rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--brand-indigo);
}

.town-villages {
  font-size: 0.74rem;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.town-overdue-flag {
  position: absolute;
  inset-block-start: -7px;
  inset-inline-end: 8px;
  padding: 0.05rem 0.4rem;
  border-radius: var(--radius-pill);
  background: var(--vermilion);
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
}

.town-detail {
  padding: 1rem 1.1rem;
  display: grid;
  gap: 0.85rem;
}

.town-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.6rem;
}

.town-eyebrow {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--brand-teal);
}

.town-detail-head h3 {
  font-size: 1rem;
  margin-block-start: 0.1rem;
}

.town-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  padding: 0.65rem;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-hairline);
}

.town-kpi-row span {
  display: block;
  font-size: 0.72rem;
  color: var(--ink-muted);
}

.town-kpi-row strong {
  font-size: 0.92rem;
}

.sub-cap {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-secondary);
  margin-block-end: 0.45rem;
}

.town-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.4rem;
}

.town-link-btn {
  inline-size: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  font-size: 0.8rem;
  text-align: start;
}

.town-link-btn:hover {
  border-color: var(--brand-teal);
}

.tl-badge {
  flex: none;
  padding: 0.08rem 0.35rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  background: var(--amber-tint);
  color: var(--amber);
}

.tl-text {
  flex: 1;
  min-inline-size: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tl-status {
  flex: none;
  font-size: 0.72rem;
  color: var(--ink-muted);
}

.town-empty {
  font-size: 0.82rem;
  color: var(--ink-muted);
}

.cap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 0.85rem;
}

.cap-card {
  display: grid;
  gap: 0.45rem;
  padding: 1rem 1.05rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
  text-align: start;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.cap-card:hover {
  border-color: var(--brand-indigo);
  background: var(--bg-surface);
}

.cap-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cap-phase {
  padding: 0.14rem 0.5rem;
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--bg-subtle);
  color: var(--ink-secondary);
}

.cap-phase.live {
  background: var(--pine-tint);
  color: var(--pine);
}

.cap-arrow {
  color: var(--ink-muted);
}

.cap-title {
  font-size: 0.95rem;
  font-weight: 700;
}

.cap-summary {
  font-size: 0.82rem;
  color: var(--ink-secondary);
}

.cap-io {
  display: grid;
  gap: 0.18rem;
  font-size: 0.76rem;
  color: var(--ink-muted);
  padding-block-start: 0.4rem;
  border-block-start: 1px dashed var(--border-hairline);
}

.text-vermilion {
  color: var(--vermilion);
}

.text-amber {
  color: var(--amber);
}

.text-teal {
  color: var(--brand-teal);
}

.text-pine {
  color: var(--pine);
}

@media (max-width: 1080px) {
  .main-split,
  .town-split {
    grid-template-columns: 1fr;
  }
}
</style>
