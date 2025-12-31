<template>
  <view :class="['uni-icons', `uni-icons-${type}`]" :style="iconStyle">
    <text v-if="useSvg" v-html="svgIcon"></text>
    <text v-else>{{ unicodeIcon }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: ''
  },
  size: {
    type: [String, Number],
    default: 16
  },
  color: {
    type: String,
    default: '#333'
  }
})

const iconStyle = computed(() => ({
  fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size,
  color: props.color
}))

// Unicode图标映射
const unicodeIcons = {
  'home': '\ue100',
  'notification': '\ue101',
  'calendar': '\ue102',
  'vote': '\ue103',
  'finance': '\ue104',
  'service': '\ue105',
  'life': '\ue106',
  'profile': '\ue107',
  'arrow-right': '\ue108',
  'arrow-left': '\ue109',
  'check': '\ue10a',
  'close': '\ue10b',
  'search': '\ue10c'
}

const svgIcons = {
  'home': '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
  'notification': '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>',
  'calendar': '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg>',
  'vote': '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
  'finance': '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>',
  'arrow-right': '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>',
  'arrow-left': '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>',
  'check': '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
  'close': '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
  'search': '<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>'
}

const useSvg = computed(() => {
  return svgIcons[props.type] !== undefined
})

const svgIcon = computed(() => {
  return svgIcons[props.type] || ''
})

const unicodeIcon = computed(() => {
  return unicodeIcons[props.type] || ''
})
</script>

<style lang="scss" scoped>
.uni-icons {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
}

.uni-icons text {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
