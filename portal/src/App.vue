<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import AuditLogDialog from '@/components/AuditLogDialog.vue'
import GlobalSearchDialog from '@/components/GlobalSearchDialog.vue'
import PortalHeader from '@/components/PortalHeader.vue'
import PortalLoginView from '@/components/PortalLoginView.vue'
import ClueTriagePage from '@/pages/ClueTriagePage.vue'
import DataRadarPage from '@/pages/DataRadarPage.vue'
import EntityPanoramaPage from '@/pages/EntityPanoramaPage.vue'
import InspectionCasePage from '@/pages/InspectionCasePage.vue'
import PortalHomePage from '@/pages/PortalHomePage.vue'
import { TODAY } from '@/domain/mockData'
import { portalState } from '@/domain/store'

const searchOpen = ref(false)
const auditOpen = ref(false)

function onGlobalShortcut(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (!portalState.showLoginPortal) {
      searchOpen.value = !searchOpen.value
    }
  }
}

watch(
  () => portalState.activePage,
  () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },
)

onMounted(() => window.addEventListener('keydown', onGlobalShortcut))
onUnmounted(() => window.removeEventListener('keydown', onGlobalShortcut))
</script>

<template>
  <div class="portal-app">
    <a href="#main-content" class="skip-link">跳至主要内容</a>

    <PortalLoginView v-if="portalState.showLoginPortal" />

    <template v-else>
      <PortalHeader
        @open-search="searchOpen = true"
        @open-audit="auditOpen = true"
      />

      <main id="main-content" tabindex="-1" class="portal-main">
        <div class="portal-container">
          <PortalHomePage v-if="portalState.activePage === 'home'" />
          <ClueTriagePage v-else-if="portalState.activePage === 'clues'" />
          <DataRadarPage v-else-if="portalState.activePage === 'radar'" />
          <InspectionCasePage v-else-if="portalState.activePage === 'inspection'" />
          <EntityPanoramaPage v-else />
        </div>
      </main>

      <footer class="portal-footer">
        <div class="portal-container footer-inner">
          <p class="footer-note">
            <strong>夏津县纪检监察智能监督与执纪办案一体化平台（门户版）</strong>
            · AI 仅辅助解析并标注原文出处，所有分办、核查、销号与立案决定均由纪检监察干部人工核定并全程留痕。
          </p>
          <p class="footer-meta num-tabular">
            模拟基准日期：{{ TODAY }} · 本地确定性规则引擎与虚构示例数据 · 政务内网隔离部署基线
          </p>
        </div>
      </footer>

      <GlobalSearchDialog :open="searchOpen" @close="searchOpen = false" />
      <AuditLogDialog :open="auditOpen" @close="auditOpen = false" />
    </template>
  </div>
</template>

<style scoped>
.portal-app {
  min-block-size: 100dvh;
  display: flex;
  flex-direction: column;
}

.portal-main {
  flex: 1;
  padding-inline: var(--space-page-x);
  padding-block: var(--space-page-y);
  outline: none;
}

.portal-container {
  inline-size: 100%;
  max-inline-size: var(--container-max);
  margin-inline: auto;
}

.portal-footer {
  border-block-start: 1px solid var(--border-hairline);
  background: var(--bg-elevated);
  padding-inline: var(--space-page-x);
  padding-block: 0.9rem;
}

.footer-inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem 1.5rem;
}

.footer-note,
.footer-meta {
  margin: 0;
  font-size: 0.78rem;
  color: var(--ink-muted);
}

.footer-note strong {
  color: var(--ink-secondary);
}
</style>
