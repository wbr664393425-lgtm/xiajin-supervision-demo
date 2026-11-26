<script setup lang="ts">
import DocEditor from '@/design/doc/DocEditor.vue'
import { ref } from 'vue'
import { Megaphone, BookMarked, Microscope, Clapperboard, Image, Sparkles, Download, History } from 'lucide-vue-next'
import { UiCard, UiButton, UiTag, AiNotice, UiEmpty } from '@/design/ui'
import { useOutreachStore } from '@/stores/outreach'
import { useSystemStore } from '@/stores/system'
import { materialTypes, educationCases } from '@/mock/outreach'
import { generateMaterial } from '@/engines/outreach'
import { downloadText } from '@/app/download'
import { nowText } from '@/stores/persist'
import { useAssistantStore } from '@/stores/assistant'
import { streamChat } from '@/app/llm'
import { MATERIAL_SYSTEM, materialPrompt, stripMarkdown } from '@/engines/prompts'

const store = useOutreachStore(), system = useSystemStore(), assistant = useAssistantStore()
const icons = [Megaphone, BookMarked, Microscope, Clapperboard, Image]
const type = ref<string>(materialTypes[0]), picked = ref<string[]>(['JY-01', 'JY-02']), theme = ref(''), audience = ref('全县村（社区）“两委”干部')
const text = ref(''), busy = ref(false)
async function gen() {
  busy.value = true
  const cases = educationCases.filter(c => picked.value.includes(c.id))
  const local = generateMaterial(type.value, cases, theme.value, audience.value)
  let engine = '离线引擎'
  // 优先由纪检大模型逐段写出，版式预览实时刷新；不可用时回退本地模板
  if (assistant.engine === 'deepseek' && assistant.configured && assistant.status !== 'offline') {
    text.value = ''
    try { for await (const c of streamChat([{ role: 'system', content: MATERIAL_SYSTEM }, { role: 'user', content: materialPrompt(type.value, cases, theme.value, audience.value) }], { maxTokens: 2000 })) if (c.type === 'content') text.value = stripMarkdown(text.value + c.text) } catch (e) { console.warn('[AI] 大模型不可用，已切换离线引擎：', e) }
    if (text.value.trim()) { engine = '纪检大模型'; assistant.status = 'online' } else assistant.status = 'offline'
  }
  if (engine === '离线引擎') { await new Promise(r => setTimeout(r, 700)); text.value = local }
  store.generated.unshift({ id: `SC-${Date.now().toString(36).toUpperCase()}`, type: type.value, title: `${type.value}（${picked.value.length} 个案例）`, time: nowText(), text: text.value })
  busy.value = false; system.log('archive', '生成', type.value, `${engine}结合 ${picked.value.length} 个本地案例生成廉政素材初稿`)
}
function exp() { downloadText(`${type.value}.txt`, text.value); system.log('archive', '导出', type.value, '文本导出') }
</script>
<template>
  <div class="page">
    <div class="types"><button v-for="(t, i) in materialTypes" :key="t" :class="{ on: type === t }" @click="type = t"><component :is="icons[i]" :size="20" /><span>{{ t }}</span></button></div>
    <div class="mt-grid">
      <UiCard title="选择本地案例与主题" subtitle="本地已办结典型案例">
        <ul class="cases"><li v-for="c in educationCases" :key="c.id"><label><input v-model="picked" type="checkbox" :value="c.id" /><div><strong>{{ c.title }}</strong><small>{{ c.lesson }}</small></div><UiTag size="sm" tone="gold">{{ c.area }}</UiTag></label></li></ul>
        <label class="label mt" for="theme">主题</label><input id="theme" v-model="theme" class="input" placeholder="守纪律 讲规矩 筑牢廉洁防线" />
        <label class="label mt" for="aud">受众</label><input id="aud" v-model="audience" class="input" />
        <UiButton class="mt" variant="primary" block :icon="Sparkles" :loading="busy" :disabled="!picked.length" @click="gen">生成{{ type }}</UiButton>
      </UiCard>
      <UiCard :title="`${type} · 初稿`" subtitle="可直接编辑后导出">
        <template #extra><UiButton size="sm" :icon="Download" :disabled="!text" @click="exp">导出</UiButton></template>
        <DocEditor v-if="text" v-model="text" :red-head="type === '警示教育通报' ? '中共夏津县纪律检查委员会' : undefined" :org="type === '警示教育通报' ? '中共夏津县纪律检查委员会' : undefined" />
        <UiEmpty v-else :icon="Sparkles" :title="busy ? '正在撰写初稿…' : '选择案例后点击生成'" />
        <AiNotice text="智能初稿，人工审核。宣传素材须经审核后发布，不得使用真实人物形象或未经核实的案情。" />
      </UiCard>
    </div>
    <UiCard v-if="store.generated.length" :icon="History" title="生成记录" flush><div class="tbl-wrap"><table class="tbl"><thead><tr><th>编号</th><th>类型</th><th>标题</th><th>时间</th><th></th></tr></thead><tbody><tr v-for="g in store.generated.slice(0, 8)" :key="g.id"><td class="num">{{ g.id }}</td><td>{{ g.type }}</td><td>{{ g.title }}</td><td class="num">{{ g.time }}</td><td><button class="link" @click="type = g.type; text = g.text">打开</button></td></tr></tbody></table></div></UiCard>
  </div>
</template>
<style scoped>
.types{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.types button{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 10px;border-radius:var(--r-md);background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-1);font-size:14px;color:var(--text-2);transition:all var(--dur)}
.types button:hover{border-color:var(--red-line);color:var(--red)}
.types button.on{background:linear-gradient(160deg,var(--red),var(--red-700));color:#FFF3DA;border-color:transparent;box-shadow:var(--shadow-red);font-weight:600}
.mt-grid{display:grid;grid-template-columns:380px minmax(0,1fr);gap:16px;align-items:start}
.cases{display:flex;flex-direction:column;gap:6px}
.cases label{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface-2);cursor:pointer}
.cases label:has(input:checked){border-color:var(--red-line);background:var(--red-25)}
.cases div{flex:1;min-width:0}
.cases strong{display:block;font-size:14px}
.cases small{font-size:12px;color:var(--text-3)}
input[type=checkbox]{accent-color:var(--red);width:15px;height:15px}
.mt{margin-top:12px}
.out{font-family:var(--font-serif);font-size:14px;margin-bottom:10px}
.link{color:var(--red);font-size:13px}
@media(max-width:1100px){.mt-grid{grid-template-columns:1fr}.types{grid-template-columns:repeat(3,1fr)}}
</style>
