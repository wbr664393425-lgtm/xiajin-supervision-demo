<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Radio, Siren, Maximize2, Minimize2, Sparkles, ArrowUpRight, ShieldAlert,
  Link2, ShieldCheck, Activity, Table2, TrendingUp, ChevronDown, ChevronUp, FileText,
} from 'lucide-vue-next'
import { UiCard, UiButton, UiTag, RiskBadge } from '@/design/ui'
import LineChart from '@/charts/LineChart.vue'
import DonutChart from '@/charts/DonutChart.vue'
import MediaBadge from './components/MediaBadge.vue'
import OpinionAgentCard from './components/OpinionAgentCard.vue'
import OpinionEvidenceDrawer from './components/OpinionEvidenceDrawer.vue'
import DispositionModal from './components/DispositionModal.vue'
import SimulatePostModal from './components/SimulatePostModal.vue'
import type { OpinionAgentMode } from '@/engines/opinion-agent'
import { useOpinionStore } from '@/stores/opinion'
import { useSystemStore } from '@/stores/system'
import { mediaSources, opinionCategories, type MediaTier } from '@/mock/opinion'
import { presenting, setPresenting } from '@/app/opinionBus'
import { today } from '@/stores/persist'

const router = useRouter()
const store = useOpinionStore()
const system = useSystemStore()

const trendView = ref<'chart' | 'table'>('chart')
const showAllSources = ref(false)
const agentOpen = ref(false)
const agentMode = ref<OpinionAgentMode>('briefing')
const agentTopicId = ref<string | null>(null)
const agentAutoRunKey = ref(0)
const drawerOpen = ref(false)
const drawerPostId = ref<string | null>(null)
const disposeOpen = ref(false)
const disposeTopicId = ref<string | null>(null)
const simOpen = ref(false)

function launchOpinionAgent(mode: OpinionAgentMode, topicId: string | null = null) {
  agentMode.value = mode
  agentTopicId.value = topicId
  agentOpen.value = true
  agentAutoRunKey.value++
}

const priorityTopics = computed(() =>
  store.activeTopics
    .filter(t => t.level === 'high' || t.level === 'mid')
    .slice(0, 4),
)

const clarifyTopic = computed(() => store.activeTopics.find(t => t.category === '涉纪不实传言'))

const trendSeries = computed(() => [
  { name: '全部公开信息', color: 'var(--chart-2)', values: store.series14d.total },
  { name: '涉纪关注信息', color: 'var(--chart-1)', values: store.series14d.discipline },
])

const domainDonut = computed(() =>
  opinionCategories
    .map(c => ({
      label: c.label,
      key: c.key,
      value: store.recentPosts.filter(p => p.effectiveCategory === c.key).length,
      color: c.color,
    }))
    .filter(x => x.value > 0),
)

const tiers: MediaTier[] = ['政务问政', '央省主流媒体', '属地资讯媒体', '公开社交短视频']
const tierStats = computed(() =>
  tiers.map(tier => {
    const ids = new Set(mediaSources.filter(s => s.tier === tier).map(s => s.id))
    return {
      tier,
      sourceCount: ids.size,
      postCount: store.recentPosts.filter(p => ids.has(p.sourceId)).length,
    }
  }),
)

const sourceCards = computed(() => {
  const all = mediaSources.map(s => ({
    ...s,
    count: store.recentPosts.filter(p => p.sourceId === s.id).length,
  })).sort((a, b) => b.count - a.count)
  return showAllSources.value ? all : all.slice(0, 8)
})

const opinionLogs = computed(() => system.audit.filter(a => a.module === 'opinion').slice(0, 6))

function openEvidence(postId: string) {
  drawerPostId.value = postId
  drawerOpen.value = true
}

function openDispose(topicId: string) {
  disposeTopicId.value = topicId
  disposeOpen.value = true
}

function onDonutSelect(label: string) {
  const hit = domainDonut.value.find(d => d.label === label)
  if (hit) void router.push({ path: '/opinion/alerts', query: { cat: hit.key } })
}
</script>

<template>
  <div class="op-page">
    <!-- 一句话态势结论通栏（借鉴古贝春“5 秒首屏”并贴合党建红/三主题令牌） -->
    <section class="hero-banner">
      <div class="hb-main">
        <div class="hb-top">
          <span class="hb-pill"><Radio :size="14" />涉纪舆情态势总览</span>
          <span class="hb-date num">业务基准日 {{ today() }} · 统计近 14 日属地合法公开渠道</span>
        </div>
        <p class="hb-conclusion">{{ store.headline }}</p>
        <p class="hb-compliance">合规边界：仅面向合法公开平台与政务问政栏目开展涉纪苗头研判；不采集个人隐私、不做网民画像、不删帖控评；未核实网帖不计入廉政档案与风险一张图。</p>
      </div>
      <div class="hb-actions">
        <UiButton variant="primary" :icon="Siren" @click="router.push('/opinion/alerts')">去研判处置</UiButton>
        <UiButton variant="secondary" :icon="Sparkles" @click="simOpen = true">现场模拟研判</UiButton>
        <UiButton variant="ghost" :icon="presenting ? Minimize2 : Maximize2" @click="setPresenting(!presenting)">
          {{ presenting ? '退出全屏' : '全屏汇报' }}
        </UiButton>
      </div>
    </section>

    <!-- 轻量级舆情智能研判条（雪瓷底 + 左 3px 智能色印，不与顶部暖红横幅争色） -->
    <section class="op-agent-strip" aria-label="舆情研判智能体快捷入口">
      <div class="oas-lead">
        <span class="oas-ic"><Sparkles :size="16" /></span>
        <div>
          <strong>舆情研判智能体</strong>
          <span>串联公开原声、删改快照与全站业务库，流式起草可溯源研判初稿</span>
        </div>
      </div>
      <div class="oas-btns">
        <UiButton size="sm" variant="soft" :icon="Sparkles" @click="launchOpinionAgent('briefing')">态势与优先级研判</UiButton>
        <UiButton size="sm" variant="secondary" @click="launchOpinionAgent('verify', priorityTopics[0]?.id || null)">核查提纲与取证路径</UiButton>
        <UiButton size="sm" variant="secondary" @click="launchOpinionAgent('clarify', clarifyTopic?.id || null)">不实传言澄清研判</UiButton>
      </div>
    </section>

    <OpinionAgentCard
      v-if="agentOpen"
      :initial-mode="agentMode"
      :initial-topic-id="agentTopicId"
      :auto-run-key="agentAutoRunKey"
      closable
      @open-post="openEvidence"
      @close="agentOpen = false"
    />

    <!-- 双栏主体：左主工作区 + 右侧态势栏 -->
    <div class="ov-grid">
      <div class="ov-main">
        <!-- 重点待研判与高关注苗头卡片（最多 4 张，按 rui-design 降噪：每卡最多 2 枚高对比标签） -->
        <UiCard title="重点关注苗头与跨库印证" subtitle="同事件跨平台聚合展示，优先呈现含删帖/改文快照或已碰撞在库记录的事项">
          <template #extra>
            <RouterLink to="/opinion/alerts" class="more-link">进入预警工作台 <ArrowUpRight :size="13" /></RouterLink>
          </template>
          <div class="topic-cards">
            <article v-for="t in priorityTopics" :key="t.id" class="tc" :class="`lv-${t.level}`">
              <div class="tc-head">
                <RiskBadge v-if="t.level !== 'info'" :level="t.level" />
                <span class="tc-ctx">{{ t.category }} · {{ t.townName }}{{ t.village ? ` · ${t.village}` : '' }}</span>
              </div>
              <h4><button type="button" class="title-btn" @click="openEvidence(t.primaryPost.id)">{{ t.title }}</button></h4>
              <p class="tc-sum">{{ t.summary }}</p>
              <div class="tc-meta">
                <MediaBadge :source-id="t.primaryPost.sourceId" size="sm" />
                <span class="num">聚合 {{ t.postCount }} 条 · {{ t.platformCount }} 平台{{ t.repostCount ? ` · ${t.repostCount} 处转载` : '' }}</span>
                <UiTag v-if="t.snapshotCount" tone="red" size="sm" :icon="ShieldAlert">保全快照 {{ t.snapshotCount }}</UiTag>
                <span v-else-if="t.crossMatches.length" class="tc-cross"><Link2 :size="12" />跨库命中 <b class="num">{{ t.crossMatches.length }}</b></span>
              </div>
              <div class="tc-foot">
                <span class="tc-status" :class="{ done: t.statusBucket === 'handled' }" :title="t.statusText">{{ t.statusText }}</span>
                <div class="tc-acts">
                  <button type="button" class="link-act" @click="launchOpinionAgent('verify', t.id)">核查提纲</button>
                  <button type="button" class="link-act" @click="openEvidence(t.primaryPost.id)">证据快照</button>
                  <button type="button" class="link-act primary" @click="openDispose(t.id)">{{ t.statusBucket === 'handled' ? '调整处置' : '分流处置' }}</button>
                </div>
              </div>
            </article>
          </div>
        </UiCard>

        <!-- 14 日声量趋势（图表 / 数据表一键切换） -->
        <UiCard title="近 14 日涉纪舆情声量走势" subtitle="对比全部属地公开帖文与初筛涉纪关注信息逐日变化">
          <template #extra>
            <div class="view-sw">
              <button type="button" :class="{ on: trendView === 'chart' }" @click="trendView = 'chart'"><TrendingUp :size="13" />趋势图</button>
              <button type="button" :class="{ on: trendView === 'table' }" @click="trendView = 'table'"><Table2 :size="13" />数据表</button>
            </div>
          </template>
          <LineChart v-if="trendView === 'chart'" :labels="store.series14d.labels" :series="trendSeries" :height="210" unit=" 条" />
          <div v-else class="tbl-wrap">
            <table class="tbl compact">
              <thead><tr><th>日期</th><th class="r">全部公开信息</th><th class="r">涉纪关注信息</th><th class="r">非涉纪常规民生</th></tr></thead>
              <tbody>
                <tr v-for="(lb, i) in store.series14d.labels" :key="lb">
                  <td class="num">{{ lb }}</td>
                  <td class="num r">{{ store.series14d.total[i] }}</td>
                  <td class="num r"><b>{{ store.series14d.discipline[i] }}</b></td>
                  <td class="num r">{{ (store.series14d.total[i] || 0) - (store.series14d.discipline[i] || 0) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </UiCard>

        <!-- 公开信源覆盖与分布（4 大渠道层级 + 精选真实媒体微标） -->
        <UiCard title="公开渠道分布与信源覆盖" subtitle="覆盖政务问政、央省主流媒体、属地资讯及公开社交短视频四大合规来源">
          <template #extra>
            <RouterLink to="/opinion/topics" class="more-link">查看全部信源目录 <ArrowUpRight :size="13" /></RouterLink>
          </template>
          <div class="tier-row">
            <div v-for="tr in tierStats" :key="tr.tier" class="tier-box" @click="router.push({ path: '/opinion/feed', query: { tier: tr.tier } })">
              <span class="tb-name">{{ tr.tier }}</span>
              <strong class="num">{{ tr.postCount }}<small>条</small></strong>
              <span class="tb-sub">覆盖 {{ tr.sourceCount }} 个公开站点</span>
            </div>
          </div>
          <div class="src-grid">
            <button v-for="s in sourceCards" :key="s.id" type="button" class="src-chip" @click="router.push({ path: '/opinion/feed', query: { source: s.id } })">
              <MediaBadge :source-id="s.id" size="sm" />
              <b class="num">{{ s.count }}</b>
            </button>
          </div>
          <button type="button" class="fold-btn" @click="showAllSources = !showAllSources">
            <component :is="showAllSources ? ChevronUp : ChevronDown" :size="14" />
            {{ showAllSources ? '收起部分公开站点' : `展开全部 ${mediaSources.length} 个公开信源站点` }}
          </button>
        </UiCard>
      </div>

      <!-- 右侧栏：4 读数 + 领域分布 + 澄清正名速览 + 处置动态 -->
      <aside class="ov-side">
        <div class="kpi4">
          <RouterLink to="/opinion/feed" class="k4-item">
            <span>近 14 日公开信息</span>
            <strong class="num">{{ store.recentPosts.length }}<small>条</small></strong>
            <em>聚类 {{ store.activeTopics.length }} 个活跃话题</em>
          </RouterLink>
          <RouterLink to="/opinion/alerts" class="k4-item accent">
            <span>待研判苗头</span>
            <strong class="num">{{ store.pendingTopics.length }}<small>项</small></strong>
            <em>红色 {{ store.highPendingCount }} · 橙色 {{ store.midPendingCount }}</em>
          </RouterLink>
          <RouterLink to="/opinion/alerts" class="k4-item">
            <span>跨库自动印证</span>
            <strong class="num">{{ store.crossMatchedTopics.length }}<small>项</small></strong>
            <em>命中线索 / 监督 / 巡察</em>
          </RouterLink>
          <RouterLink to="/opinion/feed?ev=snapshot" class="k4-item">
            <span>证据保全快照</span>
            <strong class="num">{{ store.snapshotPosts.length }}<small>份</small></strong>
            <em>删帖保全与改文对比</em>
          </RouterLink>
        </div>

        <UiCard title="监督领域分布" subtitle="点击领域直达对应预警列表">
          <DonutChart :items="domainDonut" center-label="近14日帖文" :size="110" @select="onDonutSelect" />
        </UiCard>

        <UiCard v-if="clarifyTopic" :icon="ShieldCheck" title="严管厚爱 · 澄清正名监测">
          <p class="cl-title">{{ clarifyTopic.title }}</p>
          <p class="cl-desc">{{ clarifyTopic.summary }}</p>
          <div class="cl-acts">
            <UiButton size="sm" variant="soft" @click="openEvidence(clarifyTopic.primaryPost.id)">核验目击证据</UiButton>
            <UiButton size="sm" variant="secondary" :icon="FileText" @click="router.push('/opinion/reports?kind=clarify')">澄清建议专报</UiButton>
          </div>
        </UiCard>

        <UiCard :icon="Activity" title="研判与处置动态" flush>
          <template #extra>
            <RouterLink to="/opinion/reports" class="more-link">生成专报 <ArrowUpRight :size="13" /></RouterLink>
          </template>
          <ul v-if="opinionLogs.length" class="op-logs scroll-thin">
            <li v-for="l in opinionLogs" :key="l.id">
              <div class="ol-top">
                <span class="ol-act">{{ l.user }} · {{ l.action }}</span>
                <time class="num">{{ l.time.slice(5) }}</time>
              </div>
              <strong class="ol-target">{{ l.target }}</strong>
              <small>{{ l.detail }}</small>
            </li>
          </ul>
          <p v-else class="log-empty">完成任意分流、纠偏或词库调整后，将在此实时呈现留痕动态。</p>
        </UiCard>
      </aside>
    </div>

    <OpinionEvidenceDrawer
      v-model="drawerOpen"
      :post-id="drawerPostId"
      @update:post-id="drawerPostId = $event"
      @dispose="id => { drawerOpen = false; openDispose(id) }"
    />
    <DispositionModal v-model="disposeOpen" :topic-id="disposeTopicId" />
    <SimulatePostModal v-model="simOpen" @ingested="id => openEvidence(id)" />
  </div>
</template>

<style scoped>
.op-page{display:flex;flex-direction:column;gap:16px}
.hero-banner{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 22px;border-radius:var(--r-md);background:var(--hero-bg);border:1px solid var(--red-line);box-shadow:var(--shadow-1);flex-wrap:wrap}
.hero-banner::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,var(--red) 0%,var(--gold) 42%,transparent 85%)}
.hb-main{flex:1 1 520px;min-width:0}
.hb-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.hb-pill{display:inline-flex;align-items:center;gap:5px;padding:2px 10px;border-radius:999px;background:var(--red-50);color:var(--red-600);border:1px solid var(--red-line);font-size:12px;font-weight:600}
.hb-date{font-size:12px;color:var(--text-3)}
.hb-conclusion{font-size:15.5px;font-weight:600;line-height:1.65;color:var(--text)}
.hb-compliance{font-size:12px;color:var(--text-3);margin-top:6px;line-height:1.5}
.hb-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

.op-agent-strip{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 16px;border-radius:var(--r-md);background:var(--card-bg);border:1px solid var(--card-border);border-left:3px solid var(--ai);box-shadow:var(--shadow-1)}
.oas-lead{display:flex;align-items:center;gap:10px;min-width:0}
.oas-ic{width:32px;height:32px;border-radius:9px;background:var(--ai-bg);color:var(--ai);display:inline-flex;align-items:center;justify-content:center;flex:none}
.oas-lead strong{display:block;font-size:14px;color:var(--text)}
.oas-lead span{display:block;font-size:12.5px;color:var(--text-3)}
.oas-btns{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

.ov-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
.ov-main,.ov-side{display:flex;flex-direction:column;gap:16px;min-width:0}

.more-link{display:inline-flex;align-items:center;gap:3px;font-size:13px;color:var(--red);font-weight:500}
.more-link:hover{text-decoration:underline}

.topic-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.tc{padding:14px 15px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2);display:flex;flex-direction:column;gap:8px;transition:border-color var(--dur),background var(--dur)}
@media(hover:hover){.tc:hover{border-color:var(--red-line);background:var(--surface)}}
.tc.lv-high{border-left:2px solid var(--risk-high)}
.tc.lv-mid{border-left:2px solid var(--risk-mid)}
.tc-head{display:flex;align-items:center;flex-wrap:nowrap;gap:8px;min-width:0}
.tc-ctx{font-size:12.5px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tc-status{font-size:12px;color:var(--risk-mid);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:168px}
.tc-status.done{color:var(--ok)}
.tc h4{margin:0;line-height:1.45}
.title-btn{font-size:14.5px;font-weight:600;color:var(--text);text-align:left;line-height:1.45;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.title-btn:hover{color:var(--red)}
.tc-sum{font-size:12.5px;line-height:1.6;color:var(--text-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:40px}
.tc-meta{display:flex;align-items:center;flex-wrap:wrap;gap:7px;font-size:12px;color:var(--text-3)}
.tc-cross{display:inline-flex;align-items:center;gap:3px;font-size:12px;color:var(--ai);font-weight:500}
.tc-foot{margin-top:auto;padding-top:9px;border-top:1px dashed var(--line);display:flex;align-items:center;justify-content:space-between;gap:10px}
.tc-acts{display:inline-flex;align-items:center;gap:12px;flex:none}
.link-act{font-size:12.5px;color:var(--text-2);font-weight:500}
.link-act:hover{color:var(--red)}
.link-act.primary{color:var(--red);font-weight:600}

.view-sw{display:inline-flex;gap:3px;padding:2px;border-radius:8px;background:var(--surface-3)}
.view-sw button{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 10px;border-radius:6px;font-size:12px;color:var(--text-2)}
.view-sw button.on{background:var(--surface);color:var(--red);font-weight:600;box-shadow:var(--shadow-1)}
.tbl.compact th,.tbl.compact td{padding:7px 10px;font-size:13px}

.tier-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
.tier-box{padding:11px 13px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2);cursor:pointer;transition:border-color var(--dur),background var(--dur)}
.tier-box:hover{border-color:var(--red-line);background:var(--red-25)}
.tb-name{display:block;font-size:12.5px;color:var(--text-2);font-weight:500}
.tier-box strong{display:block;font-size:22px;color:var(--text);margin:2px 0}
.tier-box strong small{font-size:12px;color:var(--text-3);margin-left:3px;font-weight:400}
.tb-sub{font-size:12px;color:var(--text-3)}

.src-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.src-chip{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 10px 6px 6px;border-radius:8px;border:1px solid var(--line);background:var(--surface);transition:border-color var(--dur)}
.src-chip:hover{border-color:var(--red-line)}
.src-chip b{font-size:13px;color:var(--text)}
.fold-btn{margin-top:10px;display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:var(--text-3)}
.fold-btn:hover{color:var(--red)}

.kpi4{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.k4-item{padding:13px 14px;border-radius:var(--r-md);background:var(--card-bg);border:1px solid var(--card-border);box-shadow:var(--shadow-1);display:flex;flex-direction:column;gap:2px;transition:border-color var(--dur)}
.k4-item:hover{border-color:var(--red-line)}
.k4-item.accent{background:var(--red-25);border-color:var(--red-line)}
.k4-item span{font-size:12.5px;color:var(--text-2)}
.k4-item strong{font-size:24px;color:var(--text);line-height:1.25}
.k4-item.accent strong{color:var(--red)}
.k4-item strong small{font-size:12px;color:var(--text-3);margin-left:3px;font-weight:400}
.k4-item em{font-style:normal;font-size:12px;color:var(--text-3)}

.cl-title{font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px}
.cl-desc{font-size:12.5px;line-height:1.6;color:var(--text-2);margin-bottom:10px}
.cl-acts{display:flex;gap:8px;flex-wrap:wrap}

.op-logs{display:flex;flex-direction:column;max-height:340px;overflow-y:auto}
.op-logs li{display:flex;flex-direction:column;gap:3px;padding:10px 16px;border-bottom:1px solid var(--line);font-size:12.5px}
.op-logs li:last-child{border-bottom:none}
.ol-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ol-act{font-size:12px;color:var(--red);font-weight:600}
.ol-target{color:var(--text);font-weight:600;line-height:1.45}
.op-logs small{display:block;color:var(--text-3);line-height:1.45}
.op-logs time{color:var(--text-4);font-size:12px;white-space:nowrap}
.log-empty{padding:18px;font-size:13px;color:var(--text-3);text-align:center}

@media(max-width:1280px){
  .ov-grid{grid-template-columns:1fr}
  .kpi4{grid-template-columns:repeat(4,minmax(0,1fr))}
}
@media(max-width:900px){
  .topic-cards,.tier-row,.src-grid,.kpi4{grid-template-columns:1fr 1fr}
}
</style>
