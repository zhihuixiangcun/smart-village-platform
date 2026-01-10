<template>
  <div class="document-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>证件文档</h1>
      <p>管理村民证件和办事文档，支持OCR识别和智能分类</p>
    </div>

    <!-- 操作工具栏 -->
    <div class="toolbar">
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :show-file-list="false"
        :limit="5"
        :on-change="handleFileSelect"
        accept="image/*,.pdf,.doc,.docx"
      >
        <el-button type="primary" icon="Upload"> 上传文档 </el-button>
      </el-upload>
      <el-button icon="Search" @click="showSearchDialog = true"> 高级搜索 </el-button>
      <el-button icon="Download" @click="exportData"> 导出数据 </el-button>
      <div class="right-tools">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索文档名称或内容"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #append>
            <el-button icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalDocuments || 0 }}</div>
              <div class="stat-label">文档总数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon">
              <el-icon><Files /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatFileSize(stats.totalFileSize || 0) }}</div>
              <div class="stat-label">总存储量</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.expiringSoonCount || 0 }}</div>
              <div class="stat-label">即将过期</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon">
              <el-icon><Share /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.sharedCount || 0 }}</div>
              <div class="stat-label">已分享</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 分类标签 -->
    <div class="category-tabs">
      <el-radio-group v-model="currentCategory" @change="handleCategoryChange">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button label="身份证明">身份证明</el-radio-button>
        <el-radio-button label="户籍证明">户籍证明</el-radio-button>
        <el-radio-button label="学历证明">学历证明</el-radio-button>
        <el-radio-button label="财产证明">财产证明</el-radio-button>
        <el-radio-button label="社会保障">社会保障</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 文档列表 -->
    <el-card class="document-list">
      <template #header>
        <div class="card-header">
          <span>文档列表</span>
          <div class="header-actions">
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button label="list">列表视图</el-radio-button>
              <el-radio-button label="grid">网格视图</el-radio-button>
            </el-radio-group>
            <el-button size="small" icon="Sort" @click="showSortDialog = true"> 排序 </el-button>
          </div>
        </div>
      </template>

      <!-- 列表视图 -->
      <el-table
        v-if="viewMode === 'list'"
        v-loading="loading"
        :data="documentList"
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column type="expand" width="50">
          <template #default="{ row }">
            <div class="expand-content">
              <el-row :gutter="20">
                <el-col :span="12">
                  <h4>文档信息</h4>
                  <p><strong>证件号码：</strong>{{ row.documentInfo.number || '未填写' }}</p>
                  <p>
                    <strong>发证机关：</strong>{{ row.documentInfo.issuingAuthority || '未填写' }}
                  </p>
                  <p><strong>发证日期：</strong>{{ formatDate(row.documentInfo.issueDate) }}</p>
                  <p>
                    <strong>到期日期：</strong>
                    <span :class="{ 'text-danger': isExpiringSoon(row.documentInfo.expiryDate) }">
                      {{ formatDate(row.documentInfo.expiryDate) }}
                    </span>
                  </p>
                </el-col>
                <el-col :span="12">
                  <h4>OCR识别结果</h4>
                  <div v-if="row.ocrResult && row.ocrResult.text">
                    <p><strong>识别内容：</strong></p>
                    <p class="ocr-text">{{ row.ocrResult.text.substring(0, 200) }}...</p>
                    <p>
                      <strong>置信度：</strong>{{ (row.ocrResult.confidence * 100).toFixed(1) }}%
                    </p>
                  </div>
                  <p v-else class="text-muted">暂无OCR识别结果</p>
                  <div v-if="row.ocrResult && row.ocrResult.extractedFields">
                    <p><strong>提取信息：</strong></p>
                    <ul>
                      <li v-for="(value, key) in row.ocrResult.extractedFields" :key="key">
                        {{ key }}：{{ value }}
                      </li>
                    </ul>
                  </div>
                </el-col>
              </el-row>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="文档类型" width="120">
          <template #default="{ row }">
            <el-tag>{{ row.documentInfo.type }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="documentInfo.name" label="文档名称" min-width="200">
          <template #default="{ row }">
            <div class="document-name">
              <el-icon v-if="isImage(row)" class="file-icon"><Picture /></el-icon>
              <el-icon v-else-if="isPDF(row)" class="file-icon"><Document /></el-icon>
              <el-icon v-else class="file-icon"><Files /></el-icon>
              <span>{{ row.documentInfo.name }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.documentInfo.status)">
              {{ row.documentInfo.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="fileInfo.fileSize" label="大小" width="100" align="right">
          <template #default="{ row }">
            {{ formatFileSize(row.fileInfo.fileSize) }}
          </template>
        </el-table-column>

        <el-table-column prop="tags" label="标签" width="200">
          <template #default="{ row }">
            <el-tag
              v-for="tag in row.tags"
              :key="tag"
              size="small"
              style="margin-right: 5px; margin-bottom: 5px"
            >
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="OCR" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.ocrResult && row.ocrResult.confidence" color="#67c23a">
              <Check />
            </el-icon>
            <el-icon v-else-if="isProcessingOCR(row)" color="#e6a23c">
              <Loading />
            </el-icon>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="上传时间" width="150" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="previewDocument(row)"> 预览 </el-button>
            <el-button link type="primary" @click="downloadDocument(row)"> 下载 </el-button>
            <el-dropdown @command="handleMoreAction">
              <el-button link>
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'edit', document: row }">
                    编辑信息
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'share', document: row }">
                    分享文档
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'read', document: row }">
                    语音朗读
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'delete', document: row }" divided>
                    删除文档
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 网格视图 -->
      <div v-else class="grid-view">
        <el-row :gutter="20">
          <el-col
            v-for="document in documentList"
            :key="document._id"
            :span="6"
            style="margin-bottom: 20px"
          >
            <el-card class="document-card" shadow="hover" @click="previewDocument(document)">
              <div class="document-preview">
                <el-image
                  v-if="isImage(document)"
                  :src="getFileUrl(document)"
                  :preview-src-list="[getFileUrl(document)]"
                  fit="cover"
                  class="preview-image"
                />
                <div v-else class="preview-placeholder">
                  <el-icon><Document /></el-icon>
                </div>
                <div v-if="isProcessingOCR(document)" class="ocr-processing">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  <span>识别中...</span>
                </div>
              </div>

              <div class="document-info">
                <h4 :title="document.documentInfo.name">
                  {{ document.documentInfo.name }}
                </h4>
                <p class="document-meta">
                  <el-tag size="small">{{ document.documentInfo.type }}</el-tag>
                  <el-tag :type="getStatusTagType(document.documentInfo.status)" size="small">
                    {{ document.documentInfo.status }}
                  </el-tag>
                </p>
                <p class="document-size">
                  {{ formatFileSize(document.fileInfo.fileSize) }}
                </p>
              </div>

              <div class="card-actions">
                <el-button size="small" @click.stop="downloadDocument(document)"> 下载 </el-button>
                <el-dropdown @command="handleMoreAction" @click.stop>
                  <el-button size="small">
                    更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="{ action: 'share', document }">
                        分享
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'read', document }">
                        朗读
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'delete', document }" divided>
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[12, 24, 48, 96]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 上传对话框 -->
    <el-dialog
      v-model="showUploadDialog"
      title="上传文档"
      width="800px"
      :close-on-click-modal="false"
    >
      <DocumentUpload
        :files="selectedFiles"
        @submit="handleUploadSubmit"
        @cancel="handleUploadCancel"
      />
    </el-dialog>

    <!-- 搜索对话框 -->
    <el-dialog v-model="showSearchDialog" title="高级搜索" width="600px">
      <DocumentSearchForm
        :filters="searchFilters"
        @search="handleSearchSubmit"
        @reset="handleSearchReset"
      />
    </el-dialog>

    <!-- 排序对话框 -->
    <el-dialog v-model="showSortDialog" title="排序设置" width="400px">
      <el-form :model="sortConfig" label-width="100px">
        <el-form-item label="排序字段">
          <el-select v-model="sortConfig.sortBy">
            <el-option label="上传时间" value="createdAt" />
            <el-option label="文档名称" value="documentInfo.name" />
            <el-option label="文件大小" value="fileInfo.fileSize" />
            <el-option label="到期日期" value="documentInfo.expiryDate" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序方式">
          <el-radio-group v-model="sortConfig.sortOrder">
            <el-radio label="asc">升序</el-radio>
            <el-radio label="desc">降序</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSortDialog = false">取消</el-button>
        <el-button type="primary" @click="applySort">确定</el-button>
      </template>
    </el-dialog>

    <!-- 预览对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      :title="previewDocument?.documentInfo.name"
      width="80%"
      destroy-on-close
    >
      <DocumentPreview
        v-if="previewDocument"
        :document="previewDocument"
        @download="downloadDocument"
        @read="readDocument"
      />
    </el-dialog>

    <!-- 分享对话框 -->
    <el-dialog v-model="showShareDialog" title="分享文档" width="600px">
      <DocumentShare
        v-if="shareDocument"
        :document="shareDocument"
        @submit="handleShareSubmit"
        @cancel="showShareDialog = false"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Document,
  Files,
  Picture,
  Clock,
  Share,
  Upload,
  Search,
  Download,
  Sort,
  Check,
  Loading,
  ArrowDown,
} from '@element-plus/icons-vue';
import DocumentUpload from '@/components/resident/DocumentUpload.vue';
import DocumentSearchForm from '@/components/resident/DocumentSearchForm.vue';
import DocumentPreview from '@/components/resident/DocumentPreview.vue';
import DocumentShare from '@/components/resident/DocumentShare.vue';
import { documentApi } from '@/api/document';
import { exportToExcel } from '@/utils/export';

// 响应式数据
const loading = ref(false);
const documentList = ref([]);
const stats = ref({});
const viewMode = ref('list');
const currentCategory = ref('');
const searchKeyword = ref('');
const selectedFiles = ref([]);
const showUploadDialog = ref(false);
const showSearchDialog = ref(false);
const showSortDialog = ref(false);
const showPreviewDialog = ref(false);
const showShareDialog = ref(false);
const previewDocument = ref(null);
const shareDocument = ref(null);
const searchFilters = ref({});
const sortConfig = reactive({
  sortBy: 'createdAt',
  sortOrder: 'desc',
});

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

// 文件上传引用
const uploadRef = ref(null);

// 文件格式化大小
const formatFileSize = bytes => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化日期
const formatDate = date => {
  if (!date) return '未设置';
  return new Date(date).toLocaleDateString();
};

// 格式化日期时间
const formatDateTime = date => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

// 判断是否为图片
const isImage = document => {
  return document.fileInfo.mimeType.startsWith('image/');
};

// 判断是否为PDF
const isPDF = document => {
  return document.fileInfo.mimeType === 'application/pdf';
};

// 判断是否正在OCR处理
const isProcessingOCR = document => {
  return !document.ocrResult || document.ocrResult.confidence === 0;
};

// 判断是否即将过期
const isExpiringSoon = expiryDate => {
  if (!expiryDate) return false;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return new Date(expiryDate) <= thirtyDaysFromNow;
};

// 获取状态标签类型
const getStatusTagType = status => {
  const typeMap = {
    有效: 'success',
    过期: 'danger',
    挂失: 'warning',
    补办中: 'info',
    已注销: 'info',
  };
  return typeMap[status] || '';
};

// 获取文件URL
const getFileUrl = document => {
  return `/api/v1/documents/${document._id}/preview`;
};

// 加载文档列表
const loadDocumentList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      category: currentCategory.value,
      search: searchKeyword.value,
      sortBy: sortConfig.sortBy,
      sortOrder: sortConfig.sortOrder,
      ...searchFilters.value,
    };
    const response = await documentApi.getDocumentList(params);
    documentList.value = response.data.documents;
    pagination.total = response.data.pagination.total;
  } catch (error) {
    ElMessage.error('加载文档列表失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await documentApi.getDocumentStats();
    stats.value = response.data;
  } catch (error) {
    console.error('加载统计数据失败', error);
  }
};

// 文件选择处理
const handleFileSelect = file => {
  selectedFiles.value = file.raw ? [file.raw] : file.raw;
  showUploadDialog.value = true;
};

// 搜索处理
const handleSearch = () => {
  pagination.page = 1;
  loadDocumentList();
};

// 分类切换
const handleCategoryChange = () => {
  pagination.page = 1;
  loadDocumentList();
};

// 搜索提交
const handleSearchSubmit = filters => {
  searchFilters.value = filters;
  showSearchDialog.value = false;
  pagination.page = 1;
  loadDocumentList();
};

// 搜索重置
const handleSearchReset = () => {
  searchFilters.value = {};
  showSearchDialog.value = false;
  pagination.page = 1;
  loadDocumentList();
};

// 应用排序
const applySort = () => {
  showSortDialog.value = false;
  loadDocumentList();
};

// 上传提交
const handleUploadSubmit = async uploadData => {
  try {
    const promises = uploadData.files.map((file, index) => {
      const docInfo = uploadData.documentsInfo[index];
      return documentApi.uploadDocument(file, docInfo);
    });

    await Promise.all(promises);
    ElMessage.success('文档上传成功');
    showUploadDialog.value = false;
    selectedFiles.value = [];
    loadDocumentList();
  } catch (error) {
    ElMessage.error('上传失败');
    console.error(error);
  }
};

// 上传取消
const handleUploadCancel = () => {
  showUploadDialog.value = false;
  selectedFiles.value = [];
};

// 预览文档
const previewDocument = document => {
  previewDocument.value = document;
  showPreviewDialog.value = true;
};

// 下载文档
const downloadDocument = async document => {
  try {
    const response = await documentApi.downloadDocument(document._id);
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.download = document.fileInfo.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    ElMessage.error('下载失败');
    console.error(error);
  }
};

// 语音朗读文档
const readDocument = async document => {
  try {
    const response = await documentApi.readDocumentContent(document._id);
    const audioBlob = new Blob([response.audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();

    ElMessage.success('开始朗读文档内容');
  } catch (error) {
    ElMessage.error('朗读失败');
    console.error(error);
  }
};

// 分享文档
const shareDocument = document => {
  shareDocument.value = document;
  showShareDialog.value = true;
};

// 分享提交
const handleShareSubmit = async shareData => {
  try {
    await documentApi.shareDocument(
      shareDocument.value._id,
      shareData.sharedWith,
      shareData.permission
    );
    ElMessage.success('分享成功');
    showShareDialog.value = false;
  } catch (error) {
    ElMessage.error('分享失败');
    console.error(error);
  }
};

// 删除文档
const deleteDocument = async document => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文档"${document.documentInfo.name}"吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await documentApi.deleteDocument(document._id);
    ElMessage.success('删除成功');
    loadDocumentList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
      console.error(error);
    }
  }
};

// 编辑文档
const editDocument = document => {
  ElMessage.info('编辑功能开发中...');
};

// 更多操作处理
const handleMoreAction = ({ action, document }) => {
  switch (action) {
    case 'edit':
      editDocument(document);
      break;
    case 'share':
      shareDocument(document);
      break;
    case 'read':
      readDocument(document);
      break;
    case 'delete':
      deleteDocument(document);
      break;
  }
};

// 行点击处理
const handleRowClick = row => {
  previewDocument(row);
};

// 导出数据
const exportData = () => {
  exportToExcel(documentList.value, '文档列表');
  ElMessage.success('导出成功');
};

// 分页处理
const handleSizeChange = val => {
  pagination.limit = val;
  pagination.page = 1;
  loadDocumentList();
};

const handleCurrentChange = val => {
  pagination.page = val;
  loadDocumentList();
};

// 生命周期
onMounted(() => {
  loadDocumentList();
  loadStats();
});
</script>

<style lang="scss" scoped>
.document-management {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;

    h1 {
      margin: 0;
      font-size: 24px;
      color: #303133;
    }

    p {
      margin: 5px 0 0 0;
      color: #909399;
    }
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .right-tools {
      display: flex;
      align-items: center;

      .el-input {
        width: 300px;
      }
    }
  }

  .stats-cards {
    margin-bottom: 20px;

    .stat-card {
      display: flex;
      align-items: center;

      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;

        .el-icon {
          font-size: 24px;
          color: white;
        }
      }

      .stat-content {
        flex: 1;

        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
          line-height: 1;
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 5px;
        }
      }
    }
  }

  .category-tabs {
    margin-bottom: 20px;
  }

  .document-list {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .expand-content {
      padding: 20px;
      background: #f8f9fa;
      border-radius: 4px;

      h4 {
        margin: 0 0 10px 0;
        color: #409eff;
        font-size: 14px;
      }

      .ocr-text {
        line-height: 1.6;
        color: #606266;
      }

      .text-muted {
        color: #909399;
      }

      ul {
        margin: 0;
        padding-left: 20px;

        li {
          margin: 5px 0;
          color: #606266;
        }
      }

      .text-danger {
        color: #f56c6c;
      }
    }

    .document-name {
      display: flex;
      align-items: center;

      .file-icon {
        margin-right: 8px;
        font-size: 16px;
        color: #909399;
      }
    }

    .grid-view {
      .document-card {
        height: 100%;
        cursor: pointer;

        .document-preview {
          height: 160px;
          position: relative;
          overflow: hidden;
          border-radius: 4px;
          background: #f5f7fa;

          .preview-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .preview-placeholder {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            color: #c0c4cc;
          }

          .ocr-processing {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;

            .el-icon {
              font-size: 24px;
              margin-bottom: 5px;
            }
          }
        }

        .document-info {
          padding: 15px;

          h4 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #303133;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .document-meta {
            margin-bottom: 10px;
            display: flex;
            gap: 5px;
          }

          .document-size {
            color: #909399;
            font-size: 12px;
          }
        }

        .card-actions {
          padding: 0 15px 15px;
          display: flex;
          justify-content: space-between;
        }
      }
    }

    .pagination {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  }
}
</style>
