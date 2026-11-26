/**
 * 零依赖表格解析与多工作表 XLSX 导出工具（浏览器与 Node 通用）
 * - 解析支持：.csv / .tsv（严格 UTF-8 优先，失败自动回退 GB18030）、标准 .xlsx（OOXML，支持 Deflate 大文件与自闭合单元格）、银行 HTML/XML 伪 .xls
 * - 导出支持：标准多工作表 .xlsx（OOXML，剔除非法控制字符、支持列类型格式、表头冻结与重名工作表去重）
 */

export type ColFormat = 'text' | 'int' | 'money'

export interface SheetData {
  name: string
  headers: string[]
  rows: (string | number)[][]
  colWidths?: number[]
  colFormats?: ColFormat[]
}

/** 剔除 XML 1.0 非法控制字符后做实体转义 */
const xmlEsc = (v: unknown) =>
  String(v ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const xmlUnesc = (s: string) =>
  s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const cp = Number(n)
      return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ''
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      const cp = parseInt(h, 16)
      return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ''
    })
    .replace(/&amp;/g, '&')

function colLetters(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const r = (n - 1) % 26
    out = String.fromCharCode(65 + r) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function colIndexFromRef(ref: string): number {
  const m = /^([A-Z]+)/i.exec(ref)
  if (!m) return 0
  let idx = 0
  for (const ch of m[1]!.toUpperCase()) idx = idx * 26 + (ch.charCodeAt(0) - 64)
  return idx - 1
}

// ───────── CRC32 & ZIP 打包（STORE 模式生成标准 .xlsx） ─────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function buildZip(entries: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length

    const local = new Uint8Array(30 + nameBytes.length + size)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint16(8, 0, true)
    lv.setUint16(10, 0, true)
    lv.setUint16(12, 0, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    local.set(nameBytes, 30)
    local.set(entry.data, 30 + nameBytes.length)
    locals.push(local)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, size, true)
    cv.setUint32(24, size, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centrals.push(central)

    offset += local.length
  }

  const centralSize = centrals.reduce((s, b) => s + b.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  const total = offset + centralSize + eocd.length
  const out = new Uint8Array(total)
  let pos = 0
  for (const l of locals) { out.set(l, pos); pos += l.length }
  for (const c of centrals) { out.set(c, pos); pos += c.length }
  out.set(eocd, pos)
  return out
}

function inferColFormat(header: string): ColFormat {
  if (/金额|余额|总额|差额|元/.test(header)) return 'money'
  if (/笔数|数量|条数|次数/.test(header)) return 'int'
  return 'text'
}

function buildSheetXml(sheet: SheetData): string {
  const colCount = Math.max(sheet.headers.length, ...sheet.rows.map(r => r.length), 1)
  const formats: ColFormat[] = Array.from({ length: colCount }, (_, i) =>
    sheet.colFormats?.[i] || inferColFormat(sheet.headers[i] || ''),
  )
  const widths = sheet.colWidths || Array.from({ length: colCount }, (_, i) => {
    const hLen = (sheet.headers[i] || '').length * 2 + 4
    const maxCell = sheet.rows.slice(0, 60).reduce((m, r) => Math.max(m, String(r[i] ?? '').length), 0)
    return Math.min(44, Math.max(12, hLen, Math.round(maxCell * 1.35 + 4)))
  })
  const colsXml = `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`

  const rowXmls: string[] = []
  const headCells = sheet.headers.map((h, ci) =>
    `<c r="${colLetters(ci)}1" t="inlineStr" s="1"><is><t xml:space="preserve">${xmlEsc(h)}</t></is></c>`,
  ).join('')
  rowXmls.push(`<row r="1" ht="24" customHeight="1">${headCells}</row>`)

  sheet.rows.forEach((row, ri) => {
    const rNum = ri + 2
    const cells = row.map((val, ci) => {
      const ref = `${colLetters(ci)}${rNum}`
      if (typeof val === 'number' && Number.isFinite(val)) {
        const fmt = formats[ci]
        const style = fmt === 'money' ? 3 : fmt === 'int' ? 4 : 2
        return `<c r="${ref}" s="${style}"><v>${val}</v></c>`
      }
      return `<c r="${ref}" t="inlineStr" s="2"><is><t xml:space="preserve">${xmlEsc(val)}</t></is></c>`
    }).join('')
    rowXmls.push(`<row r="${rNum}" ht="20" customHeight="1">${cells}</row>`)
  })

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  ${colsXml}
  <sheetData>${rowXmls.join('')}</sheetData>
</worksheet>`
}

/** 生成标准多工作表 .xlsx 二进制字节 */
export function buildWorkbookXlsx(sheets: SheetData[]): Uint8Array {
  const enc = new TextEncoder()
  const usedNames = new Set<string>()
  const safeSheets = sheets.map((s, i) => {
    const base = (s.name || `工作表${i + 1}`).replace(/[\\/*?:[\]]/g, '').trim().slice(0, 28) || `工作表${i + 1}`
    let safeName = base
    let seq = 2
    while (usedNames.has(safeName)) {
      safeName = `${base.slice(0, 27)}_${seq++}`
    }
    usedNames.add(safeName)
    return { ...s, safeName }
  })

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${safeSheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${safeSheets.map((s, i) => `<sheet name="${xmlEsc(s.safeName)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}
  </sheets>
</workbook>`

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${safeSheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
  <Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0.00"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
  </numFmts>
  <fonts count="2">
    <font><sz val="10"/><color rgb="FF333333"/><name val="微软雅黑"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="微软雅黑"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFC91519"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFE2D9CC"/></left>
      <right style="thin"><color rgb="FFE2D9CC"/></right>
      <top style="thin"><color rgb="FFE2D9CC"/></top>
      <bottom style="thin"><color rgb="FFE2D9CC"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
  </cellXfs>
</styleSheet>`

  const files: { name: string; data: Uint8Array }[] = [
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rootRels) },
    { name: 'xl/workbook.xml', data: enc.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    { name: 'xl/styles.xml', data: enc.encode(styles) },
    ...safeSheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: enc.encode(buildSheetXml(s)),
    })),
  ]

  return buildZip(files)
}

export function downloadXlsx(filename: string, sheets: SheetData[]) {
  const bytes = buildWorkbookXlsx(sheets)
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

// ───────── CSV / TSV / HTML / XLSX 表格解析 ─────────

/** 解析 CSV/TSV 文本为二维字符串表（处理引号、换行、转义、逗号后空格接引号及逗号/制表符分隔） */
export function parseDelimitedText(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const sampleLines = clean.split('\n').slice(0, 12).join('\n')
  const tabCount = (sampleLines.match(/\t/g) || []).length
  const commaCount = (sampleLines.match(/,/g) || []).length
  const sep = tabCount > commaCount ? '\t' : ','

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuote = false

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!
    if (inQuote) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') inQuote = false
      else cell += ch
    } else if (ch === '"' && cell.trim() === '') {
      cell = ''
      inQuote = true
    } else if (ch === sep) {
      row.push(cell.trim())
      cell = ''
    } else if (ch === '\n') {
      row.push(cell.trim())
      if (row.some(c => c !== '')) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  row.push(cell.trim())
  if (row.some(c => c !== '')) rows.push(row)
  return rows
}

/** 解码上传的文本字节：严格 UTF-8 优先，遇到非法字节序列自动回退 GB18030（兼容国内银行 GBK CSV） */
export function decodeSmartText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    try {
      return new TextDecoder('gb18030', { fatal: false }).decode(bytes)
    } catch {
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    }
  }
}

function parseHtmlTable(html: string): string[][] {
  const rows: string[][] = []
  const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || []
  for (const tr of trMatches) {
    const cells: string[] = []
    const tdMatches = tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []
    for (const td of tdMatches) {
      cells.push(xmlUnesc(td.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
    }
    if (cells.some(c => c !== '')) rows.push(cells)
  }
  return rows
}

/** 并发读写解压 deflate-raw，避免解压体积超流缓冲区水位时发生背压死锁 */
async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前环境不支持压缩表格解压，请另存为 CSV 后导入')
  }
  const ds = new DecompressionStream('deflate-raw')
  const writePromise = (async () => {
    const writer = ds.writable.getWriter()
    await writer.write(new Uint8Array(compressed))
    await writer.close()
  })()
  const readPromise = (async () => {
    const chunks: Uint8Array[] = []
    const reader = ds.readable.getReader()
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    const total = chunks.reduce((s, c) => s + c.length, 0)
    const out = new Uint8Array(total)
    let pos = 0
    for (const c of chunks) { out.set(c, pos); pos += c.length }
    return out
  })()
  const [, result] = await Promise.all([writePromise, readPromise])
  return result
}

async function readZipEntries(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocdOffset = -1
  const minOffset = Math.max(0, bytes.length - 65557)
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocdOffset = i; break }
  }
  if (eocdOffset < 0) throw new Error('无效的表格压缩包格式')

  const entryCount = view.getUint16(eocdOffset + 10, true)
  let cdOffset = view.getUint32(eocdOffset + 16, true)
  const dec = new TextDecoder('utf-8')
  const map = new Map<string, Uint8Array>()

  for (let i = 0; i < entryCount; i++) {
    if (view.getUint32(cdOffset, true) !== 0x02014b50) break
    const method = view.getUint16(cdOffset + 10, true)
    const compSize = view.getUint32(cdOffset + 20, true)
    const nameLen = view.getUint16(cdOffset + 28, true)
    const extraLen = view.getUint16(cdOffset + 30, true)
    const commentLen = view.getUint16(cdOffset + 32, true)
    const localOffset = view.getUint32(cdOffset + 42, true)
    const name = dec.decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen))
    cdOffset += 46 + nameLen + extraLen + commentLen

    const lNameLen = view.getUint16(localOffset + 26, true)
    const lExtraLen = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + lNameLen + lExtraLen
    const raw = bytes.subarray(dataStart, dataStart + compSize)

    if (method === 0) map.set(name.toLowerCase(), raw)
    else if (method === 8) map.set(name.toLowerCase(), await inflateRaw(raw))
  }
  return map
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = []
  const sis = xml.match(/<si\b[\s\S]*?<\/si>/gi) || []
  for (const si of sis) {
    // 剥离东亚注音节点 <rPh>...</rPh>
    const cleaned = si.replace(/<rPh\b[\s\S]*?<\/rPh>/gi, '')
    const texts = [...cleaned.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi)].map(m => xmlUnesc(m[1] || ''))
    out.push(texts.join(''))
  }
  return out
}

function parseWorksheetXml(xml: string, shared: string[]): string[][] {
  const rows: string[][] = []
  // 正确区分自闭合空行 <row .../> 与成对 <row ...>...</row>
  const rowRegex = /<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/gi
  let rm: RegExpExecArray | null
  while ((rm = rowRegex.exec(xml)) !== null) {
    const rInner = rm[1]
    if (!rInner) continue
    const cells: string[] = []
    // 正确区分自闭合空单元格 <c r="B2" s="3"/> 与成对 <c ...>...</c>
    const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gi
    let m: RegExpExecArray | null
    while ((m = cellRegex.exec(rInner)) !== null) {
      const attrs = m[1] || ''
      const inner = m[2]
      const refM = /\br="([A-Z]+\d+)"/i.exec(attrs)
      const colIdx = refM ? colIndexFromRef(refM[1]!) : cells.length
      while (cells.length < colIdx) cells.push('')
      if (inner === undefined) {
        cells[colIdx] = ''
        continue
      }
      const typeM = /\bt="([^"]+)"/i.exec(attrs)
      const type = typeM?.[1] || ''

      let val = ''
      if (type === 's') {
        const vM = /<v>([\s\S]*?)<\/v>/i.exec(inner)
        val = vM ? (shared[Number(vM[1])] ?? '') : ''
      } else if (type === 'inlineStr') {
        val = [...inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi)].map(t => xmlUnesc(t[1] || '')).join('')
      } else {
        const vM = /<v>([\s\S]*?)<\/v>/i.exec(inner)
        val = vM ? xmlUnesc(vM[1] || '') : ''
      }
      cells[colIdx] = val.trim()
    }
    if (cells.some(c => c !== '')) rows.push(cells)
  }
  return rows
}

function findFirstSheetKey(entries: Map<string, Uint8Array>): string | undefined {
  const dec = new TextDecoder('utf-8')
  const relsBytes = entries.get('xl/_rels/workbook.xml.rels')
  const wbBytes = entries.get('xl/workbook.xml')
  if (relsBytes && wbBytes) {
    const wbXml = dec.decode(wbBytes)
    const relsXml = dec.decode(relsBytes)
    const firstRid = /<sheet\b[^>]*r:id="([^"]+)"/i.exec(wbXml)?.[1]
    if (firstRid) {
      const target = new RegExp(`<Relationship\\b[^>]*Id="${firstRid}"[^>]*Target="([^"]+)"`, 'i').exec(relsXml)?.[1]
        || new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${firstRid}"`, 'i').exec(relsXml)?.[1]
      if (target) {
        const norm = target.startsWith('/') ? target.slice(1).toLowerCase() : `xl/${target.replace(/^\.\//, '')}`.toLowerCase()
        if (entries.has(norm)) return norm
      }
    }
  }
  return [...entries.keys()].filter(k => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k)).sort()[0]
}

/** 读取 .xlsx / .xls / .csv / .tsv 字节流为二维表 */
export async function parseSpreadsheetBytes(bytes: Uint8Array, filename = ''): Promise<string[][]> {
  // 旧版二进制 OLE2 BIFF8 .xls（D0 CF 11 E0）给出明确中文指引
  if (bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    throw new Error(`文件「${filename || '上传文件'}」为旧版二进制表格格式，请先在办公软件中另存为标准表格（.xlsx）或逗号分隔文件（.csv）后再导入`)
  }

  // ZIP 文件头 PK\x03\x04 -> 标准 .xlsx
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const entries = await readZipEntries(bytes)
    const dec = new TextDecoder('utf-8')
    const sharedBytes = entries.get('xl/sharedstrings.xml')
    const shared = sharedBytes ? parseSharedStrings(dec.decode(sharedBytes)) : []
    const sheetKey = findFirstSheetKey(entries)
    if (!sheetKey) throw new Error(`未在文件 ${filename} 中找到工作表数据`)
    const sheetXml = dec.decode(entries.get(sheetKey)!)
    return parseWorksheetXml(sheetXml, shared)
  }

  // Excel 2003 XML 或 HTML 导出格式（国内多家银行伪 .xls 常用格式）
  const text = decodeSmartText(bytes)
  if (/<table\b/i.test(text) && /<tr\b/i.test(text)) {
    return parseHtmlTable(text)
  }
  if (/<Workbook\b/i.test(text) && /<Row\b/i.test(text)) {
    const rows: string[][] = []
    for (const r of text.match(/<Row\b[\s\S]*?<\/Row>/gi) || []) {
      const cells = [...r.matchAll(/<Data[^>]*>([\s\S]*?)<\/Data>/gi)].map(m => xmlUnesc(m[1] || '').trim())
      if (cells.some(Boolean)) rows.push(cells)
    }
    if (rows.length) return rows
  }
  return parseDelimitedText(text)
}
