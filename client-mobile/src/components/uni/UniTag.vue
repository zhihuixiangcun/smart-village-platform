<template>
  <text
    class="uni-tag"
    :class="[
      'uni-tag--' + type,
      'uni-tag--' + size,
      inverted ? 'uni-tag--' + type + '--inverted' : '',
      circle ? 'uni-tag--circle' : '',
      text ? '' : 'uni-tag--mark'
    ]"
    :style="customStyle"
    @click="onClick"
  >
    <slot></slot>
    {{ text }}
  </text>
</template>

<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'default' // 'default' | 'primary' | 'success' | 'warning' | 'error'
  },
  size: {
    type: String,
    default: 'normal' // 'normal' | 'small' | 'mini'
  },
  text: {
    type: String,
    default: ''
  },
  inverted: {
    type: Boolean,
    default: false
  },
  circle: {
    type: Boolean,
    default: false
  },
  mark: {
    type: Boolean,
    default: false
  },
  customStyle: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['click'])

const onClick = () => {
  emit('click')
}
</script>

<style lang="scss" scoped>
.uni-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
  white-space: nowrap;
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #f5f5f5;
}

.uni-tag--primary {
  background-color: #10b981;
  color: #fff;
  border-color: #10b981;
}

.uni-tag--success {
  background-color: #52c41a;
  color: #fff;
  border-color: #52c41a;
}

.uni-tag--warning {
  background-color: #faad14;
  color: #fff;
  border-color: #faad14;
}

.uni-tag--error {
  background-color: #ff4d4f;
  color: #fff;
  border-color: #ff4d4f;
}

.uni-tag--primary--inverted,
.uni-tag--success--inverted,
.uni-tag--warning--inverted,
.uni-tag--error--inverted {
  background-color: transparent;
  color: inherit;
}

.uni-tag--primary--inverted {
  color: #10b981;
  border-color: #10b981;
}

.uni-tag--success--inverted {
  color: #52c41a;
  border-color: #52c41a;
}

.uni-tag--warning--inverted {
  color: #faad14;
  border-color: #faad14;
}

.uni-tag--error--inverted {
  color: #ff4d4f;
  border-color: #ff4d4f;
}

.uni-tag--small {
  padding: 2px 8px;
  font-size: 12px;
}

.uni-tag--mini {
  padding: 1px 6px;
  font-size: 10px;
}

.uni-tag--circle {
  border-radius: 20px;
}

.uni-tag--mark {
  border-radius: 0 20px 20px 0;
  padding-left: 6px;
  padding-right: 10px;
}
</style>
