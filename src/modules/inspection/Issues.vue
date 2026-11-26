<script setup lang="ts">
import DocEditor from '@/design/doc/DocEditor.vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Layers, FileText, Download, Printer, RefreshCw, ScanSearch } from 'lucide-vue-next'
import { UiCard, UiTag, RiskBadge, UiButton, UiEmpty, AiNotice } from '@/design/ui'
import { useInspectionStore } from '@/stores/inspection'
import { useSystemStore } from '@/stores/system'
import { downloadText, printHtml } from '@/app/download'
import { toast } from '@/app/toast'
import { reportDraft } from '@/engines/inspection'

const insp = useInspectionStore(), system = useSystemStore(), router = useRouter()
const cats = ['主体责任落实', '形式主义', '三资管理', '惠民政策']
const byCat = computed(() => cats.map(c => ({ c, groups: insp.groups.filter(g => g.category === c) })))
const merged = computed(() => insp.kept.length - insp.groups.length)
// 已有阅卷结果时直接展示报告初稿，按钮用于按最新归类重新生成
if (!insp.draft && insp.groups.length) insp.draft = reportDraft(insp.groups, insp.target.name, insp.target.team)
function exportTxt() { downloadText('巡察报告初稿.txt', insp.draft); system.log('inspection', '导出', '巡察报告初稿', '文本导出'); toast('已导出') }
function print() { printHtml('巡察报告初稿', `<pre>${insp.draft.replace(/</g, '&lt;')}</pre>`); system.log('inspection', '导出', '巡察报告初稿', '打印 / 另存为电子文档') }
</script>
<template>
  <div class="page">
    <UiEmpty v-if="!insp.findings.length" :icon="ScanSearch" title="尚未阅卷" text="请先在「台账批量阅卷」中导入材料并完成阅卷，疑点会在这里自动归类、去重。"><UiButton variant="primary" @click="router.push('/inspection/reading')">去阅卷</UiButton></UiEmpty>
    <template v-else>
      <div class="sum"><Layers :size="18" /><span>阅卷疑点 <b class="num">{{ insp.kept.length }}</b> 处 → 归类去重为 <b class="num">{{ insp.groups.length }}</b> 个问题（合并 {{ merged }} 处同类重复）</span></div>
      <div class="board">
        <section v-for="col in byCat" :key="col.c" class="col">
          <header><strong>{{ col.c }}</strong><span class="num">{{ col.groups.length }}</span></header>
          <UiEmpty v-if="!col.groups.length" title="暂无" />
          <article v-for="g in col.groups" :key="g.key" class="issue">
            <div class="ih"><RiskBadge :level="g.level" /><UiTag size="sm" tone="gold">{{ g.rule }}</UiTag><UiTag v-if="g.findings.length > 1" size="sm" tone="blue">合并 {{ g.findings.length }} 处</UiTag></div>
            <p>{{ g.summary }}</p>
            <div class="refs"><RouterLink v-for="f in g.findings" :key="f.id" :to="`/inspection/reading?id=${f.docId}`" class="num">{{ f.docId }}</RouterLink></div>
          </article>
        </section>
      </div>
      <UiCard :icon="FileText" title="巡察报告初稿" subtitle="按问题大类自动组织，可直接编辑">
        <template #extra><UiButton size="sm" variant="secondary" :icon="RefreshCw" @click="insp.genDraft()">{{ insp.draft ? '按最新归类重新生成' : '生成报告初稿' }}</UiButton><UiButton size="sm" :icon="Printer" :disabled="!insp.draft" @click="print">打印</UiButton><UiButton size="sm" variant="primary" :icon="Download" :disabled="!insp.draft" @click="exportTxt">导出</UiButton></template>
        <DocEditor v-if="insp.draft" v-model="insp.draft" org="县委第二巡察组" />
        <UiEmpty v-else :icon="FileText" title="点击右上角生成报告初稿" />
        <AiNotice text="报告初稿仅依据纸面疑点生成，正式报告须经巡察组核实、集体研究。" />
      </UiCard>
    </template>
  </div>
</template>
<style scoped>
.sum{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:var(--r-md);background:var(--cream);box-shadow:inset 0 0 0 1px var(--gold-line);color:#6E4E12;font-size:14px}
.sum b{color:var(--red);font-size:17px}
.board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:start}
.col{background:var(--surface-3);border-radius:var(--r-md);padding:10px}
.col header{display:flex;justify-content:space-between;align-items:center;padding:2px 4px 10px}
.col header strong{font-size:14px}
.col header span{font-size:12px;background:var(--surface);border-radius:9px;padding:0 7px}
.issue{background:var(--surface);border-radius:10px;padding:12px;margin-bottom:8px;box-shadow:var(--shadow-1);animation:rise var(--dur) var(--ease) both}
.ih{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
.issue p{font-size:13px;line-height:1.7;color:var(--text-2)}
.refs{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.refs a{font-size:12px;color:var(--red)}
.draft{font-family:var(--font-serif);font-size:14px;margin-bottom:10px}
@media(max-width:1200px){.board{grid-template-columns:repeat(2,1fr)}}
</style>
