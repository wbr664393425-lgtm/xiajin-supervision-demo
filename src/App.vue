<script setup lang="ts">
import demoWatermark from './assets/demo-watermark.svg?raw'
</script>

<template>
  <RouterView />
  <Teleport to="body"><div v-html="demoWatermark" /></Teleport>
</template>
