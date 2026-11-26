import type { ModuleKey, RoleKey } from '@/types'

export const roles: Record<RoleKey, { name: string; user: string; modules: ModuleKey[]; actions: string[] }> = {
  leader: { name: '委领导 / 管理员', user: '管理员', modules: ['home', 'clues', 'supervision', 'inspection', 'bankflow', 'cases', 'archive', 'opinion', 'assistant', 'system'], actions: ['task', 'export', 'confirm', 'audit'] },
  xinfang: { name: '信访室', user: '信访专员', modules: ['home', 'clues', 'cases', 'opinion', 'assistant'], actions: ['task', 'export', 'confirm'] },
  jiandu: { name: '监督检查室', user: '监督专员', modules: ['home', 'clues', 'supervision', 'bankflow', 'archive', 'opinion', 'assistant'], actions: ['task', 'export', 'confirm'] },
  xuncha: { name: '巡察办', user: '巡察专员', modules: ['home', 'inspection', 'supervision', 'bankflow', 'opinion', 'assistant'], actions: ['task', 'export', 'confirm'] },
  shenli: { name: '案件审理室', user: '审理专员', modules: ['home', 'bankflow', 'cases', 'archive', 'assistant'], actions: ['export', 'confirm'] },
}
export const canVisit = (role: RoleKey, module: ModuleKey) => roles[role].modules.includes(module)
export const canDo = (role: RoleKey, action: string) => roles[role].actions.includes(action)
