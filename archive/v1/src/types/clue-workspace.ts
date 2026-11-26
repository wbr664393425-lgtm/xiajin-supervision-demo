export type FieldKey = 'tenant' | 'event' | 'deadline' | 'amount'
export type RelationDecision = 'pending' | 'linked' | 'separate' | 'deferred'
export interface WorkspaceField {
  label: string
  value: string
  aiValue: string
  status: 'pending' | 'confirmed'
  lowConfidence: boolean
  sourceText: string
  sourceStart: number
  sourceEnd: number
  revisions: { before: string; after: string; by: string; at: string }[]
}
export interface WorkspaceSnapshot {
  summary: string
  savedAt: string
  confirmedBy: string
  fields: Record<FieldKey, WorkspaceField>
  relations: Record<string, RelationDecision>
  revision: number
}
export interface WorkspaceEvent { id: string; time: string; action: string; detail: string }
export interface ClueWorkspace {
  clueId: string
  phase: 'initial' | 'analyzing' | 'extracted'
  fields: Record<FieldKey, WorkspaceField>
  relatedIds: string[]
  relations: Record<string, RelationDecision>
  summary: string
  summaryStale: boolean
  dirty: boolean
  revision: number
  saved: WorkspaceSnapshot | null
  submittedAt?: string
  events: WorkspaceEvent[]
  updatedAt: string
}
