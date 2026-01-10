<template>
  <el-dialog
    v-model="visible"
    title="开支详情"
    width="70%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-if="expense" class="expense-detail">
      <!-- 头部信息 -->
      <div class="detail-header">
        <div class="header-left">
          <h3 class="expense-title">{{ expense.expenseTitle }}</h3>
          <div class="expense-meta">
            <el-tag :type="getCategoryColor(expense.expenseCategory)" size="large">
              {{ getCategoryName(expense.expenseCategory) }}
            </el-tag>
            <el-tag :type="getUrgencyColor(expense.urgency)" size="large">
              {{ getUrgencyName(expense.urgency) }}
            </el-tag>
            <el-tag :type="getStatusColor(expense.status)" size="large">
              {{ getStatusName(expense.status) }}
            </el-tag>
          </div>
        </div>
        <div class="header-right">
          <div class="amount-display">
            <span class="amount-label">开支金额</span>
            <span class="amount-value">¥{{ formatCurrency(expense.amount) }}</span>
          </div>
        </div>
      </div>

      <!-- 主要信息卡片 -->
      <el-row :gutter="20">
        <el-col :span="16">
          <!-- 基本信息 -->
          <el-card class="info-card" shadow="never">
            <template #header>
              <span class="card-title">基本信息</span>
            </template>

            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">凭证号码</span>
                <span class="info-value">{{ expense.vouchers?.voucherNumber || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">开支日期</span>
                <span class="info-value">{{ formatDate(expense.expenseDate) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">经手人</span>
                <span class="info-value">
                  {{ expense.handler?.handlerName }}
                  <el-tag v-if="expense.handler?.handlerPosition" size="small" type="info">
                    {{ expense.handler.handlerPosition }}
                  </el-tag>
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">联系电话</span>
                <span class="info-value">{{ expense.handler?.handlerPhone || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">付款方式</span>
                <span class="info-value">{{ getPaymentMethodName(expense.paymentMethod) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">付款账户</span>
                <span class="info-value">{{ expense.paymentAccount || '-' }}</span>
              </div>
              <div v-if="expense.paymentDate" class="info-item">
                <span class="info-label">支付日期</span>
                <span class="info-value">{{ formatDate(expense.paymentDate) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">受益对象</span>
                <span class="info-value">{{ getBeneficiaryName(expense.beneficiary) }}</span>
              </div>
            </div>

            <div v-if="expense.description" class="description-section">
              <h4>开支描述</h4>
              <p class="description-text">{{ expense.description }}</p>
            </div>
          </el-card>

          <!-- 预算信息 -->
          <el-card v-if="expense.budgetInfo" class="info-card" shadow="never">
            <template #header>
              <span class="card-title">预算信息</span>
            </template>

            <div class="budget-info">
              <div class="budget-type">
                <el-icon><Money /></el-icon>
                <span>{{ expense.budgetType === 'budgeted' ? '预算内开支' : '预算外开支' }}</span>
              </div>

              <div v-if="expense.budgetInfo.budgetCategory" class="budget-details">
                <div class="budget-item">
                  <span class="budget-label">预算分类：</span>
                  <span class="budget-value">{{ expense.budgetInfo.budgetCategory }}</span>
                </div>
                <div v-if="expense.budgetInfo.budgetItemName" class="budget-item">
                  <span class="budget-label">预算项目：</span>
                  <span class="budget-value">{{ expense.budgetInfo.budgetItemName }}</span>
                </div>
                <div v-if="expense.budgetInfo.remainingBudget !== undefined" class="budget-item">
                  <span class="budget-label">剩余预算：</span>
                  <span
                    class="budget-value"
                    :class="{ 'over-budget': expense.budgetInfo.isOverBudget }"
                  >
                    ¥{{ formatCurrency(expense.budgetInfo.remainingBudget) }}
                  </span>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 供应商信息 -->
          <el-card v-if="expense.vendor?.vendorName" class="info-card" shadow="never">
            <template #header>
              <span class="card-title">供应商信息</span>
            </template>

            <div class="vendor-info">
              <div class="vendor-header">
                <h4 class="vendor-name">{{ expense.vendor.vendorName }}</h4>
                <el-tag v-if="expense.vendor.isPreferred" type="success" size="small">
                  优选供应商
                </el-tag>
              </div>

              <div class="vendor-details">
                <div v-if="expense.vendor.vendorType" class="vendor-item">
                  <span class="vendor-label">类型：</span>
                  <span class="vendor-value">{{
                    getVendorTypeName(expense.vendor.vendorType)
                  }}</span>
                </div>
                <div v-if="expense.vendor.vendorContact" class="vendor-item">
                  <span class="vendor-label">联系方式：</span>
                  <span class="vendor-value">{{ expense.vendor.vendorContact }}</span>
                </div>
                <div v-if="expense.vendor.vendorAddress" class="vendor-item">
                  <span class="vendor-label">地址：</span>
                  <span class="vendor-value">{{ expense.vendor.vendorAddress }}</span>
                </div>
                <div v-if="expense.vendor.taxId" class="vendor-item">
                  <span class="vendor-label">税务识别号：</span>
                  <span class="vendor-value">{{ expense.vendor.taxId }}</span>
                </div>
                <div v-if="expense.vendor.rating" class="vendor-item">
                  <span class="vendor-label">评级：</span>
                  <el-rate
                    v-model="expense.vendor.rating"
                    disabled
                    show-score
                    text-color="#ff9900"
                    score-template="{value} 分"
                  />
                </div>
              </div>
            </div>
          </el-card>

          <!-- 物品明细 -->
          <el-card
            v-if="expense.items && expense.items.length > 0"
            class="info-card"
            shadow="never"
          >
            <template #header>
              <span class="card-title">物品明细</span>
            </template>

            <el-table :data="expense.items" size="small" border>
              <el-table-column prop="itemName" label="物品名称" />
              <el-table-column prop="specification" label="规格型号" width="120" />
              <el-table-column prop="quantity" label="数量" width="80" align="center" />
              <el-table-column prop="unit" label="单位" width="60" align="center" />
              <el-table-column prop="unitPrice" label="单价" width="100" align="right">
                <template #default="{ row }"> ¥{{ formatCurrency(row.unitPrice) }} </template>
              </el-table-column>
              <el-table-column prop="totalPrice" label="小计" width="120" align="right">
                <template #default="{ row }">
                  <span class="total-price">¥{{ formatCurrency(row.totalPrice) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="urgent" label="紧急" width="60" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.urgent" type="danger" size="small">紧急</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>

        <!-- 右侧信息 -->
        <el-col :span="8">
          <!-- 审批流程 -->
          <el-card class="info-card" shadow="never">
            <template #header>
              <span class="card-title">审批流程</span>
            </template>

            <div class="approval-process">
              <div class="process-current">
                <div class="current-stage">
                  <span class="stage-label">当前状态：</span>
                  <el-tag :type="getStatusColor(expense.status)" size="large">
                    {{ getStatusName(expense.status) }}
                  </el-tag>
                </div>
                <div v-if="expense.approvalProcess?.currentStage" class="current-approver">
                  <span class="stage-label">当前阶段：</span>
                  <span class="stage-value">{{
                    getStageName(expense.approvalProcess.currentStage)
                  }}</span>
                </div>
              </div>

              <div
                v-if="expense.approvalProcess?.approvalHistory?.length > 0"
                class="approval-history"
              >
                <h5>审批历史</h5>
                <el-timeline>
                  <el-timeline-item
                    v-for="(history, index) in expense.approvalProcess.approvalHistory"
                    :key="index"
                    :color="getApprovalColor(history.action)"
                    :timestamp="formatDateTime(history.approvalDate)"
                  >
                    <div class="timeline-item">
                      <div class="timeline-header">
                        <span class="approver-name">{{ history.approverName }}</span>
                        <el-tag :type="getApprovalTagType(history.action)" size="small">
                          {{ getApprovalActionName(history.action) }}
                        </el-tag>
                      </div>
                      <div class="timeline-position">{{ history.approverPosition }}</div>
                      <div v-if="history.comments" class="timeline-comments">
                        {{ history.comments }}
                      </div>
                    </div>
                  </el-timeline-item>
                </el-timeline>
              </div>
            </div>
          </el-card>

          <!-- 定期开支信息 -->
          <el-card v-if="expense.recurringInfo?.isRecurring" class="info-card" shadow="never">
            <template #header>
              <span class="card-title">定期开支</span>
            </template>

            <div class="recurring-info">
              <div class="recurring-item">
                <span class="recurring-label">重复频率：</span>
                <span class="recurring-value">{{
                  getFrequencyName(expense.recurringInfo.frequency)
                }}</span>
              </div>
              <div v-if="expense.recurringInfo.nextDueDate" class="recurring-item">
                <span class="recurring-label">下次到期：</span>
                <span class="recurring-value">{{
                  formatDate(expense.recurringInfo.nextDueDate)
                }}</span>
              </div>
              <div v-if="expense.recurringInfo.recurringAmount" class="recurring-item">
                <span class="recurring-label">定期金额：</span>
                <span class="recurring-value"
                  >¥{{ formatCurrency(expense.recurringInfo.recurringAmount) }}</span
                >
              </div>
              <div class="recurring-item">
                <span class="recurring-label">自动审批：</span>
                <el-tag :type="expense.recurringInfo.autoApprove ? 'success' : 'info'" size="small">
                  {{ expense.recurringInfo.autoApprove ? '启用' : '禁用' }}
                </el-tag>
              </div>
            </div>
          </el-card>

          <!-- 凭证文件 -->
          <el-card v-if="hasVouchers" class="info-card" shadow="never">
            <template #header>
              <span class="card-title">凭证文件</span>
            </template>

            <div class="voucher-files">
              <!-- 发票 -->
              <div v-if="expense.vouchers?.invoices?.length > 0" class="voucher-section">
                <h5>发票 ({{ expense.vouchers.invoices.length }})</h5>
                <div class="file-list">
                  <div
                    v-for="(invoice, index) in expense.vouchers.invoices"
                    :key="index"
                    class="file-item"
                    @click="previewFile(invoice.filePath)"
                  >
                    <el-icon class="file-icon"><Document /></el-icon>
                    <span class="file-name">{{ invoice.invoiceNumber || `发票${index + 1}` }}</span>
                    <span class="file-amount">¥{{ formatCurrency(invoice.amount) }}</span>
                  </div>
                </div>
              </div>

              <!-- 收据 -->
              <div v-if="expense.vouchers?.receipts?.length > 0" class="voucher-section">
                <h5>收据 ({{ expense.vouchers.receipts.length }})</h5>
                <div class="file-list">
                  <div
                    v-for="(receipt, index) in expense.vouchers.receipts"
                    :key="index"
                    class="file-item"
                    @click="previewFile(receipt.filePath)"
                  >
                    <el-icon class="file-icon"><Picture /></el-icon>
                    <span class="file-name">{{ receipt.receiptNumber || `收据${index + 1}` }}</span>
                  </div>
                </div>
              </div>

              <!-- 审批文件 -->
              <div v-if="expense.vouchers?.approvalDocuments?.length > 0" class="voucher-section">
                <h5>审批文件 ({{ expense.vouchers.approvalDocuments.length }})</h5>
                <div class="file-list">
                  <div
                    v-for="(doc, index) in expense.vouchers.approvalDocuments"
                    :key="index"
                    class="file-item"
                    @click="previewFile(doc.filePath)"
                  >
                    <el-icon class="file-icon"><Folder /></el-icon>
                    <span class="file-name">{{ doc.documentType || `文件${index + 1}` }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 其他信息 -->
          <el-card
            v-if="expense.tags?.length > 0 || expense.remarks"
            class="info-card"
            shadow="never"
          >
            <template #header>
              <span class="card-title">其他信息</span>
            </template>

            <div class="other-info">
              <div v-if="expense.tags?.length > 0" class="tags-section">
                <h5>标签</h5>
                <el-tag v-for="tag in expense.tags" :key="tag" size="small" class="tag-item">
                  {{ tag }}
                </el-tag>
              </div>

              <div v-if="expense.remarks" class="remarks-section">
                <h5>备注</h5>
                <p class="remarks-text">{{ expense.remarks }}</p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button v-if="canEdit" type="primary" @click="handleEdit"> 编辑 </el-button>
        <el-button v-if="canApprove" type="success" @click="handleApprove"> 审批 </el-button>
        <el-button v-if="canPay" type="warning" @click="handlePay"> 标记支付 </el-button>
      </div>
    </template>

    <!-- 文件预览对话框 -->
    <el-dialog v-model="showPreview" title="文件预览" width="60%" append-to-body>
      <div class="file-preview">
        <img v-if="isImage(previewFile)" :src="previewFileUrl" alt="预览" />
        <iframe v-else-if="isPdf(previewFile)" :src="previewFileUrl" width="100%" height="500px" />
        <div v-else class="unsupported-file">
          <el-icon size="48"><Document /></el-icon>
          <p>此文件类型不支持预览</p>
          <el-button type="primary" @click="downloadFile">下载文件</el-button>
        </div>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Money, Document, Picture, Folder } from '@element-plus/icons-vue';
import { useUserStore } from '@/store/user';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  expense: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'edit', 'approve', 'pay']);

const userStore = useUserStore();

// 响应式数据
const showPreview = ref(false);
const previewFile = ref('');
const previewFileUrl = ref('');

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const hasVouchers = computed(() => {
  if (!props.expense?.vouchers) return false;
  return (
    props.expense.vouchers.invoices?.length > 0 ||
    props.expense.vouchers.receipts?.length > 0 ||
    props.expense.vouchers.approvalDocuments?.length > 0
  );
});

const canEdit = computed(() => {
  if (!props.expense) return false;
  return (
    ['draft', 'pending_approval'].includes(props.expense.status) &&
    (props.expense.handler?.handlerId === userStore.user._id ||
      userStore.hasPermission('daily_expense_management', 'update'))
  );
});

const canApprove = computed(() => {
  if (!props.expense) return false;
  return (
    props.expense.status === 'pending_approval' &&
    userStore.hasPermission('daily_expense_management', 'approve')
  );
});

const canPay = computed(() => {
  if (!props.expense) return false;
  return (
    props.expense.status === 'approved' &&
    userStore.hasPermission('daily_expense_management', 'pay')
  );
});

// 方法
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

const formatDateTime = date => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

// 获取各种显示名称的方法
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

const getPaymentMethodName = method => {
  const methodMap = {
    cash: '现金',
    bank_transfer: '银行转账',
    credit_card: '信用卡',
    alipay: '支付宝',
    wechat_pay: '微信支付',
    check: '支票',
    other: '其他',
  };
  return methodMap[method] || method;
};

const getBeneficiaryName = beneficiary => {
  const beneficiaryMap = {
    village_committee: '村委会',
    public_service: '公共服务',
    infrastructure: '基础设施',
    residents: '村民',
    visitors: '访客',
    other: '其他',
  };
  return beneficiaryMap[beneficiary] || beneficiary;
};

const getVendorTypeName = type => {
  const typeMap = {
    individual: '个人',
    company: '公司',
    government: '政府机构',
    ngo: '非营利组织',
  };
  return typeMap[type] || type;
};

const getStageName = stage => {
  const stageMap = {
    pending: '待处理',
    village_director: '村主任审批',
    village_secretary: '村支书审批',
    completed: '已完成',
    rejected: '已拒绝',
  };
  return stageMap[stage] || stage;
};

const getApprovalActionName = action => {
  const actionMap = {
    approve: '批准',
    reject: '拒绝',
    request_info: '要求补充信息',
  };
  return actionMap[action] || action;
};

const getApprovalColor = action => {
  const colorMap = {
    approve: '#67c23a',
    reject: '#f56c6c',
    request_info: '#e6a23c',
  };
  return colorMap[action] || '#909399';
};

const getApprovalTagType = action => {
  const typeMap = {
    approve: 'success',
    reject: 'danger',
    request_info: 'warning',
  };
  return typeMap[action] || 'info';
};

const getFrequencyName = frequency => {
  const frequencyMap = {
    daily: '每日',
    weekly: '每周',
    monthly: '每月',
    quarterly: '每季度',
    yearly: '每年',
  };
  return frequencyMap[frequency] || frequency;
};

const previewFile = filePath => {
  previewFile.value = filePath;
  previewFileUrl.value = `/api/files/${filePath}`;
  showPreview.value = true;
};

const isImage = filePath => {
  return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filePath);
};

const isPdf = filePath => {
  return /\.pdf$/i.test(filePath);
};

const downloadFile = () => {
  window.open(previewFileUrl.value, '_blank');
};

const handleEdit = () => {
  emit('edit', props.expense);
};

const handleApprove = () => {
  emit('approve', props.expense);
};

const handlePay = () => {
  emit('pay', props.expense);
};

const handleClose = () => {
  visible.value = false;
};
</script>

<style scoped>
.expense-detail {
  padding: 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
}

.header-left {
  flex: 1;
}

.expense-title {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.expense-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.header-right {
  text-align: right;
}

.amount-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.amount-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 4px;
}

.amount-value {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
}

.info-card {
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid #f0f2f5;
}

.card-title {
  font-weight: 600;
  color: #303133;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f2f5;
}

.info-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
  min-width: 80px;
}

.info-value {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
  text-align: right;
  flex: 1;
  margin-left: 12px;
}

.description-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f2f5;
}

.description-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
}

.description-text {
  margin: 0;
  color: #606266;
  line-height: 1.6;
  background-color: #fafafa;
  padding: 16px;
  border-radius: 8px;
}

.budget-info {
  padding: 0;
}

.budget-type {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 16px;
}

.budget-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.budget-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f0f9ff;
  border-radius: 6px;
}

.budget-label {
  font-size: 14px;
  color: #0277bd;
}

.budget-value {
  font-size: 14px;
  font-weight: 600;
  color: #01579b;
}

.over-budget {
  color: #f56c6c !important;
}

.vendor-info {
  padding: 0;
}

.vendor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.vendor-name {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.vendor-details {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.vendor-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #fafafa;
  border-radius: 6px;
}

.vendor-label {
  font-size: 14px;
  color: #606266;
  min-width: 80px;
}

.vendor-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.total-price {
  font-weight: 600;
  color: #409eff;
}

.approval-process {
  padding: 0;
}

.process-current {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f0f9ff;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.current-stage,
.current-approver {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.current-approver:last-child {
  margin-bottom: 0;
}

.stage-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.stage-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.approval-history h5 {
  margin: 0 0 16px 0;
  color: #303133;
}

.timeline-item {
  padding: 0;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.approver-name {
  font-weight: 600;
  color: #303133;
}

.timeline-position {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.timeline-comments {
  font-size: 14px;
  color: #606266;
  background-color: #fafafa;
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 8px;
}

.recurring-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recurring-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f0f9ff;
  border-radius: 6px;
}

.recurring-label {
  font-size: 14px;
  color: #0277bd;
}

.recurring-value {
  font-size: 14px;
  font-weight: 600;
  color: #01579b;
}

.voucher-files {
  padding: 0;
}

.voucher-section {
  margin-bottom: 16px;
}

.voucher-section:last-child {
  margin-bottom: 0;
}

.voucher-section h5 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 14px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.file-item:hover {
  background-color: #e3f2fd;
  transform: translateX(4px);
}

.file-icon {
  font-size: 20px;
  color: #409eff;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #303133;
}

.file-amount {
  font-size: 14px;
  font-weight: 600;
  color: #67c23a;
}

.other-info {
  padding: 0;
}

.tags-section,
.remarks-section {
  margin-bottom: 16px;
}

.tags-section:last-child,
.remarks-section:last-child {
  margin-bottom: 0;
}

.tags-section h5,
.remarks-section h5 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 14px;
}

.tag-item {
  margin-right: 8px;
  margin-bottom: 8px;
}

.remarks-text {
  margin: 0;
  color: #606266;
  line-height: 1.6;
  background-color: #fafafa;
  padding: 12px;
  border-radius: 6px;
}

.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button {
  margin-left: 12px;
}

.file-preview {
  text-align: center;
}

.file-preview img {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
}

.unsupported-file {
  padding: 40px;
  color: #909399;
}

.unsupported-file p {
  margin: 16px 0;
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;
    text-align: left;
  }

  .header-right {
    text-align: left;
    margin-top: 16px;
  }

  .amount-display {
    align-items: flex-start;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .info-value {
    margin-left: 0;
    text-align: left;
  }

  .timeline-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
