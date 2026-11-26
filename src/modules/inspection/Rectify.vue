<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ClipboardCheck, Sparkles, Paperclip, Plus, X, Check, CircleAlert, Send, BadgeCheck, Undo2, FileInput } from 'lucide-vue-next'
import { UiCard, UiTag, RiskBadge, UiButton, UiDrawer, UiTimeline, UiUpload, AiNotice, UiStat } from '@/design/ui'
import { useInspectionStore } from '@/stores/inspection'
import { useSystemStore } from '@/stores/system'
import { useRecordQuery } from '@/app/useRecordQuery'
import { rectifySamples } from '@/mock/inspection'
import { checkRectify } from '@/engines/inspection'
import { today } from '@/stores/persist'
import { toast } from '@/app/toast'

const insp = useInspectionStore(), system = useSystemStore()
const openId = useRecordQuery()
const issue = computed(() => insp.issues.find(i => i.id === openId.value))
const open = computed({ get: () => Boolean(issue.value), set: v => { if (!v) openId.value = null } })
const text = ref(''), files = ref<string[]>([]), newFile = ref(''), checked = ref(false)
watch(openId, id => { if (!id) return; const s = insp.stateOf(id); text.value = s.text; files.value = [...s.attachments]; checked.value = Boolean(s.text) })
const preview = computed(() => issue.value && text.value ? checkRectify(issue.value, text.value, files.value, today(), insp.stateOf(issue.value.id).status === '已销号') : null)
const counts = computed(() => ({ doing: insp.issues.filter(i => insp.stateOf(i.id).status === '整改中').length, review: insp.issues.filter(i => insp.stateOf(i.id).status === '待复核').length, done: insp.issues.filter(i => insp.stateOf(i.id).status === '已销号').length, overdue: insp.issues.filter(i => i.deadline < today() && insp.stateOf(i.id).status !== '已销号').length }))
function loadSample() { const s = rectifySamples[issue.value!.id]; if (s) { text.value = s.text; files.value = [...s.attachments] } else { text.value = ''; toast('该问题暂无样例整改材料', 'info') } checked.value = false }
async function onFiles(list: File[]) { for (const f of list) { if (/\.txt$/i.test(f.name) && !text.value) text.value = (await f.text()).slice(0, 3000); else files.value.push(f.name) } }
function analyze() { checked.value = true; insp.saveRectify(issue.value!.id, text.value, files.value); system.log('inspection', '生成', issue.value!.id, '整改材料与问题清单智能比对') }
function submit() { insp.saveRectify(issue.value!.id, text.value, files.value); insp.setStatus(issue.value!.id, '待复核', '提交巡察办复核'); toast('已提交复核') }
function close() { insp.setStatus(issue.value!.id, '已销号', '巡察办复核通过，人工销号'); toast('已销号') }
function reject() { insp.setStatus(issue.value!.id, '整改中', '复核未通过，退回补充整改'); toast('已退回补充整改', 'info') }
</script>
<template>
  <div class="page">
    <div class="stats">
      <UiStat label="整改中" :value="counts.doing" unit="项" :icon="ClipboardCheck" tone="blue" />
      <UiStat label="待复核" :value="counts.review" unit="项" :icon="Send" tone="gold" />
      <UiStat label="已销号" :value="counts.done" unit="项" :icon="BadgeCheck" tone="green" />
      <UiStat label="逾期未销号" :value="counts.overdue" unit="项" :icon="CircleAlert" tone="red" />
    </div>
    <UiCard title="巡察反馈问题整改台账" :subtitle="`${insp.target.name} · 反馈问题 ${insp.issues.length} 项`" flush>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>编号</th><th>问题</th><th>类别</th><th>责任单位</th><th>整改期限</th><th>材料比对</th><th>状态</th></tr></thead>
        <tbody><tr v-for="i in insp.issues" :key="i.id" :class="{ active: openId === i.id }" style="cursor:pointer" @click="openId = i.id">
          <td class="num link">{{ i.id }}</td><td><strong>{{ i.title }}</strong><div class="muted sub">{{ i.detail }}</div></td><td><UiTag size="sm" tone="gold">{{ i.category }}</UiTag></td><td>{{ i.owner }}</td>
          <td class="num" :class="{ over: i.deadline < today() && insp.stateOf(i.id).status !== '已销号' }">{{ i.deadline }}</td>
          <td><template v-if="insp.checks[i.id]"><UiTag size="sm" :tone="insp.checks[i.id]!.level === 'low' ? 'green' : insp.checks[i.id]!.level === 'mid' ? 'orange' : 'red'">{{ insp.checks[i.id]!.verdicts.filter(v => !v.ok).length ? `${insp.checks[i.id]!.verdicts.filter(v => !v.ok).length} 项待补` : '回应到位' }}</UiTag></template><span v-else class="muted sub">未上传</span></td>
          <td><UiTag :tone="insp.stateOf(i.id).status === '已销号' ? 'green' : insp.stateOf(i.id).status === '待复核' ? 'gold' : i.deadline < today() ? 'red' : 'blue'" dot>{{ insp.stateOf(i.id).status === '整改中' && i.deadline < today() ? '逾期' : insp.stateOf(i.id).status }}</UiTag></td>
        </tr></tbody>
      </table></div>
    </UiCard>
    <UiDrawer v-model="open" :width="720" :title="issue ? `${issue.id} · ${issue.title}` : ''" :subtitle="issue ? `${issue.category} · ${issue.owner} · 期限 ${issue.deadline}` : ''">
      <template v-if="issue">
        <p class="detail">{{ issue.detail }}</p>
        <div class="row hd"><h4>整改材料</h4><span class="spacer" /><UiButton size="sm" variant="ghost" :icon="FileInput" @click="loadSample">载入样例材料</UiButton></div>
        <textarea v-model="text" class="textarea" rows="7" :disabled="insp.stateOf(issue.id).status !== '整改中'" placeholder="粘贴整改情况说明，或上传文本文件…" aria-label="整改情况说明" />
        <div class="files"><span v-for="(f, idx) in files" :key="f + idx" class="file"><Paperclip :size="13" />{{ f }}<button v-if="insp.stateOf(issue.id).status === '整改中'" aria-label="移除" @click="files.splice(idx, 1)"><X :size="12" /></button></span>
          <span v-if="insp.stateOf(issue.id).status === '整改中'" class="add"><input v-model="newFile" class="input" placeholder="佐证材料名称" @keydown.enter="newFile.trim() && files.push(newFile.trim()); newFile = ''" /><UiButton size="sm" :icon="Plus" :disabled="!newFile.trim()" @click="files.push(newFile.trim()); newFile = ''">添加</UiButton></span></div>
        <UiUpload v-if="insp.stateOf(issue.id).status === '整改中'" multiple hint="文本文件作为说明正文，其他文件作为佐证材料登记" @files="onFiles" />
        <template v-if="checked && preview">
          <h4 class="mt">智能比对结果 <RiskBadge :level="preview.level" :label="preview.level === 'low' ? '回应到位' : preview.level === 'mid' ? '部分待补' : '避重就轻 / 缺佐证'" /></h4>
          <ul class="verdicts"><li v-for="v in preview.verdicts" :key="v.label" :class="{ ok: v.ok }"><component :is="v.ok ? Check : CircleAlert" :size="16" /><div><strong>{{ v.label }}</strong><span>{{ v.detail }}</span></div></li></ul>
        </template>
        <h4 class="mt">整改流程</h4>
        <UiTimeline :items="insp.stateOf(issue.id).history.map(h => ({ time: h.time, title: h.action, text: h.who, tone: h.action.includes('销号') ? 'green' : 'gray' }))" />
        <AiNotice text="比对结果用于辅助复核，是否销号由巡察办人工决定。" />
      </template>
      <template #footer>
        <template v-if="issue">
          <template v-if="insp.stateOf(issue.id).status === '整改中'"><UiButton variant="secondary" :icon="Sparkles" :disabled="!text.trim()" @click="analyze">智能比对</UiButton><UiButton variant="primary" :icon="Send" :disabled="!text.trim()" @click="submit">提交复核</UiButton></template>
          <template v-else-if="insp.stateOf(issue.id).status === '待复核' && system.can('confirm')"><UiButton variant="secondary" :icon="Undo2" @click="reject">退回补充</UiButton><UiButton variant="primary" :icon="BadgeCheck" @click="close">人工复核 · 销号</UiButton></template>
          <UiTag v-else tone="green" :icon="BadgeCheck">已销号</UiTag>
        </template>
      </template>
    </UiDrawer>
  </div>
</template>
<style scoped>
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.link{color:var(--red);font-weight:600}
.sub{font-size:12px;max-width:420px}
.over{color:var(--risk-high);font-weight:600}
.detail{font-size:14px;line-height:1.8;color:var(--text-2);padding:12px 14px;border-radius:var(--r-sm);background:var(--cream);margin-bottom:12px}
.hd{margin-bottom:6px}
h4{font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px}
.mt{margin:16px 0 8px}
.files{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
.file{display:inline-flex;align-items:center;gap:5px;font-size:13px;padding:3px 8px;border-radius:6px;background:var(--surface-3)}
.file button{color:var(--text-3);display:flex}
.add{display:flex;gap:6px;flex:1;min-width:260px}
.add .input{height:30px;padding:4px 10px;font-size:13px}
.verdicts{display:flex;flex-direction:column;gap:6px}
.verdicts li{display:flex;gap:10px;padding:10px 12px;border-radius:var(--r-sm);background:var(--red-25);color:var(--red);border:1px solid var(--red-line)}
.verdicts li.ok{background:var(--ok-bg);color:var(--ok);border-color:var(--ok-line)}
.verdicts strong{display:block;font-size:14px}
.verdicts span{font-size:13px;color:var(--text-2)}
</style>
