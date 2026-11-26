<script setup lang="ts">
import { Check, Minus, UserCog } from 'lucide-vue-next'
import { UiCard, UiButton, UiTag, AiNotice } from '@/design/ui'
import { roles } from '@/app/permissions'
import { modules } from '@/app/modules'
import { useSystemStore } from '@/stores/system'
import type { RoleKey } from '@/types'
const system = useSystemStore()
const actions = [['task', '生成核查任务'], ['confirm', '确认 / 排除疑点'], ['export', '导出文书与报告'], ['audit', '查看审计日志']]
const keys = Object.keys(roles) as RoleKey[]
</script>
<template>
  <div class="page">
    <UiCard :icon="UserCog" title="角色与权限矩阵" subtitle="模块访问与操作权限，路由守卫和按钮级权限同时生效，正式部署对接统一身份认证" flush>
      <div class="tbl-wrap"><table class="tbl matrix">
        <thead><tr><th>模块 / 操作</th><th v-for="k in keys" :key="k" :class="{ cur: system.role === k }">{{ roles[k].name }}<UiTag v-if="system.role === k" size="sm" tone="red">当前</UiTag></th></tr></thead>
        <tbody>
          <tr v-for="m in modules" :key="m.key"><td><span class="mod"><component :is="m.icon" :size="15" />{{ m.title }}</span></td><td v-for="k in keys" :key="k" :class="{ cur: system.role === k }"><Check v-if="roles[k].modules.includes(m.key)" :size="16" class="yes" /><Minus v-else :size="16" class="no" /></td></tr>
          <tr class="sep"><td :colspan="keys.length + 1">操作权限</td></tr>
          <tr v-for="a in actions" :key="a[0]"><td>{{ a[1] }}</td><td v-for="k in keys" :key="k" :class="{ cur: system.role === k }"><Check v-if="roles[k].actions.includes(a[0]!)" :size="16" class="yes" /><Minus v-else :size="16" class="no" /></td></tr>
          <tr><td>切换为该角色体验</td><td v-for="k in keys" :key="k" :class="{ cur: system.role === k }"><UiButton size="sm" :variant="system.role === k ? 'soft' : 'secondary'" :disabled="system.role === k" @click="system.setRole(k)">{{ system.role === k ? '使用中' : '切换' }}</UiButton></td></tr>
        </tbody>
      </table></div>
    </UiCard>
    <AiNotice text="正式部署时对接统一身份认证，按岗位授予数据范围（如仅限本乡镇），并对敏感字段脱敏展示。" />
  </div>
</template>
<style scoped>
.matrix th,.matrix td{text-align:center}
.matrix th:first-child,.matrix td:first-child{text-align:left}
.matrix th{white-space:normal}
.matrix .cur{background:var(--red-25)}
.mod{display:inline-flex;align-items:center;gap:8px;color:var(--text)}
.mod svg{color:var(--red)}
.yes{color:var(--ok)}.no{color:var(--text-4)}
.sep td{background:var(--surface-3);font-size:12px;color:var(--text-3);text-align:left!important;padding:6px 14px}
</style>
