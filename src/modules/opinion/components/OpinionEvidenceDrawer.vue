<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft, ChevronRight, ShieldAlert, History, GitCompare, Link2, Sparkles,
  MessageSquare, Repeat2, RotateCcw, ArrowUpRight, CheckCircle2, FileWarning,
} from 'lucide-vue-next'
import { UiDrawer, UiButton, UiTag, UiSelect, AiNotice } from '@/design/ui'
import MediaBadge from './MediaBadge.vue'
import { useOpinionStore, type EnrichedPost } from '@/stores/opinion'
import { diffSnapshots, highlightSegments } from '@/engines/opinion'
import { closeOpinionDrawerAt, notifyOpinionDrawer } from '@/app/opinionBus'
import { requestDossier } from '@/app/useDossierAgent'
import { toast } from '@/app/toast'
import type { AcceptanceTag } from '@/mock/opinion'

const props = defineProps<{
  modelValue: boolean
  postId: string | null
  listIds?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:postId': [id: string]
  dispose: [topicId: string]
}>()

const router = useRouter()
const store = useOpinionStore()

const post = computed<EnrichedPost | undefined>(() => props.postId ? store.postById(props.postId) : undefined)
const topic = computed(() => post.value ? store.topicById(post.value.effectiveTopicId) : undefined)
const cross = computed(() => post.value ? store.postCrossMatches(post.value) : [])
const primarySubject = computed(() => post.value?.entities.people[0] || post.value?.entities.companies[0] || topic.value?.entities.people[0] || '')

const snapTab = ref<'current' | 'original' | 'diff'>('current')
watch(() => props.postId, () => {
  snapTab.value = post.value?.evidenceStatus === '已改文·留痕对比' ? 'diff' : 'current'
})

// 与全局智能助手抽屉严格互斥 + 键盘左右方向键快速翻阅上一条/下一条证据
function onArrowKey(e: KeyboardEvent) {
  if (!props.modelValue || !props.listIds || props.listIds.length < 2) return
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (e.key === 'ArrowLeft' && hasPrev.value) { e.preventDefault(); goOffset(-1) }
  else if (e.key === 'ArrowRight' && hasNext.value) { e.preventDefault(); goOffset(1) }
}
watch(() => props.modelValue, open => {
  notifyOpinionDrawer(open)
  if (open) window.addEventListener('keydown', onArrowKey)
  else window.removeEventListener('keydown', onArrowKey)
}, { immediate: true })
onBeforeUnmount(() => window.removeEventListener('keydown', onArrowKey))
watch(closeOpinionDrawerAt, v => { if (v && props.modelValue) emit('update:modelValue', false) })

const idx = computed(() => props.listIds && props.postId ? props.listIds.indexOf(props.postId) : -1)
const hasPrev = computed(() => idx.value > 0)
const hasNext = computed(() => props.listIds ? idx.value >= 0 && idx.value < props.listIds.length - 1 : false)
function goOffset(delta: number) {
  if (!props.listIds || idx.value < 0) return
  const next = props.listIds[idx.value + delta]
  if (next) emit('update:postId', next)
}

const contentSegs = computed(() => post.value ? highlightSegments(post.value.content, post.value.matchedWords) : [])
const originalSegs = computed(() => post.value?.originalContent ? highlightSegments(post.value.originalContent, post.value.matchedWords) : [])
const diffParts = computed(() => post.value?.originalContent ? diffSnapshots(post.value.originalContent, post.value.content) : [])

const acceptanceOpts: AcceptanceTag[] = [
  '拟研判·涉纪苗头',
  '拟督办·履职与作风',
  '待核实·疑似不实传言',
  '非纪检受理·民生咨询',
]

function onAcceptanceChange(val: string) {
  if (!post.value) return
  store.tagPost(post.value.id, val as AcceptanceTag)
  toast(`已人工标注受理边界为「${val}」`, 'ok')
}

function restoreAutoTag() {
  if (!post.value) return
  store.resetPostTag(post.value.id)
  toast('已撤销人工覆盖，交还系统规则判断', 'ok')
}

function launchDossier() {
  if (!primarySubject.value) return
  emit('update:modelValue', false)
  requestDossier(primarySubject.value)
}

function goLink(to: string) {
  emit('update:modelValue', false)
  void router.push(to)
}

function toneOfSource(type: string): 'red' | 'orange' | 'blue' | 'green' | 'ai' {
  if (type === '信访线索') return 'red'
  if (type === '穿透监督') return 'orange'
  if (type === '银行流水') return 'ai'
  if (type === '廉政档案') return 'green'
  return 'blue'
}
</script>

<template>
  <UiDrawer
    :model-value="modelValue"
    :width="680"
    :title="post?.title || '舆情证据详情'"
    :subtitle="post ? `${post.townName}${post.village ? ` · ${post.village}` : ''} · 所属话题：${topic?.title || ''}` : ''"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #extra>
      <div v-if="listIds && listIds.length > 1" class="nav-pair">
        <button type="button" class="nav-btn" :disabled="!hasPrev" title="上一条" @click="goOffset(-1)"><ChevronLeft :size="16" /></button>
        <span class="num nav-pos">{{ idx + 1 }}/{{ listIds.length }}</span>
        <button type="button" class="nav-btn" :disabled="!hasNext" title="下一条" @click="goOffset(1)"><ChevronRight :size="16" /></button>
      </div>
    </template>

    <div v-if="post" class="ev-wrap">
      <!-- 1. 来源元信息与人工受理边界纠偏 -->
      <div class="meta-bar">
        <div class="meta-left">
          <MediaBadge :source-id="post.sourceId" size="md" show-tier />
          <span class="meta-item">{{ post.author }}</span>
          <span class="meta-item num">发布 {{ post.publishedAt }}</span>
          <span class="meta-item num">抓取 {{ post.capturedAt }}</span>
        </div>
        <div class="meta-stats num">
          <span>阅读 {{ post.engagement.reads }}</span>
          <span>点赞 {{ post.engagement.likes }}</span>
          <span>评论 {{ post.engagement.comments }}</span>
          <span>转发 {{ post.engagement.shares }}</span>
        </div>
      </div>

      <div class="tag-bar">
        <div class="tag-edit">
          <span class="te-lbl">受理边界：</span>
          <UiSelect
            :model-value="post.effectiveAcceptance"
            :options="acceptanceOpts"
            size="sm"
            label="调整受理边界"
            @update:model-value="onAcceptanceChange"
          />
          <button v-if="post.manualTagged" type="button" class="reset-btn" @click="restoreAutoTag"><RotateCcw :size="12" />交还系统判断</button>
        </div>
        <div class="tag-badges">
          <UiTag tone="gold" size="sm">{{ post.effectiveCategory }}</UiTag>
          <UiTag v-if="post.evidenceStatus === '已删帖·保留快照'" tone="red" size="sm" :icon="ShieldAlert">已删帖 · 保留快照</UiTag>
          <UiTag v-else-if="post.evidenceStatus === '已改文·留痕对比'" tone="orange" size="sm" :icon="GitCompare">已改文 · 留痕对比</UiTag>
          <UiTag v-else tone="green" size="sm" :icon="CheckCircle2">原帖在架</UiTag>
        </div>
      </div>

      <!-- 2. 智能研判依据（保留事实边界 + 逐字摘录） -->
      <section class="ev-box ai-box">
        <header><Sparkles :size="15" /><strong>智能研判依据（待核实参考）</strong></header>
        <p class="ai-reason">{{ post.aiReason }}</p>
        <blockquote class="ai-quote">
          <span>原文摘录依据：</span>“{{ post.aiQuote }}”
        </blockquote>
        <div v-if="post.matchedWords.length" class="hit-words">
          <span>命中词条：</span>
          <UiTag v-for="w in post.matchedWords" :key="w" size="sm" tone="gold">{{ w }}</UiTag>
        </div>
      </section>

      <!-- 3. 原文与证据保全快照（带淡色演示样例水印） -->
      <section class="ev-box snap-box">
        <header class="snap-head">
          <div class="sh-l">
            <History :size="15" />
            <strong>公开原文与证据保全快照</strong>
            <span v-if="post.snapshotHash" class="hash num">校验摘要 {{ post.snapshotHash }}</span>
          </div>
          <div v-if="post.evidenceStatus === '已改文·留痕对比' && post.originalContent" class="snap-tabs">
            <button type="button" :class="{ on: snapTab === 'diff' }" @click="snapTab = 'diff'">差异对比</button>
            <button type="button" :class="{ on: snapTab === 'original' }" @click="snapTab = 'original'">改文前原貌</button>
            <button type="button" :class="{ on: snapTab === 'current' }" @click="snapTab = 'current'">当前在架</button>
          </div>
        </header>

        <div v-if="post.evidenceStatus === '已删帖·保留快照'" class="snap-alert high">
          <FileWarning :size="15" />
          <span>该帖文于 <b class="num">{{ post.deletedAt }}</b> 监测到原作者删除/下架，以下展示系统于 <b class="num">{{ post.capturedAt }}</b> 固定的原始公开快照。</span>
        </div>
        <div v-else-if="post.evidenceStatus === '已改文·留痕对比'" class="snap-alert mid">
          <GitCompare :size="15" />
          <span>该帖文于 <b class="num">{{ post.editedAt }}</b> 发生正文编辑（删除或淡化了关键主体表述），已保留改文前后完整留痕。</span>
        </div>

        <div class="snap-paper" data-wm="演示样例 · 非真实公开帖文">
          <template v-if="snapTab === 'diff' && post.originalContent">
            <p class="diff-body">
              <span v-for="(d, i) in diffParts" :key="i" :class="`df-${d.kind}`">{{ d.text }}</span>
            </p>
            <p class="diff-legend"><span><i class="lg-rm" />改文后删去内容</span><span><i class="lg-add" />改文后替换表述</span></p>
          </template>
          <p v-else-if="snapTab === 'original' && post.originalContent" class="post-body">
            <template v-for="(s, i) in originalSegs" :key="i">
              <mark v-if="s.hit">{{ s.text }}</mark>
              <template v-else>{{ s.text }}</template>
            </template>
          </p>
          <p v-else class="post-body">
            <template v-for="(s, i) in contentSegs" :key="i">
              <mark v-if="s.hit">{{ s.text }}</mark>
              <template v-else>{{ s.text }}</template>
            </template>
          </p>
        </div>
      </section>

      <!-- 4. 跨库自动印证卡片 + 全景研判直达 -->
      <section class="ev-box">
        <header class="cross-head">
          <div><Link2 :size="15" /><strong>跨库自动印证（命中 <span class="num">{{ cross.length }}</span> 项在库记录）</strong></div>
          <UiButton v-if="primarySubject" size="sm" variant="soft" :icon="Sparkles" @click="launchDossier">
            对「{{ primarySubject }}」发起全景研判
          </UiButton>
        </header>
        <ul v-if="cross.length" class="cross-list">
          <li v-for="m in cross" :key="`${m.sourceType}-${m.id}`" @click="goLink(m.to)">
            <UiTag :tone="toneOfSource(m.sourceType)" size="sm">{{ m.sourceType }}</UiTag>
            <div class="cl-main">
              <strong>{{ m.title }}</strong>
              <small>{{ m.summary }} · <em>{{ m.matchedBy }}</em></small>
            </div>
            <ArrowUpRight :size="14" class="cl-go" />
          </li>
        </ul>
        <p v-else class="ev-empty">当前帖文未碰撞命中在库信访、穿透监督或巡察疑点记录。</p>
      </section>

      <!-- 5. 同源转载折叠与焦点评论 -->
      <details v-if="post.reposts.length" class="ev-details">
        <summary><Repeat2 :size="15" />同源转载与衍生传播（另有 <b class="num">{{ post.reposts.length }}</b> 处）</summary>
        <ul class="repost-list">
          <li v-for="(r, i) in post.reposts" :key="i">
            <MediaBadge :source-id="r.sourceId" size="sm" />
            <span>{{ r.title }}</span>
            <small class="num">{{ r.time }}</small>
          </li>
        </ul>
      </details>

      <section v-if="post.comments.length" class="ev-box">
        <header><MessageSquare :size="15" /><strong>公开高赞焦点评论（<span class="num">{{ post.comments.length }}</span> 条 · 不采集个人隐私）</strong></header>
        <ul class="cmt-list">
          <li v-for="c in post.comments" :key="c.id" :class="{ flagged: c.flagged }">
            <div class="cmt-top">
              <strong>{{ c.author }}</strong>
              <UiTag v-if="c.flagged" tone="orange" size="sm">含补充要素</UiTag>
              <span class="num">{{ c.time }} · 赞 {{ c.likes }}</span>
            </div>
            <p>{{ c.text }}</p>
          </li>
        </ul>
      </section>

      <AiNotice text="仅面向合法公开平台开展涉纪研判，不采集个人隐私、不做网民画像、不删帖控评；事实以纪检干部核查结果为准。" />
    </div>

    <template #footer>
      <UiButton @click="emit('update:modelValue', false)">关闭</UiButton>
      <UiButton v-if="topic && !topic.historical" variant="primary" @click="emit('dispose', topic.id)">
        对该话题进行人工分流处置
      </UiButton>
    </template>
  </UiDrawer>
</template>

<style scoped>
.nav-pair{display:inline-flex;align-items:center;gap:4px;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:2px 4px}
.nav-btn{width:26px;height:26px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:var(--text-2)}
.nav-btn:hover:not(:disabled){background:var(--surface-3);color:var(--text)}
.nav-btn:disabled{opacity:.35}
.nav-pos{font-size:12px;color:var(--text-3);padding:0 4px}

.ev-wrap{display:flex;flex-direction:column;gap:14px}
.meta-bar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.meta-left{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.meta-item{font-size:12px;color:var(--text-3)}
.meta-stats{display:flex;gap:10px;font-size:12px;color:var(--text-3)}

.tag-bar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
.tag-edit{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.te-lbl{font-size:13px;color:var(--text-3)}
.tag-edit :deep(.ui-select){width:176px}
.reset-btn{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--red);padding:4px 8px;border-radius:6px}
.reset-btn:hover{background:var(--red-25)}
.tag-badges{display:flex;align-items:center;gap:6px;flex-wrap:wrap}

.ev-box{background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-md);padding:13px 15px;display:flex;flex-direction:column;gap:10px}
.ev-box header{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--text)}
.ev-box header svg{color:var(--red);flex:none}
.ai-box{background:var(--ai-bg);border-color:var(--ai-line)}
.ai-box header svg{color:var(--ai)}
.ai-reason{font-size:13.5px;line-height:1.7;color:var(--text)}
.ai-quote{margin:0;padding:8px 12px;border-left:3px solid var(--ai);background:var(--surface);border-radius:0 8px 8px 0;font-size:13.5px;line-height:1.7;color:var(--text-2)}
.ai-quote span{font-family:var(--font);font-size:12px;color:var(--ai);font-weight:600}
.hit-words{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:12px;color:var(--text-3)}

.snap-head{justify-content:space-between;flex-wrap:wrap}
.sh-l{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.hash{font-size:12px;color:var(--text-3);background:var(--surface);border:1px solid var(--line);padding:1px 6px;border-radius:4px}
.snap-tabs{display:inline-flex;gap:3px;background:var(--surface-3);padding:2px;border-radius:7px}
.snap-tabs button{font-size:12px;padding:3px 9px;border-radius:5px;color:var(--text-2)}
.snap-tabs button.on{background:var(--surface);color:var(--red);font-weight:600;box-shadow:var(--shadow-1)}
.snap-alert{display:flex;align-items:flex-start;gap:8px;padding:8px 11px;border-radius:8px;font-size:12.5px;line-height:1.55}
.snap-alert svg{margin-top:2px;flex:none}
.snap-alert.high{background:var(--risk-high-bg);color:var(--risk-high)}
.snap-alert.mid{background:var(--risk-mid-bg);color:var(--risk-mid)}

.snap-paper{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:14px 16px;overflow:hidden}
.snap-paper::after{content:attr(data-wm);position:absolute;right:12px;bottom:6px;font-size:12px;color:var(--text-4);opacity:.45;pointer-events:none;letter-spacing:.08em}
.post-body,.diff-body{font-size:14.5px;line-height:1.85;color:var(--text);white-space:pre-line}
.post-body mark{background:var(--gold-soft);color:var(--accent-ink-2);padding:0 3px;border-radius:3px;font-weight:600}
.df-removed{background:var(--risk-high-bg);color:var(--risk-high);text-decoration:line-through;padding:1px 3px;border-radius:3px;margin-right:4px}
.df-added{background:var(--ok-bg);color:var(--ok);padding:1px 3px;border-radius:3px;margin-right:4px}
.diff-legend{display:flex;gap:14px;margin-top:10px;font-size:12px;color:var(--text-3)}
.diff-legend span{display:inline-flex;align-items:center;gap:5px}
.diff-legend i{width:10px;height:10px;border-radius:2px;display:inline-block}
.lg-rm{background:var(--risk-high-bg);border:1px solid var(--risk-high)}
.lg-add{background:var(--ok-bg);border:1px solid var(--ok)}

.cross-head{justify-content:space-between;flex-wrap:wrap;gap:8px}
.cross-head>div{display:flex;align-items:center;gap:6px}
.cross-list{display:flex;flex-direction:column;gap:6px}
.cross-list li{display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--surface);border:1px solid var(--line);border-radius:8px;cursor:pointer;transition:border-color var(--dur),background var(--dur)}
.cross-list li:hover{border-color:var(--red-line);background:var(--red-25)}
.cl-main{flex:1;min-width:0}
.cl-main strong{display:block;font-size:13.5px;color:var(--text)}
.cl-main small{display:block;font-size:12px;color:var(--text-3);margin-top:1px}
.cl-main em{font-style:normal;color:var(--red);font-weight:500}
.cl-go{color:var(--text-3);flex:none}
.ev-empty{font-size:13px;color:var(--text-3)}

.ev-details{background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-md);padding:10px 14px}
.ev-details summary{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13.5px;font-weight:600;color:var(--text)}
.repost-list{margin-top:10px;display:flex;flex-direction:column;gap:7px}
.repost-list li{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-2)}
.repost-list li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.repost-list li small{color:var(--text-3)}

.cmt-list{display:flex;flex-direction:column;gap:8px}
.cmt-list li{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.cmt-list li.flagged{border-color:var(--gold-line);background:var(--cream)}
.cmt-top{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-3);margin-bottom:4px}
.cmt-top strong{color:var(--text);font-size:13px}
.cmt-top span:last-child{margin-left:auto}
.cmt-list p{font-size:13.5px;line-height:1.65;color:var(--text-2)}
</style>
