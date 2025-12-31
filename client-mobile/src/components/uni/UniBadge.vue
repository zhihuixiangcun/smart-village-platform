<template>
  <view class="uni-badge" :class="['uni-badge--' + type, absolute ? 'uni-badge--absolute' : '']">
    <slot></slot>
    <text v-if="text" :class="['uni-badge__' + (dot ? 'dot' : 'text')]" :style="{ backgroundColor: bgColor }">
      {{ dot ? '' : text }}
    </text>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  text: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'error' // 'error' | 'success' | 'warning' | 'info'
  },
  size: {
    type: String,
    default: 'small' // 'small' | 'normal'
  },
  absolute: {
    type: Boolean,
    default: false
  },
  offset: {
    type: Array,
    default: () => [0, 0]
  },
  dot: {
    type: Boolean,
    default: false
  },
  maxNum: {
    type: Number,
    default: 99
  },
  isDot: {
    type: Boolean,
    default: false
  },
  customStyle: {
    type: Object,
    default: () => ({})
  }
})

const displayText = computed(() => {
  if (props.dot) return ''
  const num = Number(props.text)
  if (!isNaN(num) && num > props.maxNum) {
    return props.maxNum + '+'
  }
  return props.text
})

const bgColor = computed(() => {
  const colors = {
    error: '#ff4d4f',
    success: '#52c41a',
    warning: '#faad14',
    info: '#1890ff'
  }
  return props.customStyle.backgroundColor || colors[props.type] || colors.error
})
</script>

<style lang="scss" scoped>
.uni-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.uni-badge--absolute {
  position: absolute;
  top: 0;
  right: 0;
}

.uni-badge__text {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background-color: #ff4d4f;
  color: #fff;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 10;
}

.uni-badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ff4d4f;
  position: absolute;
  top: -2px;
  right: -2px;
  z-index: 10;
}

.uni-badge--small .uni-badge__text {
  height: 16px;
  min-width: 16px;
  font-size: 10px;
  padding: 0 4px;
}
</style>
