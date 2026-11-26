<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowRight,
  Check,
  Edit3,
  FilePlus2,
  GitCompare,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Send,
  Sparkles,
  UserCheck,
} from 'lucide-vue-next'
import StatusBadge from '@/components/StatusBadge.vue'
import { INTAKE_SAMPLES, TODAY, TOWNS, townName } from '@/domain/mockData'
import {
  FIELD_ORDER,
  deadlineState,
  findSimilarClues,
  gradeClue,
  parseClueText,
  segmentText,
} from '@/domain/engines'
import {
  addNewClue,
  confirmClueHuman,
  createVerifyTaskFromClue,
  navigateTo,
  portalState,
  toggleClueLink,
  updateClueFieldOverride,
} from '@/domain/store'
import type { Channel, FieldKey } from '@/domain/types'

const queueOpen = ref(true)
const queueFilter = ref<'all' | 'pending' | 'confirmed'>('all')
const searchText = ref('')
const activeHighlightKey = ref<FieldKey | null>(null)
const editingKey = ref<FieldKey | null>(null)
const editBuffer = ref('')

// 新建信访材料面板
const showIntakeModal = ref(false)
const newChannel = ref<Channel>('来信')
const newTown = ref('sangyuan')
const newVillage = ref('桑园村')
const newReporter = ref('')
const newContent = ref('')

// 转核查任务表单
const taskAssignee = ref('第一监督检查室')
const taskDeadline = ref('2026-11-18')

const filteredClues = computed(() => {
  const q = searchText.value.trim()
  return portalState.clues.filter((c) => {
    if (queueFilter.value === 'pending' && c.humanConfirmed) return false
    if (queueFilter.value === 'confirmed' && !c.humanConfirmed) return false
    if (!q) return true
    return c.id.includes(q) || c.village.includes(q) || c.content.includes(q) || townName(c.town).includes(q)
  })
})

const currentClue = computed(
  () => portalState.clues.find((c) => c.id === portalState.selectedClueId) || portalState.clues[0]!,
)

const parsed = computed(() => parseClueText(currentClue.value.content, currentClue.value.overrides))
const grading = computed(() => gradeClue(currentClue.value, parsed.value))
const similarList = computed(() => findSimilarClues(currentClue.value, portalState.clues))
const dl = computed(() => deadlineState(currentClue.value.receivedAt, TODAY, currentClue.value.flowStage === '处置办结'))

const existingTask = computed(() => portalState.tasks.find((t) => t.sourceId === currentClue.value.id))

const textSegments = computed(() => {
  const spans = FIELD_ORDER.flatMap((key) => {
    const field = parsed.value.fields[key]
    if (!field.span) return []
    return [{ ...field.span, key, active: activeHighlightKey.value === key }]
  })
  return segmentText(currentClue.value.content, spans)
})

watch(
  () => currentClue.value.id,
  () => {
    activeHighlightKey.value = null
    editingKey.value = null
  },
)

function startEdit(key: FieldKey) {
  editingKey.value = key
  editBuffer.value = parsed.value.fields[key].value
}

function saveEdit(key: FieldKey) {
  updateClueFieldOverride(currentClue.value.id, key, editBuffer.value.trim())
  editingKey.value = null
}

function loadSample(key: string) {
  const s = INTAKE_SAMPLES.find((x) => x.key === key)
  if (!s) return
  newChannel.value = s.channel
  newTown.value = s.town
  newVillage.value = s.village
  newReporter.value = s.reporter
  newContent.value = s.text
}

function submitIntake() {
  if (!newContent.value.trim()) return
  addNewClue({
    channel: newChannel.value,
    town: newTown.value,
    village: newVillage.value,
    reporter: newReporter.value,
    content: newContent.value,
  })
  showIntakeModal.value = false
  newContent.value = ''
}

function isLinked(otherId: string) {
  const key = [currentClue.value.id, otherId].sort().join('|')
  return portalState.linkedCluePairs.includes(key)
}

function handleCreateTask() {
  createVerifyTaskFromClue(currentClue.value.id, taskAssignee.value, taskDeadline.value, grading.value.level)
}
</script>

<template>
  <div class="clues-page">
    <!-- 顶部业务流导引条 -->
    <header class="page-intro paper-card">
      <div>
        <h1 class="page-h1 font-editorial">信访举报与线索批注研判台</h1>
        <p class="page-sub">
          材料为主角：点击右侧任意要素，原文自动高亮回指原句；AI 提取采用虚线提示，经您核对修订后落为实线核定。
        </p>
      </div>
      <div class="intro-actions">
        <button type="button" class="btn btn-secondary btn-sm" @click="queueOpen = !queueOpen">
          <PanelLeftClose v-if="queueOpen" :size="15" aria-hidden="true" />
          <PanelLeftOpen v-else :size="15" aria-hidden="true" />
          <span>{{ queueOpen ? '收起左侧线索队列' : '展开线索队列' }}</span>
        </button>
        <button type="button" class="btn btn-primary" @click="showIntakeModal = !showIntakeModal">
          <FilePlus2 :size="16" aria-hidden="true" />
          <span>{{ showIntakeModal ? '收起导入面板' : '导入 / 粘贴新举报材料' }}</span>
        </button>
      </div>
    </header>

    <!-- 渐进式材料导入区 -->
    <section v-if="showIntakeModal" class="intake-drawer paper-card" aria-labelledby="intake-heading">
      <div class="intake-head">
        <div>
          <h2 id="intake-heading">导入新举报材料 · 即时规则解析演示</h2>
          <p>支持直接载入扫描件模拟转写、12345 工单或网络长文本，也可自由粘贴文本</p>
        </div>
        <div class="sample-pills">
          <span class="sample-tip">载入模拟样例：</span>
          <button v-for="s in INTAKE_SAMPLES" :key="s.key" type="button" class="btn btn-secondary btn-sm" @click="loadSample(s.key)">
            {{ s.label }}
          </button>
        </div>
      </div>

      <form class="intake-form" @submit.prevent="submitIntake">
        <div class="intake-meta-row">
          <div>
            <label for="in-channel" class="f-label">来信渠道</label>
            <select id="in-channel" v-model="newChannel" class="f-input">
              <option value="来信">来信</option>
              <option value="来访">来访</option>
              <option value="12345工单">12345工单</option>
              <option value="网络举报">网络举报</option>
            </select>
          </div>
          <div>
            <label for="in-town" class="f-label">所属乡镇（演示）</label>
            <select id="in-town" v-model="newTown" class="f-input">
              <option v-for="t in TOWNS" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label for="in-village" class="f-label">村居 / 社区</label>
            <input id="in-village" v-model="newVillage" type="text" class="f-input" />
          </div>
          <div>
            <label for="in-reporter" class="f-label">反映人标注</label>
            <input id="in-reporter" v-model="newReporter" type="text" class="f-input" placeholder="如：实名 · 群众" />
          </div>
        </div>
        <div>
          <label for="in-text" class="f-label">举报材料原文（模拟 OCR / 转写内容）</label>
          <textarea
            id="in-text"
            v-model="newContent"
            rows="4"
            required
            class="f-textarea"
            placeholder="请粘贴举报材料原文，或点击上方「载入模拟样例」快速体验…"
          />
        </div>
        <div class="intake-foot">
          <span class="sim-note">注：演示环境采用确定性规则提取要素并标明“模拟解析”，绝不传输真实涉密数据。</span>
          <button type="submit" class="btn btn-primary">
            <Sparkles :size="15" aria-hidden="true" />
            <span>运行智能要素解析并入库</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 工作区主网格 -->
    <div class="workbench" :class="{ 'no-left': !queueOpen }">
      <!-- 左栏：线索队列 -->
      <aside v-if="queueOpen" class="queue-panel paper-card" aria-label="信访线索列表">
        <div class="queue-search">
          <Search :size="15" class="q-icon" aria-hidden="true" />
          <label for="clue-filter-input" class="visually-hidden">搜索线索编号或内容</label>
          <input id="clue-filter-input" v-model="searchText" type="search" placeholder="筛选编号、村名、人名…" class="q-input" />
        </div>

        <div class="queue-tabs" role="tablist" aria-label="线索核定状态过滤">
          <button type="button" role="tab" class="q-tab" :aria-selected="queueFilter === 'all'" @click="queueFilter = 'all'">
            全部 ({{ portalState.clues.length }})
          </button>
          <button type="button" role="tab" class="q-tab" :aria-selected="queueFilter === 'pending'" @click="queueFilter = 'pending'">
            待核定 ({{ portalState.clues.filter(c => !c.humanConfirmed).length }})
          </button>
          <button type="button" role="tab" class="q-tab" :aria-selected="queueFilter === 'confirmed'" @click="queueFilter = 'confirmed'">
            已核定
          </button>
        </div>

        <ul class="queue-list" role="list">
          <li v-for="c in filteredClues" :key="c.id">
            <button
              type="button"
              class="queue-card"
              :class="{ active: c.id === currentClue.id }"
              @click="portalState.selectedClueId = c.id"
            >
              <div class="qc-top">
                <span class="font-mono-code qc-id">{{ c.id }}</span>
                <StatusBadge v-if="c.humanConfirmed" tone="human" label="已核定" />
                <StatusBadge v-else tone="ai" label="待核对" />
              </div>
              <div class="qc-loc">{{ townName(c.town) }} · {{ c.village }} · {{ c.channel }}</div>
              <p class="qc-snippet">{{ c.content }}</p>
              <div class="qc-foot num-tabular">
                <span>{{ c.receivedAt }}</span>
                <span>{{ c.flowStage }}</span>
              </div>
            </button>
          </li>
        </ul>
      </aside>

      <!-- 中栏：原始举报材料为主角（舒适纸感批注区） -->
      <article class="reading-panel paper-card" aria-labelledby="dossier-title">
        <div class="reading-head">
          <div>
            <div class="reading-badges">
              <span class="font-mono-code code-pill">{{ currentClue.id }}</span>
              <span class="meta-pill">{{ currentClue.channel }}</span>
              <span class="meta-pill">{{ townName(currentClue.town) }} · {{ currentClue.village }}</span>
              <StatusBadge
                :tone="dl.state === '已超期' ? 'high' : dl.state === '即将到期' ? 'mid' : dl.state === '已办结' ? 'ok' : 'info'"
                :label="dl.state === '已办结' ? '已办结' : dl.left < 0 ? `已超期 ${Math.abs(dl.left)} 日` : `15日限期剩 ${dl.left} 日`"
              />
            </div>
            <h2 id="dossier-title" class="dossier-title font-editorial">
              原始举报材料审阅笺 · {{ currentClue.reporter }}
            </h2>
          </div>
          <div class="flow-steps" aria-label="线索处置节点">
            <span
              v-for="stage in ['登记受理', '分办交办', '初步核实', '处置办结']"
              :key="stage"
              class="flow-node"
              :class="{ current: currentClue.flowStage === stage }"
            >
              {{ stage }}
            </span>
          </div>
        </div>

        <div class="reading-hint">
          <span>高亮标注为规则引擎定位的原文依据；点击右侧要素卡可高亮闪烁定位对应句段。</span>
        </div>

        <!-- 原始文本渲染区：逐字不丢，高亮回溯 -->
        <div class="manuscript-paper" tabindex="0">
          <p class="manuscript-text">
            <template v-for="(seg, idx) in textSegments" :key="idx">
              <mark
                v-if="seg.key"
                class="evidence-mark"
                :class="{ focused: seg.active }"
                @click="activeHighlightKey = seg.key as FieldKey"
              >
                {{ seg.text }}
              </mark>
              <span v-else>{{ seg.text }}</span>
            </template>
          </p>
        </div>

        <!-- 可解释的相似/多头线索对照 -->
        <section v-if="similarList.length" class="similar-section" aria-labelledby="similar-heading">
          <div class="sim-header">
            <GitCompare :size="17" class="sim-icon" aria-hidden="true" />
            <div>
              <h3 id="similar-heading">发现 {{ similarList.length }} 条疑似重复 / 多头关联线索</h3>
              <p>系统仅展示重合依据与原句对照，是否并案由人工决定，双方原件永久保留</p>
            </div>
          </div>

          <div v-for="sim in similarList" :key="sim.other.id" class="sim-card">
            <div class="sim-card-top">
              <div class="sim-meta">
                <span class="font-mono-code code-pill">{{ sim.other.id }}</span>
                <StatusBadge :tone="sim.kind === 'duplicate' ? 'mid' : 'info'" :label="sim.kind === 'duplicate' ? '疑似重复反映' : '跨渠道关联线索'" />
                <span class="sim-chan">{{ sim.other.channel }} · {{ sim.other.receivedAt }}</span>
              </div>
              <button
                type="button"
                class="btn btn-sm"
                :class="isLinked(sim.other.id) ? 'btn-teal' : 'btn-secondary'"
                @click="toggleClueLink(currentClue.id, sim.other.id)"
              >
                <Link2 :size="14" aria-hidden="true" />
                <span>{{ isLinked(sim.other.id) ? '已人工关联（保留原件）' : '确认并案关联' }}</span>
              </button>
            </div>

            <ul class="sim-reasons">
              <li v-for="r in sim.reasons" :key="r">{{ r }}</li>
            </ul>

            <div v-if="sim.sentencePairs.length" class="sim-diff-grid">
              <div class="diff-col">
                <span class="diff-cap">本件原句（{{ currentClue.id }}）</span>
                <p v-for="(p, i) in sim.sentencePairs" :key="i">“{{ p.a }}”</p>
              </div>
              <div class="diff-col">
                <span class="diff-cap">对照件原句（{{ sim.other.id }}）</span>
                <p v-for="(p, i) in sim.sentencePairs" :key="i">“{{ p.b }}”</p>
              </div>
            </div>
          </div>
        </section>
      </article>

      <!-- 右栏：双轨要素提取与人工确认转核查 -->
      <aside class="triage-panel paper-card" aria-label="要素核对与人工裁决">
        <div class="triage-head">
          <h2>要素提取与人工核定</h2>
          <p>点击条目定位原文；点击「修订」可直接纠错并落为人工核定</p>
        </div>

        <ul class="field-list" role="list">
          <li
            v-for="key in FIELD_ORDER"
            :key="key"
            class="field-card"
            :class="[
              parsed.fields[key].humanEdited || currentClue.humanConfirmed ? 'track-human-confirmed' : 'track-ai-suggested',
              { isFocused: activeHighlightKey === key },
            ]"
            @mouseenter="activeHighlightKey = key"
            @click="activeHighlightKey = key"
          >
            <div class="fc-top">
              <span class="fc-label">{{ parsed.fields[key].label }}</span>
              <div class="fc-badges">
                <StatusBadge
                  v-if="parsed.fields[key].humanEdited || currentClue.humanConfirmed"
                  tone="human"
                  label="人工已核定"
                />
                <StatusBadge
                  v-else
                  tone="ai"
                  :label="parsed.fields[key].confidence === 'high' ? '智能提取 · 可溯源' : '低置信 · 需人工核'"
                />
                <button
                  type="button"
                  class="icon-edit-btn"
                  :aria-label="`修订${parsed.fields[key].label}`"
                  @click.stop="startEdit(key)"
                >
                  <Edit3 :size="13" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div v-if="editingKey === key" class="fc-edit-row" @click.stop>
              <input v-model="editBuffer" type="text" class="fc-input" @keyup.enter="saveEdit(key)" />
              <button type="button" class="btn btn-primary btn-sm" @click="saveEdit(key)">保存</button>
            </div>
            <p v-else class="fc-val">{{ parsed.fields[key].value || '（原文未明确提及，可点右侧图标补充）' }}</p>
          </li>
        </ul>

        <!-- 六大纪律参考尺 -->
        <section class="discipline-box" aria-label="六大纪律参考标尺">
          <div class="disc-head">
            <strong>六大纪律参考标签与初筛优先级</strong>
            <StatusBadge
              :tone="grading.level"
              :label="grading.nonDisciplinary ? '非违纪诉求建议' : grading.level === 'high' ? '高关注优先核查' : grading.level === 'mid' ? '中关注核查' : '一般关注'"
            />
          </div>
          <div v-if="grading.tags.length" class="disc-tags">
            <span v-for="t in grading.tags" :key="t.name" class="disc-pill">{{ t.name }}（命中 {{ t.hits }} 处）</span>
          </div>
          <ul class="disc-reasons">
            <li v-for="r in grading.reasons" :key="r">{{ r }}</li>
          </ul>
          <p class="disc-redline">红线提示：标签与优先级仅用于辅助分流排序，不代表违纪定性或处置结论。</p>
        </section>

        <!-- 人工确认与转核查主操作区 -->
        <section class="action-box">
          <div v-if="existingTask" class="linked-task-box track-human-confirmed">
            <div class="lt-top">
              <UserCheck :size="16" aria-hidden="true" />
              <strong>已形成核查任务 · {{ existingTask.id }}</strong>
            </div>
            <p>承办：{{ existingTask.assignee }} · 限期 {{ existingTask.deadline }}（{{ existingTask.status }}）</p>
            <button type="button" class="btn btn-secondary btn-sm" @click="navigateTo('home')">
              <span>前往门户首页跟踪任务</span>
              <ArrowRight :size="14" aria-hidden="true" />
            </button>
          </div>

          <template v-else>
            <button
              v-if="!currentClue.humanConfirmed"
              type="button"
              class="btn btn-secondary full-btn"
              @click="confirmClueHuman(currentClue.id)"
            >
              <Check :size="16" aria-hidden="true" />
              <span>仅确认 6 项线索要素入库</span>
            </button>

            <div class="dispatch-form">
              <div class="disp-row">
                <div>
                  <label for="disp-assignee" class="f-label">交办承办组</label>
                  <select id="disp-assignee" v-model="taskAssignee" class="f-input">
                    <option value="第一监督检查室">第一监督检查室</option>
                    <option value="第二监督检查室">第二监督检查室</option>
                    <option :value="`${townName(currentClue.town)}纪委`">{{ townName(currentClue.town) }}纪委</option>
                  </select>
                </div>
                <div>
                  <label for="disp-deadline" class="f-label">核查反馈时限</label>
                  <input id="disp-deadline" v-model="taskDeadline" type="date" class="f-input" />
                </div>
              </div>
              <button type="button" class="btn btn-primary full-btn" @click="handleCreateTask">
                <Send :size="16" aria-hidden="true" />
                <span>确认信息并生成核查任务</span>
              </button>
            </div>
          </template>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.clues-page {
  display: grid;
  gap: 1.15rem;
}

.page-intro {
  padding: 1.15rem 1.35rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-h1 {
  font-size: 1.45rem;
  font-weight: 700;
}

.page-sub {
  font-size: 0.86rem;
  color: var(--ink-muted);
  margin-block-start: 0.2rem;
}

.intro-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.intake-drawer {
  padding: 1.2rem 1.35rem;
  display: grid;
  gap: 1rem;
  border-color: var(--brand-teal-border);
}

.intake-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.intake-head h2 {
  font-size: 1.02rem;
}

.intake-head p {
  font-size: 0.82rem;
  color: var(--ink-muted);
}

.sample-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.sample-tip {
  font-size: 0.78rem;
  color: var(--ink-muted);
}

.intake-form {
  display: grid;
  gap: 0.85rem;
}

.intake-meta-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.75rem;
}

.f-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-secondary);
  margin-block-end: 0.25rem;
}

.f-input,
.f-textarea {
  inline-size: 100%;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  font-size: 0.86rem;
}

.f-input {
  min-block-size: 36px;
}

.f-textarea {
  line-height: 1.65;
  resize: vertical;
}

.intake-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.sim-note {
  font-size: 0.78rem;
  color: var(--ink-muted);
}

.workbench {
  display: grid;
  grid-template-columns: 280px minmax(0, 1.35fr) 365px;
  gap: 1.1rem;
  align-items: start;
}

.workbench.no-left {
  grid-template-columns: minmax(0, 1.45fr) 380px;
}

.queue-panel {
  padding: 0.85rem;
  display: grid;
  gap: 0.7rem;
  max-block-size: calc(100dvh - 150px);
  overflow: hidden;
}

.queue-search {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
}

.q-icon {
  color: var(--ink-muted);
}

.q-input {
  flex: 1;
  min-inline-size: 0;
  border: 0;
  background: transparent;
  font-size: 0.84rem;
  outline: none;
}

.queue-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
  background: var(--bg-subtle);
  padding: 3px;
  border-radius: var(--radius-sm);
}

.q-tab {
  border: 0;
  background: transparent;
  padding: 0.3rem 0.2rem;
  border-radius: 4px;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--ink-secondary);
}

.q-tab[aria-selected="true"] {
  background: var(--bg-surface);
  color: var(--brand-indigo);
}

.queue-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  max-block-size: calc(100dvh - 280px);
}

.queue-card {
  inline-size: 100%;
  display: grid;
  gap: 0.3rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-surface);
  text-align: start;
}

.queue-card:hover {
  border-color: var(--brand-teal);
}

.queue-card.active {
  background: var(--brand-teal-tint);
  border-color: var(--brand-indigo);
}

.qc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.qc-id {
  font-weight: 700;
  color: var(--brand-indigo);
}

.qc-loc {
  font-size: 0.77rem;
  font-weight: 600;
  color: var(--ink-secondary);
}

.qc-snippet {
  font-size: 0.8rem;
  color: var(--ink-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.qc-foot {
  display: flex;
  justify-content: space-between;
  font-size: 0.74rem;
  color: var(--ink-muted);
}

.reading-panel {
  padding: 1.35rem 1.5rem;
  display: grid;
  gap: 1rem;
  min-inline-size: 0;
}

.reading-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
  padding-block-end: 0.9rem;
  border-block-end: 1px solid var(--border-hairline);
}

.reading-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-block-end: 0.45rem;
}

.code-pill {
  padding: 0.16rem 0.5rem;
  border-radius: 5px;
  background: var(--brand-indigo);
  color: #ffffff;
  font-weight: 700;
}

.meta-pill {
  padding: 0.16rem 0.5rem;
  border-radius: 5px;
  background: var(--bg-subtle);
  color: var(--ink-secondary);
  font-size: 0.78rem;
  font-weight: 600;
}

.dossier-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.flow-steps {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.flow-node {
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  font-size: 0.74rem;
  background: var(--bg-subtle);
  color: var(--ink-muted);
}

.flow-node.current {
  background: var(--brand-teal);
  color: #ffffff;
  font-weight: 600;
}

.reading-hint {
  font-size: 0.8rem;
  color: var(--brand-teal);
  background: var(--brand-teal-tint);
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-sm);
}

.manuscript-paper {
  padding: 1.5rem 1.65rem;
  border-radius: var(--radius-md);
  background: #fcfbf7;
  border: 1px solid #dfd9ca;
  box-shadow: inset 3px 0 0 var(--brand-indigo);
}

.manuscript-text {
  font-size: 1.02rem;
  line-height: 1.95;
  color: var(--ink-primary);
  white-space: pre-wrap;
}

.evidence-mark {
  background: #fff2c2;
  color: inherit;
  padding: 0.1rem 0.22rem;
  border-radius: 3px;
  border-block-end: 2px solid #d4961a;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.evidence-mark.focused {
  background: #ffd9d2;
  border-block-end: 2.5px solid var(--vermilion);
  box-shadow: 0 0 0 3px rgb(176 46 35 / 0.15);
}

.similar-section {
  display: grid;
  gap: 0.75rem;
  padding-block-start: 0.5rem;
}

.sim-header {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.sim-icon {
  color: var(--amber);
  margin-block-start: 0.15rem;
}

.sim-header h3 {
  font-size: 0.95rem;
}

.sim-header p {
  font-size: 0.8rem;
  color: var(--ink-muted);
}

.sim-card {
  padding: 0.9rem 1rem;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  display: grid;
  gap: 0.6rem;
}

.sim-card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sim-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.sim-chan {
  font-size: 0.78rem;
  color: var(--ink-muted);
}

.sim-reasons {
  margin: 0;
  padding-inline-start: 1.15rem;
  font-size: 0.82rem;
  color: var(--ink-secondary);
}

.sim-diff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.diff-col {
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-hairline);
  font-size: 0.82rem;
  display: grid;
  gap: 0.35rem;
}

.diff-cap {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--brand-teal);
}

.triage-panel {
  padding: 1.15rem;
  display: grid;
  gap: 0.95rem;
}

.triage-head h2 {
  font-size: 1rem;
  font-weight: 700;
}

.triage-head p {
  font-size: 0.78rem;
  color: var(--ink-muted);
  margin-block-start: 0.15rem;
}

.field-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.55rem;
}

.field-card {
  padding: 0.65rem 0.75rem;
  display: grid;
  gap: 0.3rem;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.field-card.isFocused {
  box-shadow: 0 0 0 2px rgb(21 94 117 / 0.22);
}

.fc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.fc-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-secondary);
}

.fc-badges {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.icon-edit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 26px;
  block-size: 26px;
  border-radius: 5px;
  border: 1px solid var(--border-hairline);
  background: var(--bg-surface);
  color: var(--ink-secondary);
}

.icon-edit-btn:hover {
  border-color: var(--brand-indigo);
  color: var(--brand-indigo);
}

.fc-val {
  font-size: 0.87rem;
  font-weight: 600;
  color: var(--ink-primary);
}

.fc-edit-row {
  display: flex;
  gap: 0.4rem;
}

.fc-input {
  flex: 1;
  min-inline-size: 0;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--brand-indigo);
  border-radius: 5px;
  background: var(--bg-surface);
  font-size: 0.85rem;
}

.discipline-box {
  padding: 0.85rem;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-hairline);
  display: grid;
  gap: 0.5rem;
}

.disc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.84rem;
}

.disc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.disc-pill {
  padding: 0.16rem 0.5rem;
  border-radius: var(--radius-pill);
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  font-size: 0.74rem;
  font-weight: 600;
}

.disc-reasons {
  margin: 0;
  padding-inline-start: 1.1rem;
  font-size: 0.79rem;
  color: var(--ink-secondary);
}

.disc-redline {
  font-size: 0.74rem;
  color: var(--amber);
}

.action-box {
  display: grid;
  gap: 0.65rem;
}

.full-btn {
  inline-size: 100%;
  min-block-size: 40px;
}

.dispatch-form {
  display: grid;
  gap: 0.65rem;
  padding-block-start: 0.45rem;
  border-block-start: 1px solid var(--border-hairline);
}

.disp-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.linked-task-box {
  padding: 0.85rem;
  display: grid;
  gap: 0.45rem;
}

.lt-top {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--pine);
}

.linked-task-box p {
  font-size: 0.82rem;
  color: var(--ink-secondary);
}

@media (max-width: 1200px) {
  .workbench,
  .workbench.no-left {
    grid-template-columns: 1fr;
  }
  .queue-list {
    max-block-size: 260px;
  }
}

@media (max-width: 680px) {
  .sim-diff-grid,
  .disp-row {
    grid-template-columns: 1fr;
  }
}
</style>
