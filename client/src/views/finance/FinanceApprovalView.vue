<template>
  <div class="finance-approval">
    <!-- 离线管理器 -->
    <offline-manager />

    <!-- 面包屑导航 -->
    <breadcrumb />

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <el-icon><DocumentChecked /></el-icon>
            审批管理
          </h1>
          <p class="page-subtitle">流程审批 • 权限管控 • 状态跟踪 • 历史记录</p>
        </div>
        <div class="header-right">
          <el-button @click="showBatchApproval" type="primary" icon="Select">
            批量审批
          </el-button>
          <el-button @click="exportApprovalReport" icon="Download">
            导出报告
          </el-button>
          <el-button @click="showApprovalSettings" icon="Setting">
            流程设置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 审批统计面板 -->
    <div class="approval-stats">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card pending">
            <div class="stat-icon">
              <el-icon size="32"><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ approvalStats.pendingCount }}</div>
              <div class="stat-label">待我审批</div>
              <div class="stat-action">
                <el-button type="text" @click="filterByStatus('pending')">立即处理</el-button>
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card processing">
            <div class="stat-icon">
              <el-icon size="32"><Loading /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ approvalStats.processingCount }}</div>
              <div class="stat-label">审批中</div>
              <div class="stat-action">
                <el-button type="text" @click="filterByStatus('processing')">查看详情</el-button>
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card completed">
            <div class="stat-icon">
              <el-icon size="32"><CircleCheck /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ approvalStats.completedCount }}</div>
              <div class="stat-label">今日已审</div>
              <div class="stat-action">
                <el-button type="text" @click="filterByStatus('completed')">查看记录</el-button>
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card efficiency">
            <div class="stat-icon">
              <el-icon size="32"><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ approvalStats.avgProcessTime }}h</div>
              <div class="stat-label">平均处理时间</div>
              <div class="stat-action">
                <el-progress :percentage="approvalStats.efficiency" :show-text="false" />
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 快速操作区域 -->
    <el-card shadow="never" class="quick-actions">
      <template #header>
        <span>快速操作</span>
      </template>
      <el-row :gutter="20">
        <el-col :span="6">
          <el-button
            @click="quickApproveAll"
            type="success"
            icon="Select"
            :disabled="!pendingApprovals.length"
            style="width: 100%"
          >
            一键通过小额支出
            <br>
            <small>(≤1000元，共{{ smallAmountCount }}项)</small>
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button
            @click="showBulkReject"
            type="warning"
            icon="Close"
            style="width: 100%"
          >
            批量驳回
            <br>
            <small>选择多项进行批量操作</small>
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button
            @click="showDelegateApproval"
            type="info"
            icon="User"
            style="width: 100%"
          >
            委托审批
            <br>
            <small>临时授权他人审批</small>
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button
            @click="showApprovalTemplate"
            icon="Document"
            style="width: 100%"
          >
            常用模板
            <br>
            <small>快速填写审批意见</small>
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 筛选区域 -->
    <el-card shadow="never" class="filter-card">
      <el-form :model="filterForm" inline class="filter-form">
        <el-form-item label="审批状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable>
            <el-option label="待审批" value="pending" />
            <el-option label="审批中" value="processing" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已撤回" value="withdrawn" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请类型">
          <el-select v-model="filterForm.type" placeholder="全部类型" clearable>
            <el-option label="支出申请" value="expense" />
            <el-option label="预算调整" value="budget" />
            <el-option label="资金转移" value="transfer" />
            <el-option label="其他申请" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额范围">
          <el-select v-model="filterForm.amountRange" placeholder="全部金额" clearable>
            <el-option label="≤1,000元" value="small" />
            <el-option label="1,001-10,000元" value="medium" />
            <el-option label="10,001-50,000元" value="large" />
            <el-option label=">50,000元" value="xlarge" />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="filterForm.priority" placeholder="全部" clearable>
            <el-option label="紧急" value="urgent" />
            <el-option label="普通" value="normal" />
            <el-option label="较低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="filterApprovals" type="primary" icon="Search">筛选</el-button>
          <el-button @click="resetFilter" icon="Refresh">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 审批列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="table-header">
          <span>审批列表 ({{ pagination.total }} 项)</span>
          <div class="header-actions">
            <el-button
              size="small"
              type="success"
              :disabled="!selectedApprovals.length"
              @click="batchApprove"
              icon="Select"
            >
              批量通过 ({{ selectedApprovals.length }})
            </el-button>
            <el-button
              size="small"
              type="warning"
              :disabled="!selectedApprovals.length"
              @click="batchReject"
              icon="Close"
            >
              批量驳回 ({{ selectedApprovals.length }})
            </el-button>
            <el-button size="small" @click="refreshApprovals" icon="Refresh">
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        ref="approvalTable"
        :data="approvals"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        stripe
        border
        style="width: 100%"
        height="500"
      >
        <el-table-column type="selection" width="50" fixed="left" />

        <el-table-column prop="id" label="申请编号" width="120" fixed="left">
          <template #default="scope">
            <el-button type="text" @click="viewApprovalDetail(scope.row)">
              {{ scope.row.id }}
            </el-button>
          </template>
        </el-table-column>

        <el-table-column prop="title" label="申请标题" min-width="200">
          <template #default="scope">
            <div class="approval-title">
              <div class="title-text">{{ scope.row.title }}</div>
              <div class="title-meta">
                <el-tag v-if="scope.row.priority === 'urgent'" type="danger" size="small">紧急</el-tag>
                <el-tag v-if="scope.row.isOverdue" type="warning" size="small">超时</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="applicant" label="申请人" width="100" />

        <el-table-column prop="amount" label="申请金额" width="120" sortable>
          <template #default="scope">
            <span class="amount-text">¥{{ formatMoney(scope.row.amount) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="type" label="申请类型" width="100">
          <template #default="scope">
            <el-tag :type="getTypeColor(scope.row.type)" size="small">
              {{ getTypeText(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="审批状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusColor(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="submitTime" label="提交时间" width="150" sortable>
          <template #default="scope">
            {{ formatDateTime(scope.row.submitTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="pendingTime" label="待审时长" width="100">
          <template #default="scope">
            <span :class="getPendingTimeClass(scope.row.pendingHours)">
              {{ scope.row.pendingHours }}h
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="currentStep" label="当前节点" width="120">
          <template #default="scope">
            <div class="approval-step">
              <el-steps :active="scope.row.currentStep" size="small" simple>
                <el-step title="提交" />
                <el-step title="初审" />
                <el-step title="终审" />
                <el-step title="完成" />
              </el-steps>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-space>
              <el-button
                type="primary"
                size="small"
                @click="viewApprovalDetail(scope.row)"
                icon="View"
              >
                详情
              </el-button>
              <el-button
                v-if="canApprove(scope.row)"
                type="success"
                size="small"
                @click="approveItem(scope.row)"
                icon="Check"
              >
                审批
              </el-button>
              <el-dropdown @command="(cmd) => handleRowAction(cmd, scope.row)">
                <el-button size="small" icon="MoreFilled" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="canApprove(scope.row)" command="approve" icon="Check">
                      通过
                    </el-dropdown-item>
                    <el-dropdown-item v-if="canApprove(scope.row)" command="reject" icon="Close">
                      驳回
                    </el-dropdown-item>
                    <el-dropdown-item command="history" icon="Clock">
                      审批历史
                    </el-dropdown-item>
                    <el-dropdown-item command="flow" icon="Share">
                      流程图
                    </el-dropdown-item>
                    <el-dropdown-item v-if="canWithdraw(scope.row)" command="withdraw" icon="Back" divided>
                      撤回申请
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

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

    <!-- AI智能审批助手 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <!-- 原有的审批列表保持不变 -->
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="smart-approval-card">
          <template #header>
            <div class="card-header">
              <span>🤖 AI审批助手</span>
              <el-switch
                v-model="smartApprovalEnabled"
                active-text="启用"
                inactive-text="禁用"
                size="small"
              />
            </div>
          </template>
          <smart-approval-widget
            v-if="smartApprovalEnabled"
            :application="selectedApprovalForAI"
            :loading="smartApprovalLoading"
            @approve="handleSmartApprove"
            @reject="handleSmartReject"
            @request-info="handleSmartRequestInfo"
            @start-review="handleSmartStartReview"
            @refresh="refreshSmartApproval"
          />
          <div v-else class="disabled-ai">
            <el-empty description="AI审批助手已禁用">
              <el-button type="primary" @click="smartApprovalEnabled = true">
                启用AI助手
              </el-button>
            </el-empty>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 审批详情对话框 -->
    <approval-detail-dialog
      v-model="detailDialogVisible"
      :approval="currentApproval"
      @action="handleApprovalAction"
    />

    <!-- 批量审批对话框 -->
    <batch-approval-dialog
      v-model="batchApprovalVisible"
      :approvals="selectedApprovals"
      @success="refreshApprovals"
    />

    <!-- 审批操作对话框 -->
    <approval-action-dialog
      v-model="actionDialogVisible"
      :approval="currentApproval"
      :action="currentAction"
      @confirm="confirmApprovalAction"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  DocumentChecked, Clock, Loading, CircleCheck, TrendCharts,
  Select, Close, User, Document, Search, Refresh, View,
  Check, MoreFilled, Share, Back
} from '@element-plus/icons-vue'

// 导入组件
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import OfflineManager from '@/components/common/OfflineManager.vue'
import ApprovalDetailDialog from './components/ApprovalDetailDialog.vue'
import BatchApprovalDialog from './components/BatchApprovalDialog.vue'
import ApprovalActionDialog from './components/ApprovalActionDialog.vue'
import SmartApprovalWidget from '@/components/finance/SmartApprovalWidget.vue'

// 导入API
import { financeAPI } from '@/api/finance'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const approvals = ref([])
const selectedApprovals = ref([])
const currentApproval = ref(null)
const currentAction = ref('')

// 智能审批相关状态
const smartApprovalEnabled = ref(true)
const smartApprovalLoading = ref(false)
const selectedApprovalForAI = ref(null)

// 对话框状态
const detailDialogVisible = ref(false)
const batchApprovalVisible = ref(false)
const actionDialogVisible = ref(false)

// 审批统计
const approvalStats = reactive({
  pendingCount: 8,
  processingCount: 12,
  completedCount: 15,
  avgProcessTime: 2.5,
  efficiency: 85
})

// 筛选表单
const filterForm = reactive({
  status: '',
  type: '',
  amountRange: '',
  priority: ''
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表格引用
const approvalTable = ref()

// 计算属性
const pendingApprovals = computed(() => {
  return approvals.value.filter(item => item.status === 'pending')
})

const smallAmountCount = computed(() => {
  return pendingApprovals.value.filter(item => item.amount <= 1000).length
})

// 方法
const loadApprovals = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 模拟数据
    approvals.value = [
      {
        id: 'APP202501001',
        title: '村道维修费用申请',
        applicant: '张建设',
        amount: 25000,
        type: 'expense',
        status: 'pending',
        priority: 'urgent',
        submitTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
        pendingHours: 4,
        currentStep: 1,
        isOverdue: false
      },
      {
        id: 'APP202501002',
        title: '春节文艺演出经费',
        applicant: '李文化',
        amount: 8000,
        type: 'expense',
        status: 'processing',
        priority: 'normal',
        submitTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        pendingHours: 24,
        currentStep: 2,
        isOverdue: true
      },
      {
        id: 'APP202501003',
        title: '办公用品采购申请',
        applicant: '王会计',
        amount: 3500,
        type: 'expense',
        status: 'approved',
        priority: 'normal',
        submitTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        pendingHours: 6,
        currentStep: 4,
        isOverdue: false
      },
      {
        id: 'APP202501004',
        title: '预算调整申请',
        applicant: '赵财务',
        amount: 50000,
        type: 'budget',
        status: 'pending',
        priority: 'normal',
        submitTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
        pendingHours: 6,
        currentStep: 1,
        isOverdue: false
      },
      {
        id: 'APP202501005',
        title: '清洁用品购买',
        applicant: '孙清洁',
        amount: 420,
        type: 'expense',
        status: 'rejected',
        priority: 'low',
        submitTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        pendingHours: 2,
        currentStep: 1,
        isOverdue: false
      }
    ]

    pagination.total = 35
    updateApprovalStats()

  } catch (error) {
    ElMessage.error('加载审批数据失败')
  } finally {
    loading.value = false
  }
}

const updateApprovalStats = () => {
  approvalStats.pendingCount = approvals.value.filter(item => item.status === 'pending').length
  approvalStats.processingCount = approvals.value.filter(item => item.status === 'processing').length
  approvalStats.completedCount = approvals.value.filter(item =>
    item.status === 'approved' && isToday(item.submitTime)
  ).length
}

const isToday = (date) => {
  const today = new Date()
  const checkDate = new Date(date)
  return today.toDateString() === checkDate.toDateString()
}

const filterByStatus = (status) => {
  filterForm.status = status
  filterApprovals()
}

const filterApprovals = () => {
  console.log('筛选审批:', filterForm)
  loadApprovals()
}

const resetFilter = () => {
  Object.assign(filterForm, {
    status: '',
    type: '',
    amountRange: '',
    priority: ''
  })
  loadApprovals()
}

const refreshApprovals = () => {
  loadApprovals()
}

const handleSelectionChange = (selection) => {
  selectedApprovals.value = selection
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadApprovals()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
  loadApprovals()
}

const viewApprovalDetail = (approval) => {
  currentApproval.value = approval
  detailDialogVisible.value = true
}

const approveItem = (approval) => {
  currentApproval.value = approval
  currentAction.value = 'approve'
  actionDialogVisible.value = true
}

const quickApproveAll = async () => {
  const smallAmountItems = pendingApprovals.value.filter(item => item.amount <= 1000)

  if (smallAmountItems.length === 0) {
    ElMessage.warning('没有小额支出申请需要审批')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要一键通过 ${smallAmountItems.length} 项小额支出申请吗？`,
      '批量审批确认',
      {
        confirmButtonText: '确定通过',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    // 执行批量审批
    for (const item of smallAmountItems) {
      item.status = 'approved'
      item.currentStep = 4
    }

    ElMessage.success(`已通过 ${smallAmountItems.length} 项小额支出申请`)
    updateApprovalStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量审批失败')
    }
  }
}

const showBatchApproval = () => {
  batchApprovalVisible.value = true
}

const showBulkReject = () => {
  if (selectedApprovals.value.length === 0) {
    ElMessage.warning('请先选择要驳回的申请')
    return
  }
  currentAction.value = 'reject'
  batchApprovalVisible.value = true
}

const showDelegateApproval = () => {
  ElMessage.info('委托审批功能开发中...')
}

const showApprovalTemplate = () => {
  ElMessage.info('审批模板功能开发中...')
}

const exportApprovalReport = () => {
  ElMessage.success('导出报告功能开发中...')
}

const showApprovalSettings = () => {
  ElMessage.info('审批设置功能开发中...')
}

const batchApprove = () => {
  if (selectedApprovals.value.length === 0) {
    ElMessage.warning('请选择要审批的申请')
    return
  }
  currentAction.value = 'approve'
  batchApprovalVisible.value = true
}

const batchReject = () => {
  if (selectedApprovals.value.length === 0) {
    ElMessage.warning('请选择要驳回的申请')
    return
  }
  currentAction.value = 'reject'
  batchApprovalVisible.value = true
}

const handleRowAction = async (command, approval) => {
  currentApproval.value = approval

  switch (command) {
    case 'approve':
      currentAction.value = 'approve'
      actionDialogVisible.value = true
      break
    case 'reject':
      currentAction.value = 'reject'
      actionDialogVisible.value = true
      break
    case 'history':
      ElMessage.info('审批历史功能开发中...')
      break
    case 'flow':
      ElMessage.info('流程图功能开发中...')
      break
    case 'withdraw':
      await withdrawApproval(approval)
      break
  }
}

const withdrawApproval = async (approval) => {
  try {
    await ElMessageBox.confirm(
      `确定要撤回申请 ${approval.id} 吗？撤回后需要重新提交。`,
      '撤回确认',
      {
        confirmButtonText: '确定撤回',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    approval.status = 'withdrawn'
    ElMessage.success('申请已撤回')
    updateApprovalStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('撤回失败')
    }
  }
}

const handleApprovalAction = (action) => {
  currentAction.value = action
  actionDialogVisible.value = true
}

const confirmApprovalAction = (actionData) => {
  const { action, comment } = actionData

  if (action === 'approve') {
    currentApproval.value.status = 'approved'
    currentApproval.value.currentStep = 4
    ElMessage.success('审批通过')
  } else if (action === 'reject') {
    currentApproval.value.status = 'rejected'
    ElMessage.success('已驳回申请')
  }

const confirmApprovalAction = (actionData) => {
  const { action, comment } = actionData

  if (action === 'approve') {
    currentApproval.value.status = 'approved'
    currentApproval.value.currentStep = 4
    ElMessage.success('审批通过')
  } else if (action === 'reject') {
    currentApproval.value.status = 'rejected'
    ElMessage.success('已驳回申请')
  }

  actionDialogVisible.value = false
  updateApprovalStats()
}

// 智能审批相关方法
const handleSmartApprove = async (approvalData) => {
  const { type, suggestion, comment } = approvalData

  try {
    // 显示确认对话框
    await ElMessageBox.confirm(
      `${comment}\n\n确定要执行AI建议的审批操作吗？`,
      'AI审批建议',
      {
        confirmButtonText: '确定执行',
        cancelButtonText: '取消',
        type: 'info',
        customClass: 'smart-approval-confirm'
      }
    )

    // 执行审批操作
    if (selectedApprovalForAI.value) {
      selectedApprovalForAI.value.status = 'approved'
      selectedApprovalForAI.value.currentStep = 4
      selectedApprovalForAI.value.aiApproved = true
      selectedApprovalForAI.value.aiComment = comment

      ElMessage.success(`AI审批通过: ${selectedApprovalForAI.value.title}`)
      updateApprovalStats()

      // 记录AI审批日志
      recordAIApprovalLog(selectedApprovalForAI.value, 'approve', suggestion)
    }
  } catch {
    // 用户取消操作
  }
}

const handleSmartReject = async (rejectionData) => {
  const { suggestion, reason } = rejectionData

  try {
    await ElMessageBox.confirm(
      `${reason}\n\n确定要执行AI建议的拒绝操作吗？`,
      'AI审批建议',
      {
        confirmButtonText: '确定拒绝',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    if (selectedApprovalForAI.value) {
      selectedApprovalForAI.value.status = 'rejected'
      selectedApprovalForAI.value.aiRejected = true
      selectedApprovalForAI.value.aiComment = reason

      ElMessage.warning(`AI建议拒绝: ${selectedApprovalForAI.value.title}`)
      updateApprovalStats()

      recordAIApprovalLog(selectedApprovalForAI.value, 'reject', suggestion)
    }
  } catch {
    // 用户取消操作
  }
}

const handleSmartRequestInfo = (requestData) => {
  const { suggestion, requiredInfo } = requestData

  ElMessage.info('AI建议补充以下信息：\n' + requiredInfo.join('\n'))

  // 这里可以打开一个对话框来请求补充信息
  // 实际项目中会有专门的补充信息流程
}

const handleSmartStartReview = (reviewData) => {
  const { suggestion, reviewType } = reviewData

  currentApproval.value = selectedApprovalForAI.value
  currentAction.value = 'review'
  actionDialogVisible.value = true

  ElMessage.info(`AI建议进行${reviewType === 'detailed' ? '详细' : '常规'}审核`)
}

const refreshSmartApproval = () => {
  smartApprovalLoading.value = true
  setTimeout(() => {
    smartApprovalLoading.value = false
    ElMessage.success('AI建议已刷新')
  }, 1000)
}

// 记录AI审批日志
const recordAIApprovalLog = (approval, action, suggestion) => {
  const log = {
    approvalId: approval.id,
    action,
    aiSuggestion: suggestion,
    timestamp: new Date(),
    userId: userStore.user.id,
    riskScore: suggestion.riskScore,
    confidence: suggestion.recommendation.confidence
  }

  console.log('AI审批日志:', log)
  // 实际项目中会保存到后端
}

// 选择审批项时更新AI建议
const viewApprovalDetail = (approval) => {
  currentApproval.value = approval
  selectedApprovalForAI.value = approval // 同时更新AI选择的审批项
  detailDialogVisible.value = true
}

const approveItem = (approval) => {
  currentApproval.value = approval
  selectedApprovalForAI.value = approval // 同时更新AI选择的审批项
  currentAction.value = 'approve'
  actionDialogVisible.value = true
}

// 权限检查方法
const canApprove = (approval) => {
  return approval.status === 'pending' && userStore.hasPermission('finance:approve')
}

const canWithdraw = (approval) => {
  return approval.status === 'pending' &&
         (approval.applicant === userStore.user.name || userStore.hasPermission('finance:withdraw'))
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

const getTypeColor = (type) => {
  const colorMap = {
    expense: 'primary',
    budget: 'success',
    transfer: 'warning',
    other: 'info'
  }
  return colorMap[type] || 'default'
}

const getTypeText = (type) => {
  const textMap = {
    expense: '支出申请',
    budget: '预算调整',
    transfer: '资金转移',
    other: '其他申请'
  }
  return textMap[type] || '未知'
}

const getStatusColor = (status) => {
  const colorMap = {
    pending: 'warning',
    processing: 'info',
    approved: 'success',
    rejected: 'danger',
    withdrawn: 'default'
  }
  return colorMap[status] || 'default'
}

const getStatusText = (status) => {
  const textMap = {
    pending: '待审批',
    processing: '审批中',
    approved: '已通过',
    rejected: '已拒绝',
    withdrawn: '已撤回'
  }
  return textMap[status] || '未知'
}

const getPendingTimeClass = (hours) => {
  if (hours > 24) return 'text-danger'
  if (hours > 8) return 'text-warning'
  return 'text-success'
}

// 生命周期
onMounted(() => {
  loadApprovals()
})
</script>

<style lang="scss" scoped>
.finance-approval {
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

  .approval-stats {
    margin-bottom: 20px;

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 20px;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }

      &.pending {
        border-left: 4px solid #e6a23c;
      }

      &.processing {
        border-left: 4px solid #409eff;
      }

      &.completed {
        border-left: 4px solid #67c23a;
      }

      &.efficiency {
        border-left: 4px solid #f56c6c;
      }

      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(230, 162, 60, 0.1);
        color: #e6a23c;
      }

      .stat-content {
        flex: 1;

        .stat-number {
          font-size: 32px;
          font-weight: bold;
          color: #303133;
          margin-bottom: 4px;
        }

        .stat-label {
          color: #606266;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .stat-action {
          .el-button--text {
            padding: 0;
            font-size: 12px;
          }
        }
      }
    }
  }

  .quick-actions {
    margin-bottom: 20px;

    .el-button {
      height: 80px;
      line-height: 1.2;

      small {
        opacity: 0.7;
        font-size: 11px;
      }
    }
  }

  .filter-card {
    margin-bottom: 20px;

    .filter-form {
      .el-form-item {
        margin-bottom: 0;
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

  .approval-title {
    .title-text {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .title-meta {
      display: flex;
      gap: 4px;
    }
  }

  .amount-text {
    font-weight: 500;
    color: #f56c6c;
  }

  .approval-step {
    .el-steps {
      width: 100px;
    }
  }

  .text-danger {
    color: #f56c6c;
    font-weight: 500;
  }

  .text-warning {
    color: #e6a23c;
    font-weight: 500;
  }

  .text-success {
    color: #67c23a;
    font-weight: 500;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .finance-approval {
    padding: 10px;

    .page-header {
      .header-content {
        flex-direction: column;
        gap: 20px;
        text-align: center;

        .header-right {
          flex-wrap: wrap;
          justify-content: center;
        }
      }
    }

    .approval-stats {
      .el-col {
        margin-bottom: 20px;
      }
    }

    .quick-actions {
      .el-col {
        margin-bottom: 12px;
      }

      .el-button {
        height: 60px;
      }
    }

    .filter-form {
      .el-form-item {
        width: 100%;
        margin-bottom: 16px;
      }
    }
  }
}
</style>