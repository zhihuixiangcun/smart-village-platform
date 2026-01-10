<!--
  PC端财务管理页面
  智慧乡村综合服务平台 - PC端财务管理
-->
<template>
  <div class="pc-finance">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>财务管理</h1>
        <p>村集体资金管理、收支明细、预算控制、财务报表</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showAddIncomeDialog">
          <el-icon><Plus /></el-icon>
          收入登记
        </el-button>
        <el-button @click="showAddExpenseDialog">
          <el-icon><Minus /></el-icon>
          支出登记
        </el-button>
        <el-button @click="showBudgetDialog">
          <el-icon><Coin /></el-icon>
          预算管理
        </el-button>
        <el-button @click="handleExportReport">
          <el-icon><Download /></el-icon>
          导出报表
        </el-button>
      </div>
    </header>

    <!-- 财务概览 -->
    <section class="overview-section">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6" v-for="stat in overviewStats" :key="stat.key">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" :style="{ background: stat.gradient }">
                <el-icon :size="28" color="white">
                  <component :is="stat.icon" />
                </el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-change" :class="stat.changeClass">
                  <el-icon size="12">
                    <component :is="stat.changeIcon" />
                  </el-icon>
                  <span>{{ stat.change }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- 主内容区域 -->
    <section class="main-section">
      <el-row :gutter="20">
        <!-- 左侧内容 -->
        <el-col :xs="24" :sm="24" :md="16" :lg="16">
          <el-card class="content-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Wallet /></el-icon>
                  收支明细
                </span>
                <div class="card-actions">
                  <el-radio-group v-model="transactionType" size="small">
                    <el-radio-button label="all">全部</el-radio-button>
                    <el-radio-button label="income">收入</el-radio-button>
                    <el-radio-button label="expense">支出</el-radio-button>
                  </el-radio-group>
                  <el-select v-model="categoryFilter" placeholder="分类筛选" clearable size="small">
                    <el-option label="全部" value="" />
                    <el-option label="集体经济收入" value="economic" />
                    <el-option label="财政拨款" value="government" />
                    <el-option label="土地流转" value="land" />
                    <el-option label="工资福利" value="salary" />
                    <el-option label="办公经费" value="office" />
                    <el-option label="基础设施" value="infrastructure" />
                  </el-select>
                </div>
              </div>
            </template>

            <el-table :data="filteredTransactions" stripe style="width: 100%" v-loading="loading">
              <el-table-column prop="date" label="日期" width="120">
                <template #default="{ row }">
                  {{ formatDate(row.date) }}
                </template>
              </el-table-column>
              <el-table-column prop="type" label="类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.type === 'income' ? 'success' : 'danger'" size="small">
                    {{ row.type === 'income' ? '收入' : '支出' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="category" label="分类" width="140">
                <template #default="{ row }">
                  {{ getCategoryLabel(row.category) }}
                </template>
              </el-table-column>
              <el-table-column prop="description" label="说明" min-width="200" />
              <el-table-column prop="amount" label="金额" width="120" align="right">
                <template #default="{ row }">
                  <span :class="row.type === 'income' ? 'income-amount' : 'expense-amount'">
                    {{ row.type === 'income' ? '+' : '-' }}¥{{ formatAmount(row.amount) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button size="small" text @click="viewTransaction(row)">详情</el-button>
                  <el-button size="small" text @click="editTransaction(row)">编辑</el-button>
                  <el-button size="small" text type="danger" @click="deleteTransaction(row)"
                    >删除</el-button
                  >
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-container">
              <el-pagination
                v-model:current-page="pagination.currentPage"
                v-model:page-size="pagination.pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="pagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSizeChange"
                @current-change="handlePageChange"
              />
            </div>
          </el-card>
        </el-col>

        <!-- 右侧侧边栏 -->
        <el-col :xs="24" :sm="24" :md="8" :lg="8">
          <!-- 分类统计 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><PieChart /></el-icon>
                  分类统计
                </span>
              </div>
            </template>
            <div ref="categoryChartRef" class="chart-container"></div>
          </el-card>

          <!-- 预算执行情况 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><DataAnalysis /></el-icon>
                  预算执行
                </span>
              </div>
            </template>
            <div class="budget-list">
              <div v-for="budget in budgetList" :key="budget.category" class="budget-item">
                <div class="budget-header">
                  <span class="budget-category">{{ budget.category }}</span>
                  <span class="budget-rate">{{ budget.rate }}%</span>
                </div>
                <el-progress
                  :percentage="budget.rate"
                  :color="getBudgetColor(budget.rate)"
                  :stroke-width="8"
                />
                <div class="budget-amounts">
                  <span>已用: ¥{{ formatAmount(budget.used) }}</span>
                  <span>预算: ¥{{ formatAmount(budget.total) }}</span>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 最近操作 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Clock /></el-icon>
                  最近操作
                </span>
              </div>
            </template>
            <div class="operation-list">
              <div v-for="op in recentOperations" :key="op.id" class="operation-item">
                <el-avatar :size="32" :src="op.avatar">{{ op.operator.charAt(0) }}</el-avatar>
                <div class="operation-content">
                  <p>
                    <strong>{{ op.operator }}</strong>
                    {{ op.action }}
                  </p>
                  <span class="operation-time">{{ formatTime(op.time) }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- 收入/支出登记对话框 -->
    <el-dialog
      v-model="showTransactionDialog"
      :title="isIncome ? '收入登记' : '支出登记'"
      width="600px"
      destroy-on-close
    >
      <el-form :model="transactionForm" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="类型">
          <el-radio-group v-model="transactionForm.type">
            <el-radio label="income">收入</el-radio>
            <el-radio label="expense">支出</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="transactionForm.category" placeholder="请选择分类">
            <el-option
              v-if="transactionForm.type === 'income'"
              label="集体经济收入"
              value="economic"
            />
            <el-option label="财政拨款" value="government" />
            <el-option label="土地流转" value="land" />
            <el-option label="其他收入" value="other_income" />
            <el-option
              v-if="transactionForm.type === 'expense'"
              label="工资福利"
              value="salary"
            />
            <el-option label="办公经费" value="office" />
            <el-option label="基础设施" value="infrastructure" />
            <el-option label="公共事业" value="public" />
            <el-option label="其他支出" value="other_expense" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number
            v-model="transactionForm.amount"
            :precision="2"
            :min="0"
            :step="100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="transactionForm.date"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="说明" prop="description">
          <el-input
            v-model="transactionForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入详细说明"
          />
        </el-form-item>
        <el-form-item label="凭证">
          <el-upload
            action="#"
            list-type="picture-card"
            :auto-upload="false"
            :on-change="handleFileChange"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTransactionDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTransaction" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预算管理对话框 -->
    <el-dialog v-model="showBudgetDialogVisible" title="预算管理" width="800px" destroy-on-close>
      <el-table :data="budgetTableData" style="width: 100%">
        <el-table-column prop="category" label="预算类别" width="150" />
        <el-table-column prop="total" label="预算金额" width="150">
          <template #default="{ row }"> ¥{{ formatAmount(row.total) }} </template>
        </el-table-column>
        <el-table-column prop="used" label="已用金额" width="150">
          <template #default="{ row }"> ¥{{ formatAmount(row.used) }} </template>
        </el-table-column>
        <el-table-column prop="remaining" label="剩余金额" width="150">
          <template #default="{ row }"> ¥{{ formatAmount(row.remaining) }} </template>
        </el-table-column>
        <el-table-column label="执行进度">
          <template #default="{ row }">
            <el-progress :percentage="row.rate" :color="getBudgetColor(row.rate)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" @click="editBudget(row)">调整</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="showBudgetDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="addBudgetItem">添加预算</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import * as echarts from 'echarts';
import {
  Plus,
  Minus,
  Coin,
  Download,
  Wallet,
  PieChart,
  DataAnalysis,
  Clock,
} from '@element-plus/icons-vue';

interface Transaction {
  id: string;
  date: Date;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  operator: string;
}

interface BudgetItem {
  category: string;
  total: number;
  used: number;
  rate: number;
}

interface Operation {
  id: string;
  operator: string;
  avatar?: string;
  action: string;
  time: Date;
}

const userStore = useUserStore();
const formRef = ref<FormInstance | null>(null);

const loading = ref(false);
const saving = ref(false);
const showTransactionDialog = ref(false);
const showBudgetDialogVisible = ref(false);
const isIncome = ref(true);
const transactionType = ref('all');
const categoryFilter = ref('');

const categoryChartRef = ref<HTMLDivElement | null>(null);
let categoryChartInstance: echarts.ECharts | null = null;

const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0,
});

const overviewStats = ref([
  {
    key: 'income',
    label: '总收入',
    value: 1568000,
    icon: 'TrendCharts',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    change: '+12.5%',
    changeClass: 'positive',
    changeIcon: 'ArrowUp',
  },
  {
    key: 'expense',
    label: '总支出',
    value: 892000,
    icon: 'TrendCharts',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    change: '+8.2%',
    changeClass: 'negative',
    changeIcon: 'ArrowUp',
  },
  {
    key: 'balance',
    label: '结余',
    value: 676000,
    icon: 'Wallet',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    change: '+15.3%',
    changeClass: 'positive',
    changeIcon: 'ArrowUp',
  },
  {
    key: 'budget',
    label: '预算执行率',
    value: 68.5,
    icon: 'Coin',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    change: '-2.1%',
    changeClass: 'negative',
    changeIcon: 'ArrowDown',
  },
]);

const transactions = ref<Transaction[]>([
  {
    id: '1',
    date: new Date(),
    type: 'income',
    category: 'economic',
    description: '村集体企业分红收入',
    amount: 150000,
    operator: '财务张三',
  },
  {
    id: '2',
    date: new Date(Date.now() - 86400000),
    type: 'expense',
    category: 'infrastructure',
    description: '村道路硬化工程款',
    amount: 85000,
    operator: '财务张三',
  },
  {
    id: '3',
    date: new Date(Date.now() - 172800000),
    type: 'income',
    category: 'government',
    description: '乡村振兴专项资金拨款',
    amount: 200000,
    operator: '财务李四',
  },
  {
    id: '4',
    date: new Date(Date.now() - 259200000),
    type: 'expense',
    category: 'salary',
    description: '村干部12月工资',
    amount: 45000,
    operator: '财务张三',
  },
  {
    id: '5',
    date: new Date(Date.now() - 345600000),
    type: 'income',
    category: 'land',
    description: '土地流转租金收入',
    amount: 80000,
    operator: '财务李四',
  },
]);

const budgetList = ref<BudgetItem[]>([
  { category: '工资福利', total: 500000, used: 420000, rate: 84 },
  { category: '办公经费', total: 100000, used: 65000, rate: 65 },
  { category: '基础设施', total: 300000, used: 180000, rate: 60 },
  { category: '公共事业', total: 150000, used: 85000, rate: 57 },
]);

const recentOperations = ref<Operation[]>([
  {
    id: '1',
    operator: '财务张三',
    action: '登记了一笔村集体企业分红收入',
    time: new Date(),
  },
  {
    id: '2',
    operator: '财务李四',
    action: '审核通过了道路硬化工程款',
    time: new Date(Date.now() - 3600000),
  },
  {
    id: '3',
    operator: '财务张三',
    action: '调整了办公经费预算',
    time: new Date(Date.now() - 7200000),
  },
]);

const transactionForm = reactive({
  type: 'income',
  category: '',
  amount: 0,
  date: new Date(),
  description: '',
  files: [] as File[],
});

const formRules: FormRules = {
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  description: [{ required: true, message: '请输入说明', trigger: 'blur' }],
};

const budgetTableData = ref([
  { category: '工资福利', total: 500000, used: 420000, remaining: 80000, rate: 84 },
  { category: '办公经费', total: 100000, used: 65000, remaining: 35000, rate: 65 },
  { category: '基础设施', total: 300000, used: 180000, remaining: 120000, rate: 60 },
  { category: '公共事业', total: 150000, used: 85000, remaining: 65000, rate: 57 },
  { category: '其他支出', total: 80000, used: 32000, remaining: 48000, rate: 40 },
]);

const filteredTransactions = computed(() => {
  return transactions.value.filter(tx => {
    const matchType = transactionType.value === 'all' || tx.type === transactionType.value;
    const matchCategory = !categoryFilter.value || tx.category === categoryFilter.value;
    return matchType && matchCategory;
  });
});

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatAmount = (amount: number): string => {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return formatDate(date);
};

const getCategoryLabel = (category: string): string => {
  const labelMap: Record<string, string> = {
    economic: '集体经济收入',
    government: '财政拨款',
    land: '土地流转',
    salary: '工资福利',
    office: '办公经费',
    infrastructure: '基础设施',
    public: '公共事业',
    other_income: '其他收入',
    other_expense: '其他支出',
  };
  return labelMap[category] || category;
};

const getBudgetColor = (rate: number): string => {
  if (rate >= 90) return '#f56c6c';
  if (rate >= 70) return '#e6a23c';
  return '#67c23a';
};

const initCategoryChart = () => {
  if (!categoryChartRef.value) return;

  categoryChartInstance = echarts.init(categoryChartRef.value);

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        fontSize: 12,
        color: '#606266',
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: 420000, name: '工资福利', itemStyle: { color: '#667eea' } },
          { value: 180000, name: '基础设施', itemStyle: { color: '#4facfe' } },
          { value: 85000, name: '公共事业', itemStyle: { color: '#43e97b' } },
          { value: 65000, name: '办公经费', itemStyle: { color: '#fa709a' } },
          { value: 32000, name: '其他支出', itemStyle: { color: '#a18cd1' } },
        ],
      },
    ],
  };

  categoryChartInstance.setOption(option);
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
};

const handlePageChange = (page: number) => {
  pagination.currentPage = page;
};

const showAddIncomeDialog = () => {
  isIncome.value = true;
  resetForm();
  showTransactionDialog.value = true;
};

const showAddExpenseDialog = () => {
  isIncome.value = false;
  resetForm();
  showTransactionDialog.value = true;
};

const showBudgetDialog = () => {
  showBudgetDialogVisible.value = true;
};

const handleExportReport = () => {
  ElMessage.info('导出报表功能开发中');
};

const viewTransaction = (transaction: Transaction) => {
  ElMessage.info(`查看详情: ${transaction.description}`);
};

const editTransaction = (transaction: Transaction) => {
  Object.assign(transactionForm, transaction);
  showTransactionDialog.value = true;
};

const deleteTransaction = async (transaction: Transaction) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除该${transaction.type === 'income' ? '收入' : '支出'}记录吗？`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    transactions.value = transactions.value.filter(t => t.id !== transaction.id);
    ElMessage.success('删除成功');
  } catch {}
};

const handleFileChange = (file: { raw: File }) => {
  transactionForm.files.push(file.raw);
};

const resetForm = () => {
  Object.assign(transactionForm, {
    type: 'income',
    category: '',
    amount: 0,
    date: new Date(),
    description: '',
    files: [],
  });
};

const saveTransaction = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    saving.value = true;

    const newTransaction: Transaction = {
      id: String(Date.now()),
      ...transactionForm,
      date: transactionForm.date,
      operator: userStore.userInfo?.name || '未知',
    };

    transactions.value.unshift(newTransaction);
    ElMessage.success('保存成功');
    showTransactionDialog.value = false;
  } catch {
    console.error('表单验证失败');
  } finally {
    saving.value = false;
  }
};

const editBudget = (budget: BudgetItem) => {
  ElMessage.info(`调整预算: ${budget.category}`);
};

const addBudgetItem = () => {
  ElMessage.info('添加预算功能开发中');
};

onMounted(async () => {
  await nextTick();
  initCategoryChart();

  window.addEventListener('resize', () => {
    categoryChartInstance?.resize();
  });
});
</script>

<style lang="scss" scoped>
.pc-finance {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  .header-content {
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.overview-section {
  margin-bottom: 24px;
}

.stat-card {
  margin-bottom: 20px;

  .stat-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-info {
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;
    }

    .stat-label {
      font-size: 13px;
      color: #909399;
      margin-bottom: 4px;
    }

    .stat-change {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;

      &.positive {
        color: #67c23a;
      }

      &.negative {
        color: #f56c6c;
      }
    }
  }
}

.main-section {
  .el-card {
    margin-bottom: 20px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.card-actions {
  display: flex;
  gap: 12px;
}

.income-amount {
  color: #67c23a;
  font-weight: 600;
}

.expense-amount {
  color: #f56c6c;
  font-weight: 600;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.sidebar-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }
  }
}

.chart-container {
  height: 220px;
}

.budget-list {
  .budget-item {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .budget-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;

      .budget-category {
        font-size: 14px;
        font-weight: 500;
        color: #303133;
      }

      .budget-rate {
        font-size: 14px;
        font-weight: 500;
        color: #606266;
      }
    }

    .budget-amounts {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      color: #909399;
    }
  }
}

.operation-list {
  .operation-item {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #ebeef5;

    &:last-child {
      border-bottom: none;
    }

    .operation-content {
      flex: 1;

      p {
        margin: 0 0 4px;
        font-size: 14px;
        color: #606266;

        strong {
          color: #303133;
        }
      }

      .operation-time {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;

    .header-actions {
      width: 100%;
      flex-wrap: wrap;
    }
  }

  .card-actions {
    flex-direction: column;
    width: 100%;

    .el-radio-group,
    .el-select {
      width: 100%;
    }
  }
}
</style>
