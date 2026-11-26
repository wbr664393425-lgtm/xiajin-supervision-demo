import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './styles/global.css'
const router = createRouter({ history: createWebHashHistory(), scrollBehavior: () => ({ top: 0 }), routes: [
  { path: '/', component: () => import('./pages/OverviewPage.vue'), meta: { title: '监督总览' } },
  { path: '/clues', component: () => import('./pages/ClueWorkspacePage.vue'), meta: { title: '信访材料研判', layout: 'clues' } },
  { path: '/clues/archive', component: () => import('./pages/CluesPage.vue'), meta: { title: '原线索工作台' } },
  { path: '/assets', component: () => import('./pages/AssetsPage.vue'), meta: { title: '农村三资监督' } },
  { path: '/inspection', component: () => import('./pages/InspectionPage.vue'), meta: { title: '巡察与整改' } },
  { path: '/review', component: () => import('./pages/ReviewPage.vue'), meta: { title: '案卷审理助手' } },
  { path: '/assistant', component: () => import('./pages/AssistantPage.vue'), meta: { title: '纪检 AI 助手' } },
  { path: '/capabilities', component: () => import('./pages/CapabilitiesPage.vue'), meta: { title: '能力中心' } },
] })
createApp(App).use(createPinia()).use(router).mount('#app')
