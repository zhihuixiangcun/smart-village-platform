<template>
  <view
    class="uni-list-item"
    :class="{ 'uni-list-item--disabled': disabled }"
    :style="{ backgroundColor: disabled ? '#f5f5f5' : '#fff' }"
    @click="onClick"
  >
    <view class="uni-list-item__container" :class="{ 'uni-list-item--border': border }">
      <slot name="header">
        <view v-if="thumb" class="uni-list-item__icon">
          <image :src="thumb" class="uni-list-item__icon-img" :style="{ width: thumbSize, height: thumbSize }" />
        </view>
      </slot>

      <view class="uni-list-item__content">
        <slot></slot>
        <view v-if="!$slots.default" class="uni-list-item__content-title">{{ title }}</view>
        <view v-if="note" class="uni-list-item__content-note">{{ note }}</view>
      </view>

      <slot name="footer">
        <view v-if="showArrow || showBadge" class="uni-list-item__extra">
          <uni-badge v-if="showBadge" :text="badgeText" :type="badgeType" />
          <uni-icons v-if="showArrow" type="arrow-right" :size="16" color="#999" />
        </view>
      </slot>
    </view>
  </view>
</template>

<script setup>
import UniIcons from './UniIcons.vue'
import UniBadge from './UniBadge.vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  thumb: {
    type: String,
    default: ''
  },
  thumbSize: {
    type: String,
    default: '40px'
  },
  showArrow: {
    type: Boolean,
    default: true
  },
  showBadge: {
    type: Boolean,
    default: false
  },
  badgeText: {
    type: [String, Number],
    default: ''
  },
  badgeType: {
    type: String,
    default: 'error'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: true
  },
  border: {
    type: Boolean,
    default: true
  },
  to: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])

const onClick = () => {
  if (props.disabled || !props.clickable) return
  emit('click')
  if (props.to) {
    uni.navigateTo({ url: props.to })
  }
}
</script>

<style lang="scss" scoped>
.uni-list-item {
  background-color: #fff;
  font-size: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.uni-list-item--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.uni-list-item__container {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 16px;
  position: relative;
}

.uni-list-item--border {
  position: relative;
}

.uni-list-item--border::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 0;
  bottom: 0;
  height: 1px;
  background-color: #e5e5e5;
  transform: scaleY(0.5);
}

.uni-list-item__icon {
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.uni-list-item__icon-img {
  border-radius: 8px;
}

.uni-list-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.uni-list-item__content-title {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uni-list-item__content-note {
  margin-top: 6px;
  font-size: 14px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uni-list-item__extra {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
