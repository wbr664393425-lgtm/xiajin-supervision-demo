<script setup lang="ts">
import { ref, watch } from 'vue'
import { ShieldCheck, X } from 'lucide-vue-next'
import { portalState } from '@/domain/store'
import { INTEGRATION_LIST } from '@/domain/mockData'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const dialogRef = ref<HTMLDialogElement | null>(null)
let pressedOutside = false

watch(
  () => props.open,
  (isOpen) => {
    const dlg = dialogRef.value
    if (!dlg) return
    if (isOpen && !dlg.open) dlg.showModal()
    else if (!isOpen && dlg.open) dlg.close()
  },
)

function handleClose() {
  if (dialogRef.value) dialogRef.value.returnValue = ''
  emit('close')
}

function isOutside(e: PointerEvent, dlg: HTMLDialogElement) {
  const r = dlg.getBoundingClientRect()
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
}

function onPointerDown(e: PointerEvent) {
  if (dialogRef.value) pressedOutside = isOutside(e, dialogRef.value)
}

function onPointerUp(e: PointerEvent) {
  if (dialogRef.value && pressedOutside && isOutside(e, dialogRef.value)) {
    dialogRef.value.close()
  }
  pressedOutside = false
}
</script>

<template>
  <dialog
    ref="dialogRef"
    aria-labelledby="audit-dlg-title"
    closedby="any"
    class="audit-dialog"
    @close="handleClose"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
  >
    <div class="dlg-header">
      <div class="dlg-title-wrap">
        <ShieldCheck :size="20" class="dlg-icon" aria-hidden="true" />
        <div>
          <h2 id="audit-dlg-title">全程操作审计留痕与合规边界</h2>
          <p class="dlg-sub">所有智能解析、人工修正、确认转核查与复核销号均实时留痕</p>
        </div>
      </div>
      <form method="dialog">
        <button type="submit" value="close" class="btn btn-ghost btn-sm" aria-label="关闭审计窗口">
          <X :size="18" aria-hidden="true" />
        </button>
      </form>
    </div>

    <div class="dlg-body">
      <div class="boundary-banner">
        <strong>人机协同底线声明：</strong>
        本演示门户采用本地确定性规则引擎与虚构乡镇（乡镇A–N）样例数据，模拟展示智能抽取与跨库碰撞能力；
        平台只出「疑点提示、事实摘录与文书初稿」，违纪定性、量纪处分与审批处置权严格保留给纪检监察干部。
      </div>

      <h3 class="sec-h3">近期留痕记录（共 {{ portalState.audits.length }} 条）</h3>
      <ul class="audit-timeline">
        <li v-for="entry in portalState.audits" :key="entry.id" class="audit-row">
          <span class="audit-time num-tabular">{{ entry.time }}</span>
          <span class="audit-action">{{ entry.action }}</span>
          <div class="audit-detail">
            <strong>{{ entry.target }}</strong>
            <span>{{ entry.detail }}</span>
          </div>
          <span class="audit-user">{{ entry.user }}</span>
        </li>
      </ul>

      <h3 class="sec-h3" style="margin-block-start: 1.25rem">内网对接与演示适配器状态</h3>
      <ul class="integration-list">
        <li v-for="item in INTEGRATION_LIST" :key="item.name" class="int-row">
          <div>
            <strong>{{ item.name }}</strong>
            <p class="int-desc">{{ item.desc }}</p>
          </div>
          <span class="int-badge">{{ item.status }}</span>
        </li>
      </ul>
    </div>
  </dialog>
</template>

<style scoped>
.audit-dialog {
  inline-size: min(94dvw, 760px);
}

.dlg-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.35rem;
  border-block-end: 1px solid var(--border-hairline);
}

.dlg-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dlg-icon {
  color: var(--brand-indigo);
  flex: none;
}

.dlg-title-wrap h2 {
  font-size: 1.08rem;
  font-weight: 700;
}

.dlg-sub {
  font-size: 0.82rem;
  color: var(--ink-muted);
}

.dlg-body {
  padding: 1.2rem 1.35rem 1.4rem;
  max-block-size: 70dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.boundary-banner {
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  background: var(--amber-tint);
  border: 1px solid var(--amber-border);
  font-size: 0.85rem;
  color: var(--ink-primary);
  margin-block-end: 1.15rem;
}

.sec-h3 {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--brand-indigo);
  margin-block-end: 0.65rem;
}

.audit-timeline {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.audit-row {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.75rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-sm);
  font-size: 0.83rem;
}

.audit-time {
  color: var(--ink-muted);
  font-size: 0.78rem;
}

.audit-action {
  padding: 0.14rem 0.45rem;
  border-radius: 4px;
  background: var(--brand-teal-tint);
  color: var(--brand-indigo);
  font-weight: 600;
  font-size: 0.75rem;
}

.audit-detail {
  display: grid;
  min-inline-size: 0;
}

.audit-detail span {
  color: var(--ink-muted);
  font-size: 0.79rem;
}

.audit-user {
  color: var(--ink-secondary);
  font-size: 0.78rem;
}

.integration-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.int-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-sm);
}

.int-desc {
  font-size: 0.8rem;
  color: var(--ink-muted);
}

.int-badge {
  flex: none;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-pill);
  background: var(--bg-subtle);
  color: var(--ink-secondary);
}

@media (max-width: 640px) {
  .audit-row {
    grid-template-columns: 1fr auto;
  }
}
</style>
