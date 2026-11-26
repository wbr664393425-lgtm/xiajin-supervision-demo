/** 文本工具：切句、字二元组相似度、正则命中位置。 */
export interface Span { start: number; end: number }
export function sentences(text: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = []
  let start = 0
  for (const m of text.matchAll(/[^。！？；\n]+[。！？；]?/g)) { if (m[0].trim()) out.push({ text: m[0], start: m.index! }); start = m.index! + m[0].length }
  void start
  return out
}
export function bigrams(text: string) {
  const clean = text.replace(/[\s，。、：；！？“”‘’（）()【】\[\]《》,.:;!?'"-]/g, '')
  const set = new Set<string>()
  for (let i = 0; i < clean.length - 1; i++) set.add(clean.slice(i, i + 2))
  return set
}
export function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}
export const similarity = (a: string, b: string) => jaccard(bigrams(a), bigrams(b))
export function findAll(text: string, pattern: RegExp): (Span & { text: string })[] {
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
  return [...text.matchAll(re)].map(m => ({ start: m.index!, end: m.index! + m[0].length, text: m[0] }))
}
export function parseAmount(text: string) { const n = Number(text.replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : 0 }
/** 把文本按若干高亮区间切段，重叠区间只保留先出现者，原文字符一个不丢。 */
export function segment(text: string, spans: (Span & { tag?: string })[]) {
  const sorted = [...spans].filter(s => s.end > s.start && s.start >= 0 && s.end <= text.length).sort((a, b) => a.start - b.start)
  const out: { text: string; tag?: string; start: number }[] = []
  let cursor = 0
  for (const s of sorted) {
    if (s.start < cursor) continue
    if (s.start > cursor) out.push({ text: text.slice(cursor, s.start), start: cursor })
    out.push({ text: text.slice(s.start, s.end), tag: s.tag || 'hl', start: s.start })
    cursor = s.end
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), start: cursor })
  return out
}
/** 取原文 [start,end) 子区间的分段，高亮区间按子区间裁切，偏移量保持全局一致。 */
export function segmentRange(text: string, spans: (Span & { tag?: string })[], start: number, end: number) {
  const clipped = spans.filter(s => s.end > start && s.start < end).map(s => ({ ...s, start: Math.max(s.start, start), end: Math.min(s.end, end) }))
  return segment(text.slice(0, end), clipped).filter(s => s.start + s.text.length > start).map(s => s.start < start ? { ...s, text: s.text.slice(start - s.start), start } : s)
}
