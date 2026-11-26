<script setup lang="ts">
import DocEditor from '@/design/doc/DocEditor.vue'
import { computed, ref, watch } from 'vue'
import { Search, FileText, RefreshCw, Download, ShieldCheck, ScrollText } from 'lucide-vue-next'
import { UiCard, UiTag, UiButton, AiNotice, UiEmpty } from '@/design/ui'
import { useArchiveStore } from '@/stores/outreach'
import { useSystemStore } from '@/stores/system'
import { useRecordQuery } from '@/app/useRecordQuery'
import { archiveSummary } from '@/engines/outreach'
import { downloadText } from '@/app/download'
import type { RecordSource } from '@/mock/outreach'

const store = useArchiveStore(), system = useSystemStore()
const openId = useRecordQuery()
const q = ref(''), source = ref<RecordSource | ''>('')
const sources: RecordSource[] = ['信访', '谈话函询', '巡察', '处分', '审计', '个人事项']
const list = computed(() => store.list.filter(c => !q.value || `${c.name}${c.unit}${c.title}`.includes(q.value)))
const cadre = computed(() => store.list.find(c => c.id === (openId.value || store.list[0]!.id))!)
const sorted = computed(() => cadre.value.records.slice().sort((a, b) => b.date.localeCompare(a.date)))
const records = computed(() => sorted.value.filter(r => !source.value || r.source === source.value))
const countOf = (s: RecordSource) => cadre.value.records.filter(r => r.source === s).length
const openCount = (c: { records: { open?: boolean }[] }) => c.records.filter(r => r.open).length
const attention = computed(() => cadre.value.tags.filter(t => t.tone !== 'green').sort((a, b) => rank(a.tone) - rank(b.tone)))
const normal = computed(() => cadre.value.tags.filter(t => t.tone === 'green'))
const rank = (t: string) => ['red', 'orange', 'blue', 'gray'].indexOf(t)
const stats = computed(() => [
  { label: '档案记录', value: cadre.value.records.length, unit: '条' },
  { label: '未办结事项', value: openCount(cadre.value), unit: '件', warn: openCount(cadre.value) > 0 },
  { label: '涉及数据类别', value: new Set(cadre.value.records.map(r => r.source)).size, unit: `/ ${sources.length} 类` },
  { label: '最近一条记录', value: sorted.value[0]?.date || '—', unit: '' },
])
const summary = computed({ get: () => store.summaries[cadre.value.id] || '', set: v => { store.summaries[cadre.value.id] = v } })
watch(() => cadre.value.id, id => { source.value = ''; system.log('archive', '查看', id, '查阅廉政档案'); if (!store.summaries[id]) store.summaries[id] = archiveSummary(cadre.value, cadre.value.tags) }, { immediate: true })
function gen() { summary.value = archiveSummary(cadre.value, cadre.value.tags); system.log('archive', '生成', cadre.value.id, '生成廉政情况摘要初稿') }
function exp() { downloadText(`${cadre.value.name}_廉政情况摘要.txt`, summary.value); system.log('archive', '导出', cadre.value.id, '导出廉政情况摘要') }
const sync = [['信访系统', '2026-11-07 08:00'], ['谈话函询台账', '2026-11-06 18:00'], ['巡察系统', '2026-11-07 08:00'], ['处分库', '2026-11-01 00:00'], ['审计报告', '2026-10-31 00:00'], ['个人事项', '2026-03-31 00:00']]
</script>
<template>
  <div class="ar">
    <aside class="roster">
      <div class="roster-head"><h3>干部名录</h3><span class="num">{{ list.length }} 人</span></div>
      <label class="search"><Search :size="15" /><input v-model="q" placeholder="搜索姓名、单位" aria-label="搜索干部" /></label>
      <ul class="people">
        <li v-for="c in list" :key="c.id">
          <button :class="{ on: cadre.id === c.id }" :aria-current="cadre.id === c.id" @click="openId = c.id">
            <span class="av">{{ c.name.slice(0, 1) }}</span>
            <span class="who"><strong>{{ c.name }}</strong><small :title="`${c.unit} · ${c.title}`">{{ c.unit }} · {{ c.title }}</small></span>
            <span v-if="openCount(c)" class="pending num" :title="`${openCount(c)} 件事项未办结`">{{ openCount(c) }}</span>
          </button>
        </li>
      </ul>
      <UiEmpty v-if="!list.length" title="没有匹配的干部" />
    </aside>

    <main class="dossier">
      <section class="hero">
        <div class="hero-top">
          <span class="seal">{{ cadre.name.slice(0, 1) }}</span>
          <div class="ident">
            <div class="name-row"><h2>{{ cadre.name }}</h2><UiTag tone="gold" size="sm">{{ cadre.level }}</UiTag></div>
            <p>{{ cadre.unit }} · {{ cadre.title }} · {{ cadre.since.replace('-', '年') }}月任职</p>
          </div>
        </div>
        <dl class="stats">
          <div v-for="s in stats" :key="s.label" :class="{ warn: s.warn }"><dt>{{ s.label }}</dt><dd><b class="num">{{ s.value }}</b><span v-if="s.unit">{{ s.unit }}</span></dd></div>
        </dl>
        <div class="tag-rows">
          <div v-if="attention.length" class="tag-row"><span class="tag-label">关注事项</span><div class="tags"><UiTag v-for="t in attention" :key="t.key" :tone="t.tone" dot>{{ t.label }}</UiTag></div></div>
          <div v-if="normal.length" class="tag-row"><span class="tag-label">核查正常</span><div class="tags"><UiTag v-for="t in normal" :key="t.key" tone="green" dot>{{ t.label }}</UiTag></div></div>
        </div>
        <p class="redline"><ShieldCheck :size="15" />画像只呈现客观数据标签，不作“廉政风险高”等定性结论，廉政意见由人研判。本次查阅已留痕。</p>
      </section>

      <div class="body">
        <UiCard :icon="FileText" title="档案记录" subtitle="按时间倒序，自动汇聚六类数据">
          <div class="filters" role="tablist" aria-label="按数据类别筛选">
            <button role="tab" :aria-selected="!source" :class="{ on: !source }" @click="source = ''">全部<span class="num">{{ cadre.records.length }}</span></button>
            <button v-for="s in sources" :key="s" role="tab" :aria-selected="source === s" :class="{ on: source === s }" :disabled="!countOf(s)" @click="source = s">{{ s }}<span class="num">{{ countOf(s) }}</span></button>
          </div>
          <UiEmpty v-if="!records.length" title="暂无该类记录" />
          <ol v-else class="recs">
            <li v-for="(r, i) in records" :key="i" :class="{ open: r.open }">
              <time class="num">{{ r.date }}</time>
              <span class="node" />
              <div class="rec-main">
                <div class="rec-head"><span class="src">{{ r.source }}</span><strong>{{ r.title }}</strong></div>
                <p>{{ r.result }}</p>
              </div>
              <UiTag v-if="r.open" tone="orange" size="sm">未办结</UiTag>
            </li>
          </ol>
          <template #footer>
            <div class="sync">
              <span class="sync-title">数据来源</span>
              <ul><li v-for="s in sync" :key="s[0]" :title="`${s[0]} · 已同步 ${s[1]}`"><i />{{ s[0] }}<small class="num">{{ s[1].slice(5) }}</small></li></ul>
            </div>
          </template>
        </UiCard>

        <UiCard :icon="ScrollText" title="廉政情况摘要" subtitle="系统汇聚生成初稿，可编辑后导出">
          <template #extra><UiButton size="sm" variant="secondary" :icon="RefreshCw" @click="gen">{{ summary ? '重新生成' : '生成摘要' }}</UiButton><UiButton size="sm" :icon="Download" :disabled="!summary" @click="exp">导出</UiButton></template>
          <DocEditor v-if="summary" v-model="summary" />
          <UiEmpty v-else title="点击「生成摘要」" />
          <AiNotice text="摘要仅汇总客观记录，未办结事项不代表问题属实。" />
        </UiCard>
      </div>
    </main>
  </div>
</template>
<style scoped>
.ar{display:grid;grid-template-columns:272px minmax(0,1fr);gap:16px;align-items:start}

/* 名录 */
.roster{position:sticky;top:16px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow-1);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 140px)}
.roster-head{display:flex;align-items:baseline;justify-content:space-between;padding:16px 18px 0}
.roster-head h3{font-size:15px;font-weight:600}
.roster-head span{font-size:12px;color:var(--text-3)}
.search{display:flex;align-items:center;gap:8px;margin:12px 14px;padding:0 12px;height:36px;border:1px solid var(--line-2);border-radius:var(--r-sm);color:var(--text-3);background:var(--surface-2);transition:border-color .18s,box-shadow .18s}
.search:focus-within{border-color:var(--red);box-shadow:0 0 0 3px var(--red-50);background:var(--surface)}
.search input{border:0;outline:0;flex:1;min-width:0;font-size:14px;background:none;color:var(--text)}
.people{overflow:auto;padding:0 8px 8px}
.people button{width:100%;display:flex;align-items:center;gap:10px;padding:10px;border-radius:var(--r-sm);text-align:left;position:relative;transition:background .18s}
.people button:hover{background:var(--surface-2)}
.people button.on{background:var(--red-25)}
.people button.on::before{content:"";position:absolute;left:-8px;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--red)}
.av{width:34px;height:34px;border-radius:50%;background:var(--surface-3);color:var(--text-2);display:flex;align-items:center;justify-content:center;font-family:var(--font-serif);font-weight:700;flex:none}
.on .av{background:var(--red);color:#FFF1D6}
.who{flex:1;min-width:0}
.who strong{display:block;font-size:14px;font-weight:600}
.who small{display:block;font-size:12px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.pending{min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--risk-mid-bg);color:var(--risk-mid);font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;flex:none}

/* 档案头 */
.dossier{display:flex;flex-direction:column;gap:16px;min-width:0}
.hero{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow-1);padding:22px 24px 0;position:relative;overflow:hidden}
.hero::before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,var(--red),var(--gold))}
.hero-top{display:flex;align-items:center;gap:16px}
.seal{width:56px;height:56px;border-radius:14px;background:linear-gradient(140deg,var(--red),var(--red-700));color:#FFE6B8;font-family:var(--font-serif);font-size:26px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;box-shadow:inset 0 0 0 1px rgba(255,230,184,.35)}
.ident{min-width:0}
.name-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.name-row h2{font-size:22px;font-weight:700;letter-spacing:.02em}
.ident p{font-size:13px;color:var(--text-3);margin-top:4px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:20px 0 0;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface-2)}
.stats>div{padding:12px 16px;min-width:0}
.stats>div+div{border-left:1px solid var(--line)}
.stats dt{font-size:12px;color:var(--text-3)}
.stats dd{margin-top:4px;display:flex;align-items:baseline;gap:4px;white-space:nowrap}
.stats b{font-size:22px;font-weight:600;color:var(--text);line-height:1.2}
.stats dd span{font-size:12px;color:var(--text-3)}
.stats .warn b{color:var(--risk-mid)}
.tag-rows{display:flex;flex-direction:column;gap:10px;margin-top:16px}
.tag-row{display:flex;gap:12px;align-items:flex-start}
.tag-label{flex:none;width:56px;font-size:12px;color:var(--text-3);line-height:24px}
.tags{display:flex;flex-wrap:wrap;gap:6px 8px;min-width:0}
.tags :deep(.ui-tag){line-height:22px}
.redline{display:flex;align-items:center;gap:8px;margin:18px -24px 0;padding:10px 24px;border-top:1px dashed var(--line-2);background:var(--surface-2);font-size:12.5px;color:var(--text-3)}
.redline svg{color:var(--red);flex:none}

/* 主体 */
.body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:16px;align-items:start}
.filters{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
.filters button{height:28px;padding:0 10px;border-radius:14px;border:1px solid var(--line-2);font-size:13px;color:var(--text-2);display:inline-flex;align-items:center;gap:6px;background:var(--surface);transition:background .18s,color .18s,border-color .18s}
.filters button span{font-size:12px;color:var(--text-3)}
.filters button:hover:not(:disabled):not(.on){border-color:var(--red-line);color:var(--red)}
.filters button.on{background:var(--red);border-color:var(--red);color:#fff}
.filters button.on span{color:rgba(255,255,255,.8)}
.filters button:disabled{opacity:.45;cursor:not-allowed}
.recs li{display:grid;grid-template-columns:82px 12px minmax(0,1fr) auto;gap:0 12px;align-items:start;position:relative;padding-bottom:18px}
.recs li:not(:last-child)::after{content:"";position:absolute;left:99px;top:18px;bottom:-2px;width:1px;background:var(--line-2)}
.recs time{font-size:12.5px;color:var(--text-3);line-height:22px;text-align:right}
.node{width:11px;height:11px;border-radius:50%;margin-top:6px;background:var(--surface);box-shadow:inset 0 0 0 2px var(--text-4);position:relative;z-index:1}
.open .node{box-shadow:inset 0 0 0 2px var(--risk-mid);background:var(--risk-mid-bg)}
.rec-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.src{font-size:12px;color:var(--text-2);background:var(--surface-3);border-radius:4px;padding:0 6px;line-height:20px;flex:none}
.rec-head strong{font-size:14px;font-weight:600;line-height:22px}
.rec-main p{font-size:13px;color:var(--text-2);margin-top:3px;line-height:1.7}
.recs :deep(.ui-tag){margin-top:2px}
.sync{display:flex;align-items:flex-start;gap:12px;width:100%}
.sync-title{font-size:12px;color:var(--text-3);flex:none;line-height:22px}
.sync ul{display:flex;flex-wrap:wrap;gap:4px 14px;min-width:0}
.sync li{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-2);line-height:22px}
.sync i{width:6px;height:6px;border-radius:50%;background:var(--ok)}
.sync small{color:var(--text-3)}
.body :deep(.doc-desk){padding:14px}
.body :deep(.doc-page){padding:36px 32px 44px;font-size:15px}

@media(max-width:1600px){.body{grid-template-columns:minmax(0,1fr)}}
@media(max-width:1100px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.stats>div:nth-child(3){border-left:0}.stats>div:nth-child(n+3){border-top:1px solid var(--line)}}
@media(max-width:900px){.ar{grid-template-columns:minmax(0,1fr)}.roster{position:static;max-height:320px}}
</style>
