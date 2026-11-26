import { modules } from './modules'

export interface SearchItem { id: string; title: string; type: string; to: string }
const providers: (() => SearchItem[])[] = []
/** 各模块注册可检索的记录（线索、合同、案卷、档案等）。 */
export function registerSearch(fn: () => SearchItem[]) { providers.push(fn) }
export function searchAll(q: string): SearchItem[] {
  const key = q.trim().toLowerCase()
  const features = modules.flatMap(m => m.features.map(f => ({ id: `${m.key}/${f.key}`, title: f.title, type: m.short, to: `/${m.key}/${f.key}` })))
  const all = [...features, ...providers.flatMap(fn => fn())]
  if (!key) return features.slice(0, 8)
  return all.filter(item => `${item.title}${item.id}${item.type}`.toLowerCase().includes(key)).slice(0, 30)
}
