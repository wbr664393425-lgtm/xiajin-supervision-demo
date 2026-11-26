<script setup lang="ts">
import { computed } from 'vue'
const props=defineProps<{status:string}>()
const tone=computed(()=>/完成|通过|销号|核实/.test(props.status)?'green':/高关注/.test(props.status)?'red':/优先|重复|待核查|待人工/.test(props.status)?'orange':/处理|整改中|复核|分派/.test(props.status)?'blue':'')
</script>
<template><span class="badge" :class="tone">{{status}}</span></template>
