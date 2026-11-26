<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ClipboardPaste, FileText, ScanLine, PhoneCall, Globe, Sparkles, Check, PencilLine, RotateCcw, Database, Link2 } from 'lucide-vue-next'
import { UiCard, UiButton, UiTag, RiskBadge, UiUpload, AiNotice, UiSelect } from '@/design/ui'
import ClueText from './parts/ClueText.vue'
import ClueDrawer from './parts/ClueDrawer.vue'
import { intakeSamples, type Channel } from '@/mock/clues'
import { towns } from '@/mock/geo'
import { parseClue, fieldOrder, type FieldKey, type ParsedClue } from '@/engines/clue-parse'
import { gradeClue } from '@/engines/discipline-tag'
import { similarity } from '@/engines/text'
import { useCluesStore } from '@/stores/clues'
import { useSystemStore } from '@/stores/system'
import { today } from '@/stores/persist'
import { toast } from '@/app/toast'
import { useRecordQuery } from '@/app/useRecordQuery'

const clues = useCluesStore(), system = useSystemStore(), router = useRouter(), route = useRoute()
const sources = [
  { key: 'paste', label: '粘贴文本', icon: ClipboardPaste, channel: '来信' as Channel },
  { key: 'txt', label: '文本文件', icon: FileText, channel: '来信' as Channel },
  { key: 'scan', label: '扫描件', icon: ScanLine, channel: '来信' as Channel },
  { key: 'ticket', label: '12345 工单', icon: PhoneCall, channel: '12345工单' as Channel },
  { key: 'web', label: '网络举报', icon: Globe, channel: '网络举报' as Channel },
]
const source = ref('paste')
const form = reactive({ text: '', channel: '来信' as Channel, town: 'qinghe', village: '和盛村', note: '' })
const phase = ref<'edit' | 'parsing' | 'done'>('edit')
const step = ref(0)
const parsed = ref<ParsedClue | null>(null)
const overrides = reactive<Partial<Record<FieldKey, string>>>({})
const editing = ref<FieldKey | null>(null), draft = ref('')
const active = ref('')
const openId = useRecordQuery()
const steps = computed(() => [source.value === 'scan' ? '扫描件转写' : '读取原文', '抽取要素', '纪律标签', '比对在库'])
const villages = computed(() => towns.find(t => t.id === form.town)?.villages || [])
const grading = computed(() => parsed.value && gradeClue(form.text, { hasAccused: Boolean(value('accused')), amounts: parsed.value.amounts, codes: parsed.value.codes, companies: parsed.value.companies }))
const similar = computed(() => phase.value === 'done' ? clues.list.map(c => ({ c, sim: similarity(c.content, form.text) })).filter(x => x.sim >= 0.25).sort((a, b) => b.sim - a.sim).slice(0, 3) : [])
const spans = computed(() => !parsed.value ? [] : [
  ...(grading.value?.risks || []).map(r => ({ start: r.start, end: r.end, tag: 'risk', key: `risk:${r.word}` })),
  ...fieldOrder.map(k => parsed.value!.fields[k]).filter(f => f.span && !overrides[f.key]).map(f => ({ ...f.span!, tag: 'field', key: f.key })),
])
const recent = computed(() => clues.list.slice(0, 8))
const value = (k: FieldKey) => overrides[k] ?? parsed.value?.fields[k].value ?? ''
/** 解析前的要素预览：告诉使用者 智能引擎会抽取哪些内容 */
const blankFields = parseClue('').fields

function pickSource(key: string) {
  source.value = key
  const s = sources.find(x => x.key === key)!
  form.channel = s.channel
  const sample = intakeSamples.find(x => x.key === key)
  if (sample) { form.text = sample.text; form.town = sample.town; form.village = sample.village; form.note = sample.note }
  else form.note = ''
  reset(false)
}
async function onFiles(files: File[]) {
  const file = files[0]!
  if (!/\.txt$/i.test(file.name)) { toast('扫描件请通过「扫描件」渠道载入'); pickSource('scan'); return }
  form.text = (await file.text()).slice(0, 4000); form.note = `已读取本地文件 ${file.name}（仅在浏览器内处理）`; reset(false)
}
function reset(clearText = true) { if (clearText) form.text = ''; phase.value = 'edit'; parsed.value = null; Object.keys(overrides).forEach(k => delete overrides[k as FieldKey]); editing.value = null; active.value = '' }
async function run() {
  if (!form.text.trim()) return
  if (phase.value === 'done') reset(false)
  phase.value = 'parsing'
  for (step.value = 0; step.value < steps.value.length; step.value++) await new Promise(r => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320))
  parsed.value = parseClue(form.text)
  phase.value = 'done'
  system.log('clues', '生成', '线索解析', `${form.channel}材料本地解析，提取 ${fieldOrder.filter(k => parsed.value!.fields[k].value).length} 项要素`)
}
function edit(k: FieldKey) { editing.value = k; draft.value = value(k) }
function saveEdit() { if (!editing.value) return; const k = editing.value; if (draft.value.trim() !== (parsed.value?.fields[k].value || '')) overrides[k] = draft.value.trim(); editing.value = null }
function commit() {
  const id = clues.register({ channel: form.channel, receivedAt: today(), town: form.town, village: form.village, reporter: form.channel === '12345工单' ? '工单转办' : form.channel === '网络举报' ? '匿名网友' : '来信人', content: form.text.trim() }, { ...overrides })
  toast(`已入库 ${id}，进入督办台账`, 'ok', { label: '查看', to: `/clues/ledger?id=${id}` })
  reset(); source.value = 'paste'
}
void route; void router
// 首次进入直接展示一份已解析的网络举报样例；点渠道按钮可重新载入并解析
pickSource('web'); parsed.value = parseClue(form.text); phase.value = 'done'
</script>

<template>
  <div class="page">
    <div class="intake-grid">
      <UiCard title="原始材料" :icon="FileText" :subtitle="form.note || '粘贴或导入信访材料；原件全文保留，解析不改动原文'">
        <template #extra><UiButton v-if="phase === 'done'" size="sm" variant="ghost" :icon="PencilLine" @click="phase = 'edit'">修改原文</UiButton></template>
        <div class="src-row" role="tablist" aria-label="材料来源">
          <button v-for="s in sources" :key="s.key" class="source" role="tab" :aria-selected="source === s.key" :class="{ active: source === s.key }" :disabled="phase === 'parsing'" @click="pickSource(s.key)"><component :is="s.icon" :size="15" /><span>{{ s.label }}</span></button>
        </div>
        <div class="meta">
          <div><span class="label">来源渠道</span><UiSelect v-model="form.channel" label="来源渠道" :options="['来信', '来访', '12345工单', '网络举报']" /></div>
          <div><span class="label">乡镇街道</span><UiSelect v-model="form.town" label="乡镇街道" :options="towns.map(t => ({ value: t.id, label: t.name }))" @change="form.village = villages[0] || ''" /></div>
          <div><span class="label">村居社区</span><UiSelect v-model="form.village" label="村居社区" :options="villages" /></div>
        </div>
        <UiUpload v-if="source === 'txt' && phase === 'edit'" accept=".txt,.pdf,.png,.jpg" class="upload" @files="onFiles" />
        <textarea v-if="phase !== 'done'" v-model="form.text" class="textarea material" :disabled="phase === 'parsing'" rows="9" placeholder="粘贴来信、来访记录、工单或网络举报原文…" aria-label="原始材料" />
        <div v-else class="preview"><ClueText :text="form.text" :spans="spans" :active="active" @pick="active = $event" /></div>
        <template #footer>
          <span class="muted count num">{{ form.text.length }} 字</span>
          <UiButton v-if="phase !== 'edit' || form.text" size="sm" variant="ghost" :icon="RotateCcw" :disabled="phase === 'parsing'" @click="reset()">清空</UiButton>
          <span class="spacer" />
          <UiButton variant="primary" :icon="Sparkles" :loading="phase === 'parsing'" :disabled="!form.text.trim()" @click="run">{{ phase === 'parsing' ? '解析中…' : phase === 'done' ? '重新解析' : '智能解析' }}</UiButton>
        </template>
      </UiCard>

      <UiCard title="解析结果" :icon="Database" subtitle="智能提取的要素均可回指原文，人工核对或修正后入库">
        <template v-if="phase !== 'done'">
          <ol class="psteps" :class="{ idle: phase === 'edit' }"><li v-for="(s, i) in steps" :key="s" class="pstep" :class="{ done: phase === 'parsing' && i < step, run: phase === 'parsing' && i === step }"><span class="dot"><Check v-if="phase === 'parsing' && i < step" :size="11" :stroke-width="3" /><template v-else>{{ i + 1 }}</template></span>{{ s }}</li></ol>
          <div class="fields ghost" :class="{ shimmer: phase === 'parsing' }">
            <div v-for="k in fieldOrder" :key="k" class="field"><div class="f-head"><span>{{ blankFields[k].label }}</span></div><div class="f-value"><span class="slot" /></div></div>
          </div>
          <div class="grade ghost"><div class="row"><strong>风险初筛</strong><span class="muted">六大纪律标签与风险词，解析后给出</span></div></div>
          <p class="hint"><Sparkles :size="14" />{{ phase === 'parsing' ? '正在逐项抽取，结果出来后可点要素回到原文核对' : form.text.trim() ? '材料已就绪，点击「智能解析」开始' : '选择材料来源载入样例，或直接粘贴原文' }}</p>
        </template>
        <template v-else-if="parsed">
          <div class="fields">
            <div v-for="k in fieldOrder" :key="k" class="field" :class="{ active: active === k, low: !value(k) || (parsed.fields[k].confidence === 'low' && !overrides[k]) }" @click="active = k">
              <div class="f-head"><span>{{ parsed.fields[k].label }}</span><UiTag v-if="overrides[k]" size="sm" tone="green">人工修正</UiTag><UiTag v-else-if="!value(k)" size="sm" tone="orange">未提取</UiTag><UiTag v-else-if="parsed.fields[k].confidence === 'low'" size="sm" tone="orange">需核对</UiTag><UiTag v-else size="sm" tone="ai">智能提取</UiTag></div>
              <div v-if="editing === k" class="f-edit"><input v-model="draft" class="input" :aria-label="`修正${parsed.fields[k].label}`" @keydown.enter="saveEdit" @keydown.esc="editing = null" /><UiButton size="sm" variant="primary" @click.stop="saveEdit">保存</UiButton></div>
              <div v-else class="f-value"><span>{{ value(k) || '原文未明确，可人工补充' }}</span><button class="f-btn" @click.stop="edit(k)"><PencilLine :size="13" />修正</button></div>
            </div>
          </div>
          <div v-if="grading" class="grade">
            <div class="row"><strong>风险初筛</strong><RiskBadge :level="grading.level" /><UiTag v-for="t in grading.tags" :key="t.name" tone="gold" size="sm">{{ t.name }}</UiTag></div>
            <p v-if="grading.risks.length" class="muted">命中风险词：{{ [...new Set(grading.risks.map(r => r.word))].join('、') }}</p>
          </div>
          <div v-if="similar.length" class="similar"><strong><Link2 :size="14" />在库相似线索 {{ similar.length }} 条</strong><button v-for="s in similar" :key="s.c.id" @click="openId = s.c.id"><span class="num">{{ s.c.id }}</span>{{ s.c.parsed.fields.accused.value || s.c.village }} · {{ s.c.parsed.fields.issue.value || '—' }}<em class="num">{{ Math.round(s.sim * 100) }}%</em></button><RouterLink to="/clues/dedupe" class="link">入库后在「重复与多头识别」中人工判定</RouterLink></div>
          <AiNotice />
        </template>
        <template #footer><span class="muted foot-note">入库后自动进入督办台账，按 15 日时限跟踪</span><span class="spacer" /><UiButton variant="primary" :icon="Check" :disabled="phase !== 'done' || !system.can('confirm')" @click="commit">人工确认 · 入库</UiButton></template>
      </UiCard>
    </div>

    <UiCard title="最近登记" flush>
      <template #extra><RouterLink to="/clues/ledger" class="link">查看督办台账</RouterLink></template>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>线索编号</th><th>渠道</th><th>被反映人</th><th>问题类型</th><th>风险分级</th><th>受理日期</th><th>办理节点</th></tr></thead>
        <tbody><tr v-for="c in recent" :key="c.id" :class="{ active: openId === c.id }" style="cursor:pointer" @click="openId = c.id"><td class="num">{{ c.id }}</td><td>{{ c.channel }}</td><td>{{ c.parsed.fields.accused.value || '—' }}</td><td>{{ c.parsed.fields.issue.value || '—' }}</td><td><RiskBadge :level="c.grading.level" /></td><td class="num">{{ c.receivedAt }}</td><td>{{ c.state.invalid ? '无效转办' : c.state.flow.at(-1)?.node }}</td></tr></tbody></table></div>
    </UiCard>
    <ClueDrawer :id="openId" @close="openId = null" />
  </div>
</template>

<style scoped>
.intake-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:stretch}
.intake-grid :deep(.ui-card-body){display:flex;flex-direction:column}
.src-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;padding:4px;margin-bottom:14px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line)}
.source{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:32px;padding:0 6px;white-space:nowrap;border-radius:calc(var(--r-sm) - 2px);color:var(--text-2);font-size:13px;transition:background var(--dur),color var(--dur),box-shadow var(--dur)}
.source:hover:not(:disabled){color:var(--red);background:var(--surface)}
.source.active{background:var(--surface);color:var(--red);font-weight:600;box-shadow:var(--shadow-1),inset 0 0 0 1px var(--red-line)}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.material{flex:1;min-height:260px}
.upload{margin-bottom:10px}
.preview{flex:1;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px 16px;min-height:260px}
.count{font-size:13px}
.psteps{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px}
.pstep{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-3);padding:7px 8px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pstep .dot{width:18px;height:18px;flex:none;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--line-2);display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:11px;font-weight:600}
.pstep.done .dot{color:#fff}
.pstep.run{color:var(--text);border-color:var(--red-line);background:var(--red-25)}
.pstep.run .dot{box-shadow:inset 0 0 0 2px var(--red),0 0 0 4px var(--red-50)}
.pstep.done{color:var(--text-2)}
.pstep.done .dot{background:var(--ok);box-shadow:none}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.field{padding:10px 12px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2);cursor:pointer;transition:border-color var(--dur),background var(--dur);min-width:0}
.field:nth-child(n+5){grid-column:1/-1}
.fields.ghost .field{cursor:default;border-style:dashed;background:transparent}
.fields.ghost .f-head{margin-bottom:8px}
.slot{display:block;height:10px;width:62%;border-radius:5px;background:var(--surface-3)}
.fields.ghost .field:nth-child(2n) .slot{width:44%}
.fields.ghost .field:last-child .slot{width:80%}
.shimmer .slot{background:linear-gradient(90deg,var(--surface-3) 0%,var(--red-50) 50%,var(--surface-3) 100%);background-size:200% 100%;animation:shimmer 1.2s linear infinite}
@keyframes shimmer{to{background-position:-200% 0}}
.grade.ghost{background:transparent;border-style:dashed;border-color:var(--line-2)}
.grade.ghost .muted{font-size:13px}
.hint{display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:12px;font-size:13px;color:var(--text-3)}
.hint svg{color:var(--red)}
.field:hover,.field.active{border-color:var(--gold-line);background:var(--cream)}
.field.low{border-style:dashed;border-color:var(--risk-mid)}
.f-head{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:12px;color:var(--text-3);margin-bottom:3px}
.f-value{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;font-size:14px;line-height:1.6}
.f-btn{display:inline-flex;align-items:center;gap:3px;font-size:12px;color:var(--text-3);flex:none;padding-top:2px}
.f-btn:hover{color:var(--red)}
.f-edit{display:flex;gap:6px}
.grade{margin:14px 0 10px;padding:12px;border-radius:var(--r-sm);background:var(--red-25);border:1px solid var(--red-line)}
.grade .row{flex-wrap:wrap}
.grade strong{font-size:14px}
.grade p{font-size:13px;margin-top:4px}
.similar{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;padding:10px 12px;border-radius:var(--r-sm);background:var(--cream);box-shadow:inset 0 0 0 1px var(--gold-line)}
.similar strong{display:flex;align-items:center;gap:6px;font-size:13px;color:#7A5410}
.similar button{display:flex;gap:8px;align-items:center;text-align:left;font-size:13px;padding:3px 0}
.similar button:hover{color:var(--red)}
.similar em{margin-left:auto;font-style:normal;color:var(--red);font-weight:600}
.link{font-size:13px;color:var(--red)}
.foot-note{font-size:13px}
@media(max-width:1100px){.intake-grid{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.shimmer .slot{animation:none}}
</style>
