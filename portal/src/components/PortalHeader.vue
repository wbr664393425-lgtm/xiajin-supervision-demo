<script setup lang="ts">
import { ref } from 'vue'
import {
  Compass,
  FileSearch,
  LogIn,
  Menu,
  Network,
  Radar,
  RotateCcw,
  ScanSearch,
  Search,
  ShieldCheck,
  X,
} from 'lucide-vue-next'
import BrandCrest from './BrandCrest.vue'
import { ROLES, TODAY } from '@/domain/mockData'
import {
  currentRoleDef,
  navigateTo,
  overdueTasks,
  pendingClues,
  pendingFindingsCount,
  portalState,
  resetAllDemoData,
  switchRole,
  toggleLoginPortal,
} from '@/domain/store'
import type { PortalPageKey, RoleKey } from '@/domain/types'

const emit = defineEmits<{
  openSearch: []
  openAudit: []
}>()

const mobileMenuOpen = ref(false)
const resetDialogRef = ref<HTMLDialogElement | null>(null)
let resetPressedOutside = false

const navItems: { key: PortalPageKey; label: string; badge?: () => number }[] = [
  { key: 'home', label: '监督门户首页', badge: () => overdueTasks.value.length },
  { key: 'clues', label: '信访线索研判', badge: () => pendingClues.value.length },
  { key: 'radar', label: '大数据穿透监督', badge: () => pendingFindingsCount.value },
  { key: 'inspection', label: '巡察整改与审理' },
  { key: 'panorama', label: '全域透视与能力' },
]

function selectPage(key: PortalPageKey) {
  navigateTo(key)
  mobileMenuOpen.value = false
}

function onRoleChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value as RoleKey
  switchRole(val, false)
}

function confirmReset() {
  resetAllDemoData()
  resetDialogRef.value?.close()
}

function onResetClose() {
  if (resetDialogRef.value) resetDialogRef.value.returnValue = ''
}

function isOutsideReset(e: PointerEvent) {
  const dlg = resetDialogRef.value
  if (!dlg) return false
  const r = dlg.getBoundingClientRect()
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
}

function onResetPointerDown(e: PointerEvent) {
  resetPressedOutside = isOutsideReset(e)
}

function onResetPointerUp(e: PointerEvent) {
  if (resetPressedOutside && isOutsideReset(e)) resetDialogRef.value?.close()
  resetPressedOutside = false
}
</script>

<template>
  <header class="portal-header">
    <!-- 顶层：平台标识与全局操作栏 -->
    <div class="header-top-band">
      <div class="header-top-inner">
        <div class="brand-cluster">
          <button type="button" class="brand-btn" @click="selectPage('home')">
            <BrandCrest variant="crest" :size="34" />
            <span class="brand-text">
              <span class="brand-name">夏津县纪检监察智能监督门户</span>
              <span class="brand-meta">澄明案头 · 基准日 {{ TODAY }} · 虚构演示样本</span>
            </span>
          </button>
        </div>

        <div class="utility-cluster">
          <button type="button" class="util-btn" aria-label="打开全局穿透检索" @click="emit('openSearch')">
            <Search :size="15" aria-hidden="true" />
            <span class="util-text">穿透检索</span>
            <kbd class="kbd-hint">⌘K</kbd>
          </button>

          <button type="button" class="util-btn" aria-label="查看审计留痕与合规边界" @click="emit('openAudit')">
            <ShieldCheck :size="15" aria-hidden="true" />
            <span class="util-text">留痕</span>
            <span class="audit-count num-tabular">{{ portalState.audits.length }}</span>
          </button>

          <div class="role-select-wrap">
            <label for="header-role-select" class="visually-hidden">当前演示岗位视角</label>
            <select id="header-role-select" class="role-select" :value="portalState.role" @change="onRoleChange">
              <option v-for="r in ROLES" :key="r.key" :value="r.key">{{ r.label }}</option>
            </select>
          </div>

          <button
            type="button"
            class="util-btn"
            title="切换至统一身份认证门户页预览"
            @click="toggleLoginPortal(true)"
          >
            <LogIn :size="15" aria-hidden="true" />
            <span class="util-text">认证门户</span>
          </button>

          <button
            type="button"
            class="util-btn util-reset"
            aria-label="重置演示数据"
            title="恢复初始演示数据"
            @click="resetDialogRef?.showModal()"
          >
            <RotateCcw :size="15" aria-hidden="true" />
          </button>

          <button
            type="button"
            class="mobile-menu-btn"
            :aria-expanded="mobileMenuOpen"
            aria-label="展开或收起门户导航菜单"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <X v-if="mobileMenuOpen" :size="18" aria-hidden="true" />
            <Menu v-else :size="18" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <!-- 次层：独立宽幅门户导航带，零重叠冲突 -->
    <div class="header-nav-band">
      <nav class="primary-nav" aria-label="门户主导航">
        <ul class="nav-list" role="list">
          <li v-for="item in navItems" :key="item.key">
            <button
              type="button"
              class="nav-link"
              :aria-current="portalState.activePage === item.key ? 'page' : undefined"
              @click="selectPage(item.key)"
            >
              <Compass v-if="item.key === 'home'" :size="15" aria-hidden="true" />
              <FileSearch v-else-if="item.key === 'clues'" :size="15" aria-hidden="true" />
              <Radar v-else-if="item.key === 'radar'" :size="15" aria-hidden="true" />
              <ScanSearch v-else-if="item.key === 'inspection'" :size="15" aria-hidden="true" />
              <Network v-else :size="15" aria-hidden="true" />
              <span>{{ item.label }}</span>
              <span v-if="item.badge && item.badge() > 0" class="nav-badge num-tabular">
                {{ item.badge() }}
              </span>
            </button>
          </li>
        </ul>
        <span class="nav-role-hint">
          当前视角：<strong>{{ currentRoleDef().dept }}</strong>
        </span>
      </nav>
    </div>

    <!-- 窄屏导航展开区 -->
    <div v-if="mobileMenuOpen" class="mobile-nav-panel">
      <ul class="mobile-nav-list" role="list">
        <li v-for="item in navItems" :key="item.key">
          <button
            type="button"
            class="mobile-nav-item"
            :aria-current="portalState.activePage === item.key ? 'page' : undefined"
            @click="selectPage(item.key)"
          >
            <span>{{ item.label }}</span>
            <span v-if="item.badge && item.badge() > 0" class="nav-badge num-tabular">{{ item.badge() }}</span>
          </button>
        </li>
      </ul>
      <div class="mobile-role-note">
        当前视角：<strong>{{ currentRoleDef().label }}</strong>（{{ currentRoleDef().dept }}）
      </div>
    </div>

    <!-- 原生重置确认对话框 -->
    <dialog
      ref="resetDialogRef"
      aria-labelledby="reset-dlg-title"
      closedby="any"
      class="reset-dialog"
      @close="onResetClose"
      @pointerdown="onResetPointerDown"
      @pointerup="onResetPointerUp"
    >
      <div class="reset-inner">
        <h2 id="reset-dlg-title">确认重置演示数据？</h2>
        <p>此操作将清空本浏览器内已录入的信访线索、人工核查任务、疑点排除决定与审计日志，恢复至汇报初始样例。</p>
        <div class="reset-actions">
          <form method="dialog">
            <button type="submit" value="cancel" class="btn btn-secondary">取消</button>
          </form>
          <button type="button" class="btn btn-danger-outline" @click="confirmReset">确认重置</button>
        </div>
      </div>
    </dialog>
  </header>
</template>

<style scoped>
.portal-header {
  position: sticky;
  inset-block-start: 0;
  z-index: 40;
  background: rgb(255 255 255 / 0.96);
  backdrop-filter: blur(8px);
  border-block-end: 1px solid var(--border-hairline);
}

.header-top-band {
  border-block-end: 1px solid var(--border-hairline);
}

.header-top-inner {
  max-inline-size: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--space-page-x);
  min-block-size: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand-cluster {
  flex: 1 1 auto;
  min-inline-size: 0;
}

.brand-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  border: 0;
  background: transparent;
  padding: 0.2rem 0;
  text-align: start;
  max-inline-size: 100%;
}

.brand-text {
  display: grid;
  line-height: 1.25;
  min-inline-size: 0;
}

.brand-name {
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--ink-primary);
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-meta {
  font-size: 0.74rem;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.utility-cluster {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: none;
}

.util-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-block-size: 34px;
  padding-inline: 0.65rem;
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--ink-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.util-btn:hover {
  background: var(--bg-subtle);
  color: var(--ink-primary);
}

.kbd-hint {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  padding: 0.08rem 0.3rem;
  border-radius: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border-hairline);
  color: var(--ink-muted);
}

.audit-count {
  padding: 0.05rem 0.35rem;
  border-radius: var(--radius-pill);
  background: var(--brand-teal-tint);
  color: var(--brand-indigo);
  font-size: 0.72rem;
}

.role-select {
  min-block-size: 34px;
  padding-inline: 0.55rem;
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--ink-primary);
  font-size: 0.8rem;
  font-weight: 600;
}

/* 第二行主导航带 */
.header-nav-band {
  background: var(--bg-elevated);
}

.primary-nav {
  max-inline-size: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--space-page-x);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.nav-list {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  min-block-size: 44px;
  padding-inline: 0.85rem;
  border: 0;
  background: transparent;
  color: var(--ink-secondary);
  font-size: 0.88rem;
  font-weight: 500;
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--brand-indigo);
}

.nav-link[aria-current="page"] {
  color: var(--brand-indigo);
  font-weight: 700;
}

.nav-link[aria-current="page"]::after {
  content: "";
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0.5rem;
  border-block-end: 3px solid var(--brand-indigo);
  border-radius: 3px 3px 0 0;
}

.nav-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 1.25rem;
  block-size: 1.18rem;
  padding-inline: 0.35rem;
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--vermilion-tint);
  color: var(--vermilion);
}

.nav-role-hint {
  flex: none;
  font-size: 0.78rem;
  color: var(--ink-muted);
  white-space: nowrap;
}

.nav-role-hint strong {
  color: var(--ink-secondary);
}

.mobile-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  inline-size: 36px;
  block-size: 36px;
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
}

.mobile-nav-panel {
  border-block-start: 1px solid var(--border-hairline);
  padding: 0.75rem var(--space-page-x) 1rem;
  background: var(--bg-surface);
}

.mobile-nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.35rem;
}

.mobile-nav-item {
  inline-size: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  font-weight: 600;
}

.mobile-nav-item[aria-current="page"] {
  background: var(--brand-teal-tint);
  border-color: var(--brand-teal-border);
  color: var(--brand-indigo);
}

.mobile-role-note {
  margin-block-start: 0.75rem;
  font-size: 0.8rem;
  color: var(--ink-muted);
}

.reset-dialog {
  inline-size: min(92dvw, 420px);
}

.reset-inner {
  padding: 1.35rem;
  display: grid;
  gap: 0.8rem;
}

.reset-inner h2 {
  font-size: 1.05rem;
  margin: 0;
}

.reset-inner p {
  font-size: 0.88rem;
  color: var(--ink-secondary);
  margin: 0;
}

.reset-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

@media (max-width: 1080px) {
  .brand-meta,
  .nav-role-hint,
  .util-text,
  .kbd-hint {
    display: none;
  }
}

@media (max-width: 820px) {
  .header-nav-band,
  .role-select-wrap {
    display: none;
  }
  .mobile-menu-btn {
    display: inline-flex;
  }
}
</style>
