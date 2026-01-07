<template>
  <div class="announcement-section">
    <div class="section-header">
      <h2 class="section-title">
        <el-icon><Bell /></el-icon>
        政策公告
      </h2>
      <div class="header-controls">
        <el-switch
          v-model="dialectEnabled"
          @change="handleDialectToggle"
          active-text="方言播报"
          inactive-text="普通话"
          :active-value="true"
          :inactive-value="false"
          size="large"
          class="dialect-switch"
        />
        <el-button text @click="goToAnnouncementList">
          查看全部
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="section-divider"></div>

    <div class="announcement-list">
      <div
        v-for="announcement in displayedAnnouncements"
        :key="announcement.id"
        class="announcement-item"
        @click="handleAnnouncementClick(announcement)"
        role="button"
        tabindex="0"
        :aria-label="`${announcement.title}，${announcement.publishTime}`"
      >
        <div class="announcement-icon" :class="`type-${announcement.type}`">
          <component :is="getAnnouncementIcon(announcement.type)" :size="20" />
        </div>

        <div class="announcement-content">
          <div class="announcement-header">
            <h3 class="announcement-title">{{ announcement.title }}</h3>
            <el-tag
              v-if="announcement.isNew"
              type="danger"
              size="small"
              effect="dark"
              class="new-badge"
            >
              新
            </el-tag>
          </div>
          <p class="announcement-summary">{{ announcement.summary }}</p>
          <div class="announcement-meta">
            <span class="publish-time">
              <el-icon><Clock /></el-icon>
              {{ announcement.publishTime }}
            </span>
            <span class="view-count">
              <el-icon><View /></el-icon>
              {{ announcement.viewCount }}
            </span>
          </div>
        </div>

        <div class="announcement-actions">
          <el-button
            :icon="Microphone"
            circle
            size="small"
            @click.stop="handleVoiceBroadcast(announcement)"
            :disabled="isBroadcasting"
            :loading="broadcastingId === announcement.id"
            class="voice-btn"
          />
        </div>
      </div>
    </div>

    <el-empty
      v-if="displayedAnnouncements.length === 0"
      description="暂无公告"
      :image-size="100"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Bell,
  ArrowRight,
  Clock,
  View,
  Microphone,
  Document,
  Notification,
  InfoFilled,
  Warning
} from '@element-plus/icons-vue'
import { useFontSize } from '@/composables/useFontSize'

interface Announcement {
  id: string
  title: string
  summary: string
  type: 'policy' | 'notice' | 'urgent' | 'info'
  content: string
  publishTime: string
  viewCount: number
  isNew?: boolean
  dialectContent?: string
}

const router = useRouter()
const { isLargeText } = useFontSize()

// 方言播报开关
const dialectEnabled = ref(false)
const isBroadcasting = ref(false)
const broadcastingId = ref<string | null>(null)

// 公告列表数据
const announcements = ref<Announcement[]>([
  {
    id: '1',
    title: '关于2026年耕地地力保护补贴申请的通知',
    summary: '请符合条件的村民于本月底前提交申请材料，逾期不予受理...',
    type: 'policy',
    content: '...',
    publishTime: '2小时前',
    viewCount: 1523,
    isNew: true,
    dialectContent: '关于2026年耕地地力保护补贴申请的方言播报内容...'
  },
  {
    id: '2',
    title: '暴雨预警：请做好防范准备',
    summary: '气象台发布暴雨蓝色预警，请村民注意安全，减少外出...',
    type: 'urgent',
    content: '...',
    publishTime: '5小时前',
    viewCount: 3456,
    isNew: true
  },
  {
    id: '3',
    title: '村卫生室疫苗接种时间安排',
    summary: '每周一、三、五上午8:30-11:30，下午14:00-17:00...',
    type: 'notice',
    content: '...',
    publishTime: '1天前',
    viewCount: 892
  }
])

// 显示最多3条公告
const displayedAnnouncements = computed(() => {
  return announcements.value.slice(0, 3)
})

/**
 * 获取公告图标
 */
const getAnnouncementIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    policy: Document,
    notice: Notification,
    urgent: Warning,
    info: InfoFilled
  }
  return iconMap[type] || Document
}

/**
 * 处理公告点击
 */
const handleAnnouncementClick = (announcement: Announcement) => {
  router.push({
    path: '/announcements',
    query: { id: announcement.id }
  })
}

/**
 * 处理方言播报开关（带错误处理）
 */
const handleDialectToggle = (enabled: boolean) => {
  try {
    if (enabled) {
      ElMessage.success('已启用方言播报，点击麦克风图标收听')
    } else {
      ElMessage.info('已切换为普通话模式')
    }
    // 保存用户偏好到 localStorage（带错误处理）
    localStorage.setItem('dialect-enabled', String(enabled))
  } catch (error) {
    console.error('Failed to save dialect preference:', error)
    // 即使保存失败也不影响功能切换
    ElMessage.warning('设置已应用，但无法保存（可能处于无痕模式）')
  }
}

/**
 * 处理语音播报
 */
const handleVoiceBroadcast = async (announcement: Announcement) => {
  if (isBroadcasting.value) {
    ElMessage.warning('正在播报中，请稍候...')
    return
  }

  try {
    isBroadcasting.value = true
    broadcastingId.value = announcement.id

    // 检查浏览器支持
    if (!('speechSynthesis' in window)) {
      ElMessage.error('您的浏览器不支持语音播报功能')
      return
    }

    // 构建播报文本
    const text = dialectEnabled.value && announcement.dialectContent
      ? announcement.dialectContent
      : `${announcement.title}。${announcement.summary}`

    // 创建语音合成实例
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = dialectEnabled.value ? 'zh-CN' : 'zh-CN'
    utterance.rate = 0.9 // 稍慢的语速
    utterance.pitch = 1.0

    // 播报结束
    utterance.onend = () => {
      isBroadcasting.value = false
      broadcastingId.value = null
    }

    // 播报错误
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      isBroadcasting.value = false
      broadcastingId.value = null
      ElMessage.error('语音播报失败，请稍后重试')
    }

    // 开始播报
    window.speechSynthesis.cancel() // 取消之前的播报
    window.speechSynthesis.speak(utterance)

    ElMessage.success(dialectEnabled.value ? '正在使用方言播报...' : '正在播报...')
  } catch (error) {
    console.error('Voice broadcast error:', error)
    isBroadcasting.value = false
    broadcastingId.value = null
    ElMessage.error('语音播报失败')
  }
}

/**
 * 跳转到公告列表页面
 */
const goToAnnouncementList = () => {
  router.push('/announcements')
}

// 组件挂载时加载用户偏好（带错误处理）
onMounted(() => {
  try {
    const dialectPreference = localStorage.getItem('dialect-enabled')
    if (dialectPreference !== null) {
      dialectEnabled.value = dialectPreference === 'true'
    }
  } catch (error) {
    console.warn('Failed to load dialect preference:', error)
    // 保持默认值
  }
})
</script>

<style lang="scss" scoped>
.announcement-section {
  margin-bottom: 24px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-size-h2, 20px);
      font-weight: 700;
      margin: 0;
      color: #303133;

      .el-icon {
        color: #e91e63;
      }
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 16px;

      .dialect-switch {
        :deep(.el-switch__label) {
          font-size: var(--font-size-small, 14px);
        }
      }

      .el-button {
        font-size: var(--font-size-small, 14px);
        color: #909399;

        &:hover {
          color: #409eff;
        }
      }
    }
  }

  .section-divider {
    height: 2px;
    background: linear-gradient(90deg, #e91e63 0%, transparent 100%);
    margin-bottom: 16px;
  }

  .announcement-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .announcement-item {
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: flex-start;
    gap: 12px;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      transform: translateX(4px);
    }

    &:active {
      transform: translateX(2px);
    }

    .announcement-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      &.type-policy {
        background: #e3f2fd;
        color: #2196f3;
      }

      &.type-notice {
        background: #fff3e0;
        color: #ff9800;
      }

      &.type-urgent {
        background: #ffebee;
        color: #f44336;
      }

      &.type-info {
        background: #e8f5e9;
        color: #51cf66;
      }
    }

    .announcement-content {
      flex: 1;
      min-width: 0;

      .announcement-header {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 4px;

        .announcement-title {
          font-size: var(--font-size-base, 16px);
          font-weight: 600;
          margin: 0;
          color: #303133;
          line-height: 1.4;
        }

        .new-badge {
          flex-shrink: 0;
          margin-top: 2px;
        }
      }

      .announcement-summary {
        font-size: var(--font-size-small, 14px);
        color: #606266;
        margin: 0 0 8px 0;
        line-height: 1.5;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .announcement-meta {
        display: flex;
        gap: 16px;
        font-size: var(--font-size-small, 14px);
        color: #909399;

        span {
          display: flex;
          align-items: center;
          gap: 4px;

          .el-icon {
            font-size: 14px;
          }
        }
      }
    }

    .announcement-actions {
      flex-shrink: 0;

      .voice-btn {
        :deep(.el-icon) {
          font-size: 16px;
        }
      }
    }
  }
}

// 大字模式适配
:deep(.large-text-mode) {
  .announcement-section {
    .section-title {
      font-size: var(--font-size-large-h2, 28px);
    }

    .announcement-item {
      .announcement-title {
        font-size: var(--font-size-large-base, 22px);
      }

      .announcement-summary {
        font-size: var(--font-size-large-small, 19px);
      }

      .announcement-meta {
        font-size: var(--font-size-large-small, 19px);
      }
    }
  }
}

// 响应式适配
@media (max-width: 480px) {
  .announcement-section {
    .section-header {
      .header-controls {
        width: 100%;
        justify-content: space-between;

        .dialect-switch {
          flex: 1;
        }
      }
    }

    .announcement-item {
      flex-direction: column;

      .announcement-icon {
        width: 100%;
        height: 36px;
        border-radius: 8px;
        flex-direction: row;
        justify-content: flex-start;
        padding: 0 12px;
      }

      .announcement-content {
        width: 100%;
      }

      .announcement-actions {
        width: 100%;
        display: flex;
        justify-content: flex-end;

        .voice-btn {
          width: 100%;
        }
      }
    }
  }
}
</style>
