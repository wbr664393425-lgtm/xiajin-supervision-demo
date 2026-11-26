<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight, Search, X } from 'lucide-vue-next'
import { allSupervisionFindings, navigateTo, portalState } from '@/domain/store'
import { CADRES, CASE_FILES, TOWNS, townName } from '@/domain/mockData'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const dialogRef = ref<HTMLDialogElement | null>(null)
const query = ref('')
let pressedOutside = false

watch(
  () => props.open,
  (isOpen) => {
    const dlg = dialogRef.value
    if (!dlg) return
    if (isOpen && !dlg.open) {
      query.value = ''
      dlg.showModal()
    } else if (!isOpen && dlg.open) {
      dlg.close()
    }
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

interface Hit {
  id: string
  kind: string
  title: string
  sub: string
  action: () => void
}

const results = computed<Hit[]>(() => {
  const q = query.value.trim()
  const list: Hit[] = []

  const match = (s: string) => !q || s.includes(q)

  for (const c of portalState.clues) {
    if (match(c.id) || match(c.village) || match(c.content) || match(townName(c.town))) {
      list.push({
        id: `clue-${c.id}`,
        kind: '信访线索',
        title: `${c.id} · ${townName(c.town)}${c.village}`,
        sub: c.content.slice(0, 56) + '…',
        action: () => {
          navigateTo('clues', { clueId: c.id })
          dialogRef.value?.close()
        },
      })
    }
  }

  for (const f of allSupervisionFindings.value) {
    if (match(f.id) || match(f.title) || match(f.subject) || match(f.rule)) {
      list.push({
        id: `find-${f.id}`,
        kind: '穿透疑点',
        title: f.rule + ' · ' + f.subject,
        sub: f.title,
        action: () => {
          navigateTo('radar')
          dialogRef.value?.close()
        },
      })
    }
  }

  for (const cadre of CADRES) {
    if (match(cadre.name) || match(cadre.unit)) {
      list.push({
        id: `cadre-${cadre.id}`,
        kind: '人员透视',
        title: `${cadre.name}（${cadre.unit} · ${cadre.title}）`,
        sub: `归集记录 ${cadre.records.length} 条，点击发起全域全景穿透`,
        action: () => {
          navigateTo('panorama', { panoramaQuery: cadre.name })
          dialogRef.value?.close()
        },
      })
    }
  }

  for (const cs of CASE_FILES) {
    if (match(cs.id) || match(cs.title) || match(cs.accused)) {
      list.push({
        id: `case-${cs.id}`,
        kind: '审理案卷',
        title: `${cs.id} · ${cs.title}`,
        sub: `阶段：${cs.stage} · ${cs.violation}`,
        action: () => {
          navigateTo('inspection')
          dialogRef.value?.close()
        },
      })
    }
  }

  for (const t of TOWNS) {
    if (match(t.name) || t.villages.some((v) => match(v))) {
      list.push({
        id: `town-${t.id}`,
        kind: '乡镇督办',
        title: `${t.name}（${t.villages.join('、')}）`,
        sub: `${t.zone} · 定位该乡镇在门户总览的监督态势`,
        action: () => {
          navigateTo('home', { town: t.id })
          dialogRef.value?.close()
        },
      })
    }
  }

  return list.slice(0, 12)
})
</script>

<template>
  <dialog
    ref="dialogRef"
    aria-labelledby="global-search-title"
    closedby="any"
    class="search-dialog"
    @close="handleClose"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
  >
    <div class="search-head">
      <Search :size="18" class="search-icon" aria-hidden="true" />
      <label for="global-search-input" class="visually-hidden">全局穿透检索线索、人员、合同编号或乡镇</label>
      <h2 id="global-search-title" class="visually-hidden">全局穿透检索</h2>
      <input
        id="global-search-input"
        v-model="query"
        type="search"
        autofocus
        placeholder="搜索人名（张某军、王某民）、编号（SZ-HT-2026-018）、乡镇G、企业…"
        class="search-input"
      />
      <form method="dialog">
        <button type="submit" value="close" class="btn btn-ghost btn-sm" aria-label="关闭搜索">
          <X :size="16" aria-hidden="true" />
        </button>
      </form>
    </div>

    <div class="search-quick">
      <span class="quick-label">快捷穿透：</span>
      <button v-for="preset in ['张某军', 'SZ-HT-2026-018', '鑫路建设', '乡镇G', '李某华']" :key="preset" type="button" class="quick-pill" @click="query = preset">
        {{ preset }}
      </button>
    </div>

    <ul v-if="results.length" class="search-results">
      <li v-for="hit in results" :key="hit.id">
        <button type="button" class="hit-row" @click="hit.action()">
          <span class="hit-kind">{{ hit.kind }}</span>
          <span class="hit-main">
            <span class="hit-title">{{ hit.title }}</span>
            <span class="hit-sub">{{ hit.sub }}</span>
          </span>
          <ArrowRight :size="15" class="hit-arrow" aria-hidden="true" />
        </button>
      </li>
    </ul>
    <p v-else class="search-empty">未找到与「{{ query }}」匹配的虚构样例记录</p>
  </dialog>
</template>

<style scoped>
.search-dialog {
  inline-size: min(92dvw, 680px);
  overflow: hidden;
}

.search-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.9rem 1.1rem;
  border-block-end: 1px solid var(--border-hairline);
}

.search-icon {
  color: var(--ink-muted);
  flex: none;
}

.search-input {
  flex: 1;
  min-inline-size: 0;
  border: 0;
  background: transparent;
  font-size: 0.96rem;
  color: var(--ink-primary);
  outline: none;
}

.search-quick {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.1rem;
  background: var(--bg-elevated);
  border-block-end: 1px solid var(--border-hairline);
}

.quick-label {
  font-size: 0.78rem;
  color: var(--ink-muted);
}

.quick-pill {
  border: 1px solid var(--border-hairline);
  background: var(--bg-surface);
  color: var(--brand-indigo);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.22rem 0.6rem;
  border-radius: var(--radius-pill);
}

.quick-pill:hover {
  background: var(--brand-teal-tint);
  border-color: var(--brand-teal-border);
}

.search-results {
  list-style: none;
  margin: 0;
  padding: 0.45rem;
  max-block-size: 55dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.hit-row {
  inline-size: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  text-align: start;
}

.hit-row:hover {
  background: var(--bg-subtle);
}

.hit-kind {
  flex: none;
  padding: 0.18rem 0.5rem;
  border-radius: 5px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--brand-teal-tint);
  color: var(--brand-indigo);
}

.hit-main {
  flex: 1;
  min-inline-size: 0;
  display: grid;
  gap: 0.1rem;
}

.hit-title {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--ink-primary);
}

.hit-sub {
  font-size: 0.8rem;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hit-arrow {
  color: var(--ink-muted);
  flex: none;
}

.search-empty {
  padding: 2rem 1.25rem;
  text-align: center;
  color: var(--ink-muted);
}
</style>
