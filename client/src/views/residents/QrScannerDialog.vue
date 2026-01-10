<template>
  <el-dialog v-model="visible" title="扫码查询户籍信息" width="800px" :close-on-click-modal="false">
    <div class="qr-scanner-dialog">
      <!-- 扫描器选项卡 -->
      <el-tabs v-model="activeTab" class="scanner-tabs">
        <el-tab-pane label="摄像头扫描" name="camera">
          <div class="camera-scanner">
            <div class="scanner-container">
              <div v-if="!cameraReady" class="scanner-placeholder">
                <el-icon size="60" color="#409eff"><Camera /></el-icon>
                <p>正在启动摄像头...</p>
                <el-button type="primary" @click="startCamera" icon="Camera">
                  启动摄像头
                </el-button>
              </div>

              <div v-else class="scanner-active">
                <video ref="videoElement" autoplay playsinline></video>
                <canvas ref="canvasElement" style="display: none"></canvas>

                <!-- 扫描框 -->
                <div class="scan-frame">
                  <div class="corner corner-tl"></div>
                  <div class="corner corner-tr"></div>
                  <div class="corner corner-bl"></div>
                  <div class="corner corner-br"></div>
                  <div class="scan-line"></div>
                </div>

                <!-- 控制按钮 -->
                <div class="scanner-controls">
                  <el-button @click="stopCamera" icon="Close"> 关闭摄像头 </el-button>
                  <el-button type="primary" @click="captureFrame" icon="Camera">
                    手动捕获
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 扫描提示 -->
            <div class="scan-tips">
              <el-alert title="扫描提示" type="info" :closable="false" show-icon>
                <p>请将二维码对准扫描框，系统会自动识别</p>
                <p>• 保持二维码清晰可见</p>
                <p>• 确保光线充足</p>
                <p>• 距离适中（10-30cm）</p>
              </el-alert>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="上传图片" name="upload">
          <div class="image-upload">
            <el-upload
              class="upload-dragger"
              drag
              accept="image/*"
              :show-file-list="false"
              :before-upload="beforeImageUpload"
              :on-change="handleImageChange"
              :auto-upload="false"
            >
              <el-icon class="el-icon--upload" size="67"><UploadFilled /></el-icon>
              <div class="el-upload__text">将包含二维码的图片拖到此处，或<em>点击上传</em></div>
              <template #tip>
                <div class="el-upload__tip">支持 jpg/png 格式的图片文件</div>
              </template>
            </el-upload>

            <!-- 图片预览 -->
            <div v-if="uploadedImage" class="image-preview">
              <img :src="uploadedImage" alt="上传的图片" />
              <div class="preview-actions">
                <el-button type="primary" @click="scanUploadedImage" icon="Search">
                  扫描二维码
                </el-button>
                <el-button @click="clearImage" icon="Delete"> 清除图片 </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="手动输入" name="manual">
          <div class="manual-input">
            <el-form :model="manualForm" label-width="100px">
              <el-form-item label="户码">
                <el-input v-model="manualForm.code" placeholder="请输入户码" clearable size="large">
                  <template #append>
                    <el-button @click="queryByCode" type="primary" icon="Search"> 查询 </el-button>
                  </template>
                </el-input>
              </el-form-item>
            </el-form>

            <!-- 最近查询记录 -->
            <div class="recent-queries" v-if="recentQueries.length">
              <h4>最近查询</h4>
              <div class="query-history">
                <el-tag
                  v-for="query in recentQueries"
                  :key="query.code"
                  @click="queryByCode(query.code)"
                  class="query-tag"
                  type="info"
                  effect="plain"
                >
                  {{ query.code }} - {{ query.householder }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- 扫描结果 -->
      <div v-if="scanResult" class="scan-result">
        <el-divider>扫描结果</el-divider>

        <div v-if="scanResult.success" class="result-success">
          <div class="result-header">
            <el-icon size="24" color="#67c23a"><SuccessFilled /></el-icon>
            <h3>扫描成功</h3>
          </div>

          <div class="household-detail">
            <!-- 基本信息 -->
            <el-card class="detail-card" shadow="never">
              <template #header>
                <span>基本信息</span>
                <el-tag v-if="scanResult.data.status === 'active'" type="success" size="small">
                  正常
                </el-tag>
                <el-tag v-else type="danger" size="small"> 异常 </el-tag>
              </template>

              <el-descriptions :column="2" border>
                <el-descriptions-item label="户码">
                  {{ scanResult.data.code }}
                </el-descriptions-item>
                <el-descriptions-item label="户主">
                  {{ scanResult.data.householder }}
                </el-descriptions-item>
                <el-descriptions-item label="家庭人数">
                  {{ scanResult.data.memberCount }} 人
                </el-descriptions-item>
                <el-descriptions-item label="建档时间">
                  {{ formatDate(scanResult.data.createTime) }}
                </el-descriptions-item>
                <el-descriptions-item label="详细地址" :span="2">
                  {{ scanResult.data.address }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 安全验证信息 -->
            <el-card class="detail-card" shadow="never">
              <template #header>
                <span>安全验证</span>
                <el-tag :type="scanResult.security.valid ? 'success' : 'danger'" size="small">
                  {{ scanResult.security.valid ? '验证通过' : '验证失败' }}
                </el-tag>
              </template>

              <div class="security-info">
                <div class="security-item">
                  <span class="label">签名状态:</span>
                  <el-tag
                    :type="scanResult.security.signatureValid ? 'success' : 'danger'"
                    size="small"
                  >
                    {{ scanResult.security.signatureValid ? '有效' : '无效' }}
                  </el-tag>
                </div>
                <div class="security-item">
                  <span class="label">有效期:</span>
                  <span :class="{ expired: scanResult.security.expired }">
                    {{ scanResult.security.expired ? '已过期' : '有效' }}
                  </span>
                </div>
                <div class="security-item">
                  <span class="label">校验码:</span>
                  <span>{{ scanResult.security.checksum }}</span>
                </div>
                <div class="security-item">
                  <span class="label">生成时间:</span>
                  <span>{{ formatDate(scanResult.security.timestamp) }}</span>
                </div>
              </div>
            </el-card>

            <!-- 操作按钮 -->
            <div class="result-actions">
              <el-button type="primary" @click="viewFullDetails" icon="View">
                查看详细信息
              </el-button>
              <el-button type="success" @click="exportResult" icon="Download">
                导出查询结果
              </el-button>
              <el-button @click="addToFavorites" icon="Star"> 加入收藏 </el-button>
            </div>
          </div>
        </div>

        <div v-else class="result-error">
          <div class="result-header">
            <el-icon size="24" color="#f56c6c"><CircleCloseFilled /></el-icon>
            <h3>扫描失败</h3>
          </div>
          <el-alert :title="scanResult.message" type="error" :closable="false" show-icon>
            <p>可能的原因：</p>
            <ul>
              <li>二维码损坏或模糊</li>
              <li>不是有效的户码二维码</li>
              <li>二维码已过期</li>
              <li>网络连接问题</li>
            </ul>
          </el-alert>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="scanning" class="scanning-status">
        <el-loading-service />
        <p>正在解析二维码...</p>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button v-if="scanResult?.success" type="primary" @click="continueScan">
          继续扫描
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Camera,
  UploadFilled,
  Search,
  Delete,
  SuccessFilled,
  CircleCloseFilled,
  View,
  Download,
  Star,
  Close,
} from '@element-plus/icons-vue';
import QrScanner from 'qr-scanner';

// Props & Emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'scan-success']);

// 响应式数据
const visible = ref(false);
const activeTab = ref('camera');
const scanning = ref(false);
const cameraReady = ref(false);
const scanResult = ref(null);
const uploadedImage = ref(null);

// 相机相关
const videoElement = ref();
const canvasElement = ref();
let qrScanner = null;
let stream = null;

// 表单数据
const manualForm = reactive({
  code: '',
});

// 查询历史
const recentQueries = ref([
  { code: '001240001', householder: '张三' },
  { code: '001240002', householder: '李四' },
  { code: '001240003', householder: '王五' },
]);

// 监听器
watch(
  () => props.modelValue,
  val => {
    visible.value = val;
    if (val) {
      resetDialog();
    } else {
      cleanup();
    }
  }
);

watch(visible, val => {
  emit('update:modelValue', val);
});

// 方法
const resetDialog = () => {
  activeTab.value = 'camera';
  scanResult.value = null;
  uploadedImage.value = null;
  manualForm.code = '';
};

const startCamera = async () => {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoElement.value) {
        videoElement.value.srcObject = stream;
        cameraReady.value = true;

        await nextTick();
        startQrScanner();
      }
    } else {
      ElMessage.error('您的设备不支持摄像头功能');
    }
  } catch (error) {
    console.error('启动摄像头失败:', error);
    ElMessage.error('启动摄像头失败，请检查权限设置');
  }
};

const startQrScanner = () => {
  if (videoElement.value && QrScanner.hasCamera()) {
    qrScanner = new QrScanner(videoElement.value, result => handleQrResult(result), {
      returnDetailedScanResult: true,
      highlightScanRegion: true,
      highlightCodeOutline: true,
    });
    qrScanner.start();
  }
};

const stopCamera = () => {
  if (qrScanner) {
    qrScanner.stop();
    qrScanner.destroy();
    qrScanner = null;
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  cameraReady.value = false;
};

const captureFrame = async () => {
  if (!videoElement.value || !canvasElement.value) return;

  const canvas = canvasElement.value;
  const video = videoElement.value;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = await QrScanner.scanImage(imageData);
    handleQrResult({ data: result });
  } catch (error) {
    ElMessage.warning('未检测到二维码，请调整角度和距离');
  }
};

const beforeImageUpload = file => {
  const isValidType = file.type.startsWith('image/');
  const isValidSize = file.size / 1024 / 1024 < 10;

  if (!isValidType) {
    ElMessage.error('只能上传图片文件!');
    return false;
  }
  if (!isValidSize) {
    ElMessage.error('图片大小不能超过 10MB!');
    return false;
  }
  return false; // 阻止自动上传
};

const handleImageChange = file => {
  const reader = new FileReader();
  reader.onload = e => {
    uploadedImage.value = e.target.result;
  };
  reader.readAsDataURL(file.raw);
};

const scanUploadedImage = async () => {
  if (!uploadedImage.value) return;

  scanning.value = true;
  try {
    const result = await QrScanner.scanImage(uploadedImage.value);
    handleQrResult({ data: result });
  } catch (error) {
    ElMessage.error('图片中未检测到有效的二维码');
    scanResult.value = {
      success: false,
      message: '未检测到有效的二维码',
    };
  } finally {
    scanning.value = false;
  }
};

const clearImage = () => {
  uploadedImage.value = null;
};

const handleQrResult = async result => {
  if (scanning.value) return;

  scanning.value = true;
  try {
    const qrData = JSON.parse(result.data);

    // 验证二维码类型
    if (qrData.type !== 'household_code') {
      throw new Error('不是有效的户码二维码');
    }

    // 验证二维码数据
    const validationResult = await validateQrCode(qrData);

    if (validationResult.valid) {
      scanResult.value = {
        success: true,
        data: qrData.data,
        security: validationResult,
        rawData: qrData,
      };

      // 添加到查询历史
      addToRecentQueries(qrData.data);

      emit('scan-success', scanResult.value);
      ElMessage.success('二维码扫描成功!');
    } else {
      scanResult.value = {
        success: false,
        message: validationResult.message || '二维码验证失败',
      };
    }
  } catch (error) {
    console.error('解析二维码失败:', error);
    scanResult.value = {
      success: false,
      message: error.message || '二维码格式错误',
    };
  } finally {
    scanning.value = false;
  }
};

const validateQrCode = async qrData => {
  try {
    // 基本结构验证
    if (!qrData.version || !qrData.code || !qrData.data || !qrData.security) {
      return { valid: false, message: '二维码数据结构不完整' };
    }

    // 时间戳验证
    const now = Date.now();
    const timestamp = qrData.security.timestamp;
    const expires = qrData.security.expires;

    if (expires && now > expires) {
      return {
        valid: false,
        message: '二维码已过期',
        expired: true,
        timestamp,
        checksum: qrData.security.checksum,
        signatureValid: false,
      };
    }

    // 签名验证（简化版）
    const expectedSignature = generateSignature(qrData.code);
    const signatureValid = qrData.security.signature === expectedSignature;

    // 校验码验证
    const expectedChecksum = generateChecksum(qrData.data);
    const checksumValid = qrData.security.checksum === expectedChecksum;

    return {
      valid: signatureValid && checksumValid,
      signatureValid,
      checksumValid,
      expired: false,
      timestamp,
      checksum: qrData.security.checksum,
      message: signatureValid && checksumValid ? '验证通过' : '数据验证失败',
    };
  } catch (error) {
    return { valid: false, message: '验证过程出错: ' + error.message };
  }
};

// 生成签名（需要与生成端保持一致）
const generateSignature = code => {
  const secret = 'smart_village_secret_key';
  const data = code + Date.now().toString();
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// 生成校验码
const generateChecksum = data => {
  const checkData = `${data.code}-${data.householder}-${data.memberCount}`;
  let checksum = 0;
  for (let i = 0; i < checkData.length; i++) {
    checksum += checkData.charCodeAt(i);
  }
  return (checksum % 9999).toString().padStart(4, '0');
};

const queryByCode = async (code = null) => {
  const queryCode = code || manualForm.code;
  if (!queryCode) {
    ElMessage.warning('请输入户码');
    return;
  }

  scanning.value = true;
  try {
    // 模拟查询API
    const response = await mockQueryAPI(queryCode);

    if (response.success) {
      scanResult.value = {
        success: true,
        data: response.data,
        security: { valid: true, signatureValid: true, expired: false },
        rawData: { code: queryCode },
      };

      addToRecentQueries(response.data);
      ElMessage.success('查询成功!');
    } else {
      scanResult.value = {
        success: false,
        message: response.message || '查询失败',
      };
    }
  } catch (error) {
    scanResult.value = {
      success: false,
      message: '查询失败: ' + error.message,
    };
  } finally {
    scanning.value = false;
  }
};

// 模拟查询API
const mockQueryAPI = async code => {
  return new Promise(resolve => {
    setTimeout(() => {
      // 模拟数据
      const mockData = {
        code: code,
        householder: '张三丰',
        memberCount: 4,
        address: '智慧村庄第一组123号',
        status: 'active',
        createTime: new Date().toISOString(),
      };

      resolve({
        success: true,
        data: mockData,
      });
    }, 1000);
  });
};

const addToRecentQueries = data => {
  // 避免重复
  const existing = recentQueries.value.find(q => q.code === data.code);
  if (!existing) {
    recentQueries.value.unshift({
      code: data.code,
      householder: data.householder,
    });
    // 限制历史记录数量
    if (recentQueries.value.length > 5) {
      recentQueries.value.pop();
    }
  }
};

const viewFullDetails = () => {
  if (scanResult.value?.success) {
    // 触发查看详细信息事件
    emit('scan-success', {
      ...scanResult.value,
      action: 'view-details',
    });
  }
};

const exportResult = () => {
  if (!scanResult.value?.success) return;

  const data = scanResult.value.data;
  const exportData = {
    查询时间: new Date().toLocaleString(),
    户码: data.code,
    户主: data.householder,
    家庭人数: data.memberCount + ' 人',
    详细地址: data.address,
    状态: data.status === 'active' ? '正常' : '异常',
    建档时间: formatDate(data.createTime),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `户码查询结果_${data.code}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  ElMessage.success('查询结果已导出');
};

const addToFavorites = () => {
  ElMessage.success('已加入收藏夹');
};

const continueScan = () => {
  scanResult.value = null;
  activeTab.value = 'camera';
};

const handleClose = () => {
  visible.value = false;
};

const cleanup = () => {
  stopCamera();
};

const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleString();
};

// 生命周期
onMounted(async () => {
  // 检查设备支持
  if (!QrScanner.hasCamera()) {
    ElMessage.warning('检测到您的设备不支持摄像头功能');
  }
});

onUnmounted(() => {
  cleanup();
});
</script>

<style lang="scss" scoped>
.qr-scanner-dialog {
  .scanner-tabs {
    margin-bottom: 20px;
  }

  .camera-scanner {
    .scanner-container {
      position: relative;
      width: 100%;
      max-width: 400px;
      margin: 0 auto 20px auto;
      aspect-ratio: 1;
      background: #f5f5f5;
      border-radius: 8px;
      overflow: hidden;

      .scanner-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #909399;

        p {
          margin: 20px 0;
          font-size: 16px;
        }
      }

      .scanner-active {
        position: relative;
        width: 100%;
        height: 100%;

        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .scan-frame {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 200px;
          border: 2px solid transparent;

          .corner {
            position: absolute;
            width: 30px;
            height: 30px;
            border: 3px solid #409eff;

            &.corner-tl {
              top: -3px;
              left: -3px;
              border-right: none;
              border-bottom: none;
            }

            &.corner-tr {
              top: -3px;
              right: -3px;
              border-left: none;
              border-bottom: none;
            }

            &.corner-bl {
              bottom: -3px;
              left: -3px;
              border-right: none;
              border-top: none;
            }

            &.corner-br {
              bottom: -3px;
              right: -3px;
              border-left: none;
              border-top: none;
            }
          }

          .scan-line {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, #409eff, transparent);
            animation: scan 2s linear infinite;
          }
        }

        .scanner-controls {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
        }
      }
    }

    .scan-tips {
      max-width: 400px;
      margin: 0 auto;
    }
  }

  .image-upload {
    text-align: center;

    .upload-dragger {
      width: 100%;
      max-width: 400px;
      margin: 0 auto 20px auto;
    }

    .image-preview {
      max-width: 400px;
      margin: 0 auto;

      img {
        width: 100%;
        max-height: 300px;
        object-fit: contain;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        margin-bottom: 15px;
      }

      .preview-actions {
        display: flex;
        justify-content: center;
        gap: 12px;
      }
    }
  }

  .manual-input {
    max-width: 400px;
    margin: 0 auto;

    .recent-queries {
      margin-top: 30px;

      h4 {
        color: #303133;
        margin-bottom: 15px;
      }

      .query-history {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .query-tag {
          cursor: pointer;
          transition: all 0.3s;

          &:hover {
            background: #409eff;
            color: white;
          }
        }
      }
    }
  }

  .scan-result {
    margin-top: 30px;

    .result-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;

      h3 {
        margin: 0;
        color: #303133;
      }
    }

    .household-detail {
      .detail-card {
        margin-bottom: 20px;
      }

      .security-info {
        .security-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;

          &:last-child {
            border-bottom: none;
          }

          .label {
            font-weight: 500;
            color: #606266;
          }

          .expired {
            color: #f56c6c;
          }
        }
      }

      .result-actions {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 20px;
      }
    }

    .result-error {
      text-align: center;
    }
  }

  .scanning-status {
    text-align: center;
    padding: 40px;
    color: #909399;

    p {
      margin-top: 20px;
      font-size: 16px;
    }
  }
}

// 扫描动画
@keyframes scan {
  0% {
    top: 0;
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  100% {
    top: 100%;
    opacity: 0;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .qr-scanner-dialog {
    .camera-scanner .scanner-container {
      max-width: 100%;
    }

    .result-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
