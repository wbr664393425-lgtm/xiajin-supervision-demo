<script setup lang="ts">
import { computed, ref } from 'vue'
import { Filter, Star, Sparkles } from 'lucide-vue-next'
import { UiCard, UiTag, RiskBadge, UiButton, AiNotice } from '@/design/ui'
import ClueDrawer from './parts/ClueDrawer.vue'
import { useCluesStore } from '@/stores/clues'
import { useSystemStore } from '@/stores/system'
import { disciplines, riskWords } from '@/engines/discipline-tag'
import { useRecordQuery } from '@/app/useRecordQuery'
import { toast } from '@/app/toast'
import type { RiskLevel } from '@/types'

const clues = useCluesStore(), system = useSystemStore()
const openId = useRecordQuery()
const level = ref<RiskLevel | ''>(''), tag = ref(''), word = ref('')
const selected = ref<string[]>([])
const pool = computed(() => clues.list.filter(c => !c.state.invalid && !c.state.mergedInto))
const rows = computed(() => pool.value.filter(c => (!level.value || c.grading.level === level.value) && (!tag.value || c.grading.tags.some(t => t.name === tag.value)) && (!word.value || c.grading.risks.some(r => r.word === word.value))).sort((a, b) => b.grading.score - a.grading.score))
const tagCounts = computed(() => disciplines.map(d => ({ name: d, count: pool.value.filter(c => c.grading.tags.some(t => t.name === d)).length })))
const wordCounts = computed(() => riskWords.map(r => ({ word: r.word, count: pool.value.filter(c => c.grading.risks.some(x => x.word === r.word)).length })).filter(w => w.count))
const levelCounts = computed(() => (['high', 'mid', 'low'] as RiskLevel[]).map(l => ({ l, count: pool.value.filter(c => c.grading.level === l).length })))
const maxScore = computed(() => Math.max(1, ...pool.value.map(c => c.grading.score)))
const allChecked = computed({ get: () => rows.value.length > 0 && rows.value.every(r => selected.value.includes(r.id)), set: v => { selected.value = v ? rows.value.map(r => r.id) : [] } })
function autoScreen() { const ids = pool.value.filter(c => c.grading.highValue).map(c => c.id); selected.value = ids; toast(`已按规则勾选 ${ids.length} 条高价值线索，请人工确认`, 'info') }
function mark(v: '高价值' | '一般') { clues.screen(selected.value, v); toast(`${selected.value.length} 条线索已标记为「${v}」`); selected.value = [] }
</script>
<template>
  <div class="page">
    <div class="grading-grid">
      <UiCard title="六大纪律标签" subtitle="点击筛选">
        <div class="disc"><button v-for="t in tagCounts" :key="t.name" :class="{ on: tag === t.name }" @click="tag = tag === t.name ? '' : t.name"><span>{{ t.name }}</span><strong class="num">{{ t.count }}</strong></button></div>
      </UiCard>
      <UiCard title="高频风险词" subtitle="违规补贴、吃拿卡要、优亲厚友、工程回扣等">
        <div class="words"><button v-for="w in wordCounts" :key="w.word" :class="{ on: word === w.word }" @click="word = word === w.word ? '' : w.word">{{ w.word }}<b class="num">{{ w.count }}</b></button></div>
      </UiCard>
      <UiCard title="分级分布">
        <div class="levels"><button v-for="l in levelCounts" :key="l.l" :class="{ on: level === l.l }" @click="level = level === l.l ? '' : l.l"><RiskBadge :level="l.l" /><strong class="num">{{ l.count }}</strong></button></div>
      </UiCard>
    </div>
    <UiCard flush>
      <template #title><span class="row"><Filter :size="15" />线索初筛清单 <span class="muted num">{{ rows.length }} 条</span></span></template>
      <template #extra>
        <UiButton size="sm" variant="ghost" :icon="Sparkles" @click="autoScreen">按规则勾选高价值</UiButton>
        <template v-if="system.can('confirm')"><UiButton size="sm" variant="secondary" :disabled="!selected.length" @click="mark('一般')">标记一般</UiButton><UiButton size="sm" variant="primary" :icon="Star" :disabled="!selected.length" @click="mark('高价值')">批量标记高价值（{{ selected.length }}）</UiButton></template>
      </template>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th style="width:36px"><input v-model="allChecked" type="checkbox" aria-label="全选" /></th><th>线索</th><th>被反映人</th><th>纪律标签</th><th>风险词</th><th style="width:150px">研判分值</th><th>分级</th><th>初筛</th></tr></thead>
        <tbody>
          <tr v-for="c in rows" :key="c.id" :class="{ active: openId === c.id }">
            <td><input v-model="selected" type="checkbox" :value="c.id" :aria-label="`选择 ${c.id}`" /></td>
            <td><button class="link num" @click="openId = c.id">{{ c.id }}</button><div class="muted sub">{{ c.townName }}{{ c.village }} · {{ c.channel }}</div></td>
            <td>{{ c.parsed.fields.accused.value || '—' }}</td>
            <td><div class="chips"><UiTag v-for="t in c.grading.tags" :key="t.name" tone="gold" size="sm">{{ t.name }}</UiTag><span v-if="!c.grading.tags.length" class="muted">—</span></div></td>
            <td><div class="chips"><UiTag v-for="w in [...new Set(c.grading.risks.map(r => r.word))]" :key="w" tone="red" size="sm">{{ w }}</UiTag><span v-if="!c.grading.risks.length" class="muted">—</span></div></td>
            <td><div class="score"><i :style="{ width: `${(c.grading.score / maxScore) * 100}%` }" :class="c.grading.level" /></div><span class="num muted sub">{{ c.grading.score }} 分</span></td>
            <td><RiskBadge :level="c.grading.level" /></td>
            <td><UiTag v-if="c.state.screened" :tone="c.state.screened === '高价值' ? 'red' : 'gray'" size="sm">{{ c.state.screened }}</UiTag><UiTag v-else-if="c.grading.highValue" tone="ai" size="sm">建议高价值</UiTag><span v-else class="muted">—</span></td>
          </tr>
        </tbody>
      </table></div>
    </UiCard>
    <AiNotice text="标签与分值由本地规则计算，用于排序和批量初筛，不代表问题属实，不作违纪定性。" />
    <ClueDrawer :id="openId" @close="openId = null" />
  </div>
</template>
<style scoped>
.grading-grid{display:grid;grid-template-columns:1.2fr 1.2fr .9fr;gap:16px}
.disc{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.disc button,.levels button{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line);font-size:14px;transition:all var(--dur)}
.disc button:hover,.levels button:hover,.words button:hover{border-color:var(--red-line)}
.disc button.on,.levels button.on{border-color:var(--red);background:var(--red-25);box-shadow:inset 0 0 0 1px var(--red)}
.disc strong,.levels strong{font-size:18px;font-weight:700}
.words{display:flex;flex-wrap:wrap;gap:8px}
.words button{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:16px;background:var(--surface-2);border:1px solid var(--line);font-size:13px;transition:all var(--dur)}
.words button.on{background:var(--red);color:#fff;border-color:var(--red)}
.words b{font-weight:700;color:var(--red)}
.words button.on b{color:#fff}
.levels{display:flex;flex-direction:column;gap:8px}
.chips{display:flex;flex-wrap:wrap;gap:4px}
.link{color:var(--red);font-weight:600}
.sub{font-size:12px}
.score{height:6px;border-radius:3px;background:var(--surface-3);overflow:hidden;margin-top:6px}
.score i{display:block;height:100%;border-radius:3px}
.score i.high{background:var(--risk-high)}.score i.mid{background:#E07B2A}.score i.low{background:#E5B53A}
input[type=checkbox]{accent-color:var(--red);width:15px;height:15px}
</style>
