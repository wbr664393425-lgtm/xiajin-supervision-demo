<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { UiModal, UiButton, UiSelect } from '@/design/ui'
import { useOpinionStore } from '@/stores/opinion'
import { toast } from '@/app/toast'
import type { RiskLevel } from '@/types'

const props = defineProps<{ modelValue: boolean; topicId: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const store = useOpinionStore()
const topic = computed(() => props.topicId ? store.topicById(props.topicId) : undefined)

const tab = ref<'edit' | 'merge'>('edit')
const title = ref('')
const level = ref<RiskLevel | 'info'>('mid')
const targetTopicId = ref('')
const reason = ref('')

const mergeTargets = computed(() =>
  store.activeTopics
    .filter(t => t.id !== topic.value?.id)
    .map(t => ({ value: t.id, label: `${t.title}（${t.townName} · ${t.postCount}条）` })),
)

watch(() => [props.modelValue, props.topicId], () => {
  if (!topic.value || !props.modelValue) return
  tab.value = 'edit'
  title.value = topic.value.title
  level.value = topic.value.level
  targetTopicId.value = mergeTargets.value[0]?.value || ''
  reason.value = ''
})

function submit() {
  if (!topic.value || !reason.value.trim()) return
  if (tab.value === 'edit') {
    store.editTopic(topic.value.id, { title: title.value, level: level.value, reason: reason.value })
    toast('已保存话题人工纠偏，并写入审计日志', 'ok')
  } else if (targetTopicId.value) {
    store.mergeTopicInto(topic.value.id, targetTopicId.value, reason.value)
    toast('已人工合并至目标话题，相关公开帖文已自动归集', 'ok')
  }
  emit('update:modelValue', false)
}
</script>

<template>
  <UiModal :model-value="modelValue" title="话题人工纠偏与归并" :width="500" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="topic" class="ta-wrap">
      <div class="ta-seg">
        <button type="button" :class="{ on: tab === 'edit' }" @click="tab = 'edit'">修正标题 / 关注级别</button>
        <button type="button" :class="{ on: tab === 'merge' }" :disabled="!mergeTargets.length" @click="tab = 'merge'">合并至同类话题</button>
      </div>

      <template v-if="tab === 'edit'">
        <label class="label">话题名称</label>
        <input v-model="title" class="input" />
        <label class="label mt">人工核定关注级别</label>
        <UiSelect
          v-model="level"
          :options="[
            { value: 'high', label: '红色 · 优先研判' },
            { value: 'mid', label: '橙色 · 重点关注' },
            { value: 'low', label: '黄色 · 一般关注' },
            { value: 'info', label: '灰色 · 日常参考' },
          ]"
        />
      </template>

      <template v-else>
        <p class="ta-hint">将「{{ topic.title }}」下的 {{ topic.postCount }} 条公开帖文合并归入以下目标话题：</p>
        <UiSelect v-model="targetTopicId" :options="mergeTargets" />
      </template>

      <label class="label mt">纠偏依据（必填，记录审计留痕）</label>
      <textarea v-model="reason" class="textarea" rows="3" placeholder="说明修改标题、调整级别或跨话题归并的业务理由" />
    </div>
    <template #footer>
      <UiButton @click="emit('update:modelValue', false)">取消</UiButton>
      <UiButton variant="primary" :disabled="!reason.trim()" @click="submit">确认纠偏</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.ta-wrap{display:flex;flex-direction:column;gap:8px}
.ta-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:3px;background:var(--surface-3);border-radius:9px;margin-bottom:4px}
.ta-seg button{height:32px;border-radius:7px;font-size:13px;color:var(--text-2)}
.ta-seg button.on{background:var(--surface);color:var(--red);font-weight:600;box-shadow:var(--shadow-1)}
.ta-hint{font-size:13px;color:var(--text-2);line-height:1.6}
.mt{margin-top:6px}
</style>
