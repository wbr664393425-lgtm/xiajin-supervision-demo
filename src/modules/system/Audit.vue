<script setup lang="ts">
import { showCode } from '@/app/code'
import { computed, ref } from 'vue'
import { ScrollText, Download, Search } from 'lucide-vue-next'
import { UiCard, UiTag, UiButton, UiEmpty, UiSelect } from '@/design/ui'
import { useSystemStore } from '@/stores/system'
import { roles } from '@/app/permissions'
import { moduleOf, modules } from '@/app/modules'
import { downloadText } from '@/app/download'
const system = useSystemStore()
const q = ref(''), action = ref(''), mod = ref('')
const acts = ['查看', '查询', '生成', '导出', '确认', '修改', '流转', '登录', '重置']
const rows = computed(() => system.audit.filter(a => (!action.value || a.action === action.value) && (!mod.value || a.module === mod.value) && (!q.value || `${a.user}${a.target}${a.detail}`.includes(q.value))))
const tone: Record<string, any> = { 查看: 'gray', 查询: 'blue', 生成: 'ai', 导出: 'gold', 确认: 'green', 修改: 'orange', 流转: 'red', 登录: 'gray', 重置: 'orange' }
function exp() { downloadText('审计日志.csv', ['时间,用户,角色,模块,动作,对象,详情,资料标识', ...rows.value.map(a => [a.time, a.user, roles[a.role].name, moduleOf(a.module)?.title, a.action, a.target, a.detail, '样例/演示'].map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))].join('\n'), 'text/csv;charset=utf-8'); system.log('system', '导出', '审计日志', `导出 ${rows.value.length} 条`) }
</script>
<template>
  <div class="page">
    <div class="stat-row"><div v-for="a in ['查看', '查询', '生成', '导出']" :key="a" class="st"><span>{{ a }}</span><strong class="num">{{ system.audit.filter(x => x.action === a).length }}</strong></div><div class="st"><span>记录总数</span><strong class="num">{{ system.audit.length }}</strong></div></div>
    <UiCard :icon="ScrollText" title="审计日志" subtitle="谁在何时查看了什么、生成了什么材料、做了什么决定" flush>
      <template #extra>
        <label class="search"><Search :size="14" /><input v-model="q" placeholder="用户 / 对象 / 详情" aria-label="搜索日志" /></label>
        <UiSelect v-model="mod" size="sm" class="w130" label="模块" :options="[{ value: '', label: '全部模块' }, ...modules.map(m => ({ value: m.key, label: m.short }))]" />
        <UiSelect v-model="action" size="sm" class="w130" label="动作" :options="[{ value: '', label: '全部动作' }, ...acts]" />
        <UiButton size="sm" variant="primary" :icon="Download" @click="exp">导出表格</UiButton>
      </template>
      <UiEmpty v-if="!rows.length" title="没有匹配的记录" />
      <div v-else class="tbl-wrap"><table class="tbl"><thead><tr><th>时间</th><th>用户 / 角色</th><th>模块</th><th>动作</th><th>对象</th><th>详情</th></tr></thead>
        <tbody><tr v-for="a in rows.slice(0, 200)" :key="a.id"><td class="num nowrap">{{ a.time }}</td><td>{{ a.user }}<div class="muted sub">{{ roles[a.role].name }}</div></td><td>{{ moduleOf(a.module)?.short }}</td><td><UiTag size="sm" :tone="tone[a.action]">{{ a.action }}</UiTag></td><td class="num">{{ showCode(a.target) }}</td><td class="detail">{{ a.detail }}</td></tr></tbody></table></div>
    </UiCard>
  </div>
</template>
<style scoped>
.stat-row{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.st{padding:14px 16px;border-radius:var(--r-md);background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-1)}
.st span{font-size:13px;color:var(--text-3)}
.st strong{display:block;font-size:24px;color:var(--red)}
.search{display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:1px solid var(--line-2);border-radius:8px;color:var(--text-3)}
.search input{border:0;outline:0;width:140px;font-size:13px;background:none}
.mini{height:30px;padding:0 8px;font-size:13px;width:auto}
.sub{font-size:12px}
.nowrap{white-space:nowrap}
.detail{font-size:13px;color:var(--text-2);max-width:420px}
</style>
