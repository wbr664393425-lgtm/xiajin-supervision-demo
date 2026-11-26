<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell, ChevronDown, ChevronRight, Lock, LogOut, RotateCcw, Search, Sparkles, Check, ServerCog, Clock3, PanelLeftClose, PanelLeftOpen, Database, Bot, FileCheck2, UserCheck } from 'lucide-vue-next'
import BrandMark from './BrandMark.vue'
import CommandPalette from './CommandPalette.vue'
import AssistantPanel from './AssistantPanel.vue'
import { dossierRequest } from './useDossierAgent'
import { theme, themes, applyTheme } from './theme'
import Toaster from './Toaster.vue'
import { toast } from './toast'
import { modules, moduleOf, featureOf } from './modules'
import { roles, canVisit } from './permissions'
import { useSystemStore } from '@/stores/system'
import { useSessionStore } from '@/stores/session'
import { useCluesStore } from '@/stores/clues'
import { useSupervisionStore } from '@/stores/supervision'
import { useBankFlowStore } from '@/stores/bankflow'
import { useInspectionStore } from '@/stores/inspection'
import { useCasesStore } from '@/stores/cases'
import { useArchiveStore } from '@/stores/outreach'
import { useOpinionStore } from '@/stores/opinion'
import { useAssistantStore } from '@/stores/assistant'
import { closeAssistantAt, notifyAssistantOpen, presenting, setPresenting } from './opinionBus'
import { UiButton, UiModal } from '@/design/ui'
import type { RoleKey } from '@/types'

const route = useRoute(), router = useRouter(), system = useSystemStore()
const session = useSessionStore()
// 预先初始化各业务仓库：全局检索与风险一张图需要汇总所有模块的数据
const assistant = useAssistantStore()
const opinion = useOpinionStore()
useCluesStore(); useSupervisionStore(); useBankFlowStore(); useInspectionStore(); useCasesStore(); useArchiveStore()
const activeModule = computed(() => moduleOf(String(route.meta.module || '')))
const activeFeature = computed(() => featureOf(String(route.meta.module || ''), String(route.meta.feature || '')))
const cmdOpen = ref(false), menu = ref<'' | 'role' | 'bell'>(''), resetOpen = ref(false), aiOpen = ref(false)
watch(dossierRequest, v => { if (v) aiOpen.value = true })
watch(aiOpen, open => notifyAssistantOpen(open))
watch(closeAssistantAt, v => { if (v && aiOpen.value) aiOpen.value = false })
watch(() => route.fullPath, () => { if (presenting.value && route.meta.module !== 'opinion') setPresenting(false) })
const pending = computed(() => system.tasks.filter(t => t.status === '处理中').length)
// 侧栏引擎状态：只显示在线/离线，便于讲解前确认网络
const aiState = computed(() => assistant.engine === 'deepseek' && assistant.configured ? (assistant.status === 'offline' ? 'off' : assistant.status === 'online' ? 'on' : 'wait') : 'local')
const aiStateText = computed(() => ({ on: '纪检大模型在线', off: '离线引擎运行中', wait: '纪检大模型就绪', local: '离线引擎运行中' })[aiState.value])
onMounted(() => { if (assistant.configured && assistant.status === 'unknown') void assistant.check() })

// 导航：顶栏放模块（一级），左侧列出当前模块的全部功能（二级）；左侧可收起为图标栏
const navModule = computed(() => activeModule.value || moduleOf('home')!)
const topbarModules = computed(() => modules.filter(m => !m.hideInTopbar))
const readPref = (k: string) => { try { return localStorage.getItem(`xiajin-v2:ui.${k}`) } catch { return null } }
const writePref = (k: string, v: string) => { try { localStorage.setItem(`xiajin-v2:ui.${k}`, v) } catch { /* 存储不可用时忽略 */ } }
const collapsed = ref(readPref('navCollapsed') === '1')
watch(collapsed, v => writePref('navCollapsed', v ? '1' : '0'))
const flowLabels = ['输入', '智能处理', '产出', '人工把关']
const flowIcons = [Database, Bot, FileCheck2, UserCheck]

function toggle(which: 'role' | 'bell') { menu.value = menu.value === which ? '' : which }
function pickRole(role: RoleKey) {
  system.setRole(role); menu.value = ''
  const m = route.meta.module as any
  if (m && !canVisit(role, m)) router.push('/home/dashboard')
}
function doReset() { system.reset(); resetOpen.value = false; router.push('/home/dashboard') }
async function signOut() {
  menu.value = ''
  try { await session.signOut() }
  catch { toast('退出失败，请检查连接后重试', 'warn'); return }
  void router.replace({ name: 'login' })
}
function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdOpen.value = !cmdOpen.value }
  if (e.key === 'Escape') { menu.value = ''; if (presenting.value) setPresenting(false) }
}
function onDoc(e: MouseEvent) { if (!(e.target as HTMLElement).closest('.pop-anchor')) menu.value = '' }
onMounted(() => { window.addEventListener('keydown', onKey); document.addEventListener('click', onDoc) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); document.removeEventListener('click', onDoc) })
</script>

<template>
  <div class="shell" :class="{ 'nav-rail': collapsed, 'is-presenting': presenting }">
    <header class="topbar">
      <RouterLink to="/home/dashboard" class="brand" aria-label="返回工作台">
        <BrandMark />
        <div><strong>夏津县纪检监察</strong><span>智能监督与执纪办案一体化平台</span></div>
      </RouterLink>
      <nav class="topnav" aria-label="业务模块">
        <template v-for="m in topbarModules" :key="m.key">
          <RouterLink v-if="canVisit(system.role, m.key)" :to="`/${m.key}`" class="tn" :class="{ on: activeModule?.key === m.key }" :title="m.title">
            <component :is="m.icon" :size="16" />{{ m.short }}<i v-if="m.key === 'home' && pending" class="tn-dot num">{{ pending }}</i><i v-else-if="m.key === 'opinion' && opinion.highPendingCount" class="tn-dot num">{{ opinion.highPendingCount }}</i>
          </RouterLink>
          <RouterLink v-else :to="{ name: 'forbidden', query: { from: `/${m.key}` } }" class="tn locked" :title="`${roles[system.role].name}无权访问${m.title}`"><Lock :size="13" />{{ m.short }}</RouterLink>
        </template>
      </nav>
      <div class="top-actions">
        <button class="icon-btn" aria-label="全局搜索" title="搜索功能、线索、合同、案卷" @click="cmdOpen = true"><Search :size="18" /></button>
        <button class="ai-btn" :class="{ on: aiOpen || activeModule?.key === 'assistant' }" @click="aiOpen = !aiOpen"><Sparkles :size="16" />智能助手</button>
        <div class="pop-anchor">
          <button class="icon-btn" aria-label="提醒" @click="toggle('bell')"><Bell :size="18" /><i v-if="system.overdue.length" class="badge num">{{ system.overdue.length }}</i></button>
          <div v-if="menu === 'bell'" class="pop bell-pop">
            <h4>超期提醒 <span class="num">{{ system.overdue.length }}</span></h4>
            <RouterLink v-for="t in system.overdue" :key="t.id" :to="{ path: '/home/tasks', query: { id: t.id } }" class="pop-item" @click="menu = ''"><Clock3 :size="14" /><div><strong>{{ t.title }}</strong><small>{{ t.id }} · 期限 {{ t.deadline }}</small></div></RouterLink>
            <p v-if="!system.overdue.length" class="pop-empty">暂无超期任务</p>
            <h4>最近操作</h4>
            <div v-for="a in system.audit.slice(0, 4)" :key="a.id" class="pop-log"><span>{{ a.user }} {{ a.action }}</span><strong>{{ a.target }}</strong><small class="num">{{ a.time.slice(5) }}</small></div>
            <RouterLink v-if="system.can('audit')" to="/system/audit" class="pop-more" @click="menu = ''">查看全部审计日志</RouterLink>
          </div>
        </div>
        <div class="pop-anchor">
          <button class="user" @click="toggle('role')"><span class="avatar">{{ system.user.slice(0, 1) }}</span><span class="user-copy"><strong>{{ system.user }}</strong><small>{{ roles[system.role].name }}</small></span><ChevronDown :size="14" /></button>
          <div v-if="menu === 'role'" class="pop role-pop">
            <h4>切换角色</h4>
            <button v-for="(r, key) in roles" :key="key" class="pop-item" @click="pickRole(key as RoleKey)"><span class="avatar sm">{{ r.user.slice(0, 1) }}</span><div><strong>{{ r.name }}</strong><small>可访问 {{ r.modules.length }} 个模块</small></div><Check v-if="system.role === key" :size="15" class="ok" /></button>
            <h4>页面配色</h4>
            <div class="themes"><button v-for="t in themes" :key="t.key" class="theme" :class="{ on: theme === t.key }" :aria-pressed="theme === t.key" @click="applyTheme(t.key)"><i :style="{ background: `linear-gradient(135deg, ${t.swatch[0]} 0 55%, ${t.swatch[1]} 55%)` }" />{{ t.name }}</button></div>
            <button class="pop-item danger" @click="resetOpen = true; menu = ''"><RotateCcw :size="15" /><div><strong>重置数据</strong><small>恢复全部初始样例</small></div></button>
            <button class="pop-item" @click="signOut"><LogOut :size="15" /><div><strong>退出登录</strong></div></button>
          </div>
        </div>
      </div>
    </header>

    <aside class="nav scroll-thin" :class="{ rail: collapsed }" :aria-label="`${navModule.title}功能`">
      <div class="nav-head" :title="navModule.title">
        <span class="nh-icon"><component :is="navModule.icon" :size="18" /></span>
        <div v-if="!collapsed"><strong>{{ navModule.title }}</strong><small class="num">{{ navModule.features.length }} 项功能</small></div>
      </div>
      <nav>
        <RouterLink v-for="f in navModule.features" :key="f.key" :to="`/${navModule.key}/${f.key}`" class="nav-item" active-class="active" :title="collapsed ? f.title : f.desc">
          <span class="nav-icon"><component :is="f.icon" :size="17" /></span><span v-if="!collapsed" class="nav-text">{{ f.title }}</span>
        </RouterLink>
      </nav>
      <div class="nav-foot">
        <div v-if="!collapsed" class="engine"><ServerCog :size="15" /><div><strong>智能引擎</strong><span><i class="dot" :class="aiState" />{{ aiStateText }}</span></div></div>
        <i v-else class="dot rail-engine" :class="aiState" :title="aiStateText" />
        <button class="nav-fold" :aria-label="collapsed ? '展开功能栏' : '收起功能栏'" :title="collapsed ? '展开功能栏' : '收起功能栏'" @click="collapsed = !collapsed"><component :is="collapsed ? PanelLeftOpen : PanelLeftClose" :size="16" /></button>
      </div>
    </aside>

    <main class="main" :class="{ 'with-ai': aiOpen }">
      <div v-if="activeModule && route.name !== 'home.dashboard' && route.name !== 'opinion.overview' && !presenting" class="module-head">
        <div class="module-title">
          <span class="module-icon"><component :is="activeModule.icon" :size="20" /></span>
          <div>
            <p class="crumb"><RouterLink to="/home/dashboard">工作台</RouterLink><template v-if="activeModule.key !== 'home'"><ChevronRight :size="12" /><RouterLink :to="`/${activeModule.key}`">{{ activeModule.title }}</RouterLink></template></p>
            <h1>{{ activeFeature?.title || activeModule.title }}</h1><p>{{ activeFeature?.desc }}</p>
          </div>
        </div>
        <ol v-if="activeFeature?.flow" class="flow" aria-label="本页流程">
          <li v-for="(s, i) in activeFeature.flow.filter(Boolean)" :key="i" :class="`f${i}`"><span class="fi"><component :is="flowIcons[i]" :size="14" /></span><div :title="s"><small>{{ flowLabels[i] }}</small><span>{{ s }}</span></div></li>
        </ol>
      </div>
      <RouterView v-slot="{ Component, route: r }">
        <KeepAlive :max="20"><component :is="Component" :key="String(r.name)" /></KeepAlive>
      </RouterView>
      <footer class="main-foot">本系统所示人员、单位、金额与材料均为样例 · 智能引擎输出仅为疑点、初稿与参考，定性、量纪、审批与处置权由纪检干部行使</footer>
      <button v-if="presenting" type="button" class="exit-present" @click="setPresenting(false)">退出全屏汇报</button>
    </main>

    <AssistantPanel v-model:open="aiOpen" />
    <CommandPalette :open="cmdOpen" @close="cmdOpen = false" />
    <Toaster />
    <UiModal v-model="resetOpen" title="重置数据？">
      本浏览器中的线索处理、疑点确认、核查任务、文书与审计记录将恢复为初始样例。此操作只影响本浏览器。
      <template #footer><UiButton @click="resetOpen = false">取消</UiButton><UiButton variant="primary" @click="doReset">确认重置</UiButton></template>
    </UiModal>
  </div>
</template>

<style scoped>
.shell{min-height:100vh;display:grid;grid-template-columns:var(--nav-w) minmax(0,1fr);transition:grid-template-columns var(--dur) var(--ease);grid-template-rows:var(--header-h) 1fr}
.topbar{grid-column:1/-1;position:sticky;top:0;z-index:200;display:flex;align-items:center;gap:12px;padding:0 20px 0 16px;color:var(--topbar-ink);background:var(--topbar-bg);box-shadow:var(--topbar-shadow);backdrop-filter:var(--topbar-blur);-webkit-backdrop-filter:var(--topbar-blur)}
.topbar::after{content:"";position:absolute;inset:0;pointer-events:none;background:var(--topbar-glow)}
.shell.nav-rail{--nav-w:68px}
.brand{display:flex;align-items:center;gap:10px;min-width:0;flex:none;margin-right:8px}
.brand strong{display:block;font-size:16px;font-weight:700;letter-spacing:.06em;line-height:1.25}
.brand span{display:block;font-size:12px;opacity:.94;letter-spacing:.02em;white-space:nowrap}
.top-actions{margin-left:auto;flex:none;display:flex;align-items:center;gap:8px;position:relative;z-index:1}
.ai-btn{display:flex;align-items:center;gap:6px;height:34px;padding:0 14px;white-space:nowrap;flex:none;border-radius:9px;background:var(--ai-btn-bg);color:var(--ai-btn-ink);font-weight:600;font-size:14px;box-shadow:var(--ai-btn-shadow)}
.ai-btn:hover,.ai-btn.on{filter:brightness(1.05);box-shadow:0 0 0 2px var(--topbar-chip-line)}
.icon-btn{position:relative;width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:var(--topbar-ink)}
.icon-btn:hover{background:var(--topbar-chip)}
.badge{position:absolute;top:3px;right:2px;min-width:16px;height:16px;border-radius:8px;background:var(--badge-bg);color:var(--badge-ink);font-size:11px;font-style:normal;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px}
.user{display:flex;align-items:center;gap:8px;height:40px;padding:0 8px 0 4px;border-radius:10px;color:var(--topbar-ink)}
.user:hover{background:var(--topbar-chip)}
.avatar{width:30px;height:30px;border-radius:50%;background:var(--avatar-bg);color:var(--red);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex:none}
.avatar.sm{width:26px;height:26px;font-size:12px;background:var(--red-50)}
.user-copy{text-align:left;line-height:1.25}
.user-copy strong{display:block;font-size:13px;font-weight:600}
.user-copy small{font-size:12px;opacity:.94}
.pop-anchor{position:relative}
.pop{position:absolute;right:0;top:46px;width:320px;background:var(--surface);color:var(--text);border-radius:var(--r-md);box-shadow:var(--shadow-2);padding:10px;animation:rise var(--dur) var(--ease);border:1px solid var(--line)}
.pop h4{font-size:12px;color:var(--text-3);font-weight:500;padding:6px 8px;display:flex;gap:6px}
.pop-item{width:100%;display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;text-align:left}
.pop-item:hover{background:var(--red-25)}
.pop-item>div{flex:1;min-width:0}
.pop-item strong{display:block;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pop-item small{display:block;font-size:12px;color:var(--text-3)}
.pop-item>svg{color:var(--risk-mid)}
.pop-item .ok{color:var(--red)}
.themes{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:2px 8px 8px}
.theme{display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 4px;border-radius:8px;font-size:12px;color:var(--text-2);border:1px solid var(--line)}
.theme:hover{border-color:var(--red-line)}
.theme.on{border-color:var(--red);color:var(--red);font-weight:600;box-shadow:inset 0 0 0 1px var(--red)}
.theme i{width:28px;height:28px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.08) inset}
.pop-item.danger{border-top:1px solid var(--line);border-radius:0 0 8px 8px;margin-top:4px;color:var(--risk-high)}
.pop-item.danger>svg{color:var(--risk-high)}
.pop-empty{font-size:13px;color:var(--text-3);padding:4px 8px 8px}
.pop-log{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:5px 8px}
.pop-log span{color:var(--text-3);white-space:nowrap}
.pop-log strong{font-weight:500;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pop-log small{color:var(--text-4);font-size:12px}
.pop-more{display:block;text-align:center;font-size:13px;color:var(--red);padding:8px;border-top:1px solid var(--line);margin-top:6px}

.topnav{display:flex;align-items:center;gap:2px;min-width:0;overflow-x:auto;scrollbar-width:none;position:relative;z-index:1}
.topnav::-webkit-scrollbar{display:none}
.tn{position:relative;display:flex;align-items:center;gap:5px;height:36px;padding:0 10px;flex:none;border-radius:9px;font-size:14px;white-space:nowrap;color:var(--topbar-ink-2);transition:background var(--dur),color var(--dur)}
.tn:hover{background:var(--topbar-chip);color:var(--topbar-ink)}
.tn.on{background:var(--topbar-chip-hover);color:var(--topbar-ink);font-weight:600;box-shadow:inset 0 0 0 1px var(--topbar-chip-line)}
.tn.on::after{content:"";position:absolute;left:12px;right:12px;bottom:-10px;height:3px;border-radius:3px 3px 0 0;background:var(--badge-bg)}
.tn.locked{opacity:.55}
.tn-dot{font-style:normal;min-width:17px;height:17px;padding:0 5px;border-radius:9px;background:var(--badge-bg);color:var(--badge-ink);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
.nav{position:sticky;top:var(--header-h);height:calc(100vh - var(--header-h));overflow-y:auto;background:var(--nav-bg);backdrop-filter:var(--nav-blur);-webkit-backdrop-filter:var(--nav-blur);border-right:1px solid var(--line);padding:14px 12px 12px;display:flex;flex-direction:column}
.nav-head{display:flex;align-items:center;gap:10px;padding:2px 6px 14px;margin-bottom:8px;border-bottom:1px solid var(--line)}
.nh-icon{width:34px;height:34px;border-radius:10px;background:var(--red);color:var(--on-brand);display:flex;align-items:center;justify-content:center;flex:none;box-shadow:var(--shadow-red)}
.nav-head>div{min-width:0}
.nav-head strong{display:block;font-size:15px;font-weight:700;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nav-head small{font-size:12px;color:var(--text-3)}
.nav nav{display:flex;flex-direction:column;gap:3px}
.nav-item{position:relative;display:flex;align-items:center;gap:10px;height:42px;padding:0 10px;border-radius:10px;color:var(--text-2);font-size:14px;transition:background var(--dur),color var(--dur)}
.nav-item:hover{background:var(--surface-3);color:var(--text)}
.nav-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-3);background:var(--surface-2);flex:none;transition:background var(--dur),color var(--dur)}
.nav-text{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nav-item.active{background:var(--red-50);color:var(--red-600);font-weight:600}
.nav-item.active::before{content:"";position:absolute;left:-12px;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:var(--red)}
.nav-item.active .nav-icon{background:var(--red);color:var(--on-brand)}
.nav-foot{margin-top:auto;padding-top:12px;display:flex;align-items:flex-end;gap:6px}
.engine{flex:1;min-width:0;display:flex;gap:8px;padding:10px;border-radius:10px;background:var(--cream);color:var(--accent-ink);font-size:12px;line-height:1.5;box-shadow:inset 0 0 0 1px var(--gold-line)}
.engine svg{margin-top:2px;flex:none}
.engine strong{display:block;font-size:13px;color:var(--accent-ink-2)}
.engine span{display:flex;align-items:center;gap:6px;white-space:nowrap}
.nav-fold{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-3);flex:none}
.nav-fold:hover{background:var(--surface-3);color:var(--text)}
.dot{width:7px;height:7px;border-radius:50%;background:var(--gold);flex:none}
.dot.on{background:var(--ok)}
.dot.off,.dot.local{background:var(--text-4)}
.nav.rail{padding:14px 10px 12px;overflow-x:hidden}
.nav.rail .nav-head{justify-content:center;padding:2px 0 14px}
.nav.rail .nav-item{justify-content:center;padding:0}
.nav.rail .nav-item.active::before{left:-10px}
.nav.rail .nav-foot{flex-direction:column;align-items:center;gap:10px}

.main{min-width:0;padding:20px 28px 16px;transition:padding-right var(--dur) var(--ease)}
/* 宽屏时为 智能面板让出位置；1680 以下面板浮在内容上方，避免内容被挤压变形 */
@media(min-width:1680px){.main.with-ai{padding-right:452px}}
.module-head{display:flex;flex-direction:column;align-items:stretch;gap:12px;margin-bottom:18px}
.module-title{display:flex;align-items:center;gap:12px;min-width:0}
.module-icon{width:46px;height:46px;border-radius:12px;background:var(--surface);color:var(--red);display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-1);border:1px solid var(--line);flex:none}
.crumb{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-4);line-height:1.4}
.crumb a{color:var(--text-3)}
.crumb a:hover{color:var(--red)}
.module-title h1{font-size:20px;font-weight:700;line-height:1.3}
.module-title p:not(.crumb){font-size:13px;color:var(--text-3)}
.flow{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-1);overflow:hidden}
.flow li{position:relative;display:flex;align-items:center;gap:10px;padding:9px 16px;min-width:0}
.flow li+li{padding-left:24px}
.flow li+li::before{content:"";position:absolute;left:-8px;top:50%;width:16px;height:16px;border-top:1px solid var(--line-2);border-right:1px solid var(--line-2);transform:translateY(-50%) rotate(45deg);background:inherit}
.flow li.f1{background:var(--ai-bg)}
.flow li.f3{background:var(--cream)}
.flow li>div{min-width:0}
.fi{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex:none;background:var(--surface-3);color:var(--text-2)}
.f1 .fi{background:var(--surface);color:var(--ai)}
.f2 .fi{background:var(--red-50);color:var(--red)}
.f3 .fi{background:var(--surface);color:var(--accent-ink)}
.flow small{display:block;font-size:11px;color:var(--text-4);line-height:1.3}
.flow li span:not(.fi){display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13px;line-height:1.45;color:var(--text)}
.main-foot{margin-top:24px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;color:var(--text-3);text-align:center}
@media(max-width:1600px){.user-copy{display:none}}
@media(max-width:1520px){.tn{padding:0 8px;gap:4px;font-size:13.5px}}
@media(max-width:1460px){.tn>svg{display:none}.tn{padding:0 9px}}
@media(min-width:1700px){.main{padding:24px 36px 18px}}
.shell.is-presenting{grid-template-columns:minmax(0,1fr);grid-template-rows:1fr}
.shell.is-presenting .topbar,.shell.is-presenting .nav,.shell.is-presenting .main-foot{display:none}
.shell.is-presenting .main{padding:22px 32px 28px;max-width:1680px;margin:0 auto;width:100%}
.exit-present{position:fixed;right:24px;bottom:20px;z-index:260;height:36px;padding:0 16px;border-radius:999px;background:var(--stop-bg);color:var(--on-brand);font-size:13px;font-weight:600;box-shadow:var(--shadow-2);opacity:.9;transition:opacity var(--dur),transform var(--dur)}
.exit-present:hover{opacity:1;transform:translateY(-1px)}
@media print{
  .shell{display:block !important}
  .topbar,.nav,.module-head,.main-foot,.exit-present{display:none !important}
  .main{padding:0 !important}
}
</style>
