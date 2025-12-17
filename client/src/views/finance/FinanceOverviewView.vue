<template>
  <div class="finance-management">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">财务管理</h1>
        <p class="page-description">预算控制、收支管理、财务透明、审批流程</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showTransactionDialog" icon="Plus">录入收支</el-button>
        <el-button @click="showBudgetDialog" icon="Money">预算管理</el-button>
        <el-button @click="exportReport" icon="Download">导出报表</el-button>
      </div>
    </div>

    <!-- 财务概览卡片 -->
    <div class="overview-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="overview-card income">
            <div class="card-content">
              <div class="card-icon">💰</div>
              <div class="card-info">
                <div class="card-value">¥{{ formatAmount(overview.totalIncome) }}</div>
                <div class="card-label">总收入</div>
                <div class="card-trend">
                  <el-icon class="trend-icon up"><CaretTop /></el-icon>
                  <span>+12.5%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="overview-card expense">
            <div class="card-content">
              <div class="card-icon">💸</div>
              <div class="card-info">
                <div class="card-value">¥{{ formatAmount(overview.totalExpense) }}</div>
                <div class="card-label">总支出</div>
                <div class="card-trend">
                  <el-icon class="trend-icon down"><CaretBottom /></el-icon>
                  <span>-8.3%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="overview-card balance">
            <div class="card-content">
              <div class="card-icon">🏦</div>
              <div class="card-info">
                <div class="card-value">¥{{ formatAmount(overview.balance) }}</div>
                <div class="card-label">当前余额</div>
                <div class="card-trend">
                  <el-icon class="trend-icon up"><CaretTop /></el-icon>
                  <span>+15.8%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="overview-card budget">
            <div class="card-content">
              <div class="card-icon">📊</div>
              <div class="card-info">
                <div class="card-value">{{ overview.budgetUsage }}%</div>
                <div class="card-label">预算执行率</div>
                <div class="card-progress">
                  <el-progress
                    :percentage="overview.budgetUsage"
                    :stroke-width="6"
                    :show-text="false"
                    :color="getProgressColor(overview.budgetUsage)"
                  />
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 功能选项卡 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="finance-tabs">
      <el-tab-pane label="收支明细" name="transactions">
        <div class="tab-content">
          <!-- 搜索筛选 -->
          <el-card class="search-card">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-input
                  v-model="searchQuery.transaction"
                  placeholder="搜索交易说明"
                  clearable
                  @keyup.enter="searchTransactions"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-col>
              <el-col :span="4">
                <el-select v-model="filterQuery.type" placeholder="收支类型" clearable>
                  <el-option label="全部" value="" />
                  <el-option label="收入" value="income" />
                  <el-option label="支出" value="expense" />
                </el-select>
              </el-col>
              <el-col :span="4">
                <el-select v-model="filterQuery.category" placeholder="收支分类" clearable>
                  <el-option label="全部" value="" />
                  <el-option label="政府补助" value="government" />
                  <el-option label="集体收入" value="collective" />
                  <el-option label="基础设施" value="infrastructure" />
                  <el-option label="公共服务" value="public_service" />
                  <el-option label="行政支出" value="administrative" />
                </el-select>
              </el-col>
              <el-col :span="4">
                <el-date-picker
                  v-model="filterQuery.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-col>
              <el-col :span="3">
                <el-button type="primary" @click="searchTransactions" icon="Search">搜索</el-button>
              </el-col>
            </el-row>
          </el-card>

          <!-- 交易列表 -->
          <el-card class="list-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">收支明细</span>
                <div class="header-actions">
                  <el-button size="small" @click="showBatchApproval" :disabled="!selectedTransactions.length">
                    批量审批
                  </el-button>
                  <el-button size="small" @click="batchDelete" :disabled="!selectedTransactions.length">
                    批量删除
                  </el-button>
                </div>
              </div>
            </template>

            <el-table
              :data="paginatedTransactions"
              stripe
              @selection-change="handleSelectionChange"
              style="width: 100%"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column prop="date" label="日期" width="120" sortable>
                <template #default="scope">
                  {{ formatDate(scope.row.date) }}
                </template>
              </el-table-column>

              <el-table-column prop="type" label="类型" width="80">
                <template #default="scope">
                  <el-tag :type="scope.row.type === 'income' ? 'success' : 'danger'" size="small">
                    {{ scope.row.type === 'income' ? '收入' : '支出' }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="category" label="分类" width="120">
                <template #default="scope">
                  <span>{{ getCategoryText(scope.row.category) }}</span>
                </template>
              </el-table-column>

              <el-table-column prop="description" label="说明" min-width="200" />

              <el-table-column prop="amount" label="金额" width="120" sortable>
                <template #default="scope">
                  <span :class="scope.row.type === 'income' ? 'income-amount' : 'expense-amount'">
                    {{ scope.row.type === 'income' ? '+' : '-' }}¥{{ formatAmount(scope.row.amount) }}
                  </span>
                </template>
              </el-table-column>

              <el-table-column prop="balance" label="余额" width="120">
                <template #default="scope">
                  ¥{{ formatAmount(scope.row.balance) }}
                </template>
              </el-table-column>

              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getStatusColor(scope.row.status)">
                    {{ getStatusText(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="operator" label="经办人" width="100" />

              <el-table-column label="操作" width="150" fixed="right">
                <template #default="scope">
                  <el-button link type="primary" @click="viewTransaction(scope.row)">详情</el-button>
                  <el-button link type="warning" @click="editTransaction(scope.row)">编辑</el-button>
                  <el-button
                    v-if="scope.row.status === 'pending'"
                    link
                    type="success"
                    @click="approveTransaction(scope.row)"
                  >
                    审批
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-container">
              <el-pagination
                v-model:current-page="currentPage.transactions"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="filteredTransactions.length"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="预算管理" name="budget">
        <div class="tab-content">
          <el-card class="budget-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">年度预算执行情况</span>
                <el-button type="primary" @click="showBudgetDialog">编辑预算</el-button>
              </div>
            </template>

            <div class="budget-list">
              <div
                v-for="budget in budgets"
                :key="budget.id"
                class="budget-item"
              >
                <div class="budget-header">
                  <h4>{{ budget.name }}</h4>
                  <div class="budget-actions">
                    <el-button link type="primary" @click="viewBudgetDetail(budget)">详情</el-button>
                    <el-button link type="warning" @click="editBudgetItem(budget)">编辑</el-button>
                  </div>
                </div>

                <div class="budget-progress">
                  <div class="progress-info">
                    <span>预算：¥{{ formatAmount(budget.budget) }}</span>
                    <span>已使用：¥{{ formatAmount(budget.used) }}</span>
                    <span>剩余：¥{{ formatAmount(budget.remaining) }}</span>
                  </div>
                  <el-progress
                    :percentage="budget.usage"
                    :stroke-width="8"
                    :color="getBudgetProgressColor(budget.usage)"
                  >
                    <template #default="{ percentage }">
                      <span class="percentage-text">{{ percentage }}%</span>
                    </template>
                  </el-progress>
                </div>

                <div class="budget-details">
                  <el-descriptions :column="3" size="small">
                    <el-descriptions-item label="预算周期">{{ budget.period }}</el-descriptions-item>
                    <el-descriptions-item label="负责人">{{ budget.manager }}</el-descriptions-item>
                    <el-descriptions-item label="状态">
                      <el-tag :type="budget.usage > 90 ? 'danger' : budget.usage > 70 ? 'warning' : 'success'">
                        {{ budget.usage > 90 ? '超支预警' : budget.usage > 70 ? '注意控制' : '正常' }}
                      </el-tag>
                    </el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="财务报表" name="reports">
        <div class="tab-content">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-card class="chart-card">
                <template #header>
                  <span class="card-title">收支趋势图</span>
                </template>
                <div class="chart-container">
                  <div class="chart-placeholder">
                    <el-icon class="chart-icon"><TrendCharts /></el-icon>
                    <p>收支趋势图表</p>
                  </div>
                </div>
              </el-card>
            </el-col>

            <el-col :span="12">
              <el-card class="chart-card">
                <template #header>
                  <span class="card-title">支出分类统计</span>
                </template>
                <div class="chart-container">
                  <div class="chart-placeholder">
                    <el-icon class="chart-icon"><PieChart /></el-icon>
                    <p>支出分类饼图</p>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <el-card class="report-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">财务报表</span>
                <div class="header-actions">
                  <el-button size="small" @click="generateMonthlyReport">月度报表</el-button>
                  <el-button size="small" @click="generateYearlyReport">年度报表</el-button>
                  <el-button size="small" type="primary" @click="exportReport">导出报表</el-button>
                </div>
              </div>
            </template>

            <el-table :data="reports" stripe style="width: 100%">
              <el-table-column prop="name" label="报表名称" min-width="200" />
              <el-table-column prop="type" label="报表类型" width="120" />
              <el-table-column prop="period" label="报表周期" width="120" />
              <el-table-column prop="createTime" label="生成时间" width="160">
                <template #default="scope">
                  {{ formatDateTime(scope.row.createTime) }}
                </template>
              </el-table-column>
              <el-table-column prop="size" label="文件大小" width="100" />
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="scope">
                  <el-button link type="primary" @click="viewReport(scope.row)">查看</el-button>
                  <el-button link type="success" @click="downloadReport(scope.row)">下载</el-button>
                  <el-button link type="danger" @click="deleteReport(scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 收支录入对话框 -->
    <el-dialog v-model="transactionDialogVisible" title="录入收支" width="600px">
      <el-form :model="transactionForm" :rules="transactionRules" ref="transactionFormRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="收支类型" prop="type">
              <el-radio-group v-model="transactionForm.type">
                <el-radio label="income">收入</el-radio>
                <el-radio label="expense">支出</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收支分类" prop="category">
              <el-select v-model="transactionForm.category" placeholder="请选择分类">
                <el-option
                  v-for="category in getCategoriesByType(transactionForm.type)"
                  :key="category.value"
                  :label="category.label"
                  :value="category.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="交易日期" prop="date">
          <el-date-picker
            v-model="transactionForm.date"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="交易金额" prop="amount">
          <el-input-number
            v-model="transactionForm.amount"
            :precision="2"
            :min="0"
            :step="100"
            placeholder="请输入金额"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="交易说明" prop="description">
          <el-input
            v-model="transactionForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入交易说明"
          />
        </el-form-item>

        <el-form-item label="付款方式">
          <el-select v-model="transactionForm.paymentMethod" placeholder="请选择付款方式">
            <el-option label="现金" value="cash" />
            <el-option label="银行转账" value="bank" />
            <el-option label="微信支付" value="wechat" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="相关凭证">
          <el-upload
            class="upload-demo"
            action="#"
            multiple
            :auto-upload="false"
            :file-list="transactionForm.attachments"
            @change="handleFileChange"
          >
            <el-button icon="Upload">上传凭证</el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持jpg/png/pdf文件，单个文件不超过10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="transactionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTransaction" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 响应式数据
const activeTab = ref('transactions')
const transactionDialogVisible = ref(false)
const budgetDialogVisible = ref(false)
const saving = ref(false)
const transactionFormRef = ref()
const selectedTransactions = ref([])

// 搜索和筛选
const searchQuery = reactive({
  transaction: ''
})

const filterQuery = reactive({
  type: '',
  category: '',
  dateRange: []
})

// 分页
const currentPage = reactive({
  transactions: 1,
  reports: 1
})
const pageSize = ref(20)

// 收支表单
const transactionForm = reactive({
  type: 'income',
  category: '',
  date: '',
  amount: 0,
  description: '',
  paymentMethod: 'bank',
  attachments: []
})

// 表单验证规则
const transactionRules = {
  type: [{ required: true, message: '请选择收支类型', trigger: 'change' }],
  category: [{ required: true, message: '请选择收支分类', trigger: 'change' }],
  date: [{ required: true, message: '请选择交易日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入交易金额', trigger: 'blur' }],
  description: [{ required: true, message: '请输入交易说明', trigger: 'blur' }]
}

// 模拟数据
const overview = ref({
  totalIncome: 2850000,
  totalExpense: 1680000,
  balance: 1170000,
  budgetUsage: 73.5
})

const transactions = ref([
  {
    id: 1,
    date: '2024-12-15',
    type: 'income',
    category: 'government',
    description: '乡村振兴项目补助资金',
    amount: 500000,
    balance: 1170000,
    status: 'approved',
    operator: '张大明',
    attachments: ['补助通知.pdf']
  },
  {
    id: 2,
    date: '2024-12-14',
    type: 'expense',
    category: 'infrastructure',
    description: '村道路硬化工程款',
    amount: 280000,
    balance: 670000,
    status: 'approved',
    operator: '李红梅',
    attachments: ['工程合同.pdf', '验收报告.pdf']
  },
  {
    id: 3,
    date: '2024-12-13',
    type: 'expense',
    category: 'public_service',
    description: '文化礼堂设备采购',
    amount: 85000,
    balance: 585000,
    status: 'pending',
    operator: '王小强',
    attachments: []
  }
])

const budgets = ref([
  {
    id: 1,
    name: '基础设施建设',
    budget: 2000000,
    used: 1450000,
    remaining: 550000,
    usage: 72.5,
    period: '2024年度',
    manager: '张大明'
  },
  {
    id: 2,
    name: '公共服务支出',
    budget: 800000,
    used: 520000,
    remaining: 280000,
    usage: 65.0,
    period: '2024年度',
    manager: '李红梅'
  },
  {
    id: 3,
    name: '行政办公经费',
    budget: 300000,
    used: 298000,
    remaining: 2000,
    usage: 99.3,
    period: '2024年度',
    manager: '王小强'
  }
])

const reports = ref([
  {
    id: 1,
    name: '2024年12月财务月报',
    type: '月度报表',
    period: '2024年12月',
    createTime: '2024-12-15T10:30:00',
    size: '2.5MB'
  },
  {
    id: 2,
    name: '2024年度财务年报',
    type: '年度报表',
    period: '2024年',
    createTime: '2024-11-30T16:45:00',
    size: '8.7MB'
  },
  {
    id: 3,
    name: '第三季度财务分析报告',
    type: '季度报表',
    period: '2024年Q3',
    createTime: '2024-10-05T09:20:00',
    size: '3.2MB'
  }
])

// 计算属性
const filteredTransactions = computed(() => {
  return transactions.value.filter(item => {
    const matchSearch = !searchQuery.transaction ||
      item.description.includes(searchQuery.transaction)
    const matchType = !filterQuery.type || item.type === filterQuery.type
    const matchCategory = !filterQuery.category || item.category === filterQuery.category
    const matchDate = !filterQuery.dateRange.length ||
      (new Date(item.date) >= new Date(filterQuery.dateRange[0]) &&
       new Date(item.date) <= new Date(filterQuery.dateRange[1]))
    return matchSearch && matchType && matchCategory && matchDate
  })
})

const paginatedTransactions = computed(() => {
  const start = (currentPage.transactions - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTransactions.value.slice(start, end)
})

// 方法
const handleTabChange = (tabName) => {
  console.log('切换到标签页:', tabName)
}

const formatAmount = (amount) => {
  return new Intl.NumberFormat('zh-CN').format(amount)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

const getProgressColor = (percentage) => {
  if (percentage > 90) return '#f56c6c'
  if (percentage > 70) return '#e6a23c'
  return '#67c23a'
}

const getBudgetProgressColor = (percentage) => {
  if (percentage > 95) return '#f56c6c'
  if (percentage > 80) return '#e6a23c'
  return '#409eff'
}

const getCategoryText = (category) => {
  const categoryMap = {
    'government': '政府补助',
    'collective': '集体收入',
    'infrastructure': '基础设施',
    'public_service': '公共服务',
    'administrative': '行政支出',
    'welfare': '福利支出',
    'agriculture': '农业支出'
  }
  return categoryMap[category] || category
}

const getStatusColor = (status) => {
  const colorMap = {
    'approved': 'success',
    'pending': 'warning',
    'rejected': 'danger'
  }
  return colorMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'approved': '已审批',
    'pending': '待审批',
    'rejected': '已拒绝'
  }
  return textMap[status] || status
}

const getCategoriesByType = (type) => {
  if (type === 'income') {
    return [
      { label: '政府补助', value: 'government' },
      { label: '集体收入', value: 'collective' },
      { label: '捐赠收入', value: 'donation' },
      { label: '其他收入', value: 'other_income' }
    ]
  } else {
    return [
      { label: '基础设施', value: 'infrastructure' },
      { label: '公共服务', value: 'public_service' },
      { label: '行政支出', value: 'administrative' },
      { label: '福利支出', value: 'welfare' },
      { label: '农业支出', value: 'agriculture' }
    ]
  }
}

const searchTransactions = () => {
  currentPage.transactions = 1
}

const handleSelectionChange = (selection) => {
  selectedTransactions.value = selection
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.transactions = 1
}

const handleCurrentChange = (page) => {
  currentPage.transactions = page
}

const showTransactionDialog = () => {
  resetTransactionForm()
  transactionDialogVisible.value = true
}

const resetTransactionForm = () => {
  Object.assign(transactionForm, {
    type: 'income',
    category: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    paymentMethod: 'bank',
    attachments: []
  })
}

const handleFileChange = (file, fileList) => {
  transactionForm.attachments = fileList
}

const saveTransaction = async () => {
  if (!transactionFormRef.value) return

  try {
    await transactionFormRef.value.validate()
    saving.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newTransaction = {
      ...transactionForm,
      id: Date.now(),
      balance: overview.value.balance + (transactionForm.type === 'income' ? transactionForm.amount : -transactionForm.amount),
      status: 'pending',
      operator: '当前用户'
    }

    transactions.value.unshift(newTransaction)

    // 更新概览数据
    if (transactionForm.type === 'income') {
      overview.value.totalIncome += transactionForm.amount
    } else {
      overview.value.totalExpense += transactionForm.amount
    }
    overview.value.balance = newTransaction.balance

    ElMessage.success('收支记录保存成功')
    transactionDialogVisible.value = false
  } catch (error) {
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

const viewTransaction = (transaction) => {
  ElMessage.info(`查看收支记录：${transaction.description}`)
}

const editTransaction = (transaction) => {
  Object.assign(transactionForm, transaction)
  transactionDialogVisible.value = true
}

const approveTransaction = async (transaction) => {
  try {
    await ElMessageBox.confirm(
      `确定要审批通过"${transaction.description}"吗？`,
      '确认审批',
      { type: 'warning' }
    )

    transaction.status = 'approved'
    ElMessage.success('审批通过')
  } catch {
    // 用户取消
  }
}

const showBatchApproval = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要批量审批选中的 ${selectedTransactions.value.length} 条记录吗？`,
      '确认批量审批',
      { type: 'warning' }
    )

    selectedTransactions.value.forEach(item => {
      if (item.status === 'pending') {
        item.status = 'approved'
      }
    })

    ElMessage.success(`已批量审批 ${selectedTransactions.value.length} 条记录`)
    selectedTransactions.value = []
  } catch {
    // 用户取消
  }
}

const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedTransactions.value.length} 条记录吗？`,
      '确认删除',
      { type: 'warning' }
    )

    selectedTransactions.value.forEach(item => {
      const index = transactions.value.findIndex(t => t.id === item.id)
      if (index !== -1) {
        transactions.value.splice(index, 1)
      }
    })

    ElMessage.success(`已删除 ${selectedTransactions.value.length} 条记录`)
    selectedTransactions.value = []
  } catch {
    // 用户取消
  }
}

const showBudgetDialog = () => {
  budgetDialogVisible.value = true
  ElMessage.info('预算管理功能开发中...')
}

const viewBudgetDetail = (budget) => {
  ElMessage.info(`查看预算详情：${budget.name}`)
}

const editBudgetItem = (budget) => {
  ElMessage.info(`编辑预算：${budget.name}`)
}

const generateMonthlyReport = () => {
  ElMessage.info('生成月度报表...')
}

const generateYearlyReport = () => {
  ElMessage.info('生成年度报表...')
}

const exportReport = () => {
  ElMessage.info('导出报表功能开发中...')
}

const viewReport = (report) => {
  ElMessage.info(`查看报表：${report.name}`)
}

const downloadReport = (report) => {
  ElMessage.info(`下载报表：${report.name}`)
}

const deleteReport = async (report) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除报表"${report.name}"吗？`,
      '确认删除',
      { type: 'warning' }
    )

    const index = reports.value.findIndex(r => r.id === report.id)
    if (index !== -1) {
      reports.value.splice(index, 1)
      ElMessage.success('报表删除成功')
    }
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  console.log('财务管理模块加载完成')
})
</script>

<style lang="scss" scoped>
.finance-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;

  .header-left {
    .page-title {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    .page-description {
      margin: 0;
      color: #606266;
      font-size: 14px;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

.overview-section {
  margin-bottom: 20px;

  .overview-card {
    .card-content {
      display: flex;
      align-items: center;
      gap: 16px;

      .card-icon {
        font-size: 2.5em;
      }

      .card-info {
        flex: 1;

        .card-value {
          font-size: 1.8em;
          font-weight: bold;
          color: #303133;
          line-height: 1.2;
        }

        .card-label {
          color: #606266;
          margin: 4px 0;
        }

        .card-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;

          .trend-icon {
            &.up {
              color: #67c23a;
            }
            &.down {
              color: #f56c6c;
            }
          }
        }

        .card-progress {
          margin-top: 8px;
        }
      }
    }

    &.income .card-icon {
      color: #67c23a;
    }

    &.expense .card-icon {
      color: #f56c6c;
    }

    &.balance .card-icon {
      color: #409eff;
    }

    &.budget .card-icon {
      color: #e6a23c;
    }
  }
}

.finance-tabs {
  :deep(.el-tabs__content) {
    padding: 0;
  }

  .tab-content {
    .search-card {
      margin-bottom: 20px;
    }

    .list-card {
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .card-title {
          font-weight: 600;
          color: #303133;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }
      }

      .income-amount {
        color: #67c23a;
        font-weight: 500;
      }

      .expense-amount {
        color: #f56c6c;
        font-weight: 500;
      }

      .pagination-container {
        margin-top: 20px;
        display: flex;
        justify-content: center;
      }
    }

    .budget-card {
      .budget-list {
        .budget-item {
          border: 1px solid #ebeef5;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;

          .budget-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;

            h4 {
              margin: 0;
              color: #303133;
            }

            .budget-actions {
              display: flex;
              gap: 8px;
            }
          }

          .budget-progress {
            margin-bottom: 16px;

            .progress-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 14px;
              color: #606266;
            }

            .percentage-text {
              font-size: 12px;
              color: #409eff;
            }
          }

          .budget-details {
            border-top: 1px solid #f0f0f0;
            padding-top: 16px;
          }
        }
      }
    }

    .chart-card {
      margin-bottom: 20px;

      .chart-container {
        height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fafafa;
        border-radius: 8px;

        .chart-placeholder {
          text-align: center;
          color: #909399;

          .chart-icon {
            font-size: 3em;
            margin-bottom: 12px;
          }
        }
      }
    }

    .report-card {
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .card-title {
          font-weight: 600;
          color: #303133;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }
      }
    }
  }
}
</style>