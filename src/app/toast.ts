import { reactive } from 'vue'
export const toasts = reactive<{ id: number; text: string; tone: 'ok' | 'info' | 'warn'; action?: { label: string; to: string } }[]>([])
let seq = 0
export function toast(text: string, tone: 'ok' | 'info' | 'warn' = 'ok', action?: { label: string; to: string }) {
  const id = ++seq
  toasts.push({ id, text, tone, action })
  setTimeout(() => { const i = toasts.findIndex(t => t.id === id); if (i >= 0) toasts.splice(i, 1) }, 4200)
}
