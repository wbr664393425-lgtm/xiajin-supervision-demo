<script setup lang="ts">
import DocEditor from '@/design/doc/DocEditor.vue'
import { computed, ref } from 'vue'
import { Tags, ShieldAlert, FileSignature, Download } from 'lucide-vue-next'
import { UiCard, UiTag, UiButton, UiModal, AiNotice, UiSelect } from '@/design/ui'
import { useArchiveStore } from '@/stores/outreach'
import { useSystemStore } from '@/stores/system'
import { integrityOpinion } from '@/engines/outreach'
import { downloadText } from '@/app/download'
import { toast } from '@/app/toast'

const store = useArchiveStore(), system = useSystemStore()
const filter = ref(''), open = ref(false), pick = ref(''), post = ref(''), text = ref('')
const sources = ['信访', '巡察', '资金关联', '谈话函询', '处分', '审计', '个人事项', '综合']
const rows = computed(() => store.list.filter(c => !filter.value || c.tags.some(t => t.source === filter.value && t.tone !== 'green')))
function start(id: string) { pick.value = id; post.value = ''; text.value = ''; open.value = true }
function gen() { const c = store.list.find(x => x.id === pick.value)!; text.value = integrityOpinion(c, c.tags, post.value); system.log('archive', '生成', c.id, `任前廉政审核辅助材料：拟任${post.value || '（未填）'}`) }
function save() { const c = store.list.find(x => x.id === pick.value)!; store.addOpinion(c.name, post.value, text.value); downloadText(`${c.name}_廉政意见辅助材料.txt`, text.value); system.log('archive', '导出', c.id, '导出廉政意见辅助材料'); open.value = false; toast('已生成并导出辅助材料') }
</script>
<template>
  <div class="page">
    <div class="redline"><ShieldAlert :size="18" /><span><b>红线：</b>以下均为客观数据标签，不构成廉政风险评价；任前廉政意见由人研判出具。</span></div>
    <UiCard :icon="Tags" title="客观动态标签" subtitle="信访频次、巡察问题、资金关联等，随源数据动态更新" flush>
      <template #extra><UiSelect v-model="filter" size="sm" class="w180" label="按来源筛选" :options="[{ value: '', label: '全部干部' }, ...sources.map(s => ({ value: s, label: `有「${s}」标签` }))]" /></template>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th style="width:84px;white-space:nowrap">干部</th><th style="width:150px">单位 / 职务</th><th>客观标签</th><th style="width:150px">任前审核</th></tr></thead>
        <tbody><tr v-for="c in rows" :key="c.id"><td><RouterLink :to="`/archive/records?id=${c.id}`" class="link" style="white-space:nowrap">{{ c.name }}</RouterLink></td><td>{{ c.unit }}<div class="muted sub">{{ c.title }}</div></td><td><div class="chips"><UiTag v-for="t in c.tags" :key="t.key" size="sm" :tone="t.tone">{{ t.label }}</UiTag></div></td><td><UiButton size="sm" variant="secondary" :icon="FileSignature" @click="start(c.id)">生成辅助材料</UiButton></td></tr></tbody>
      </table></div>
    </UiCard>
    <div v-if="store.opinions.length"><UiCard title="已出具的辅助材料" flush><div class="tbl-wrap"><table class="tbl"><thead><tr><th>编号</th><th>干部</th><th>拟任职务</th><th>时间</th></tr></thead><tbody><tr v-for="o in store.opinions" :key="o.id"><td class="num">{{ o.id }}</td><td>{{ o.cadre }}</td><td>{{ o.post || '—' }}</td><td class="num">{{ o.time }}</td></tr></tbody></table></div></UiCard></div>
    <AiNotice text="标签只陈述可核验的客观事实，用于任前廉政审核与廉政意见出具辅助。" />
    <UiModal v-model="open" title="任前廉政审核 · 辅助材料" :width="720">
      <label class="label" for="post">拟任职务</label>
      <div class="row"><input id="post" v-model="post" class="input" placeholder="例如：乡镇G农业综合服务站站长" /><UiButton variant="secondary" @click="gen">生成</UiButton></div>
      <DocEditor v-if="text" v-model="text" class="op" />
      <template #footer><UiButton @click="open = false">取消</UiButton><UiButton variant="primary" :icon="Download" :disabled="!text" @click="save">保存并导出</UiButton></template>
    </UiModal>
  </div>
</template>
<style scoped>
.redline{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:var(--r-md);background:var(--red-50);color:var(--red-700);font-size:14px;border:1px solid var(--red-line)}
.mini{height:30px;padding:0 8px;font-size:13px;width:auto}
.link{color:var(--red);font-weight:600}
.sub{font-size:12px}
.chips{display:flex;flex-wrap:wrap;gap:4px}
.op{margin-top:12px;font-family:var(--font-serif);font-size:14px}
</style>
