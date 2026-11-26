import { ref } from 'vue'

/** 页面配色：党建红（默认）、政务蓝、珍珠白。单独存储，重置演示数据时不受影响。 */
export type ThemeKey = 'red' | 'blue' | 'pearl'
export const themes: { key: ThemeKey; name: string; swatch: [string, string] }[] = [
  { key: 'red', name: '党建红', swatch: ['#C91519', '#FFF6E6'] },
  { key: 'blue', name: '政务蓝', swatch: ['#1A56B8', '#EEF3FA'] },
  { key: 'pearl', name: '珍珠白', swatch: ['#FBFCFB', '#236DE9'] },
]
const KEY = 'xiajin-theme'
const read = (): ThemeKey => { try { const v = localStorage.getItem(KEY); return v === 'blue' || v === 'pearl' ? v : 'red' } catch { return 'red' } }
export const theme = ref<ThemeKey>(read())
export function applyTheme(t: ThemeKey = theme.value) {
  theme.value = t
  const root = document.documentElement
  if (t === 'red') delete root.dataset.theme
  else root.dataset.theme = t
  try { localStorage.setItem(KEY, t) } catch { /* 存储不可用时仅本次生效 */ }
}
