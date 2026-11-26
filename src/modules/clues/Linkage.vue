<script setup lang="ts">
import { computed, ref } from 'vue'
import { Send, Building2, Hourglass, AlarmClock, CircleCheck, BellRing, Check, Forward } from 'lucide-vue-next'
import { UiCard, UiStat, UiTag, RiskBadge, UiButton, UiEmpty, AiNotice } from '@/design/ui'
import ClueDrawer from './parts/ClueDrawer.vue'
import { useCluesStore } from '@/stores/clues'
import { useSystemStore } from '@/stores/system'
import { useRecordQuery } from '@/app/useRecordQuery'
import { towns } from '@/mock/geo'
import { nowText, persisted } from '@/stores/persist'
import { toast } from '@/app/toast'

const clues = useCluesStore(), system = useSystemStore()
const openId = useRecordQuery()
const town = ref('')
const urged = persisted<Record<string, string>>('clues.urged', () => ({}))
/** 县乡联动环节：对应线索流转的四个节点 */
const stages = ['县纪委受理', '交办乡镇纪委', '乡镇纪委核查', '反馈办结']
const active = computed(() => clues.list.filter(c => !c.state.invalid && !c.state.mergedInto))
const assigned = computed(() => active.value.filter(c => c.state.node >= 1))
const rank = computed(() => towns.map(t => {
  const list = active.value.filter(c => c.town === t.id)
  const done = list.filter(c => c.state.done).length
  return { id: t.id, name: t.name, total: list.length, assigned: list.filter(c => c.state.node >= 1).length, done, overdue: list.filter(c => c.dl.state === '已超期').length, rate: list.length ? done / list.length : 0 }
}).filter(t => t.total).sort((a, b) => b.overdue - a.overdue || a.rate - b.rate))
const rows = computed(() => active.value.filter(c => !town.value || c.town === town.value).sort((a, b) => Number(a.state.done) - Number(b.state.done) || a.dl.left - b.dl.left))
const pct = (n: number) => `${Math.round(n * 100)}%`
function urge(c: typeof active.value[number]) {
  urged.value[c.id] = nowText()
  system.log('clues', '流转', c.id, `向${c.townName}纪委发出督办提醒，要求 ${c.dl.deadline} 前反馈`)
  toast(`已向${c.townName}纪委发出督办提醒`, 'ok')
}
function assign(c: typeof active.value[number]) { clues.advance(c.id, `交办${c.townName}纪委核查`); toast(`已交办${c.townName}纪委`, 'ok') }
</script>
<template>
  <div class="page">
    <div class="stats">
      <UiStat label="已交办乡镇纪委" :value="assigned.length" unit="件" :icon="Send" tone="blue" />
      <UiStat label="乡镇纪委核查中" :value="active.filter(c => c.state.node === 2).length" unit="件" :icon="Hourglass" tone="orange" />
      <UiStat label="超期未反馈" :value="active.filter(c => c.dl.state === '已超期').length" unit="件" :icon="AlarmClock" tone="red" />
      <UiStat label="已反馈办结" :value="active.filter(c => c.state.done).length" unit="件" :icon="CircleCheck" tone="green" />
    </div>
    <div class="grid">
      <UiCard :icon="Building2" title="乡镇联动情况" subtitle="按超期件数、办结率排序，点击筛选" flush>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>乡镇街道</th><th style="text-align:right">线索</th><th style="text-align:right">超期</th><th style="width:130px">办结率</th></tr></thead>
          <tbody>
            <tr :class="{ active: !town }" style="cursor:pointer" @click="town = ''"><td><strong>全县</strong></td><td class="num" style="text-align:right">{{ active.length }}</td><td class="num" style="text-align:right">{{ active.filter(c => c.dl.state === '已超期').length }}</td><td /></tr>
            <tr v-for="t in rank" :key="t.id" :class="{ active: town === t.id }" style="cursor:pointer" @click="town = town === t.id ? '' : t.id">
              <td>{{ t.name }}</td><td class="num" style="text-align:right">{{ t.total }}</td>
              <td class="num" style="text-align:right"><span :class="{ red: t.overdue }">{{ t.overdue }}</span></td>
              <td><div class="bar"><i :style="{ width: pct(t.rate) }" /></div><small class="num">{{ pct(t.rate) }}</small></td>
            </tr>
          </tbody>
        </table></div>
      </UiCard>
      <UiCard flush>
        <template #title><span>交办督办清单 <span class="muted num">{{ rows.length }} 件</span></span></template>
        <UiEmpty v-if="!rows.length" title="该乡镇暂无线索" />
        <ul v-else class="items">
          <li v-for="c in rows" :key="c.id">
            <div class="ih">
              <button class="num link" @click="openId = c.id">{{ c.id }}</button>
              <RiskBadge :level="c.grading.level" />
              <strong>{{ c.parsed.fields.accused.value || c.village }} · {{ c.parsed.fields.issue.value || '待研判' }}</strong>
              <span class="spacer" />
              <UiTag size="sm" :tone="c.dl.state === '已超期' ? 'red' : c.dl.state === '即将到期' ? 'orange' : c.dl.state === '已办结' ? 'green' : 'gray'">{{ c.dl.state === '已办结' ? '已办结' : c.dl.state === '已超期' ? `超期 ${-c.dl.left} 日` : `剩 ${c.dl.left} 日` }}</UiTag>
            </div>
            <div class="ib">
              <span class="place">{{ c.townName }} · {{ c.village }}</span>
              <ol class="mini"><li v-for="(s, i) in stages" :key="s" :class="{ done: i < c.state.node || c.state.done, cur: i === c.state.node && !c.state.done }"><i>{{ i < c.state.node || c.state.done ? '' : i + 1 }}<Check v-if="i < c.state.node || c.state.done" :size="10" :stroke-width="3" /></i>{{ s }}</li></ol>
              <span class="spacer" />
              <small v-if="urged[c.id]" class="muted">已督办 {{ urged[c.id]!.slice(5) }}</small>
              <UiButton v-if="c.state.node === 0 && system.can('task')" size="sm" variant="primary" :icon="Forward" @click="assign(c)">交办乡镇纪委</UiButton>
              <UiButton v-else-if="!c.state.done && system.can('task')" size="sm" :variant="c.dl.state === '已超期' ? 'primary' : 'secondary'" :icon="BellRing" @click="urge(c)">督办提醒</UiButton>
            </div>
          </li>
        </ul>
      </UiCard>
    </div>
    <AiNotice text="督办提醒发送至乡镇纪委工作台并记入审计日志；办结与否以乡镇纪委反馈材料和县纪委审核为准。" />
    <ClueDrawer :id="openId" @close="openId = null" />
  </div>
</template>
<style scoped>
.page{display:flex;flex-direction:column;gap:16px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.grid{display:grid;grid-template-columns:360px minmax(0,1fr);gap:16px;align-items:start}
tr.active td{background:var(--red-25)}
.red{color:var(--risk-high);font-weight:700}
.bar{height:6px;border-radius:3px;background:var(--surface-3);overflow:hidden;margin-bottom:2px}
.bar i{display:block;height:100%;background:var(--ok);border-radius:3px}
small{font-size:12px;color:var(--text-3)}
.items{list-style:none;margin:0;padding:0}
.items>li{padding:12px 18px;border-bottom:1px solid var(--line)}
.items>li:last-child{border-bottom:0}
.ih,.ib{display:flex;align-items:center;gap:8px;min-width:0}
.ib{margin-top:8px;flex-wrap:wrap}
.ih strong{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.link{color:var(--red);font-size:13px}
.place{font-size:12.5px;color:var(--text-3);min-width:110px}
.mini{list-style:none;margin:0;padding:0;display:flex;gap:4px;flex-wrap:wrap}
.mini li{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-4);padding:2px 8px 2px 3px;border-radius:12px;background:var(--surface-2)}
.mini i{width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:10px;background:var(--surface-3);color:var(--text-3)}
.mini li.done{color:var(--ok)}
.mini li.done i{background:var(--ok);color:#fff}
.mini li.cur{color:var(--red-600);background:var(--red-25);font-weight:600}
.mini li.cur i{background:var(--red);color:#fff}
@media(max-width:1300px){.grid{grid-template-columns:1fr}}
</style>
