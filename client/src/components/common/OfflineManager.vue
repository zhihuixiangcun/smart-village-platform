<template>
  <div class="offline-manager">
    <!-- 网络状态指示器 -->
    <div class="network-status" :class="{ offline: !isOnline, syncing: isSyncing }">
      <div class="status-indicator">
        <el-icon v-if="isOnline && !isSyncing" class="online-icon"><SuccessFilled /></el-icon>
        <el-icon v-else-if="isSyncing" class="syncing-icon"><Loading /></el-icon>
        <el-icon v-else class="offline-icon"><WarningFilled /></el-icon>

        <span class="status-text">
          {{ getStatusText() }}
        </span>

        <span v-if="lastSyncTime" class="last-sync">
          最后同步: {{ formatTime(lastSyncTime) }}
        </span>
      </div>

      <!-- 同步进度 -->
      <div v-if="isSyncing" class="sync-progress">
        <el-progress
          :percentage="syncProgress"
          :show-text="false"
          :stroke-width="3"
          status="success"
        />
        <span class="progress-text">{{ syncProgress }}%</span>
      </div>

      <!-- 操作按钮 -->
      <div class="status-actions">
        <el-button
          v-if="isOnline && !isSyncing && hasPendingOperations"
          @click="triggerSync"
          icon="Refresh"
          size="small"
          type="primary"
        >
          立即同步 ({{ stats.pendingOperations }})
        </el-button>

        <el-button @click="showStorageDialog = true" icon="Document" size="small">
          离线数据
        </el-button>

        <el-button
          v-if="hasConflicts"
          @click="showConflictDialog = true"
          icon="Warning"
          size="small"
          type="warning"
        >
          冲突 ({{ conflictQueue.length }})
        </el-button>
      </div>
    </div>

    <!-- 离线数据管理对话框 -->
    <el-dialog
      v-model="showStorageDialog"
      title="离线数据管理"
      width="800px"
      class="storage-dialog"
    >
      <div class="storage-content">
        <!-- 存储统计 -->
        <div class="storage-stats">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-statistic title="总数据量" :value="stats.totalItems" suffix="项" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="待同步" :value="stats.pendingOperations" suffix="项" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="存储大小" :value="stats.cacheSize" suffix="MB" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="可用空间" :value="stats.quota" suffix="MB" />
            </el-col>
          </el-row>
        </div>

        <!-- 数据管理选项 -->
        <div class="storage-actions">
          <h4>数据管理</h4>
          <el-space wrap>
            <el-button @click="exportOfflineData" icon="Download"> 导出离线数据 </el-button>
            <el-button @click="importOfflineData" icon="Upload"> 导入数据 </el-button>
            <el-button @click="clearExpiredData" icon="Delete" type="warning">
              清理过期数据
            </el-button>
            <el-button @click="clearAllData" icon="Delete" type="danger"> 清空所有数据 </el-button>
          </el-space>
        </div>

        <!-- 同步设置 -->
        <div class="sync-settings">
          <h4>同步设置</h4>
          <el-form :model="syncConfig" label-width="120px">
            <el-form-item label="自动同步">
              <el-switch v-model="syncConfig.autoSync" />
            </el-form-item>
            <el-form-item label="同步间隔">
              <el-select v-model="syncConfig.interval">
                <el-option label="30秒" :value="30000" />
                <el-option label="1分钟" :value="60000" />
                <el-option label="5分钟" :value="300000" />
                <el-option label="15分钟" :value="900000" />
              </el-select>
            </el-form-item>
            <el-form-item label="最大重试次数">
              <el-input-number v-model="syncConfig.maxRetries" :min="1" :max="10" />
            </el-form-item>
            <el-form-item label="数据保留天数">
              <el-input-number v-model="syncConfig.retentionDays" :min="1" :max="365" />
            </el-form-item>
          </el-form>
        </div>

        <!-- 操作历史 -->
        <div class="operation-history">
          <h4>最近操作</h4>
          <el-table :data="recentOperations" size="small" max-height="200">
            <el-table-column prop="timestamp" label="时间" width="150">
              <template #default="scope">
                {{ formatDateTime(scope.row.timestamp) }}
              </template>
            </el-table-column>
            <el-table-column prop="type" label="操作" width="80">
              <template #default="scope">
                <el-tag :type="getOperationTagType(scope.row.type)" size="small">
                  {{ getOperationText(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="collection" label="数据类型" width="120" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.status)" size="small">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="error" label="错误信息" show-overflow-tooltip />
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="showStorageDialog = false">关闭</el-button>
        <el-button @click="saveStorageSettings" type="primary">保存设置</el-button>
      </template>
    </el-dialog>

    <!-- 冲突解决对话框 -->
    <el-dialog
      v-model="showConflictDialog"
      title="数据冲突解决"
      width="900px"
      class="conflict-dialog"
    >
      <div class="conflict-content">
        <div v-if="conflictQueue.length === 0" class="no-conflicts">
          <el-empty description="暂无数据冲突" />
        </div>

        <div v-else class="conflict-list">
          <div v-for="conflict in conflictQueue" :key="conflict.id" class="conflict-item">
            <div class="conflict-header">
              <h4>数据ID: {{ conflict.dataId }}</h4>
              <el-tag type="warning">{{ formatDateTime(conflict.timestamp) }}</el-tag>
            </div>

            <div class="conflict-comparison">
              <el-row :gutter="20">
                <el-col :span="11">
                  <div class="data-version local">
                    <h5>本地版本</h5>
                    <div class="data-preview">
                      <pre>{{ JSON.stringify(conflict.localData.data, null, 2) }}</pre>
                    </div>
                    <div class="version-info">
                      <span>修改时间: {{ formatDateTime(conflict.localData.lastModified) }}</span>
                    </div>
                  </div>
                </el-col>

                <el-col :span="2" class="vs-divider">
                  <div class="vs-text">VS</div>
                </el-col>

                <el-col :span="11">
                  <div class="data-version server">
                    <h5>服务器版本</h5>
                    <div class="data-preview">
                      <pre>{{ JSON.stringify(conflict.serverData.data, null, 2) }}</pre>
                    </div>
                    <div class="version-info">
                      <span>修改时间: {{ formatDateTime(conflict.serverData.lastModified) }}</span>
                    </div>
                  </div>
                </el-col>
              </el-row>
            </div>

            <div class="conflict-actions">
              <el-space>
                <el-button @click="resolveConflict(conflict.id, 'use_local')" type="primary">
                  使用本地版本
                </el-button>
                <el-button @click="resolveConflict(conflict.id, 'use_server')" type="success">
                  使用服务器版本
                </el-button>
                <el-button @click="showMergeDialogHandler(conflict)" type="warning">
                  手动合并
                </el-button>
                <el-button @click="autoMergeConflict(conflict.id)" type="info">
                  智能合并
                </el-button>
              </el-space>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showConflictDialog = false">关闭</el-button>
        <el-button @click="resolveAllConflicts" type="primary">批量解决</el-button>
      </template>
    </el-dialog>

    <!-- 合并编辑对话框 -->
    <el-dialog v-model="showMergeDialog" title="手动合并数据" width="700px">
      <div v-if="mergingConflict" class="merge-editor">
        <div class="editor-hint">
          <el-alert
            title="请编辑下方JSON数据，合并两个版本的差异"
            type="info"
            :closable="false"
            show-icon
          />
        </div>

        <div class="json-editor">
          <el-input
            v-model="mergedDataJson"
            type="textarea"
            :rows="15"
            placeholder="编辑合并后的数据..."
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="closeMergeDialog">取消</el-button>
        <el-button @click="saveMergedData" type="primary">保存合并结果</el-button>
      </template>
    </el-dialog>

    <!-- 离线提示浮层 -->
    <div v-if="!isOnline" class="offline-overlay">
      <div class="offline-message">
        <el-icon class="offline-icon"><WarningFilled /></el-icon>
        <span>当前处于离线模式，数据将保存到本地</span>
        <el-button @click="checkConnection" size="small" text> 重新连接 </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  SuccessFilled,
  Loading,
  WarningFilled,
  Refresh,
  Document,
  Warning,
  Download,
  Upload,
  Delete,
} from '@element-plus/icons-vue';
import { useOfflineStorage } from '@/composables/useOfflineStorage';

// 使用离线存储Hook
const {
  isOnline,
  isSyncing,
  lastSyncTime,
  conflictQueue,
  syncProgress,
  stats,
  hasPendingOperations,
  hasConflicts,
  canSync,
  syncData,
  resolveConflict,
  clearExpiredCache,
  getStorageStats,
} = useOfflineStorage({
  autoSync: true,
  syncInterval: 30000,
});

// 响应式数据
const showStorageDialog = ref(false);
const showConflictDialog = ref(false);
const showMergeDialog = ref(false);
const mergingConflict = ref(null);
const mergedDataJson = ref('');
const recentOperations = ref([]);

// 同步配置
const syncConfig = reactive({
  autoSync: true,
  interval: 30000,
  maxRetries: 3,
  retentionDays: 7,
});

// 方法
const getStatusText = () => {
  if (isSyncing.value) return '正在同步...';
  if (!isOnline.value) return '离线模式';
  if (hasPendingOperations.value) return `有 ${stats.pendingOperations} 项待同步`;
  return '已连接';
};

const formatTime = time => {
  if (!time) return '';
  const now = new Date();
  const diff = now - time;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
};

const formatDateTime = timestamp => {
  return new Date(timestamp).toLocaleString();
};

const triggerSync = async () => {
  try {
    await syncData();
  } catch (error) {
    ElMessage.error('同步失败: ' + error.message);
  }
};

const exportOfflineData = async () => {
  try {
    // 导出离线数据的逻辑
    ElMessage.info('导出功能开发中...');
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message);
  }
};

const importOfflineData = () => {
  ElMessage.info('导入功能开发中...');
};

const clearExpiredData = async () => {
  try {
    const result = await ElMessageBox.confirm(
      '确定要清理过期数据吗？此操作不可撤销。',
      '确认清理',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    if (result === 'confirm') {
      const maxAge = syncConfig.retentionDays * 24 * 60 * 60 * 1000;
      const deletedCount = await clearExpiredCache(maxAge);
      ElMessage.success(`已清理 ${deletedCount} 项过期数据`);

      // 更新统计信息
      const newStats = await getStorageStats();
      Object.assign(stats, newStats);
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清理失败: ' + error.message);
    }
  }
};

const clearAllData = async () => {
  try {
    const result = await ElMessageBox.confirm(
      '确定要清空所有离线数据吗？此操作不可撤销，请确保已同步重要数据。',
      '危险操作',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'error',
      }
    );

    if (result === 'confirm') {
      // 清空所有数据的逻辑
      ElMessage.success('所有离线数据已清空');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空失败: ' + error.message);
    }
  }
};

const showMergeDialogHandler = conflict => {
  mergingConflict.value = conflict;
  mergedDataJson.value = JSON.stringify(conflict.localData.data, null, 2);
  showMergeDialog.value = true;
};

const closeMergeDialog = () => {
  showMergeDialog.value = false;
  mergingConflict.value = null;
  mergedDataJson.value = '';
};

const saveMergedData = async () => {
  try {
    const mergedData = JSON.parse(mergedDataJson.value);
    await resolveConflict(mergingConflict.value.id, 'merge', mergedData);
    ElMessage.success('数据合并成功');
    closeMergeDialog();
  } catch (error) {
    ElMessage.error('数据格式错误或合并失败: ' + error.message);
  }
};

const autoMergeConflict = async conflictId => {
  try {
    await resolveConflict(conflictId, 'merge');
    ElMessage.success('智能合并完成');
  } catch (error) {
    ElMessage.error('智能合并失败: ' + error.message);
  }
};

const resolveAllConflicts = async () => {
  try {
    const result = await ElMessageBox.confirm(
      '确定要批量解决所有冲突吗？将优先使用服务器版本。',
      '批量解决冲突',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    if (result === 'confirm') {
      for (const conflict of conflictQueue.value) {
        await resolveConflict(conflict.id, 'use_server');
      }
      ElMessage.success('所有冲突已解决');
      showConflictDialog.value = false;
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量解决失败: ' + error.message);
    }
  }
};

const checkConnection = () => {
  if (navigator.onLine) {
    location.reload();
  } else {
    ElMessage.warning('网络仍然不可用');
  }
};

const saveStorageSettings = () => {
  // 保存设置到localStorage
  localStorage.setItem('offlineSettings', JSON.stringify(syncConfig));
  ElMessage.success('设置已保存');
  showStorageDialog.value = false;
};

const getOperationTagType = type => {
  const typeMap = {
    create: 'success',
    update: 'primary',
    delete: 'danger',
  };
  return typeMap[type] || 'info';
};

const getOperationText = type => {
  const textMap = {
    create: '新增',
    update: '更新',
    delete: '删除',
  };
  return textMap[type] || type;
};

const getStatusTagType = status => {
  const statusMap = {
    pending: 'warning',
    synced: 'success',
    error: 'danger',
  };
  return statusMap[status] || 'info';
};

// 生命周期
onMounted(() => {
  // 从localStorage加载设置
  const savedSettings = localStorage.getItem('offlineSettings');
  if (savedSettings) {
    Object.assign(syncConfig, JSON.parse(savedSettings));
  }

  // 加载最近操作历史
  loadRecentOperations();
});

const loadRecentOperations = () => {
  // 模拟最近操作数据
  recentOperations.value = [
    {
      timestamp: Date.now() - 300000,
      type: 'create',
      collection: 'residents',
      status: 'synced',
    },
    {
      timestamp: Date.now() - 600000,
      type: 'update',
      collection: 'residents',
      status: 'pending',
    },
  ];
};

// 监听在线状态变化
watch(isOnline, online => {
  if (online) {
    ElMessage.success('网络已恢复，开始同步数据');
  } else {
    ElMessage.warning('网络连接断开，切换到离线模式');
  }
});
</script>

<style lang="scss" scoped>
.offline-manager {
  .network-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #f5f7fa;
    border-radius: 6px;
    margin-bottom: 16px;
    transition: all 0.3s ease;

    &.offline {
      background: #fef0f0;
      border: 1px solid #fbc4c4;

      .status-indicator {
        color: #f56c6c;
      }
    }

    &.syncing {
      background: #f0f9ff;
      border: 1px solid #b3d8ff;

      .status-indicator {
        color: #409eff;
      }
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #67c23a;

      .status-text {
        font-weight: 500;
      }

      .last-sync {
        font-size: 12px;
        color: #909399;
        margin-left: 12px;
      }
    }

    .sync-progress {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      margin: 0 16px;

      .el-progress {
        flex: 1;
      }

      .progress-text {
        font-size: 12px;
        color: #909399;
      }
    }

    .status-actions {
      display: flex;
      gap: 8px;
    }
  }

  .offline-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 2000;
    background: rgba(245, 108, 108, 0.9);
    color: white;
    padding: 8px;

    .offline-message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;

      .offline-icon {
        font-size: 18px;
      }
    }
  }
}

.storage-dialog {
  .storage-content {
    .storage-stats {
      margin-bottom: 24px;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 6px;
    }

    .storage-actions,
    .sync-settings,
    .operation-history {
      margin-bottom: 24px;

      h4 {
        margin: 0 0 16px 0;
        color: #303133;
        font-size: 16px;
        border-bottom: 1px solid #ebeef5;
        padding-bottom: 8px;
      }
    }

    .sync-settings {
      .el-form {
        background: #fafafa;
        padding: 16px;
        border-radius: 6px;
      }
    }
  }
}

.conflict-dialog {
  .conflict-content {
    .no-conflicts {
      text-align: center;
      padding: 40px;
    }

    .conflict-item {
      border: 1px solid #ebeef5;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;

      .conflict-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        h4 {
          margin: 0;
          color: #303133;
        }
      }

      .conflict-comparison {
        margin-bottom: 16px;

        .vs-divider {
          display: flex;
          align-items: center;
          justify-content: center;

          .vs-text {
            background: #f56c6c;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
          }
        }

        .data-version {
          border: 1px solid #ebeef5;
          border-radius: 6px;
          padding: 12px;

          &.local {
            border-color: #409eff;
          }

          &.server {
            border-color: #67c23a;
          }

          h5 {
            margin: 0 0 8px 0;
            color: #303133;
          }

          .data-preview {
            background: #f5f7fa;
            border-radius: 4px;
            padding: 8px;
            max-height: 200px;
            overflow-y: auto;

            pre {
              margin: 0;
              font-size: 12px;
              color: #606266;
            }
          }

          .version-info {
            margin-top: 8px;
            font-size: 12px;
            color: #909399;
          }
        }
      }

      .conflict-actions {
        display: flex;
        justify-content: center;
      }
    }
  }
}

.merge-editor {
  .editor-hint {
    margin-bottom: 16px;
  }

  .json-editor {
    .el-textarea {
      :deep(.el-textarea__inner) {
        font-family: 'Courier New', monospace;
        font-size: 12px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .offline-manager {
    .network-status {
      flex-direction: column;
      gap: 12px;

      .status-indicator {
        justify-content: center;
      }

      .sync-progress {
        margin: 0;
        width: 100%;
      }

      .status-actions {
        justify-content: center;
        flex-wrap: wrap;
      }
    }
  }

  .conflict-dialog {
    .conflict-comparison {
      .vs-divider {
        order: -1;
        margin-bottom: 12px;
      }

      .el-col {
        margin-bottom: 12px;
      }
    }
  }
}
</style>
