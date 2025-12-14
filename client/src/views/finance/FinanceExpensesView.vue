<template>
  <div class="finance-expenses mobile-navigation mobile-scroll-container">
    <!-- 离线管理器 -->
    <offline-manager />

    <!-- 面包屑导航 -->
    <breadcrumb />

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <el-icon><ShoppingCart /></el-icon>
            支出管理
          </h1>
          <p class="page-subtitle">流水记录 • 支出审批 • 费用统计 • 票据管理</p>
        </div>
        <div class="header-right">
          <el-button
            ref="addExpenseBtn"
            @click="handleAddExpense"
            type="primary"
            icon="Plus"
            class="touchable">
            <span class="btn-text">新增支出</span>
          </el-button>
          <el-button
            ref="uploadBtn"
            @click="handleBatchUpload"
            type="success"
            icon="Upload"
            class="touchable">
            <span class="btn-text">批量导入</span>
          </el-button>
          <el-button
            ref="exportBtn"
            @click="handleExportExpenses"
            icon="Download"
            class="touchable">
            <span class="btn-text">导出记录</span>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 搜索过滤区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="支出类型">
          <el-select v-model="searchForm.category" placeholder="全部类型" clearable>
            <el-option label="基础设施" value="infrastructure" />
            <el-option label="日常运营" value="operation" />
            <el-option label="文化活动" value="culture" />
            <el-option label="人员工资" value="salary" />
            <el-option label="办公用品" value="office" />
            <el-option label="其他支出" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="支出状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
            <el-option label="待审批" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已支付" value="paid" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额范围">
          <el-input-number
            v-model="searchForm.amountMin"
            placeholder="最小金额"
            :min="0"
            controls-position="right"
            style="width: 120px; margin-right: 8px;"
          />
          <span style="margin: 0 8px;">至</span>
          <el-input-number
            v-model="searchForm.amountMax"
            placeholder="最大金额"
            :min="0"
            controls-position="right"
            style="width: 120px;"
          />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="searchExpenses" type="primary" icon="Search">搜索</el-button>
          <el-button @click="resetSearch" icon="Refresh">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 支出统计概览 -->
    <div class="expense-stats">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-icon total">
              <el-icon size="32"><Money /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">¥{{ formatMoney(expenseStats.totalAmount) }}</div>
              <div class="stat-label">总支出金额</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-icon pending">
              <el-icon size="32"><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ expenseStats.pendingCount }}</div>
              <div class="stat-label">待审批数量</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-icon monthly">
              <el-icon size="32"><Calendar /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">¥{{ formatMoney(expenseStats.monthlyAmount) }}</div>
              <div class="stat-label">本月支出</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-icon average">
              <el-icon size="32"><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">¥{{ formatMoney(expenseStats.averageAmount) }}</div>
              <div class="stat-label">平均单笔</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 支出记录表格 -->
    <el-card shadow="never">
      <template #header>
        <div class="table-header">
          <span>支出记录 ({{ pagination.total }} 条)</span>
          <div class="header-actions">
            <el-button
              size="small"
              type="danger"
              :disabled="!selectedExpenses.length"
              @click="batchDeleteExpenses"
              icon="Delete"
            >
              批量删除 ({{ selectedExpenses.length }})
            </el-button>
            <el-button size="small" @click="refreshExpenses" icon="Refresh">
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 移动端支出列表 -->
      <div v-if="isMobile" class="mobile-expense-list">
        <div
          v-for="expense in expenses"
          :key="expense.id"
          class="mobile-swipe-card expense-item-mobile"
          :class="{ swiping: swipeStates[expense.id]?.isActive }"
          @touchstart="(e) => handleSwipeStart(e, expense.id)"
          @touchmove="(e) => handleSwipeMove(e, expense.id)"
          @touchend="(e) => handleSwipeEnd(e, expense.id, expense)"
        >
          <div class="swipe-actions">
            <button
              v-if="canDelete(expense)"
              class="action-btn delete-btn"
              @click="deleteExpense(expense)"
            >
              删除
            </button>
            <button
              v-if="canApprove(expense)"
              class="action-btn approve-btn"
              @click="quickApprove(expense)"
            >
              审批
            </button>
          </div>

          <div
            class="swipe-content"
            :style="{ transform: `translateX(${swipeStates[expense.id]?.x || 0}px)` }"
            @click="viewExpenseDetail(expense)"
          >
            <div class="expense-header">
              <div class="expense-id">{{ expense.id }}</div>
              <div class="expense-amount">¥{{ formatMoney(expense.amount) }}</div>
            </div>
            <div class="expense-body">
              <div class="expense-description">{{ expense.description }}</div>
              <div class="expense-meta">
                <el-tag :type="getCategoryType(expense.category)" size="small">
                  {{ getCategoryText(expense.category) }}
                </el-tag>
                <el-tag :type="getStatusType(expense.status)" size="small">
                  {{ getStatusText(expense.status) }}
                </el-tag>
              </div>
            </div>
            <div class="expense-footer">
              <span class="expense-date">{{ formatDateTime(expense.submitTime) }}</span>
              <span class="expense-applicant">{{ expense.applicant }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 桌面端表格 -->
      <el-table
        v-else
        ref="expenseTable"
        :data="expenses"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        stripe
        border
        style="width: 100%"
        height="500"
        class="mobile-table"
      >
        <el-table-column type="selection" width="50" fixed="left" />

        <el-table-column prop="id" label="流水号" width="120" fixed="left">
          <template #default="scope">
            <el-button type="text" @click="viewExpenseDetail(scope.row)" class="touchable">
              {{ scope.row.id }}
            </el-button>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="支出说明" min-width="200" />

        <el-table-column prop="category" label="支出类型" width="120">
          <template #default="scope">
            <el-tag :type="getCategoryType(scope.row.category)" size="small">
              {{ getCategoryText(scope.row.category) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="amount" label="支出金额" width="120" sortable>
          <template #default="scope">
            <span class="amount-text">¥{{ formatMoney(scope.row.amount) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="applicant" label="申请人" width="100" />

        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="submitTime" label="申请时间" width="150" sortable>
          <template #default="scope">
            {{ formatDateTime(scope.row.submitTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="approver" label="审批人" width="100">
          <template #default="scope">
            <span v-if="scope.row.approver">{{ scope.row.approver }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="receipt" label="票据" width="80">
          <template #default="scope">
            <el-button
              v-if="scope.row.receipt"
              type="text"
              size="small"
              @click="viewReceipt(scope.row)"
              icon="Document"
            >
              查看
            </el-button>
            <span v-else class="text-muted">无</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-space>
              <el-button
                type="primary"
                size="small"
                @click="viewExpenseDetail(scope.row)"
                icon="View"
              >
                详情
              </el-button>
              <el-button
                v-if="canEdit(scope.row)"
                type="success"
                size="small"
                @click="editExpense(scope.row)"
                icon="Edit"
              >
                编辑
              </el-button>
              <el-dropdown @command="(cmd) => handleRowAction(cmd, scope.row)">
                <el-button size="small" icon="MoreFilled" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="canApprove(scope.row)" command="approve" icon="Check">
                      审批
                    </el-dropdown-item>
                    <el-dropdown-item v-if="scope.row.receipt" command="receipt" icon="Document">
                      票据管理
                    </el-dropdown-item>
                    <el-dropdown-item command="copy" icon="CopyDocument">
                      复制记录
                    </el-dropdown-item>
                    <el-dropdown-item command="history" icon="Clock">
                      操作记录
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="canDelete(scope.row)"
                      command="delete"
                      icon="Delete"
                      divided
                    >
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <!-- 移动端固定底部操作栏 -->
      <div v-if="isMobile && selectedExpenses.length > 0" class="mobile-fixed-actions">
        <div class="action-buttons">
          <el-button
            type="danger"
            @click="batchDeleteExpenses"
            class="touchable">
            删除 ({{ selectedExpenses.length }})
          </el-button>
          <el-button
            type="success"
            @click="batchApprove"
            class="touchable">
            批量审批
          </el-button>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑支出对话框 -->
    <expense-form-dialog
      v-model="expenseDialogVisible"
      :expense="currentExpense"
      :mode="dialogMode"
      @confirm="handleExpenseSave"
    />

    <!-- 支出详情对话框 -->
    <expense-detail-dialog
      v-model="detailDialogVisible"
      :expense="currentExpense"
    />

    <!-- 票据查看对话框 -->
    <receipt-viewer-dialog
      v-model="receiptViewerVisible"
      :expense="currentExpense"
    />

    <!-- 批量上传对话框 -->
    <batch-upload-dialog
      v-model="batchUploadVisible"
      @success="refreshExpenses"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ShoppingCart, Plus, Upload, Download, Search, Refresh,
  Money, Clock, Calendar, TrendCharts, View, Edit, MoreFilled,
  Check, Document, CopyDocument, Delete
} from '@element-plus/icons-vue'

// 导入组件
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import OfflineManager from '@/components/common/OfflineManager.vue'
import ExpenseFormDialog from './components/ExpenseFormDialog.vue'
import ExpenseDetailDialog from './components/ExpenseDetailDialog.vue'
import ReceiptViewerDialog from './components/ReceiptViewerDialog.vue'
import BatchUploadDialog from './components/BatchUploadDialog.vue'

// 导入API和移动端功能
import { financeAPI } from '@/api/finance'
import { useOfflineStorage } from '@/composables/useOfflineStorage'
import { useUserStore } from '@/stores/user'
import { useMobileTouch, useSwipeAction, useTouchEnhancement } from '@/composables/useMobileTouch'

const userStore = useUserStore()

// 移动端功能初始化
const { isMobile, touchDevice, hapticFeedback } = useMobileTouch()
const { enhanceButton } = useTouchEnhancement()

// 左滑功能状态管理
const swipeStates = ref({})
const swipeThreshold = 80

// 初始化滑动状态
const initSwipeState = (expenseId) => {
  if (!swipeStates.value[expenseId]) {
    swipeStates.value[expenseId] = {
      x: 0,
      isActive: false,
      startX: 0,
      isDragging: false
    }
  }
  return swipeStates.value[expenseId]
}

// 左滑操作处理
const handleSwipeStart = (event, expenseId) => {
  const state = initSwipeState(expenseId)
  state.startX = event.touches[0].clientX
  state.isDragging = true
  state.isActive = true

  // 重置其他卡片的滑动状态
  Object.keys(swipeStates.value).forEach(id => {
    if (id !== expenseId) {
      swipeStates.value[id].x = 0
      swipeStates.value[id].isActive = false
    }
  })
}

const handleSwipeMove = (event, expenseId) => {
  const state = swipeStates.value[expenseId]
  if (!state || !state.isDragging) return

  const currentX = event.touches[0].clientX
  const deltaX = currentX - state.startX

  // 只允许向左滑动
  if (deltaX < 0) {
    state.x = Math.max(deltaX, -swipeThreshold)
  }

  // 防止页面滚动
  event.preventDefault()
}

const handleSwipeEnd = (event, expenseId, expense) => {
  const state = swipeStates.value[expenseId]
  if (!state) return

  state.isDragging = false
  state.isActive = false

  // 判断是否触发操作
  if (Math.abs(state.x) > swipeThreshold / 2) {
    state.x = -swipeThreshold // 完全展开操作区域
    hapticFeedback('light') // 触觉反馈
  } else {
    state.x = 0 // 回弹
  }
}

// 快速审批
const quickApprove = async (expense) => {
  try {
    await ElMessageBox.confirm(
      `确定要快速通过支出申请 ${expense.id} 吗？`,
      '快速审批',
      {
        confirmButtonText: '确定通过',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    expense.status = 'approved'
    hapticFeedback('success')
    ElMessage.success('审批通过')

    // 重置滑动状态
    if (swipeStates.value[expense.id]) {
      swipeStates.value[expense.id].x = 0
    }
  } catch {
    // 取消操作
  }
}

// 批量审批
const batchApprove = () => {
  if (selectedExpenses.value.length === 0) {
    ElMessage.warning('请选择要审批的申请')
    return
  }

  hapticFeedback('medium')
  ElMessage.info('批量审批功能开发中...')
}

// 按钮点击处理（添加触觉反馈）
const handleAddExpense = () => {
  hapticFeedback('light')
  showAddExpense()
}

const handleBatchUpload = () => {
  hapticFeedback('light')
  showBatchUpload()
}

const handleExportExpenses = () => {
  hapticFeedback('light')
  exportExpenses()
}
import { financeAPI } from '@/api/finance'
import { useOfflineStorage } from '@/composables/useOfflineStorage'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 离线存储初始化
const {
  isOnline,
  saveToOfflineStorage,
  getFromOfflineStorage,
  deleteFromOfflineStorage
} = useOfflineStorage({
  keyPrefix: 'expenses',
  autoSync: true,
  syncInterval: 30000
})

// 响应式数据
const loading = ref(false)
const expenses = ref([])
const selectedExpenses = ref([])
const currentExpense = ref(null)
const dialogMode = ref('add')

// 对话框状态
const expenseDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const receiptViewerVisible = ref(false)
const batchUploadVisible = ref(false)

// 搜索表单
const searchForm = reactive({
  category: '',
  status: '',
  amountMin: null,
  amountMax: null,
  dateRange: []
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 支出统计
const expenseStats = reactive({
  totalAmount: 2450000,
  pendingCount: 8,
  monthlyAmount: 145000,
  averageAmount: 12500
})

// 表格引用
const expenseTable = ref()

// 计算属性
const filteredExpenses = computed(() => {
  return expenses.value // 在实际项目中会根据搜索条件过滤
})

// 方法
const loadExpenses = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 模拟数据
    expenses.value = [
      {
        id: 'EXP202501001',
        description: '村道维修费用',
        category: 'infrastructure',
        amount: 25000,
        applicant: '张建设',
        status: 'pending',
        submitTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        approver: null,
        receipt: true
      },
      {
        id: 'EXP202501002',
        description: '春节文艺演出费用',
        category: 'culture',
        amount: 8000,
        applicant: '李文化',
        status: 'approved',
        submitTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        approver: '王主任',
        receipt: true
      },
      {
        id: 'EXP202501003',
        description: '办公用品采购',
        category: 'office',
        amount: 3500,
        applicant: '王会计',
        status: 'paid',
        submitTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        approver: '张支书',
        receipt: true
      },
      {
        id: 'EXP202501004',
        description: '路灯维护费',
        category: 'operation',
        amount: 1200,
        applicant: '赵电工',
        status: 'approved',
        submitTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        approver: '王主任',
        receipt: false
      },
      {
        id: 'EXP202501005',
        description: '清洁用品购买',
        category: 'office',
        amount: 420,
        applicant: '孙清洁',
        status: 'rejected',
        submitTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        approver: '张支书',
        receipt: false
      }
    ]

    pagination.total = 25
    updateExpenseStats()

  } catch (error) {
    ElMessage.error('加载支出数据失败')
  } finally {
    loading.value = false
  }
}

const updateExpenseStats = () => {
  // 实际项目中从API获取统计数据
  expenseStats.totalAmount = expenses.value.reduce((sum, exp) => sum + exp.amount, 0)
  expenseStats.pendingCount = expenses.value.filter(exp => exp.status === 'pending').length
  expenseStats.monthlyAmount = 145000
  expenseStats.averageAmount = Math.round(expenseStats.totalAmount / expenses.value.length)
}

const searchExpenses = () => {
  console.log('搜索支出:', searchForm)
  loadExpenses()
}

const resetSearch = () => {
  Object.assign(searchForm, {
    category: '',
    status: '',
    amountMin: null,
    amountMax: null,
    dateRange: []
  })
  loadExpenses()
}

const refreshExpenses = () => {
  loadExpenses()
}

const showAddExpense = () => {
  currentExpense.value = null
  dialogMode.value = 'add'
  expenseDialogVisible.value = true
}

const showBatchUpload = () => {
  batchUploadVisible.value = true
}

const exportExpenses = () => {
  ElMessage.success('导出功能开发中...')
}

const handleSelectionChange = (selection) => {
  selectedExpenses.value = selection
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadExpenses()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
  loadExpenses()
}

const viewExpenseDetail = (expense) => {
  currentExpense.value = expense
  detailDialogVisible.value = true
}

const editExpense = (expense) => {
  currentExpense.value = expense
  dialogMode.value = 'edit'
  expenseDialogVisible.value = true
}

const viewReceipt = (expense) => {
  currentExpense.value = expense
  receiptViewerVisible.value = true
}

const handleRowAction = async (command, expense) => {
  currentExpense.value = expense

  switch (command) {
    case 'approve':
      // 跳转到审批页面
      break
    case 'receipt':
      receiptViewerVisible.value = true
      break
    case 'copy':
      await copyExpense(expense)
      break
    case 'history':
      ElMessage.info('操作记录功能开发中...')
      break
    case 'delete':
      await deleteExpense(expense)
      break
  }
}

const copyExpense = async (expense) => {
  const copiedExpense = {
    ...expense,
    id: null,
    status: 'pending',
    submitTime: new Date(),
    approver: null,
    description: `${expense.description} (副本)`
  }
  currentExpense.value = copiedExpense
  dialogMode.value = 'add'
  expenseDialogVisible.value = true
}

const deleteExpense = async (expense) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除支出记录 ${expense.id} 吗？删除后无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 支持离线操作
    if (isOnline.value) {
      const response = await financeAPI.deleteExpense(expense.id)
      if (response.success) {
        await deleteFromOfflineStorage('expenses', expense.id)
        ElMessage.success('删除成功')
        loadExpenses()
      }
    } else {
      await deleteFromOfflineStorage('expenses', expense.id)
      ElMessage.success('删除操作已记录，将在网络恢复时同步')
      loadExpenses()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const batchDeleteExpenses = async () => {
  if (!selectedExpenses.value.length) {
    ElMessage.warning('请选择要删除的支出记录')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedExpenses.value.length} 条支出记录吗？删除后无法恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const deletePromises = selectedExpenses.value.map(async (expense) => {
      if (isOnline.value) {
        const response = await financeAPI.deleteExpense(expense.id)
        if (response.success) {
          await deleteFromOfflineStorage('expenses', expense.id)
        }
        return response
      } else {
        await deleteFromOfflineStorage('expenses', expense.id)
        return { success: true }
      }
    })

    await Promise.all(deletePromises)

    ElMessage.success(`批量删除完成：${selectedExpenses.value.length} 条记录`)
    selectedExpenses.value = []
    loadExpenses()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

const handleExpenseSave = () => {
  expenseDialogVisible.value = false
  loadExpenses()
}

// 权限检查方法
const canEdit = (expense) => {
  return expense.status === 'pending' &&
         (expense.applicant === userStore.user.name || userStore.hasPermission('finance:write'))
}

const canApprove = (expense) => {
  return expense.status === 'pending' && userStore.hasPermission('finance:approve')
}

const canDelete = (expense) => {
  return expense.status === 'pending' &&
         (expense.applicant === userStore.user.name || userStore.hasPermission('finance:delete'))
}

// 工具方法
const formatMoney = (amount) => {
  return new Intl.NumberFormat('zh-CN').format(amount)
}

const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const getCategoryType = (category) => {
  const typeMap = {
    infrastructure: 'primary',
    operation: 'success',
    culture: 'warning',
    salary: 'info',
    office: 'default',
    other: 'default'
  }
  return typeMap[category] || 'default'
}

const getCategoryText = (category) => {
  const textMap = {
    infrastructure: '基础设施',
    operation: '日常运营',
    culture: '文化活动',
    salary: '人员工资',
    office: '办公用品',
    other: '其他支出'
  }
  return textMap[category] || '未知'
}

const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    paid: 'info'
  }
  return typeMap[status] || 'default'
}

const getStatusText = (status) => {
  const textMap = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝',
    paid: '已支付'
  }
  return textMap[status] || '未知'
}

// 生命周期
onMounted(() => {
  loadExpenses()
})
</script>

<style lang="scss" scoped>
.finance-expenses {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;

  .page-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 20px;
    color: white;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        .page-title {
          font-size: 28px;
          font-weight: bold;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .page-subtitle {
          font-size: 14px;
          opacity: 0.9;
          margin: 0;
        }
      }

      .header-right {
        display: flex;
        gap: 12px;
      }
    }
  }

  .search-card {
    margin-bottom: 20px;

    .search-form {
      .el-form-item {
        margin-bottom: 0;
      }
    }
  }

  .expense-stats {
    margin-bottom: 20px;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        &.total { background: rgba(64, 158, 255, 0.1); color: #409eff; }
        &.pending { background: rgba(230, 162, 60, 0.1); color: #e6a23c; }
        &.monthly { background: rgba(103, 194, 58, 0.1); color: #67c23a; }
        &.average { background: rgba(245, 108, 108, 0.1); color: #f56c6c; }
      }

      .stat-content {
        .stat-number {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
          margin-bottom: 4px;
        }

        .stat-label {
          color: #606266;
          font-size: 14px;
        }
      }
    }
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-actions {
      display: flex;
      gap: 8px;
    }
  }

  .amount-text {
    font-weight: 500;
    color: #f56c6c;
  }

  .text-muted {
    color: #909399;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .finance-expenses {
    padding: 10px;

    .page-header {
      .header-content {
        flex-direction: column;
        gap: 20px;
        text-align: center;

        .header-right {
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;

          .el-button {
            flex: 1;
            min-width: 120px;
            min-height: 44px;

            .btn-text {
              display: inline;
            }
          }
        }
      }
    }

    .expense-stats {
      .el-col {
        margin-bottom: 12px;
      }
    }

    .search-form {
      .el-form-item {
        width: 100%;
        margin-bottom: 16px;

        .el-input__inner,
        .el-select {
          font-size: 16px;
          min-height: 44px;
        }
      }
    }
  }
}

// 移动端支出列表样式
.mobile-expense-list {
  .expense-item-mobile {
    position: relative;
    overflow: hidden;
    margin-bottom: 12px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    &.swiping {
      .swipe-content {
        transition: none;
      }
    }

    .swipe-actions {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      z-index: 1;

      .action-btn {
        color: white;
        border: none;
        padding: 0 20px;
        height: 100%;
        min-width: 80px;
        font-size: 14px;
        font-weight: 500;

        &.delete-btn {
          background: #f56c6c;
        }

        &.approve-btn {
          background: #67c23a;
        }

        &:active {
          opacity: 0.8;
        }
      }
    }

    .swipe-content {
      background: white;
      padding: 16px;
      position: relative;
      z-index: 2;
      transition: transform 0.3s ease;

      .expense-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .expense-id {
          font-size: 14px;
          color: #409eff;
          font-weight: 500;
        }

        .expense-amount {
          font-size: 18px;
          font-weight: bold;
          color: #f56c6c;
        }
      }

      .expense-body {
        margin-bottom: 12px;

        .expense-description {
          font-size: 16px;
          color: #303133;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .expense-meta {
          display: flex;
          gap: 8px;
        }
      }

      .expense-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #909399;

        .expense-applicant {
          font-weight: 500;
        }
      }
    }
  }
}

// 移动端固定底部操作栏样式
.mobile-fixed-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 12px 16px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  border-top: 1px solid #ebeef5;
  z-index: 1000;

  .action-buttons {
    display: flex;
    gap: 12px;

    .el-button {
      flex: 1;
      min-height: 44px;
      font-size: 16px;
    }
  }
}

// 触觉反馈动画
.touchable {
  transition: transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;

  &:active {
    transform: scale(0.98);
  }
}

// 触觉反馈样式类
.haptic-feedback {
  transition: transform 0.1s ease;

  &.feedback-light {
    animation: haptic-light 0.1s ease;
  }

  &.feedback-medium {
    animation: haptic-medium 0.15s ease;
  }

  &.feedback-heavy {
    animation: haptic-heavy 0.2s ease;
  }

  &.feedback-success {
    animation: haptic-success 0.3s ease;
  }
}

@keyframes haptic-light {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.99); }
}

@keyframes haptic-medium {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.97); }
}

@keyframes haptic-heavy {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.95); }
}

@keyframes haptic-success {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.05); }
  50% { transform: scale(0.98); }
  75% { transform: scale(1.02); }
}

// 按钮文字在小屏幕隐藏
@media (max-width: 480px) {
  .header-right .el-button .btn-text {
    display: none;
  }

  .mobile-expense-list .expense-item-mobile .swipe-content {
    padding: 12px;

    .expense-header .expense-amount {
      font-size: 16px;
    }

    .expense-body .expense-description {
      font-size: 14px;
    }
  }
}
</style>