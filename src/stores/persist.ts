import { ref, watch, type Ref } from 'vue'
import { replaceLegacyTownNames } from './legacy-town-names'

const PREFIX = 'xiajin-v2:'
const resets: (() => void)[] = []
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

/** 持久化到 localStorage 的响应式状态；读取失败时回退初始值，不影响演示。 */
export function persisted<T>(key: string, initial: () => T): Ref<T> {
  let start = initial()
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PREFIX + key) : null
    if (raw) {
      const updated = replaceLegacyTownNames(raw)
      start = JSON.parse(updated)
      if (updated !== raw) localStorage.setItem(PREFIX + key, updated)
    }
  } catch { /* 使用初始值 */ }
  const state = ref(start) as Ref<T>
  watch(state, value => { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* 存储不可用时继续演示 */ } }, { deep: true })
  resets.push(() => { state.value = clone(initial()) })
  return state
}
export function resetAll() {
  resets.forEach(fn => fn())
  try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)) } catch { /* ignore */ }
}
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase()
/** 业务日期：固定为汇报当天，保证超期、到期等数字与讲解一致 */
export const today = () => '2026-11-07'
export function nowText() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${today()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
