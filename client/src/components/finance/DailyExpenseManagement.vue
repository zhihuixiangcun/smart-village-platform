<template>
  <div class="daily-expense-management">
    <!-- 快捷操作栏 -->
    <div class="quick-actions-bar">
      <el-card>
        <div class="actions-header">
          <h3>村委日常开支</h3>
          <div class="action-buttons">
            <el-button type="primary" @click="showCreateDialog = true" v-if="canCreateExpense">
              <el-icon><Plus /></el-icon>
              新增开支
            </el-button>
            <el-button type="success" @click="showRecurringDialog = true" v-if="canCreateExpense">
              <el-icon><Clock /></el-icon>
              定期开支
            </el-button>
            <el-button @click="showImportDialog = true" v-if="canCreateExpense">
              <el-icon><Upload /></el-icon>
              批量导入
            </el-button>
            <el-button @click="exportExpenses" v-if="canViewReports">
              <el-icon><Download /></el-icon>
              导出报表
            </el-button>
          </div>
        </div>

        <!-- 快速统计 -->
        <div class="quick-stats">
          <el-row :gutter="16">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon today">
                  <el-icon><Calendar /></el-icon>
                </div>
                <div class="stat-content">
                  <p class="stat-label">今日开支</p>
                  <p class="stat-value">¥{{ formatCurrency(dailyStats.today) }}</p>
                </div>
              </div>
            </el-col>

            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon month">
                  <el-icon><TrendCharts /></el-icon>
                </div>
                <div class="stat-content">
                  <p class="stat-label">本月开支</p>
                  <p class="stat-value">¥{{ formatCurrency(dailyStats.thisMonth) }}</p>
                </div>
              </div>
            </el-col>

            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon pending">
                  <el-icon><Clock /></el-icon>
                </div>
                <div class="stat-content">
                  <p class="stat-label">待审批</p>
                  <p class="stat-value">{{ dailyStats.pendingCount }}</p>
                  <p class="stat-sub">¥{{ formatCurrency(dailyStats.pendingAmount) }}</p>
                </div>
              </div>
            </el-col>

            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon overdue">
                  <el-icon><Warning /></el-icon>
                </div>
                <div class="stat-content">
                  <p class="stat-label">逾期提醒</p>
                  <p class="stat-value">{{ dailyStats.overdueCount }}</p>
                  <p class="stat-sub">定期开支</p>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <el-card>
        <el-form :model="filters" inline>
          <el-form-item label="开支分类">
            <el-select v-model="filters.category" placeholder="全部分类" clearable>
              <el-option label="办公用品" value="office_supplies" />
              <el-option label="水电费" value="utilities" />
              <el-option label="通讯费" value="communication" />
              <el-option label="交通费" value="transportation" />
              <el-option label="住宿费" value="accommodation" />
              <el-option label="餐费接待" value="meals_entertainment" />
              <el-option label="维修保养" value="maintenance" />
              <el-option label="培训费" value="training" />
              <el-option label="会议费" value="conference" />
              <el-option label="印刷费" value="printing" />
              <el-option label="邮寄费" value="postal" />
              <el-option label="清洁费" value="cleaning" />
              <el-option label="安保费" value="security" />
              <el-option label="保险费" value="insurance" />
              <el-option label="燃料费" value="fuel" />
              <el-option label="医疗费" value="medical" />
              <el-option label="应急开支" value="emergency" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>

          <el-form-item label="状态">
            <el-select v-model="filters.status" placeholder="全部状态" clearable>
              <el-option label="草稿" value="draft" />
              <el-option label="待审批" value="pending_approval" />
              <el-option label="已批准" value="approved" />
              <el-option label="已支付" value="paid" />
              <el-option label="已拒绝" value="rejected" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>

          <el-form-item label="紧急程度">
            <el-select v-model="filters.urgency" placeholder="全部" clearable>
              <el-option label="常规" value="routine" />
              <el-option label="紧急" value="urgent" />
              <el-option label="应急" value="emergency" />
            </el-select>
          </el-form-item>

          <el-form-item label="预算类型">
            <el-select v-model="filters.budgetType" placeholder="全部" clearable>
              <el-option label="预算内" value="budgeted" />
              <el-option label="预算外" value="unbudgeted" />
              <el-option label="应急" value="emergency" />
            </el-select>
          </el-form-item>

          <el-form-item label="时间范围">
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>

          <el-form-item label="金额范围">
            <el-col :span="11">
              <el-input-number
                v-model="filters.minAmount"
                placeholder="最小金额"
                :min="0"
                size="small"
              />
            </el-col>
            <el-col :span="2" class="text-center">
              <span>-</span>
            </el-col>
            <el-col :span="11">
              <el-input-number
                v-model="filters.maxAmount"
                placeholder="最大金额"
                :min="0"
                size="small"
              />
            </el-col>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="searchExpenses">搜索</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 开支列表 -->
    <div class="expense-list-section">
      <el-card>
        <template #header>
          <div class="list-header">
            <span>开支记录 (共 {{ pagination.total }} 条)</span>
            <div class="header-actions">
              <el-button-group>
                <el-button
                  :type="viewMode === 'table' ? 'primary' : ''"
                  @click="viewMode = 'table'"
                  size="small"
                >
                  <el-icon><List /></el-icon>
                  列表
                </el-button>
                <el-button
                  :type="viewMode === 'card' ? 'primary' : ''"
                  @click="viewMode = 'card'"
                  size="small"
                >
                  <el-icon><Grid /></el-icon>
                  卡片
                </el-button>
              </el-button-group>
            </div>
          </div>
        </template>

        <!-- 表格视图 -->
        <div v-if="viewMode === 'table'">
          <el-table :data="expenses" v-loading="loading" @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="55" />

            <el-table-column prop="vouchers.voucherNumber" label="凭证号" width="120" />

            <el-table-column prop="expenseTitle" label="开支项目" min-width="150" />

            <el-table-column prop="expenseCategory" label="分类" width="120">
              <template #default="{ row }">
                <el-tag :type="getCategoryColor(row.expenseCategory)" size="small">
                  {{ getCategoryName(row.expenseCategory) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="amount" label="金额" width="120">
              <template #default="{ row }">
                <span class="amount-text">¥{{ formatCurrency(row.amount) }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="urgency" label="紧急程度" width="100">
              <template #default="{ row }">
                <el-tag :type="getUrgencyColor(row.urgency)" size="small">
                  {{ getUrgencyName(row.urgency) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusColor(row.status)" size="small">
                  {{ getStatusName(row.status) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="handler.handlerName" label="经手人" width="100" />

            <el-table-column prop="expenseDate" label="开支日期" width="120">
              <template #default="{ row }">
                {{ formatDate(row.expenseDate) }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button-group>
                  <el-button size="small" @click="viewExpense(row)">查看</el-button>
                  <el-button
                    size="small"
                    type="primary"
                    @click="editExpense(row)"
                    v-if="canEditExpense(row)"
                  >
                    编辑
                  </el-button>
                  <el-dropdown @command="handleAction($event, row)">
                    <el-button size="small">
                      更多<el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item
                          command="approve"
                          v-if="row.status === 'pending_approval' && canApprove"
                        >
                          审批
                        </el-dropdown-item>
                        <el-dropdown-item command="pay" v-if="row.status === 'approved' && canPay">
                          标记支付
                        </el-dropdown-item>
                        <el-dropdown-item command="duplicate"> 复制开支 </el-dropdown-item>
                        <el-dropdown-item
                          command="delete"
                          v-if="row.status === 'draft' && canDelete(row)"
                          divided
                        >
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 卡片视图 -->
        <div v-else class="card-view">
          <el-row :gutter="16">
            <el-col :span="8" v-for="expense in expenses" :key="expense._id">
              <daily-expense-card
                :expense="expense"
                @view="viewExpense"
                @edit="editExpense"
                @approve="approveExpense"
                @pay="payExpense"
                @delete="deleteExpense"
              />
            </el-col>
          </el-row>
        </div>

        <!-- 批量操作 -->
        <div v-if="selectedExpenses.length > 0" class="batch-actions">
          <el-alert :title="`已选择 ${selectedExpenses.length} 项`" type="info" :closable="false">
            <template #default>
              <el-button size="small" @click="batchApprove" v-if="canApprove"> 批量审批 </el-button>
              <el-button size="small" @click="batchPay" v-if="canPay"> 批量支付 </el-button>
              <el-button size="small" @click="batchExport"> 批量导出 </el-button>
              <el-button size="small" @click="clearSelection"> 清除选择 </el-button>
            </template>
          </el-alert>
        </div>

        <!-- 分页 -->
        <div class="pagination-section">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50, 100]"
            :disabled="loading"
            :background="true"
            layout="total, sizes, prev, pager, next, jumper"
            :total="pagination.total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 对话框 -->
    <daily-expense-create-dialog v-model="showCreateDialog" @created="onExpenseCreated" />

    <daily-expense-detail-dialog v-model="showDetailDialog" :expense="selectedExpense" />

    <daily-expense-edit-dialog
      v-model="showEditDialog"
      :expense="selectedExpense"
      @updated="onExpenseUpdated"
    />

    <expense-approval-dialog
      v-model="showApprovalDialog"
      :expense="selectedExpense"
      @approved="onExpenseApproved"
    />

    <recurring-expense-dialog v-model="showRecurringDialog" @created="onRecurringCreated" />

    <import-expenses-dialog v-model="showImportDialog" @imported="onExpensesImported" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Clock,
  Upload,
  Download,
  Calendar,
  TrendCharts,
  Warning,
  List,
  Grid,
  ArrowDown,
} from '@element-plus/icons-vue';
import DailyExpenseCard from './DailyExpenseCard.vue';
import DailyExpenseCreateDialog from './DailyExpenseCreateDialog.vue';
import DailyExpenseDetailDialog from './DailyExpenseDetailDialog.vue';
import DailyExpenseEditDialog from './DailyExpenseEditDialog.vue';
import ExpenseApprovalDialog from './ExpenseApprovalDialog.vue';
import RecurringExpenseDialog from './RecurringExpenseDialog.vue';
import ImportExpensesDialog from './ImportExpensesDialog.vue';
import { dailyExpenseApi } from '@/api/dailyExpense';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();

// 响应式数据
const loading = ref(false);
const expenses = ref([]);
const selectedExpenses = ref([]);
const selectedExpense = ref(null);
const viewMode = ref('table');

// 对话框控制
const showCreateDialog = ref(false);
const showDetailDialog = ref(false);
const showEditDialog = ref(false);
const showApprovalDialog = ref(false);
const showRecurringDialog = ref(false);
const showImportDialog = ref(false);

// 筛选条件
const filters = reactive({
  category: '',
  status: '',
  urgency: '',
  budgetType: '',
  dateRange: [],
  minAmount: null,
  maxAmount: null,
});

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

// 统计数据
const dailyStats = reactive({
  today: 0,
  thisMonth: 0,
  pendingCount: 0,
  pendingAmount: 0,
  overdueCount: 0,
});

// 权限计算
const canCreateExpense = computed(() => {
  return userStore.hasPermission('daily_expense_management', 'create');
});

const canApprove = computed(() => {
  return userStore.hasPermission('daily_expense_management', 'approve');
});

const canPay = computed(() => {
  return userStore.hasPermission('daily_expense_management', 'pay');
});

const canViewReports = computed(() => {
  return userStore.hasPermission('report_generation', 'create');
});

// 生命周期
onMounted(() => {
  loadExpenses();
  loadStatistics();
});

// 方法
const loadExpenses = async () => {
  try {
    loading.value = true;
    const params = {
      villageId: userStore.currentVillage._id,
      page: pagination.page,
      limit: pagination.limit,
      ...buildSearchParams(),
    };

    const response = await dailyExpenseApi.getExpenseList(params);
    expenses.value = response.data.expenses;
    pagination.total = response.data.total;
  } catch (error) {
    ElMessage.error('加载开支列表失败：' + error.message);
  } finally {
    loading.value = false;
  }
};

const loadStatistics = async () => {
  try {
    const response = await dailyExpenseApi.getStatistics(userStore.currentVillage._id, {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    });

    const stats = response.data;
    dailyStats.thisMonth = stats.overall.totalAmount;
    dailyStats.pendingCount = stats.overall.pendingCount || 0;
    dailyStats.pendingAmount = stats.overall.pendingAmount || 0;

    // 模拟今日和逾期数据
    dailyStats.today = Math.round(stats.overall.totalAmount * 0.1);
    dailyStats.overdueCount = Math.round(Math.random() * 5);
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

const buildSearchParams = () => {
  const params = {};

  Object.keys(filters).forEach(key => {
    if (filters[key] !== '' && filters[key] !== null) {
      if (key === 'dateRange' && filters[key].length === 2) {
        params.startDate = filters[key][0];
        params.endDate = filters[key][1];
      } else if (key !== 'dateRange') {
        params[key] = filters[key];
      }
    }
  });

  return params;
};

const searchExpenses = () => {
  pagination.page = 1;
  loadExpenses();
};

const resetFilters = () => {
  Object.keys(filters).forEach(key => {
    filters[key] = key === 'dateRange' ? [] : typeof filters[key] === 'number' ? null : '';
  });
  pagination.page = 1;
  loadExpenses();
};

// 表格操作
const handleSelectionChange = selection => {
  selectedExpenses.value = selection;
};

const clearSelection = () => {
  selectedExpenses.value = [];
};

// 权限检查
const canEditExpense = expense => {
  return (
    ['draft', 'pending_approval'].includes(expense.status) &&
    (expense.handler.handlerId === userStore.user._id ||
      userStore.hasPermission('daily_expense_management', 'update'))
  );
};

const canDelete = expense => {
  return (
    expense.status === 'draft' &&
    (expense.handler.handlerId === userStore.user._id ||
      userStore.hasPermission('daily_expense_management', 'delete'))
  );
};

// 操作处理
const viewExpense = expense => {
  selectedExpense.value = expense;
  showDetailDialog.value = true;
};

const editExpense = expense => {
  selectedExpense.value = expense;
  showEditDialog.value = true;
};

const approveExpense = expense => {
  selectedExpense.value = expense;
  showApprovalDialog.value = true;
};

const payExpense = expense => {
  // 标记支付
  ElMessageBox.prompt('请输入支付备注', '标记支付', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  })
    .then(async ({ value }) => {
      try {
        await dailyExpenseApi.markAsPaid(expense._id, {
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'bank_transfer',
          notes: value,
        });
        ElMessage.success('已标记为支付');
        loadExpenses();
        loadStatistics();
      } catch (error) {
        ElMessage.error('标记支付失败：' + error.message);
      }
    })
    .catch(() => {});
};

const deleteExpense = async expense => {
  try {
    await ElMessageBox.confirm(`确定要删除开支"${expense.expenseTitle}"吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await dailyExpenseApi.deleteExpense(expense._id);
    ElMessage.success('开支删除成功');
    loadExpenses();
    loadStatistics();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除开支失败：' + error.message);
    }
  }
};

const handleAction = (command, expense) => {
  switch (command) {
    case 'approve':
      approveExpense(expense);
      break;
    case 'pay':
      payExpense(expense);
      break;
    case 'duplicate':
      duplicateExpense(expense);
      break;
    case 'delete':
      deleteExpense(expense);
      break;
  }
};

const duplicateExpense = expense => {
  // 复制开支逻辑
  const duplicatedData = {
    ...expense,
    _id: undefined,
    expenseTitle: `[复制] ${expense.expenseTitle}`,
    status: 'draft',
    vouchers: { voucherNumber: undefined },
  };
  selectedExpense.value = duplicatedData;
  showCreateDialog.value = true;
};

// 批量操作
const batchApprove = () => {
  ElMessage.info('批量审批功能开发中');
};

const batchPay = () => {
  ElMessage.info('批量支付功能开发中');
};

const batchExport = () => {
  ElMessage.info('批量导出功能开发中');
};

const exportExpenses = () => {
  ElMessage.info('导出报表功能开发中');
};

// 分页处理
const handleSizeChange = size => {
  pagination.limit = size;
  pagination.page = 1;
  loadExpenses();
};

const handleCurrentChange = page => {
  pagination.page = page;
  loadExpenses();
};

// 事件处理
const onExpenseCreated = () => {
  showCreateDialog.value = false;
  loadExpenses();
  loadStatistics();
};

const onExpenseUpdated = () => {
  showEditDialog.value = false;
  loadExpenses();
};

const onExpenseApproved = () => {
  showApprovalDialog.value = false;
  loadExpenses();
  loadStatistics();
};

const onRecurringCreated = () => {
  showRecurringDialog.value = false;
  loadExpenses();
};

const onExpensesImported = () => {
  showImportDialog.value = false;
  loadExpenses();
  loadStatistics();
};

// 工具函数
const formatCurrency = amount => {
  if (amount === undefined || amount === null) return '0.00';
  return Number(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = date => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};

const getCategoryName = category => {
  const categoryMap = {
    office_supplies: '办公用品',
    utilities: '水电费',
    communication: '通讯费',
    transportation: '交通费',
    accommodation: '住宿费',
    meals_entertainment: '餐费接待',
    maintenance: '维修保养',
    training: '培训费',
    conference: '会议费',
    printing: '印刷费',
    postal: '邮寄费',
    cleaning: '清洁费',
    security: '安保费',
    insurance: '保险费',
    fuel: '燃料费',
    medical: '医疗费',
    emergency: '应急开支',
    other: '其他',
  };
  return categoryMap[category] || category;
};

const getCategoryColor = category => {
  const colorMap = {
    office_supplies: '',
    utilities: 'warning',
    communication: 'info',
    transportation: 'success',
    emergency: 'danger',
    other: 'info',
  };
  return colorMap[category] || '';
};

const getStatusName = status => {
  const statusMap = {
    draft: '草稿',
    pending_approval: '待审批',
    approved: '已批准',
    paid: '已支付',
    rejected: '已拒绝',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
};

const getStatusColor = status => {
  const colorMap = {
    draft: 'info',
    pending_approval: 'warning',
    approved: 'success',
    paid: 'primary',
    rejected: 'danger',
    cancelled: 'info',
  };
  return colorMap[status] || '';
};

const getUrgencyName = urgency => {
  const urgencyMap = {
    routine: '常规',
    urgent: '紧急',
    emergency: '应急',
  };
  return urgencyMap[urgency] || urgency;
};

const getUrgencyColor = urgency => {
  const colorMap = {
    routine: '',
    urgent: 'warning',
    emergency: 'danger',
  };
  return colorMap[urgency] || '';
};
</script>

<style scoped>
.daily-expense-management {
  padding: 20px;
}

.quick-actions-bar {
  margin-bottom: 20px;
}

.actions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.actions-header h3 {
  margin: 0;
  color: #303133;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.quick-stats {
  margin-top: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 20px;
  color: white;
}

.stat-icon.today {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.stat-icon.month {
  background: linear-gradient(135deg, #409eff, #66b1ff);
}

.stat-icon.pending {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
}

.stat-icon.overdue {
  background: linear-gradient(135deg, #f56c6c, #f78989);
}

.stat-content {
  flex: 1;
}

.stat-label {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #606266;
}

.stat-value {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.stat-sub {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.filter-section {
  margin-bottom: 20px;
}

.expense-list-section {
  margin-bottom: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.amount-text {
  font-weight: 600;
  color: #409eff;
}

.card-view {
  margin-top: 20px;
}

.batch-actions {
  margin-top: 16px;
}

.pagination-section {
  margin-top: 20px;
  text-align: center;
}

.text-center {
  text-align: center;
  line-height: 32px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .daily-expense-management {
    padding: 16px;
  }

  .actions-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .action-buttons {
    justify-content: center;
  }

  .stat-item {
    margin-bottom: 12px;
  }

  .header-actions {
    justify-content: center;
  }
}
</style>
