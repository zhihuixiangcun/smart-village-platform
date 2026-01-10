<template>
  <div class="transaction-list">
    <div class="page-header">
      <h2>财务管理</h2>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新增交易
      </el-button>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" @submit.prevent="handleSearch">
        <el-form-item label="搜索">
          <el-input
            v-model="filters.search"
            placeholder="输入描述或编号搜索"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="交易类型">
          <el-select v-model="filters.type" placeholder="选择类型" clearable>
            <el-option label="收入" value="income" />
            <el-option label="支出" value="expense" />
            <el-option label="转账" value="transfer" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="选择状态" clearable>
            <el-option label="待审批" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 财务统计 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card class="stat-card income">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ formatAmount(stats.totalIncome) }}</div>
              <div class="stat-label">总收入</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card expense">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><Minus /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ formatAmount(stats.totalExpense) }}</div>
              <div class="stat-label">总支出</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card balance">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><Wallet /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ formatAmount(stats.balance) }}</div>
              <div class="stat-label">当前余额</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card pending">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingCount }}</div>
              <div class="stat-label">待审批</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 交易列表 -->
    <el-card class="table-card">
      <el-table
        :data="transactionList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="交易编号" width="150" show-overflow-tooltip />
        <el-table-column prop="type" label="交易类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">
            <span :class="getAmountClass(row.type)">
              {{ formatAmount(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag type="info">{{ getCategoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建人" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" type="primary" link @click="handleView(row)">
                查看
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                size="small"
                type="success"
                link
                @click="handleApprove(row)"
              >
                审批
              </el-button>
              <el-button size="small" type="warning" link @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button size="small" type="danger" link @click="handleDelete(row)">
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 批量操作 -->
    <div v-if="selectedTransactions.length > 0" class="batch-operations">
      <el-card>
        <div class="batch-info">
          已选择 <span class="count">{{ selectedTransactions.length }}</span> 笔交易
        </div>
        <div class="batch-actions">
          <el-button type="success" @click="handleBatchApprove">批量审批</el-button>
          <el-button type="warning" @click="handleBatchExport">导出数据</el-button>
          <el-button type="danger" @click="handleBatchDelete">批量删除</el-button>
        </div>
      </el-card>
    </div>

    <!-- 交易详情对话框 -->
    <el-dialog
      v-model="detailDialog.visible"
      title="交易详情"
      width="800px"
      :before-close="handleCloseDetailDialog"
    >
      <div v-if="detailDialog.data" class="transaction-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="交易编号">{{ detailDialog.data.id }}</el-descriptions-item>
          <el-descriptions-item label="交易类型">
            <el-tag :type="getTypeTagType(detailDialog.data.type)">
              {{ getTypeLabel(detailDialog.data.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金额">
            <span :class="getAmountClass(detailDialog.data.type)">
              {{ formatAmount(detailDialog.data.amount) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="分类">
            <el-tag type="info">{{ getCategoryLabel(detailDialog.data.category) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(detailDialog.data.status)">
              {{ getStatusLabel(detailDialog.data.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建人">{{
            detailDialog.data.createdBy
          }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(detailDialog.data.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(detailDialog.data.updatedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{
            detailDialog.data.description
          }}</el-descriptions-item>
          <el-descriptions-item v-if="detailDialog.data.notes" label="备注" :span="2">
            {{ detailDialog.data.notes }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 发票图片 -->
        <div v-if="detailDialog.data.invoiceImage" class="invoice-image">
          <h4>发票图片</h4>
          <el-image
            :src="detailDialog.data.invoiceImage"
            :preview-src-list="[detailDialog.data.invoiceImage]"
            fit="contain"
            style="max-width: 100%; max-height: 300px"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 创建/编辑交易对话框 -->
    <el-dialog
      v-model="formDialog.visible"
      :title="formDialog.isEdit ? '编辑交易' : '新增交易'"
      width="600px"
      :before-close="handleCloseFormDialog"
    >
      <el-form
        ref="transactionFormRef"
        :model="transactionForm"
        :rules="transactionFormRules"
        label-width="100px"
      >
        <el-form-item label="交易类型" prop="type">
          <el-select
            v-model="transactionForm.type"
            placeholder="请选择交易类型"
            style="width: 100%"
          >
            <el-option label="收入" value="income" />
            <el-option label="支出" value="expense" />
            <el-option label="转账" value="transfer" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number
            v-model="transactionForm.amount"
            :precision="2"
            :step="0.01"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select
            v-model="transactionForm.category"
            placeholder="请选择分类"
            style="width: 100%"
          >
            <el-option label="行政支出" value="administrative" />
            <el-option label="基础设施" value="infrastructure" />
            <el-option label="社会福利" value="social_welfare" />
            <el-option label="农业补贴" value="agricultural_subsidy" />
            <el-option label="其他收入" value="other_income" />
            <el-option label="其他支出" value="other_expense" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="transactionForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入交易描述"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="transactionForm.notes"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息（可选）"
          />
        </el-form-item>
        <el-form-item label="发票图片">
          <el-upload
            class="invoice-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="handleInvoiceUpload"
          >
            <img
              v-if="transactionForm.invoiceImage"
              :src="transactionForm.invoiceImage"
              class="invoice-image-preview"
            />
            <el-icon v-else class="invoice-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCloseFormDialog">取消</el-button>
          <el-button type="primary" @click="handleSubmitTransaction" :loading="submitting">
            {{ formDialog.isEdit ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 审批对话框 -->
    <el-dialog v-model="approvalDialog.visible" title="交易审批" width="500px">
      <el-form :model="approvalForm" label-width="100px">
        <el-form-item label="审批结果" required>
          <el-radio-group v-model="approvalForm.action">
            <el-radio label="approve">通过</el-radio>
            <el-radio label="reject">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审批意见">
          <el-input
            v-model="approvalForm.comment"
            type="textarea"
            :rows="3"
            placeholder="请输入审批意见"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="approvalDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitApproval" :loading="approving">
            确认审批
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, TrendCharts, Minus, Wallet, Clock } from '@element-plus/icons-vue';
import apiService from '@/services/apiService';

// 响应式数据
const loading = ref(false);
const transactionList = ref([]);
const selectedTransactions = ref([]);
const submitting = ref(false);
const approving = ref(false);

// 筛选条件
const filters = reactive({
  search: '',
  type: '',
  status: '',
});

const dateRange = ref([]);

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

// 财务统计
const stats = reactive({
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  pendingCount: 0,
});

// 详情对话框
const detailDialog = reactive({
  visible: false,
  data: null,
});

// 表单对话框
const formDialog = reactive({
  visible: false,
  isEdit: false,
});

// 审批对话框
const approvalDialog = reactive({
  visible: false,
  data: null,
});

// 交易表单
const transactionForm = reactive({
  id: '',
  type: '',
  amount: 0,
  category: '',
  description: '',
  notes: '',
  invoiceImage: '',
});

// 审批表单
const approvalForm = reactive({
  action: 'approve',
  comment: '',
});

// 表单验证规则
const transactionFormRules = {
  type: [{ required: true, message: '请选择交易类型', trigger: 'change' }],
  amount: [
    { required: true, message: '请输入交易金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择交易分类', trigger: 'change' }],
  description: [{ required: true, message: '请输入交易描述', trigger: 'blur' }],
};

// 表单引用
const transactionFormRef = ref(null);

// 方法
const loadTransactionList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters,
    };

    // 添加日期范围
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }

    // 清理空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });

    const response = await apiService.getTransactionList(params);

    if (response.success) {
      transactionList.value = response.data.transactions || [];
      pagination.total = response.pagination?.total || 0;
    } else {
      ElMessage.error(response.error || '获取交易列表失败');
    }
  } catch (error) {
    ElMessage.error('获取交易列表失败');
    console.error('加载交易列表错误:', error);
  } finally {
    loading.value = false;
  }
};

const loadFinancialStats = async () => {
  try {
    const response = await apiService.getFinancialStats();
    if (response.success) {
      Object.assign(stats, response.data);
    }
  } catch (error) {
    console.error('获取财务统计失败:', error);
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadTransactionList();
};

const handleReset = () => {
  filters.search = '';
  filters.type = '';
  filters.status = '';
  dateRange.value = [];
  pagination.page = 1;
  loadTransactionList();
};

const handleDateRangeChange = dates => {
  if (dates && dates.length === 2) {
    filters.startDate = dates[0];
    filters.endDate = dates[1];
  } else {
    delete filters.startDate;
    delete filters.endDate;
  }
  handleSearch();
};

const handleSizeChange = size => {
  pagination.limit = size;
  loadTransactionList();
};

const handleCurrentChange = page => {
  pagination.page = page;
  loadTransactionList();
};

const handleSelectionChange = selection => {
  selectedTransactions.value = selection;
};

const handleView = row => {
  detailDialog.data = row;
  detailDialog.visible = true;
};

const handleEdit = row => {
  formDialog.isEdit = true;
  formDialog.visible = true;

  // 填充表单数据
  Object.keys(transactionForm).forEach(key => {
    transactionForm[key] = row[key] || '';
  });
};

const handleDelete = async row => {
  try {
    await ElMessageBox.confirm(`确定要删除交易 "${row.description}" 吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const response = await apiService.deleteTransaction(row.id);

    if (response.success) {
      ElMessage.success('交易删除成功');
      loadTransactionList();
      loadFinancialStats();
    } else {
      ElMessage.error(response.error || '删除交易失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除交易失败');
      console.error('删除交易错误:', error);
    }
  }
};

const handleApprove = row => {
  approvalDialog.data = row;
  approvalDialog.visible = true;
  approvalForm.action = 'approve';
  approvalForm.comment = '';
};

const showCreateDialog = () => {
  formDialog.isEdit = false;
  formDialog.visible = true;
  resetTransactionForm();
};

const resetTransactionForm = () => {
  Object.keys(transactionForm).forEach(key => {
    transactionForm[key] = key === 'amount' ? 0 : '';
  });

  if (transactionFormRef.value) {
    transactionFormRef.value.resetFields();
  }
};

const handleInvoiceUpload = file => {
  // 这里应该实现图片上传逻辑
  const reader = new FileReader();
  reader.onload = e => {
    transactionForm.invoiceImage = e.target.result;
  };
  reader.readAsDataURL(file);
  return false; // 阻止默认上传
};

const handleSubmitTransaction = async () => {
  if (!transactionFormRef.value) return;

  try {
    await transactionFormRef.value.validate();

    submitting.value = true;

    let response;
    if (formDialog.isEdit) {
      response = await apiService.updateTransaction(transactionForm.id, transactionForm);
    } else {
      response = await apiService.createTransaction(transactionForm);
    }

    if (response.success) {
      ElMessage.success(formDialog.isEdit ? '交易更新成功' : '交易创建成功');
      handleCloseFormDialog();
      loadTransactionList();
      loadFinancialStats();
    } else {
      ElMessage.error(response.error || '操作失败');
    }
  } catch (error) {
    if (error !== 'validation failed') {
      ElMessage.error('操作失败');
      console.error('提交交易表单错误:', error);
    }
  } finally {
    submitting.value = false;
  }
};

const handleSubmitApproval = async () => {
  if (!approvalDialog.data) return;

  try {
    approving.value = true;

    const approvalData = {
      action: approvalForm.action,
      comment: approvalForm.comment,
    };

    const response = await apiService.approveTransaction(approvalDialog.data.id, approvalData);

    if (response.success) {
      ElMessage.success('交易审批成功');
      approvalDialog.visible = false;
      loadTransactionList();
      loadFinancialStats();
    } else {
      ElMessage.error(response.error || '审批失败');
    }
  } catch (error) {
    ElMessage.error('审批失败');
    console.error('审批交易错误:', error);
  } finally {
    approving.value = false;
  }
};

const handleCloseFormDialog = () => {
  formDialog.visible = false;
  resetTransactionForm();
};

const handleCloseDetailDialog = () => {
  detailDialog.visible = false;
  detailDialog.data = null;
};

const handleBatchApprove = async () => {
  const pendingTransactions = selectedTransactions.value.filter(t => t.status === 'pending');
  if (pendingTransactions.length === 0) {
    ElMessage.warning('没有待审批的交易');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要批量审批选中的 ${pendingTransactions.length} 笔交易吗？`,
      '批量审批',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    // 实现批量审批逻辑
    ElMessage.info('批量审批功能开发中...');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量审批失败');
    }
  }
};

const handleBatchExport = () => {
  // 实现批量导出逻辑
  ElMessage.info('批量导出功能开发中...');
};

const handleBatchDelete = async () => {
  if (selectedTransactions.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedTransactions.value.length} 笔交易吗？`,
      '批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    // 实现批量删除逻辑
    ElMessage.info('批量删除功能开发中...');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败');
    }
  }
};

// 工具方法
const formatAmount = amount => {
  if (!amount) return '0.00';
  return parseFloat(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDateTime = dateTime => {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleString('zh-CN');
};

const getTypeLabel = type => {
  const typeMap = {
    income: '收入',
    expense: '支出',
    transfer: '转账',
  };
  return typeMap[type] || type;
};

const getTypeTagType = type => {
  const typeMap = {
    income: 'success',
    expense: 'danger',
    transfer: 'warning',
  };
  return typeMap[type] || 'info';
};

const getStatusLabel = status => {
  const statusMap = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝',
    completed: '已完成',
  };
  return statusMap[status] || status;
};

const getStatusTagType = status => {
  const typeMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    completed: 'info',
  };
  return typeMap[status] || 'info';
};

const getCategoryLabel = category => {
  const categoryMap = {
    administrative: '行政支出',
    infrastructure: '基础设施',
    social_welfare: '社会福利',
    agricultural_subsidy: '农业补贴',
    other_income: '其他收入',
    other_expense: '其他支出',
  };
  return categoryMap[category] || category;
};

const getAmountClass = type => {
  return {
    'amount-income': type === 'income',
    'amount-expense': type === 'expense',
    'amount-transfer': type === 'transfer',
  };
};

// 生命周期
onMounted(() => {
  loadTransactionList();
  loadFinancialStats();
});
</script>

<style scoped>
.transaction-list {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.filter-card {
  margin-bottom: 20px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  margin-right: 15px;
}

.stat-card.income .stat-icon {
  color: #67c23a;
}

.stat-card.expense .stat-icon {
  color: #f56c6c;
}

.stat-card.balance .stat-icon {
  color: #409eff;
}

.stat-card.pending .stat-icon {
  color: #e6a23c;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.table-card {
  min-height: 400px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.batch-operations {
  margin-top: 20px;
}

.batch-info {
  display: flex;
  align-items: center;
}

.batch-info .count {
  color: #409eff;
  font-weight: bold;
  margin: 0 5px;
}

.batch-actions {
  margin-left: auto;
}

.dialog-footer {
  text-align: right;
}

.transaction-detail {
  padding: 20px 0;
}

.invoice-image {
  margin-top: 20px;
}

.invoice-uploader .invoice-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.invoice-uploader .invoice-upload:hover {
  border-color: #409eff;
}

.invoice-image-preview {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
}

.invoice-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
  line-height: 100px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.3s;
}

.invoice-uploader-icon:hover {
  border-color: #409eff;
}

.amount-income {
  color: #67c23a;
  font-weight: bold;
}

.amount-expense {
  color: #f56c6c;
  font-weight: bold;
}

.amount-transfer {
  color: #e6a23c;
  font-weight: bold;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #fafafa;
}
</style>
