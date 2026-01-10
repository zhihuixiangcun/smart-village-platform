<template>
  <el-dialog
    v-model="dialogVisible"
    title="户码二维码"
    :width="accessibilityStore.largeTextMode ? '600px' : '500px'"
    center
    :close-on-click-modal="false"
    class="qr-code-dialog"
  >
    <div class="qr-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="qr-loading">
        <el-icon class="is-loading" :size="50"><Loading /></el-icon>
        <p class="loading-text">正在生成二维码...</p>
      </div>

      <!-- 二维码展示 -->
      <div v-else-if="qrData" class="qr-display">
        <div class="qr-header">
          <h3 class="qr-title">{{ household.codeId }}</h3>
          <p class="qr-subtitle">扫码查看家庭信息</p>
        </div>

        <div class="qr-image-container">
          <div class="qr-image-wrapper">
            <img
              :src="qrData.qrImageUrl"
              :alt="`户码二维码 - ${household.codeId}`"
              class="qr-image"
              @load="onQRImageLoad"
              @error="onQRImageError"
            />
            <div v-if="showWatermark" class="qr-watermark">
              <span class="watermark-text">{{ household.householder }}</span>
            </div>
          </div>

          <!-- 二维码状态指示器 -->
          <div class="qr-status">
            <el-tag :type="getStatusType(qrData.status)" size="small" effect="light">
              {{ qrData.status }}
            </el-tag>
            <span class="generate-time"> 生成时间: {{ formatTime(qrData.generatedAt) }} </span>
          </div>
        </div>

        <!-- 户码信息 -->
        <div class="qr-info">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="户码编号" :span="2">
              <el-text type="primary" tag="strong">{{ household.codeId }}</el-text>
            </el-descriptions-item>
            <el-descriptions-item label="户主姓名">
              {{ household.householder }}
            </el-descriptions-item>
            <el-descriptions-item label="家庭人数">
              {{ household.memberCount }}人
            </el-descriptions-item>
            <el-descriptions-item label="家庭地址" :span="2">
              {{ household.address }}
            </el-descriptions-item>
            <el-descriptions-item label="有效期限" :span="2">
              <el-text type="success">{{ qrData.expiryDate }}</el-text>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 安全提示 -->
        <div class="security-tips">
          <el-alert type="info" :closable="false" show-icon class="security-alert">
            <template #title>
              <strong>安全提示</strong>
            </template>
            <ul class="tips-list">
              <li>此二维码包含您的家庭基本信息，请妥善保管</li>
              <li>仅在官方应用中使用，谨防诈骗</li>
              <li>如发现异常，请联系村委会</li>
            </ul>
          </el-alert>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else class="qr-error">
        <el-result icon="error" title="二维码生成失败" :sub-title="errorMessage">
          <template #extra>
            <el-button type="primary" @click="generateQRCode" :loading="generating">
              重新生成
            </el-button>
          </template>
        </el-result>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeDialog">关闭</el-button>

        <div v-if="qrData" class="action-buttons">
          <el-button
            @click="downloadQRCode"
            type="primary"
            :icon="Download"
            :disabled="!qrData.qrImageUrl || downloading"
            :loading="downloading"
          >
            下载二维码
          </el-button>

          <el-button @click="shareQRCode" :icon="Share" :disabled="!qrData.qrImageUrl">
            分享户码
          </el-button>

          <el-button @click="refreshQRCode" :icon="Refresh" :loading="refreshing">
            刷新二维码
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Loading, Download, Share, Refresh } from '@element-plus/icons-vue';
import householdQRApi from '@/api/householdQR';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  household: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:visible', 'refresh']);

const accessibilityStore = useAccessibilityStore();

// 响应式数据
const loading = ref(false);
const generating = ref(false);
const downloading = ref(false);
const refreshing = ref(false);
const qrData = ref(null);
const showWatermark = ref(false);
const errorMessage = ref('');

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
});

// 监听对话框显示
watch(
  () => props.visible,
  newVal => {
    if (newVal && props.household) {
      loadQRCode();
    }
  }
);

/**
 * 加载二维码
 */
const loadQRCode = async () => {
  if (!props.household?.id) {
    errorMessage.value = '家庭信息不完整';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await householdQRApi.generateQR(props.household.id, {
      includeImage: true,
      size: 300,
      format: 'png',
    });

    if (response.success) {
      qrData.value = {
        ...response.data,
        qrImageUrl: response.data.qrImageUrl,
        status: response.data.status || 'active',
        generatedAt: response.data.generatedAt || new Date().toISOString(),
        expiryDate: response.data.expiryDate || '永久有效',
      };

      // 根据设置决定是否显示水印
      showWatermark.value =
        accessibilityStore.largeTextMode || props.household.tags?.includes('党员家庭');
    } else {
      errorMessage.value = response.error || '生成二维码失败';
    }
  } catch (error) {
    console.error('加载二维码失败:', error);
    errorMessage.value = '网络错误，请稍后重试';
  } finally {
    loading.value = false;
  }
};

/**
 * 生成新二维码
 */
const generateQRCode = async () => {
  if (!props.household?.id) return;

  generating.value = true;

  try {
    const response = await householdQRApi.regenerateQR(props.household.id, {
      forceNew: true,
      includeImage: true,
    });

    if (response.success) {
      qrData.value = {
        ...qrData.value,
        ...response.data,
        qrImageUrl: response.data.qrImageUrl,
        generatedAt: response.data.generatedAt,
      };
      ElMessage.success('二维码重新生成成功');
    } else {
      ElMessage.error(response.error || '生成失败');
    }
  } catch (error) {
    console.error('生成二维码失败:', error);
    ElMessage.error('生成失败，请稍后重试');
  } finally {
    generating.value = false;
  }
};

/**
 * 下载二维码
 */
const downloadQRCode = async () => {
  if (!qrData.value?.qrImageUrl) return;

  downloading.value = true;

  try {
    // 创建下载链接
    const link = document.createElement('a');
    link.href = qrData.value.qrImageUrl;
    link.download = `户码_${props.household.codeId}_${Date.now()}.png`;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ElMessage.success('二维码下载成功');

    // 记录下载日志
    await logQRAction('download');
  } catch (error) {
    console.error('下载失败:', error);
    ElMessage.error('下载失败，请稍后重试');
  } finally {
    downloading.value = false;
  }
};

/**
 * 分享二维码
 */
const shareQRCode = async () => {
  if (!qrData.value?.qrImageUrl) return;

  try {
    // 检查是否支持Web Share API
    if (navigator.share) {
      await navigator.share({
        title: `${props.household.codeId} - 户码`,
        text: `扫码查看${props.household.householder}的家庭信息`,
        url: qrData.value.qrImageUrl,
      });
    } else {
      // 降级方案：复制到剪贴板
      await copyToClipboard(qrData.value.qrImageUrl);
      ElMessage.success('二维码链接已复制到剪贴板');
    }

    // 记录分享日志
    await logQRAction('share');
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('分享失败:', error);
      ElMessage.error('分享失败，请稍后重试');
    }
  }
};

/**
 * 刷新二维码
 */
const refreshQRCode = async () => {
  refreshing.value = true;

  try {
    await loadQRCode();
    ElMessage.success('二维码刷新成功');
    emit('refresh');
  } catch (error) {
    ElMessage.error('刷新失败');
  } finally {
    refreshing.value = false;
  }
};

/**
 * 复制到剪贴板
 */
const copyToClipboard = async text => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (error) {
    throw new Error('复制失败');
  }
};

/**
 * 记录二维码操作日志
 */
const logQRAction = async action => {
  try {
    await householdQRApi.logQRAction(props.household.id, {
      action,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
  } catch (error) {
    console.warn('记录操作日志失败:', error);
  }
};

/**
 * 获取状态类型
 */
const getStatusType = status => {
  const typeMap = {
    active: 'success',
    expired: 'danger',
    disabled: 'warning',
    pending: 'info',
  };
  return typeMap[status] || 'info';
};

/**
 * 格式化时间
 */
const formatTime = time => {
  if (!time) return '未知';
  return new Date(time).toLocaleString('zh-CN');
};

/**
 * 二维码图片加载成功
 */
const onQRImageLoad = () => {
  console.log('二维码图片加载成功');
};

/**
 * 二维码图片加载失败
 */
const onQRImageError = () => {
  console.error('二维码图片加载失败');
  ElMessage.error('二维码图片加载失败，请刷新重试');
};

/**
 * 关闭对话框
 */
const closeDialog = () => {
  dialogVisible.value = false;
};
</script>

<style scoped>
.qr-code-dialog {
  --dialog-radius: 12px;
}

.qr-content {
  padding: 20px 0;
}

.qr-loading {
  text-align: center;
  padding: 40px;
}

.loading-text {
  margin-top: 16px;
  color: #606266;
  font-size: 14px;
}

.qr-display {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.qr-header {
  text-align: center;
}

.qr-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  font-family: monospace;
}

.qr-subtitle {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.qr-image-container {
  text-align: center;
}

.qr-image-wrapper {
  position: relative;
  display: inline-block;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.qr-image {
  width: 250px;
  height: 250px;
  border-radius: 8px;
  display: block;
}

.qr-watermark {
  position: absolute;
  bottom: 30px;
  right: 30px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
}

.watermark-text {
  font-weight: 500;
}

.qr-status {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.generate-time {
  font-size: 12px;
  color: #909399;
}

.qr-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.security-tips {
  margin-top: 8px;
}

.security-alert {
  border: none;
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
}

.tips-list {
  margin: 8px 0 0;
  padding-left: 20px;
  color: #606266;
  font-size: 13px;
}

.tips-list li {
  margin-bottom: 4px;
  line-height: 1.4;
}

.qr-error {
  padding: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

/* 大字模式适配 */
:deep(.large-text-mode) .qr-title {
  font-size: 24px;
}

:deep(.large-text-mode) .qr-subtitle {
  font-size: 16px;
}

:deep(.large-text-mode) .qr-image {
  width: 280px;
  height: 280px;
}

:deep(.large-text-mode) .tips-list {
  font-size: 15px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .qr-image {
    width: 200px;
    height: 200px;
  }

  .qr-watermark {
    bottom: 20px;
    right: 20px;
  }

  .dialog-footer {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .action-buttons {
    flex-direction: column;
    width: 100%;
  }

  .action-buttons .el-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .qr-content {
    padding: 10px 0;
  }

  .qr-image {
    width: 180px;
    height: 180px;
  }

  .qr-title {
    font-size: 18px;
  }

  .qr-watermark {
    bottom: 15px;
    right: 15px;
    font-size: 11px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .qr-image-wrapper {
    background: #2a2a2a;
    box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
  }

  .qr-info {
    background: #2a2a2a;
  }

  .security-alert {
    background: linear-gradient(135deg, #1a3a52 0%, #0f2238 100%);
    color: #ffffff;
  }

  .tips-list {
    color: #e0e0e0;
  }
}

/* 无障碍设计 */
.qr-image-wrapper:focus-within {
  outline: 3px solid #409eff;
  outline-offset: 2px;
}

.qr-image:focus {
  outline: none;
}

/* 打印样式 */
@media print {
  .qr-code-dialog .el-dialog__footer {
    display: none;
  }

  .qr-image {
    width: 300px !important;
    height: 300px !important;
  }
}
</style>
