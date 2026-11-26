import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { AuditEntry, ModuleKey, RoleKey, VerifyTask } from '@/types'
import { roles, canDo } from '@/app/permissions'
import { nowText, persisted, resetAll, today, uid } from './persist'
import { seedTasks, seedAudit } from '@/mock/system'
import { showCode } from '@/app/code'

export const useSystemStore = defineStore('system', () => {
  const role = persisted<RoleKey>('role', () => 'leader')
  const audit = persisted<AuditEntry[]>('audit', () => seedAudit())
  const tasks = persisted<VerifyTask[]>('tasks', () => seedTasks())
  const user = computed(() => roles[role.value].user)

  function log(module: ModuleKey, action: AuditEntry['action'], target: string, detail = '') {
    audit.value.unshift({ id: uid('AU'), time: nowText(), role: role.value, user: user.value, action, target: showCode(target), detail, module })
    if (audit.value.length > 400) audit.value.length = 400
  }
  const can = (action: string) => canDo(role.value, action)
  function taskFor(sourceId: string) { return tasks.value.find(t => t.sourceId === sourceId) }
  /** 人工确认后生成核查任务；同一来源只生成一次。 */
  function createTask(input: Omit<VerifyTask, 'id' | 'status' | 'createdAt'>) {
    const existing = taskFor(input.sourceId)
    if (existing) return existing
    const task: VerifyTask = { ...input, id: `HC-2026-${String(tasks.value.length + 101).padStart(3, '0')}`, status: '处理中', createdAt: nowText() }
    tasks.value.unshift(task)
    log(input.module, '流转', task.id, `人工确认疑点并生成核查任务：${task.title}`)
    return task
  }
  function completeTask(id: string, result: string) {
    const task = tasks.value.find(t => t.id === id)
    if (!task || task.status === '已完成') return
    task.status = '已完成'; task.completedAt = nowText(); task.result = result
    log(task.module, '确认', task.id, `人工完成核查：${result}`)
  }
  const overdue = computed(() => tasks.value.filter(t => t.status === '处理中' && t.deadline < today()))
  function setRole(next: RoleKey) { role.value = next; log('system', '登录', roles[next].name, '切换角色') }
  function reset() { resetAll(); log('system', '重置', '业务数据', '恢复初始样例数据') }
  return { role, audit, tasks, user, log, can, taskFor, createTask, completeTask, overdue, setRole, reset }
})
