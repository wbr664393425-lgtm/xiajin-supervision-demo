import { reactive, computed } from 'vue'
import {
  CADRES,
  CASE_FILES,
  FEEDBACK_ISSUES,
  INSP_DOCS,
  ROLES,
  SEED_AUDIT,
  SEED_CLUES,
  SEED_TASKS,
  TODAY,
  townName,
} from './mockData'
import { parseClueText, screenAllSupervision } from './engines'
import type {
  AuditEntry,
  Channel,
  ClueRecord,
  FieldKey,
  FindingDecision,
  PortalPageKey,
  RiskLevel,
  RoleKey,
  VerifyTask,
} from './types'

const STORAGE_KEY = 'xiajin-portal-v4-state'

interface PersistedState {
  role: RoleKey
  activePage: PortalPageKey
  showLoginPortal: boolean
  clues: ClueRecord[]
  tasks: VerifyTask[]
  audits: AuditEntry[]
  findingDecisions: Record<string, FindingDecision>
  rectifyStatus: Record<string, { closed: boolean; note: string; closedAt?: string }>
  linkedCluePairs: string[]
  selectedClueId: string
  selectedTownFilter: string
  panoramaQuery: string
}

function defaultState(): PersistedState {
  return {
    role: 'leader',
    activePage: 'home',
    showLoginPortal: false,
    clues: structuredClone(SEED_CLUES),
    tasks: structuredClone(SEED_TASKS),
    audits: structuredClone(SEED_AUDIT),
    findingDecisions: {
      'AS-SZ-HT-2026-018-unpaid': {
        status: 'confirmed',
        note: '已转第一监督检查室重点核查流水差额',
        by: '监督检查专员',
        at: '2026-10-27 09:20',
      },
      'SB-multi-BT-001': {
        status: 'confirmed',
        note: '已下达核查任务 HC-2026-099',
        by: '监督检查专员',
        at: '2026-10-30 15:02',
      },
    },
    rectifyStatus: {
      'ZG-01': { closed: false, note: '已委托评估租金 58,000 元/年，待签补协议后复核' },
      'ZG-02': { closed: false, note: '仅提交表态性汇报且无佐证附件，已退回重办' },
      'ZG-03': { closed: true, note: '已补齐党员本人签字与党课提纲，人工复核通过', closedAt: '2026-11-02 10:15' },
      'ZG-04': { closed: false, note: '未见合法票据及验收单佐证，待核查' },
      'ZG-05': { closed: false, note: '已补公示照片与监督电话，待人工现场抽检确认' },
    },
    linkedCluePairs: ['XF-2026-0104|XF-2026-0105'],
    selectedClueId: 'XF-2026-0102',
    selectedTownFilter: 'all',
    panoramaQuery: '张某军',
  }
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return { ...defaultState(), ...parsed }
  } catch {
    return defaultState()
  }
}

export const portalState = reactive<PersistedState>(loadState())

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portalState))
  } catch {
    // ignore storage quota failures in private browsing
  }
}

export function nowTimestamp() {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${TODAY} ${hh}:${mm}`
}

export function currentRoleDef() {
  return ROLES.find((r) => r.key === portalState.role) || ROLES[0]!
}

export function appendAudit(action: AuditEntry['action'], target: string, detail: string) {
  const roleDef = currentRoleDef()
  portalState.audits.unshift({
    id: `AU-${Date.now().toString().slice(-5)}`,
    time: nowTimestamp(),
    role: portalState.role,
    user: roleDef.label.split(' ')[0]!,
    action,
    target,
    detail,
  })
  save()
}

export function navigateTo(page: PortalPageKey, opts?: { clueId?: string; town?: string; panoramaQuery?: string }) {
  portalState.activePage = page
  portalState.showLoginPortal = false
  if (opts?.clueId) portalState.selectedClueId = opts.clueId
  if (opts?.town !== undefined) portalState.selectedTownFilter = opts.town
  if (opts?.panoramaQuery) portalState.panoramaQuery = opts.panoramaQuery
  save()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

export function switchRole(roleKey: RoleKey, goDefaultPage = false) {
  portalState.role = roleKey
  portalState.showLoginPortal = false
  const def = ROLES.find((r) => r.key === roleKey)
  if (goDefaultPage && def) portalState.activePage = def.defaultPage
  appendAudit('查看', `角色切换 · ${def?.label || roleKey}`, `切换至 ${def?.dept} 工作视角`)
  save()
}

export function toggleLoginPortal(show: boolean) {
  portalState.showLoginPortal = show
  save()
}

export function resetAllDemoData() {
  const fresh = defaultState()
  Object.assign(portalState, fresh)
  appendAudit('重置', '演示数据恢复初态', '已清除本轮模拟操作记录，恢复原始样例台账')
  save()
}

// ── 信访研判操作 ──
export function addNewClue(payload: { channel: Channel; town: string; village: string; reporter: string; content: string }) {
  const seq = 118 + portalState.clues.length - SEED_CLUES.length
  const id = `XF-2026-${String(seq).padStart(4, '0')}`
  const clue: ClueRecord = {
    id,
    channel: payload.channel,
    receivedAt: TODAY,
    town: payload.town,
    village: payload.village,
    reporter: payload.reporter || '实名/匿名导入',
    content: payload.content.trim(),
    flowStage: '登记受理',
    humanConfirmed: false,
  }
  portalState.clues.unshift(clue)
  portalState.selectedClueId = id
  appendAudit('解析', id, `通过「${payload.channel}」导入新材料并完成智能要素解析`)
  save()
  return clue
}

export function updateClueFieldOverride(clueId: string, key: FieldKey, value: string) {
  const clue = portalState.clues.find((c) => c.id === clueId)
  if (!clue) return
  clue.overrides = { ...(clue.overrides || {}), [key]: value }
  appendAudit('修正', clueId, `人工修订要素「${key}」为：${value || '（空）'}`)
  save()
}

export function confirmClueHuman(clueId: string) {
  const clue = portalState.clues.find((c) => c.id === clueId)
  if (!clue) return
  clue.humanConfirmed = true
  if (clue.flowStage === '登记受理') clue.flowStage = '分办交办'
  appendAudit('确认', clueId, '人工核对 6 项线索要素无误，完成受理确认')
  save()
}

export function toggleClueLink(idA: string, idB: string) {
  const key = [idA, idB].sort().join('|')
  const idx = portalState.linkedCluePairs.indexOf(key)
  if (idx >= 0) {
    portalState.linkedCluePairs.splice(idx, 1)
    appendAudit('关联', `${idA} ↔ ${idB}`, '取消相似线索并案关联标记（保留双方原件）')
  } else {
    portalState.linkedCluePairs.push(key)
    appendAudit('关联', `${idA} ↔ ${idB}`, '人工确认并案关联（保留双方原件，防止漏办重复办）')
  }
  save()
}

export function createVerifyTaskFromClue(clueId: string, assignee: string, deadline: string, level: RiskLevel) {
  const clue = portalState.clues.find((c) => c.id === clueId)
  if (!clue) return null
  clue.humanConfirmed = true
  clue.flowStage = '初步核实'

  const existing = portalState.tasks.find((t) => t.sourceId === clueId)
  if (existing) return existing

  const parsed = parseClueText(clue.content, clue.overrides)
  const task: VerifyTask = {
    id: `HC-2026-${String(101 + portalState.tasks.length).padStart(3, '0')}`,
    title: `核查 ${clue.village}${parsed.fields.accused.value || '相关线索'}（${parsed.fields.issue.value || '待核事项'}）`,
    domain: '信访线索',
    sourcePage: 'clues',
    sourceId: clue.id,
    town: clue.town,
    level,
    assignee,
    deadline,
    status: '处理中',
    createdAt: nowTimestamp(),
  }
  portalState.tasks.unshift(task)
  appendAudit('转核查', `${clueId} → ${task.id}`, `人工确认生成核查任务，交办 ${assignee}，限期 ${deadline}`)
  save()
  return task
}

// ── 大数据穿透疑点处置 ──
export function confirmSupervisionFinding(finding: ReturnType<typeof screenAllSupervision>[number], assignee: string, deadline: string) {
  const roleLabel = currentRoleDef().label.split(' ')[0]!
  portalState.findingDecisions[finding.id] = {
    status: 'confirmed',
    note: `已转 ${assignee} 核查`,
    by: roleLabel,
    at: nowTimestamp(),
  }
  const domainMap = {
    assets: '农村三资',
    subsidy: '惠民资金',
    procurement: '招投标',
    expense: '公务支出',
  } as const
  const existing = portalState.tasks.find((t) => t.sourceId === finding.id)
  if (!existing) {
    const task: VerifyTask = {
      id: `HC-2026-${String(101 + portalState.tasks.length).padStart(3, '0')}`,
      title: finding.title,
      domain: domainMap[finding.tab],
      sourcePage: 'radar',
      sourceId: finding.id,
      town: finding.town,
      level: finding.level,
      assignee,
      deadline,
      status: '处理中',
      createdAt: nowTimestamp(),
    }
    portalState.tasks.unshift(task)
    appendAudit('转核查', `${finding.id} → ${task.id}`, `人工确认「${finding.rule}」疑点，交办 ${assignee}`)
  }
  save()
}

export function dismissSupervisionFinding(findingId: string, reason: string) {
  const roleLabel = currentRoleDef().label.split(' ')[0]!
  portalState.findingDecisions[findingId] = {
    status: 'dismissed',
    note: reason || '经调阅原始凭证核实，暂不构成问题',
    by: roleLabel,
    at: nowTimestamp(),
  }
  appendAudit('排除', findingId, `人工填写理由排除疑点：${reason}`)
  save()
}

export function restoreSupervisionFinding(findingId: string) {
  delete portalState.findingDecisions[findingId]
  appendAudit('确认', findingId, '撤回处置状态，恢复为待人工复核')
  save()
}

// ── 核查任务办结 ──
export function completeVerifyTask(taskId: string, result: string) {
  const task = portalState.tasks.find((t) => t.id === taskId)
  if (!task) return
  task.status = '已完成'
  task.completedAt = nowTimestamp()
  task.result = result.trim() || '经调阅核实，已按程序处理并留存档案。'
  if (task.sourcePage === 'clues') {
    const c = portalState.clues.find((x) => x.id === task.sourceId)
    if (c) c.flowStage = '处置办结'
  }
  appendAudit('办结', task.id, `记录核查结论：${task.result}`)
  save()
}

// ── 巡察整改人工复核销号 ──
export function signOffRectify(issueId: string, passed: boolean, note: string) {
  portalState.rectifyStatus[issueId] = {
    closed: passed,
    note,
    closedAt: passed ? nowTimestamp() : undefined,
  }
  appendAudit(passed ? '复核销号' : '确认', issueId, passed ? `复核通过销号：${note}` : `退回补充整改：${note}`)
  save()
}

// ── 全域共享派生计算（保证所有页面数字 100% 一致） ──
export const allSupervisionFindings = computed(() => screenAllSupervision(TODAY))

export const pendingFindingsCount = computed(
  () => allSupervisionFindings.value.filter((f) => !portalState.findingDecisions[f.id]).length,
)

export const activeTasks = computed(() => portalState.tasks.filter((t) => t.status === '处理中'))
export const overdueTasks = computed(() => activeTasks.value.filter((t) => t.deadline < TODAY))
export const completedTasks = computed(() => portalState.tasks.filter((t) => t.status === '已完成'))

export const pendingClues = computed(() => portalState.clues.filter((c) => !c.humanConfirmed && c.flowStage !== '处置办结'))

export const rectifyOpenCount = computed(
  () => FEEDBACK_ISSUES.filter((i) => !portalState.rectifyStatus[i.id]?.closed).length,
)

export function townshipSummary(townId: string) {
  const townClues = portalState.clues.filter((c) => c.town === townId)
  const townFindings = allSupervisionFindings.value.filter((f) => f.town === townId)
  const townTasks = portalState.tasks.filter((t) => t.town === townId && t.status === '处理中')
  const overdue = townTasks.filter((t) => t.deadline < TODAY).length
  const openRectify = FEEDBACK_ISSUES.filter((i) => i.town === townId && !portalState.rectifyStatus[i.id]?.closed).length
  const highFindings = townFindings.filter((f) => f.level === 'high' && !portalState.findingDecisions[f.id]?.status).length

  const heatScore = townClues.length * 2 + townFindings.length + overdue * 4 + openRectify * 2
  const level: RiskLevel = overdue > 0 || highFindings >= 2 || townClues.length >= 3 ? 'high' : heatScore >= 3 ? 'mid' : 'low'

  return {
    townId,
    name: townName(townId),
    cluesCount: townClues.length,
    findingsCount: townFindings.length,
    activeTasksCount: townTasks.length,
    overdueCount: overdue,
    openRectifyCount: openRectify,
    level,
    clues: townClues,
    findings: townFindings,
    tasks: townTasks,
  }
}

export function createTaskFromPanorama(entityQuery: string, assignee: string, deadline: string) {
  const existing = portalState.tasks.find((t) => t.domain === '全景研判' && t.sourceId === entityQuery)
  if (existing) return existing
  const task: VerifyTask = {
    id: `HC-2026-${String(101 + portalState.tasks.length).padStart(3, '0')}`,
    title: `对「${entityQuery}」开展跨库线索与三资问题初核`,
    domain: '全景研判',
    sourcePage: 'panorama',
    sourceId: entityQuery,
    level: 'high',
    assignee,
    deadline,
    status: '处理中',
    createdAt: nowTimestamp(),
  }
  portalState.tasks.unshift(task)
  appendAudit('转核查', `全景研判 · ${entityQuery} → ${task.id}`, `基于全景透视初核方案下发任务，交办 ${assignee}`)
  save()
  return task
}

export const STATIC_CORPUS = {
  inspDocs: INSP_DOCS,
  feedbackIssues: FEEDBACK_ISSUES,
  caseFiles: CASE_FILES,
  cadres: CADRES,
}
