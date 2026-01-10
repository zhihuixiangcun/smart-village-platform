<template>
  <div class="notification-center">
    <!-- 通知铃铛按钮 -->
    <div class="notification-trigger" @click="toggleCenter">
      <el-badge :value="unreadCount" :hidden="!hasUnread" :max="99">
        <el-button
          :type="hasUnread ? 'primary' : 'default'"
          :class="{ 'notification-pulse': hasUnread }"
          icon="Bell"
          circle
          size="large"
        />
      </el-badge>
    </div>

    <!-- 通知面板 -->
    <transition name="notification-slide">
      <div v-if="centerVisible" class="notification-panel">
        <div class="panel-header">
          <div class="header-title">
            <el-icon><Bell /></el-icon>
            <span>通知中心</span>
            <el-badge v-if="hasUnread" :value="unreadCount" type="danger" />
          </div>
          <div class="header-actions">
            <el-button
              v-if="hasUnread"
              @click="markAllAsRead"
              type="text"
              size="small"
              icon="Check"
            >
              全部已读
            </el-button>
            <el-button @click="clearAll" type="text" size="small" icon="Delete"> 清空 </el-button>
            <el-button @click="hideCenter" type="text" size="small" icon="Close" />
          </div>
        </div>

        <div class="panel-content">
          <!-- 通知设置 -->
          <div class="notification-settings">
            <el-switch
              v-model="soundEnabled"
              active-text="通知音效"
              size="small"
              @change="updateSettings"
            />
            <el-switch
              v-model="vibrationEnabled"
              active-text="触觉反馈"
              size="small"
              @change="updateSettings"
            />
          </div>

          <!-- 通知过滤 -->
          <div class="notification-filters">
            <el-radio-group v-model="currentFilter" size="small" @change="filterNotifications">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="unread">未读</el-radio-button>
              <el-radio-button label="approval">审批</el-radio-button>
              <el-radio-button label="budget">预算</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 通知列表 -->
          <div class="notification-list" v-loading="loading">
            <div
              v-for="notification in filteredNotifications"
              :key="notification.id"
              class="notification-item"
              :class="{
                unread: !notification.read,
                urgent: notification.priority >= 4,
                emergency: notification.priority >= 5,
              }"
              @click="handleNotificationClick(notification)"
            >
              <div class="notification-icon">
                <span class="icon-emoji">{{ notification.icon }}</span>
                <el-icon v-if="!notification.read" class="unread-dot" color="#f56c6c">
                  <CircleFilled />
                </el-icon>
              </div>

              <div class="notification-content">
                <div class="notification-header">
                  <span class="notification-title">{{ notification.title }}</span>
                  <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
                </div>
                <p class="notification-message">{{ notification.message }}</p>

                <!-- 优先级标签 -->
                <div v-if="notification.priority >= 3" class="priority-tags">
                  <el-tag
                    v-if="notification.priority >= 5"
                    type="danger"
                    size="small"
                    effect="dark"
                  >
                    🚨 紧急
                  </el-tag>
                  <el-tag v-else-if="notification.priority >= 4" type="warning" size="small">
                    ⚠️ 重要
                  </el-tag>
                  <el-tag v-else-if="notification.priority >= 3" type="info" size="small">
                    📌 高优先级
                  </el-tag>
                </div>

                <!-- 操作按钮 -->
                <div v-if="notification.actions.length > 0" class="notification-actions">
                  <el-button
                    v-for="action in notification.actions"
                    :key="action.text"
                    :type="action.type || 'primary'"
                    size="small"
                    @click.stop="executeAction(notification, action)"
                  >
                    {{ action.text }}
                  </el-button>
                </div>
              </div>

              <div class="notification-controls">
                <el-button
                  @click.stop="markAsRead(notification.id)"
                  v-if="!notification.read"
                  type="text"
                  size="small"
                  icon="Check"
                  title="标记为已读"
                />
                <el-button
                  @click.stop="dismissNotification(notification.id)"
                  type="text"
                  size="small"
                  icon="Close"
                  title="删除通知"
                />
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="filteredNotifications.length === 0" class="empty-state">
              <el-empty :description="getEmptyDescription()">
                <el-button v-if="currentFilter !== 'all'" @click="currentFilter = 'all'">
                  查看全部通知
                </el-button>
              </el-empty>
            </div>
          </div>
        </div>

        <!-- 面板底部 -->
        <div class="panel-footer">
          <el-button @click="viewAllNotifications" type="text" size="small">
            查看历史通知
          </el-button>
          <el-button @click="openNotificationSettings" type="text" size="small">
            通知设置
          </el-button>
        </div>
      </div>
    </transition>

    <!-- 遮罩层 -->
    <div v-if="centerVisible" class="notification-overlay" @click="hideCenter" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Bell, Check, Delete, Close, CircleFilled } from '@element-plus/icons-vue';
import { useNotificationCenter, useNotificationSystem } from '@/composables/useNotificationSystem';

// 使用通知中心
const {
  centerVisible,
  unreadCount,
  hasUnread,
  sortedNotifications,
  showNotificationCenter,
  hideNotificationCenter,
  toggleNotificationCenter,
  markNotificationRead,
  markAllRead,
  dismissNotification,
  clearAllNotifications,
} = useNotificationCenter();

const { soundEnabled, vibrationEnabled, updateNotificationSettings } = useNotificationSystem();

// 响应式数据
const loading = ref(false);
const currentFilter = ref('all');

// 过滤后的通知
const filteredNotifications = computed(() => {
  let filtered = sortedNotifications.value;

  switch (currentFilter.value) {
    case 'unread':
      filtered = filtered.filter(n => !n.read);
      break;
    case 'approval':
      filtered = filtered.filter(n => n.type === 'approval');
      break;
    case 'budget':
      filtered = filtered.filter(n => n.type === 'budget');
      break;
    default:
      // 显示全部
      break;
  }

  return filtered.slice(0, 50); // 限制显示数量
});

// 方法
const toggleCenter = () => {
  toggleNotificationCenter();
};

const hideCenter = () => {
  hideNotificationCenter();
};

const markAllAsRead = () => {
  markAllRead();
  ElMessage.success('所有通知已标记为已读');
};

const clearAll = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有通知吗？此操作不可恢复。', '清空通知', {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
    });
    clearAllNotifications();
    ElMessage.success('通知已清空');
  } catch {
    // 取消操作
  }
};

const markAsRead = notificationId => {
  markNotificationRead(notificationId);
};

const handleNotificationClick = notification => {
  markAsRead(notification.id);

  // 根据通知类型执行跳转
  switch (notification.type) {
    case 'approval':
      if (notification.data?.approvalId) {
        // 跳转到具体审批页面
        ElMessage.info(`跳转到审批详情: ${notification.data.approvalId}`);
      }
      break;
    case 'budget':
      ElMessage.info('跳转到预算管理页面');
      break;
    case 'expense':
      if (notification.data?.expenseId) {
        ElMessage.info(`跳转到支出详情: ${notification.data.expenseId}`);
      }
      break;
    default:
      ElMessage.info('查看通知详情');
      break;
  }
};

const executeAction = (notification, action) => {
  markAsRead(notification.id);

  if (action.handler) {
    action.handler(notification);
  } else {
    ElMessage.info(`执行操作: ${action.text}`);
  }
};

const filterNotifications = () => {
  // 过滤逻辑已在计算属性中处理
};

const updateSettings = () => {
  updateNotificationSettings({
    sound: soundEnabled.value,
    vibration: vibrationEnabled.value,
  });

  ElMessage.success('通知设置已更新');
};

const viewAllNotifications = () => {
  ElMessage.info('历史通知功能开发中...');
};

const openNotificationSettings = () => {
  ElMessage.info('通知设置功能开发中...');
};

const getEmptyDescription = () => {
  switch (currentFilter.value) {
    case 'unread':
      return '暂无未读通知';
    case 'approval':
      return '暂无审批通知';
    case 'budget':
      return '暂无预算通知';
    default:
      return '暂无通知';
  }
};

const formatTime = timestamp => {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now - time;

  if (diff < 60000) {
    // 1分钟内
    return '刚刚';
  } else if (diff < 3600000) {
    // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    // 24小时内
    return `${Math.floor(diff / 3600000)}小时前`;
  } else if (diff < 604800000) {
    // 7天内
    return `${Math.floor(diff / 86400000)}天前`;
  } else {
    return time.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  }
};

// 监听通知变化，自动显示重要通知
watch(
  () => sortedNotifications.value,
  (newNotifications, oldNotifications) => {
    if (newNotifications.length > (oldNotifications?.length || 0)) {
      const latestNotification = newNotifications[0];

      // 自动显示紧急通知
      if (latestNotification.priority >= 4 && !centerVisible.value) {
        setTimeout(() => {
          showNotificationCenter();
        }, 500);
      }
    }
  },
  { deep: true }
);
</script>

<style lang="scss" scoped>
.notification-center {
  position: relative;

  .notification-trigger {
    .notification-pulse {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
      100% {
        transform: scale(1);
      }
    }
  }

  .notification-panel {
    position: absolute;
    top: 60px;
    right: 0;
    width: 400px;
    max-height: 600px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    border: 1px solid #ebeef5;
    z-index: 2000;
    display: flex;
    flex-direction: column;

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #ebeef5;
      background: #f8f9fa;
      border-radius: 8px 8px 0 0;

      .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #303133;
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }
    }

    .panel-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .notification-settings {
        display: flex;
        justify-content: space-around;
        padding: 12px 20px;
        background: #fafafa;
        border-bottom: 1px solid #f0f0f0;
      }

      .notification-filters {
        padding: 12px 20px;
        border-bottom: 1px solid #f0f0f0;

        .el-radio-group {
          width: 100%;
        }
      }

      .notification-list {
        flex: 1;
        overflow-y: auto;
        max-height: 400px;

        .notification-item {
          display: flex;
          align-items: flex-start;
          padding: 16px 20px;
          border-bottom: 1px solid #f5f5f5;
          cursor: pointer;
          transition: all 0.3s ease;

          &:hover {
            background: #f8f9fa;
          }

          &.unread {
            background: #f0f8ff;
            border-left: 3px solid #409eff;
          }

          &.urgent {
            border-left: 3px solid #e6a23c;
          }

          &.emergency {
            border-left: 3px solid #f56c6c;
            background: #fef0f0;
          }

          .notification-icon {
            position: relative;
            margin-right: 12px;
            flex-shrink: 0;

            .icon-emoji {
              font-size: 24px;
              display: block;
            }

            .unread-dot {
              position: absolute;
              top: -2px;
              right: -2px;
              font-size: 8px;
            }
          }

          .notification-content {
            flex: 1;
            min-width: 0;

            .notification-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 4px;

              .notification-title {
                font-weight: 500;
                color: #303133;
              }

              .notification-time {
                font-size: 12px;
                color: #909399;
                flex-shrink: 0;
              }
            }

            .notification-message {
              color: #606266;
              font-size: 14px;
              line-height: 1.4;
              margin: 0 0 8px 0;
              word-break: break-word;
            }

            .priority-tags {
              margin-bottom: 8px;
            }

            .notification-actions {
              display: flex;
              gap: 8px;
              margin-top: 8px;
            }
          }

          .notification-controls {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-left: 8px;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          &:hover .notification-controls {
            opacity: 1;
          }
        }

        .empty-state {
          padding: 40px 20px;
          text-align: center;
        }
      }
    }

    .panel-footer {
      display: flex;
      justify-content: space-between;
      padding: 12px 20px;
      border-top: 1px solid #ebeef5;
      background: #fafafa;
      border-radius: 0 0 8px 8px;
    }
  }

  .notification-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1999;
    background: transparent;
  }
}

// 动画效果
.notification-slide-enter-active,
.notification-slide-leave-active {
  transition: all 0.3s ease;
}

.notification-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.notification-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

// 响应式设计
@media (max-width: 768px) {
  .notification-center {
    .notification-panel {
      width: 100vw;
      max-width: 100vw;
      left: 0;
      right: 0;
      top: 50px;
      border-radius: 0;
      height: calc(100vh - 50px);
      max-height: none;
    }
  }
}
</style>
