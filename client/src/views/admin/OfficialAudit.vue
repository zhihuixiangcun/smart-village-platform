<template>
  <div class="audit-management-container">
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h2 class="page-title">村干部审核管理</h2>
          <p class="page-subtitle">审核和管理村干部申请</p>
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <el-card class="stat-card pending" shadow="never">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon size="28"><Document /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.pending }}</div>
                <div class="stat-label">待审核</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <el-card class="stat-card processing" shadow="never">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon size="28"><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.processing }}</div>
                <div class="stat-label">审核中</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <el-card class="stat-card approved" shadow="never">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon size="28"><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.approved }}</div>
                <div class="stat-label">已通过</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <el-card class="stat-card rejected" shadow="never">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon size="28"><CircleClose /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.rejected }}</div>
                <div class="stat-label">已拒绝</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 搜索和筛选 -->
      <el-card class="filter-card" shadow="never">
        <el-form :inline="true" :model="filterForm" class="filter-form">
          <el-form-item label="状态">
            <el-select
              v-model="filterForm.status"
              placeholder="全部状态"
              clearable
              style="width: 150px"
            >
              <el-option label="待审核" value="pending" />
              <el-option label="审核中" value="processing" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
          </el-form-item>

          <el-form-item label="申请职务">
            <el-select
              v-model="filterForm.position"
              placeholder="全部职务"
              clearable
              style="width: 150px"
            >
              <el-option label="村书记" value="村书记" />
              <el-option label="村主任" value="村主任" />
              <el-option label="副主任" value="副主任" />
              <el-option label="会计" value="会计" />
              <el-option label="村委成员" value="村委成员" />
              <el-option label="工作人员" value="工作人员" />
            </el-select>
          </el-form-item>

          <el-form-item label="申请人">
            <el-input
              v-model="filterForm.keyword"
              placeholder="姓名/手机号"
              clearable
              style="width: 200px"
            />
          </el-form-item>

          <el-form-item label="申请时间">
            <el-date-picker
              v-model="filterForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 240px"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">
              搜索
            </el-button>
            <el-button :icon="Refresh" @click="handleReset"> 重置 </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 申请列表 -->
      <el-card class="table-card" shadow="never">
        <template #header>
          <div class="table-header">
            <span class="table-title">申请列表</span>
            <div class="table-actions">
              <span class="table-count">共 {{ pagination.total }} 条</span>
              <el-button
                type="primary"
                size="small"
                :icon="Download"
                @click="handleExport"
              >
                导出数据
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          :data="tableData"
          v-loading="loading"
          stripe
          class="data-table"
        >
          <el-table-column type="index" label="序号" width="60" />

          <el-table-column prop="name" label="申请人" width="120">
            <template #default="{ row }">
              <div class="user-name">{{ row.name }}</div>
            </template>
          </el-table-column>

          <el-table-column prop="phone" label="手机号" width="130" />

          <el-table-column prop="idCard" label="身份证号" width="180">
            <template #default="{ row }">
              <span class="id-card-text">{{ maskIdCard(row.idCard) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="villageName" label="所属村庄" width="120" />

          <el-table-column prop="position" label="申请职务" width="100" />

          <el-table-column prop="department" label="所属部门" width="120" />

          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" class="status-tag">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="createdAt" label="申请时间" width="180">
            <template #default="{ row }">
              <div class="time-cell">{{ formatDate(row.createdAt) }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button
                  link
                  type="primary"
                  size="small"
                  :icon="View"
                  @click="handleView(row)"
                >
                  查看详情
                </el-button>
                <el-button
                  v-if="row.status === 'pending'"
                  link
                  type="success"
                  size="small"
                  :icon="CircleCheck"
                  @click="handleAudit(row, 'approve')"
                >
                  通过
                </el-button>
                <el-button
                  v-if="row.status === 'pending'"
                  link
                  type="danger"
                  size="small"
                  :icon="CircleClose"
                  @click="handleAudit(row, 'reject')"
                >
                  拒绝
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
          class="pagination"
        />
      </el-card>
    </div>

    <!-- 审核对话框 -->
    <el-dialog
      v-model="showAuditDialog"
      :title="auditType === 'approve' ? '审核通过' : '审核拒绝'"
      width="600px"
      :close-on-click-modal="false"
      class="audit-dialog"
    >
      <div v-if="currentApplication">
        <el-descriptions :column="2" border class="audit-descriptions">
          <el-descriptions-item label="申请人">
            {{ currentApplication.name }}
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            {{ currentApplication.phone }}
          </el-descriptions-item>
          <el-descriptions-item label="身份证号">
            {{ maskIdCard(currentApplication.idCard) }}
          </el-descriptions-item>
          <el-descriptions-item label="所属村庄">
            {{ currentApplication.villageName }}
          </el-descriptions-item>
          <el-descriptions-item label="申请职务">
            {{ currentApplication.position }}
          </el-descriptions-item>
          <el-descriptions-item label="所属部门">
            {{ currentApplication.department }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间" :span="2">
            {{ formatDate(currentApplication.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">
          <span class="divider-title">申请理由</span>
        </el-divider>
        <div class="reason-content">{{ currentApplication.reason }}</div>

        <el-divider v-if="currentApplication.experience" content-position="left">
          <span class="divider-title">工作经验</span>
        </el-divider>
        <div v-if="currentApplication.experience" class="experience-content">
          {{ currentApplication.experience }}
        </div>

        <el-divider content-position="left">
          <span class="divider-title">个人特长</span>
        </el-divider>
        <div class="skills-content">
          <el-tag
            v-for="skill in currentApplication.skills"
            :key="skill"
            type="info"
            class="skill-tag"
          >
            {{ skill }}
          </el-tag>
        </div>

        <el-divider content-position="left">
          <span class="divider-title">审核意见</span>
        </el-divider>
        <el-form :model="auditForm" label-position="top" class="audit-form">
          <el-form-item label="审核意见" required>
            <el-input
              v-model="auditForm.comment"
              type="textarea"
              :rows="4"
              :placeholder="
                auditType === 'approve' ? '请填写审核通过的理由' : '请填写拒绝理由（必填）'
              "
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-form-item v-if="auditType === 'approve'" label="分配权限">
            <el-checkbox-group v-model="auditForm.permissions">
              <el-checkbox label="document_management">资料收集</el-checkbox>
              <el-checkbox label="duty_management">值班管理</el-checkbox>
              <el-checkbox label="user_management">用户管理</el-checkbox>
              <el-checkbox label="village_overview">村务公开</el-checkbox>
              <el-checkbox label="statistics_analysis">数据分析</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="showAuditDialog = false">取消</el-button>
        <el-button type="primary" :loading="auditing" @click="confirmAudit">
          确认{{ auditType === 'approve' ? '通过' : '拒绝' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="申请详情"
      width="800px"
      class="detail-dialog"
    >
      <div v-if="currentApplication" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请人">
            {{ currentApplication.name }}
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            {{ currentApplication.phone }}
          </el-descriptions-item>
          <el-descriptions-item label="身份证号">
            {{ currentApplication.idCard }}
          </el-descriptions-item>
          <el-descriptions-item label="所属村庄">
            {{ currentApplication.villageName }}
          </el-descriptions-item>
          <el-descriptions-item label="申请职务">
            {{ currentApplication.position }}
          </el-descriptions-item>
          <el-descriptions-item label="所属部门">
            {{ currentApplication.department }}
          </el-descriptions-item>
          <el-descriptions-item label="家庭住址" :span="2">
            {{ currentApplication.address }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间" :span="2">
            {{ formatDate(currentApplication.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="审核状态" :span="2">
            <el-tag v-if="currentApplication.status === 'pending'" type="warning">
              待审核
            </el-tag>
            <el-tag v-else-if="currentApplication.status === 'processing'" type="primary">
              审核中
            </el-tag>
            <el-tag v-else-if="currentApplication.status === 'approved'" type="success">
              已通过
            </el-tag>
            <el-tag v-else-if="currentApplication.status === 'rejected'" type="danger">
              已拒绝
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentApplication.auditComment" label="审核意见" :span="2">
            {{ currentApplication.auditComment }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">
          <span class="divider-title">申请理由</span>
        </el-divider>
        <div class="text-content">{{ currentApplication.reason }}</div>

        <el-divider v-if="currentApplication.experience" content-position="left">
          <span class="divider-title">工作经验</span>
        </el-divider>
        <div v-if="currentApplication.experience" class="text-content">
          {{ currentApplication.experience }}
        </div>

        <el-divider content-position="left">
          <span class="divider-title">个人特长</span>
        </el-divider>
        <div class="tags-content">
          <el-tag
            v-for="skill in currentApplication.skills"
            :key="skill"
            type="info"
            class="skill-tag"
          >
            {{ skill }}
          </el-tag>
        </div>

        <el-divider content-position="left">
          <span class="divider-title">证件照片</span>
        </el-divider>
        <div class="images-content">
          <el-image
            v-for="(img, index) in currentApplication.documents"
            :key="index"
            :src="img"
            :preview-src-list="currentApplication.documents"
            fit="cover"
            class="document-image"
          />
        </div>
      </div>

      <template #footer>
        <el-button type="primary" @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  Document,
  Clock,
  CircleCheck,
  CircleClose,
  Search,
  Refresh,
  Download,
  View,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import villageUserApi from '@/api/villageUser';

// 响应式数据
const loading = ref(false);
const auditing = ref(false);
const showAuditDialog = ref(false);
const showDetailDialog = ref(false);
const auditType = ref('approve'); // approve or reject
const currentApplication = ref(null);

// 统计数据
const stats = ref({
  pending: 0,
  processing: 0,
  approved: 0,
  rejected: 0,
});

// 筛选表单
const filterForm = reactive({
  status: '',
  position: '',
  keyword: '',
  dateRange: [],
});

// 审核表单
const auditForm = reactive({
  comment: '',
  permissions: [],
});

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

// 表格数据
const tableData = ref([]);

// 方法
const loadStats = async () => {
  try {
    const response = await villageUserApi.getOfficialApplicationStats();
    stats.value = response.data || { pending: 0, processing: 0, approved: 0, rejected: 0 };
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

const loadApplications = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filterForm,
    };

    const response = await villageUserApi.getOfficialApplications(params);
    tableData.value = response.data.list || [];
    pagination.total = response.data.total || 0;
  } catch (error) {
    console.error('加载申请列表失败:', error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const maskIdCard = idCard => {
  if (!idCard) return '';
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};

const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

const handleSearch = () => {
  pagination.page = 1;
  loadApplications();
};

const handleReset = () => {
  Object.assign(filterForm, {
    status: '',
    position: '',
    keyword: '',
    dateRange: [],
  });
  pagination.page = 1;
  loadApplications();
};

const handleSizeChange = val => {
  pagination.pageSize = val;
  pagination.page = 1;
  loadApplications();
};

const handlePageChange = val => {
  pagination.page = val;
  loadApplications();
};

const handleView = row => {
  currentApplication.value = row;
  showDetailDialog.value = true;
};

const handleAudit = (row, type) => {
  currentApplication.value = row;
  auditType.value = type;
  auditForm.comment = '';
  auditForm.permissions = row.permissions || [];
  showAuditDialog.value = true;
};

const confirmAudit = async () => {
  if (auditType.value === 'reject' && !auditForm.comment) {
    ElMessage.warning('请填写拒绝理由');
    return;
  }

  if (auditType.value === 'approve' && auditForm.permissions.length === 0) {
    ElMessage.warning('请至少选择一项权限');
    return;
  }

  auditing.value = true;
  try {
    await villageUserApi.auditOfficialApplication(currentApplication.value._id, {
      action: auditType.value,
      comment: auditForm.comment,
      permissions: auditForm.permissions,
    });

    ElMessage.success(auditType.value === 'approve' ? '审核通过' : '已拒绝申请');
    showAuditDialog.value = false;

    // 刷新数据
    await Promise.all([loadStats(), loadApplications()]);
  } catch (error) {
    console.error('审核失败:', error);
    ElMessage.error(error.response?.data?.message || '审核失败');
  } finally {
    auditing.value = false;
  }
};

const handleExport = async () => {
  try {
    ElMessage.success('正在导出数据，请稍候...');
    // 实现导出逻辑
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error('导出失败');
  }
};

// 生命周期
onMounted(() => {
  loadStats();
  loadApplications();
});
</script>

<style scoped>
.audit-management-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
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
      margin: 0 0 8px 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.3;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      letter-spacing: 0.5px;
    }

    .page-subtitle {
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
      font-size: 15px;
      line-height: 1.5;
      font-weight: 400;
    }
  }
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 16px;
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
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  }

  &.processing::before {
    background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
  }

  &.approved::before {
    background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);
  }

  &.rejected::before {
    background: linear-gradient(90deg, #eb3349 0%, #f45c43 100%);
  }

  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  }

  .stat-content {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 8px;
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  &.processing .stat-icon {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  &.approved .stat-icon {
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  }

  &.rejected .stat-icon {
    background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
  }

  .stat-info {
    flex: 1;
  }

  .stat-value {
    font-size: 36px;
    font-weight: 800;
    color: var(--el-text-color-primary);
    line-height: 1;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .stat-label {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    font-weight: 500;
    letter-spacing: 0.5px;
  }
}

.filter-card,
.table-card {
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  background: #ffffff;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  }
}

.filter-form {
  margin-top: 10px;

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 1px var(--el-color-primary) inset;
    }
  }
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .table-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .table-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .table-count {
    font-size: 14px;
    color: var(--el-text-color-secondary);
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
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }

    &:hover {
      background-color: rgba(102, 126, 234, 0.05);
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
      background: linear-gradient(90deg, transparent 0%, #667eea 50%, transparent 100%);
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

.id-card-text {
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-family: monospace;
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
  gap: 12px;
  align-items: center;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.audit-dialog,
.detail-dialog {
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
  }

  :deep(.el-dialog__header) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
    }
  }

  .audit-descriptions {
    margin-bottom: 24px;
    border-radius: 12px;
    overflow: hidden;

    :deep(.el-descriptions__header) {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    :deep(.el-descriptions__label) {
      font-weight: 600;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: var(--el-text-color-primary);
    }

    :deep(.el-descriptions__content) {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }

  .divider-title {
    font-weight: 700;
    color: var(--el-text-color-primary);
    font-size: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      border-radius: 2px;
    }
  }

  .reason-content,
  .experience-content,
  .text-content {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 20px;
    border-radius: 12px;
    line-height: 1.8;
    color: var(--el-text-color-regular);
    border-left: 4px solid #667eea;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    position: relative;

    &::before {
      content: '"';
      position: absolute;
      top: -10px;
      left: 16px;
      font-size: 48px;
      color: rgba(102, 126, 234, 0.1);
      font-family: Georgia, serif;
      line-height: 1;
    }
  }

  .skills-content,
  .tags-content {
    padding: 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 12px;
    border: 1px dashed var(--el-border-color);
  }

  .skill-tag {
    margin: 0 8px 8px 0;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    border: none;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  }

  .images-content {
    padding: 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 12px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
  }

  .document-image {
    width: 100%;
    height: 180px;
    border-radius: 12px;
    border: 2px solid var(--el-border-color-light);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    &:hover {
      border-color: #667eea;
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
    }
  }

  .audit-form {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 24px;
    border-radius: 12px;
    border: 1px dashed var(--el-border-color);

    :deep(.el-form-item__label) {
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    :deep(.el-checkbox-group) {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    :deep(.el-checkbox) {
      margin-right: 0;
      padding: 12px 20px;
      border: 2px solid var(--el-border-color);
      border-radius: 8px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: #ffffff;
      font-weight: 500;

      &:hover {
        border-color: #667eea;
        color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      }

      &.is-checked {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-color: #667eea;
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .audit-management-container {
    padding: 16px;

    .page-header {
      padding: 16px;
    }

    .stats-row {
      .el-col {
        margin-bottom: 12px;
      }
    }

    .filter-card {
      .filter-form {
        .el-form-item {
          display: block;
          width: 100%;

          :deep(.el-input),
          :deep(.el-select) {
            width: 100%;
          }
        }
      }
    }

    .table-card {
      .table-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .action-buttons {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    .pagination {
      justify-content: center;
    }
  }
}
</style>
