export type RiskLevel = 'high' | 'mid' | 'low'
export type Decision = 'pending' | 'confirmed' | 'dismissed'
export type ModuleKey = 'home' | 'clues' | 'supervision' | 'inspection' | 'bankflow' | 'cases' | 'archive' | 'opinion' | 'assistant' | 'system'
export type RoleKey = 'leader' | 'xinfang' | 'jiandu' | 'xuncha' | 'shenli'

export interface AuditEntry { id: string; time: string; role: RoleKey; user: string; action: '查看' | '查询' | '生成' | '导出' | '确认' | '修改' | '流转' | '登录' | '重置'; target: string; detail: string; module: ModuleKey }
export interface VerifyTask {
  id: string; title: string; module: ModuleKey; feature: string; sourceId: string; sourceLabel: string
  level: RiskLevel; assignee: string; deadline: string; status: '处理中' | '已完成'; createdAt: string; completedAt?: string; result?: string
}
/** 统一的疑点结构：规则引擎输出，界面展示，人工决定。 */
export interface Finding {
  id: string; module: ModuleKey; feature: string; rule: string; level: RiskLevel; title: string
  subject: string; town?: string; amount?: number; evidence: { label: string; value: string }[]; basis: string; date?: string
}
