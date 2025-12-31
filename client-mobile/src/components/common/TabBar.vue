<template>
  <view class="tab-bar">
    <view
      v-for="(item, index) in tabList"
      :key="index"
      :class="['tab-bar__item', { 'tab-bar__item--active': currentIndex === index }]"
      @click="handleTabClick(item, index)"
    >
      <!-- 图标 -->
      <view class="tab-bar__icon">
        <text class="icon">{{ currentIndex === index ? item.selectedIcon : item.icon }}</text>
      </view>

      <!-- 文字 -->
      <view class="tab-bar__text">{{ item.text }}</view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useElderlyStore } from '@/store/elderly'

/**
 * 底部导航栏组件
 * 适老化设计，支持语音播报
 */

const props = defineProps({
  // 当前激活的tab索引
  current: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['change'])

const elderlyStore = useElderlyStore()

// 导航配置
const tabList = [
  {
    icon: '🏣',
    selectedIcon: '🏛️',
    text: '村务',
    pagePath: '/pages/village/index'
  },
  {
    icon: '📋',
    selectedIcon: '📝',
    text: '服务',
    pagePath: '/pages/services/index'
  },
  {
    icon: '🌾',
    selectedIcon: '🌱',
    text: '生活',
    pagePath: '/pages/life/index'
  },
  {
    icon: '👤',
    selectedIcon: '👨‍👩‍👧‍👦',
    text: '我的',
    pagePath: '/pages/profile/index'
  }
]

// 当前索引
const currentIndex = computed(() => props.current)

// 点击tab
const handleTabClick = (item, index) => {
  if (currentIndex.value === index) return

  // 触觉反馈
  elderlyStore.vibrate('short')

  // 语音播报（适老化模式）
  if (elderlyStore.isElderlyMode) {
    elderlyStore.speak(item.text)
  }

  emit('change', { index, item })

  // 跳转页面
  uni.switchTab({
    url: item.pagePath
  })
}
</script>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: calc(100rpx + env(safe-area-inset-bottom, 0));
  padding-bottom: env(safe-area-inset-bottom, 0);
  background-color: #FFFFFF;
  border-top: 1rpx solid var(--color-border-primary, #E2E8F0);
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 1000;

  // 适老化模式 - 大字版
  :global(.elderly-mode-large) & {
    height: calc(120rpx + env(safe-area-inset-bottom, 0));
  }

  // 适老化模式 - 超大字版
  :global(.elderly-mode-xl) & {
    height: calc(140rpx + env(safe-area-inset-bottom, 0));
  }

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    padding: 16rpx 0;
    transition: all 0.3s ease;

    // 适老化模式
    :global(.elderly-mode-large) & {
      gap: 12rpx;
      padding: 20rpx 0;
    }

    :global(.elderly-mode-xl) & {
      gap: 16rpx;
      padding: 24rpx 0;
    }

    &--active {
      .tab-bar__icon {
        transform: scale(1.1);
      }

      .tab-bar__text {
        color: var(--color-primary, #2F855A);
        font-weight: 600;
      }
    }
  }

  &__icon {
    font-size: 48rpx;
    line-height: 1;
    transition: transform 0.3s ease;

    // 适老化模式
    :global(.elderly-mode-large) & {
      font-size: 56rpx;
    }

    :global(.elderly-mode-xl) & {
      font-size: 64rpx;
    }
  }

  &__text {
    font-size: 24rpx;
    color: var(--color-text-secondary, #4A5568);
    line-height: 1;

    // 适老化模式
    :global(.elderly-mode-large) & {
      font-size: 28rpx;
    }

    :global(.elderly-mode-xl) & {
      font-size: 32rpx;
    }
  }
}
</style>