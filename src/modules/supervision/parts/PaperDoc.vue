<script setup lang="ts">
/** 模拟“扫描件/照片”的纸面预览，用于多模态与 文字识别 演示。 */
defineProps<{ title: string; lines: string[]; stamp?: string; scanning?: boolean; kind?: 'contract' | 'receipt' | 'invoice' }>()
</script>
<template>
  <div class="paper" :class="[kind, { scanning }]">
    <h5>{{ title }}</h5>
    <p v-for="(l, i) in lines" :key="i">{{ l }}</p>
    <span v-if="stamp" class="stamp">{{ stamp }}</span>
    <i class="scan" />
  </div>
</template>
<style scoped>
.paper{position:relative;overflow:hidden;background:#FFFDF8;border:1px solid #E9E0CE;border-radius:6px;padding:22px 22px 26px;box-shadow:0 2px 0 #EDE4D2,0 10px 24px rgba(80,50,20,.10);transform:rotate(-.6deg);font-family:var(--font-serif);color:#3A332B;min-height:220px}
.paper.receipt{background:#FFF9F2;transform:rotate(.8deg)}
.paper::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 27px,rgba(160,120,60,.06) 27px 28px);pointer-events:none}
h5{font-size:16px;text-align:center;letter-spacing:.2em;margin:0 0 12px;color:#2B241D}
p{font-size:13px;line-height:1.95;margin:0}
.stamp{position:absolute;right:26px;bottom:22px;width:84px;height:84px;border-radius:50%;border:2.5px solid rgba(201,21,25,.62);color:rgba(201,21,25,.7);display:flex;align-items:center;justify-content:center;text-align:center;font-size:11px;font-weight:700;transform:rotate(-14deg);padding:8px;line-height:1.3}
.scan{position:absolute;left:0;right:0;top:-40%;height:40%;background:linear-gradient(180deg,transparent,rgba(201,21,25,.10) 80%,rgba(201,21,25,.45));opacity:0;pointer-events:none}
.scanning .scan{opacity:1;animation:scan 1.2s ease-in-out infinite}
@keyframes scan{to{top:100%}}
</style>
