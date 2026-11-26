// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import Page from './ClueWorkspacePage.vue'
import { usePlatformStore } from '../stores/platform'
import { useClueWorkspaceStore } from '../stores/clue-workspace'

let wrapper: VueWrapper | undefined
beforeEach(() => { localStorage.clear(); document.body.innerHTML = '' })
afterEach(() => { wrapper?.unmount(); wrapper = undefined; document.body.innerHTML = '' })

async function setup(path = '/clues', restored = false) {
  const pinia = createPinia(); setActivePinia(pinia)
  const platform = usePlatformStore(pinia), workspace = useClueWorkspaceStore(pinia)
  if (!restored) workspace.open('XF-2026-0108')
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/clues', component: Page }, { path: '/', component: { template: '<div>监督总览</div>' } }, { path: '/clues/archive', component: { template: '<div>原工作台</div>' } }] })
  await router.push(path); await router.isReady()
  wrapper = mount(Page, { attachTo: document.body, global: { plugins: [pinia, router] } })
  await flushPromises()
  return { router, platform, workspace, wrapper }
}

async function prepare(id = 'XF-2026-0108') {
  const pinia = createPinia(); setActivePinia(pinia)
  const workspace = useClueWorkspaceStore(pinia), platform = usePlatformStore(pinia)
  await workspace.analyze(id)
  workspace.editField(id, 'tenant', '禾川农机服务社')
  for (const key of ['event', 'deadline', 'amount'] as const) workspace.confirmField(id, key)
  for (const relatedId of platform.clueWorkspaces[id]!.relatedIds) workspace.decideRelation(id, relatedId, 'linked')
  workspace.refreshSummary(id); workspace.saveSummary(id)
}

function button(text: string, root = wrapper!) {
  const result = root.findAll('button').find(item => item.text().trim() === text)
  if (!result) throw new Error(`Missing visible control: ${text}`)
  return result
}

describe('clue workbench DOM interactions and route continuity', () => {
  it('keeps an unsaved field edit when opening and returning from contract evidence', async () => {
    await prepare()
    const { router } = await setup('/clues?id=XF-2026-0108&view=work', true)
    await wrapper!.get('#reader-edit-tenant').trigger('click')
    await wrapper!.get('#field-edit-input').setValue('禾川农机服务社（虚构）')
    await button('合同材料').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.panel).toBe('source')
    expect((wrapper!.get('dialog').element as HTMLDialogElement).open).toBe(true)
    await wrapper!.get('.cw-dialog-footer button').trigger('click'); await flushPromises()
    expect(wrapper!.find('dialog').exists()).toBe(false)
    expect((wrapper!.get('#field-edit-input').element as HTMLInputElement).value).toBe('禾川农机服务社（虚构）')
    expect(router.currentRoute.value.query.view).toBe('work')
  })

  it('restores a saved summary directly from its URL and a fresh Pinia instance', async () => {
    await prepare()
    const path = '/clues?id=XF-2026-0108&view=work&panel=summary'
    const first = await setup(path, true)
    const saved = first.platform.clueWorkspaces['XF-2026-0108']!.summary
    expect((wrapper!.get('#cw-summary-text').element as HTMLTextAreaElement).value).toBe(saved)
    wrapper!.unmount(); wrapper = undefined
    await setup(path, true)
    expect(wrapper!.get('#cw-dialog-title').text()).toBe('待复核摘要')
    expect((wrapper!.get('#cw-summary-text').element as HTMLTextAreaElement).value).toBe(saved)
  })

  it('does not reuse another material summary when the route changes to unprocessed material', async () => {
    await prepare()
    const { router } = await setup('/clues?id=XF-2026-0108&panel=summary', true)
    await router.push('/clues?id=XF-2026-0101&panel=summary'); await flushPromises()
    expect(wrapper!.find('#cw-summary-text').exists()).toBe(false)
    expect(router.currentRoute.value.query.panel).toBeUndefined()
    expect(wrapper!.get('.reader-document-heading').text()).toContain('XF-2026-0101')
    expect(wrapper!.get('.reader-bottom-actions .reader-button-primary').text()).toBe('开始辅助提取')
  })

  it('opens the matching source note from a desk field without confirming it', async () => {
    const pinia = createPinia(); setActivePinia(pinia)
    await useClueWorkspaceStore(pinia).analyze('XF-2026-0108')
    const { platform, router } = await setup('/clues?id=XF-2026-0108', true)
    await wrapper!.get('.desk-inspect-button').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.view).toBe('work')
    expect(wrapper!.get('#reader-note-tenant').classes()).toContain('is-located')
    expect(platform.clueWorkspaces['XF-2026-0108']!.fields.tenant.status).toBe('pending')
  })

  it('keeps search in the URL and responds to browser history query changes', async () => {
    const { router } = await setup('/clues?q=租赁')
    const input = wrapper!.get('.desk-clue-search input')
    expect((input.element as HTMLInputElement).value).toBe('租赁')
    await input.setValue('维修'); await new Promise(resolve => setTimeout(resolve, 220)); await flushPromises()
    expect(router.currentRoute.value.query.q).toBe('维修')
    await router.push('/clues?q=补助'); await flushPromises()
    expect((wrapper!.get('.desk-clue-search input').element as HTMLInputElement).value).toBe('补助')
  })

  it('completes new material → extraction → correction → two relation decisions → saved checked submission through controls', async () => {
    const { platform, router } = await setup()
    await wrapper!.get('.desk-new-button').trigger('click'); await flushPromises()
    await button('载入虚构样例').trigger('click')
    await button('登记并开始阅读').trigger('click'); await flushPromises()
    const id = String(router.currentRoute.value.query.id)
    expect(id).toBe('XF-2026-0109')
    let primary = wrapper!.get('.reader-bottom-actions .reader-button-primary')
    expect(primary.attributes('disabled')).toBeUndefined()
    expect(primary.text()).toBe('开始辅助提取')
    await primary.trigger('click')
    expect(wrapper!.get('.reader-bottom-actions .reader-button-primary').attributes('disabled')).toBeDefined()
    expect(wrapper!.get('.reader-bottom-actions .reader-button-primary').text()).toContain('正在辅助提取')
    await new Promise(resolve => setTimeout(resolve, 650)); await flushPromises()
    await wrapper!.get('#reader-edit-tenant').trigger('click')
    await wrapper!.get('#field-edit-input').setValue('禾川农机服务社')
    await button('保存修订').trigger('click')
    for (const control of wrapper!.findAll('.reader-field-actions button').filter(item => item.text() === '确认提取')) await control.trigger('click')
    expect(Object.values(platform.clueWorkspaces[id]!.fields).every(field => field.status === 'confirmed')).toBe(true)
    await button('查看相似材料').trigger('click'); await flushPromises()
    expect(platform.clueWorkspaces[id]!.relatedIds).toHaveLength(2)
    await button('人工关联').trigger('click'); await flushPromises()
    await button('判断下一份材料').trigger('click'); await flushPromises()
    await button('暂不关联').trigger('click'); await flushPromises()
    await button('返回材料审阅').trigger('click'); await flushPromises()
    primary = wrapper!.get('.reader-bottom-actions .reader-button-primary')
    await primary.trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.panel).toBe('summary')
    await button('保存摘要').trigger('click')
    expect(button('提交人工复核').attributes('disabled')).toBeDefined()
    await wrapper!.get('.review-check input').setValue(true)
    await button('提交人工复核').trigger('click')
    expect(platform.clueWorkspaces[id]!.submittedAt).toBeTruthy()
    expect(platform.clues.find(item => item.id === id)?.status).toBe('待复核')
    expect(platform.tasks).toHaveLength(0)
    expect(wrapper!.get('.summary-submitted').text()).toContain('等待复核人处理')
  })
})
