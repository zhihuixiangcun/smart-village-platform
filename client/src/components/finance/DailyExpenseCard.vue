<template>
  <el-card class="expense-card" :class="getCardClass(expense)" shadow="hover">
    <!-- 卡片头部 -->
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <h4 class="expense-title">{{ expense.expenseTitle }}</h4>
          <div class="expense-meta">
            <el-tag :type="getCategoryColor(expense.expenseCategory)" size="small">
              {{ getCategoryName(expense.expenseCategory) }}
            </el-tag>
            <el-tag :type="getUrgencyColor(expense.urgency)" size="small">
              {{ getUrgencyName(expense.urgency) }}
            </el-tag>
          </div>
        </div>
        <div class="header-right">
          <el-tag :type="getStatusColor(expense.status)" size="small">
            {{ getStatusName(expense.status) }}
          </el-tag>
        </div>
      </div>
    </template>

    <!-- 卡片内容 -->
    <div class="card-content">
      <!-- 金额显示 -->
      <div class="amount-section">
        <div class="amount-label">开支金额</div>
        <div class="amount-value">¥{{ formatCurrency(expense.amount) }}</div>
      </div>

      <!-- 基本信息 -->
      <div class="info-section">
        <div class="info-row">
          <span class="info-label">凭证号：</span>
          <span class="info-value">{{ expense.vouchers?.voucherNumber || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">经手人：</span>
          <span class="info-value">{{ expense.handler?.handlerName || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">开支日期：</span>
          <span class="info-value">{{ formatDate(expense.expenseDate) }}</span>
        </div>
        <div v-if="expense.paymentDate" class="info-row">
          <span class="info-label">支付日期：</span>
          <span class="info-value">{{ formatDate(expense.paymentDate) }}</span>
        </div>
      </div>

      <!-- 预算信息 -->
      <div v-if="expense.budgetInfo" class="budget-section">
        <div class="budget-badge">
          <el-icon><Money /></el-icon>
          <span>{{ expense.budgetType === 'budgeted' ? '预算内' : '预算外' }}</span>
        </div>
        <div v-if="expense.budgetInfo.budgetCategory" class="budget-category">
          {{ expense.budgetInfo.budgetCategory }}
        </div>
      </div>

      <!-- 描述信息 -->
      <div v-if="expense.description" class="description-section">
        <div class="description-text">
          {{ truncateText(expense.description, 80) }}
        </div>
      </div>

      <!-- 定期开支标识 -->
      <div v-if="expense.recurringInfo?.isRecurring" class="recurring-badge">
        <el-icon><Clock /></el-icon>
        <span>定期开支 ({{ getFrequencyName(expense.recurringInfo.frequency) }})</span>
      </div>

      <!-- 紧急标识 -->
      <div v-if="expense.urgency === 'emergency'" class="emergency-badge">
        <el-icon><Warning /></el-icon>
        <span>紧急开支</span>
      </div>
    </div>

    <!-- 卡片底部操作 -->
    <template #footer>
      <div class="card-actions">
        <el-button-group>
          <el-button size="small" @click="$emit('view', expense)">
            <el-icon><View /></el-icon>
            查看
          </el-button>
          <el-button 
            size="small" 
            type="primary" 
            @click="$emit('edit', expense)"
            v-if="canEdit"
          >
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-dropdown @command="handleAction">
            <el-button size="small">
              更多<el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item 
                  command="approve" 
                  v-if="expense.status === 'pending_approval' && canApprove"
                >
                  <el-icon><Check /></el-icon>
                  审批
                </el-dropdown-item>
                <el-dropdown-item 
                  command="pay" 
                  v-if="expense.status === 'approved' && canPay"
                >
                  <el-icon><CreditCard /></el-icon>
                  标记支付
                </el-dropdown-item>
                <el-dropdown-item command="duplicate">
                  <el-icon><DocumentCopy /></el-icon>
                  复制开支
                </el-dropdown-item>
                <el-dropdown-item 
                  command="delete" 
                  v-if="expense.status === 'draft' && canDelete"
                  divided
                >
                  <el-icon><Delete /></el-icon>
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-button-group>
      </div>
    </template>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { 
  Money, Clock, Warning, View, Edit, ArrowDown, Check, 
  CreditCard, DocumentCopy, Delete 
} from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'

const props = defineProps({
  expense: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['view', 'edit', 'approve', 'pay', 'delete'])

const userStore = useUserStore()

// 权限计算
const canEdit = computed(() => {
  return ['draft', 'pending_approval'].includes(props.expense.status) &&
         (props.expense.handler?.handlerId === userStore.user._id || 
          userStore.hasPermission('daily_expense_management', 'update'))
})

const canApprove = computed(() => {
  return userStore.hasPermission('daily_expense_management', 'approve')
})

const canPay = computed(() => {
  return userStore.hasPermission('daily_expense_management', 'pay')
})

const canDelete = computed(() => {
  return props.expense.status === 'draft' &&
         (props.expense.handler?.handlerId === userStore.user._id || 
          userStore.hasPermission('daily_expense_management', 'delete'))
})

// 方法
const handleAction = (command) => {
  emit(command, props.expense)
}

const getCardClass = (expense) => {
  const classes = []
  
  if (expense.urgency === 'emergency') {
    classes.push('emergency-card')
  }
  
  if (expense.status === 'rejected') {
    classes.push('rejected-card')
  }
  
  if (expense.recurringInfo?.isRecurring) {
    classes.push('recurring-card')
  }
  
  return classes.join(' ')
}

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0.00'
  return Number(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const getCategoryName = (category) => {
  const categoryMap = {
    'office_supplies': '办公用品',
    'utilities': '水电费',
    'communication': '通讯费',
    'transportation': '交通费',
    'accommodation': '住宿费',
    'meals_entertainment': '餐费接待',
    'maintenance': '维修保养',
    'training': '培训费',
    'conference': '会议费',
    'printing': '印刷费',
    'postal': '邮寄费',
    'cleaning': '清洁费',
    'security': '安保费',
    'insurance': '保险费',
    'fuel': '燃料费',
    'medical': '医疗费',
    'emergency': '应急开支',
    'other': '其他'
  }
  return categoryMap[category] || category
}

const getCategoryColor = (category) => {
  const colorMap = {
    'office_supplies': '',
    'utilities': 'warning',
    'communication': 'info',
    'transportation': 'success',
    'emergency': 'danger',
    'other': 'info'
  }
  return colorMap[category] || ''
}

const getStatusName = (status) => {
  const statusMap = {
    'draft': '草稿',
    'pending_approval': '待审批',
    'approved': '已批准',
    'paid': '已支付',
    'rejected': '已拒绝',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}

const getStatusColor = (status) => {
  const colorMap = {
    'draft': 'info',
    'pending_approval': 'warning',
    'approved': 'success',
    'paid': 'primary',
    'rejected': 'danger',
    'cancelled': 'info'
  }
  return colorMap[status] || ''
}

const getUrgencyName = (urgency) => {
  const urgencyMap = {
    'routine': '常规',
    'urgent': '紧急',
    'emergency': '应急'
  }
  return urgencyMap[urgency] || urgency
}

const getUrgencyColor = (urgency) => {
  const colorMap = {
    'routine': '',
    'urgent': 'warning',
    'emergency': 'danger'
  }
  return colorMap[urgency] || ''
}

const getFrequencyName = (frequency) => {
  const frequencyMap = {
    'daily': '每日',
    'weekly': '每周',
    'monthly': '每月',
    'quarterly': '每季度',
    'yearly': '每年'
  }
  return frequencyMap[frequency] || frequency
}
</script>

<style scoped>
.expense-card {
  margin-bottom: 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.expense-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.emergency-card {
  border-left: 4px solid #f56c6c;
}

.rejected-card {
  background-color: #fef5e7;
  border-color: #e6a23c;
}

.recurring-card {
  border-left: 4px solid #409eff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
}

.expense-title {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.expense-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.header-right {
  margin-left: 16px;
}

.card-content {
  padding: 0;
}

.amount-section {
  text-align: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f2f5;
  margin-bottom: 16px;
}

.amount-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.amount-value {
  font-size: 24px;
  font-weight: 700;
  color: #409eff;
}

.info-section {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 13px;
  color: #606266;
  min-width: 60px;
}

.info-value {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  text-align: right;
  flex: 1;
  margin-left: 12px;
}

.budget-section {
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #e1f5fe;
}

.budget-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #0277bd;
  font-weight: 500;
  margin-bottom: 4px;
}

.budget-category {
  font-size: 11px;
  color: #546e7a;
}

.description-section {
  margin-bottom: 16px;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 8px;
}

.description-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.recurring-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 8px;
}

.emergency-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 8px;
}

.card-actions {
  display: flex;
  justify-content: center;
}

.card-actions .el-button-group {
  width: 100%;
}

.card-actions .el-button {
  flex: 1;
  border-radius: 0;
}

.card-actions .el-button:first-child {
  border-radius: 6px 0 0 6px;
}

.card-actions .el-button:last-child {
  border-radius: 0 6px 6px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .header-right {
    margin-left: 0;
    align-self: flex-start;
  }
  
  .expense-title {
    font-size: 14px;
  }
  
  .amount-value {
    font-size: 20px;
  }
  
  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .info-value {
    margin-left: 0;
    text-align: left;
  }
}
</style>