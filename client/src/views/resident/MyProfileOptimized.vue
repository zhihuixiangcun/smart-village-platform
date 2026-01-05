<template>
  <div class="resident-dashboard" :class="{ 'large-text-mode': isLargeText }">
    <!-- 顶部欢迎区 -->
    <WelcomeSection />

    <!-- 核心功能区：一户一码 + 紧急求助 -->
    <CoreFeatureSection />

    <!-- 补贴查询区 -->
    <SubsidySection />

    <!-- 在线办事大厅 -->
    <ServiceHallSection />

    <!-- 政策公告区 -->
    <AnnouncementSection />

    <!-- 家庭档案区 -->
    <FamilySection />

    <!-- 底部快速导航（移动端） -->
    <div class="mobile-nav" v-if="isMobile">
      <div
        v-for="item in navItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: currentPath === item.path }"
        @click="navigateTo(item.path)"
      >
        <el-icon :size="24">
          <component :is="item.icon" />
        </el-icon>
        <span>{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFontSize } from '@/composables/useFontSize'
import WelcomeSection from '@/components/resident/WelcomeSection.vue'
import CoreFeatureSection from '@/components/resident/CoreFeatureSection.vue'
import SubsidySection from '@/components/resident/SubsidySection.vue'
import ServiceHallSection from '@/components/resident/ServiceHallSection.vue'
import AnnouncementSection from '@/components/resident/AnnouncementSection.vue'
import FamilySection from '@/components/resident/FamilySection.vue'
import {
  House,
  Document,
  Service,
  User,
  ChatDotSquare
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const { isLargeText } = useFontSize()

// 当前路径
const currentPath = computed(() => route.path)

// 是否为移动端
const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// 底部导航项
const navItems = [
  { path: '/dashboard', label: '首页', icon: House },
  { path: '/services', label: '办事', icon: Document },
  { path: '/announcements', label: '公告', icon: ChatDotSquare },
  { path: '/profile', label: '我的', icon: User }
]

/**
 * 导航到指定路径
 */
const navigateTo = (path: string) => {
  router.push(path)
}

/**
 * 初始化（带错误处理）
 */
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 应用用户保存的字体大小设置（带错误处理）
  try {
    const savedFontSize = localStorage.getItem('font-size-level')
    if (savedFontSize) {
      const { setFontSizeLevel } = useFontSize()
      setFontSizeLevel(savedFontSize as any)
    }
  } catch (error) {
    console.warn('Failed to load font size preference:', error)
    // 保持默认值
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style lang="scss" scoped>
.resident-dashboard {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 16px;
  padding-bottom: 80px; // 为移动端底部导航留出空间

  // 大字模式全局样式调整
  :deep(.large-text-mode) {
    font-size: var(--font-size-base, 16px);
  }

  // 移动端底部导航
  .mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    display: flex;
    justify-content: space-around;
    padding: 8px 0;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: #909399;
      cursor: pointer;
      transition: color 0.3s ease;
      padding: 4px 16px;

      &.active {
        color: #409eff;
      }

      &:hover {
        color: #409eff;
      }

      span {
        font-size: var(--font-size-small, 14px);
      }
    }
  }
}

// 平板适配
@media (min-width: 768px) {
  .resident-dashboard {
    max-width: 768px;
    margin: 0 auto;
    padding-bottom: 16px;

    .mobile-nav {
      display: none;
    }
  }
}

// 桌面端适配
@media (min-width: 1024px) {
  .resident-dashboard {
    max-width: 1024px;
    padding: 24px;
  }
}

// 大字模式全局样式
:deep(.large-text-mode) {
  .resident-dashboard {
    .mobile-nav {
      .nav-item {
        span {
          font-size: var(--font-size-large-small, 19px);
        }
      }
    }
  }
}
</style>
