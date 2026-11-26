<script setup lang="ts">
import { computed, ref } from 'vue'
import { Copy, Users, Ban, GitMerge, Link2, X, Check, Undo2 } from 'lucide-vue-next'
import { UiCard, UiTabs, UiTag, UiButton, UiEmpty, AiNotice, RiskBadge } from '@/design/ui'
import ClueText from './parts/ClueText.vue'
import ClueDrawer from './parts/ClueDrawer.vue'
import { useCluesStore } from '@/stores/clues'
import { useSystemStore } from '@/stores/system'
import { useRecordQuery } from '@/app/useRecordQuery'
import { toast } from '@/app/toast'

const clues = useCluesStore(), system = useSystemStore()
const tab = ref('duplicate')
const openId = useRecordQuery()
const dup = computed(() => clues.pairs.filter(p => p.kind === 'duplicate'))
const multi = computed(() => clues.pairs.filter(p => p.kind === 'multi'))
const tabs = computed(() => [{ value: 'duplicate', label: '重复举报', count: dup.value.length }, { value: 'multi', label: '多头举报', count: multi.value.length }, { value: 'invalid', label: '无效诉求', count: clues.invalid.length }])
const shown = computed(() => tab.value === 'duplicate' ? dup.value : multi.value)
const saved = computed(() => clues.pairs.filter(p => clues.pairDecision(p.a, p.b) === '合并').length)
function spansFor(text: string, list: string[]) { return list.flatMap(s => { const i = text.indexOf(s); return i >= 0 ? [{ start: i, end: i + s.length, tag: 'match' }] : [] }) }
function decide(a: string, b: string, d: '合并' | '关联' | '不相关') { clues.decidePair(a, b, d); toast(d === '合并' ? `${b} 已并入 ${a} 办理，原件保留` : `已记录人工判定：${d}`) }
</script>
<template>
  <div class="page">
    <div class="summary">
      <div class="sum"><Copy :size="18" /><div><strong class="num">{{ dup.length }}</strong><span>组疑似重复举报</span></div></div>
      <div class="sum"><Users :size="18" /><div><strong class="num">{{ multi.length }}</strong><span>组多头 / 关联举报</span></div></div>
      <div class="sum"><Ban :size="18" /><div><strong class="num">{{ clues.invalid.length }}</strong><span>条疑似无效诉求</span></div></div>
      <div class="sum ok"><GitMerge :size="18" /><div><strong class="num">{{ saved }}</strong><span>组已人工合并 · 原件均保留</span></div></div>
    </div>
    <div class="row"><UiTabs v-model="tab" :items="tabs" /><span class="spacer" /><span class="muted note">比对依据：文本相似度 + 被反映人、合同/项目编号、关联企业、村社重合</span></div>

    <template v-if="tab !== 'invalid'">
      <UiEmpty v-if="!shown.length" title="暂无此类线索组" />
      <UiCard v-for="p in shown" :key="p.a + p.b" class="pair">
        <div class="pair-head">
          <div class="ring" :style="{ '--p': Math.round(p.similarity * 100) }"><span class="num">{{ Math.round(p.similarity * 100) }}%</span></div>
          <div class="pair-title"><strong>{{ clues.byId(p.a)?.parsed.fields.accused.value || clues.byId(p.a)?.village }} · {{ clues.byId(p.a)?.parsed.fields.issue.value }}</strong><div class="reasons"><UiTag v-for="r in p.reasons" :key="r" :tone="r.startsWith('文本') ? 'red' : 'gold'" size="sm">{{ r }}</UiTag></div></div>
          <UiTag v-if="clues.pairDecision(p.a, p.b)" :tone="clues.pairDecision(p.a, p.b) === '合并' ? 'green' : clues.pairDecision(p.a, p.b) === '关联' ? 'blue' : 'gray'" :icon="Check">人工判定：{{ clues.pairDecision(p.a, p.b) }}</UiTag>
        </div>
        <div class="compare">
          <div v-for="id in [p.a, p.b]" :key="id" class="side">
            <div class="side-head"><button class="num link" @click="openId = id">{{ id }}</button><span>{{ clues.byId(id)?.channel }} · {{ clues.byId(id)?.receivedAt }} · {{ clues.byId(id)?.reporter }}</span><RiskBadge v-if="clues.byId(id)" :level="clues.byId(id)!.grading.level" /></div>
            <ClueText :text="clues.byId(id)?.content || ''" :spans="spansFor(clues.byId(id)?.content || '', p.matches.map(m => id === p.a ? m.a : m.b))" />
          </div>
        </div>
        <template #footer>
          <span class="muted note">黄色为匹配语句。{{ p.kind === 'duplicate' ? '建议合并为同一线索办理' : '建议关联办理，分别保留' }}</span><span class="spacer" />
          <template v-if="system.can('confirm')">
            <UiButton v-if="clues.pairDecision(p.a, p.b)" size="sm" variant="ghost" :icon="Undo2" @click="decide(p.a, p.b, '不相关')">改判</UiButton>
            <UiButton size="sm" :variant="p.kind === 'duplicate' ? 'primary' : 'secondary'" :icon="GitMerge" @click="decide(p.a, p.b, '合并')">合并（保留原件）</UiButton>
            <UiButton size="sm" :variant="p.kind === 'multi' ? 'primary' : 'secondary'" :icon="Link2" @click="decide(p.a, p.b, '关联')">关联不合并</UiButton>
            <UiButton size="sm" variant="ghost" :icon="X" @click="decide(p.a, p.b, '不相关')">不相关</UiButton>
          </template>
        </template>
      </UiCard>
    </template>
    <template v-else>
      <UiCard v-for="item in clues.invalid" :key="item.id" class="pair">
        <div class="side-head"><button class="num link" @click="openId = item.id">{{ item.id }}</button><span>{{ clues.byId(item.id)?.channel }} · {{ clues.byId(item.id)?.townName }}{{ clues.byId(item.id)?.village }}</span><UiTag v-if="clues.byId(item.id)?.state.invalid" tone="gray" :icon="Check">已确认无效 · 转办答复</UiTag></div>
        <p class="invalid-text serif">{{ clues.byId(item.id)?.content }}</p>
        <ul class="why"><li v-for="r in item.reasons" :key="r">{{ r }}</li></ul>
        <template #footer><span class="spacer" /><template v-if="system.can('confirm')"><UiButton v-if="clues.byId(item.id)?.state.invalid" size="sm" variant="ghost" :icon="Undo2" @click="clues.markInvalid(item.id, false)">恢复研判</UiButton><UiButton v-else size="sm" variant="primary" :icon="Ban" @click="clues.markInvalid(item.id, true); toast('已标记无效诉求，转相关部门答复')">人工确认 · 无效诉求转办</UiButton></template></template>
      </UiCard>
    </template>
    <AiNotice text="判重与无效识别仅为辅助提示。合并只改变办理归口，任何原始举报材料都不会被删除或改写。" />
    <ClueDrawer :id="openId" @close="openId = null" />
  </div>
</template>
<style scoped>
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.sum{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow-1);color:var(--red)}
.sum.ok{color:var(--ok)}
.sum strong{display:block;font-size:24px;line-height:1.1;color:var(--text)}
.sum span{font-size:13px;color:var(--text-3)}
.note{font-size:13px}
.pair-head{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.ring{--p:50;width:52px;height:52px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--red) calc(var(--p)*1%),var(--surface-3) 0)}
.ring span{width:42px;height:42px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--red)}
.pair-title{flex:1;min-width:0}
.pair-title strong{font-size:15px}
.reasons{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.compare{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.side{border:1px solid var(--line);border-radius:var(--r-sm);padding:12px 14px;background:var(--surface-2)}
.side-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;color:var(--text-3);margin-bottom:6px}
.link{color:var(--red);font-weight:600}
.side :deep(.clue-text){font-size:14px;line-height:1.9}
.invalid-text{font-size:15px;line-height:1.9;margin:6px 0 10px}
.why li{font-size:14px;color:var(--text-2);padding-left:14px;position:relative}
.why li::before{content:"";position:absolute;left:2px;top:10px;width:5px;height:5px;border-radius:50%;background:var(--risk-mid)}
</style>
