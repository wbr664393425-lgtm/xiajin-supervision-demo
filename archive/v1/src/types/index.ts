import type { ClueWorkspace } from './clue-workspace'
export type Priority = '高关注' | '优先核查' | '一般关注'
export interface Evidence { source: string; excerpt: string; rule: string; question: string }
export interface ClueAnalysis {
  subject: string; category: string; period: string; amount: string; discipline: string[]; keywords: string[];
  related: string[]; summary: string; evidence: Evidence[]; duplicateIds: string[]; duplicateReason?: string; scopeNote?: string;
}
export interface Clue {
  id: string; title: string; area: string; source: string; date: string;
  status: '待研判' | '待人工确认' | '待复核' | '处理中' | '已合并' | '已完成';
  priority: Priority; content: string; analysis?: ClueAnalysis; mergedInto?: string; taskId?: string;
}
export interface Finding {
  id: string; title: string; area: string; domain: string; sourceId: string;
  status: '待核查' | '处理中' | '已完成'; priority: Priority; evidence: Evidence[]; taskId?: string;
}
export interface Contract {
  id: string; asset: string; area: string; tenant: string; start: string; end: string;
  receivable: number; received: number; status: string; paymentNode?: string; clause?: string; historicalRent?: number;
}
export interface Payment { id: string; contractId: string; date: string; amount: number; voucher: string }
export interface InspectionIssue {
  id: string; title: string; area: string; materialId: string; excerpt: string; check: string; suggestion: string;
  status: '待阅卷' | '待整改' | '整改中' | '待复核' | '已销号'; response: string; evidenceAdded: boolean;
  taskId?: string; deadline?: string; assignee?: string;
}
export interface InspectionMaterial { id: string; title: string; type: string; area: string; date: string; content: string }
export interface VerificationTask {
  id: string; source: '信访线索' | '农村三资' | '巡察整改' | 'AI助手'; sourceId: string;
  title: string; area: string; priority: Priority; assignee: string; deadline: string;
  status: '处理中' | '已完成'; createdAt: string; completedAt?: string;
}
export type Task = VerificationTask
export interface AuditEvent { id: string; time: string; action: string; detail: string }
export type Event = AuditEvent
export interface AssistantStepRecord { id: string; label: string; detail: string }
export interface AssistantResult {
  id: string; task: string; type?: string; input: string; output: string; createdAt: string;
  /** 智能体交互：上一版本、调整方式、运行步骤、是否中止、是否已人工审阅 */
  parentId?: string; refine?: string; refineNote?: string; steps?: AssistantStepRecord[]; elapsedMs?: number; aborted?: boolean; reviewed?: boolean;
  [key: string]: unknown
}
export interface PlatformState {
  clues: Clue[]; findings: Finding[]; contracts: Contract[]; payments: Payment[]; issues: InspectionIssue[];
  tasks: VerificationTask[]; events: AuditEvent[]; document: string; assistantResults: AssistantResult[];
  reviewChecked: boolean; reviewApplied: string[]; reviewSummary: string;
  clueWorkspaces: Record<string, ClueWorkspace>; activeClueId: string;
}
