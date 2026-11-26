// 旧版演示记录按全称的 FNV-1a 指纹匹配，发布包无需携带真实乡镇名称对照表。
const legacyNames = new Map<number, string>([
  [0xcead141f, '乡镇A'], [0x0686f3fa, '乡镇B'], [0x31f8291d, '乡镇C'],
  [0xeab92d22, '乡镇D'], [0x78c8355c, '乡镇E'], [0x87b1ee35, '乡镇F'],
  [0xb3d09c0b, '乡镇G'], [0x6ac156d6, '乡镇H'], [0x88032e1f, '乡镇I'],
  [0xbc077ee3, '乡镇J'], [0x322159a9, '乡镇K'], [0x532ffd4b, '乡镇L'],
  [0x07663ee5, '乡镇M'], [0xa3c99970, '乡镇N'],
])

function fingerprint(name: string) {
  let hash = 2166136261
  for (let i = 0; i < name.length; i++) hash = Math.imul(hash ^ name.charCodeAt(i), 16777619)
  return hash >>> 0
}

// 在原始 JSON 上转换，连同包含单位名的疑点编号、字典键一起更新，保留办理状态。
export function replaceLegacyTownNames(text: string) {
  let result = '', cursor = 0
  for (const match of text.matchAll(/街道|镇|乡/g)) {
    const suffix = match.index!
    const end = suffix + match[0].length
    for (let length = 4; length >= 2; length--) {
      const start = suffix - length
      if (start < cursor) continue
      const alias = legacyNames.get(fingerprint(text.slice(start, end)))
      if (!alias) continue
      result += text.slice(cursor, start) + alias
      cursor = end
      break
    }
  }
  return cursor ? result + text.slice(cursor) : text
}
