// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import BankFlow from './BankFlow.vue'
import { useBankFlowStore } from '@/stores/bankflow'
import { useAssistantStore } from '@/stores/assistant'

describe('BankFlow.vue interactive smoke & regression tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => ({ matches: true, media: '', addEventListener: () => {}, removeEventListener: () => {} }),
    })
  })

  it('opens on batch hub list first, enters workspace on click, filters minAmount safely, and supports ?id= deep link', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/supervision/bankflow', component: BankFlow }],
    })
    await router.push('/supervision/bankflow')
    await router.isReady()

    const wrapper = mount(BankFlow, {
      global: { plugins: [router], stubs: { Teleport: true } },
    })

    // 1. 默认首屏应展示批次列表，不直接摊开某个案子的明细表
    expect(wrapper.text()).toContain('导入新案银行流水')
    expect(wrapper.text()).toContain('进入查账分析')
    expect(wrapper.find('.tbl-wrap').exists()).toBe(false)

    // 2. 点击「进入查账分析」进入单案工作台，且能看到显眼的智能体一键解析条
    const enterBtn = wrapper.findAll('button').find(b => b.text().includes('进入查账分析'))!
    await enterBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('纪检智能体一键解析')
    expect(wrapper.text()).toContain('返回批次列表')

    // 3. 输入最低金额 50000 正常过滤不崩溃
    const minInput = wrapper.find('input[aria-label="最低金额"]')
    await minInput.setValue('50000')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('国网山东电力公司')
    expect(wrapper.text()).toContain('夏润建设工程有限公司')

    // 4. 选中规则筛选后取消勾选该规则，筛选同步清除
    await minInput.setValue('')
    const splitPick = wrapper.findAll('.ms-pick')[2]!
    await splitPick.trigger('click')
    const splitChk = wrapper.find('[aria-label*="化整为零"]')
    await splitChk.trigger('click')
    const store = useBankFlowStore()
    expect(store.overview.ruleCounts.split).toBe(0)
    expect(wrapper.findAll('tbody tr').length).toBeGreaterThan(0)

    wrapper.unmount()
  })

  it('supports ?id= deep link from verify tasks and runs agent directly from batch hub', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/supervision/bankflow', component: BankFlow }],
    })
    await router.push('/supervision/bankflow?id=PC-202610-02-0001')
    await router.isReady()

    const assistant = useAssistantStore()
    assistant.engine = 'local'

    const wrapper = mount(BankFlow, {
      global: { plugins: [router], stubs: { Teleport: true } },
    })

    const store = useBankFlowStore()
    expect(store.currentBatchId).toBe('PC-202610-02')
    expect(wrapper.text()).toContain('和盛村村级工程专户')

    // 点击工作台显眼入口「资金链全景剖析」，展开流式面板并点击 [n] 角标
    const agentBtn = wrapper.findAll('button').find(b => b.text().includes('资金链全景剖析'))!
    await agentBtn.trigger('click')
    await new Promise(r => setTimeout(r, 50))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('资金总体特征')
    const citeBtn = wrapper.find('button.cite')
    expect(citeBtn.exists()).toBe(true)
    await citeBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('命中异常模型与量化依据')

    wrapper.unmount()
  })
})
