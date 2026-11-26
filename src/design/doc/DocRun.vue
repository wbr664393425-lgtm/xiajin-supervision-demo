<script setup lang="ts">
defineProps<{ segs: { text: string; tag?: string; start: number }[]; active?: string }>()
const emit = defineEmits<{ pick: [key: string] }>()
</script>
<template><template v-for="s in segs" :key="s.start"><mark v-if="s.tag" :class="[s.tag.split('|')[0], { active: active && s.tag.split('|')[1] === active }]" @click="emit('pick', s.tag.split('|')[1] || '')">{{ s.text }}</mark><template v-else>{{ s.text }}</template></template></template>
