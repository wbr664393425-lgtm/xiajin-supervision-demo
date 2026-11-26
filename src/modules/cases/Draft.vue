<script setup lang="ts">
import DocEditor from '@/design/doc/DocEditor.vue'
import { computed, nextTick, ref, watch } from 'vue'
import { FilePen, SpellCheck2, Wand2, Bug, Download, Check } from 'lucide-vue-next'
import { UiCard, UiButton, UiTag, AiNotice, UiEmpty } from '@/design/ui'
import CasePicker from './parts/CasePicker.vue'
import { useCasesStore } from '@/stores/cases'
import { useSystemStore } from '@/stores/system'
import { docTypes, draftDoc, withTypos, checkDoc, type DocType, type DocIssue } from '@/engines/cases'
import { downloadText } from '@/app/download'
import { toast } from '@/app/toast'

const store = useCasesStore(), system = useSystemStore()
const type = ref<DocType>('审查调查报告')
const key = computed(() => `${store.activeId}|${type.value}`)
const text = computed({ get: () => store.drafts[key.value] || '', set: v => { store.drafts[key.value] = v } })
const issues = ref<DocIssue[] | null>(null), editor = ref<HTMLTextAreaElement>(), picked = ref('')
watch(key, () => { issues.value = null })
const kindTone: Record<string, any> = { 法条引用: 'red', 程序时限: 'orange', 表述规范: 'yellow', 前后矛盾: 'red', 要素缺失: 'blue' }
function generate() { text.value = draftDoc(type.value, store.active); issues.value = null; system.log('cases', '生成', `${store.active.id} ${type.value}`, '模板辅助生成文书初稿') }
function typos() { text.value = withTypos(draftDoc(type.value, store.active)); issues.value = null; toast('已载入含常见笔误的示例文书', 'info') }
function check() { issues.value = checkDoc(text.value, type.value); system.log('cases', '生成', `${store.active.id} ${type.value}`, `文书智能校核，发现 ${issues.value.length} 处问题`) }
async function locate(i: DocIssue) { picked.value = i.excerpt.trim(); await nextTick(); const el = editor.value; if (!el) return; el.focus(); el.setSelectionRange(i.start, i.end || i.start); const line = text.value.slice(0, i.start).split('\n').length; el.scrollTop = Math.max(0, (line - 3) * 26) }
function fix(i: DocIssue) { if (i.replacement === undefined) return; text.value = text.value.slice(0, i.start) + i.replacement + text.value.slice(i.end); check() }
function fixAll() { const list = (issues.value || []).filter(i => i.replacement !== undefined).sort((a, b) => b.start - a.start); let t = text.value; for (const i of list) t = t.slice(0, i.start) + i.replacement + t.slice(i.end); text.value = t; check(); toast(`已应用 ${list.length} 处修正建议，请人工复核`) }
function exportTxt() { downloadText(`${store.active.id}_${type.value}.txt`, text.value); system.log('cases', '导出', `${store.active.id} ${type.value}`, '文本导出') }
</script>
<template>
  <div class="page">
    <CasePicker />
    <div class="draft-grid">
      <UiCard :icon="FilePen" title="文书模板" flush>
        <ul class="types"><li v-for="t in docTypes" :key="t"><button :class="{ on: type === t }" @click="type = t"><span>{{ t }}</span><Check v-if="store.drafts[`${store.activeId}|${t}`]" :size="14" /></button></li></ul>
      </UiCard>
      <UiCard :title="`${type} · ${store.active.accused}`" subtitle="模板生成初稿，可直接编辑">
        <template #extra><UiButton size="sm" variant="ghost" :icon="Bug" @click="typos">载入含笔误示例</UiButton><UiButton size="sm" variant="secondary" :icon="Wand2" @click="generate">{{ text ? '重新生成' : '生成初稿' }}</UiButton><UiButton size="sm" :icon="Download" :disabled="!text" @click="exportTxt">导出</UiButton></template>
        <UiEmpty v-if="!text" :icon="FilePen" title="尚未生成" text="点击「生成初稿」按案卷要素填充模板。" />
        <DocEditor v-else v-model="text" :rows="20" org="夏津县纪委监委" :highlight="picked" />
        <AiNotice text="初稿由模板与案卷要素生成，量纪与定性由审理部门集体研究确定，系统不提供条款编号。" />
      </UiCard>
      <UiCard :icon="SpellCheck2" title="智能校核" :subtitle="issues ? `发现 ${issues.length} 处` : '法条引用 · 程序时限 · 表述规范 · 前后矛盾'">
        <template #extra><UiButton size="sm" variant="primary" :disabled="!text" @click="check">校核</UiButton></template>
        <UiEmpty v-if="!issues" title="点击「校核」" />
        <UiEmpty v-else-if="!issues.length" :icon="Check" title="未发现问题" text="仍需人工通读复核。" />
        <template v-else>
          <ul class="issues"><li v-for="i in issues" :key="i.id" @click="locate(i)"><div class="ih"><UiTag size="sm" :tone="kindTone[i.kind]">{{ i.kind }}</UiTag><strong>{{ i.title }}</strong></div><p v-if="i.excerpt" class="ex">“{{ i.excerpt.trim() }}”</p><p class="sg">{{ i.suggestion }}</p><button v-if="i.replacement !== undefined" class="fix" @click.stop="fix(i)">{{ i.replacement ? `改为“${i.replacement}”` : '删除该表述' }}</button></li></ul>
          <UiButton block variant="soft" :disabled="!issues.some(i => i.replacement !== undefined)" @click="fixAll">一键应用全部修正建议</UiButton>
        </template>
      </UiCard>
    </div>
  </div>
</template>
<style scoped>
.draft-grid{display:grid;grid-template-columns:180px minmax(0,1fr) 340px;gap:16px;align-items:start}
.types button{width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--line);font-size:14px;text-align:left}
.types button.on{background:var(--red-25);color:var(--red);font-weight:600;box-shadow:inset 3px 0 0 var(--red)}
.types button svg{color:var(--ok)}
.doc{font-family:var(--font-serif);font-size:15px;line-height:1.75;margin-bottom:10px}
.issues{display:flex;flex-direction:column;gap:8px;margin-bottom:10px;max-height:56vh;overflow:auto}
.issues li{padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface-2);cursor:pointer}
.issues li:hover{border-color:var(--red-line)}
.ih{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ih strong{font-size:13px}
.ex{font-size:12px;color:var(--red-700);margin-top:4px;font-family:var(--font-serif)}
.sg{font-size:12px;color:var(--text-2);margin-top:2px}
.fix{margin-top:6px;font-size:12px;color:var(--red);border:1px solid var(--red-line);border-radius:6px;padding:2px 8px;background:var(--surface)}
@media(max-width:1300px){.draft-grid{grid-template-columns:1fr}}
</style>
