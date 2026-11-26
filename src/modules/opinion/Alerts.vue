<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Sparkles, ShieldAlert, Link2, SlidersHorizontal, RotateCcw, Eye, CheckCircle2, X } from 'lucide-vue-next'
import { UiTabs, UiButton, UiTag, RiskBadge, UiEmpty } from '@/design/ui'
import MediaBadge from './components/MediaBadge.vue'
import OpinionAgentCard from './components/OpinionAgentCard.vue'
import OpinionEvidenceDrawer from './components/OpinionEvidenceDrawer.vue'
import DispositionModal from './components/DispositionModal.vue'
import TopicAdjustModal from './components/TopicAdjustModal.vue'
import SimulatePostModal from './components/SimulatePostModal.vue'
import { useOpinionStore, type EnrichedTopic } from '@/stores/opinion'
import { opinionCategories, type OpinionCategory } from '@/mock/opinion'
import type { OpinionAgentMode } from '@/engines/opinion-agent'
import { toast } from '@/app/toast'

const route = useRoute()
const router = useRouter()
const store = useOpinionStore()

const bucket = ref<'pending' | 'handled' | 'historical'>('pending')
const selectedCat = ref<'all' | OpinionCategory>('all')
const query = ref('')
const highlightTopicId = ref<string | null>(null)

const drawerOpen = ref(false)
const drawerPostId = ref<string | null>(null)
const drawerListIds = ref<string[]>([])
const disposeOpen = ref(false)
const disposeTopicId = ref<string | null>(null)
const adjustOpen = ref(false)
const adjustTopicId = ref<string | null>(null)
const simOpen = ref(false)
const agentOpen = ref(false)
const agentMode = ref<OpinionAgentMode>('briefing')
const agentTopicId = ref<string | null>(null)
const agentAutoRunKey = ref(0)

function launchAgent(mode: OpinionAgentMode, topicId: string | null = null) {
  agentMode.value = mode
  agentTopicId.value = topicId
  agentOpen.value = true
  agentAutoRunKey.value++
}

function resetFilter() {
  selectedCat.value = 'all'
  query.value = ''
}

watch(() => route.query, q => {
  if (q.cat && opinionCategories.some(c => c.key === q.cat)) {
    selectedCat.value = q.cat as OpinionCategory
  }
  if (q.topic) {
    const t = store.topicById(String(q.topic))
    if (t) {
      bucket.value = t.statusBucket
      selectedCat.value = 'all'
      highlightTopicId.value = t.id
      drawerListIds.value = t.posts.map(p => p.id)
      drawerPostId.value = t.primaryPost.id
      drawerOpen.value = true
    }
  }
}, { immediate: true })

const tabs = computed(() => [
  { value: 'pending', label: '待研判', count: store.pendingTopics.length },
  { value: 'handled', label: '已处置', count: store.handledTopics.length },
  { value: 'historical', label: '历史沉底（超30天）', count: store.historicalTopics.length },
])

const bucketList = computed(() => {
  if (bucket.value === 'pending') return store.pendingTopics
  if (bucket.value === 'handled') return store.handledTopics
  return store.historicalTopics
})

const railItems = computed(() => [
  { key: 'all' as const, label: '全部监督领域', color: 'var(--red)', count: bucketList.value.length },
  ...opinionCategories.map(c => ({
    key: c.key,
    label: c.label,
    color: c.color,
    count: bucketList.value.filter(t => t.category === c.key).length,
  })),
])

const filtered = computed(() => {
  const kw = query.value.trim().toLowerCase()
  return bucketList.value.filter(t => {
    if (selectedCat.value !== 'all' && t.category !== selectedCat.value) return false
    if (!kw) return true
    const hay = `${t.title} ${t.summary} ${t.townName} ${t.village || ''} ${t.entities.people.join(' ')} ${t.entities.codes.join(' ')} ${t.entities.companies.join(' ')}`.toLowerCase()
    return hay.includes(kw)
  })
})

function openTopicEvidence(t: EnrichedTopic) {
  drawerListIds.value = t.posts.map(p => p.id)
  drawerPostId.value = t.primaryPost.id
  drawerOpen.value = true
}

function openDispose(id: string) {
  disposeTopicId.value = id
  disposeOpen.value = true
}

function openAdjust(id: string) {
  adjustTopicId.value = id
  adjustOpen.value = true
}

function reopen(t: EnrichedTopic) {
  store.reopenTopic(t.id)
  toast(`已将「${t.title}」恢复至待研判列表`, 'ok')
}
</script>

<template>
  <div class="alerts-page">
    <div class="top-bar">
      <UiTabs v-model="bucket" :items="tabs" />
      <div class="tb-right">
        <div class="search-box">
          <Search :size="15" />
          <input v-model="query" placeholder="搜索话题、乡镇、人员或编号" aria-label="搜索预警话题" />
          <button v-if="query" type="button" class="clear-btn" aria-label="清空搜索" @click="query = ''"><X :size="13" /></button>
        </div>
        <UiButton variant="secondary" size="sm" :icon="Sparkles" @click="launchAgent('briefing')">智能研判</UiButton>
        <UiButton variant="soft" size="sm" :icon="Sparkles" @click="simOpen = true">现场模拟研判</UiButton>
      </div>
    </div>

    <OpinionAgentCard
      v-if="agentOpen"
      :initial-mode="agentMode"
      :initial-topic-id="agentTopicId"
      :auto-run-key="agentAutoRunKey"
      closable
      @open-post="id => { drawerListIds = [id]; drawerPostId = id; drawerOpen = true }"
      @close="agentOpen = false"
    />

    <div class="al-grid">
      <!-- 左侧监督领域导航轨 -->
      <aside class="cat-rail" aria-label="监督领域筛选">
        <div class="rail-head">按监督领域筛选</div>
        <button
          v-for="item in railItems"
          :key="item.key"
          type="button"
          class="rail-item"
          :class="{ on: selectedCat === item.key }"
          @click="selectedCat = item.key"
        >
          <i class="r-dot" :style="{ background: item.color }" />
          <span class="r-lbl">{{ item.label }}</span>
          <b class="r-cnt num">{{ item.count }}</b>
        </button>
      </aside>

      <!-- 右侧同事件合并预警列表 -->
      <section class="al-list">
        <UiEmpty
          v-if="!filtered.length"
          title="当前条件下暂无舆情话题"
          text="可切换状态页签、重置领域筛选，或点击右上角“现场模拟研判”录入新样帖演示。"
        >
          <UiButton v-if="selectedCat !== 'all' || query" size="sm" variant="secondary" @click="resetFilter">重置筛选</UiButton>
        </UiEmpty>

        <article
          v-for="t in filtered"
          :key="t.id"
          class="al-card"
          :class="[`lv-${t.level}`, { hl: highlightTopicId === t.id }]"
        >
          <div class="ac-top">
            <div class="ac-badges">
              <RiskBadge v-if="t.level !== 'info'" :level="t.level" />
              <UiTag v-else tone="gray">日常参考</UiTag>
              <UiTag v-if="t.snapshotCount" tone="red" size="sm" :icon="ShieldAlert">含 {{ t.snapshotCount }} 份保全快照</UiTag>
              <span class="ac-outline-tag">{{ t.acceptance }}</span>
              <span class="ac-ctx">{{ t.category }} · {{ t.townName }}{{ t.village ? ` · ${t.village}` : '' }}</span>
            </div>
            <span class="ac-time num">首发 {{ t.firstSeen }} · 最新 {{ t.lastSeen }}</span>
          </div>

          <h3 class="ac-title"><button type="button" class="ac-title-btn" @click="openTopicEvidence(t)">{{ t.title }}</button></h3>
          <p class="ac-summary">{{ t.summary }}</p>

          <div class="ac-stats">
            <MediaBadge :source-id="t.primaryPost.sourceId" size="sm" />
            <span class="num">同一事件 <b>{{ t.postCount }}</b> 条</span>
            <span class="sep">·</span>
            <span class="num">跨 <b>{{ t.platformCount }}</b> 平台</span>
            <template v-if="t.repostCount">
              <span class="sep">·</span>
              <span class="num"><b>{{ t.repostCount }}</b> 处转载</span>
            </template>
            <template v-if="t.commentCount">
              <span class="sep">·</span>
              <span class="num"><b>{{ t.commentCount }}</b> 条焦点评论</span>
            </template>
            <span v-if="t.override" class="ov-flag">（已人工纠偏）</span>
          </div>

          <!-- 跨库自动印证胶囊条（固定左标签列 + 右侧流式胶囊，多行折行严格垂线对齐） -->
          <div v-if="t.crossMatches.length" class="ac-cross">
            <span class="cc-lbl"><Link2 :size="13" />跨库自动印证</span>
            <div class="cc-pills">
              <button
                v-for="m in t.crossMatches.slice(0, 4)"
                :key="`${m.sourceType}-${m.id}`"
                type="button"
                class="cc-pill"
                @click="router.push(m.to)"
              >
                <b>{{ m.sourceType }}</b> {{ m.title }}
              </button>
            </div>
          </div>

          <!-- 已处置留痕条 -->
          <div v-if="t.disposition" class="ac-disp">
            <CheckCircle2 :size="14" />
            <strong>{{ t.statusText }}</strong>
            <span>{{ t.disposition.note }}</span>
            <small class="num">{{ t.disposition.actor }} · {{ t.disposition.time }}</small>
          </div>

          <footer class="ac-foot">
            <div class="acf-l">
              <UiButton size="sm" variant="secondary" :icon="Eye" @click="openTopicEvidence(t)">
                查看证据与原文快照（{{ t.postCount }}）
              </UiButton>
              <UiButton v-if="!t.historical" size="sm" variant="ghost" :icon="Sparkles" @click="launchAgent(t.category === '涉纪不实传言' ? 'clarify' : 'verify', t.id)">
                {{ t.category === '涉纪不实传言' ? '智能澄清研判' : '智能核查提纲' }}
              </UiButton>
              <UiButton v-if="!t.historical" size="sm" variant="ghost" :icon="SlidersHorizontal" @click="openAdjust(t.id)">
                话题纠偏 / 合并
              </UiButton>
            </div>
            <div class="acf-r">
              <UiButton v-if="t.statusBucket === 'handled'" size="sm" variant="ghost" :icon="RotateCcw" @click="reopen(t)">
                恢复待研判
              </UiButton>
              <UiButton v-if="!t.historical" size="sm" variant="primary" @click="openDispose(t.id)">
                {{ t.statusBucket === 'handled' ? '调整分流处置' : '人工分流处置' }}
              </UiButton>
            </div>
          </footer>
        </article>
      </section>
    </div>

    <OpinionEvidenceDrawer
      v-model="drawerOpen"
      :post-id="drawerPostId"
      :list-ids="drawerListIds"
      @update:post-id="drawerPostId = $event"
      @dispose="id => { drawerOpen = false; openDispose(id) }"
    />
    <DispositionModal v-model="disposeOpen" :topic-id="disposeTopicId" />
    <TopicAdjustModal v-model="adjustOpen" :topic-id="adjustTopicId" />
    <SimulatePostModal v-model="simOpen" @ingested="id => { drawerListIds = [id]; drawerPostId = id; drawerOpen = true }" />
  </div>
</template>

<style scoped>
.alerts-page{display:flex;flex-direction:column;gap:14px}
.top-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.tb-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.search-box{display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:var(--r-sm);background:var(--surface);border:1px solid var(--line-2);width:320px;max-width:100%;transition:border-color var(--dur),box-shadow var(--dur)}
.search-box:focus-within{border-color:var(--red);box-shadow:0 0 0 3px var(--red-50)}
.search-box svg{color:var(--text-3);flex:none}
.search-box input{border:none;outline:none;background:transparent;font-size:13px;color:var(--text);width:100%}
.clear-btn{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--text-3);flex:none}
.clear-btn:hover{background:var(--surface-3);color:var(--text)}

.al-grid{display:grid;grid-template-columns:214px minmax(0,1fr);gap:16px;align-items:start}
.cat-rail{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-md);padding:10px;box-shadow:var(--shadow-1);display:flex;flex-direction:column;gap:3px;position:sticky;top:calc(var(--header-h) + 14px)}
.rail-head{font-size:12px;color:var(--text-3);font-weight:600;padding:4px 8px 8px;border-bottom:1px solid var(--line);margin-bottom:4px}
.rail-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:13.5px;color:var(--text-2);text-align:left;transition:background var(--dur),color var(--dur)}
.rail-item:hover{background:var(--surface-3);color:var(--text)}
.rail-item.on{background:var(--red-50);color:var(--red-600);font-weight:600;box-shadow:inset 3px 0 0 var(--red)}
.r-dot{width:8px;height:8px;border-radius:50%;flex:none}
.r-lbl{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r-cnt{font-size:12px;color:var(--text-3)}
.rail-item.on .r-cnt{color:var(--red)}

.al-list{display:flex;flex-direction:column;gap:12px;min-width:0}
.al-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-md);padding:16px 18px;box-shadow:var(--shadow-1);display:flex;flex-direction:column;gap:10px;transition:border-color var(--dur),box-shadow var(--dur)}
.al-card:hover{border-color:var(--red-line)}
.al-card.lv-high{border-left:3px solid var(--risk-high)}
.al-card.lv-mid{border-left:3px solid var(--risk-mid)}
.al-card.lv-low{border-left:3px solid var(--risk-low)}
.al-card.hl{box-shadow:0 0 0 2px var(--red-line),var(--shadow-2)}

.ac-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.ac-badges{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.ac-outline-tag{display:inline-flex;align-items:center;font-size:12px;padding:0 7px;border-radius:5px;border:1px solid var(--line-2);color:var(--text-2);line-height:1.55}
.ac-ctx{font-size:12.5px;color:var(--text-3)}
.ac-time{font-size:12px;color:var(--text-3)}
.ac-title{margin:0;line-height:1.4}
.ac-title-btn{font-size:16px;font-weight:700;color:var(--text);text-align:left;line-height:1.4}
.ac-title-btn:hover{color:var(--red)}
.ac-summary{font-size:13.5px;line-height:1.65;color:var(--text-2)}
.ac-stats{display:flex;align-items:center;flex-wrap:wrap;gap:7px;font-size:12.5px;color:var(--text-2)}
.ac-stats .sep{color:var(--text-4)}
.ov-flag{color:var(--ai);font-size:12px;font-weight:500}

.ac-cross{display:grid;grid-template-columns:108px minmax(0,1fr);align-items:start;gap:8px;padding:9px 12px;border-radius:8px;background:var(--ai-bg);border:1px solid var(--ai-line)}
.cc-lbl{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:600;color:var(--ai);padding-top:3px;white-space:nowrap}
.cc-pills{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
.cc-pill{font-size:12px;padding:3px 9px;border-radius:6px;background:var(--surface);border:1px solid var(--line);color:var(--text-2);transition:border-color var(--dur),color var(--dur)}
.cc-pill:hover{border-color:var(--red);color:var(--red)}
.cc-pill b{color:var(--red);margin-right:4px}

.ac-disp{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:9px 12px;border-radius:8px;background:var(--ok-bg);border:1px solid var(--ok-line);font-size:12.5px;color:var(--ok)}
.ac-disp span{color:var(--text-2);flex:1;min-width:180px}
.ac-disp small{color:var(--text-3)}

.ac-foot{padding-top:10px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.acf-l,.acf-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

@media(max-width:960px){
  .al-grid{grid-template-columns:1fr}
  .cat-rail{position:static;flex-direction:row;overflow-x:auto}
  .rail-head{display:none}
  .rail-item{flex:none}
}
</style>
