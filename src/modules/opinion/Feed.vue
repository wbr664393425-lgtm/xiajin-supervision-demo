<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Search, Sparkles, ShieldAlert, GitCompare, Repeat2, Link2, RotateCcw, X } from 'lucide-vue-next'
import { UiButton, UiSelect, UiTag, UiEmpty } from '@/design/ui'
import MediaBadge from './components/MediaBadge.vue'
import OpinionEvidenceDrawer from './components/OpinionEvidenceDrawer.vue'
import DispositionModal from './components/DispositionModal.vue'
import SimulatePostModal from './components/SimulatePostModal.vue'
import { useOpinionStore } from '@/stores/opinion'
import { highlightSegments } from '@/engines/opinion'
import { mediaSources, opinionCategories, sourceById, type MediaSourceId, type MediaTier } from '@/mock/opinion'

const route = useRoute()
const store = useOpinionStore()

const keyword = ref('')
const category = ref('all')
const tier = ref('all')
const sourceId = ref('all')
const evidenceFilter = ref('all')
const acceptanceFilter = ref('all')
const foldReposts = ref(true)

const drawerOpen = ref(false)
const drawerPostId = ref<string | null>(null)
const disposeOpen = ref(false)
const disposeTopicId = ref<string | null>(null)
const simOpen = ref(false)

watch(() => route.query, q => {
  if (q.tier) tier.value = String(q.tier)
  if (q.source) sourceId.value = String(q.source)
  if (q.ev === 'snapshot') evidenceFilter.value = 'snapshot'
  if (q.post) {
    drawerPostId.value = String(q.post)
    drawerOpen.value = true
  }
}, { immediate: true })

const catOptions = [
  { value: 'all', label: '全部监督领域' },
  ...opinionCategories.map(c => ({ value: c.key, label: c.label })),
]

const tierOptions: { value: string; label: string }[] = [
  { value: 'all', label: '全部渠道层级' },
  { value: '政务问政', label: '政务问政' },
  { value: '央省主流媒体', label: '央省主流媒体' },
  { value: '属地资讯媒体', label: '属地资讯媒体' },
  { value: '公开社交短视频', label: '公开社交短视频' },
]

const sourceOptions = [
  { value: 'all', label: '全部公开平台' },
  ...mediaSources.map(s => ({ value: s.id, label: s.short })),
]

const evOptions = [
  { value: 'all', label: '全部证据状态' },
  { value: 'snapshot', label: '仅看删帖/改文保全快照' },
  { value: '原帖在架', label: '原帖在架' },
]

const accOptions = [
  { value: 'all', label: '全部受理边界' },
  { value: '拟研判·涉纪苗头', label: '拟研判·涉纪苗头' },
  { value: '拟督办·履职与作风', label: '拟督办·履职与作风' },
  { value: '待核实·疑似不实传言', label: '待核实·疑似不实传言' },
  { value: '非纪检受理·民生咨询', label: '非纪检受理·民生咨询' },
]

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return store.posts.filter(p => {
    if (category.value !== 'all' && p.effectiveCategory !== category.value) return false
    if (tier.value !== 'all' && sourceById(p.sourceId).tier !== (tier.value as MediaTier)) return false
    if (sourceId.value !== 'all' && p.sourceId !== (sourceId.value as MediaSourceId)) return false
    if (evidenceFilter.value === 'snapshot' && p.evidenceStatus === '原帖在架') return false
    if (evidenceFilter.value === '原帖在架' && p.evidenceStatus !== '原帖在架') return false
    if (acceptanceFilter.value !== 'all' && p.effectiveAcceptance !== acceptanceFilter.value) return false
    if (!kw) return true
    const hay = `${p.title} ${p.content} ${p.townName} ${p.village || ''} ${p.sourceName} ${p.matchedWords.join(' ')}`.toLowerCase()
    return hay.includes(kw)
  })
})

const filteredIds = computed(() => filtered.value.map(p => p.id))

function resetFilters() {
  keyword.value = ''
  category.value = 'all'
  tier.value = 'all'
  sourceId.value = 'all'
  evidenceFilter.value = 'all'
  acceptanceFilter.value = 'all'
}

function openPost(id: string) {
  drawerPostId.value = id
  drawerOpen.value = true
}

function hlWords(postWords: string[]) {
  const extra = keyword.value.trim() ? [keyword.value.trim()] : []
  return [...postWords, ...extra]
}
</script>

<template>
  <div class="feed-page">
    <!-- 顶部多维筛选栏（全自研 UiSelect，零原生下拉框） -->
    <section class="filter-bar">
      <div class="fb-row">
        <div class="fb-search">
          <Search :size="15" />
          <input v-model="keyword" placeholder="检索原帖标题、正文、词条或村居…" aria-label="检索舆情信息" />
          <button v-if="keyword" type="button" class="clear-btn" aria-label="清空检索" @click="keyword = ''"><X :size="13" /></button>
        </div>
        <UiSelect v-model="category" :options="catOptions" size="sm" label="监督领域" />
        <UiSelect v-model="tier" :options="tierOptions" size="sm" label="渠道层级" />
        <UiSelect v-model="sourceId" :options="sourceOptions" size="sm" label="公开平台" />
        <UiSelect v-model="evidenceFilter" :options="evOptions" size="sm" label="证据状态" />
        <UiSelect v-model="acceptanceFilter" :options="accOptions" size="sm" label="受理边界" />
      </div>
      <div class="fb-sub">
        <span class="fb-count">共匹配 <b class="num">{{ filtered.length }}</b> 条属地公开信息（支持点击单条展开证据保全抽屉并上下翻阅）</span>
        <div class="fb-ops">
          <label class="fold-chk"><input v-model="foldReposts" type="checkbox" /> 折叠同源转载</label>
          <UiButton size="sm" variant="ghost" :icon="RotateCcw" @click="resetFilters">重置筛选</UiButton>
          <UiButton size="sm" variant="primary" :icon="Sparkles" @click="simOpen = true">现场模拟研判</UiButton>
        </div>
      </div>
    </section>

    <UiEmpty v-if="!filtered.length" title="未检索到匹配的公开舆情信息" text="请放宽筛选条件或清空搜索关键词。">
      <UiButton size="sm" variant="secondary" @click="resetFilters">重置筛选</UiButton>
    </UiEmpty>

    <!-- 原声信息卡片流（降噪：避免多枚彩标连续堆叠） -->
    <div v-else class="feed-list">
      <article v-for="p in filtered" :key="p.id" class="feed-item" :class="{ snap: p.evidenceStatus !== '原帖在架' }">
        <div class="fi-head">
          <MediaBadge :source-id="p.sourceId" size="sm" />
          <span class="fi-meta">{{ p.author }} · <span class="num">{{ p.publishedAt }}</span> · {{ p.effectiveCategory }} · {{ p.townName }}{{ p.village ? ` ${p.village}` : '' }}</span>
          <span class="fi-right-tags">
            <span class="fi-outline">{{ p.effectiveAcceptance }}</span>
            <UiTag v-if="p.evidenceStatus === '已删帖·保留快照'" tone="red" size="sm" :icon="ShieldAlert">已删帖·保留快照</UiTag>
            <UiTag v-else-if="p.evidenceStatus === '已改文·留痕对比'" tone="orange" size="sm" :icon="GitCompare">已改文·留痕对比</UiTag>
            <UiTag v-else-if="store.postCrossMatches(p).length" tone="ai" size="sm" :icon="Link2">
              跨库命中 {{ store.postCrossMatches(p).length }}
            </UiTag>
          </span>
        </div>

        <h3 class="fi-title">
          <button type="button" class="fi-title-btn" @click="openPost(p.id)">
            <template v-for="(s, i) in highlightSegments(p.title, hlWords(p.matchedWords))" :key="i">
              <mark v-if="s.hit">{{ s.text }}</mark>
              <template v-else>{{ s.text }}</template>
            </template>
          </button>
        </h3>

        <p class="fi-body" @click="openPost(p.id)">
          <template v-for="(s, i) in highlightSegments(p.content, hlWords(p.matchedWords))" :key="i">
            <mark v-if="s.hit">{{ s.text }}</mark>
            <template v-else>{{ s.text }}</template>
          </template>
        </p>

        <div class="fi-foot">
          <div class="fi-nums num">
            <span>阅读 {{ p.engagement.reads }}</span>
            <span>点赞 {{ p.engagement.likes }}</span>
            <span>评论 {{ p.engagement.comments }}</span>
            <span v-if="p.matchedWords.length" class="fi-hits">命中词：{{ p.matchedWords.slice(0, 4).join('、') }}</span>
          </div>
          <div class="fi-acts">
            <button type="button" class="fi-btn" @click="openPost(p.id)">查看证据与跨库印证</button>
          </div>
        </div>

        <!-- 同源转载折叠（支持全局开关一键展开/折叠） -->
        <details v-if="p.reposts.length" class="fi-repost" :open="!foldReposts">
          <summary><Repeat2 :size="13" />另有 <b class="num">{{ p.reposts.length }}</b> 处公开平台同源转载</summary>
          <ul>
            <li v-for="(r, i) in p.reposts" :key="i">
              <MediaBadge :source-id="r.sourceId" size="sm" />
              <span>{{ r.title }}</span>
              <small class="num">{{ r.time }}</small>
            </li>
          </ul>
        </details>
      </article>
    </div>

    <OpinionEvidenceDrawer
      v-model="drawerOpen"
      :post-id="drawerPostId"
      :list-ids="filteredIds"
      @update:post-id="drawerPostId = $event"
      @dispose="id => { drawerOpen = false; disposeTopicId = id; disposeOpen = true }"
    />
    <DispositionModal v-model="disposeOpen" :topic-id="disposeTopicId" />
    <SimulatePostModal v-model="simOpen" @ingested="id => openPost(id)" />
  </div>
</template>

<style scoped>
.feed-page{display:flex;flex-direction:column;gap:14px}
.filter-bar{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-md);padding:14px 16px;box-shadow:var(--shadow-1);display:flex;flex-direction:column;gap:10px}
.fb-row{display:grid;grid-template-columns:minmax(220px,1.5fr) repeat(5,minmax(130px,1fr));gap:8px;align-items:center}
.fb-search{display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:var(--r-sm);background:var(--surface);border:1px solid var(--line-2);transition:border-color var(--dur),box-shadow var(--dur)}
.fb-search:focus-within{border-color:var(--red);box-shadow:0 0 0 3px var(--red-50)}
.fb-search svg{color:var(--text-3);flex:none}
.fb-search input{border:none;outline:none;background:transparent;font-size:13px;color:var(--text);width:100%}
.clear-btn{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--text-3);flex:none}
.clear-btn:hover{background:var(--surface-3);color:var(--text)}
.fb-sub{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:8px;border-top:1px solid var(--line)}
.fb-count{font-size:12.5px;color:var(--text-3)}
.fb-count b{color:var(--text)}
.fb-ops{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.fold-chk{display:inline-flex;align-items:center;gap:5px;font-size:13px;color:var(--text-2);cursor:pointer}
.fold-chk input{accent-color:var(--red)}

.feed-list{display:flex;flex-direction:column;gap:10px}
.feed-item{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-md);padding:15px 18px;box-shadow:var(--shadow-1);display:flex;flex-direction:column;gap:8px;transition:border-color var(--dur)}
.feed-item:hover{border-color:var(--red-line)}
.feed-item.snap{border-left:3px solid var(--risk-high)}
.fi-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.fi-meta{font-size:12.5px;color:var(--text-3)}
.fi-right-tags{margin-left:auto;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}
.fi-outline{font-size:12px;padding:0 7px;border-radius:5px;border:1px solid var(--line-2);color:var(--text-2);line-height:1.55}
.fi-title{margin:0;line-height:1.45}
.fi-title-btn{font-size:15.5px;font-weight:700;color:var(--text);line-height:1.45;text-align:left}
.fi-title-btn:hover{color:var(--red)}
.fi-body{font-size:13.5px;line-height:1.7;color:var(--text-2);cursor:pointer;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.fi-title mark,.fi-body mark{background:var(--gold-soft);color:var(--accent-ink-2);padding:0 3px;border-radius:3px;font-weight:600}

.fi-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:6px}
.fi-nums{display:flex;align-items:center;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--text-3)}
.fi-nums span{display:inline-flex;align-items:center;gap:4px}
.fi-hits{color:var(--accent-ink);font-family:var(--font)}
.fi-btn{font-size:13px;color:var(--red);font-weight:600}
.fi-btn:hover{text-decoration:underline}

.fi-repost{margin-top:4px;padding:8px 12px;border-radius:8px;background:var(--surface-2);border:1px dashed var(--line-2);font-size:12.5px}
.fi-repost summary{display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--text-2);font-weight:500}
.fi-repost ul{margin-top:8px;display:flex;flex-direction:column;gap:6px}
.fi-repost li{display:flex;align-items:center;gap:8px;color:var(--text-2)}
.fi-repost li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fi-repost li small{color:var(--text-3)}

@media(max-width:1200px){.fb-row{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:720px){.fb-row{grid-template-columns:1fr}}
</style>
