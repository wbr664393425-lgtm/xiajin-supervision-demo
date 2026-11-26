/** 廉政档案客观标签与摘要、廉洁教育素材生成、属地舆情聚类。画像只给客观数据，不输出风险定性。 */
import type { RiskLevel } from '@/types'
import type { Cadre, Post } from '@/mock/outreach'
import { similarity } from './text'

// ───────── 廉政档案 ─────────
export interface ObjectiveTag { key: string; label: string; source: string; tone: 'red' | 'orange' | 'blue' | 'gray' | 'green' }
export function objectiveTags(c: Cadre, live: { clues: number; findings: number }): ObjectiveTag[] {
  const by = (s: string) => c.records.filter(r => r.source === s)
  const tags: ObjectiveTag[] = []
  const xf = Math.max(by('信访').length, live.clues)
  if (xf) tags.push({ key: 'xf', label: `近一年被信访反映 ${xf} 次`, source: '信访', tone: xf >= 2 ? 'orange' : 'gray' })
  const xc = by('巡察'); if (xc.length) tags.push({ key: 'xc', label: `巡察发现问题 ${xc.length} 项（未销号 ${xc.filter(r => r.open).length}）`, source: '巡察', tone: xc.some(r => r.open) ? 'orange' : 'gray' })
  if (live.findings) tags.push({ key: 'zj', label: `所在村（单位）资金类疑点 ${live.findings} 条`, source: '资金关联', tone: 'blue' })
  const th = by('谈话函询'); if (th.length) tags.push({ key: 'th', label: `谈话函询 ${th.length} 次`, source: '谈话函询', tone: 'gray' })
  const cf = by('处分'); tags.push(cf.length ? { key: 'cf', label: `组织处理 / 处分 ${cf.length} 次（${cf.map(r => r.result.split('，')[0]).join('；')}）`, source: '处分', tone: 'gray' } : { key: 'cf', label: '无党纪政务处分记录', source: '处分', tone: 'green' })
  const sj = by('审计'); if (sj.length) tags.push({ key: 'sj', label: `审计 ${sj.length} 次：${sj.map(r => r.result).join('；')}`, source: '审计', tone: 'gray' })
  const gr = by('个人事项'); if (gr.length) tags.push({ key: 'gr', label: gr.some(r => /漏报/.test(r.result)) ? '个人事项报告有漏报，已更正' : '个人事项报告核查一致', source: '个人事项', tone: gr.some(r => /漏报/.test(r.result)) ? 'orange' : 'green' })
  const open = c.records.filter(r => r.open).length; if (open) tags.push({ key: 'open', label: `尚有 ${open} 件事项未办结`, source: '综合', tone: 'red' })
  return tags
}
export function archiveSummary(c: Cadre, tags: ObjectiveTag[]) {
  const lines = c.records.slice().sort((a, b) => b.date.localeCompare(a.date)).map(r => `${r.date}，${r.source}：${r.title}，${r.result}。`)
  return [`${c.name}廉政情况摘要（初稿）`, '', `基本情况：${c.name}，现任${c.unit}${c.title}，${c.since.replace('-', '年')}月起任职。`, '', '一、档案记录', ...lines.map((l, i) => `${i + 1}. ${l}`), '', '二、客观数据标签', ...tags.map(t => `· ${t.label}`), '', '三、说明', '本摘要由系统自动汇聚信访、谈话函询、巡察、处分、审计、个人事项等数据生成，仅反映客观记录。未办结事项不代表问题属实。廉政意见由党风政风监督部门研究提出，系统不作廉政风险定性。'].join('\n')
}
export function integrityOpinion(c: Cadre, tags: ObjectiveTag[], post: string) {
  return [`关于${c.name}同志拟任${post || '（拟任职务）'}的廉政意见回复（辅助材料）`, '', `经查询廉政档案，${c.name}同志相关情况如下：`, ...tags.map((t, i) => `${i + 1}. ${t.label}（来源：${t.source}）`), '', `其中尚未办结的事项：${c.records.filter(r => r.open).map(r => r.title).join('；') || '无'}。`, '', '廉政意见：（由党风政风监督室结合问题线索办理情况集体研究提出，本辅助材料不作结论）', '', '说明：本材料由系统汇总客观数据生成，供出具廉政意见时参考。'].join('\n')
}

// ───────── 廉洁教育素材 ─────────
export function generateMaterial(type: string, picked: { title: string; lesson: string; fact: string; result: string; area: string }[], theme: string, audience: string) {
  const list = picked.length ? picked : []
  const names = list.map(c => c.title).join('、')
  const t = theme || '守纪律 讲规矩 筑牢廉洁防线'
  switch (type) {
    case '警示教育通报': return [`关于${list.length}起违纪典型问题的通报（初稿）`, '', `各乡镇（街道）党（工）委、县直各部门：`, `为深化以案促改，现将近期查处的${list.length}起典型问题通报如下：`, ...list.map((c, i) => `${'一二三四五'[i]}、${c.title}。${c.fact}处理结果：${c.result}。`), '', `上述问题暴露出一些党员干部纪律意识淡薄、${[...new Set(list.map(c => c.area))].join('、')}领域监管存在薄弱环节。各级党组织要引以为戒，聚焦“${t}”，举一反三抓好整改。`, '', '（本通报为辅助生成初稿，案例均为虚构样例，正式印发须经审核）'].join('\n')
    case '廉政党课提纲': return [`廉政党课提纲：${t}`, `授课对象：${audience}`, '', '一、开篇：从身边案说起', ...list.map(c => `  · ${c.title}——${c.lesson}`), '', '二、深刻剖析问题根源', '  1. 理想信念动摇，宗旨意识淡化', '  2. 权力观错位，把公权当私器', '  3. 监督制约不到位，程序空转', '', '三、明确纪律要求', ...[...new Set(list.map(c => c.area))].map(a => `  · ${a}领域的规矩与红线`), '', '四、结语：知敬畏、存戒惧、守底线', '', '（提纲为辅助生成初稿，授课前请结合本单位实际修改）'].join('\n')
    case '案例剖析': return list.map(c => [`【案例剖析】${c.title}`, `基本案情：${c.fact}`, `处理结果：${c.result}`, `问题剖析：${c.lesson}。从制度层面看，${c.area}领域存在决策不公开、监督不到位等漏洞。`, `警示启示：以案为鉴，把纪律挺在前面，把制度执行到位。`].join('\n')).join('\n\n') + '\n\n（剖析材料为辅助生成初稿，需人工审核）'
    case '短视频脚本': return [`短视频脚本：《${t}》（约 60 秒）`, `目标受众：${audience}`, '', '镜头1（0-8秒）｜村部外景，字幕：“一份合同，一笔租金……”', ...list.slice(0, 2).map((c, i) => `镜头${i + 2}（${8 + i * 18}-${26 + i * 18}秒）｜情景再现：${c.fact.slice(0, 40)}…  旁白：“${c.lesson}。”`), `镜头4（44-55秒）｜纪检干部调阅账目画面，字幕：“伸手必被捉”`, '镜头5（55-60秒）｜片尾：举报渠道与标语“清清白白做人 干干净净干事”', '', '（脚本为辅助生成初稿，拍摄须经审核；案例为虚构，不得使用真实人物形象）'].join('\n')
    default: return [`主标题：${t}`, `副标题：${list[0]?.lesson || '廉洁从政 从我做起'}`, '', '标语建议：', '  · 集体资产是大家的，不是干部的', '  · 惠民资金一分一厘都要用在群众身上', '  · 微权力也要晒在阳光下', '', `落款：夏津县纪委监委（宣传用语初稿，需审核后使用）`].join('\n')
  }
}

// ───────── 舆情聚类 ─────────
export const topicDict: { topic: string; category: '作风问题' | '基层治理' | '民生诉求'; re: RegExp }[] = [
  { topic: '服务站办事作风', category: '作风问题', re: /服务站|站长|办事|态度|请吃饭|玩手机/ },
  { topic: '集体资产出租不透明', category: '基层治理', re: /集体资产|集体场地|出租|租给|合同/ },
  { topic: '低保评定公平性', category: '基层治理', re: /低保|评议|评定/ },
  { topic: '干部吃喝', category: '作风问题', re: /吃饭|饭店|吃喝/ },
  { topic: '村级工程质量与承揽', category: '基层治理', re: /工程|修的路|验收|同一家公司/ },
  { topic: '社区公共服务', category: '民生诉求', re: /路灯|垃圾|老旧小区|改造/ },
]
const NEG = /差|拖|不公开|怨气|不安全|阴阳怪气|没人|太差|不开会|说了算|卡/
export interface Cluster { topic: string; category: string; posts: Post[]; heat: number; towns: string[]; negative: number; level: RiskLevel | null; first: string; last: string }
export function clusterPosts(list: Post[]): Cluster[] {
  const groups = topicDict.map(t => ({ t, posts: list.filter(p => t.re.test(p.text)) }))
  const used = new Set(groups.flatMap(g => g.posts.map(p => p.id)))
  const rest = list.filter(p => !used.has(p.id))
  const clusters: Cluster[] = groups.filter(g => g.posts.length).map(g => {
    const heat = g.posts.reduce((s, p) => s + p.heat, 0), negative = g.posts.filter(p => NEG.test(p.text)).length
    const times = g.posts.map(p => p.time).sort()
    const level: RiskLevel | null = g.t.category === '作风问题' && g.posts.length >= 3 ? 'high' : g.posts.length >= 3 && negative >= 2 ? 'mid' : negative >= 1 ? 'low' : null
    return { topic: g.t.topic, category: g.t.category, posts: g.posts, heat, towns: [...new Set(g.posts.map(p => p.town))], negative, level, first: times[0]!, last: times.at(-1)! }
  })
  if (rest.length) clusters.push({ topic: '其他（未聚类）', category: '其他', posts: rest, heat: rest.reduce((s, p) => s + p.heat, 0), towns: [...new Set(rest.map(p => p.town))], negative: 0, level: null, first: rest[0]!.time, last: rest.at(-1)!.time })
  return clusters.sort((a, b) => (a.level ? { high: 0, mid: 1, low: 2 }[a.level] : 3) - (b.level ? { high: 0, mid: 1, low: 2 }[b.level] : 3) || b.heat - a.heat)
}
export const nearDuplicate = (a: Post, b: Post) => similarity(a.text, b.text) > 0.5
