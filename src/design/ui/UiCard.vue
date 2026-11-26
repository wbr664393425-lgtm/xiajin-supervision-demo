<script setup lang="ts">
withDefaults(defineProps<{ title?: string; subtitle?: string; icon?: any; padded?: boolean; flush?: boolean }>(), { padded: true })
</script>
<template>
  <section class="ui-card" :class="{ flush }">
    <header v-if="title || $slots.extra || $slots.title" class="ui-card-head">
      <div class="ui-card-title">
        <span v-if="icon" class="ui-card-icon"><component :is="icon" :size="16" /></span>
        <div><h3><slot name="title">{{ title }}</slot></h3><p v-if="subtitle">{{ subtitle }}</p></div>
      </div>
      <div class="ui-card-extra"><slot name="extra" /></div>
    </header>
    <div class="ui-card-body" :class="{ padded: padded && !flush }"><slot /></div>
    <footer v-if="$slots.footer" class="ui-card-foot"><slot name="footer" /></footer>
  </section>
</template>
<style scoped>
.ui-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow-1);min-width:0;display:flex;flex-direction:column}
.ui-card-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px 12px;padding:14px 18px 0}
.flush .ui-card-head{padding-bottom:12px;border-bottom:1px solid var(--line)}
.ui-card-title{display:flex;align-items:center;gap:10px;min-width:0;flex:1 1 220px}
.ui-card-title>div{min-width:0}
.ui-card-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--red-50);color:var(--red)}
.ui-card-title h3{font-size:15px;font-weight:600;line-height:1.4}
.ui-card-title p{font-size:13px;color:var(--text-3);line-height:1.5;margin-top:1px}
.ui-card-extra{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:8px;max-width:100%}
.ui-card-body{flex:1;min-width:0}
.ui-card-body.padded{padding:14px 18px 18px}
.ui-card-foot{padding:12px 18px;border-top:1px solid var(--line);background:var(--surface-2);border-radius:0 0 var(--r-md) var(--r-md);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
</style>
