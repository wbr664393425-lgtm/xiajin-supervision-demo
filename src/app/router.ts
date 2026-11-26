import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { modules } from './modules'
import { canVisit } from './permissions'
import { useSystemStore } from '@/stores/system'
import { useSessionStore } from '@/stores/session'
import type { ModuleKey } from '@/types'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('./Login.vue'), meta: { title: '账号登录' } },
  {
    path: '/',
    component: () => import('./AppShell.vue'),
    children: [
      { path: '', redirect: '/home/dashboard' },
      { path: 'outreach/opinion', redirect: '/opinion/overview' },
      { path: 'outreach/materials', redirect: '/archive/materials' },
      { path: 'outreach', redirect: '/opinion/overview' },
      { path: 'supervision/bankflow', redirect: to => to.query.id ? { path: '/bankflow/ledger', query: to.query } : to.query.batch ? { path: '/bankflow/graph', query: to.query } : { path: '/bankflow/batches', query: to.query } },
      ...modules.flatMap(m => [
        { path: m.key, redirect: `/${m.key}/${m.features[0]!.key}` },
        ...m.features.map(f => ({ path: `${m.key}/${f.key}`, name: `${m.key}.${f.key}`, component: f.load, meta: { module: m.key, feature: f.key, title: f.title } })),
      ]),
      { path: 'forbidden', name: 'forbidden', component: () => import('./Forbidden.vue'), meta: { title: '无访问权限' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/home/dashboard' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved || (to.path === from.path ? undefined : { top: 0 }),
})

router.beforeEach(async to => {
  const session = useSessionStore()
  const signedIn = await session.checkSession()
  if (to.name === 'login') return signedIn ? { name: 'home.dashboard' } : true
  if (!signedIn) return {
    name: 'login',
    query: to.fullPath === '/home/dashboard' ? {} : { redirect: to.fullPath },
    replace: true,
  }
  const module = to.meta.module as ModuleKey | undefined
  if (!module) return true
  const system = useSystemStore()
  if (!canVisit(system.role, module)) return { name: 'forbidden', query: { from: to.fullPath } }
  return true
})
router.afterEach(to => { document.title = `${to.meta.title || '工作台'} · 夏津县纪检监察智能监督平台` })
