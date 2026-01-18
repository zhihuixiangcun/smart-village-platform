<template>
  <div class="registration-review">
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h2 class="page-title">注册申请审批</h2>
          <p class="page-subtitle">管理待审批的采购商注册申请</p>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card pending">
        <div class="stat-icon">
          <el-icon size="28"><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待审批</div>
        </div>
      </div>
      <div class="stat-card approved">
        <div class="stat-icon">
          <el-icon size="28"><CircleCheck /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.approved }}</div>
          <div class="stat-label">已批准</div>
        </div>
      </div>
      <div class="stat-card rejected">
        <div class="stat-icon">
          <el-icon size="28"><CircleClose /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.rejected }}</div>
          <div class="stat-label">已拒绝</div>
        </div>
      </div>
      <div class="stat-card total">
        <div class="stat-icon">
          <el-icon size="28"><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总申请</div>
        </div>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <el-card class="filter-bar" shadow="never">
      <div class="filter-row">
        <el-select
          v-model="filters.status"
          placeholder="全部状态"
          clearable
          class="filter-select"
          @change="fetchApplications"
        >
          <el-option label="待审批" value="pending" />
          <el-option label="已批准" value="approved" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>

        <el-select
          v-model="filters.type"
          placeholder="全部类型"
          clearable
          class="filter-select"
          @change="fetchApplications"
        >
          <el-option label="个人采购商" value="individual" />
          <el-option label="商家采购商" value="business" />
        </el-select>

        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="filter-date"
          @change="fetchApplications"
        />

        <el-input
          v-model="filters.keyword"
          placeholder="搜索姓名/手机号"
          clearable
          @clear="fetchApplications"
          @keyup.enter="fetchApplications"
          class="filter-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button type="primary" @click="fetchApplications" :icon="Search">
          搜索
        </el-button>
        <el-button @click="resetFilters" :icon="Refresh"> 重置 </el-button>
      </div>
    </el-card>

    <!-- 申请列表 -->
    <el-card class="applications-list" shadow="never">
      <div class="table-header">
        <span class="table-title">申请列表</span>
        <span class="table-count">共 {{ pagination.total }} 条</span>
      </div>

      <el-table
        :data="applications"
        :loading="loading"
        stripe
        @row-click="viewApplication"
        class="data-table"
        style="cursor: pointer"
      >
        <el-table-column prop="applicant.name" label="申请人姓名" width="120">
          <template #default="{ row }">
            <div class="user-name">{{ row.applicant.name }}</div>
          </template>
        </el-table-column>

        <el-table-column prop="applicant.phone" label="手机号" width="130" />

        <el-table-column prop="applicationType" label="申请类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.applicationType === 'individual' ? 'primary' : 'success'">
              {{ row.applicationType === 'individual' ? '个人采购商' : '商家采购商' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="purchaseCategories" label="采购类目" min-width="200">
          <template #default="{ row }">
            <div class="categories-cell">
              <el-tag
                v-for="cat in row.purchaseCategories?.slice(0, 3)"
                :key="cat"
                size="small"
                class="category-tag"
              >
                {{ cat }}
              </el-tag>
              <el-tag v-if="row.purchaseCategories?.length > 3" size="small" type="info">
                +{{ row.purchaseCategories.length - 3 }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="approval.status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.approval?.status)" class="status-tag">
              {{ getStatusLabel(row.approval?.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="申请时间" width="160">
          <template #default="{ row }">
            <div class="time-cell">{{ formatDate(row.createdAt) }}</div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                size="small"
                @click.stop="viewApplication(row)"
                :icon="View"
              >
                查看
              </el-button>
              <el-button
                v-if="row.approval?.status === 'pending'"
                size="small"
                type="success"
                @click.stop="approveApplication(row)"
                :icon="Check"
              >
                批准
              </el-button>
              <el-button
                v-if="row.approval?.status === 'pending'"
                size="small"
                type="danger"
                @click.stop="rejectApplication(row)"
                :icon="Close"
              >
                拒绝
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchApplications"
          @current-change="fetchApplications"
        />
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      :title="`申请详情 - ${currentApplication?.applicant?.name || ''}`"
      width="900px"
      destroy-on-close
      class="detail-dialog"
    >
      <div v-if="currentApplication" class="application-detail">
        <!-- 基本信息区 -->
        <div class="detail-section">
          <h3 class="section-title">
            <el-icon class="section-icon"><User /></el-icon>
            基本信息
          </h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="申请人姓名">
              {{ currentApplication.applicant?.name }}
            </el-descriptions-item>
            <el-descriptions-item label="手机号">
              {{ currentApplication.applicant?.phone }}
            </el-descriptions-item>
            <el-descriptions-item label="身份证号">
              {{ maskIdCard(currentApplication.applicant?.idCard) }}
            </el-descriptions-item>
            <el-descriptions-item label="申请类型">
              <el-tag
                :type="
                  currentApplication.applicationType === 'individual'
                    ? 'primary'
                    : 'success'
                "
              >
                {{
                  currentApplication.applicationType === 'individual'
                    ? '个人采购商'
                    : '商家采购商'
                }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item
              v-if="currentApplication.applicationType === 'business'"
              label="企业名称"
            >
              {{ currentApplication.businessInfo?.companyName }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="currentApplication.applicationType === 'business'"
              label="职务"
            >
              {{ currentApplication.businessInfo?.position }}
            </el-descriptions-item>
            <el-descriptions-item label="申请时间">
              {{ formatDate(currentApplication.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="当前状态">
              <el-tag :type="getStatusType(currentApplication.approval?.status)">
                {{ getStatusLabel(currentApplication.approval?.status) }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 采购类目 -->
        <div class="detail-section">
          <h3 class="section-title">
            <el-icon class="section-icon"><ShoppingCart /></el-icon>
            采购类目
          </h3>
          <div class="categories-tags">
            <el-tag
              v-for="cat in currentApplication.purchaseCategories"
              :key="cat"
              class="category-tag"
            >
              {{ cat }}
            </el-tag>
          </div>
        </div>

        <!-- 证件图片 -->
        <div class="detail-section">
          <h3 class="section-title">
            <el-icon class="section-icon"><Picture /></el-icon>
            证件材料
          </h3>
          <div class="documents-grid">
            <div class="document-item">
              <div class="document-label">身份证正面</div>
              <el-image
                :src="currentApplication.applicant?.idCardFront?.fileUrl"
                fit="cover"
                class="document-image"
                :preview-src-list="[currentApplication.applicant?.idCardFront?.fileUrl]"
              />
            </div>
            <div class="document-item">
              <div class="document-label">身份证反面</div>
              <el-image
                :src="currentApplication.applicant?.idCardBack?.fileUrl"
                fit="cover"
                class="document-image"
                :preview-src-list="[currentApplication.applicant?.idCardBack?.fileUrl]"
              />
            </div>
            <div v-if="currentApplication.applicationType === 'business'" class="document-item">
              <div class="document-label">营业执照</div>
              <el-image
                :src="currentApplication.businessInfo?.businessLicense?.fileUrl"
                fit="cover"
                class="document-image"
                :preview-src-list="[currentApplication.businessInfo?.businessLicense?.fileUrl]"
              />
            </div>
          </div>
        </div>

        <!-- OCR验证结果 -->
        <div v-if="currentApplication.ocrVerification" class="detail-section">
          <h3 class="section-title">
            <el-icon class="section-icon"><DocumentChecked /></el-icon>
            OCR验证结果
          </h3>
          <el-alert
            :type="currentApplication.ocrVerification.idCardVerified ? 'success' : 'warning'"
            :closable="false"
          >
            <template #title>
              {{
                currentApplication.ocrVerification.idCardVerified
                  ? 'OCR验证通过'
                  : 'OCR验证未通过'
              }}
            </template>
            <div v-if="currentApplication.ocrVerification.extractedInfo" class="ocr-info">
              <p>识别姓名: {{ currentApplication.ocrVerification.extractedInfo.name }}</p>
              <p>
                识别身份证:
                {{ maskIdCard(currentApplication.ocrVerification.extractedInfo.idCard) }}
              </p>
              <p>
                置信度: {{ (currentApplication.ocrVerification.confidenceScore * 100).toFixed(1) }}%
              </p>
            </div>
          </el-alert>
        </div>

        <!-- 审批记录 -->
        <div v-if="currentApplication.approval?.reviewedBy?.length" class="detail-section">
          <h3 class="section-title">
            <el-icon class="section-icon"><List /></el-icon>
            审批记录
          </h3>
          <el-timeline>
            <el-timeline-item
              v-for="record in currentApplication.approval.reviewedBy"
              :key="record.reviewedAt"
              :timestamp="formatDate(record.reviewedAt)"
              placement="top"
            >
              <el-tag
                :type="
                  record.decision === 'approved'
                    ? 'success'
                    : record.decision === 'rejected'
                      ? 'danger'
                      : 'info'
                "
              >
                {{
                  record.decision === 'approved'
                    ? '批准'
                    : record.decision === 'rejected'
                      ? '拒绝'
                      : '审核中'
                }}
              </el-tag>
              <p>审核人: {{ record.reviewerName || '管理员' }}</p>
              <p v-if="record.comments">意见: {{ record.comments }}</p>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button
          v-if="currentApplication?.approval?.status === 'pending'"
          type="success"
          @click="approveApplication(currentApplication)"
          :icon="Check"
        >
          批准
        </el-button>
        <el-button
          v-if="currentApplication?.approval?.status === 'pending'"
          type="danger"
          @click="rejectApplication(currentApplication)"
          :icon="Close"
        >
          拒绝
        </el-button>
      </template>
    </el-dialog>

    <!-- 审批意见对话框 -->
    <el-dialog
      v-model="reviewDialogVisible"
      :title="reviewAction === 'approve' ? '批准申请' : '拒绝申请'"
      width="500px"
      class="review-dialog"
    >
      <el-form :model="reviewForm" label-width="80px">
        <el-form-item label="审批意见">
          <el-input
            v-model="reviewForm.comments"
            type="textarea"
            :rows="4"
            :placeholder="
              reviewAction === 'approve' ? '请填写批准意见（可选）' : '请说明拒绝原因'
            "
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button
          :type="reviewAction === 'approve' ? 'success' : 'danger'"
          @click="submitReview"
        >
          确认{{ reviewAction === 'approve' ? '批准' : '拒绝' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Clock,
  CircleCheck,
  CircleClose,
  Document,
  Search,
  Refresh,
  View,
  Check,
  Close,
  User,
  ShoppingCart,
  Picture,
  DocumentChecked,
  List,
} from '@element-plus/icons-vue';
import api from '@/api';

// 数据状态
const loading = ref(false);
const applications = ref([]);
const stats = ref({ pending: 0, approved: 0, rejected: 0, total: 0 });
const detailVisible = ref(false);
const reviewDialogVisible = ref(false);
const currentApplication = ref(null);
const reviewAction = ref('');

// 筛选条件
const filters = reactive({
  status: '',
  type: '',
  keyword: '',
  dateRange: null,
});

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

// 审批表单
const reviewForm = reactive({
  comments: '',
});

// 获取申请列表
const fetchApplications = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
      status: filters.status || undefined,
      applicationType: filters.type || undefined,
      keyword: filters.keyword || undefined,
    };
    const response = await api.get('/api/v1/registration/pending', { params });
    if (response.success) {
      applications.value = response.data.applications || [];
      pagination.total = response.data.total || 0;
    }
  } catch (error) {
    ElMessage.error('获取申请列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取统计数据
const fetchStats = async () => {
  try {
    const response = await api.get('/api/v1/registration/stats');
    if (response.success) {
      stats.value = response.data;
    }
  } catch (error) {
    console.error('获取统计数据失败', error);
  }
};

// 查看详情
const viewApplication = row => {
  currentApplication.value = row;
  detailVisible.value = true;
};

// 批准申请
const approveApplication = application => {
  currentApplication.value = application;
  reviewAction.value = 'approve';
  reviewForm.comments = '';
  reviewDialogVisible.value = true;
};

// 拒绝申请
const rejectApplication = application => {
  currentApplication.value = application;
  reviewAction.value = 'reject';
  reviewForm.comments = '';
  reviewDialogVisible.value = true;
};

// 提交审批
const submitReview = async () => {
  try {
    const endpoint =
      reviewAction.value === 'approve'
        ? `/api/v1/registration/${currentApplication.value._id}/approve`
        : `/api/v1/registration/${currentApplication.value._id}/reject`;

    const response = await api.post(endpoint, {
      comments: reviewForm.comments,
      reviewerId: localStorage.getItem('userId'),
    });

    if (response.success) {
      ElMessage.success(reviewAction.value === 'approve' ? '已批准' : '已拒绝');
      reviewDialogVisible.value = false;
      detailVisible.value = false;
      fetchApplications();
      fetchStats();
    } else {
      ElMessage.error(response.message || '操作失败');
    }
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
  }
};

// 重置筛选
const resetFilters = () => {
  filters.status = '';
  filters.type = '';
  filters.keyword = '';
  filters.dateRange = null;
  pagination.page = 1;
  fetchApplications();
};

// 工具函数
const getStatusType = status => {
  const types = { pending: 'warning', approved: 'success', rejected: 'danger' };
  return types[status] || 'info';
};

const getStatusLabel = status => {
  const labels = { pending: '待审批', approved: '已批准', rejected: '已拒绝' };
  return labels[status] || status;
};

const maskIdCard = idCard => {
  if (!idCard) return '';
  return idCard.replace(/^(.{6})(.*)(.{4})$/, '$1********$3');
};

const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

// 初始化
onMounted(() => {
  fetchApplications();
  fetchStats();
});
</script>

<style scoped>
.registration-review {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  min-height: calc(100vh - 40px);
}

.page-header {
  margin-bottom: 24px;
  padding: 32px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(240, 147, 251, 0.25);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    border-radius: 50%;
  }

  .header-left {
    position: relative;
    z-index: 1;

    .page-title {
      font-size: 28px;
      color: #ffffff;
      margin: 0 0 8px 0;
      font-weight: 700;
      line-height: 1.3;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      letter-spacing: 0.5px;
    }

    .page-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 15px;
      margin: 0;
      line-height: 1.5;
      font-weight: 400;
    }
  }
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    border-radius: 16px 16px 0 0;
  }

  &.pending::before {
    background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
  }

  &.approved::before {
    background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);
  }

  &.rejected::before {
    background: linear-gradient(90deg, #eb3349 0%, #f45c43 100%);
  }

  &.total::before {
    background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  }

  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  }

  .stat-icon {
    width: 72px;
    height: 72px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    position: relative;
    overflow: hidden;

    &::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.3) 50%,
        transparent 70%
      );
      animation: shimmer 3s infinite;
    }
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    100% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }

  &.pending .stat-icon {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  &.approved .stat-icon {
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  }

  &.rejected .stat-icon {
    background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
  }

  &.total .stat-icon {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }

  .stat-content {
    flex: 1;
  }

  .stat-value {
    font-size: 36px;
    font-weight: 800;
    color: var(--el-text-color-primary);
    line-height: 1;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .stat-label {
    color: var(--el-text-color-secondary);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
}

.filter-bar {
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  background: #ffffff;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  }

  .filter-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }

  .filter-select,
  .filter-date,
  .filter-input {
    :deep(.el-input__wrapper),
    :deep(.el-select__wrapper) {
      border-radius: 8px;
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 0 0 1px #f093fb inset;
      }
    }
  }

  .filter-select {
    width: 144px;
  }

  .filter-date {
    width: 280px;
  }

  .filter-input {
    flex: 1;
    min-width: 200px;
  }
}

.applications-list {
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .table-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .table-count {
      font-size: 14px;
      color: var(--el-text-color-secondary);
    }
  }
}

:deep(.data-table) {
  border-radius: 12px;
  overflow: hidden;

  .el-table__inner-wrapper {
    border-radius: 12px;
  }

  .el-table__row {
    transition: all 0.3s ease;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 0;
      background: linear-gradient(180deg, #f093fb 0%, #f5576c 100%);
      transition: width 0.3s ease;
    }

    &:hover {
      background-color: rgba(240, 147, 251, 0.05);
      transform: scale(1.005);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

      &::before {
        width: 3px;
      }
    }

    &:nth-child(odd) {
      background-color: rgba(248, 250, 252, 0.5);
    }
  }

  .el-table__header th {
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    color: var(--el-text-color-primary);
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, #f093fb 50%, transparent 100%);
    }
  }

  .el-table__cell {
    padding: 16px 12px;
  }
}

.user-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.categories-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  .category-tag {
    font-size: 12px;
    height: 22px;
    line-height: 20px;
    padding: 0 8px;
  }
}

.status-tag {
  font-weight: 500;
}

.time-cell {
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.pagination-container {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.application-detail {
  max-height: 600px;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }

  :deep(.el-descriptions) {
    border-radius: 12px;
    overflow: hidden;

    .el-descriptions__header {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    .el-descriptions__label {
      font-weight: 600;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: var(--el-text-color-primary);
    }

    .el-descriptions__content {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  padding-left: 16px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 16px;
    background: linear-gradient(180deg, #f093fb 0%, #f5576c 100%);
    border-radius: 2px;
  }

  .section-icon {
    color: #f093fb;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.categories-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  .category-tag {
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 20px;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: #ffffff;
    border: none;
    box-shadow: 0 2px 8px rgba(240, 147, 251, 0.25);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
    }
  }
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.document-item {
  text-align: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: #f093fb;
  }
}

.document-label {
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.document-image {
  width: 100%;
  height: 150px;
  border-radius: 8px;
  border: 2px solid var(--el-border-color-light);
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &:hover {
    border-color: #f093fb;
    transform: scale(1.02);
    box-shadow: 0 4px 16px rgba(240, 147, 251, 0.3);
  }
}

.ocr-info {
  margin-top: 12px;

  p {
    margin: 4px 0;
    color: var(--el-text-color-regular);
    font-size: 14px;
  }
}

.detail-dialog,
.review-dialog {
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
  }

  :deep(.el-dialog__header) {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    padding: 24px 32px;
    margin: 0;

    .el-dialog__title {
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
    }

    .el-dialog__headerbtn {
      top: 24px;
      right: 24px;

      .el-dialog__close {
        color: rgba(255, 255, 255, 0.9);
        font-size: 20px;
        transition: all 0.2s ease;

        &:hover {
          color: #ffffff;
          transform: rotate(90deg);
        }
      }
    }
  }

  :deep(.el-dialog__body) {
    padding: 32px;
    max-height: 600px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      border-radius: 4px;
    }
  }
}

// 响应式设计
@media (max-width: 1400px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .registration-review {
    padding: 16px;

    .page-header {
      padding: 16px;
    }

    .stats-cards {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .filter-bar {
      .filter-row {
        flex-direction: column;
        align-items: stretch;

        .filter-select,
        .filter-date,
        .filter-input {
          width: 100%;
        }
      }
    }

    .applications-list {
      padding: 16px;

      .table-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }

    .documents-grid {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column;
      align-items: flex-start;
    }

    .pagination-container {
      justify-content: center;
    }
  }
}
</style>
