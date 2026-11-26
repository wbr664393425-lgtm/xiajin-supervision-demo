import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Scene, Source, AgentStep } from '@/engines/assistant'
import { llmConfigured, pingLlm } from '@/app/llm'
import { persisted } from './persist'

export interface AiResult { id: string; scene: Scene; input: string; output: string; sources: Source[]; createdAt: string; parentId?: string; refine?: string; note?: string; steps: AgentStep[]; elapsedMs: number; aborted?: boolean; reviewed?: boolean; panel?: boolean; engine?: 'deepseek' | 'local'; reasoning?: string }
export const useAssistantStore = defineStore('assistant', () => {
  const results = persisted<AiResult[]>('assistant.results', () => [])
  const engine = persisted<'deepseek' | 'local'>('assistant.engine', () => llmConfigured ? 'deepseek' : 'local')
  const thinking = persisted<boolean>('assistant.thinking', () => false)
  const status = ref<'unknown' | 'checking' | 'online' | 'offline'>(llmConfigured ? 'unknown' : 'offline')
  async function check() { if (!llmConfigured) { status.value = 'offline'; return false } status.value = 'checking'; const ok = await pingLlm(); status.value = ok ? 'online' : 'offline'; return ok }
  return { results, engine, thinking, status, check, configured: llmConfigured }
})
