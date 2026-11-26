<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'crest' | 'dossier'
    size?: number
  }>(),
  {
    variant: 'crest',
    size: 36,
  },
)
</script>

<template>
  <!-- 原创几何印笺徽记：以“文书折页 + 准绳经纬 + 朱砂落印”表达澄明执纪，非官方徽章 -->
  <svg
    v-if="variant === 'crest'"
    aria-hidden="true"
    :width="size"
    :height="size"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="2" y="2" width="36" height="36" rx="9" fill="#173F5F" />
    <rect x="6" y="6" width="28" height="28" rx="6" stroke="#8FB8CE" stroke-opacity="0.38" stroke-width="1" />
    <!-- 经纬准绳 -->
    <path d="M20 9V31" stroke="#E8F2F6" stroke-width="1.6" stroke-linecap="round" />
    <path d="M11 16H29" stroke="#E8F2F6" stroke-width="1.6" stroke-linecap="round" />
    <!-- 卷宗折页 -->
    <path
      d="M12.5 21.5L16.5 25.5L20 21.5L23.5 25.5L27.5 21.5"
      stroke="#A8D0E2"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- 朱砂核验落印点 -->
    <rect x="26.5" y="10.5" width="4.5" height="4.5" rx="1" fill="#C9453A" />
  </svg>

  <!-- 原创案卷与原文批注场景插图 -->
  <svg
    v-else
    aria-hidden="true"
    :width="size"
    :height="size * 0.72"
    viewBox="0 0 220 158"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="14" y="18" width="136" height="122" rx="10" fill="#FFFFFF" stroke="#D5CFC1" stroke-width="1.5" />
    <rect x="28" y="34" width="66" height="8" rx="4" fill="#173F5F" fill-opacity="0.85" />
    <rect x="28" y="54" width="104" height="6" rx="3" fill="#E3DFD3" />
    <rect x="28" y="68" width="88" height="6" rx="3" fill="#E3DFD3" />
    <!-- 原文锚定荧光标段 -->
    <rect x="28" y="82" width="96" height="10" rx="3" fill="#E8F2F6" stroke="#155E75" stroke-dasharray="3 2" stroke-width="1.2" />
    <rect x="28" y="102" width="76" height="6" rx="3" fill="#E3DFD3" />
    <rect x="28" y="116" width="54" height="6" rx="3" fill="#E3DFD3" />
    <!-- 引出线与人工核定印章卡片 -->
    <path d="M124 87H154" stroke="#155E75" stroke-width="1.6" stroke-dasharray="3 2" />
    <circle cx="124" cy="87" r="3.5" fill="#155E75" />
    <rect x="148" y="50" width="60" height="72" rx="8" fill="#FAF9F5" stroke="#186043" stroke-width="1.5" />
    <rect x="158" y="63" width="38" height="6" rx="3" fill="#186043" fill-opacity="0.8" />
    <rect x="158" y="77" width="40" height="5" rx="2.5" fill="#D5CFC1" />
    <rect x="158" y="89" width="32" height="5" rx="2.5" fill="#D5CFC1" />
    <circle cx="178" cy="108" r="8" fill="#FCECEA" stroke="#B02E23" stroke-width="1.4" />
    <path d="M174.5 108L177 110.5L182 105.5" stroke="#B02E23" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
