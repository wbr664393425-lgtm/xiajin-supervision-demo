<script setup lang="ts">
import { ShieldCheck, Lock, ScrollText, Users, Server, Network, Flag } from 'lucide-vue-next'
import { UiCard, UiTag } from '@/design/ui'
const phases = [
  { name: '一期', time: '先行上线', tone: 'red', items: ['信访举报解析与线索研判', '巡察台账批量阅卷', '纪检智能助手（问答、润色、纪要）', '审计日志与权限'] },
  { name: '二期', time: '数据接入后', tone: 'orange', items: ['农村三资智能监督', '惠民惠农资金比对', '风险一张图与监督月报', '整改闭环跟踪'] },
  { name: '三期', time: '深化应用', tone: 'yellow', items: ['招投标与公务支出筛查', '案件审理与案卷助手', '廉政档案与客观标签', '廉洁教育与舆情监测'] },
]
const security = [
  { icon: Server, title: '私有化本地部署', text: '正式部署时，大模型、知识库与业务数据全部运行在政务内网，模型本地推理，数据不出内网。' },
  { icon: Lock, title: '细粒度权限', text: '按角色、模块、操作与数据范围授权，敏感字段脱敏展示。' },
  { icon: ScrollText, title: '全程留痕', text: '查询、查看、生成、导出、确认均写入审计日志，可追溯可导出。' },
  { icon: Users, title: '人机协同边界', text: '智能引擎输出为疑点、初稿与参考；定性、量纪、审批、处置权完全由纪检干部行使。' },
]
</script>
<template>
  <div class="page">
    <UiCard :icon="Network" title="私有化部署架构">
      <div class="arch">
        <div class="zone"><span class="zl">政务内网 · 纪委监委机房</span>
          <div class="layer"><b>应用层</b><span>信访研判</span><span>穿透监督</span><span>智能巡察</span><span>审理案卷</span><span>廉政档案</span><span>教育舆情</span><span>智能助手</span></div>
          <div class="layer"><b>能力层</b><span>私有化大模型</span><span>文字识别 / 多模态</span><span>语音转写</span><span>规则引擎</span><span>向量知识库</span></div>
          <div class="layer"><b>数据层</b><span>线索与案件库</span><span>监督数据仓</span><span>知识库</span><span>审计日志</span></div>
          <div class="layer sec"><b>安全层</b><span>统一身份认证</span><span>权限与脱敏</span><span>操作审计</span><span>数据加密</span></div>
        </div>
        <div class="ext"><span>政务共享数据平台</span><span>纪检业务系统</span><span>12345 平台</span><em>经安全网关单向/授权接入</em></div>
      </div>
    </UiCard>
    <div class="grid2">
      <UiCard :icon="Flag" title="分步建设路线" subtitle="降低一期投入，先上线信访文书助手与巡察阅卷">
        <ol class="road"><li v-for="p in phases" :key="p.name"><div class="ph"><UiTag :tone="p.tone as any">{{ p.name }}</UiTag><small>{{ p.time }}</small></div><ul><li v-for="i in p.items" :key="i">{{ i }}</li></ul></li></ol>
      </UiCard>
      <UiCard :icon="ShieldCheck" title="安全与管控要求">
        <ul class="sec-list"><li v-for="s in security" :key="s.title"><span class="ic"><component :is="s.icon" :size="18" /></span><div><strong>{{ s.title }}</strong><p>{{ s.text }}</p></div></li></ul>
      </UiCard>
    </div>
  </div>
</template>
<style scoped>
.arch{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:16px;align-items:stretch}
.zone{position:relative;border:2px dashed var(--red-line);border-radius:var(--r-lg);padding:28px 16px 16px;background:var(--red-25);display:flex;flex-direction:column;gap:8px}
.zl{position:absolute;top:-11px;left:16px;background:var(--red);color:#fff;font-size:12px;padding:1px 10px;border-radius:10px}
.layer{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--line)}
.layer b{width:56px;font-size:13px;color:var(--red)}
.layer span{font-size:13px;padding:3px 10px;border-radius:6px;background:var(--surface-3)}
.layer.sec span{background:var(--cream);color:#7A5410}
.ext{display:flex;flex-direction:column;gap:8px;justify-content:center}
.ext span{padding:12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);font-size:13px;text-align:center}
.ext em{font-style:normal;font-size:12px;color:var(--text-3);text-align:center}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.road{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.road>li{padding:12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line)}
.ph{display:flex;align-items:center;gap:6px;margin-bottom:8px}
.ph small{font-size:12px;color:var(--text-3)}
.road ul li{font-size:13px;padding:3px 0 3px 12px;position:relative}
.road ul li::before{content:"";position:absolute;left:0;top:11px;width:5px;height:5px;border-radius:50%;background:var(--red)}
.sec-list li{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.sec-list li:last-child{border:0}
.ic{width:36px;height:36px;border-radius:10px;background:var(--red-50);color:var(--red);display:flex;align-items:center;justify-content:center;flex:none}
.sec-list strong{font-size:14px}
.sec-list p{font-size:13px;color:var(--text-2)}
@media(max-width:1200px){.grid2,.arch{grid-template-columns:1fr}}
</style>
