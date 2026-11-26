<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onDeactivated, ref } from 'vue'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'

/** 与设计系统一致的中文日期区间选择器：Teleport 挂至 body、100% 不透明实色底板、滚动自动收起、支持 Esc 关闭。 */
const props = withDefaults(defineProps<{
  start: string
  end: string
  minDate?: string
  maxDate?: string
  placeholder?: string
}>(), { placeholder: '全部交易时段' })

const emit = defineEmits<{
  'update:start': [value: string]
  'update:end': [value: string]
  change: [range: { start: string; end: string }]
}>()

const open = ref(false)
const trigger = ref<HTMLButtonElement>()
const pos = ref({ left: 0, top: 0 })
const viewYear = ref(2026)
const viewMonth = ref(9)
const draftStart = ref('')
const draftEnd = ref('')

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

const display = computed(() => {
  if (props.start && props.end) return `${props.start} 至 ${props.end}`
  if (props.start) return `${props.start} 起`
  if (props.end) return `至 ${props.end}`
  return ''
})

const refYear = computed(() => {
  const src = props.maxDate || props.end || props.start || '2026-10-01'
  return Number(src.slice(0, 4)) || 2026
})

const holidayPresets = computed(() => {
  const y = refYear.value
  if (y === 2025) {
    return [
      { label: '2025春节', s: '2025-01-20', e: '2025-02-06' },
      { label: '2025中秋国庆', s: '2025-09-25', e: '2025-10-08' },
    ]
  }
  return [
    { label: `${y}春节节点`, s: `${y}-02-08`, e: `${y}-02-24` },
    { label: `${y}中秋国庆`, s: `${y}-09-20`, e: `${y}-10-07` },
  ]
})

function initView() {
  const refDate = props.end || props.start || props.maxDate || '2026-10-01'
  const m = /^(\d{4})-(\d{2})/.exec(refDate)
  if (m) { viewYear.value = Number(m[1]); viewMonth.value = Number(m[2]) }
  draftStart.value = props.start
  draftEnd.value = props.end
}

function place() {
  const r = trigger.value!.getBoundingClientRect()
  const popW = 310
  const left = Math.min(window.innerWidth - popW - 12, Math.max(12, r.left))
  const top = r.bottom + 6 + 340 > window.innerHeight ? Math.max(12, r.top - 346) : r.bottom + 6
  pos.value = { left, top }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') hide()
}

async function show() {
  initView()
  place()
  open.value = true
  await nextTick()
  window.addEventListener('scroll', hide, true)
  window.addEventListener('resize', hide)
  window.addEventListener('keydown', onKey)
}

function hide() {
  open.value = false
  window.removeEventListener('scroll', hide, true)
  window.removeEventListener('resize', hide)
  window.removeEventListener('keydown', onKey)
}

function stepMonth(delta: number) {
  let m = viewMonth.value + delta
  let y = viewYear.value
  if (m < 1) { m = 12; y-- }
  else if (m > 12) { m = 1; y++ }
  viewYear.value = y
  viewMonth.value = m
}

const pad = (n: number) => String(n).padStart(2, '0')
const fmtDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

const cells = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const firstDay = new Date(y, m - 1, 1).getDay()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(y, m, 0).getDate()
  const out: { key: string; day: number; date: string; empty: boolean }[] = []
  for (let i = 0; i < offset; i++) out.push({ key: `e-${i}`, day: 0, date: '', empty: true })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = fmtDate(y, m, d)
    out.push({ key: date, day: d, date, empty: false })
  }
  return out
})

function pickDay(date: string) {
  if (!draftStart.value || (draftStart.value && draftEnd.value)) {
    draftStart.value = date
    draftEnd.value = ''
    return
  }
  if (date < draftStart.value) {
    draftEnd.value = draftStart.value
    draftStart.value = date
  } else {
    draftEnd.value = date
  }
  commit(draftStart.value, draftEnd.value)
}

function commit(s: string, e: string) {
  emit('update:start', s)
  emit('update:end', e)
  emit('change', { start: s, end: e })
  hide()
}

function clear() {
  draftStart.value = ''
  draftEnd.value = ''
  commit('', '')
}

function isInRange(date: string) {
  if (!draftStart.value || !draftEnd.value) return false
  return date > draftStart.value && date < draftEnd.value
}

onBeforeUnmount(hide)
onDeactivated(hide)
</script>

<template>
  <div class="drp" :class="{ open, 'has-val': Boolean(display) }">
    <button ref="trigger" type="button" class="drp-trigger" aria-label="交易时间区间" @click="open ? hide() : show()">
      <Calendar :size="14" class="drp-ic" />
      <span class="num" :class="{ ph: !display }">{{ display || placeholder }}</span>
    </button>
    <button v-if="display" type="button" class="drp-clear" aria-label="清空日期区间" @click="clear">
      <X :size="13" />
    </button>

    <Teleport to="body">
      <template v-if="open">
        <div class="drp-mask" @mousedown="hide" />
        <div class="drp-pop" role="dialog" aria-label="选择交易时间区间" :style="{ left: pos.left + 'px', top: pos.top + 'px' }">
          <div class="drp-presets">
            <button type="button" @click="commit('', '')">全部时段</button>
            <button v-for="p in holidayPresets" :key="p.label" type="button" @click="commit(p.s, p.e)">{{ p.label }}</button>
            <button v-if="minDate && maxDate" type="button" @click="commit(minDate, maxDate)">本批全期</button>
          </div>
          <div class="drp-head">
            <button type="button" class="nav-btn" aria-label="上个月" @click="stepMonth(-1)"><ChevronLeft :size="15" /></button>
            <strong class="num">{{ viewYear }} 年 {{ pad(viewMonth) }} 月</strong>
            <button type="button" class="nav-btn" aria-label="下个月" @click="stepMonth(1)"><ChevronRight :size="15" /></button>
          </div>
          <div class="drp-weeks">
            <span v-for="w in weekDays" :key="w">{{ w }}</span>
          </div>
          <div class="drp-days">
            <template v-for="c in cells" :key="c.key">
              <span v-if="c.empty" class="empty" />
              <button
                v-else
                type="button"
                class="day num"
                :class="{
                  edge: c.date === draftStart || c.date === draftEnd,
                  mid: isInRange(c.date),
                }"
                @click="pickDay(c.date)"
              >{{ c.day }}</button>
            </template>
          </div>
          <div class="drp-foot">
            <span class="muted num">{{ draftStart ? (draftEnd ? `${draftStart} 至 ${draftEnd}` : `起点 ${draftStart}，请选截止日`) : '点击起止日期筛选' }}</span>
            <button v-if="draftStart && !draftEnd" type="button" class="only-btn" @click="commit(draftStart, draftStart)">仅看当日</button>
          </div>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<style scoped>
.drp{position:relative;min-width:0}
.drp-trigger{width:100%;height:30px;padding:0 10px;display:flex;align-items:center;gap:6px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface);color:var(--text);font-size:13px;transition:border-color var(--dur),box-shadow var(--dur)}
.drp.has-val .drp-trigger{padding-right:26px}
.drp-trigger:hover{border-color:var(--red-line)}
.open .drp-trigger,.drp-trigger:focus-visible{border-color:var(--red);box-shadow:0 0 0 3px var(--red-50);outline:none}
.drp-ic{color:var(--text-3);flex:none}
.drp-trigger>span:nth-child(2){flex:1;min-width:0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ph{color:var(--text-4)}
.drp-clear{position:absolute;right:5px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;color:var(--text-3)}
.drp-clear:hover{background:var(--surface-3);color:var(--red)}
</style>

<style>
.drp-mask{position:fixed;inset:0;z-index:600}
.drp-pop{position:fixed;z-index:601;width:306px;padding:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow-2);animation:rise 160ms var(--ease)}
.drp-pop .drp-presets{display:flex;flex-wrap:wrap;gap:5px;padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid var(--line)}
.drp-pop .drp-presets button{font-size:12px;padding:3px 8px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);color:var(--text-2);transition:all var(--dur)}
.drp-pop .drp-presets button:hover{border-color:var(--red-line);color:var(--red);background:var(--red-25)}
.drp-pop .drp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.drp-pop .drp-head strong{font-size:14px;font-weight:600;color:var(--text)}
.drp-pop .nav-btn{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--text-2)}
.drp-pop .nav-btn:hover{background:var(--surface-3);color:var(--red)}
.drp-pop .drp-weeks{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:12px;color:var(--text-3);margin-bottom:4px}
.drp-pop .drp-days{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.drp-pop .drp-days .day{height:30px;border-radius:6px;font-size:13px;color:var(--text);transition:background var(--dur),color var(--dur)}
.drp-pop .drp-days .day:hover{background:var(--red-25);color:var(--red)}
.drp-pop .drp-days .day.mid{background:var(--red-50);color:var(--red-700);border-radius:0}
.drp-pop .drp-days .day.edge{background:var(--red);color:var(--on-brand);font-weight:600}
.drp-pop .drp-foot{margin-top:10px;padding-top:8px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px}
.drp-pop .only-btn{color:var(--red);font-weight:600;font-size:12px;padding:2px 6px;border-radius:4px}
.drp-pop .only-btn:hover{background:var(--red-50)}
</style>
