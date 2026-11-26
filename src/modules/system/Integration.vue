<script setup lang="ts">
import { Plug, Database, Server, Cpu } from 'lucide-vue-next'
import { UiCard, UiTag, AiNotice } from '@/design/ui'
import { integrationGroups } from '@/mock/system'
const icons = [Server, Database, Cpu]
const groups = integrationGroups.map((g, i) => ({ ...g, icon: icons[i] }))
const apis = [['线索双向同步', '推送', '与纪检监察业务系统同步线索，附原件附件校验值'], ['户籍状态批量查询', '查询', '身份证号脱敏传输，用于惠民资金比对'], ['大模型推理', '推送', '私有化部署，推理不出政务内网'], ['文字识别', '推送', '返回识别字段与置信度']]
const tone = (s: string) => s === '样例数据' ? 'gold' : s === '预留接口' ? 'blue' : s === '已联调' ? 'green' : 'gray'
</script>
<template>
  <div class="page">
    <div class="legend"><Plug :size="16" />状态说明：<UiTag tone="green">已联调</UiTag>接口已打通 · <UiTag tone="gold">样例数据</UiTag>以样例数据跑通数据流 · <UiTag tone="blue">预留接口</UiTag>已定义接入规范 · <UiTag tone="gray">待部署</UiTag>正式部署时在政务内网接入</div>
    <div class="grid3">
      <UiCard v-for="g in groups" :key="g.title" :icon="g.icon" :title="g.title" flush>
        <ul><li v-for="i in g.items" :key="i[0]"><div><strong>{{ i[0] }}</strong><small>{{ i[2] }}</small></div><UiTag size="sm" :tone="tone(i[1]!)">{{ i[1] }}</UiTag></li></ul>
      </UiCard>
    </div>
    <UiCard title="接口约定" subtitle="与现有业务系统、共享平台对接，不搞信息孤岛">
      <ul class="apis">
        <li v-for="a in apis" :key="a[0]"><b>{{ a[0] }}</b><UiTag size="sm" tone="gray">{{ a[1] }}</UiTag><span>{{ a[2] }}</span></li>
      </ul>
      <p class="apis-note">所有接口经统一身份认证，调用记录写入审计日志。</p>
    </UiCard>
    <AiNotice text="当前未连接外部业务系统，各页面中的“已同步”状态以样例数据展示。" />
  </div>
</template>
<style scoped>
.legend{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:13px;color:var(--text-2);padding:10px 14px;border-radius:var(--r-md);background:var(--surface);border:1px solid var(--line)}
.grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
li{display:flex;align-items:center;gap:10px;padding:11px 18px;border-bottom:1px solid var(--line)}
li:last-child{border:0}
li div{flex:1;min-width:0}
li strong{display:block;font-size:14px;font-weight:500}
li small{font-size:12px;color:var(--text-3)}
@media(max-width:1200px){.grid3{grid-template-columns:1fr}}
.apis{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.apis li{display:grid;grid-template-columns:140px 56px 1fr;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);font-size:14px}
.apis b{font-weight:600}
.apis span{color:var(--text-2)}
.apis-note{font-size:13px;color:var(--text-3);margin-top:10px}
</style>
