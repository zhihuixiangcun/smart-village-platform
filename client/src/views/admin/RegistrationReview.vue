<template>
  <div class="registration-review">
    <div class="page-header">
      <h1>注册申请审批</h1>
      <p>管理待审批的采购商注册申请</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon pending">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待审批</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon approved">
          <el-icon><CircleCheck /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.approved }}</div>
          <div class="stat-label">已批准</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon rejected">
          <el-icon><CircleClose /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.rejected }}</div>
          <div class="stat-label">已拒绝</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon total">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总申请</div>
        </div>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="filter-bar">
      <el-select
        v-model="filters.status"
        placeholder="全部状态"
        clearable
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
        @change="fetchApplications"
      />
      <el-input
        v-model="filters.keyword"
        placeholder="搜索姓名/手机号"
        clearable
        @clear="fetchApplications"
        @keyup.enter="fetchApplications"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" @click="fetchApplications">
        <el-icon><Search /></el-icon> 搜索
      </el-button>
      <el-button @click="resetFilters">
        <el-icon><Refresh /></el-icon> 重置
      </el-button>
    </div>

    <!-- 申请列表 -->
    <div class="applications-list">
      <el-table
        :data="applications"
        :loading="loading"
        stripe
        @row-click="viewApplication"
        style="cursor: pointer"
      >
        <el-table-column prop="applicant.name" label="申请人姓名" width="120" />
        <el-table-column prop="applicant.phone" label="手机号" width="130" />
        <el-table-column prop="applicationType" label="申请类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.applicationType === 'individual' ? 'primary' : 'success'">
              {{ row.applicationType === 'individual' ? '个人采购商' : '商家采购商' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="purchaseCategories" label="采购类目" width="200">
          <template #default="{ row }">
            <el-tag
              v-for="cat in row.purchaseCategories?.slice(0, 3)"
              :key="cat"
              size="small"
              class="mr-1"
            >
              {{ cat }}
            </el-tag>
            <el-tag v-if="row.purchaseCategories?.length > 3" size="small" type="info">
              +{{ row.purchaseCategories.length - 3 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="approval.status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.approval?.status)">
              {{ getStatusLabel(row.approval?.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click.stop="viewApplication(row)">
              <el-icon><View /></el-icon> 查看
            </el-button>
            <el-button
              v-if="row.approval?.status === 'pending'"
              size="small"
              type="success"
              @click.stop="approveApplication(row)"
            >
              <el-icon><Check /></el-icon> 批准
            </el-button>
            <el-button
              v-if="row.approval?.status === 'pending'"
              size="small"
              type="danger"
              @click.stop="rejectApplication(row)"
            >
              <el-icon><Close /></el-icon> 拒绝
            </el-button>
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
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      :title="`申请详情 - ${currentApplication?.applicant?.name || ''}`"
      width="900px"
      destroy-on-close
    >
      <div v-if="currentApplication" class="application-detail">
        <!-- 基本信息区 -->
        <div class="detail-section">
          <h3>
            <el-icon><User /></el-icon> 基本信息
          </h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="申请人姓名">{{
              currentApplication.applicant?.name
            }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{
              currentApplication.applicant?.phone
            }}</el-descriptions-item>
            <el-descriptions-item label="身份证号">{{
              maskIdCard(currentApplication.applicant?.idCard)
            }}</el-descriptions-item>
            <el-descriptions-item label="申请类型">
              <el-tag
                :type="currentApplication.applicationType === 'individual' ? 'primary' : 'success'"
              >
                {{
                  currentApplication.applicationType === 'individual' ? '个人采购商' : '商家采购商'
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
            <el-descriptions-item label="申请时间">{{
              formatDate(currentApplication.createdAt)
            }}</el-descriptions-item>
            <el-descriptions-item label="当前状态">
              <el-tag :type="getStatusType(currentApplication.approval?.status)">
                {{ getStatusLabel(currentApplication.approval?.status) }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 采购类目 -->
        <div class="detail-section">
          <h3>
            <el-icon><ShoppingCart /></el-icon> 采购类目
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
          <h3>
            <el-icon><Picture /></el-icon> 证件材料
          </h3>
          <div class="documents-grid">
            <div class="document-item">
              <div class="document-label">身份证正面</div>
              <el-image
                :src="currentApplication.applicant?.idCardFront?.fileUrl"
                fit="cover"
                style="width: 200px; height: 130px; border-radius: 8px"
                :preview-src-list="[currentApplication.applicant?.idCardFront?.fileUrl]"
              />
            </div>
            <div class="document-item">
              <div class="document-label">身份证反面</div>
              <el-image
                :src="currentApplication.applicant?.idCardBack?.fileUrl"
                fit="cover"
                style="width: 200px; height: 130px; border-radius: 8px"
                :preview-src-list="[currentApplication.applicant?.idCardBack?.fileUrl]"
              />
            </div>
            <div v-if="currentApplication.applicationType === 'business'" class="document-item">
              <div class="document-label">营业执照</div>
              <el-image
                :src="currentApplication.businessInfo?.businessLicense?.fileUrl"
                fit="cover"
                style="width: 200px; height: 130px; border-radius: 8px"
                :preview-src-list="[currentApplication.businessInfo?.businessLicense?.fileUrl]"
              />
            </div>
          </div>
        </div>

        <!-- OCR验证结果 -->
        <div v-if="currentApplication.ocrVerification" class="detail-section">
          <h3>
            <el-icon><DocumentChecked /></el-icon> OCR验证结果
          </h3>
          <el-alert
            :type="currentApplication.ocrVerification.idCardVerified ? 'success' : 'warning'"
            :closable="false"
          >
            <template #title>
              {{
                currentApplication.ocrVerification.idCardVerified ? 'OCR验证通过' : 'OCR验证未通过'
              }}
            </template>
            <div v-if="currentApplication.ocrVerification.extractedInfo">
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
          <h3>
            <el-icon><List /></el-icon> 审批记录
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
        >
          <el-icon><Check /></el-icon> 批准
        </el-button>
        <el-button
          v-if="currentApplication?.approval?.status === 'pending'"
          type="danger"
          @click="rejectApplication(currentApplication)"
        >
          <el-icon><Close /></el-icon> 拒绝
        </el-button>
      </template>
    </el-dialog>

    <!-- 审批意见对话框 -->
    <el-dialog
      v-model="reviewDialogVisible"
      :title="reviewAction === 'approve' ? '批准申请' : '拒绝申请'"
      width="500px"
    >
      <el-form :model="reviewForm" label-width="80px">
        <el-form-item label="审批意见">
          <el-input
            v-model="reviewForm.comments"
            type="textarea"
            :rows="4"
            :placeholder="reviewAction === 'approve' ? '请填写批准意见（可选）' : '请说明拒绝原因'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button :type="reviewAction === 'approve' ? 'success' : 'danger'" @click="submitReview">
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
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}
.page-header {
  margin-bottom: 24px;
}
.page-header h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 8px;
}
.page-header p {
  color: #666;
  font-size: 14px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}
.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}
.stat-icon.pending {
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
}
.stat-icon.approved {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
}
.stat-icon.rejected {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}
.stat-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.stat-content {
  flex: 1;
}
.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  line-height: 1;
}
.stat-label {
  color: #666;
  font-size: 14px;
  margin-top: 8px;
}

.filter-bar {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.applications-list {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.mr-1 {
  margin-right: 4px;
}

.application-detail {
  max-height: 600px;
  overflow-y: auto;
}
.detail-section {
  margin-bottom: 24px;
}
.detail-section h3 {
  font-size: 16px;
  color: #333;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.categories-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.category-tag {
  padding: 8px 16px;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.document-item {
  text-align: center;
}
.document-label {
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}
</style>
