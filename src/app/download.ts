import demoWatermark from '@/assets/demo-watermark.svg?raw'

/** 本地生成文件并下载（不经网络）。 */
export function downloadText(name: string, text: string, type = 'text/plain;charset=utf-8') {
  const content = type.startsWith('text/plain') ? '\uFEFF【样例/演示】\n\n' + text : text
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function reportDocument(title: string, body: string) {
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${safeTitle}</title><style>body{font-family:"Songti SC","SimSun",serif;padding:40px 56px;line-height:1.9;color:#222;font-size:15px}h1{text-align:center;font-size:22px;color:#a80f13}pre{white-space:pre-wrap;font-family:inherit}</style></head><body>${body}${demoWatermark}</body></html>`
}
export function printHtml(title: string, body: string) {
  const w = window.open('', '_blank', 'width=900,height=1000')
  if (!w) return false
  w.document.write(reportDocument(title, body))
  w.document.close()
  w.setTimeout(() => w.print(), 300)
  return true
}
