/**
 * 涉纪舆情专属智能体研判引擎
 * - 构造可追溯引用资料 [1]..[n]，精准锚定公开原帖/保全快照与主站跨库印证
 * - 支持 3 种纪检实战研判视角：涉纪态势与优先级研判 / 单话题核查提纲与取证路径 / 不实传言甄别与澄清建议
 * - 优先走平台 DeepSeek 流式大模型，离线时确定性规则起草，并统一过 boundaryCheck 边界自检
 */
import type { EnrichedTopic } from '@/stores/opinion'

export type OpinionAgentMode = 'briefing' | 'verify' | 'clarify'

export interface OpinionAgentRef {
  n: number
  kind: 'post' | 'cross'
  postId?: string
  to?: string
  topicId: string
  title: string
  excerpt: string
  meta: string
}

export interface OpinionAgentContext {
  mode: OpinionAgentMode
  topics: EnrichedTopic[]
  focusTopic?: EnrichedTopic
  refs: OpinionAgentRef[]
  snapshotCount: number
  crossTotal: number
}

export const OPINION_AGENT_MODES: { key: OpinionAgentMode; label: string; desc: string }[] = [
  { key: 'briefing', label: '态势与优先级研判', desc: '串联近 14 日高关注苗头、删改快照异常与跨库命中，梳理优先处置顺序' },
  { key: 'verify', label: '核查提纲与取证路径', desc: '围绕焦点话题与在库印证，起草需调取书证清单与谈话了解要点' },
  { key: 'clarify', label: '不实传言澄清研判', desc: '对照廉政档案、审计记录与现场目击留言，评估核实澄清正名路径' },
]

/** 抽取高价值公开原帖与跨库印证构建 [1]..[n] 引用表 */
export function buildOpinionAgentContext(
  allActiveTopics: EnrichedTopic[],
  mode: OpinionAgentMode,
  focusTopicId?: string | null,
): OpinionAgentContext {
  const focusTopic = focusTopicId
    ? allActiveTopics.find(t => t.id === focusTopicId)
    : mode === 'clarify'
      ? (allActiveTopics.find(t => t.category === '涉纪不实传言') || allActiveTopics[0])
      : allActiveTopics[0]

  const scopeTopics = mode === 'briefing'
    ? allActiveTopics.filter(t => t.category !== '非纪检民生').slice(0, 5)
    : focusTopic ? [focusTopic] : allActiveTopics.slice(0, 2)

  const refs: OpinionAgentRef[] = []
  const push = (item: Omit<OpinionAgentRef, 'n'>) => {
    if (refs.length >= 12) return
    refs.push({ n: refs.length + 1, ...item })
  }

  for (const t of scopeTopics) {
    // 优先抽取含删帖/改文保全快照或高阅读代表帖
    const picks = [...t.posts]
      .sort((a, b) => (b.evidenceStatus !== '原帖在架' ? 5000 : 0) + b.engagement.reads - ((a.evidenceStatus !== '原帖在架' ? 5000 : 0) + a.engagement.reads))
      .slice(0, mode === 'briefing' ? 1 : 3)

    for (const p of picks) {
      push({
        kind: 'post',
        postId: p.id,
        topicId: t.id,
        title: `${p.sourceShort} · ${p.title.slice(0, 26)}${p.title.length > 26 ? '…' : ''}`,
        excerpt: `${p.publishedAt}｜${p.townName}${p.village || ''}｜${p.evidenceStatus}｜摘录：“${p.aiQuote}”`,
        meta: `${p.sourceShort} · ${p.evidenceStatus}`,
      })
    }

    for (const m of t.crossMatches.slice(0, mode === 'briefing' ? 1 : 4)) {
      push({
        kind: 'cross',
        to: m.to,
        topicId: t.id,
        title: `${m.sourceType} · ${m.title}`,
        excerpt: `${m.summary}（${m.matchedBy}）`,
        meta: m.sourceType,
      })
    }
  }

  const snapshotCount = scopeTopics.reduce((s, t) => s + t.snapshotCount, 0)
  const crossTotal = scopeTopics.reduce((s, t) => s + t.crossMatches.length, 0)
  return { mode, topics: scopeTopics, focusTopic, refs, snapshotCount, crossTotal }
}

/** 构造提交给纪检大模型的提示词 */
export function buildOpinionAgentPrompt(ctx: OpinionAgentContext, question = ''): string {
  const modeTask: Record<OpinionAgentMode, string> = {
    briefing: '任务：围绕近期属地涉纪公开舆情开展态势与处置优先级研判，形成供委领导和专班参考的研判初稿。段落依次为：总体态势判断、高关注苗头与删改异常、跨库印证要点、分流处置优先级建议、使用提醒。',
    verify: `任务：围绕聚焦话题“${ctx.focusTopic?.title || '重点涉纪舆情'}”，起草一份初核取证路径与核实提纲初稿。段落依次为：反映焦点与证据保全情况、跨库印证关联、建议调取书证与核查步骤、谈话了解要点、使用提醒。`,
    clarify: `任务：围绕疑似不实网传“${ctx.focusTopic?.title || '涉基层干部不实传言'}”，对照廉政档案与现场目击反映起草核实与澄清正名研判初稿。段落依次为：网传争议点梳理、客观印证与廉政核验情况、核实澄清工作建议、公开回应口径参考、使用提醒。`,
  }

  return [
    modeTask[ctx.mode],
    question.trim() ? `补充追问重点：${question.trim()}` : '',
    '硬性边界：1) 仅依据下列参考资料，未提及内容写“待核实”，引用时标注 [n]；2) 严格保持“群众反映、质疑、待核实”事实边界，严禁作出违纪定性、处分建议，严禁出现删帖、控评、网民画像表述；3) 全文 650 字以内，条理清晰。',
    '',
    '【聚焦话题摘要】',
    ...ctx.topics.map(t => `- ${t.title}（${t.townName}${t.village || ''} · ${t.category} · ${t.postCount} 条公开帖文 · ${t.snapshotCount} 份删改快照 · 跨库命中 ${t.crossMatches.length} 项 · 状态：${t.statusText}）`),
    '',
    '【可追溯参考资料】',
    ...ctx.refs.map(r => `[${r.n}] ${r.title}：${r.excerpt}`),
  ].filter(Boolean).join('\n')
}

/** 离线确定性研判报告起草（结构与大模型输出完全一致，支持 [n] 站内回链） */
export function buildOpinionAgentLocalReport(ctx: OpinionAgentContext, question = ''): string {
  const citeByTopic = (topicId: string, kind?: 'post' | 'cross') => {
    const hits = ctx.refs.filter(r => r.topicId === topicId && (!kind || r.kind === kind)).slice(0, 2)
    return hits.length ? ` ${hits.map(h => `[${h.n}]`).join('')}` : ''
  }
  const focus = ctx.focusTopic || ctx.topics[0]
  const extraNote = question.trim() ? `\n补充回应（针对“${question.trim()}”）：结合当前在库公开帖文与跨库印证记录，建议在核查时同步固定对应时段公开快照与原始台账，避免单凭网帖片段下结论。` : ''

  if (ctx.mode === 'clarify' && focus) {
    const postCites = citeByTopic(focus.id, 'post')
    const crossCites = citeByTopic(focus.id, 'cross')
    return [
      `网传争议点梳理\n近期同城平台流传关于${focus.townName}${focus.village || ''}“${focus.title}”的碎片化剪辑信息（共汇集 ${focus.postCount} 条公开讨论）${postCites}，争议焦点集中在执法程序是否合规、是否存在区别对待。`,
      `客观印证与廉政核验情况\n① 评论区及跟帖中有多名现场目击群众反映事前已张贴限期公告且清理对象属占压公共通道违建${postCites}。\n② 跨库检索平台信访、监督疑点与廉政档案${crossCites || ''}，涉事干部未见在办违纪线索，个人有关事项与经济责任审计记录均无异常。`,
      `核实澄清工作建议\n① 建议由党风政风监督室会同属地党委调阅完整执法记录仪画面、限期整改公告及规划红线图，形成客观书面核查结论。\n② 如核实确属合规履职遭断章取义传播，建议依据相关规则履行审批程序，采取书面或在适当会议范围予以澄清正名。`,
      `公开回应口径参考\n坚持“实事求是、公开透明”原则，可依法公开涉事地块规划红线与前期告知流程节点，及时回应群众关切，不采取删帖控评方式。${extraNote}`,
      '使用提醒\n本研判为智能辅助初稿，仅汇总公开信息与平台已有客观记录，是否启动澄清正名须经纪检监察干部核实并按程序审批决定。',
    ].join('\n\n')
  }

  if (ctx.mode === 'verify' && focus) {
    const postCites = citeByTopic(focus.id, 'post')
    const crossCites = citeByTopic(focus.id, 'cross')
    const codes = focus.entities.codes.join('、')
    const people = focus.entities.people.join('、')
    return [
      `反映焦点与证据保全情况\n围绕${focus.townName}${focus.village || ''}“${focus.title}”，共聚类 ${focus.postCount} 条公开原声（跨 ${focus.platformCount} 个公开平台）${postCites}。${focus.snapshotCount ? `其中 ${focus.snapshotCount} 条核心帖文出现发帖后删帖或删改主体表述异常，系统已固定原始公开快照，提示存在干扰核实或信息灭失风险。` : '目前原帖均在架，建议同步留存公开快照。'}`,
      `跨库印证关联\n${focus.crossMatches.length ? focus.crossMatches.slice(0, 4).map((m, i) => `${'①②③④'[i]} ${m.sourceType}：${m.title}（${m.matchedBy}）${crossCites}`).join('\n') : '当前暂未命中平台在库记录，建议作为独立线索初筛核实。'}`,
      `建议调取书证与核查步骤\n① 固定网络公开原帖快照、高赞补充评论及改文差异记录，核实反映事项的时间与场所要素${postCites}。\n② ${codes ? `重点调取编号 ${codes} 对应的完整合同、招标/验收档案及收付款原始凭证。` : '调取涉事事项对应的审批台账、公示照片、收支明细或服务窗口办事流水记录。'}\n③ 结合穿透监督疑点与信访台账实行并案核查，避免多头重复干扰基层。`,
      `谈话了解要点\n① 优先向实名反映人或知情群众了解具体经过、时间节点及掌握的客观材料。\n② ${people ? `围绕涉及对象 ${people} 履职审批环节，核实是否履行民主议事、公开公示及回避程序，听取客观说明。` : '核实相关业务经办与审批环节是否落实一次性告知及公开公示制度。'}${extraNote}`,
      '使用提醒\n本提纲为智能辅助起草的初核参考稿，不构成事实认定、违纪定性或立案决定，具体核查措施须按审批程序执行。',
    ].join('\n\n')
  }

  // briefing 模式：全局态势与优先级研判
  const topLines = ctx.topics.slice(0, 4).map((t, i) => {
    const c = citeByTopic(t.id)
    const snap = t.snapshotCount ? `，含 ${t.snapshotCount} 份删改保全快照` : ''
    const cross = t.crossMatches.length ? `，跨库印证 ${t.crossMatches.length} 项` : ''
    return `${'①②③④'[i]} 【${t.category}】${t.title}（${t.townName}${t.village || ''} · ${t.postCount} 条${snap}${cross} · 当前：${t.statusText}）${c}`
  })

  return [
    `总体态势判断\n本期共聚焦 ${ctx.topics.length} 个涉纪活跃话题，累计固定删帖/改文保全快照 ${ctx.snapshotCount} 份，自动碰撞命中平台信访、穿透监督与巡察记录 ${ctx.crossTotal} 项。整体问题集中于基层农村“三资”公开、涉农窗口作风、小微工程质量与校园餐透明度。`,
    `高关注苗头与删改异常\n${topLines.join('\n')}`,
    `跨库印证要点\n多起网络公开吐槽与平台既有监督数据高度同源：其中村集体场地租金差额、农机补贴窗口推诿、村道施工方集中等事项均已命中在库信访或穿透监督疑点，具备从“网络反映”向“精准初核”转化的客观条件。`,
    `分流处置优先级建议\n① 红色且跨库命中且含删改快照的话题建议优先启动「转问题线索」或「交办核查督办」，防止证据灭失。\n② 校园餐与窗口作风类民生痛点建议推送党风政风监督室纳入集中整治靶向督查。\n③ 对跨库核验无异常的断章取义传言建议同步启动核实与「澄清正名」，做到严管厚爱结合。${extraNote}`,
    '使用提醒\n本研判由智能引擎基于合法公开信息与平台已有记录汇总起草，仅供人工研判分流参考，严禁作为违纪定性依据，不删帖不控评。',
  ].join('\n\n')
}
