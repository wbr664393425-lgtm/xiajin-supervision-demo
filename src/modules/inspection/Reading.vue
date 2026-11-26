<script setup lang="ts">
import OfficialDoc from '@/design/doc/OfficialDoc.vue'
import { computed, ref, watch } from 'vue'
import { FileStack, ScanSearch, Check, X, Undo2, FileText, Gavel, Users, Receipt, Megaphone, BookOpen } from 'lucide-vue-next'
import { UiCard, UiButton, UiTag, RiskBadge, UiUpload, UiEmpty, AiNotice } from '@/design/ui'
import { useInspectionStore } from '@/stores/inspection'
import { useSystemStore } from '@/stores/system'
import { useRecordQuery } from '@/app/useRecordQuery'
import { readRules } from '@/engines/inspection'
import { townName } from '@/mock/geo'
import { toast } from '@/app/toast'

const insp = useInspectionStore(), system = useSystemStore()
const docId = useRecordQuery()
const running = ref(false), progress = ref(0), active = ref('')
function orgOf(target: string, town: string) {
  if (target.endsWith('党委')) return `中共${townName(town)}委员会`
  if (target.endsWith('村')) return `${townName(town)}${target}村民委员会`
  return target
}
const cnDate = (d: string) => d.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, dd) => `${y}年${Number(m)}月${Number(dd)}日`)
const kindIcon: Record<string, any> = { 会议记录: BookOpen, 三重一大: Gavel, 党建材料: Users, 财务凭证: Receipt, 公示记录: Megaphone }
const queued = computed(() => insp.batch.filter(id => !insp.readIds.includes(id)))
const doc = computed(() => insp.docs.find(d => d.id === (docId.value || insp.readIds[0] || insp.docs[0]?.id)))
const docFindings = computed(() => insp.findings.filter(f => f.docId === doc.value?.id))
const spans = computed(() => docFindings.value.map(f => ({ start: f.start, end: f.end, tag: insp.decisions[f.id] === 'dismissed' ? 'match' : 'risk', key: f.id })))
const ruleCounts = computed(() => readRules.map(r => ({ r, n: insp.findings.filter(f => f.rule === r).length })))
watch(docId, () => { active.value = '' })
function toggle(id: string) { insp.batch = insp.batch.includes(id) ? insp.batch.filter(x => x !== id) : [...insp.batch, id] }
async function run() {
  const ids = [...queued.value]; if (!ids.length) return
  running.value = true
  for (progress.value = 0; progress.value < ids.length; progress.value++) await new Promise(r => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280))
  insp.markRead(ids); running.value = false; docId.value = ids[0]!
  toast(`阅卷完成：${ids.length} 份材料，检出 ${insp.findings.filter(f => ids.includes(f.docId)).length} 处疑点`)
}
async function onFiles(files: File[]) { for (const f of files) { if (!/\.txt$/i.test(f.name)) { toast(`${f.name} 不是 TXT 文本，请选用台账库中的扫描件材料`, 'warn'); continue } insp.upload(f.name, (await f.text()).slice(0, 6000)) } }
</script>
<template>
  <div class="page">
    <div class="rules">
      <div v-for="r in ruleCounts" :key="r.r" class="rule" :class="{ hit: r.n }"><strong class="num">{{ r.n }}</strong><span>{{ r.r }}</span></div>
    </div>
    <div class="read-grid">
      <UiCard :icon="FileStack" title="巡察台账" :subtitle="`${insp.target.name} · ${insp.target.team}`" flush>
        <ul class="shelf">
          <li v-for="d in insp.docs" :key="d.id" :class="{ on: doc?.id === d.id }">
            <input type="checkbox" :checked="insp.batch.includes(d.id)" :disabled="insp.readIds.includes(d.id)" :aria-label="`加入阅卷：${d.title}`" @change="toggle(d.id)" />
            <button @click="docId = d.id"><span class="ic"><component :is="kindIcon[d.kind] || FileText" :size="16" /></span><div><strong>{{ d.title }}</strong><small>{{ d.kind }} · {{ d.date }}</small></div>
              <UiTag v-if="insp.readIds.includes(d.id)" size="sm" :tone="insp.findings.some(f => f.docId === d.id) ? 'red' : 'green'">{{ insp.findings.filter(f => f.docId === d.id).length }} 处</UiTag><UiTag v-else size="sm" tone="gray">待阅</UiTag></button>
          </li>
        </ul>
        <div class="shelf-foot"><UiUpload accept=".txt" multiple hint="可追加 文本台账" @files="onFiles" /></div>
        <template #footer><span class="muted note">已选 {{ queued.length }} 份待阅</span><span class="spacer" /><UiButton variant="primary" :icon="ScanSearch" :loading="running" :disabled="!queued.length" @click="run">{{ running ? `阅卷中 ${progress + 1}/${queued.length}` : '批量智能阅卷' }}</UiButton></template>
      </UiCard>
      <UiCard v-if="doc" :title="doc.title" :subtitle="`${doc.target} · ${doc.kind} · ${doc.date}`">
        <template #extra><UiTag v-if="!insp.readIds.includes(doc.id)" tone="gray">尚未阅卷</UiTag><UiTag v-else tone="ai">智能已阅 · {{ docFindings.length }} 处疑点</UiTag></template>
        <OfficialDoc class="doc" :text="doc.text" :title="doc.title" :kind="doc.kind" :org="orgOf(doc.target, doc.town)" :doc-no="`巡察调阅材料 · ${doc.id}`" :date="cnDate(doc.date)" :spans="spans" :active="active" compact @pick="active = $event" />
        <UiEmpty v-if="insp.readIds.includes(doc.id) && !docFindings.length" :icon="Check" title="未检出程序疑点" />
        <ul class="findings">
          <li v-for="f in docFindings" :key="f.id" :class="{ on: active === f.id, dismissed: insp.decisions[f.id] === 'dismissed' }" @click="active = f.id">
            <div class="fh"><RiskBadge :level="f.level" /><UiTag size="sm" tone="gold">{{ f.rule }}</UiTag><UiTag size="sm" tone="blue">{{ f.category }}</UiTag><span class="spacer" />
              <template v-if="system.can('confirm')"><UiTag v-if="insp.decisions[f.id] === 'confirmed'" size="sm" tone="green" :icon="Check">已纳入问题清单</UiTag><button v-if="insp.decisions[f.id]" class="mini" @click.stop="insp.undo(f.id)"><Undo2 :size="13" />撤销</button><template v-else><button class="mini" @click.stop="insp.decide(f.id, 'dismissed')"><X :size="13" />排除</button><button class="mini ok" @click.stop="insp.decide(f.id, 'confirmed')"><Check :size="13" />确认</button></template></template>
            </div>
            <strong>{{ f.title }}</strong><p>{{ f.basis }}</p>
          </li>
        </ul>
        <AiNotice text="阅卷结果为纸面疑点，需巡察组调阅原件、谈话核实。" />
      </UiCard>
    </div>
  </div>
</template>
<style scoped>
.rules{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.rule{padding:10px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-1)}
.rule strong{display:block;font-size:22px;line-height:1.1;color:var(--text-4)}
.rule.hit strong{color:var(--red)}
.rule span{font-size:12px;color:var(--text-2)}
.read-grid{display:grid;grid-template-columns:360px minmax(0,1fr);gap:16px;align-items:start}
.shelf li{display:flex;align-items:center;gap:8px;padding:0 12px 0 16px;border-bottom:1px solid var(--line);transition:background var(--dur)}
.shelf li.on{background:var(--red-25);box-shadow:inset 3px 0 0 var(--red)}
.shelf button{flex:1;display:flex;align-items:center;gap:10px;padding:11px 0;text-align:left;min-width:0}
.shelf .ic{width:30px;height:30px;border-radius:8px;background:var(--cream);color:var(--gold);display:flex;align-items:center;justify-content:center;flex:none}
.shelf button div{flex:1;min-width:0}
.shelf strong{display:block;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.shelf small{font-size:12px;color:var(--text-3)}
.shelf-foot{padding:12px 16px}
input[type=checkbox]{accent-color:var(--red);width:15px;height:15px}
.note{font-size:13px}
.doc{margin-bottom:14px}
.findings{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.findings li{padding:12px 14px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2);cursor:pointer;transition:border-color var(--dur)}
.findings li.on{border-color:var(--red-line);background:var(--red-25)}
.findings li.dismissed{opacity:.5}
.fh{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px}
.findings strong{font-size:14px}
.findings p{font-size:13px;color:var(--text-2)}
.mini{display:inline-flex;align-items:center;gap:3px;height:26px;padding:0 9px;border-radius:6px;font-size:12px;border:1px solid var(--line-2);background:var(--surface)}
.mini:hover{border-color:var(--red-line);color:var(--red)}
.mini.ok{background:var(--red);color:#fff;border-color:var(--red)}
@media(max-width:1200px){.read-grid{grid-template-columns:1fr}.rules{grid-template-columns:repeat(4,1fr)}}
</style>
