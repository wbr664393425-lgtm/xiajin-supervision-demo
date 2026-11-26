<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, Sparkles, UserCheck } from 'lucide-vue-next'
import type { RiskLevel } from '@/domain/types'

defineProps<{
  tone: RiskLevel | 'ok' | 'info' | 'ai' | 'human'
  label: string
}>()
</script>

<template>
  <span class="status-badge" :class="`tone-${tone}`">
    <ShieldAlert v-if="tone === 'high'" :size="13" aria-hidden="true" />
    <AlertTriangle v-else-if="tone === 'mid'" :size="13" aria-hidden="true" />
    <Clock v-else-if="tone === 'low' || tone === 'info'" :size="13" aria-hidden="true" />
    <CheckCircle2 v-else-if="tone === 'ok'" :size="13" aria-hidden="true" />
    <Sparkles v-else-if="tone === 'ai'" :size="13" aria-hidden="true" />
    <UserCheck v-else-if="tone === 'human'" :size="13" aria-hidden="true" />
    <span>{{ label }}</span>
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  padding-inline: 0.55rem;
  padding-block: 0.2rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
  border: 1px solid transparent;
}

.tone-high {
  background: var(--vermilion-tint);
  color: var(--vermilion);
  border-color: var(--vermilion-border);
}

.tone-mid {
  background: var(--amber-tint);
  color: var(--amber);
  border-color: var(--amber-border);
}

.tone-low,
.tone-info {
  background: var(--brand-teal-tint);
  color: var(--brand-teal);
  border-color: var(--brand-teal-border);
}

.tone-ok {
  background: var(--pine-tint);
  color: var(--pine);
  border-color: var(--pine-border);
}

.tone-ai {
  background: var(--brand-teal-tint);
  color: var(--brand-teal);
  border: 1px dashed var(--brand-teal);
}

.tone-human {
  background: var(--pine-tint);
  color: var(--pine);
  border: 1px solid var(--pine);
}
</style>
