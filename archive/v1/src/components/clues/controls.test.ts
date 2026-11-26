// @vitest-environment happy-dom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ClueDesk from './ClueDesk.vue'
import ClueReader from './ClueReader.vue'
import WorkspaceDialog from './WorkspaceDialog.vue'
import { createWorkspace, extractWorkspaceFields, fieldKeys } from '../../services/clue-workspace'
import type { Clue } from '../../types'
import type { ClueWorkspace } from '../../types/clue-workspace'
import globalCss from '../../styles/global.css?raw'
import tokenCss from '../../styles/clue-tokens.css?raw'
import workspaceCss from '../../styles/clue-workspace.css?raw'
import deskCss from './desk.css?raw'
import readerCss from './reader.css?raw'

const clue: Clue = {
  id: 'XF-TEST-001',
  title: '村集体租赁款收取情况',
  area: '测试村',
  source: '来信',
  date: '2026-11-03',
  status: '待研判',
  priority: '一般关注',
  content: '涉及单位：测试服务社\n\n反映租赁款收取情况。承租方为测试服务社，约定2026年10月31日前支付租金10000元。',
}

const styles: HTMLStyleElement[] = []
const mounted: { unmount: () => void }[] = []
let scene: HTMLDivElement

function addStyle(css: string) {
  const style = document.createElement('style')
  // The imported token sheet is already injected; do not fetch a relative @import.
  style.textContent = css.replace(/@import\s+[^;]+;/g, '')
  document.head.append(style)
  return style
}

function workspace(phase: ClueWorkspace['phase'] = 'initial') {
  const draft = createWorkspace(clue.id)
  draft.phase = phase
  if (phase === 'extracted') draft.fields = extractWorkspaceFields(clue)
  return draft
}

function mountDesk(draft = workspace('extracted')) {
  const wrapper = mount(ClueDesk, {
    attachTo: scene,
    props: { clues: [clue], active: clue, draft, search: '' },
  })
  mounted.push(wrapper)
  return wrapper
}

function mountReader(draft = workspace()) {
  const wrapper = mount(ClueReader, {
    attachTo: scene,
    props: {
      clue, draft, notesOpen: true, editingField: null,
      editValue: '', editError: '', sourceHighlight: null,
    },
  })
  mounted.push(wrapper)
  return wrapper
}

function expectPrimary(element: Element) {
  const css = getComputedStyle(element)
  expect(css.color.toLowerCase()).toBe('#ffffff')
  expect(css.backgroundColor.toLowerCase()).toBe('#1e5fa8')
}

function expectDisabled(element: HTMLButtonElement) {
  const css = getComputedStyle(element)
  expect(element.disabled).toBe(true)
  expect(css.backgroundColor.toLowerCase()).toBe('#eeeae2')
  expect(css.color.toLowerCase()).toBe('#66707b')
  expect(css.opacity).toBe('1')
}

function luminance(color: string) {
  expect(color, 'Contrast calculation requires an opaque computed color').toMatch(/^#[0-9a-f]{6}$/i)
  const channels = [1, 3, 5].map(offset => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

beforeAll(() => {
  for (const css of [globalCss, tokenCss, workspaceCss, deskCss, readerCss]) {
    expect(css.length, 'Raw CSS must be enabled in the Vitest config').toBeGreaterThan(0)
  }
  styles.push(...[globalCss, tokenCss, workspaceCss, deskCss, readerCss].map(addStyle))
})

beforeEach(() => {
  scene = document.createElement('div')
  scene.className = 'clues-scene'
  document.body.append(scene)
})

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  scene.remove()
})

afterAll(() => styles.forEach(style => style.remove()))

describe('真实组件的按钮与选中状态', () => {
  it('案头主按钮为品牌蓝底白字，当前书签为蓝色', () => {
    const wrapper = mountDesk()
    expectPrimary(wrapper.get('.desk-new-button').element)
    expectPrimary(wrapper.get('.desk-resume-button').element)
    const selected = getComputedStyle(wrapper.get('.desk-document-tab-active').element)
    expect(selected.color.toLowerCase()).toBe('#1e5fa8')
    expect(selected.borderBottomColor.toLowerCase()).toBe('#1e5fa8')
  })

  it('案头不可用摘要按钮使用灰底与不透明文字', () => {
    const wrapper = mountDesk()
    expectDisabled(wrapper.get<HTMLButtonElement>('.desk-storage-unavailable').element)
  })

  it('审阅主按钮使用品牌蓝底白字', () => {
    const wrapper = mountReader()
    expectPrimary(wrapper.get('.reader-bottom-actions .reader-button-primary').element)
  })

  it('主要操作文字对比度至少为4.5，真实图标继承白色', () => {
    const desk = mountDesk()
    const reader = mountReader()
    const buttons = [
      desk.get('.desk-new-button'), desk.get('.desk-resume-button'),
      reader.get('.reader-bottom-actions .reader-button-primary'),
    ]
    for (const button of buttons) {
      const css = getComputedStyle(button.element)
      const light = Math.max(luminance(css.color), luminance(css.backgroundColor))
      const dark = Math.min(luminance(css.color), luminance(css.backgroundColor))
      expect((light + 0.05) / (dark + 0.05)).toBeGreaterThanOrEqual(4.5)
      const icons = button.findAll('svg')
      expect(icons.length).toBeGreaterThan(0)
      for (const icon of icons) {
        expect(icon.attributes('stroke')).toBe('currentColor')
        expect(getComputedStyle(icon.element).color.toLowerCase()).toBe('#ffffff')
      }
    }
  })

  it('真实对话框中的主要和禁用操作沿用同一配色', () => {
    const wrapper = mount(WorkspaceDialog, {
      attachTo: scene,
      props: { title: '核对材料' },
      slots: {
        footer: '<div class="cw-dialog-actions"><button class="cw-button cw-button-primary">保存</button><button class="cw-button cw-button-primary" disabled>提交复核</button></div>',
      },
    })
    mounted.push(wrapper)
    expect(wrapper.get('dialog').element.hasAttribute('open')).toBe(true)
    expectPrimary(wrapper.get('.cw-button-primary:not(:disabled)').element)
    expectDisabled(wrapper.get<HTMLButtonElement>('.cw-button-primary:disabled').element)
  })

  it('公共 reset 后加载时也不会覆盖组件主按钮和选中书签', () => {
    const desk = mountDesk()
    const reader = mountReader()
    const lateWorkspaceStyle = addStyle(workspaceCss)
    try {
      expectPrimary(desk.get('.desk-new-button').element)
      expectPrimary(reader.get('.reader-bottom-actions .reader-button-primary').element)
      expect(getComputedStyle(desk.get('.desk-document-tab-active').element).color.toLowerCase()).toBe('#1e5fa8')
    } finally {
      lateWorkspaceStyle.remove()
    }
  })
})

describe('真实组件的操作事件', () => {
  it('案头每项“核对”发出对应字段，不替用户确认字段', async () => {
    const draft = workspace('extracted')
    const wrapper = mountDesk(draft)
    const buttons = wrapper.findAll('.desk-inspect-button')
    expect(buttons).toHaveLength(fieldKeys.length)
    for (const button of buttons) await button.trigger('click')
    expect(wrapper.emitted('inspect')).toEqual(fieldKeys.map(key => [key]))
    expect(fieldKeys.map(key => draft.fields[key].status)).toEqual(['pending', 'pending', 'pending', 'pending'])
  })

  it('初始审阅的底部主按钮启动辅助提取', async () => {
    const wrapper = mountReader()
    const primary = wrapper.get<HTMLButtonElement>('.reader-bottom-actions .reader-button-primary')
    expect(primary.text()).toBe('开始辅助提取')
    expect(primary.element.disabled).toBe(false)
    expect(primary.attributes('aria-busy')).toBe('false')
    await primary.trigger('click')
    expect(wrapper.emitted('extract')).toEqual([[]])
    expect(wrapper.emitted('summary')).toBeUndefined()
  })

  it('提取过程中显示忙碌状态并阻止底部操作', async () => {
    const wrapper = mountReader(workspace('analyzing'))
    const primary = wrapper.get<HTMLButtonElement>('.reader-bottom-actions .reader-button-primary')
    expect(primary.text()).toBe('正在辅助提取…')
    expect(primary.attributes('aria-busy')).toBe('true')
    expect(primary.find('.reader-button-spinner').exists()).toBe(true)
    expect(wrapper.get('.reader-analyzing[role="status"]').text()).toContain('正在整理材料')
    for (const button of wrapper.findAll<HTMLButtonElement>('.reader-bottom-actions button')) {
      expectDisabled(button.element)
      await button.trigger('click')
    }
    expect(wrapper.emitted('extract')).toBeUndefined()
    expect(wrapper.emitted('summary')).toBeUndefined()
    expect(wrapper.emitted('related')).toBeUndefined()
  })

  it('提取完成后底部主按钮打开摘要', async () => {
    const wrapper = mountReader(workspace('extracted'))
    const primary = wrapper.get('.reader-bottom-actions .reader-button-primary')
    expect(primary.text()).toBe('整理并保存摘要')
    await primary.trigger('click')
    expect(wrapper.emitted('summary')).toEqual([[]])
    expect(wrapper.emitted('extract')).toBeUndefined()
  })

  it('“核对下一项”只定位下一未确认项，不发出确认事件', async () => {
    const draft = workspace('extracted')
    draft.fields.tenant.status = 'confirmed'
    const wrapper = mountReader(draft)
    await wrapper.get('.reader-next-field').trigger('click')
    expect(wrapper.emitted('locate')).toEqual([['event']])
    expect(wrapper.emitted('confirmField')).toBeUndefined()
    expect(draft.fields.event.status).toBe('pending')
    expect(document.activeElement).toBe(wrapper.get('#source-event').element)
    expect(wrapper.get('.reader-confirmation-progress').text()).toContain('1 / 4')
  })
})
