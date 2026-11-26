<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, X, ArrowUpRight, ShieldCheck, History, Globe } from 'lucide-vue-next'
import { UiCard, AiNotice } from '@/design/ui'
import { useOpinionStore } from '@/stores/opinion'
import { mediaSources, type MediaTier } from '@/mock/opinion'
import { toast } from '@/app/toast'

const router = useRouter()
const store = useOpinionStore()

const wordInputs = reactive<Record<string, string>>({})
const excludeInputs = reactive<Record<string, string>>({})

const tiers: MediaTier[] = ['政务问政', '央省主流媒体', '属地资讯媒体', '公开社交短视频']
const activeTier = ref<'全部' | MediaTier>('全部')

const tierMeta: Record<MediaTier, { short: string; tone: string }> = {
  政务问政: { short: '政务问政', tone: 'gov' },
  央省主流媒体: { short: '央省媒体', tone: 'central' },
  属地资讯媒体: { short: '属地资讯', tone: 'local' },
  公开社交短视频: { short: '公开社交', tone: 'social' },
}

const tierTabs = computed(() => [
  { key: '全部' as const, label: '全部', count: mediaSources.length },
  ...tiers.map(t => ({
    key: t,
    label: tierMeta[t].short,
    count: mediaSources.filter(s => s.tier === t).length,
  })),
])

const visibleSources = computed(() =>
  activeTier.value === '全部'
    ? mediaSources
    : mediaSources.filter(s => s.tier === activeTier.value),
)

function onAddWord(groupId: string, isExclude = false) {
  const map = isExclude ? excludeInputs : wordInputs
  const val = (map[groupId] || '').trim()
  if (!val) return
  const ok = store.addKeyword(groupId, val, isExclude)
  if (ok) {
    map[groupId] = ''
    toast(`已添加${isExclude ? '排除噪词' : '监测词'}「${val}」，全站高亮与命中统计已即时重算`, 'ok')
  } else {
    toast('该词条已存在', 'warn')
  }
}

function onRemoveWord(groupId: string, word: string, isExclude = false) {
  store.removeKeyword(groupId, word, isExclude)
  toast(`已移除「${word}」并记入审计日志`, 'ok')
}
</script>

<template>
  <div class="tp-page">
    <!-- 六大纪检监测词包实时维护 -->
    <UiCard title="纪检监察专题词包管理" subtitle="增删监测词或排除噪词将即时重算涉纪信息流高亮与命中频次，所有调整自动记入全站审计日志">
      <div class="kw-grid">
        <section v-for="g in store.keywordGroups" :key="g.id" class="kw-card" :class="{ off: !g.enabled }">
          <header class="kw-head">
            <div>
              <strong>{{ g.name }}</strong>
              <p>{{ g.desc }}</p>
            </div>
            <div class="kw-ctrl">
              <button
                v-if="g.moduleLink"
                type="button"
                class="mod-link"
                @click="router.push(g.moduleLink)"
              >关联监督 <ArrowUpRight :size="12" /></button>
              <button
                type="button"
                role="switch"
                :aria-checked="g.enabled"
                class="toggle-pill"
                :class="{ on: g.enabled }"
                @click="store.toggleKeywordGroup(g.id)"
              >
                <i class="tp-thumb" />
                <span>{{ g.enabled ? '已启用' : '已停用' }}</span>
              </button>
            </div>
          </header>

          <div class="kw-block">
            <span class="kb-lbl">核心监测词（括号内为近 14 日命中条数）</span>
            <div class="chips">
              <span v-for="w in g.words" :key="w" class="chip">
                {{ w }}<em class="num">{{ store.keywordHitCount(w) }}</em>
                <button type="button" aria-label="移除" @click="onRemoveWord(g.id, w, false)"><X :size="12" /></button>
              </span>
            </div>
            <div class="add-row">
              <input
                v-model="wordInputs[g.id]"
                class="input sm"
                placeholder="输入新监测词回车添加，如：荒地发包"
                @keydown.enter.prevent="onAddWord(g.id, false)"
              />
              <button type="button" class="add-btn" @click="onAddWord(g.id, false)"><Plus :size="14" />添加</button>
            </div>
          </div>

          <div class="kw-block ex">
            <span class="kb-lbl">排除噪词（命中后自动过滤，降低商业/生活噪音）</span>
            <div class="chips">
              <span v-for="w in g.excludes" :key="w" class="chip ex">
                {{ w }}
                <button type="button" aria-label="移除" @click="onRemoveWord(g.id, w, true)"><X :size="12" /></button>
              </span>
            </div>
            <div class="add-row">
              <input
                v-model="excludeInputs[g.id]"
                class="input sm"
                placeholder="输入噪词回车排除"
                @keydown.enter.prevent="onAddWord(g.id, true)"
              />
              <button type="button" class="add-btn" @click="onAddWord(g.id, true)"><Plus :size="14" />排除</button>
            </div>
          </div>
        </section>
      </div>
    </UiCard>

    <!-- 合规公开信源目录：全宽 6×3 方卡矩阵 + 分级页签 -->
    <UiCard :icon="Globe" title="合规公开信源目录（共 18 个合法公开渠道）" subtitle="仅接入政务问政、央省主流媒体、属地资讯及平台公开区；严禁私域群与个人隐私采集">
      <template #extra>
        <div class="tier-tabs" role="tablist" aria-label="信源分类筛选">
          <button
            v-for="tab in tierTabs"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="activeTier === tab.key"
            class="tier-tab"
            :class="{ active: activeTier === tab.key }"
            @click="activeTier = tab.key"
          >
            <span>{{ tab.label }}</span>
            <em class="num">{{ tab.count }}</em>
          </button>
        </div>
      </template>

      <div class="src-grid">
        <article
          v-for="s in visibleSources"
          :key="s.id"
          class="src-tile"
          :title="`${s.name}：${s.scopeNote}`"
        >
          <header class="st-head">
            <span class="st-emblem">
              <img v-if="s.logo" :src="s.logo" :alt="s.short" class="st-logo" />
              <i v-else class="st-mono" :style="{ background: s.badgeColor }">{{ s.short.slice(0, 1) }}</i>
            </span>
            <span class="st-tier" :class="`tier-${tierMeta[s.tier].tone}`">{{ tierMeta[s.tier].short }}</span>
          </header>

          <div class="st-body">
            <h4 class="st-name">{{ s.short }}</h4>
            <p class="st-scope">{{ s.scopeNote }}</p>
          </div>

          <footer class="st-foot">
            <span class="st-dot" aria-hidden="true" />
            <span class="st-cycle">{{ s.syncCycle }}</span>
          </footer>
        </article>
      </div>

      <AiNotice class="src-notice" text="合规说明：演示环境使用内置高仿真样例数据与前端确定性引擎运行；正式上线须依托政务合规公开接口并经网信与纪检审批。" />
    </UiCard>

    <!-- 词库规则变更审计：全宽双栏紧凑卡片，与上方完全齐平 -->
    <UiCard :icon="History" title="词库规则变更审计" subtitle="记录每一次监测词/排除词维护操作">
      <template #extra>
        <span class="audit-count num">共 {{ store.keywordLogs.length }} 条留痕</span>
      </template>

      <ul class="audit-grid">
        <li v-for="l in store.keywordLogs.slice(0, 14)" :key="l.id" class="audit-item">
          <span class="audit-ic" aria-hidden="true"><ShieldCheck :size="15" /></span>
          <div class="audit-body">
            <div class="audit-top">
              <strong>{{ l.groupName }}</strong>
              <small class="num">{{ l.actor }} · {{ l.time }}</small>
            </div>
            <p>{{ l.detail }}</p>
          </div>
        </li>
      </ul>
    </UiCard>
  </div>
</template>

<style scoped>
.tp-page{display:flex;flex-direction:column;gap:16px}
.kw-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.kw-card{padding:15px 16px;border-radius:var(--r-md);border:1px solid var(--line);background:var(--surface-2);display:flex;flex-direction:column;gap:12px;transition:opacity var(--dur)}
.kw-card.off{opacity:.58}
.kw-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.kw-head strong{display:block;font-size:15px;color:var(--text)}
.kw-head p{font-size:12.5px;color:var(--text-3);margin-top:2px;line-height:1.5}
.kw-ctrl{display:flex;align-items:center;gap:10px;flex:none}
.mod-link{display:inline-flex;align-items:center;gap:2px;font-size:12px;color:var(--red);font-weight:500}
.mod-link:hover{text-decoration:underline}
.toggle-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 9px 3px 4px;border-radius:999px;border:1px solid var(--line-2);background:var(--surface);font-size:12px;color:var(--text-3);transition:border-color var(--dur),background var(--dur),color var(--dur)}
.toggle-pill.on{border-color:var(--ok-line);background:var(--ok-bg);color:var(--ok);font-weight:500}
.tp-thumb{width:14px;height:14px;border-radius:50%;background:var(--line-2);transition:background var(--dur)}
.toggle-pill.on .tp-thumb{background:var(--ok)}

.kw-block{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px dashed var(--line)}
.kb-lbl{font-size:12px;color:var(--text-3);font-weight:500}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-flex;align-items:center;gap:5px;padding:3px 6px 3px 9px;border-radius:6px;background:var(--surface);border:1px solid var(--line-2);font-size:12.5px;color:var(--text)}
.chip em{font-style:normal;font-size:12px;padding:0 5px;border-radius:999px;background:var(--red-50);color:var(--red);font-weight:600}
.chip.ex{background:var(--surface-3);color:var(--text-3);border-style:dashed}
.chip button{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--text-4);transition:background var(--dur),color var(--dur)}
.chip button:hover{background:var(--risk-high-bg);color:var(--risk-high)}

.add-row{display:flex;gap:6px}
.input.sm{height:30px;font-size:12.5px;padding:0 10px}
.add-btn{display:inline-flex;align-items:center;gap:3px;height:30px;padding:0 11px;border-radius:var(--r-sm);background:var(--surface);border:1px solid var(--line-2);font-size:12.5px;color:var(--text-2);flex:none}
.add-btn:hover{border-color:var(--red);color:var(--red)}

/* 信源分类页签 */
.tier-tabs{display:inline-flex;align-items:center;flex-wrap:wrap;gap:3px;padding:3px;border-radius:999px;background:var(--surface-3);border:1px solid var(--line)}
.tier-tab{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:999px;font-size:12.5px;color:var(--text-3);font-weight:500;transition:background var(--dur) var(--ease),color var(--dur) var(--ease),box-shadow var(--dur) var(--ease)}
.tier-tab:hover{color:var(--text)}
.tier-tab em{font-style:normal;font-size:11.5px;padding:0 5px;border-radius:999px;background:rgba(60,30,20,.06);color:var(--text-3);line-height:1.45}
.tier-tab.active{background:var(--surface);color:var(--red);box-shadow:0 1px 3px rgba(60,30,20,.08)}
.tier-tab.active em{background:var(--red-50);color:var(--red);font-weight:600}

/* 18 渠道 6×3 正方形矩阵（18 可被 6/3/2 整除，各断点均无落单缺口） */
.src-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.src-tile{
  grid-row:span 3;
  display:grid;
  grid-template-rows:auto 1fr auto;
  grid-template-rows:subgrid;
  row-gap:10px;
  min-block-size:154px;
  padding:14px 14px 12px;
  border-radius:var(--r-md);
  border:1px solid var(--line);
  background:linear-gradient(180deg,var(--surface) 0%,var(--surface-2) 100%);
  transition:border-color var(--dur) var(--ease),box-shadow var(--dur) var(--ease),transform var(--dur) var(--ease),background var(--dur) var(--ease);
}
.src-tile:hover{
  border-color:var(--red-line);
  background:var(--surface);
  box-shadow:0 8px 20px rgba(120,30,20,.07);
  transform:translateY(-2px);
}

.st-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.st-emblem{
  width:38px;height:38px;border-radius:10px;
  display:inline-flex;align-items:center;justify-content:center;
  background:var(--surface);border:1px solid var(--line);
  box-shadow:0 1px 3px rgba(60,30,20,.05);flex:none;
}
.st-logo{display:block;width:24px;height:24px;object-fit:contain;border-radius:4px}
.st-mono{
  width:28px;height:28px;border-radius:7px;color:#fff;
  font-style:normal;font-size:14px;font-weight:700;
  display:inline-flex;align-items:center;justify-content:center;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.25);
}

.st-tier{
  font-size:11px;font-weight:500;line-height:1.4;
  padding:2px 7px;border-radius:999px;white-space:nowrap;
}
.tier-gov{background:var(--info-bg);color:var(--info)}
.tier-central{background:var(--red-50);color:var(--red)}
.tier-local{background:var(--gold-soft);color:var(--accent-ink)}
.tier-social{background:var(--surface-3);color:var(--text-2)}

.st-body{display:flex;flex-direction:column;gap:4px;min-inline-size:0}
.st-name{font-size:14px;font-weight:600;color:var(--text);line-height:1.35;white-space:nowrap;overflow:clip;text-overflow:ellipsis}
.st-scope{
  font-size:12px;color:var(--text-3);line-height:1.5;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
  line-clamp:2;overflow:clip;
}

.st-foot{
  display:flex;align-items:center;gap:6px;
  padding-top:9px;border-top:1px dashed var(--line);
  min-inline-size:0;
}
.st-dot{
  width:6px;height:6px;border-radius:50%;background:var(--ok);
  box-shadow:0 0 0 3px var(--ok-bg);flex:none;
}
.st-cycle{
  font-size:11.5px;color:var(--ok);font-weight:500;
  white-space:nowrap;overflow:clip;text-overflow:ellipsis;
}

.src-notice{margin-top:14px}

/* 词库规则变更审计：全宽双栏紧凑卡片 */
.audit-count{
  font-size:12px;color:var(--text-3);font-weight:500;
  padding:3px 10px;border-radius:999px;
  background:var(--surface-3);border:1px solid var(--line);
}
.audit-grid{
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;
  max-block-size:260px;overflow-y:auto;
  scrollbar-gutter:stable;overscroll-behavior:contain;
}
.audit-item{
  display:flex;align-items:flex-start;gap:11px;
  padding:12px 14px;border-radius:10px;
  border:1px solid var(--line);background:var(--surface-2);
  transition:border-color var(--dur) var(--ease),background var(--dur) var(--ease);
}
.audit-item:hover{border-color:var(--line-2);background:var(--surface)}
.audit-ic{
  width:28px;height:28px;border-radius:8px;
  display:inline-flex;align-items:center;justify-content:center;
  background:var(--ok-bg);color:var(--ok);flex:none;margin-top:1px;
}
.audit-body{flex:1;min-inline-size:0;display:flex;flex-direction:column;gap:3px}
.audit-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap}
.audit-top strong{font-size:13.5px;color:var(--text);font-weight:600}
.audit-top small{font-size:11.5px;color:var(--text-4);white-space:nowrap}
.audit-body p{font-size:12.5px;color:var(--text-2);line-height:1.5}

@media(max-width:1360px){
  .src-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media(max-width:1100px){
  .kw-grid,.audit-grid{grid-template-columns:1fr}
}
@media(max-width:720px){
  .src-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
</style>
