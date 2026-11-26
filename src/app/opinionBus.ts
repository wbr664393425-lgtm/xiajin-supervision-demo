import { ref } from 'vue'

/**
 * 舆情模块交互协调总线：
 * 1. 管理全屏汇报态（body.presenting），支持一键隐藏顶栏与侧栏；
 * 2. 管理舆情证据抽屉与全局 AssistantPanel 互斥，防止右侧双抽屉重叠。
 */
export const presenting = ref(false)
export const opinionDrawerOpen = ref(false)
export const closeOpinionDrawerAt = ref(0)
export const closeAssistantAt = ref(0)

export function setPresenting(value: boolean) {
  presenting.value = value
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('presenting', value)
  }
}

export function notifyOpinionDrawer(open: boolean) {
  opinionDrawerOpen.value = open
  if (open) closeAssistantAt.value = Date.now()
}

export function notifyAssistantOpen(open: boolean) {
  if (open && opinionDrawerOpen.value) {
    closeOpinionDrawerAt.value = Date.now()
    opinionDrawerOpen.value = false
  }
}
