<script setup lang="ts">
import { ref, watch } from 'vue'
import { CheckCircle2, X } from 'lucide-vue-next'
import type { VerifyTask } from '@/domain/types'
import { completeVerifyTask } from '@/domain/store'

const props = defineProps<{
  task: VerifyTask | null
}>()
const emit = defineEmits<{ close: [] }>()

const dialogRef = ref<HTMLDialogElement | null>(null)
const resultText = ref('')

watch(
  () => props.task,
  (t) => {
    const dlg = dialogRef.value
    if (!dlg) return
    if (t) {
      resultText.value = '已调阅原始账簿、银行流水与民主决策会议签到表，核查情况属实并责令限期整改补正。'
      if (!dlg.open) dlg.showModal()
    } else if (dlg.open) {
      dlg.close()
    }
  },
)

function handleClose() {
  if (dialogRef.value) dialogRef.value.returnValue = ''
  emit('close')
}

function submitTask() {
  if (!props.task) return
  completeVerifyTask(props.task.id, resultText.value)
  dialogRef.value?.close()
}
</script>

<template>
  <dialog ref="dialogRef" aria-labelledby="task-complete-title" class="task-dlg" @close="handleClose">
    <div class="dlg-head">
      <div>
        <h2 id="task-complete-title">记录核查结果并办结任务</h2>
        <p class="dlg-meta">{{ task?.id }} · {{ task?.domain }} · 承办：{{ task?.assignee }}</p>
      </div>
      <form method="dialog">
        <button type="submit" value="cancel" class="btn btn-ghost btn-sm" aria-label="取消关闭">
          <X :size="18" aria-hidden="true" />
        </button>
      </form>
    </div>
    <form class="dlg-form" @submit.prevent="submitTask">
      <p class="task-title-box">{{ task?.title }}</p>
      <label for="task-result-input" class="field-label">人工核查结论与处置摘要（记入台账及审计日志）</label>
      <textarea
        id="task-result-input"
        v-model="resultText"
        rows="4"
        required
        autofocus
        class="field-textarea"
        placeholder="请填写调阅原件、谈话核实及后续整改/移交意见…"
      />
      <div class="dlg-actions">
        <button type="button" class="btn btn-secondary" @click="dialogRef?.close()">取消</button>
        <button type="submit" class="btn btn-primary">
          <CheckCircle2 :size="16" aria-hidden="true" />
          确认核查办结
        </button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.task-dlg {
  inline-size: min(92dvw, 540px);
}

.dlg-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.05rem 1.25rem;
  border-block-end: 1px solid var(--border-hairline);
}

.dlg-head h2 {
  font-size: 1.05rem;
  font-weight: 700;
}

.dlg-meta {
  font-size: 0.8rem;
  color: var(--ink-muted);
  margin-block-start: 0.15rem;
}

.dlg-form {
  padding: 1.15rem 1.25rem 1.25rem;
  display: grid;
  gap: 0.85rem;
}

.task-title-box {
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--border-hairline);
  font-weight: 600;
  font-size: 0.9rem;
}

.field-label {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--ink-secondary);
}

.field-textarea {
  inline-size: 100%;
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--bg-surface);
  resize: vertical;
  line-height: 1.6;
}

.dlg-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-block-start: 0.25rem;
}
</style>
