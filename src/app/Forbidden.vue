<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LockKeyhole } from 'lucide-vue-next'
import { UiButton, UiCard } from '@/design/ui'
import { useSystemStore } from '@/stores/system'
import { roles } from './permissions'
import { modules } from './modules'
const route = useRoute(), router = useRouter(), system = useSystemStore()
const target = computed(() => modules.find(m => String(route.query.from || '').startsWith(`/${m.key}`)))
const allowed = computed(() => (Object.keys(roles) as (keyof typeof roles)[]).filter(r => target.value && roles[r].modules.includes(target.value.key)))
</script>
<template>
  <div class="page forbidden">
    <UiCard>
      <div class="box">
        <span class="lock"><LockKeyhole :size="26" /></span>
        <h1>当前角色无权访问「{{ target?.title || '该页面' }}」</h1>
        <p>你当前是 <strong>{{ roles[system.role].name }}</strong>。按细粒度权限设置，该模块仅对以下角色开放：{{ allowed.map(r => roles[r].name).join('、') || '—' }}。</p>
        <p class="muted">可在右上角切换角色查看效果；正式部署时由统一身份认证授予。</p>
        <UiButton variant="primary" @click="router.push('/home/dashboard')">返回工作台</UiButton>
      </div>
    </UiCard>
  </div>
</template>
<style scoped>
.box{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:48px 20px}
.lock{width:60px;height:60px;border-radius:18px;background:var(--red-50);color:var(--red);display:flex;align-items:center;justify-content:center;margin-bottom:6px}
h1{font-size:20px}
p{max-width:560px;color:var(--text-2)}
</style>
