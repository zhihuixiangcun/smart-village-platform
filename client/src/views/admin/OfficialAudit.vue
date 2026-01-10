<template>
  <div class="audit-management-container">
    <el-page-header title="村干部审核管理" class="page-header" />

    <div class="content-wrapper">
      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
                <el-icon :size="30"><Document /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.pending }}</div>
                <div class="stat-label">待审核</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
                <el-icon :size="30"><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.processing }}</div>
                <div class="stat-label">审核中</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe)">
                <el-icon :size="30"><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.approved }}</div>
                <div class="stat-label">已通过</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a, #fee140)">
                <el-icon :size="30"><CircleClose /></el-icon>
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
      <el-card class="filter-card">
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
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 申请列表 -->
      <el-card class="table-card">
        <template #header>
          <div class="table-header">
            <span>申请列表</span>
            <el-button type="primary" size="small" :icon="Download" @click="handleExport">
              导出数据
            </el-button>
          </div>
        </template>

        <el-table :data="tableData" v-loading="loading" stripe style="width: 100%">
          <el-table-column type="index" label="序号" width="60" />

          <el-table-column prop="name" label="申请人" width="100" />

          <el-table-column prop="phone" label="手机号" width="120" />

          <el-table-column prop="idCard" label="身份证号" width="180">
            <template #default="{ row }">
              {{ maskIdCard(row.idCard) }}
            </template>
          </el-table-column>

          <el-table-column prop="villageName" label="所属村庄" width="120" />

          <el-table-column prop="position" label="申请职务" width="100" />

          <el-table-column prop="department" label="所属部门" width="120" />

          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'pending'" type="warning">待审核</el-tag>
              <el-tag v-else-if="row.status === 'processing'" type="primary">审核中</el-tag>
              <el-tag v-else-if="row.status === 'approved'" type="success">已通过</el-tag>
              <el-tag v-else-if="row.status === 'rejected'" type="danger">已拒绝</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="createdAt" label="申请时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleView(row)">
                查看详情
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                link
                type="success"
                size="small"
                @click="handleAudit(row, 'approve')"
              >
                通过
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                link
                type="danger"
                size="small"
                @click="handleAudit(row, 'reject')"
              >
                拒绝
              </el-button>
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
    >
      <div v-if="currentApplication">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请人">{{ currentApplication.name }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentApplication.phone }}</el-descriptions-item>
          <el-descriptions-item label="身份证号">{{
            maskIdCard(currentApplication.idCard)
          }}</el-descriptions-item>
          <el-descriptions-item label="所属村庄">{{
            currentApplication.villageName
          }}</el-descriptions-item>
          <el-descriptions-item label="申请职务">{{
            currentApplication.position
          }}</el-descriptions-item>
          <el-descriptions-item label="所属部门">{{
            currentApplication.department
          }}</el-descriptions-item>
          <el-descriptions-item label="申请时间" :span="2">{{
            formatDate(currentApplication.createdAt)
          }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>申请理由</el-divider>
        <div class="reason-content">{{ currentApplication.reason }}</div>

        <el-divider v-if="currentApplication.experience">工作经验</el-divider>
        <div v-if="currentApplication.experience" class="experience-content">
          {{ currentApplication.experience }}
        </div>

        <el-divider>个人特长</el-divider>
        <div class="skills-content">
          <el-tag
            v-for="skill in currentApplication.skills"
            :key="skill"
            type="info"
            style="margin: 0 5px 5px 0"
          >
            {{ skill }}
          </el-tag>
        </div>

        <el-divider>审核意见</el-divider>
        <el-form :model="auditForm" label-position="top">
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
    <el-dialog v-model="showDetailDialog" title="申请详情" width="800px">
      <div v-if="currentApplication" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请人">{{ currentApplication.name }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentApplication.phone }}</el-descriptions-item>
          <el-descriptions-item label="身份证号">{{
            currentApplication.idCard
          }}</el-descriptions-item>
          <el-descriptions-item label="所属村庄">{{
            currentApplication.villageName
          }}</el-descriptions-item>
          <el-descriptions-item label="申请职务">{{
            currentApplication.position
          }}</el-descriptions-item>
          <el-descriptions-item label="所属部门">{{
            currentApplication.department
          }}</el-descriptions-item>
          <el-descriptions-item label="家庭住址" :span="2">{{
            currentApplication.address
          }}</el-descriptions-item>
          <el-descriptions-item label="申请时间" :span="2">{{
            formatDate(currentApplication.createdAt)
          }}</el-descriptions-item>
          <el-descriptions-item label="审核状态" :span="2">
            <el-tag v-if="currentApplication.status === 'pending'" type="warning">待审核</el-tag>
            <el-tag v-else-if="currentApplication.status === 'processing'" type="primary"
              >审核中</el-tag
            >
            <el-tag v-else-if="currentApplication.status === 'approved'" type="success"
              >已通过</el-tag
            >
            <el-tag v-else-if="currentApplication.status === 'rejected'" type="danger"
              >已拒绝</el-tag
            >
          </el-descriptions-item>
          <el-descriptions-item v-if="currentApplication.auditComment" label="审核意见" :span="2">
            {{ currentApplication.auditComment }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>申请理由</el-divider>
        <div class="text-content">{{ currentApplication.reason }}</div>

        <el-divider v-if="currentApplication.experience">工作经验</el-divider>
        <div v-if="currentApplication.experience" class="text-content">
          {{ currentApplication.experience }}
        </div>

        <el-divider>个人特长</el-divider>
        <div class="tags-content">
          <el-tag
            v-for="skill in currentApplication.skills"
            :key="skill"
            type="info"
            style="margin: 0 5px 5px 0"
          >
            {{ skill }}
          </el-tag>
        </div>

        <el-divider>证件照片</el-divider>
        <div class="images-content">
          <el-image
            v-for="(img, index) in currentApplication.documents"
            :key="index"
            :src="img"
            :preview-src-list="currentApplication.documents"
            fit="cover"
            style="width: 150px; height: 150px; margin: 0 10px 10px 0"
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
  background: #f5f7fa;
}

.page-header {
  background: white;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 20px 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #999;
}

.filter-card,
.table-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.filter-form {
  margin-top: 10px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.reason-content,
.experience-content,
.text-content {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
  line-height: 1.8;
  color: #666;
}

.skills-content,
.tags-content {
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.images-content {
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}
</style>
