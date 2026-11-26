<script setup lang="ts">
import { Check } from 'lucide-vue-next'
defineProps<{ steps: { label: string; detail?: string }[]; current: number }>()
</script>
<template>
  <ol class="ui-steps">
    <li v-for="(step, i) in steps" :key="step.label" :class="{ done: i < current, active: i === current }">
      <span class="mark"><Check v-if="i < current" :size="12" :stroke-width="3" /><template v-else>{{ i + 1 }}</template></span>
      <div><strong>{{ step.label }}</strong><small v-if="step.detail">{{ step.detail }}</small></div>
    </li>
  </ol>
</template>
<style scoped>
.ui-steps{display:flex;gap:6px}
li{flex:1;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);min-width:0;position:relative}
.mark{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;background:var(--surface);color:var(--text-3);box-shadow:inset 0 0 0 1.5px var(--line-2);flex:none}
li.active{background:var(--red-25);border-color:var(--red-line)}
li.active .mark{background:var(--red);color:var(--on-brand);box-shadow:none}
li.done .mark{background:var(--ok);color:#fff;box-shadow:none}
strong{display:block;font-size:13px;font-weight:600;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
small{display:block;font-size:12px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style>
