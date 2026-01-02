<template>
  <div class="tab-bar">
    <div
      v-for="(item, index) in tabList"
      :key="index"
      :class="['tab-bar__item', { 'tab-bar__item--active': currentIndex === index }]"
      @click="handleTabClick(item, index)"
    >
      <!-- 图标 -->
      <div class="tab-bar__icon">
        <span class="icon">{{ currentIndex === index ? item.selectedIcon : item.icon }}</span>
        <!-- 消息红点 -->
        <span v-if="item.showBadge && unreadCount > 0" class="tab-bar__badge">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </div>

      <!-- 文字 -->
      <div class="tab-bar__text">{{ item.text }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useElderlyStore } from '@/store/elderly'
import { useChatStore } from '@/store/chat'

/**
 * 底部导航栏组件
 * 适老化设计，支持语音播报
 */

const router = useRouter()
const route = useRoute()
const elderlyStore = useElderlyStore()
const chatStore = useChatStore()

const props = defineProps({
  // 当前激活的tab索引
  current: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['change'])

// 未读消息数
const unreadCount = computed(() => chatStore.unreadCount)

// 导航配置
const tabList = [
  {
    icon: '🏣',
    selectedIcon: '🏛️',
    text: '村务',
    path: '/village'
  },
  {
    icon: '📋',
    selectedIcon: '📝',
    text: '服务',
    path: '/services'
  },
  {
    icon: '🌾',
    selectedIcon: '🌱',
    text: '生活',
    path: '/life'
  },
  {
    icon: '💬',
    selectedIcon: '💬',
    text: '消息',
    path: '/chat',
    showBadge: true
  },
  {
    icon: '👤',
    selectedIcon: '👨‍👩‍👧‍👦',
    text: '我的',
    path: '/profile'
  }
]

// 当前索引
const currentIndex = computed(() => {
  // 根据当前路由判断激活状态
  const path = route.path
  if (path.startsWith('/village')) return 0
  if (path.startsWith('/services')) return 1
  if (path.startsWith('/life')) return 2
  if (path.startsWith('/chat')) return 3
  if (path.startsWith('/profile')) return 4
  return props.current
})

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
  router.push(item.path)
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
  height: calc(50px + env(safe-area-inset-bottom, 0));
  padding-bottom: env(safe-area-inset-bottom, 0);
  background-color: #FFFFFF;
  border-top: 1px solid #E2E8F0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  z-index: 1000;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 0;
    transition: all 0.3s ease;
    cursor: pointer;

    &--active {
      .tab-bar__icon {
        transform: scale(1.1);
      }

      .tab-bar__text {
        color: #2F855A;
        font-weight: 600;
      }
    }
  }

  &__icon {
    position: relative;
    font-size: 24px;
    line-height: 1;
    transition: transform 0.3s ease;
  }

  &__badge {
    position: absolute;
    top: -4px;
    right: -8px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    background: #ff4d4f;
    color: #fff;
    font-size: 10px;
    line-height: 16px;
    text-align: center;
    border-radius: 8px;
    transform: scale(1);
    animation: badge-bounce 0.3s ease;
  }

  &__text {
    font-size: 12px;
    color: #4A5568;
    line-height: 1;
  }
}

// 适老化模式 - 大字版
[data-elderly-mode="large"] {
  .tab-bar {
    height: calc(60px + env(safe-area-inset-bottom, 0));

    &__item {
      gap: 6px;
      padding: 10px 0;
    }

    &__icon {
      font-size: 28px;
    }

    &__text {
      font-size: 14px;
    }
  }
}

// 适老化模式 - 超大字版
[data-elderly-mode="xl"] {
  .tab-bar {
    height: calc(70px + env(safe-area-inset-bottom, 0));

    &__item {
      gap: 8px;
      padding: 12px 0;
    }

    &__icon {
      font-size: 32px;
    }

    &__text {
      font-size: 16px;
    }
  }
}

@keyframes badge-bounce {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
