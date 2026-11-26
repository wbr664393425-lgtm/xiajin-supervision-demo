export type PortalPageKey = 'home' | 'clues' | 'radar' | 'inspection' | 'panorama'

export type RiskLevel = 'high' | 'mid' | 'low'

export type RoleKey = 'leader' | 'xinfang' | 'jiandu' | 'xuncha' | 'shenli'

export interface RoleDef {
  key: RoleKey
  label: string
  dept: string
  summary: string
  defaultPage: PortalPageKey
}

export type Channel = '来信' | '来访' | '12345工单' | '网络举报'

export interface Span {
  start: number
  end: number
}

export type FieldKey = 'accused' | 'unit' | 'issue' | 'time' | 'amount' | 'demand'

export interface ParsedField {
  key: FieldKey
  label: string
  value: string
  span?: Span
  confidence: 'high' | 'low'
  humanEdited?: boolean
}

export interface ClueRecord {
  id: string
  channel: Channel
  receivedAt: string
  town: string
  village: string
  reporter: string
  content: string
  flowStage: '登记受理' | '分办交办' | '初步核实' | '处置办结'
  humanConfirmed?: boolean
  overrides?: Partial<Record<FieldKey, string>>
}

export interface VerifyTask {
  id: string
  title: string
  domain: '信访线索' | '农村三资' | '惠民资金' | '招投标' | '公务支出' | '智能巡察' | '全景研判'
  sourcePage: PortalPageKey
  sourceId: string
  town?: string
  level: RiskLevel
  assignee: string
  deadline: string
  status: '处理中' | '已完成'
  createdAt: string
  completedAt?: string
  result?: string
}

export interface AuditEntry {
  id: string
  time: string
  role: RoleKey
  user: string
  action: '查看' | '解析' | '修正' | '确认' | '关联' | '排除' | '转核查' | '办结' | '复核销号' | '重置'
  target: string
  detail: string
}

export type RadarTabKey = 'assets' | 'subsidy' | 'procurement' | 'expense'

export interface SupervisionFinding {
  id: string
  tab: RadarTabKey
  rule: string
  level: RiskLevel
  title: string
  subject: string
  town?: string
  amount?: number
  date?: string
  sourceSystem: string
  evidence: { label: string; value: string }[]
  basis: string
}

export interface FindingDecision {
  status: 'pending' | 'confirmed' | 'dismissed'
  note?: string
  by?: string
  at?: string
}

export interface InspDoc {
  id: string
  target: string
  town: string
  kind: '会议记录' | '三重一大' | '党建材料' | '财务凭证' | '公示记录'
  title: string
  date: string
  text: string
}

export interface FeedbackIssue {
  id: string
  category: string
  title: string
  detail: string
  owner: string
  town: string
  deadline: string
  keywords: string[]
}

export interface CaseMaterial {
  id: string
  type: '谈话笔录' | '书证' | '录音转写' | '扫描件'
  title: string
  text: string
}

export interface CaseFile {
  id: string
  title: string
  accused: string
  role: string
  violation: string
  stage: '初核' | '审查调查' | '审理'
  filedAt: string
  evidence: string[]
  procedures: Record<string, string | null>
  materials: CaseMaterial[]
}

export interface KbEntry {
  id: string
  type: '条款要点' | '典型案例' | '本地规范' | '工作指引'
  title: string
  source: string
  content: string
  tags: string[]
}

export interface Cadre {
  id: string
  name: string
  title: string
  unit: string
  town: string
  level: '村（社区）干部' | '乡科级' | '站所负责人'
  since: string
  records: {
    source: '信访' | '谈话函询' | '巡察' | '处分' | '审计' | '个人事项'
    date: string
    title: string
    result: string
    open?: boolean
  }[]
}

export interface PublicOpinionPost {
  id: string
  platform: '本地论坛' | '政务留言板' | '短视频评论' | '社区群（授权采集）'
  time: string
  town: string
  text: string
  heat: number
}
