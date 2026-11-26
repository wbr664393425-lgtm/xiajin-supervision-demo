<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Sparkles, Link2, ArrowUpRight, PlusCircle, Wand2 } from 'lucide-vue-next'
import { UiModal, UiButton, UiSelect, UiTag, RiskBadge, AiNotice } from '@/design/ui'
import { mediaSources, simulationSamples, type MediaSourceId } from '@/mock/opinion'
import { towns } from '@/mock/geo'
import { useOpinionStore } from '@/stores/opinion'
import { highlightSegments, type SimulatedAnalysis } from '@/engines/opinion'
import { toast } from '@/app/toast'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; ingested: [postId: string] }>()

const router = useRouter()
const store = useOpinionStore()

const title = ref('')
const content = ref('')
const sourceId = ref<MediaSourceId>('wenzheng_sd')
const town = ref('qingyuan')
const village = ref('清源村')
const result = ref<SimulatedAnalysis | null>(null)

const sourceOptions = mediaSources.map(s => ({ value: s.id, label: `${s.short}（${s.tier}）` }))
const townOptions = towns.map(t => ({ value: t.id, label: `${t.name}（${t.villages.join('、')}）` }))
const villageOptions = computed(() => {
  const t = towns.find(x => x.id === town.value)
  return (t?.villages || []).map(v => ({ value: v, label: v }))
})

function onTownChange(nextTown: string) {
  town.value = nextTown
  const t = towns.find(x => x.id === nextTown)
  village.value = t?.villages[0] || ''
}

function fillSample(idx: number) {
  const s = simulationSamples[idx]
  if (!s) return
  title.value = s.title
  content.value = s.content
  sourceId.value = s.sourceId
  town.value = s.town
  village.value = s.village
  runAnalyze()
}

function runAnalyze() {
  if (!title.value.trim() || !content.value.trim()) return
  result.value = store.simulatePost({
    title: title.value,
    content: content.value,
    sourceId: sourceId.value,
    town: town.value,
    village: village.value,
  })
}

function ingest() {
  if (!result.value) return
  const { postId } = store.ingestSimulatedPost({
    title: title.value,
    content: content.value,
    sourceId: sourceId.value,
    town: town.value,
    village: village.value,
  })
  toast('已纳入舆情监测池并更新统计与关联', 'ok')
  emit('ingested', postId)
  emit('update:modelValue', false)
}

function go(to: string) {
  emit('update:modelValue', false)
  void router.push(to)
}
</script>

<template>
  <UiModal :model-value="modelValue" title="现场模拟网帖实时研判" :width="720" @update:model-value="emit('update:modelValue', $event)">
    <div class="sim-wrap">
      <div class="sim-samples">
        <span>一键填入演示样帖：</span>
        <button v-for="(s, i) in simulationSamples" :key="s.id" type="button" class="sample-btn" :title="s.hint" @click="fillSample(i)">
          <Wand2 :size="13" />{{ s.label }}
        </button>
      </div>

      <div class="sim-row3">
        <div><label class="label">公开渠道</label><UiSelect v-model="sourceId" :options="sourceOptions" size="sm" /></div>
        <div><label class="label">属地标注</label><UiSelect :model-value="town" :options="townOptions" size="sm" @update:model-value="onTownChange" /></div>
        <div><label class="label">关联村居</label><UiSelect v-model="village" :options="villageOptions" size="sm" /></div>
      </div>

      <div>
        <label class="label">模拟网帖标题</label>
        <input v-model="title" class="input" placeholder="输入或粘贴一条群众公开网帖/留言标题" />
      </div>
      <div>
        <label class="label">模拟网帖正文</label>
        <textarea v-model="content" class="textarea" rows="3" placeholder="输入正文内容，点击下方“立即研判”实时验证词包命中、受理边界识别与主站全库实体碰撞" />
      </div>

      <div class="sim-actions">
        <UiButton variant="primary" :icon="Sparkles" :disabled="!title.trim() || !content.trim()" @click="runAnalyze">
          立即本地实时研判
        </UiButton>
        <span class="sim-note">前端确定性规则引擎毫秒级计算 · 断网可用 · 零数据外发</span>
      </div>

      <section v-if="result" class="sim-res">
        <header class="sr-head">
          <div class="sr-tags">
            <RiskBadge v-if="result.level !== 'info'" :level="result.level" />
            <UiTag v-else tone="gray">日常参考</UiTag>
            <UiTag tone="ai">{{ result.acceptance }}</UiTag>
            <UiTag tone="gold">{{ result.category }}</UiTag>
          </div>
          <UiButton size="sm" variant="soft" :icon="PlusCircle" @click="ingest">纳入监测池</UiButton>
        </header>

        <p class="sr-reason">{{ result.aiReason }}</p>

        <div class="sr-hl serif">
          <template v-for="(seg, i) in highlightSegments(result.content, result.matchedWords)" :key="i">
            <mark v-if="seg.hit">{{ seg.text }}</mark>
            <template v-else>{{ seg.text }}</template>
          </template>
        </div>

        <div class="sr-cross">
          <strong><Link2 :size="14" />主站实时跨库碰撞（命中 <span class="num">{{ result.crossMatches.length }}</span> 项）</strong>
          <ul v-if="result.crossMatches.length">
            <li v-for="m in result.crossMatches" :key="`${m.sourceType}-${m.id}`" @click="go(m.to)">
              <UiTag tone="red" size="sm">{{ m.sourceType }}</UiTag>
              <span>{{ m.title }} · {{ m.matchedBy }}</span>
              <ArrowUpRight :size="13" />
            </li>
          </ul>
          <small v-else>未碰撞到在库信访线索、监督疑点或巡察记录。</small>
        </div>
      </section>

      <AiNotice text="现场研判用于演示语义匹配、受理边界初筛与跨库碰撞逻辑；结果仅供人工核验，不作为正式依据。" />
    </div>

    <template #footer>
      <UiButton @click="emit('update:modelValue', false)">关闭</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.sim-wrap{display:flex;flex-direction:column;gap:10px}
.sim-samples{display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:12.5px;color:var(--text-3)}
.sample-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:7px;border:1px solid var(--red-line);background:var(--red-25);color:var(--red);font-size:12.5px;font-weight:500}
.sample-btn:hover{background:var(--red-50)}
.sim-row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.sim-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.sim-note{font-size:12px;color:var(--text-3)}

.sim-res{background:var(--surface-2);border:1px solid var(--line-2);border-radius:var(--r-md);padding:14px;display:flex;flex-direction:column;gap:10px}
.sr-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.sr-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.sr-reason{font-size:13.5px;line-height:1.65;color:var(--text)}
.sr-hl{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:10px 12px;font-size:13.5px;line-height:1.75;color:var(--text-2)}
.sr-hl mark{background:var(--gold-soft);color:var(--accent-ink-2);padding:0 3px;border-radius:3px;font-weight:600}
.sr-cross strong{display:flex;align-items:center;gap:5px;font-size:13px;color:var(--text);margin-bottom:6px}
.sr-cross ul{display:flex;flex-direction:column;gap:5px}
.sr-cross li{display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--surface);border:1px solid var(--line);border-radius:7px;font-size:12.5px;cursor:pointer}
.sr-cross li:hover{border-color:var(--red-line);color:var(--red)}
.sr-cross li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sr-cross small{font-size:12px;color:var(--text-3)}
@media(max-width:640px){.sim-row3{grid-template-columns:1fr}}
</style>
