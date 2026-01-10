<template>
  <div class="document-preview">
    <div class="preview-header">
      <div class="document-info">
        <h2>{{ document?.documentInfo?.name }}</h2>
        <div class="document-meta">
          <el-tag :type="getStatusType(document?.documentInfo?.status)">
            {{ document?.documentInfo?.status }}
          </el-tag>
          <span class="meta-item">类型：{{ document?.documentInfo?.type }}</span>
          <span class="meta-item" v-if="document?.documentInfo?.number">
            编号：{{ document?.documentInfo?.number }}
          </span>
          <span class="meta-item" v-if="document?.documentInfo?.validUntil">
            有效期至：{{ formatDate(document.documentInfo.validUntil) }}
          </span>
        </div>
      </div>
      <div class="preview-actions">
        <el-button @click="handleDownload" icon="Download"> 下载 </el-button>
        <el-button @click="handlePrint" icon="Printer"> 打印 </el-button>
        <el-button @click="handleShare" icon="Share" type="primary"> 分享 </el-button>
        <el-button @click="handleVoiceRead" icon="Microphone"> 语音朗读 </el-button>
      </div>
    </div>

    <div class="preview-content">
      <el-row :gutter="20">
        <!-- 文件预览 -->
        <el-col :span="16">
          <div class="file-preview">
            <div class="preview-toolbar">
              <el-button-group>
                <el-button
                  :type="previewMode === 'image' ? 'primary' : ''"
                  @click="previewMode = 'image'"
                  icon="Picture"
                >
                  图片预览
                </el-button>
                <el-button
                  :type="previewMode === 'pdf' ? 'primary' : ''"
                  @click="previewMode = 'pdf'"
                  icon="Document"
                >
                  PDF预览
                </el-button>
                <el-button
                  :type="previewMode === 'text' ? 'primary' : ''"
                  @click="previewMode = 'text'"
                  icon="ChatLineRound"
                >
                  文本预览
                </el-button>
              </el-button-group>
              <div class="zoom-controls">
                <el-button @click="zoomOut" icon="ZoomOut" size="small" />
                <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
                <el-button @click="zoomIn" icon="ZoomIn" size="small" />
                <el-button @click="fitToScreen" icon="FullScreen" size="small">
                  适应屏幕
                </el-button>
              </div>
            </div>

            <div class="preview-area" ref="previewArea">
              <!-- 图片预览 -->
              <div v-if="previewMode === 'image'" class="image-preview">
                <img
                  :src="previewUrl"
                  :style="{ transform: `scale(${zoomLevel})` }"
                  alt="文档预览"
                  @load="handleImageLoad"
                  @error="handleImageError"
                />
              </div>

              <!-- PDF预览 -->
              <div v-else-if="previewMode === 'pdf'" class="pdf-preview">
                <iframe :src="pdfViewerUrl" width="100%" height="600px" frameborder="0"></iframe>
              </div>

              <!-- 文本预览（OCR结果） -->
              <div v-else-if="previewMode === 'text'" class="text-preview">
                <div v-if="document?.ocrResult?.text" class="ocr-text">
                  <h4>OCR识别文本</h4>
                  <div class="text-content">{{ document.ocrResult.text }}</div>

                  <h4 v-if="document.ocrResult.extractedFields">提取字段</h4>
                  <el-table
                    v-if="document.ocrResult.extractedFields"
                    :data="ocrFieldList"
                    style="width: 100%"
                  >
                    <el-table-column prop="field" label="字段" width="150" />
                    <el-table-column prop="value" label="值" />
                    <el-table-column prop="confidence" label="置信度" width="100" align="center">
                      <template #default="{ row }">
                        <el-tag :type="getConfidenceType(row.confidence)">
                          {{ (row.confidence * 100).toFixed(1) }}%
                        </el-tag>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
                <el-empty v-else description="暂无OCR识别文本" />
              </div>

              <!-- 加载状态 -->
              <div v-if="loading" class="loading-overlay">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>加载中...</span>
              </div>
            </div>
          </div>
        </el-col>

        <!-- 文档详情 -->
        <el-col :span="8">
          <div class="document-details">
            <el-card class="detail-card">
              <template #header>
                <span>文档详情</span>
              </template>

              <div class="detail-item">
                <span class="label">文件名：</span>
                <span class="value">{{ document?.fileInfo?.originalName }}</span>
              </div>
              <div class="detail-item">
                <span class="label">文件大小：</span>
                <span class="value">{{ formatFileSize(document?.fileInfo?.fileSize) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">上传时间：</span>
                <span class="value">{{ formatDate(document?.createdAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">最后更新：</span>
                <span class="value">{{ formatDate(document?.updatedAt) }}</span>
              </div>
              <div class="detail-item" v-if="document?.documentInfo?.issuer">
                <span class="label">发证机关：</span>
                <span class="value">{{ document.documentInfo.issuer }}</span>
              </div>
              <div class="detail-item" v-if="document?.documentInfo?.remarks">
                <span class="label">备注：</span>
                <span class="value">{{ document.documentInfo.remarks }}</span>
              </div>
            </el-card>

            <!-- 版本历史 -->
            <el-card class="detail-card" v-if="document?.versions?.length > 0">
              <template #header>
                <span>版本历史</span>
              </template>

              <el-timeline>
                <el-timeline-item
                  v-for="version in document.versions"
                  :key="version.version"
                  :timestamp="formatDate(version.createdAt)"
                >
                  <div class="version-item">
                    <span class="version-label">版本 {{ version.version }}</span>
                    <el-tag size="small" type="info">{{ version.changeType }}</el-tag>
                    <div class="version-reason" v-if="version.reason">{{ version.reason }}</div>
                  </div>
                </el-timeline-item>
              </el-timeline>
            </el-card>

            <!-- 分享信息 -->
            <el-card class="detail-card" v-if="document?.sharing?.isShared">
              <template #header>
                <span>分享信息</span>
              </template>

              <div class="share-info">
                <el-tag
                  v-for="userId in document.sharing.sharedWith"
                  :key="userId"
                  class="share-tag"
                >
                  {{ getUserName(userId) }}
                </el-tag>
              </div>
            </el-card>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 分享对话框 -->
    <el-dialog v-model="showShareDialog" title="分享文档" width="500px">
      <DocumentShare
        :document="document"
        @confirm="handleShareConfirm"
        @cancel="showShareDialog = false"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Download,
  Printer,
  Share,
  Microphone,
  Picture,
  Document,
  ChatLineRound,
  ZoomOut,
  ZoomIn,
  FullScreen,
  Loading,
} from '@element-plus/icons-vue';
import DocumentShare from './DocumentShare.vue';
import { documentApi } from '@/api/residentProfile';

// Props
const props = defineProps({
  document: {
    type: Object,
    required: true,
  },
});

// 响应式数据
const previewMode = ref('image');
const zoomLevel = ref(1);
const loading = ref(false);
const showShareDialog = ref(false);
const previewArea = ref(null);

// 预览URL
const previewUrl = computed(() => {
  if (!props.document?.fileInfo?.filePath) return '';
  return `${import.meta.env.VITE_API_URL}/${props.document.fileInfo.filePath}`;
});

// PDF查看器URL
const pdfViewerUrl = computed(() => {
  if (!previewUrl.value) return '';
  return `/pdfjs/web/viewer.html?file=${encodeURIComponent(previewUrl.value)}`;
});

// OCR字段列表
const ocrFieldList = computed(() => {
  if (!props.document?.ocrResult?.extractedFields) return [];

  return Object.entries(props.document.ocrResult.extractedFields).map(([field, data]) => ({
    field,
    value: data.value,
    confidence: data.confidence,
  }));
});

// 获取状态类型
const getStatusType = status => {
  const statusMap = {
    有效: 'success',
    即将过期: 'warning',
    已过期: 'danger',
    遗失: 'info',
    注销: 'info',
  };
  return statusMap[status] || 'info';
};

// 获取置信度类型
const getConfidenceType = confidence => {
  if (confidence >= 0.9) return 'success';
  if (confidence >= 0.7) return 'warning';
  return 'danger';
};

// 格式化日期
const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

// 格式化文件大小
const formatFileSize = size => {
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  return `${size.toFixed(2)} ${units[index]}`;
};

// 获取用户名称（示例）
const getUserName = userId => {
  // 实际应该从用户列表或API获取
  const userMap = {
    user1: '张三',
    user2: '李四',
    user3: '王五',
  };
  return userMap[userId] || userId;
};

// 缩放控制
const zoomIn = () => {
  if (zoomLevel.value < 3) {
    zoomLevel.value += 0.1;
  }
};

const zoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value -= 0.1;
  }
};

const fitToScreen = () => {
  zoomLevel.value = 1;
};

// 图片加载处理
const handleImageLoad = () => {
  loading.value = false;
};

const handleImageError = () => {
  loading.value = false;
  ElMessage.error('图片加载失败');
};

// 下载文档
const handleDownload = async () => {
  try {
    const response = await documentApi.downloadDocument(props.document._id);
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', props.document.fileInfo.originalName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    ElMessage.success('下载成功');
  } catch (error) {
    ElMessage.error('下载失败');
    console.error(error);
  }
};

// 打印文档
const handlePrint = () => {
  if (previewMode.value === 'image') {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${props.document.documentInfo.name}</title>
          <style>
            body { margin: 0; padding: 20px; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <img src="${previewUrl.value}" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  } else {
    ElMessage.info('当前模式不支持打印，请切换到图片预览模式');
  }
};

// 分享文档
const handleShare = () => {
  showShareDialog.value = true;
};

const handleShareConfirm = () => {
  showShareDialog.value = false;
  ElMessage.success('分享设置已更新');
};

// 语音朗读
const handleVoiceRead = async () => {
  try {
    const text = props.document.ocrResult?.text || props.document.documentInfo.name;
    await documentApi.readDocument(props.document._id);
    ElMessage.success('开始语音朗读');
  } catch (error) {
    ElMessage.error('语音朗读失败');
    console.error(error);
  }
};

// 生命周期
onMounted(() => {
  // 根据文件类型自动选择预览模式
  if (props.document?.fileInfo) {
    const fileName = props.document.fileInfo.originalName.toLowerCase();
    if (fileName.endsWith('.pdf')) {
      previewMode.value = 'pdf';
    } else if (
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png')
    ) {
      previewMode.value = 'image';
    } else {
      previewMode.value = 'text';
    }
  }
});
</script>

<style lang="scss" scoped>
.document-preview {
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e4e7ed;

    .document-info {
      h2 {
        margin: 0 0 10px 0;
        font-size: 20px;
        color: #303133;
      }

      .document-meta {
        display: flex;
        align-items: center;
        gap: 15px;

        .meta-item {
          color: #606266;
          font-size: 14px;
        }
      }
    }

    .preview-actions {
      display: flex;
      gap: 10px;
    }
  }

  .preview-content {
    .file-preview {
      .preview-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding: 10px;
        background: #f5f7fa;
        border-radius: 4px;

        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 10px;

          .zoom-level {
            min-width: 50px;
            text-align: center;
            font-size: 14px;
            color: #606266;
          }
        }
      }

      .preview-area {
        position: relative;
        background: #fff;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        min-height: 600px;
        overflow: auto;

        .image-preview {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 20px;
          min-height: 600px;

          img {
            max-width: 100%;
            height: auto;
            transition: transform 0.3s;
            cursor: move;
          }
        }

        .pdf-preview {
          height: 600px;
        }

        .text-preview {
          padding: 20px;

          .ocr-text {
            h4 {
              margin: 0 0 15px 0;
              color: #409eff;
            }

            .text-content {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 4px;
              line-height: 1.6;
              white-space: pre-wrap;
              font-family: monospace;
              margin-bottom: 20px;
            }
          }
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: rgba(255, 255, 255, 0.9);

          .el-icon {
            font-size: 40px;
            color: #409eff;
            margin-bottom: 10px;
          }
        }
      }
    }

    .document-details {
      .detail-card {
        margin-bottom: 20px;

        .detail-item {
          display: flex;
          margin-bottom: 10px;

          .label {
            min-width: 80px;
            color: #909399;
            font-size: 14px;
          }

          .value {
            flex: 1;
            color: #303133;
            font-size: 14px;
            word-break: break-all;
          }
        }

        .version-item {
          .version-label {
            font-weight: 500;
            margin-right: 10px;
          }

          .version-reason {
            color: #606266;
            font-size: 12px;
            margin-top: 5px;
          }
        }

        .share-info {
          .share-tag {
            margin-right: 8px;
            margin-bottom: 8px;
          }
        }
      }
    }
  }
}
</style>
