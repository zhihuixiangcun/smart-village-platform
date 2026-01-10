<template>
  <!-- 村民用户：显示新的优化主页 -->
  <MyProfileOptimized v-if="isResident" />

  <!-- 管理员：显示原有管理控制台 -->
  <div v-else class="dashboard">
    <div class="welcome-header">
      <h1>🏘️ 欢迎使用智慧村庄管理系统</h1>
      <p>管理员控制台 - 全功能管理平台</p>
    </div>

    <!-- 统计卡片区域 -->
    <div v-if="!loading" class="stats-cards-container">
      <!-- 村民统计 -->
      <div class="stat-card resident-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-label">村民总数</div>
          <div class="stat-value">{{ stats.residents.total || 0 }}</div>
          <div class="stat-meta">
            <span class="online">在线: {{ stats.residents.online || 0 }}</span>
            <span class="new">本月新增: {{ stats.residents.newThisMonth || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 公告统计 -->
      <div class="stat-card announcement-card">
        <div class="stat-icon">📢</div>
        <div class="stat-content">
          <div class="stat-label">公告总数</div>
          <div class="stat-value">{{ stats.announcements.total || 0 }}</div>
          <div class="stat-meta">
            <span class="unread">未读: {{ stats.announcements.unread || 0 }}</span>
            <span class="published"
              >本周发布: {{ stats.announcements.publishedThisWeek || 0 }}</span
            >
          </div>
        </div>
      </div>

      <!-- 村务统计 -->
      <div class="stat-card governance-card">
        <div class="stat-icon">📋</div>
        <div class="stat-content">
          <div class="stat-label">村务事项</div>
          <div class="stat-value">{{ stats.governance.total || 0 }}</div>
          <div class="stat-meta">
            <span class="pending">待处理: {{ stats.governance.pending || 0 }}</span>
            <span class="completed">完成率: {{ stats.governance.completionRate || '0%' }}</span>
          </div>
        </div>
      </div>

      <!-- 财务统计 -->
      <div class="stat-card finance-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-label">本月财务</div>
          <div class="stat-value">¥{{ formatMoney(stats.finance.monthly?.balance || 0) }}</div>
          <div class="stat-meta">
            <span class="income">收入: ¥{{ formatMoney(stats.finance.monthly?.income || 0) }}</span>
            <span class="expense"
              >支出: ¥{{ formatMoney(stats.finance.monthly?.expense || 0) }}</span
            >
          </div>
        </div>
      </div>

      <!-- 应急事件统计 -->
      <div class="stat-card emergency-card">
        <div class="stat-icon">🚨</div>
        <div class="stat-content">
          <div class="stat-label">应急事件</div>
          <div class="stat-value">{{ stats.emergency.total || 0 }}</div>
          <div class="stat-meta">
            <span class="active">活跃: {{ stats.emergency.active || 0 }}</span>
            <span class="resolved">解决率: {{ stats.emergency.resolutionRate || '0%' }}</span>
          </div>
        </div>
      </div>

      <!-- 服务统计 -->
      <div class="stat-card service-card">
        <div class="stat-icon">🏠</div>
        <div class="stat-content">
          <div class="stat-label">服务申请</div>
          <div class="stat-value">{{ stats.services.total || 0 }}</div>
          <div class="stat-meta">
            <span class="processing">处理中: {{ stats.services.processing || 0 }}</span>
            <span class="completed">完成率: {{ stats.services.completionRate || '0%' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else class="stats-loading">
      <div class="loading-spinner"></div>
      <p>正在加载统计数据...</p>
    </div>

    <div class="feature-grid">
      <!-- 管理员专有功能 -->
      <template v-if="isAdmin">
        <div class="feature-card" @click="router.push('/residents')">
          <div class="card-icon">👥</div>
          <h3>村民管理</h3>
          <p>数字档案、隐私保护、人脸识别</p>
          <button class="card-btn">管理村民</button>
        </div>

        <div class="feature-card" @click="router.push('/system/users')">
          <div class="card-icon">🏛️</div>
          <h3>村委管理</h3>
          <p>人员管理、权限控制、值班调度</p>
          <button class="card-btn">管理人员</button>
        </div>

        <div class="feature-card" @click="openBatchImport">
          <div class="card-icon">📥</div>
          <h3>批量导入</h3>
          <p>村民数据、批量导入、模板下载</p>
          <button class="card-btn">开始导入</button>
        </div>

        <div class="feature-card" @click="router.push('/affairs')">
          <div class="card-icon">📢</div>
          <h3>村务协同</h3>
          <p>公告发布、投票系统、会议管理</p>
          <button class="card-btn">村务管理</button>
        </div>

        <div class="feature-card" @click="router.push('/finance')">
          <div class="card-icon">💰</div>
          <h3>财务管理</h3>
          <p>预算控制、审批流程、财务透明</p>
          <button class="card-btn">财务管理</button>
        </div>

        <div class="feature-card" @click="openMonitoring">
          <div class="card-icon">📊</div>
          <h3>实时监控</h3>
          <p>系统性能、运营指标、健康状态</p>
          <button class="card-btn">查看监控</button>
        </div>

        <div class="feature-card" @click="router.push('/system/notifications')">
          <div class="card-icon">🔔</div>
          <h3>通知系统</h3>
          <p>多渠道通知、模板管理、批量发送</p>
          <button class="card-btn">管理通知</button>
        </div>
      </template>

      <!-- 村民功能 -->
      <template v-else>
        <div class="feature-card" @click="router.push('/profile')">
          <div class="card-icon">👤</div>
          <h3>个人中心</h3>
          <p>个人信息、档案管理、账户设置</p>
          <button class="card-btn">个人中心</button>
        </div>

        <div class="feature-card" @click="router.push('/village-affairs')">
          <div class="card-icon">📢</div>
          <h3>村务公开</h3>
          <p>公告通知、村务信息、意见反馈</p>
          <button class="card-btn">查看公告</button>
        </div>

        <div class="feature-card" @click="router.push('/services')">
          <div class="card-icon">🏠</div>
          <h3>生活服务</h3>
          <p>便民服务、在线办事、生活指南</p>
          <button class="card-btn">生活服务</button>
        </div>

        <div class="feature-card" @click="router.push('/finance/overview')">
          <div class="card-icon">💰</div>
          <h3>财务公开</h3>
          <p>村财务公示、资金使用透明化</p>
          <button class="card-btn">查看财务</button>
        </div>

        <div class="feature-card" @click="router.push('/proposals')">
          <div class="card-icon">💡</div>
          <h3>建议提案</h3>
          <p>提出建议、参与村务决策</p>
          <button class="card-btn">提交建议</button>
        </div>

        <div class="feature-card" @click="router.push('/profile')">
          <div class="card-icon">🔔</div>
          <h3>消息通知</h3>
          <p>接收村务通知、重要消息提醒</p>
          <button class="card-btn">查看消息</button>
        </div>
      </template>
    </div>

    <!-- 批量导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="批量导入村民数据"
      width="600px"
      @close="closeImportDialog"
    >
      <div class="import-dialog-content">
        <!-- 步骤1: 上传文件 -->
        <div v-if="uploadStatus === 'idle' || uploadStatus === 'uploading'" class="upload-section">
          <el-upload
            class="upload-area"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="true"
            accept=".xlsx,.xls,.csv"
            :limit="1"
          >
            <div class="upload-placeholder">
              <div class="upload-icon">📁</div>
              <div class="upload-text">拖拽文件到此处或点击上传</div>
              <div class="upload-hint">支持 .xlsx、.xls、.csv 格式</div>
            </div>
          </el-upload>

          <!-- 上传进度 -->
          <div v-if="uploadStatus === 'uploading'" class="upload-progress">
            <el-progress
              :percentage="uploadProgress"
              :status="uploadProgress === 100 ? 'success' : undefined"
            />
            <div class="progress-text">正在上传... {{ uploadProgress }}%</div>
          </div>
        </div>

        <!-- 步骤2: 处理中 -->
        <div v-if="uploadStatus === 'processing'" class="processing-section">
          <div class="processing-icon">⏳</div>
          <div class="processing-text">正在处理数据，请稍候...</div>
          <el-progress :percentage="100" :indeterminate="true" />
        </div>

        <!-- 步骤3: 完成 -->
        <div v-if="uploadStatus === 'completed'" class="completed-section">
          <div class="success-icon">✅</div>
          <div class="success-text">导入成功！</div>
          <div class="success-details">
            <p>
              成功导入 <strong>{{ importResult.success || 0 }}</strong> 条数据
            </p>
            <p v-if="importResult.failed > 0" class="failed-count">
              失败 <strong>{{ importResult.failed }}</strong> 条
            </p>
            <p v-if="importResult.updated > 0">
              更新 <strong>{{ importResult.updated }}</strong> 条
            </p>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-if="uploadStatus === 'error'" class="error-section">
          <div class="error-icon">❌</div>
          <div class="error-text">导入失败</div>
          <div class="error-message">{{ errorMessage }}</div>
        </div>
      </div>

      <!-- 对话框底部按钮 -->
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeImportDialog">取消</el-button>
          <el-button
            v-if="uploadStatus === 'idle'"
            type="primary"
            @click="downloadTemplate"
            :loading="downloadingTemplate"
          >
            下载模板
          </el-button>
          <el-button
            v-if="uploadStatus === 'idle' && selectedFile"
            type="primary"
            @click="startImport"
            :loading="uploadingFile"
          >
            开始导入
          </el-button>
          <el-button
            v-if="uploadStatus === 'completed' || uploadStatus === 'error'"
            type="primary"
            @click="resetImport"
          >
            {{ uploadStatus === 'completed' ? '完成' : '重试' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <div class="stats-section">
      <div class="stat-item">
        <h3>系统状态</h3>
        <div :class="['status-indicator', statusClass]">{{ statusText }}</div>
      </div>
      <div class="stat-item">
        <h3>在线用户</h3>
        <div class="user-count" v-if="!loading">{{ onlineUsers }}</div>
        <div v-else class="skeleton">--</div>
      </div>
      <div class="stat-item">
        <h3>今日访问</h3>
        <div class="visit-count" v-if="!loading">{{ dailyVisits }}</div>
        <div v-else class="skeleton">--</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { dashboardApi, batchImportApi } from '@/api';
import { ElMessage, ElDialog, ElUpload, ElProgress, ElButton } from 'element-plus';
import MyProfileOptimized from '@/views/resident/MyProfileOptimized.vue';

const router = useRouter();
const userStore = useUserStore();

// 数据状态
const loading = ref(true);
const onlineUsers = ref(0);
const dailyVisits = ref(0);
const systemStatus = ref({ status: 'unknown' });

// 批量导入对话框状态
const importDialogVisible = ref(false);
const uploadProgress = ref(0);
const uploadingFile = ref(false);
const uploadStatus = ref('idle'); // idle, uploading, processing, completed, error
const selectedFile = ref(null);
const downloadingTemplate = ref(false);
const errorMessage = ref('');
const importResult = ref({ success: 0, failed: 0, updated: 0 });

// 统计数据
const stats = ref({
  residents: { total: 0, online: 0, newThisMonth: 0 },
  announcements: { total: 0, unread: 0, publishedThisWeek: 0 },
  governance: { total: 0, pending: 0, inProgress: 0, completed: 0, completionRate: '0%' },
  finance: {
    monthly: { balance: 0, income: 0, expense: 0 },
    yearly: { balance: 0, income: 0, expense: 0 },
  },
  emergency: { total: 0, active: 0, resolved: 0, resolutionRate: '0%' },
  services: { total: 0, pending: 0, processing: 0, completed: 0, completionRate: '0%' },
});

// 格式化金额显示
const formatMoney = value => {
  if (!value && value !== 0) return '0';
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

// 根据用户角色显示不同的功能卡片
const userRole = computed(() => userStore.userInfo?.role || 'villager');
const isAdmin = computed(() => userRole.value === 'admin');
const isResident = computed(() => {
  // 村民不再显示 dashboard 中的优化主页，统一使用 /village-affairs
  // DashboardView 只用于管理员和管理类角色
  return false;
});

// 系统状态显示
const statusText = computed(() => {
  switch (systemStatus.value.status) {
    case 'healthy':
      return '🟢 正常运行';
    case 'degraded':
      return '🟡 部分服务异常';
    case 'error':
      return '🔴 系统异常';
    default:
      return '⚪ 检测中...';
  }
});

const statusClass = computed(() => {
  switch (systemStatus.value.status) {
    case 'healthy':
      return 'online';
    case 'degraded':
      return 'warning';
    case 'error':
      return 'offline';
    default:
      return 'checking';
  }
});

// 获取系统状态
const fetchSystemStatus = async () => {
  try {
    const health = await dashboardApi.getHealthStatus();
    systemStatus.value = health;
  } catch (error) {
    console.warn('系统健康检查失败:', error);
    systemStatus.value = { status: 'error' };
  }
};

// 获取统计数据
const fetchStatistics = async () => {
  try {
    loading.value = true;

    // 使用新的综合统计API
    const response = await dashboardApi.getStatistics();

    if (response.success && response.data) {
      // 更新统计数据
      stats.value.residents = response.data.residents || { total: 0, online: 0, newThisMonth: 0 };
      stats.value.announcements = response.data.announcements || {
        total: 0,
        unread: 0,
        publishedThisWeek: 0,
      };
      stats.value.governance = response.data.governance || {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        completionRate: '0%',
      };
      stats.value.finance = response.data.finance || {
        monthly: { balance: 0, income: 0, expense: 0 },
        yearly: { balance: 0, income: 0, expense: 0 },
      };
      stats.value.emergency = response.data.emergency || {
        total: 0,
        active: 0,
        resolved: 0,
        resolutionRate: '0%',
      };
      stats.value.services = response.data.services || {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        completionRate: '0%',
      };
    }

    // 模拟在线用户和访问数据（实际项目中需要从监控API获取）
    onlineUsers.value = Math.floor(Math.random() * 20) + 5;
    dailyVisits.value = Math.floor(Math.random() * 200) + 100;
  } catch (error) {
    console.error('获取统计数据失败:', error);
    ElMessage.warning('部分数据加载失败，显示默认值');
  } finally {
    loading.value = false;
  }
};

const openMonitoring = () => {
  window.open('http://localhost:3001/monitoring', '_blank');
};

// ==================== 批量导入功能 ====================

/**
 * 打开批量导入对话框
 */
const openBatchImport = () => {
  importDialogVisible.value = true;
  console.log('打开批量导入对话框');
};

/**
 * 关闭批量导入对话框
 */
const closeImportDialog = () => {
  // 如果正在上传或处理，提示用户
  if (uploadStatus.value === 'uploading' || uploadStatus.value === 'processing') {
    ElMessage.warning('正在处理中，请稍候...');
    return;
  }
  importDialogVisible.value = false;
  // 延迟重置状态，等待对话框关闭动画完成
  setTimeout(() => {
    resetImportState();
  }, 300);
};

/**
 * 重置导入状态
 */
const resetImportState = () => {
  selectedFile.value = null;
  uploadProgress.value = 0;
  uploadStatus.value = 'idle';
  uploadingFile.value = false;
  downloadingTemplate.value = false;
  errorMessage.value = '';
  importResult.value = { success: 0, failed: 0, updated: 0 };
};

/**
 * 处理文件选择变化
 */
const handleFileChange = file => {
  console.log('文件选择变化:', file);
  // 验证文件类型
  const validTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ];
  const fileName = file.name.toLowerCase();
  const isValidType =
    validTypes.includes(file.raw?.type) ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.csv');

  if (!isValidType) {
    ElMessage.error('仅支持 .xlsx、.xls、.csv 格式的文件');
    return false;
  }

  // 验证文件大小（最大10MB）
  const maxSize = 10 * 1024 * 1024;
  if (file.raw?.size > maxSize) {
    ElMessage.error('文件大小不能超过10MB');
    return false;
  }

  selectedFile.value = file.raw;
  console.log('文件已选择:', selectedFile.value?.name);
};

/**
 * 下载导入模板
 */
const downloadTemplate = async () => {
  try {
    downloadingTemplate.value = true;
    console.log('开始下载导入模板...');

    const response = await batchImportApi.getImportTemplate('residents');

    // 创建 Blob 对象
    const blob = new Blob([response], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // 创建下载链接
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `村民导入模板_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    ElMessage.success('模板下载成功！');
  } catch (error) {
    console.error('下载模板失败:', error);
    ElMessage.error('模板下载失败：' + (error.response?.data?.message || error.message));
  } finally {
    downloadingTemplate.value = false;
  }
};

/**
 * 开始批量导入
 */
const startImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择要导入的文件');
    return;
  }

  try {
    uploadingFile.value = true;
    uploadStatus.value = 'uploading';
    uploadProgress.value = 0;
    console.log('开始批量导入...');

    // 调用批量导入 API
    const result = await batchImportApi.importResidents(selectedFile.value, {
      villageId: userStore.userInfo?.villageId || 'default',
      skipDuplicates: true,
      updateExisting: false,
      onProgress: progressEvent => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        uploadProgress.value = progress;
        console.log('上传进度:', progress + '%');
      },
    });

    console.log('导入结果:', result);

    // 切换到处理中状态
    uploadStatus.value = 'processing';

    // 等待一小段时间显示处理动画
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 导入成功
    uploadStatus.value = 'completed';
    importResult.value = result.data || {
      success: result.success || 0,
      failed: result.failed || 0,
      updated: result.updated || 0,
    };

    // 根据结果显示不同的消息
    if (importResult.value.failed > 0) {
      ElMessage.warning(
        `导入完成！成功 ${importResult.value.success} 条，失败 ${importResult.value.failed} 条`
      );
    } else {
      ElMessage.success(`导入成功！共导入 ${importResult.value.success} 条数据`);
    }

    // 刷新统计数据
    await fetchStatistics();
  } catch (error) {
    console.error('批量导入失败:', error);
    uploadStatus.value = 'error';
    errorMessage.value = error.response?.data?.message || error.message || '导入失败，请重试';
    ElMessage.error('导入失败：' + errorMessage.value);
  } finally {
    uploadingFile.value = false;
  }
};

/**
 * 重置导入（用于完成或错误状态后重新导入）
 */
const resetImport = () => {
  resetImportState();
  ElMessage.info('已重置，请重新选择文件');
};

onMounted(async () => {
  console.log('智慧村庄仪表板加载完成，用户角色:', userRole.value);

  // 获取数据
  await Promise.all([fetchSystemStatus(), fetchStatistics()]);
});
</script>

<style scoped>
.dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.welcome-header h1 {
  margin: 0 0 10px 0;
  font-size: 2.5em;
}

.welcome-header p {
  margin: 0;
  font-size: 1.2em;
  opacity: 0.9;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.feature-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
  background: #f8f9fa;
}

.card-icon {
  font-size: 3em;
  margin-bottom: 15px;
}

.feature-card h3 {
  color: #333;
  margin: 0 0 10px 0;
}

.feature-card p {
  color: #666;
  margin: 0 0 20px 0;
}

.card-btn {
  background: #4caf50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s ease;
}

.card-btn:hover {
  background: #45a049;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.stat-item {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.stat-item h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.status-indicator {
  font-weight: bold;
  font-size: 1.1em;
}

.status-indicator.online {
  color: #28a745;
}

.status-indicator.warning {
  color: #ffc107;
}

.status-indicator.offline {
  color: #dc3545;
}

.status-indicator.checking {
  color: #6c757d;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton {
  font-size: 2em;
  font-weight: bold;
  color: #ccc;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.8;
  }
}

.user-count,
.visit-count {
  font-size: 2em;
  font-weight: bold;
  color: #007bff;
}

/* ==================== 批量导入对话框样式 ==================== */
.import-dialog-content {
  min-height: 200px;
}

/* 上传区域 */
.upload-area {
  margin: 20px 0;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  padding: 40px 20px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.3s ease;
}

.upload-area :deep(.el-upload-dragger:hover) {
  border-color: #409eff;
  background: #f0f7ff;
}

.upload-placeholder {
  text-align: center;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.upload-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 500;
}

.upload-hint {
  font-size: 13px;
  color: #999;
}

/* 上传进度 */
.upload-progress {
  margin-top: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.progress-text {
  text-align: center;
  margin-top: 10px;
  color: #606266;
  font-size: 14px;
}

/* 处理中状态 */
.processing-section {
  text-align: center;
  padding: 40px 20px;
}

.processing-icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.processing-text {
  font-size: 18px;
  color: #333;
  margin-bottom: 20px;
  font-weight: 500;
}

/* 完成状态 */
.completed-section {
  text-align: center;
  padding: 30px 20px;
}

.success-icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: scaleIn 0.5s ease;
}

@keyframes scaleIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.success-text {
  font-size: 20px;
  color: #67c23a;
  margin-bottom: 20px;
  font-weight: 600;
}

.success-details {
  background: #f0f9ff;
  border-radius: 8px;
  padding: 20px;
  margin-top: 15px;
}

.success-details p {
  margin: 10px 0;
  font-size: 15px;
  color: #333;
}

.success-details strong {
  color: #409eff;
  font-size: 18px;
}

.success-details .failed-count {
  color: #f56c6c;
}

.success-details .failed-count strong {
  color: #f56c6c;
}

/* 错误状态 */
.error-section {
  text-align: center;
  padding: 30px 20px;
}

.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.error-text {
  font-size: 20px;
  color: #f56c6c;
  margin-bottom: 15px;
  font-weight: 600;
}

.error-message {
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 8px;
  padding: 15px;
  color: #f56c6c;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
}

/* 对话框底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* ==================== 统计卡片区域样式 ==================== */
.stats-cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 3em;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #f5f7fa;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.stat-meta {
  display: flex;
  gap: 15px;
  font-size: 13px;
}

.stat-meta span {
  padding: 4px 8px;
  border-radius: 4px;
  background: #f5f7fa;
}

/* 不同卡片类型的颜色主题 */
.resident-card .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.resident-card .stat-value {
  color: #667eea;
}

.resident-card .stat-meta .online {
  color: #28a745;
  background: #d4edda;
}

.resident-card .stat-meta .new {
  color: #007bff;
  background: #d1ecf1;
}

.announcement-card .stat-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.announcement-card .stat-value {
  color: #f5576c;
}

.announcement-card .stat-meta .unread {
  color: #dc3545;
  background: #f8d7da;
}

.announcement-card .stat-meta .published {
  color: #6f42c1;
  background: #e2d9f3;
}

.governance-card .stat-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.governance-card .stat-value {
  color: #00f2fe;
}

.governance-card .stat-meta .pending {
  color: #ffc107;
  background: #fff3cd;
}

.governance-card .stat-meta .completed {
  color: #28a745;
  background: #d4edda;
}

.finance-card .stat-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.finance-card .stat-value {
  color: #38f9d7;
}

.finance-card .stat-meta .income {
  color: #28a745;
  background: #d4edda;
}

.finance-card .stat-meta .expense {
  color: #dc3545;
  background: #f8d7da;
}

.emergency-card .stat-icon {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: white;
}

.emergency-card .stat-value {
  color: #fa709a;
}

.emergency-card .stat-meta .active {
  color: #dc3545;
  background: #f8d7da;
}

.emergency-card .stat-meta .resolved {
  color: #28a745;
  background: #d4edda;
}

.service-card .stat-icon {
  background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);
  color: white;
}

.service-card .stat-value {
  color: #30cfd0;
}

.service-card .stat-meta .processing {
  color: #ffc107;
  background: #fff3cd;
}

.service-card .stat-meta .completed {
  color: #28a745;
  background: #d4edda;
}

/* 加载状态 */
.stats-loading {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  margin-bottom: 30px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  margin: 0 auto 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.stats-loading p {
  color: #666;
  font-size: 16px;
}
</style>
