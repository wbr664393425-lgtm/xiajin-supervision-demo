import { computed } from 'vue'
import { defineStore } from 'pinia'
import {
  keywordGroupsSeed,
  mediaSources,
  opinionPostsSeed,
  sourceById,
  topicSeeds,
  type AcceptanceTag,
  type KeywordGroup,
  type MediaSourceId,
  type OpinionCategory,
  type OpinionPost,
  type OpinionTopicSeed,
} from '@/mock/opinion'
import {
  analyzeSimulatedPost,
  build14DaySeries,
  buildReportData,
  findCrossMatches,
  isHistoricalTopic,
  matchKeywords,
  type CrossMatch,
  type CrossSourcePool,
  type OpinionReport,
  type ReportKind,
} from '@/engines/opinion'
import { townName } from '@/mock/geo'
import { registerSearch } from '@/app/search'
import { registerRisk } from './risk'
import { nowText, persisted, today, uid } from './persist'
import { useSystemStore } from './system'
import { useCluesStore } from './clues'
import { useSupervisionStore } from './supervision'
import { useInspectionStore } from './inspection'
import { useArchiveStore } from './outreach'
import { useBankFlowStore } from './bankflow'
import type { RiskLevel } from '@/types'

export type DispositionAction = '转问题线索' | '交办核查督办' | '建议澄清正名' | '非涉纪归档' | '持续关注'

export interface TopicDisposition {
  action: DispositionAction
  time: string
  actor: string
  note: string
  archivedReasonType?: string
  clueId?: string
  taskId?: string
  clarifyId?: string
}

export interface TopicOverride {
  title?: string
  level?: RiskLevel | 'info'
  mergedInto?: string
  reason?: string
  updatedAt?: string
  actor?: string
}

export interface PostOverride {
  acceptance?: AcceptanceTag
  category?: OpinionCategory
  topicId?: string
  actor: string
  time: string
}

export interface EnrichedPost extends OpinionPost {
  townName: string
  sourceName: string
  sourceShort: string
  matchedWords: string[]
  matchedGroups: string[]
  effectiveTopicId: string
  effectiveAcceptance: AcceptanceTag
  effectiveCategory: OpinionCategory
  manualTagged: boolean
}

export interface EnrichedTopic {
  id: string
  title: string
  originalTitle: string
  summary: string
  category: OpinionCategory
  acceptance: AcceptanceTag
  level: RiskLevel | 'info'
  town: string
  townName: string
  village?: string
  firstSeen: string
  lastSeen: string
  historical: boolean
  posts: EnrichedPost[]
  postCount: number
  repostCount: number
  platformIds: MediaSourceId[]
  platformCount: number
  snapshotCount: number
  commentCount: number
  primaryPost: EnrichedPost
  entities: { people: string[]; villages: string[]; codes: string[]; companies: string[] }
  crossMatches: CrossMatch[]
  disposition?: TopicDisposition
  statusBucket: 'pending' | 'handled' | 'historical'
  statusText: string
  override?: TopicOverride
}

export interface KeywordAuditItem {
  id: string
  time: string
  actor: string
  groupName: string
  detail: string
}

export const useOpinionStore = defineStore('opinion', () => {
  const system = useSystemStore()
  const clues = useCluesStore()
  const sup = useSupervisionStore()
  const insp = useInspectionStore()
  const archive = useArchiveStore()
  const bankflow = useBankFlowStore()

  const addedPosts = persisted<OpinionPost[]>('opinion.addedPosts', () => [])
  const addedTopics = persisted<OpinionTopicSeed[]>('opinion.addedTopics', () => [])
  const keywordGroups = persisted<KeywordGroup[]>('opinion.keywords', () => JSON.parse(JSON.stringify(keywordGroupsSeed)))
  const dispositions = persisted<Record<string, TopicDisposition>>('opinion.dispositions', () => {
    const seed: Record<string, TopicDisposition> = {}
    for (const t of topicSeeds) {
      if (t.seedDisposition) seed[t.id] = { ...t.seedDisposition }
    }
    return seed
  })
  const topicOverrides = persisted<Record<string, TopicOverride>>('opinion.topicOverrides', () => ({}))
  const postOverrides = persisted<Record<string, PostOverride>>('opinion.postOverrides', () => ({}))
  const keywordLogs = persisted<KeywordAuditItem[]>('opinion.kwLogs', () => [
    { id: 'KWL-01', time: '2026-11-05 09:20', actor: '监督专员', groupName: '校园餐与民生救助词包', detail: '新增重点监测词「配送价」「陪餐」' },
    { id: 'KWL-02', time: '2026-11-03 16:05', actor: '管理员', groupName: '农村集体“三资”监管词包', detail: '新增噪词排除「房屋中介」「个人出租」' },
  ])
  const savedReports = persisted<OpinionReport[]>('opinion.reports', () => [])
  const reportLlmDrafts = persisted<Record<string, string>>('opinion.reportDrafts', () => ({}))

  /** 主站实时跨库数据池 */
  const crossPool = computed<CrossSourcePool>(() => ({
    clues: clues.list
      .filter(c => !c.state.invalid && !c.state.mergedInto)
      .map(c => ({
        id: c.id,
        content: c.content,
        town: c.town,
        village: c.village,
        accused: c.parsed.fields.accused.value,
        issue: c.parsed.fields.issue.value,
        codes: c.parsed.codes,
        receivedAt: c.receivedAt,
        level: c.grading.level,
      })),
    findings: sup.all.map(f => ({
      id: f.id,
      feature: f.feature,
      rule: f.rule,
      title: f.title,
      subject: f.subject,
      town: f.town,
      level: f.level,
      evidenceText: f.evidence.map(e => e.value).join(' '),
    })),
    inspDocs: insp.docs.map(d => ({
      id: d.id,
      title: d.title,
      target: d.target,
      excerpt: d.text.slice(0, 120),
    })),
    cadres: archive.list.map(c => ({
      id: c.id,
      name: c.name,
      title: c.title,
      unit: c.unit,
      town: c.town,
      openCount: c.records.filter(r => r.open).length,
      cleanNote: '个人事项与经济责任审计均未见异常（客观归集）',
    })),
    bankHits: bankflow.allAlertTransactions.map(({ batch, tx }) => ({
      id: tx.id,
      subject: batch.subjectName,
      counterparty: tx.counterparty,
      amount: tx.amount,
      summary: tx.summary,
    })),
  }))

  /** 解析合并链条后的最终归属话题 ID */
  function resolveTopicId(id: string): string {
    let cur = id
    const seen = new Set<string>()
    while (topicOverrides.value[cur]?.mergedInto && !seen.has(cur)) {
      seen.add(cur)
      cur = topicOverrides.value[cur]!.mergedInto!
    }
    return cur
  }

  /** 全部公开舆情帖文（实时叠加词包命中与人工标签纠偏） */
  const posts = computed<EnrichedPost[]>(() => {
    const raw = [...addedPosts.value, ...opinionPostsSeed]
    return raw
      .map(p => {
        const ov = postOverrides.value[p.id]
        const hits = matchKeywords(`${p.title} ${p.content} ${p.originalContent || ''}`, keywordGroups.value)
        const src = sourceById(p.sourceId)
        const effectiveTopicId = resolveTopicId(ov?.topicId || p.topicId)
        return {
          ...p,
          townName: townName(p.town),
          sourceName: src.name,
          sourceShort: src.short,
          matchedWords: [...new Set(hits.flatMap(h => h.words))],
          matchedGroups: hits.map(h => h.groupName),
          effectiveTopicId,
          effectiveAcceptance: ov?.acceptance || p.acceptance,
          effectiveCategory: ov?.category || p.category,
          manualTagged: Boolean(ov),
        }
      })
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  })

  /** 全部活跃与历史话题（含合并后重新聚合、跨库印证与三态分桶） */
  const topics = computed<EnrichedTopic[]>(() => {
    const seeds = [...addedTopics.value, ...topicSeeds]
    const out: EnrichedTopic[] = []
    for (const seed of seeds) {
      const ov = topicOverrides.value[seed.id]
      if (ov?.mergedInto) continue
      const members = posts.value.filter(p => p.effectiveTopicId === seed.id)
      if (!members.length) continue
      const sortedAsc = [...members].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
      const firstSeen = sortedAsc[0]!.publishedAt.slice(0, 10)
      const lastSeen = sortedAsc[sortedAsc.length - 1]!.publishedAt.slice(0, 10)
      const historical = isHistoricalTopic(lastSeen, today())
      const platformIds = [...new Set(members.map(m => m.sourceId))]
      const repostCount = members.reduce((s, m) => s + m.reposts.length, 0)
      const snapshotCount = members.filter(m => m.evidenceStatus !== '原帖在架').length
      const commentCount = members.reduce((s, m) => s + m.comments.length, 0)
      const primaryPost = [...members].sort((a, b) => {
        const sa = (a.evidenceStatus !== '原帖在架' ? 5000 : 0) + a.engagement.reads
        const sb = (b.evidenceStatus !== '原帖在架' ? 5000 : 0) + b.engagement.reads
        return sb - sa
      })[0]!

      const entities = {
        people: [...new Set([...seed.entities.people, ...members.flatMap(m => m.entities.people)])],
        villages: [...new Set([...seed.entities.villages, ...members.flatMap(m => m.entities.villages)])],
        codes: [...new Set([...seed.entities.codes, ...members.flatMap(m => m.entities.codes)])],
        companies: [...new Set([...seed.entities.companies, ...members.flatMap(m => m.entities.companies)])],
      }
      const crossMatches = findCrossMatches(entities, seed.town, crossPool.value)
      const disp = dispositions.value[seed.id]
      const statusBucket: EnrichedTopic['statusBucket'] = historical
        ? 'historical'
        : disp && disp.action !== '持续关注'
          ? 'handled'
          : 'pending'

      const statusText = historical
        ? `历史沉底 · ${disp?.action || '已平息'}`
        : disp
          ? `${disp.action}${disp.clueId ? `（${disp.clueId}）` : disp.taskId ? `（${disp.taskId}）` : ''}`
          : '待人工研判'

      out.push({
        id: seed.id,
        title: ov?.title || seed.title,
        originalTitle: seed.title,
        summary: seed.summary,
        category: seed.category,
        acceptance: seed.acceptance,
        level: ov?.level || seed.baseLevel,
        town: seed.town,
        townName: townName(seed.town),
        village: seed.village,
        firstSeen,
        lastSeen,
        historical,
        posts: members,
        postCount: members.length,
        repostCount,
        platformIds,
        platformCount: platformIds.length,
        snapshotCount,
        commentCount,
        primaryPost,
        entities,
        crossMatches,
        disposition: disp,
        statusBucket,
        statusText,
        override: ov,
      })
    }
    const order = { high: 0, mid: 1, low: 2, info: 3 }
    return out.sort((a, b) => (order[a.level] - order[b.level]) || b.lastSeen.localeCompare(a.lastSeen))
  })

  const postById = (id: string) => posts.value.find(p => p.id === id)
  const topicById = (id: string) => topics.value.find(t => t.id === resolveTopicId(id))

  /** 单条帖文的跨库印证 */
  function postCrossMatches(post: EnrichedPost): CrossMatch[] {
    return findCrossMatches(post.entities, post.town, crossPool.value)
  }

  /** 近 14 日活跃统计与一句话态势结论 */
  const recentPosts = computed(() => posts.value.filter(p => !isHistoricalTopic(p.publishedAt.slice(0, 10), today())))
  const activeTopics = computed(() => topics.value.filter(t => !t.historical))
  const pendingTopics = computed(() => topics.value.filter(t => t.statusBucket === 'pending'))
  const handledTopics = computed(() => topics.value.filter(t => t.statusBucket === 'handled'))
  const historicalTopics = computed(() => topics.value.filter(t => t.statusBucket === 'historical'))
  const highPendingCount = computed(() => pendingTopics.value.filter(t => t.level === 'high').length)
  const midPendingCount = computed(() => pendingTopics.value.filter(t => t.level === 'mid').length)
  const crossMatchedTopics = computed(() => activeTopics.value.filter(t => t.crossMatches.length > 0))
  const snapshotPosts = computed(() => posts.value.filter(p => p.evidenceStatus !== '原帖在架'))
  const series14d = computed(() => build14DaySeries(recentPosts.value, today()))

  const headline = computed(() => {
    const clarifyReady = pendingTopics.value.filter(t => t.category === '涉纪不实传言').length
    if (!pendingTopics.value.length) {
      return `近 14 日属地公开监测平稳，${activeTopics.value.length} 个活跃话题均已完成人工研判分流，系统持续保持公开渠道巡检。`
    }
    return `近 14 日汇集属地公开信息 ${recentPosts.value.length} 条，聚类 ${activeTopics.value.length} 个活跃话题；现有 ${pendingTopics.value.length} 项待研判（红色 ${highPendingCount.value} · 橙色 ${midPendingCount.value}），其中 ${crossMatchedTopics.value.length} 项已与信访/监督库自动印证${clarifyReady ? `，另有 ${clarifyReady} 起疑似不实传言具备核实澄清条件` : ''}。`
  })

  // ───────── 四大人工分流闭环动作（全部真写库 + 审计留痕） ─────────

  function transferToClue(topicId: string, payload: { accused: string; issue: string; content: string; note: string }) {
    const t = topicById(topicId)
    if (!t) return null
    const clueId = clues.register(
      {
        channel: '舆情转办',
        receivedAt: today(),
        town: t.town,
        village: t.village || '村居待核实',
        reporter: `公开舆情研判转办 · ${t.id}`,
        content: payload.content.trim(),
      },
      {
        ...(payload.accused.trim() ? { accused: payload.accused.trim() } : {}),
        ...(payload.issue.trim() ? { issue: payload.issue.trim() } : {}),
      },
    )
    dispositions.value[t.id] = {
      action: '转问题线索',
      time: nowText(),
      actor: system.user,
      note: payload.note.trim() || `经人工研判涉纪要素较明确，已转信访线索库（${clueId}）按程序办理`,
      clueId,
    }
    system.log('opinion', '流转', `${t.title}`, `拟转问题线索入库 ${clueId}（来源：舆情转办）`)
    return clueId
  }

  function createVerifyTask(topicId: string, payload: { assignee: string; deadline: string; note: string }) {
    const t = topicById(topicId)
    if (!t) return null
    const task = system.createTask({
      title: `核查舆情苗头：${t.title}`,
      module: 'opinion',
      feature: 'alerts',
      sourceId: t.id,
      sourceLabel: `涉纪舆情 · ${t.townName}${t.village || ''}`,
      level: t.level === 'info' ? 'low' : t.level,
      assignee: payload.assignee,
      deadline: payload.deadline,
    })
    dispositions.value[t.id] = {
      action: '交办核查督办',
      time: nowText(),
      actor: system.user,
      note: payload.note.trim() || `已交办 ${payload.assignee} 开展核查督办（${task.id}）`,
      taskId: task.id,
    }
    return task
  }

  function proposeClarification(topicId: string, payload: { targetName: string; basis: string; scope: string }) {
    const t = topicById(topicId)
    if (!t) return null
    const clarifyId = `CQ-${today().slice(0, 4)}-${String(Object.values(dispositions.value).filter(d => d.clarifyId).length + 11).padStart(3, '0')}`
    dispositions.value[t.id] = {
      action: '建议澄清正名',
      time: nowText(),
      actor: system.user,
      note: `对象：${payload.targetName}；范围：${payload.scope}；依据：${payload.basis.trim()}`,
      clarifyId,
    }
    system.log('opinion', '生成', `${t.title}`, `形成澄清正名建议单 ${clarifyId}（对象：${payload.targetName}，须按程序审批实施）`)
    return clarifyId
  }

  function archiveNonDiscipline(topicId: string, reasonType: string, reason: string) {
    const t = topicById(topicId)
    if (!t) return false
    if (reason.trim().length < 10) return false
    dispositions.value[t.id] = {
      action: '非涉纪归档',
      time: nowText(),
      actor: system.user,
      archivedReasonType: reasonType,
      note: `【${reasonType}】${reason.trim()}`,
    }
    system.log('opinion', '确认', `${t.title}`, `非涉纪归档（${reasonType}）：${reason.trim()}`)
    return true
  }

  function markFollowUp(topicId: string, note: string) {
    const t = topicById(topicId)
    if (!t) return
    dispositions.value[t.id] = {
      action: '持续关注',
      time: nowText(),
      actor: system.user,
      note: note.trim() || '继续跟踪公开平台动态，视发酵情况再行研判',
    }
    system.log('opinion', '确认', t.title, `标记持续关注：${note.trim() || '保持监测'}`)
  }

  function reopenTopic(topicId: string) {
    const t = topicById(topicId)
    if (!t) return
    delete dispositions.value[t.id]
    system.log('opinion', '修改', t.title, '恢复为待研判状态')
  }

  // ───────── 话题人工纠偏与单帖人工纠偏 ─────────

  function editTopic(topicId: string, patch: { title?: string; level?: RiskLevel | 'info'; reason: string }) {
    const t = topicById(topicId)
    if (!t) return
    topicOverrides.value[t.id] = {
      ...topicOverrides.value[t.id],
      ...(patch.title?.trim() ? { title: patch.title.trim() } : {}),
      ...(patch.level ? { level: patch.level } : {}),
      reason: patch.reason.trim(),
      updatedAt: nowText(),
      actor: system.user,
    }
    system.log('opinion', '修改', t.title, `人工纠偏话题信息：${patch.reason.trim() || '调整标题或关注级别'}`)
  }

  function mergeTopicInto(sourceTopicId: string, targetTopicId: string, reason: string) {
    if (sourceTopicId === targetTopicId) return
    const src = topicById(sourceTopicId), dst = topicById(targetTopicId)
    if (!src || !dst) return
    topicOverrides.value[src.id] = {
      ...topicOverrides.value[src.id],
      mergedInto: dst.id,
      reason: reason.trim() || '同源事件归并',
      updatedAt: nowText(),
      actor: system.user,
    }
    system.log('opinion', '修改', `${src.title} → ${dst.title}`, `人工合并话题：${reason.trim() || '同一事项跨渠道聚合'}`)
  }

  function tagPost(postId: string, acceptance: AcceptanceTag, category?: OpinionCategory) {
    const p = postById(postId)
    if (!p) return
    postOverrides.value[postId] = {
      ...postOverrides.value[postId],
      acceptance,
      category: category || p.effectiveCategory,
      actor: system.user,
      time: nowText(),
    }
    system.log('opinion', '修改', p.title.slice(0, 24), `人工纠正受理标签为「${acceptance}」`)
  }

  function resetPostTag(postId: string) {
    const p = postById(postId)
    if (!p || !postOverrides.value[postId]) return
    delete postOverrides.value[postId]
    system.log('opinion', '修改', p.title.slice(0, 24), '撤销人工标注，交还系统规则判断')
  }

  // ───────── 现场模拟网帖实时研判 & 纳入监测池 ─────────

  function simulatePost(input: { title: string; content: string; sourceId: MediaSourceId; town: string; village: string }) {
    return analyzeSimulatedPost(input.title, input.content, input.sourceId, input.town, input.village, keywordGroups.value, crossPool.value)
  }

  function ingestSimulatedPost(input: { title: string; content: string; sourceId: MediaSourceId; town: string; village: string }) {
    const res = simulatePost(input)
    // 判断是否能并入同村同类别的已有活跃话题，否则创建新话题
    const matchedTopic = activeTopics.value.find(t => t.category === res.category && (t.town === input.town || (input.village && t.village === input.village)))
    let topicId = matchedTopic?.id
    if (!topicId) {
      topicId = `TP-SIM-${String(addedTopics.value.length + 1).padStart(2, '0')}`
      addedTopics.value.unshift({
        id: topicId,
        title: input.title.trim().slice(0, 32),
        summary: res.aiReason,
        category: res.category,
        acceptance: res.acceptance,
        baseLevel: res.level,
        town: input.town,
        village: input.village || undefined,
        firstSeen: today(),
        lastSeen: today(),
        entities: res.entities,
      })
    }
    const postId = `OP-SIM-${String(addedPosts.value.length + 1).padStart(2, '0')}`
    const newPost: OpinionPost = {
      id: postId,
      topicId,
      title: input.title.trim(),
      content: input.content.trim(),
      sourceId: input.sourceId,
      author: '模拟演练样本',
      publishedAt: nowText(),
      capturedAt: nowText(),
      town: input.town,
      village: input.village || undefined,
      category: res.category,
      acceptance: res.acceptance,
      evidenceStatus: '原帖在架',
      reposts: [],
      comments: [],
      engagement: { reads: 120, likes: 8, comments: 2, shares: 1 },
      entities: res.entities,
      aiReason: res.aiReason,
      aiQuote: res.aiQuote,
    }
    addedPosts.value.unshift(newPost)
    system.log('opinion', '生成', newPost.title.slice(0, 24), `现场模拟研判并纳入监测池（${res.acceptance}，碰撞 ${res.crossMatches.length} 项记录）`)
    return { postId, topicId, analysis: res }
  }

  // ───────── 关键词词包实时维护 ─────────

  function addKeyword(groupId: string, word: string, isExclude = false) {
    const w = word.trim()
    const g = keywordGroups.value.find(x => x.id === groupId)
    if (!g || !w) return false
    const arr = isExclude ? g.excludes : g.words
    if (arr.includes(w)) return false
    arr.push(w)
    keywordLogs.value.unshift({ id: uid('KWL'), time: nowText(), actor: system.user, groupName: g.name, detail: `新增${isExclude ? '排除噪词' : '监测词'}「${w}」` })
    system.log('opinion', '修改', g.name, `新增${isExclude ? '噪词' : '关键词'}「${w}」`)
    return true
  }

  function removeKeyword(groupId: string, word: string, isExclude = false) {
    const g = keywordGroups.value.find(x => x.id === groupId)
    if (!g) return
    const arr = isExclude ? g.excludes : g.words
    const idx = arr.indexOf(word)
    if (idx < 0) return
    arr.splice(idx, 1)
    keywordLogs.value.unshift({ id: uid('KWL'), time: nowText(), actor: system.user, groupName: g.name, detail: `移除${isExclude ? '排除噪词' : '监测词'}「${word}」` })
    system.log('opinion', '修改', g.name, `移除${isExclude ? '噪词' : '关键词'}「${word}」`)
  }

  function toggleKeywordGroup(groupId: string) {
    const g = keywordGroups.value.find(x => x.id === groupId)
    if (!g) return
    g.enabled = !g.enabled
    keywordLogs.value.unshift({ id: uid('KWL'), time: nowText(), actor: system.user, groupName: g.name, detail: g.enabled ? '启用词包规则' : '停用词包规则' })
    system.log('opinion', '修改', g.name, g.enabled ? '启用词包' : '停用词包')
  }

  function keywordHitCount(word: string): number {
    return recentPosts.value.filter(p => p.matchedWords.includes(word)).length
  }

  // ───────── 专报实时合成与存档 ─────────

  function buildLiveReport(kind: ReportKind): OpinionReport {
    const base = buildReportData(
      kind,
      topics.value.map(t => ({
        id: t.id,
        title: t.title,
        summary: t.summary,
        category: t.category,
        level: t.level,
        town: t.town,
        village: t.village,
        postCount: t.postCount,
        repostCount: t.repostCount,
        platformCount: t.platformCount,
        statusText: t.statusText,
        primaryPostId: t.primaryPost.id,
        primarySourceId: t.primaryPost.sourceId,
        primaryEvidenceStatus: t.primaryPost.evidenceStatus,
        crossCount: t.crossMatches.length,
        historical: t.historical,
      })),
      posts.value,
      today(),
      nowText(),
    )
    if (reportLlmDrafts.value[base.id]) base.llmDraft = reportLlmDrafts.value[base.id]
    return base
  }

  const presetReports = computed<OpinionReport[]>(() => [
    buildLiveReport('weekly'),
    buildLiveReport('campaign'),
    buildLiveReport('clarify'),
  ])

  const allReports = computed<OpinionReport[]>(() => [...savedReports.value, ...presetReports.value])

  function snapshotReport(kind: ReportKind) {
    const rep = buildLiveReport(kind)
    const archived: OpinionReport = { ...rep, id: `${rep.id}-${savedReports.value.length + 1}`, generatedAt: nowText() }
    savedReports.value.unshift(archived)
    system.log('opinion', '生成', archived.title, `生成并冻结存档专报 ${archived.id}`)
    return archived
  }

  function saveReportLlmDraft(reportId: string, draft: string) {
    reportLlmDrafts.value[reportId] = draft
    const found = savedReports.value.find(r => r.id === reportId)
    if (found) found.llmDraft = draft
  }

  // ───────── 注册到全局检索与县域风险一张图 ─────────

  registerSearch(() => [
    ...topics.value.map(t => ({
      id: t.id,
      title: `${t.title}（${t.townName} · ${t.category}）`,
      type: '涉纪舆情',
      to: `/opinion/alerts?topic=${t.id}`,
    })),
    ...posts.value.slice(0, 24).map(p => ({
      id: p.id,
      title: `${p.title}（${p.sourceShort}）`,
      type: '舆情原声',
      to: `/opinion/feed?post=${p.id}`,
    })),
  ])

  /** 红线：仅将经人工确认转线索/交办核查的涉纪舆情汇入县域风险一张图，未核实网帖绝不污染风险图 */
  registerRisk(() =>
    topics.value
      .filter(t => !t.historical && (t.disposition?.action === '转问题线索' || t.disposition?.action === '交办核查督办'))
      .map(t => ({
        id: `OP-${t.id}`,
        domain: '涉纪舆情',
        town: t.town,
        dept: t.village || '公开舆情研判',
        level: t.level === 'info' ? 'low' : t.level,
        title: `${t.title}（${t.disposition!.action}）`,
        to: `/opinion/alerts?topic=${t.id}`,
        date: t.lastSeen,
        status: 'confirmed' as const,
      })),
  )

  return {
    mediaSources,
    posts,
    recentPosts,
    topics,
    activeTopics,
    pendingTopics,
    handledTopics,
    historicalTopics,
    highPendingCount,
    midPendingCount,
    crossMatchedTopics,
    snapshotPosts,
    series14d,
    headline,
    keywordGroups,
    keywordLogs,
    dispositions,
    postById,
    topicById,
    postCrossMatches,
    transferToClue,
    createVerifyTask,
    proposeClarification,
    archiveNonDiscipline,
    markFollowUp,
    reopenTopic,
    editTopic,
    mergeTopicInto,
    tagPost,
    resetPostTag,
    simulatePost,
    ingestSimulatedPost,
    addKeyword,
    removeKeyword,
    toggleKeywordGroup,
    keywordHitCount,
    allReports,
    presetReports,
    savedReports,
    snapshotReport,
    saveReportLlmDraft,
  }
})
