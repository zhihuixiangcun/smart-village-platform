<template>
  <div class="offline-indicator" :class="{ offline: isOffline }">
    <!-- 状态图标 -->
    <div class="status-icon">
      <el-icon :size="20" :color="statusColor">
        <Connection v-if="!isOffline" />
        <WarningFilled v-else />
      </el-icon>
    </div>

    <!-- 状态文本 -->
    <div class="status-text">
      <span class="status-label">{{ statusLabel }}</span>
      <span v-if="pendingSyncs > 0" class="sync-info"> 待同步: {{ pendingSyncs }} 条 </span>
    </div>

    <!-- 同步按钮 -->
    <el-button
      v-if="showSyncButton && pendingSyncs > 0 && !isOffline"
      type="primary"
      size="small"
      :loading="isSyncing"
      @click="handleSync"
      icon="Refresh"
    >
      立即同步
    </el-button>

    <!-- 进度条 -->
    <div v-if="isSyncing" class="sync-progress">
      <el-progress :percentage="syncProgress" :stroke-width="4" :show-text="false" />
    </div>
  </div>
</template>

<script setup>
/**
 * 离线状态指示器组件 - Offline Indicator Component
 *
 * 功能：
 * - 网络状态检测
 * - 离线数据统计
 * - 同步按钮
 * - 同步进度显示
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Connection, WarningFilled } from '@element-plus/icons-vue';
import offlineStorage from '@/utils/offlineStorage';
import { useOfflineSync } from '@/composables/useOfflineSync';

// Props
const props = defineProps({
  // 是否显示同步按钮
  showSyncButton: {
    type: Boolean,
    default: true,
  },
  // 自动同步间隔（毫秒）
  autoSyncInterval: {
    type: Number,
    default: 30000, // 30秒
  },
});

// Emits
const emit = defineEmits(['sync', 'statusChange']);

// 响应式数据
const isOffline = ref(!navigator.onLine);
const isSyncing = ref(false);
const syncProgress = ref(0);
const pendingSyncs = ref(0);

// 使用离线同步组合函数
const { syncData } = useOfflineSync();

let autoSyncTimer = null;

/**
 * 获取状态颜色
 */
const statusColor = computed(() => {
  return isOffline.value ? '#f56c6c' : '#67c23a';
});

/**
 * 获取状态标签
 */
const statusLabel = computed(() => {
  if (isOffline.value) return '离线模式';
  if (isSyncing.value) return '正在同步...';
  return '在线';
});

/**
 * 监听网络状态变化
 */
const handleOnlineStatusChange = () => {
  isOffline.value = !navigator.onLine;
  emit('statusChange', isOffline.value);

  // 如果从离线变为在线，自动同步
  if (!isOffline.value && pendingSyncs.value > 0) {
    ElMessage.success('网络已恢复，开始同步数据');
    handleSync();
  }
};

/**
 * 获取待同步数量
 */
const updatePendingSyncs = async () => {
  try {
    const stats = await offlineStorage.getSyncStats();
    pendingSyncs.value = stats.pending;
  } catch (error) {
    console.error('获取同步统计失败:', error);
  }
};

/**
 * 处理同步
 */
const handleSync = async () => {
  if (isOffline.value) {
    ElMessage.warning('当前离线，无法同步');
    return;
  }

  if (pendingSyncs.value === 0) {
    ElMessage.info('没有待同步的数据');
    return;
  }

  isSyncing.value = true;
  syncProgress.value = 0;

  try {
    // 获取待同步记录
    const records = await offlineStorage.getPendingSyncs({ limit: 100 });
    const total = records.length;

    emit('sync', { start: true, total });

    // 逐个同步
    for (let i = 0; i < total; i++) {
      await syncData(records[i]);
      syncProgress.value = Math.round(((i + 1) / total) * 100);
    }

    await updatePendingSyncs();
    ElMessage.success(`同步完成，共同步 ${total} 条数据`);
    emit('sync', { complete: true, total });
  } catch (error) {
    console.error('同步失败:', error);
    ElMessage.error('同步失败: ' + error.message);
    emit('sync', { error: error.message });
  } finally {
    isSyncing.value = false;
    syncProgress.value = 0;
  }
};

/**
 * 自动同步
 */
const startAutoSync = () => {
  if (props.autoSyncInterval > 0 && !isOffline.value) {
    autoSyncTimer = setInterval(async () => {
      await updatePendingSyncs();
      if (pendingSyncs.value > 0) {
        await handleSync();
      }
    }, props.autoSyncInterval);
  }
};

const stopAutoSync = () => {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
};

/**
 * 组件挂载
 */
onMounted(() => {
  // 监听网络状态
  window.addEventListener('online', handleOnlineStatusChange);
  window.addEventListener('offline', handleOnlineStatusChange);

  // 更新待同步数量
  updatePendingSyncs();

  // 启动自动同步
  startAutoSync();
});

/**
 * 组件卸载
 */
onUnmounted(() => {
  window.removeEventListener('online', handleOnlineStatusChange);
  window.removeEventListener('offline', handleOnlineStatusChange);
  stopAutoSync();
});

// 暴露方法
defineExpose({
  sync: handleSync,
  updatePendingSyncs,
  isOffline,
  pendingSyncs,
});
</script>

<style scoped lang="scss">
.offline-indicator {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: all 0.3s ease;

  &.offline {
    background: #fef0f0;
    border: 1px solid #fbc4c4;
  }

  .status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-text {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .status-label {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
    }

    .sync-info {
      font-size: 12px;
      color: #909399;
    }
  }

  .sync-progress {
    position: absolute;
    bottom: -4px;
    left: 20px;
    right: 20px;

    :deep(.el-progress-bar__outer) {
      border-radius: 2px;
    }

    :deep(.el-progress-bar__inner) {
      background: linear-gradient(90deg, #67c23a 0%, #85ce61 100%);
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .offline-indicator {
    width: 90%;
    max-width: 400px;
    flex-wrap: wrap;
    justify-content: center;
    border-radius: 16px;
    padding: 16px;

    .status-text {
      flex: 1;
      text-align: center;
    }
  }
}
</style>
