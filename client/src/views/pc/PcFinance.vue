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
        <el-button type="primary" @click="showAddIncomeDialog" aria-label="收入登记">
          <el-icon><Plus /></el-icon>
          收入登记
        </el-button>
        <el-button @click="showAddExpenseDialog" aria-label="支出登记">
          <el-icon><Minus /></el-icon>
          支出登记
        </el-button>
        <el-button @click="showBudgetDialog" aria-label="预算管理">
          <el-icon><Coin /></el-icon>
          预算管理
        </el-button>
        <el-button @click="handleExportReport" aria-label="导出报表">
          <el-icon><Download /></el-icon>
          导出报表
        </el-button>
      </div>
    </header>

    <!-- 财务概览 -->
    <section class="overview-section" aria-label="财务概览">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6" v-for="stat in overviewStats" :key="stat.key">
          <el-card
            class="stat-card"
            shadow="hover"
            role="button"
            tabindex="0"
            :aria-label="`${stat.label}，${stat.value}`"
          >
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
      <SkeletonScreen v-if="loading" type="card" :rows="4" />
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
                  <el-radio-group v-model="transactionType" size="small" aria-label="交易类型筛选">
                    <el-radio-button label="all">全部</el-radio-button>
                    <el-radio-button label="income">收入</el-radio-button>
                    <el-radio-button label="expense">支出</el-radio-button>
                  </el-radio-group>
                  <el-select v-model="categoryFilter" placeholder="分类筛选" clearable size="small" aria-label="分类筛选">
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

            <SkeletonScreen v-if="loading" type="table" :loading="loading" :rows="5" />
            <el-table
              v-else
              :data="filteredTransactions"
              stripe
              style="width: 100%"
              v-show="!loading"
              aria-label="收支明细列表"
              row-key="id"
            >
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
                  <span
                    :class="row.type === 'income' ? 'income-amount' : 'expense-amount'"
                    :aria-label="`${row.type === 'income' ? '收入' : '支出'}金额 ${formatAmount(row.amount)}元`"
                  >
                    {{ row.type === 'income' ? '+' : '-' }}¥{{ formatAmount(row.amount) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button
                    size="small"
                    text
                    @click="viewTransaction(row)"
                    aria-label="查看详情"
                  >
                    详情
                  </el-button>
                  <el-button
                    size="small"
                    text
                    @click="editTransaction(row)"
                    aria-label="编辑记录"
                  >
                    编辑
                  </el-button>
                  <el-button
                    size="small"
                    text
                    type="danger"
                    @click="deleteTransaction(row)"
                    aria-label="删除记录"
                  >
                    删除
                  </el-button>
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
                aria-label="分页导航"
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
            <SkeletonScreen v-if="loadingChart" type="chart" :loading="loadingChart" />
            <div
              v-else
              ref="categoryChartRef"
              class="chart-container"
              role="img"
              aria-label="分类统计饼图"
            ></div>
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
            <SkeletonScreen v-if="loading" type="list" :loading="loading" :rows="4" />
            <div v-else class="budget-list">
              <div
                v-for="budget in budgetList"
                :key="budget.category"
                class="budget-item"
                role="region"
                :aria-label="`${budget.category}预算，已使用${formatAmount(budget.used)}元，剩余${formatAmount(budget.total - budget.used)}元`"
              >
                <div class="budget-header">
                  <span class="budget-category">{{ budget.category }}</span>
                  <span class="budget-rate">{{ budget.rate }}%</span>
                </div>
                <el-progress
                  :percentage="budget.rate"
                  :color="getBudgetColor(budget.rate)"
                  :stroke-width="8"
                  :aria-valuenow="budget.rate"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="`${budget.category}预算执行率`"
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
            <SkeletonScreen v-if="loading" type="list" :loading="loading" :rows="3" />
            <div v-else class="operation-list">
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
      aria-modal="true"
      :aria-labelledby="transactionDialogTitle"
    >
      <h2 id="transactionDialogTitle" style="display: none">
        {{ isIncome ? '收入登记' : '支出登记' }}
      </h2>
      <el-form :model="transactionForm" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="类型">
          <el-radio-group v-model="transactionForm.type" aria-label="选择类型">
            <el-radio label="income">收入</el-radio>
            <el-radio label="expense">支出</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="transactionForm.category" placeholder="请选择分类" aria-label="选择分类">
            <el-option
              v-if="transactionForm.type === 'income'"
              label="集体经济收入"
              value="economic"
            />
            <el-option label="财政拨款" value="government" />
            <el-option label="土地流转" value="land" />
            <el-option label="其他收入" value="other_income" />
            <el-option v-if="transactionForm.type === 'expense'" label="工资福利" value="salary" />
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
            aria-label="输入金额"
          />
        </el-form-item>
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="transactionForm.date"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
            aria-label="选择日期"
          />
        </el-form-item>
        <el-form-item label="说明" prop="description">
          <el-input
            v-model="transactionForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入详细说明"
            aria-label="输入说明"
          />
        </el-form-item>
        <el-form-item label="凭证">
          <el-upload
            action="#"
            list-type="picture-card"
            :auto-upload="false"
            :on-change="handleFileChange"
            aria-label="上传凭证"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTransactionDialog = false" aria-label="取消">取消</el-button>
        <el-button type="primary" @click="saveTransaction" :loading="saving" aria-label="保存">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预算管理对话框 -->
    <el-dialog
      v-model="showBudgetDialogVisible"
      title="预算管理"
      width="800px"
      destroy-on-close
      aria-modal="true"
      aria-labelledby="budgetDialogTitle"
    >
      <h2 id="budgetDialogTitle" style="display: none">预算管理</h2>
      <el-table :data="budgetTableData" style="width: 100%" aria-label="预算管理列表">
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
            <el-progress
              :percentage="row.rate"
              :color="getBudgetColor(row.rate)"
              :aria-valuenow="row.rate"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="`${row.category}预算执行率`"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" @click="editBudget(row)" aria-label="调整预算">调整</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="showBudgetDialogVisible = false" aria-label="关闭对话框">关闭</el-button>
        <el-button type="primary" @click="addBudgetItem" aria-label="添加预算">添加预算</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Edit,
  Plus,
  Upload,
  Download,
  Refresh,
  Filter,
  ArrowDown,
  List,
  Grid,
  Phone,
  HomeFilled,
  Service,
  Clock,
  Delete,
  Printer,
  Message,
} from '@element-plus/icons-vue';
import SkeletonScreen from '@/components/common/SkeletonScreen.vue';
import * as financeApi from '@/api/finance';
import StatCard from '@/components/statistics/StatCard.vue';
import * as financeApi from '@/api/finance';

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

const loading = ref(true);
const loadingChart = ref(true);
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
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    change: '+12.5%',
    changeClass: 'positive',
    changeIcon: 'ArrowUp',
  },
  {
    key: 'expense',
    label: '总支出',
    value: 892000,
    icon: 'TrendCharts',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
    change: '+8.2%',
    changeClass: 'negative',
    changeIcon: 'ArrowUp',
  },
  {
    key: 'balance',
    label: '结余',
    value: 676000,
    icon: 'Wallet',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    change: '+15.3%',
    changeClass: 'positive',
    changeIcon: 'ArrowUp',
  },
  {
    key: 'budget',
    label: '预算执行率',
    value: 68.5,
    icon: 'Coin',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%)',
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

const animateNumber = (element: HTMLElement, endValue: number, duration: number = 1000) => {
  const startValue = 0;
  const startTime = performance.now();

  const update = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (endValue - startValue) * easeProgress;

    element.textContent = currentValue.toLocaleString('zh-CN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  };

  requestAnimationFrame(update);
};

const initStatAnimations = () => {
  setTimeout(() => {
    const statElements = document.querySelectorAll('.stat-value');
    const values = [1568000, 892000, 676000, 68.5];
    statElements.forEach((el, index) => {
      if (el instanceof HTMLElement && values[index] !== undefined) {
        animateNumber(el, values[index]);
      }
    });
  }, 500);
};

const initCategoryChart = () => {
  if (!categoryChartRef.value) return;

  loadingChart.value = true;
  categoryChartInstance = echarts.init(categoryChartRef.value);

  const option = {
    animation: {
      duration: 1200,
      easing: 'elasticOut',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
            <div style="color: #67c23a;">金额: ¥${params.value.toLocaleString()}</div>
            <div style="color: #909399;">占比: ${params.percent}%</div>
          </div>
        `;
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ebeef5',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: {
        color: '#303133',
        fontSize: 13,
      },
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
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',
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
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
          scale: true,
          scaleSize: 5,
        },
        labelLine: {
          show: false,
        },
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDelay: (idx: number) => Math.random() * 200,
        data: [
          { value: 420000, name: '工资福利', itemStyle: { color: '#0369A1' } },
          { value: 180000, name: '基础设施', itemStyle: { color: '#059669' } },
          { value: 85000, name: '公共事业', itemStyle: { color: '#7c3aed' } },
          { value: 65000, name: '办公经费', itemStyle: { color: '#ea580c' } },
          { value: 32000, name: '其他支出', itemStyle: { color: '#0891b2' } },
        ],
      },
    ],
  };

  categoryChartInstance.setOption(option);
  loadingChart.value = false;
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
  setTimeout(() => {
    loading.value = false;
  }, 500);

  await nextTick();
  initCategoryChart();
  initStatAnimations();

  window.addEventListener('resize', () => {
    categoryChartInstance?.resize();
  });
});
</script>

<style lang="scss" scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes countUp {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes rotateHover {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes buttonClick {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

.pc-finance {
  padding: 0;
  animation: fadeIn 0.6s ease-out;
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
  animation: fadeIn 0.6s ease-out;

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

    .el-button {
      transition: all 0.3s ease;

      &:active {
        animation: buttonClick 0.3s ease;
      }
    }
  }
}

.overview-section {
  margin-bottom: 24px;
}

.stat-card {
  margin-bottom: 20px;
  opacity: 0;
  animation: scaleIn 0.6s ease-out forwards;

  &:nth-child(1) {
    animation-delay: 0.1s;
  }

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.3s;
  }

  &:nth-child(4) {
    animation-delay: 0.4s;
  }

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
    transition: transform 0.3s ease;

    .el-card:hover & {
      transform: scale(1.1) rotate(5deg);
    }
  }

  .stat-info {
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;
      animation: countUp 0.8s ease-out;
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
  display: inline-block;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.expense-amount {
  color: #f56c6c;
  font-weight: 600;
  display: inline-block;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
}

:deep(.el-table__body tr) {
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;

  &:nth-child(1) {
    animation-delay: 0.1s;
  }

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.3s;
  }

  &:nth-child(4) {
    animation-delay: 0.4s;
  }

  &:nth-child(5) {
    animation-delay: 0.5s;
  }

  &:hover {
    background-color: #f5f7fa;
    transition: background-color 0.3s ease;
  }
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
  position: relative;
  animation: fadeIn 0.5s ease-out;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
    z-index: -1;
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.budget-list {
  .budget-item {
    margin-bottom: 16px;
    opacity: 0;
    animation: slideInLeft 0.5s ease-out forwards;

    &:nth-child(1) {
      animation-delay: 0.1s;
    }

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.3s;
    }

    &:nth-child(4) {
      animation-delay: 0.4s;
    }

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

    :deep(.el-progress-bar__inner) {
      transition: width 0.6s ease-out;
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
    opacity: 0;
    animation: fadeIn 0.4s ease-out forwards;

    &:nth-child(1) {
      animation-delay: 0.1s;
    }

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.3s;
    }

    &:last-child {
      border-bottom: none;
    }

    :deep(.el-avatar) {
      transition: transform 0.3s ease;

      &:hover {
        animation: rotateHover 0.6s ease-in-out;
        cursor: pointer;
      }
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

      .el-button {
        flex: 1 1 45%;
        min-width: 45%;
      }
    }
  }

  .stat-card {
    opacity: 0;
    animation: scaleIn 0.5s ease-out forwards;

    &:nth-child(1) {
      animation-delay: 0.05s;
    }

    &:nth-child(2) {
      animation-delay: 0.1s;
    }

    &:nth-child(3) {
      animation-delay: 0.15s;
    }

    &:nth-child(4) {
      animation-delay: 0.2s;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      transition: transform 0.3s ease;

      .el-card:hover & {
        transform: scale(1.1) rotate(5deg);
      }
    }

    .stat-info {
      .stat-value {
        font-size: 22px;
        animation: countUp 0.6s ease-out;
      }

      .stat-label {
        font-size: 12px;
      }

      .stat-change {
        font-size: 11px;
      }
    }
  }

  .card-actions {
    flex-direction: column;
    width: 100%;
    gap: 8px;

    .el-radio-group,
    .el-select {
      width: 100%;
    }
  }

  .el-table {
    overflow-x: auto;
    display: block;

    .el-table__body-wrapper {
      overflow-x: auto;
    }
  }

  .chart-container {
    height: 180px;
  }

  .budget-list {
    .budget-item {
      margin-bottom: 12px;
      opacity: 0;
      animation: slideInLeft 0.4s ease-out forwards;

      &:nth-child(1) {
        animation-delay: 0.05s;
      }

      &:nth-child(2) {
        animation-delay: 0.1s;
      }

      &:nth-child(3) {
        animation-delay: 0.15s;
      }

      &:nth-child(4) {
        animation-delay: 0.2s;
      }

      .budget-header {
        margin-bottom: 6px;

        .budget-category {
          font-size: 13px;
        }

        .budget-rate {
          font-size: 13px;
        }
      }

      :deep(.el-progress) {
        .el-progress__text {
          font-size: 12px !important;
        }

        .el-progress-bar__inner {
          transition: width 0.6s ease-out;
        }
      }

      .budget-amounts {
        font-size: 11px;
        margin-top: 6px;
      }
    }
  }

  .operation-list {
    .operation-item {
      padding: 10px 0;
      gap: 10px;
      opacity: 0;
      animation: fadeIn 0.4s ease-out forwards;

      &:nth-child(1) {
        animation-delay: 0.05s;
      }

      &:nth-child(2) {
        animation-delay: 0.1s;
      }

      &:nth-child(3) {
        animation-delay: 0.15s;
      }

      :deep(.el-avatar) {
        width: 28px;
        height: 28px;
        font-size: 12px;
        transition: transform 0.3s ease;

        &:hover {
          animation: rotateHover 0.6s ease-in-out;
          cursor: pointer;
        }
      }

      .operation-content {
        p {
          font-size: 13px;
        }

        .operation-time {
          font-size: 11px;
        }
      }
    }
  }
}
</style>
