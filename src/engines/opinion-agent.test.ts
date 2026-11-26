import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useOpinionStore } from '@/stores/opinion'
import {
  buildOpinionAgentContext,
  buildOpinionAgentLocalReport,
  buildOpinionAgentPrompt,
} from './opinion-agent'
import { boundaryCheck } from './prompts'

describe('opinion agent engine', () => {
  it('builds traceable refs and compliant briefing/verify/clarify reports', () => {
    setActivePinia(createPinia())
    const store = useOpinionStore()

    const briefingCtx = buildOpinionAgentContext(store.activeTopics, 'briefing')
    expect(briefingCtx.refs.length).toBeGreaterThan(2)
    expect(briefingCtx.refs.some(r => r.kind === 'post' && Boolean(r.postId))).toBe(true)
    expect(briefingCtx.refs.some(r => r.kind === 'cross' && Boolean(r.to))).toBe(true)

    const briefingText = buildOpinionAgentLocalReport(briefingCtx)
    expect(briefingText).toContain('总体态势判断')
    expect(briefingText).toContain('[1]')
    expect(boundaryCheck(briefingText)).toEqual([])

    const verifyCtx = buildOpinionAgentContext(store.activeTopics, 'verify', 'TP-01')
    const verifyPrompt = buildOpinionAgentPrompt(verifyCtx, '重点关注删帖快照')
    expect(verifyPrompt).toContain('重点关注删帖快照')
    const verifyText = buildOpinionAgentLocalReport(verifyCtx, '重点关注删帖快照')
    expect(verifyText).toContain('证据保全')
    expect(boundaryCheck(verifyText)).toEqual([])

    const clarifyCtx = buildOpinionAgentContext(store.activeTopics, 'clarify', 'TP-05')
    const clarifyText = buildOpinionAgentLocalReport(clarifyCtx)
    expect(clarifyText).toContain('澄清正名')
    expect(boundaryCheck(clarifyText)).toEqual([])
  })
})
