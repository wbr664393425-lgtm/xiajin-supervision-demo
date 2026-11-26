<script setup lang="ts">defineProps<{ size?: number }>()</script>
<template>
  <svg :width="size || 34" :height="size || 34" viewBox="0 0 48 48" aria-hidden="true">
    <rect x="1" y="1" width="46" height="46" rx="12" fill="var(--mark-fill)" stroke="var(--mark-rim)" />
    <path d="M24 8 36 12.5v9.8c0 8-5.1 13.9-12 16.4-6.9-2.5-12-8.4-12-16.4v-9.8L24 8Z" fill="none" stroke="var(--mark-shield)" stroke-width="2.2" stroke-linejoin="round" />
    <path d="M18 23.5 22.4 28 30.5 19.5" fill="none" stroke="var(--mark-check)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
