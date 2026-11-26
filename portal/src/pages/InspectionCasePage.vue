<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  RotateCcw,
  Scale,
  Search,
} from 'lucide-vue-next'
import StatusBadge from '@/components/StatusBadge.vue'
import {
  CASE_FILES,
  EVIDENCE_REQUIREMENTS,
  FEEDBACK_ISSUES,
  INSP_DOCS,
  KB_ENTRIES,
  RECTIFY_SAMPLES,
  TODAY,
} from '@/domain/mockData'
import { checkRectify, readInspectionDoc, segmentText } from '@/domain/engines'
import { portalState, signOffRectify } from '@/domain/store'

const subMode = ref<'inspection' | 'cases'>('inspection')

// 巡察阅卷与整改
const selectedDocId = ref(INSP_DOCS[0]!.id)
const selectedIssueId = ref(FEEDBACK_ISSUES[1]!.id) // 默认选中 ZG-02（典型表态整改对比）
const rectifyNoteInput = ref('')

const currentDoc = computed(() => INSP_DOCS.find((d) => d.id === selectedDocId.value) || INSP_DOCS[0]!)
const docFindings = computed(() => readInspectionDoc(currentDoc.value))
const docSegments = computed(() =>
  segmentText(
    currentDoc.value.text,
    docFindings.value.map((f) => ({ start: f.start, end: f.end, key: f.id, active: true })),
  ),
)

const currentIssue = computed(() => FEEDBACK_ISSUES.find((i) => i.id === selectedIssueId.value) || FEEDBACK_ISSUES[0]!)
const currentRectifySample = computed(() => RECTIFY_SAMPLES[currentIssue.value.id] || { text: '未提交整改报告', attachments: [] })
const currentRectifyCheck = computed(() =>
  checkRectify(
    currentIssue.value,
    currentRectifySample.value.text,
    currentRectifySample.value.attachments,
    TODAY,
    Boolean(portalState.rectifyStatus[currentIssue.value.id]?.closed),
  ),
)

// 案件审理与法规助手
const selectedCaseId = ref(CASE_FILES[0]!.id)
const kbQuery = ref('')
const currentCase = computed(() => CASE_FILES.find((c) => c.id === selectedCaseId.value) || CASE_FILES[0]!)
const requiredEvidence = computed(() => EVIDENCE_REQUIREMENTS[currentCase.value.violation] || [])
const filteredKb = computed(() => {
  const q = kbQuery.value.trim()
  if (!q) return KB_ENTRIES
  return KB_ENTRIES.filter((k) => k.title.includes(q) || k.content.includes(q) || k.tags.some((t) => t.includes(q)))
})

function handleSignOff(passed: boolean) {
  const note =
    rectifyNoteInput.value.trim() ||
    (passed ? '整改措施具体，佐证附件齐全，人工复核准予销号。' : '回应空泛或缺少佐证材料，退回责任单位限期补齐。')
  signOffRectify(currentIssue.value.id, passed, note)
  rectifyNoteInput.value = ''
}
</script>

<template>
  <div class="ic-page">
    <header class="page-head paper-card">
      <div>
        <h1 class="page-h1 font-editorial">巡察整改与案件审理协同工作台</h1>
        <p class="page-sub">
          智能辅助阅卷定位程序倒置、比对整改“表态虚实”，并为案件审理提供跨材料印证与合规条规检索。
        </p>
      </div>
      <div class="civic-tablist head-tabs" role="tablist" aria-label="协同业务场景切换">
        <button
          type="button"
          role="tab"
          class="civic-tab"
          :aria-selected="subMode === 'inspection'"
          @click="subMode = 'inspection'"
        >
          <BookOpenCheck :size="15" aria-hidden="true" />
          <span>智能巡察阅卷与整改销号</span>
        </button>
        <button
          type="button"
          role="tab"
          class="civic-tab"
          :aria-selected="subMode === 'cases'"
          @click="subMode = 'cases'"
        >
          <Scale :size="15" aria-hidden="true" />
          <span>案卷印证与法规参考</span>
        </button>
      </div>
    </header>

    <!-- 模式一：智能巡察阅卷与整改销号 -->
    <div v-if="subMode === 'inspection'" class="inspection-stack">
      <!-- 1. 台账批量阅卷 -->
      <section class="paper-card sec-box" aria-labelledby="reading-h2">
        <div class="sec-head">
          <div>
            <h2 id="reading-h2">一、台账批量阅卷 · 原文程序疑点定位</h2>
            <p>县委第二巡察组对乡镇G 6 份抽样台账开展智能阅卷，程序问题直接定位到原文段落</p>
          </div>
          <span class="badge-chip">共阅卷 {{ INSP_DOCS.length }} 份</span>
        </div>

        <div class="doc-pills">
          <button
            v-for="doc in INSP_DOCS"
            :key="doc.id"
            type="button"
            class="doc-pill"
            :class="{ active: doc.id === currentDoc.id }"
            @click="selectedDocId = doc.id"
          >
            <span class="doc-kind">{{ doc.kind }}</span>
            <span>{{ doc.target }} · {{ doc.title }}</span>
            <span class="doc-hit num-tabular">{{ readInspectionDoc(doc).length }} 处</span>
          </button>
        </div>

        <div class="doc-split">
          <div class="doc-paper">
            <div class="doc-paper-head">
              <strong>{{ currentDoc.title }}</strong>
              <span class="num-tabular">{{ currentDoc.date }} · {{ currentDoc.target }}</span>
            </div>
            <pre class="doc-pre"><template v-for="(seg, idx) in docSegments" :key="idx"><mark v-if="seg.key" class="doc-mark">{{ seg.text }}</mark><span v-else>{{ seg.text }}</span></template></pre>
          </div>

          <div class="doc-findings">
            <h3>系统检出纸面疑点（{{ docFindings.length }} 处）</h3>
            <ul class="df-list" role="list">
              <li v-for="f in docFindings" :key="f.id" class="df-card track-ai-suggested">
                <div class="df-top">
                  <StatusBadge :tone="f.level" :label="f.rule" />
                </div>
                <strong>{{ f.title }}</strong>
                <p class="df-excerpt">原文：“{{ f.excerpt }}”</p>
                <p class="df-basis">{{ f.basis }}</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 2. 整改闭环防表态核查 -->
      <section class="paper-card sec-box" aria-labelledby="rectify-h2">
        <div class="sec-head">
          <div>
            <h2 id="rectify-h2">二、巡察反馈整改闭环 · 防“纸面整改”比对销号</h2>
            <p>比对整改回复是否针对性覆盖原问题要点、有无具体时间金额抓手及佐证附件支撑，人工复核后方可销号</p>
          </div>
        </div>

        <div class="rectify-split">
          <ul class="issue-list" role="list">
            <li v-for="issue in FEEDBACK_ISSUES" :key="issue.id">
              <button
                type="button"
                class="issue-btn"
                :class="{ active: issue.id === currentIssue.id }"
                @click="selectedIssueId = issue.id"
              >
                <div class="ib-top">
                  <span class="font-mono-code">{{ issue.id }}</span>
                  <StatusBadge
                    v-if="portalState.rectifyStatus[issue.id]?.closed"
                    tone="ok"
                    label="已销号"
                  />
                  <StatusBadge
                    v-else
                    :tone="checkRectify(issue, RECTIFY_SAMPLES[issue.id]?.text || '', RECTIFY_SAMPLES[issue.id]?.attachments || [], TODAY, false).level"
                    :label="checkRectify(issue, RECTIFY_SAMPLES[issue.id]?.text || '', RECTIFY_SAMPLES[issue.id]?.attachments || [], TODAY, false).level === 'high' ? '需重点退回' : '待人工复核'"
                  />
                </div>
                <strong>{{ issue.title }}</strong>
                <span class="ib-meta">{{ issue.owner }} · 限 {{ issue.deadline }}</span>
              </button>
            </li>
          </ul>

          <div class="rectify-detail paper-card-subtle">
            <div class="rd-head">
              <div>
                <span class="rd-cat">{{ currentIssue.category }} · {{ currentIssue.owner }}</span>
                <h3>{{ currentIssue.id }} {{ currentIssue.title }}</h3>
                <p class="rd-origin">原反馈问题：{{ currentIssue.detail }}</p>
              </div>
              <StatusBadge
                v-if="portalState.rectifyStatus[currentIssue.id]?.closed"
                tone="human"
                label="人工复核通过 · 已销号"
              />
            </div>

            <div class="rd-compare">
              <div class="rd-report">
                <h4>责任单位提交的整改汇报与佐证</h4>
                <p class="rd-text">{{ currentRectifySample.text }}</p>
                <div class="rd-atts">
                  <strong>所附佐证材料：</strong>
                  <span v-if="currentRectifySample.attachments.length" class="att-list">
                    <span v-for="a in currentRectifySample.attachments" :key="a" class="att-chip">{{ a }}</span>
                  </span>
                  <span v-else class="text-vermilion">无佐证附件（0 份）</span>
                </div>
              </div>

              <div class="rd-checks">
                <h4>智能四维度虚实比对提示</h4>
                <ul class="chk-list" role="list">
                  <li v-for="chk in currentRectifyCheck.checks" :key="chk.label" class="chk-row">
                    <CheckCircle2 v-if="chk.ok" :size="16" class="text-pine" aria-hidden="true" />
                    <AlertTriangle v-else :size="16" class="text-vermilion" aria-hidden="true" />
                    <div>
                      <strong>{{ chk.label }}</strong>
                      <p>{{ chk.detail }}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div class="rd-signoff">
              <label for="rectify-note" class="f-label">
                当前记录：{{ portalState.rectifyStatus[currentIssue.id]?.note || '待复核' }}
              </label>
              <div class="signoff-row">
                <input
                  id="rectify-note"
                  v-model="rectifyNoteInput"
                  type="text"
                  class="f-input"
                  placeholder="填写人工复核意见或退回补正要求…"
                />
                <button type="button" class="btn btn-secondary" @click="handleSignOff(false)">
                  <RotateCcw :size="15" aria-hidden="true" />
                  <span>退回补充整改</span>
                </button>
                <button type="button" class="btn btn-primary" @click="handleSignOff(true)">
                  <BadgeCheck :size="15" aria-hidden="true" />
                  <span>复核通过并销号</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 模式二：案件审理跨材料印证与法规助手 -->
    <div v-else class="cases-stack">
      <div class="case-selector paper-card">
        <span class="cs-label">选择在办演示案卷：</span>
        <button
          v-for="cs in CASE_FILES"
          :key="cs.id"
          type="button"
          class="doc-pill"
          :class="{ active: cs.id === currentCase.id }"
          @click="selectedCaseId = cs.id"
        >
          <span class="doc-kind">{{ cs.stage }}</span>
          <span>{{ cs.id }} · {{ cs.title }}</span>
        </button>
      </div>

      <div class="cases-grid">
        <!-- 左：跨材料并列印证 -->
        <section class="paper-card sec-box" aria-labelledby="materials-h2">
          <div class="sec-head">
            <div>
              <h2 id="materials-h2">{{ currentCase.title }} · 跨材料互证面板</h2>
              <p>被审查人：{{ currentCase.accused }}（{{ currentCase.role }}）· {{ currentCase.violation }}</p>
            </div>
          </div>

          <div class="materials-grid">
            <article v-for="m in currentCase.materials" :key="m.id" class="mat-card">
              <div class="mat-top">
                <span class="mat-type">{{ m.type }}</span>
                <strong>{{ m.title }}</strong>
              </div>
              <p class="mat-text">{{ m.text }}</p>
            </article>
          </div>
        </section>

        <!-- 右：证据要件与程序完整性 + 本地知识库检索 -->
        <aside class="cases-side">
          <section class="paper-card sec-box" aria-labelledby="ev-check-h2">
            <h2 id="ev-check-h2" class="side-h2">证据要件与程序节点校验</h2>
            <p class="side-sub">对照该违纪类型所需完整要件，提示当前在卷缺失项</p>

            <ul class="req-list" role="list">
              <li v-for="req in requiredEvidence" :key="req" class="req-row">
                <CheckCircle2 v-if="currentCase.evidence.includes(req)" :size="15" class="text-pine" aria-hidden="true" />
                <AlertTriangle v-else :size="15" class="text-vermilion" aria-hidden="true" />
                <span>{{ req }}</span>
                <span class="req-state">{{ currentCase.evidence.includes(req) ? '在卷' : '缺失待补' }}</span>
              </li>
            </ul>

            <h3 class="proc-h3">执纪程序节点留痕</h3>
            <ul class="proc-list" role="list">
              <li v-for="(dt, node) in currentCase.procedures" :key="node" class="proc-row">
                <span>{{ node }}</span>
                <strong v-if="dt" class="num-tabular text-pine">{{ dt }}</strong>
                <span v-else class="text-amber">尚未履行</span>
              </li>
            </ul>
          </section>

          <section class="paper-card sec-box" aria-labelledby="kb-h2">
            <h2 id="kb-h2" class="side-h2">法规要点与本地知识库检索</h2>
            <div class="kb-search">
              <Search :size="15" aria-hidden="true" />
              <label for="kb-search-in" class="visually-hidden">搜索法规要点</label>
              <input id="kb-search-in" v-model="kbQuery" type="search" placeholder="搜“亲属”“三资”“初核”“串供”…" class="q-input" />
            </div>
            <ul class="kb-list" role="list">
              <li v-for="k in filteredKb" :key="k.id" class="kb-card">
                <div class="kb-top">
                  <FileText :size="14" aria-hidden="true" />
                  <span class="kb-type">{{ k.type }}</span>
                  <span class="kb-src">{{ k.source }}</span>
                </div>
                <strong>{{ k.title }}</strong>
                <p>{{ k.content }}</p>
              </li>
            </ul>
            <p class="kb-note">注：知识库条目为演示摘要，不替代权威党纪法规原文。</p>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ic-page {
  display: grid;
  gap: 1.15rem;
}

.page-head {
  padding: 1.15rem 1.35rem 0;
  display: grid;
  gap: 0.75rem;
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

.head-tabs {
  border-block-end: 0;
}

.inspection-stack,
.cases-stack {
  display: grid;
  gap: 1.15rem;
}

.sec-box {
  padding: 1.25rem 1.35rem;
  display: grid;
  gap: 1rem;
}

.sec-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.sec-head h2 {
  font-size: 1.06rem;
  font-weight: 700;
}

.sec-head p {
  font-size: 0.82rem;
  color: var(--ink-muted);
  margin-block-start: 0.15rem;
}

.badge-chip {
  padding: 0.2rem 0.65rem;
  border-radius: var(--radius-pill);
  background: var(--brand-teal-tint);
  color: var(--brand-indigo);
  font-size: 0.78rem;
  font-weight: 700;
}

.doc-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.doc-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
  font-size: 0.82rem;
  font-weight: 600;
}

.doc-pill.active {
  background: var(--brand-indigo);
  color: #ffffff;
  border-color: var(--brand-indigo);
}

.doc-kind {
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.72rem;
  background: rgb(0 0 0 / 0.08);
}

.doc-hit {
  padding: 0.08rem 0.4rem;
  border-radius: var(--radius-pill);
  background: var(--vermilion-tint);
  color: var(--vermilion);
  font-size: 0.72rem;
}

.doc-split {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 1.1rem;
  align-items: start;
}

.doc-paper {
  padding: 1.15rem 1.25rem;
  border-radius: var(--radius-md);
  background: #fcfbf7;
  border: 1px solid #dfd9ca;
}

.doc-paper-head {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding-block-end: 0.65rem;
  margin-block-end: 0.75rem;
  border-block-end: 1px dashed #d5cfc1;
  font-size: 0.88rem;
}

.doc-pre {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.94rem;
  line-height: 1.85;
  white-space: pre-wrap;
}

.doc-mark {
  background: #ffd9d2;
  color: var(--ink-primary);
  padding: 0.08rem 0.22rem;
  border-radius: 3px;
  border-block-end: 2px solid var(--vermilion);
}

.doc-findings h3 {
  font-size: 0.92rem;
  margin-block-end: 0.6rem;
}

.df-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.6rem;
}

.df-card {
  padding: 0.75rem 0.85rem;
  display: grid;
  gap: 0.3rem;
}

.df-excerpt {
  font-size: 0.8rem;
  color: var(--vermilion);
}

.df-basis {
  font-size: 0.8rem;
  color: var(--ink-secondary);
}

.rectify-split {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.1rem;
  align-items: start;
}

.issue-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.issue-btn {
  inline-size: 100%;
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-hairline);
  background: var(--bg-surface);
  text-align: start;
}

.issue-btn.active {
  background: var(--brand-teal-tint);
  border-color: var(--brand-indigo);
}

.ib-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ib-meta {
  font-size: 0.76rem;
  color: var(--ink-muted);
}

.rectify-detail {
  padding: 1.15rem 1.25rem;
  display: grid;
  gap: 1rem;
}

.rd-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.rd-cat {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--brand-teal);
}

.rd-head h3 {
  font-size: 1.05rem;
  margin-block-start: 0.15rem;
}

.rd-origin {
  font-size: 0.84rem;
  color: var(--ink-secondary);
  margin-block-start: 0.3rem;
}

.rd-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
}

.rd-report,
.rd-checks {
  padding: 0.9rem 1rem;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-hairline);
  display: grid;
  gap: 0.55rem;
  align-content: start;
}

.rd-report h4,
.rd-checks h4 {
  font-size: 0.88rem;
  color: var(--brand-indigo);
}

.rd-text {
  font-size: 0.88rem;
  line-height: 1.7;
}

.rd-atts {
  font-size: 0.8rem;
}

.att-list {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-inline-start: 0.25rem;
}

.att-chip {
  padding: 0.14rem 0.5rem;
  border-radius: 4px;
  background: var(--pine-tint);
  color: var(--pine);
  font-weight: 600;
}

.chk-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.chk-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.82rem;
}

.chk-row p {
  font-size: 0.78rem;
  color: var(--ink-muted);
}

.rd-signoff {
  padding-block-start: 0.5rem;
  border-block-start: 1px solid var(--border-hairline);
  display: grid;
  gap: 0.45rem;
}

.f-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-secondary);
}

.signoff-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.f-input {
  flex: 1 1 240px;
  min-block-size: 38px;
  padding-inline: 0.7rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
}

.case-selector {
  padding: 0.9rem 1.25rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}

.cs-label {
  font-size: 0.84rem;
  font-weight: 700;
}

.cases-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 1.15rem;
  align-items: start;
}

.cases-side {
  display: grid;
  gap: 1.15rem;
}

.materials-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.mat-card {
  padding: 0.95rem 1rem;
  border-radius: var(--radius-md);
  background: #fcfbf7;
  border: 1px solid #dfd9ca;
  display: grid;
  gap: 0.45rem;
}

.mat-top {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
}

.mat-type {
  padding: 0.12rem 0.45rem;
  border-radius: 4px;
  background: var(--brand-teal-tint);
  color: var(--brand-indigo);
  font-size: 0.72rem;
  font-weight: 700;
}

.mat-text {
  font-size: 0.86rem;
  line-height: 1.75;
}

.side-h2 {
  font-size: 1rem;
  font-weight: 700;
}

.side-sub {
  font-size: 0.79rem;
  color: var(--ink-muted);
}

.req-list,
.proc-list,
.kb-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.45rem;
}

.req-row,
.proc-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--border-hairline);
  font-size: 0.83rem;
}

.req-state,
.proc-row strong,
.proc-row span:last-child {
  margin-inline-start: auto;
  font-size: 0.77rem;
}

.proc-h3 {
  font-size: 0.88rem;
  margin-block-start: 0.4rem;
}

.kb-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
}

.q-input {
  flex: 1;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 0.85rem;
}

.kb-card {
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
  display: grid;
  gap: 0.28rem;
  font-size: 0.82rem;
}

.kb-top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--brand-teal);
  font-size: 0.74rem;
}

.kb-type {
  font-weight: 700;
}

.kb-src {
  color: var(--ink-muted);
  margin-inline-start: auto;
}

.kb-note {
  font-size: 0.75rem;
  color: var(--ink-muted);
}

.text-pine { color: var(--pine); }
.text-vermilion { color: var(--vermilion); }
.text-amber { color: var(--amber); }

@media (max-width: 1080px) {
  .doc-split,
  .rectify-split,
  .cases-grid,
  .rd-compare,
  .materials-grid {
    grid-template-columns: 1fr;
  }
}
</style>
