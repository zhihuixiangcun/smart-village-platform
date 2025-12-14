<template>
  <el-dialog
    v-model="visible"
    title="编辑日常开支"
    width="60%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="edit-expense-dialog">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        @submit.prevent="handleSubmit"
      >
        <!-- 编辑提示 -->
        <el-alert
          v-if="expense"
          :title="`正在编辑开支：${expense.expenseTitle}`"
          type="info"
          :closable="false"
          show-icon
          class="edit-alert"
        />

        <!-- 基本信息 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <span class="section-title">基本信息</span>
          </template>
          
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="开支标题" prop="expenseTitle">
                <el-input
                  v-model="form.expenseTitle"
                  placeholder="请输入开支标题"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="开支分类" prop="expenseCategory">
                <el-select v-model="form.expenseCategory" placeholder="选择开支分类" class="full-width">
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
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="子分类">
                <el-input v-model="form.subCategory" placeholder="子分类（可选）" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="开支金额" prop="amount">
                <el-input-number
                  v-model="form.amount"
                  :precision="2"
                  :min="0"
                  :max="999999.99"
                  placeholder="0.00"
                  class="full-width"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="开支日期" prop="expenseDate">
                <el-date-picker
                  v-model="form.expenseDate"
                  type="date"
                  placeholder="选择开支日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  class="full-width"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="紧急程度">
                <el-radio-group v-model="form.urgency">
                  <el-radio label="routine">常规</el-radio>
                  <el-radio label="urgent">紧急</el-radio>
                  <el-radio label="emergency">应急</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="预算类型">
                <el-radio-group v-model="form.budgetType">
                  <el-radio label="budgeted">预算内</el-radio>
                  <el-radio label="unbudgeted">预算外</el-radio>
                  <el-radio label="emergency">应急</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="开支描述">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="请详细描述开支用途和情况"
              maxlength="1000"
              show-word-limit
            />
          </el-form-item>
        </el-card>

        <!-- 付款信息 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <span class="section-title">付款信息</span>
          </template>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="付款方式">
                <el-select v-model="form.paymentMethod" placeholder="选择付款方式" class="full-width">
                  <el-option label="现金" value="cash" />
                  <el-option label="银行转账" value="bank_transfer" />
                  <el-option label="信用卡" value="credit_card" />
                  <el-option label="支付宝" value="alipay" />
                  <el-option label="微信支付" value="wechat_pay" />
                  <el-option label="支票" value="check" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="付款账户">
                <el-input v-model="form.paymentAccount" placeholder="付款账户（可选）" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="受益对象">
                <el-select v-model="form.beneficiary" placeholder="选择受益对象" class="full-width">
                  <el-option label="村委会" value="village_committee" />
                  <el-option label="公共服务" value="public_service" />
                  <el-option label="基础设施" value="infrastructure" />
                  <el-option label="村民" value="residents" />
                  <el-option label="访客" value="visitors" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="受益详情">
                <el-input v-model="form.beneficiaryDetails" placeholder="受益对象详情（可选）" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

        <!-- 供应商信息 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <span class="section-title">供应商信息</span>
          </template>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="供应商名称">
                <el-input v-model="form.vendor.vendorName" placeholder="供应商名称" />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="供应商类型">
                <el-select v-model="form.vendor.vendorType" placeholder="选择类型" class="full-width">
                  <el-option label="个人" value="individual" />
                  <el-option label="公司" value="company" />
                  <el-option label="政府机构" value="government" />
                  <el-option label="非营利组织" value="ngo" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="联系方式">
                <el-input v-model="form.vendor.vendorContact" placeholder="电话/邮箱" />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="税务识别号">
                <el-input v-model="form.vendor.taxId" placeholder="税务识别号（可选）" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="供应商地址">
            <el-input v-model="form.vendor.vendorAddress" placeholder="供应商地址" />
          </el-form-item>
        </el-card>

        <!-- 物品详情 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <div class="section-header">
              <span class="section-title">物品/服务详情</span>
              <el-button type="primary" size="small" @click="addItem">
                <el-icon><Plus /></el-icon>
                添加物品
              </el-button>
            </div>
          </template>
          
          <div v-if="form.items.length === 0" class="empty-items">
            <el-empty description="暂无物品信息" :image-size="80" />
          </div>
          
          <div v-else class="items-list">
            <div v-for="(item, index) in form.items" :key="index" class="item-row">
              <el-row :gutter="12" align="middle">
                <el-col :span="5">
                  <el-input v-model="item.itemName" placeholder="物品名称" size="small" />
                </el-col>
                <el-col :span="4">
                  <el-input v-model="item.specification" placeholder="规格" size="small" />
                </el-col>
                <el-col :span="3">
                  <el-input-number
                    v-model="item.quantity"
                    :min="0"
                    :precision="2"
                    placeholder="数量"
                    size="small"
                    class="full-width"
                  />
                </el-col>
                <el-col :span="2">
                  <el-input v-model="item.unit" placeholder="单位" size="small" />
                </el-col>
                <el-col :span="3">
                  <el-input-number
                    v-model="item.unitPrice"
                    :min="0"
                    :precision="2"
                    placeholder="单价"
                    size="small"
                    class="full-width"
                    @change="calculateItemTotal(item)"
                  />
                </el-col>
                <el-col :span="3">
                  <el-input-number
                    v-model="item.totalPrice"
                    :min="0"
                    :precision="2"
                    placeholder="小计"
                    size="small"
                    class="full-width"
                    disabled
                  />
                </el-col>
                <el-col :span="4">
                  <el-button type="danger" size="small" @click="removeItem(index)">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </el-col>
              </el-row>
            </div>
          </div>
        </el-card>

        <!-- 定期开支设置 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <div class="section-header">
              <span class="section-title">定期开支设置</span>
              <el-switch
                v-model="form.recurringInfo.isRecurring"
                active-text="启用定期开支"
                @change="handleRecurringToggle"
              />
            </div>
          </template>
          
          <div v-if="form.recurringInfo.isRecurring">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="重复频率">
                  <el-select v-model="form.recurringInfo.frequency" placeholder="选择频率" class="full-width">
                    <el-option label="每日" value="daily" />
                    <el-option label="每周" value="weekly" />
                    <el-option label="每月" value="monthly" />
                    <el-option label="每季度" value="quarterly" />
                    <el-option label="每年" value="yearly" />
                  </el-select>
                </el-form-item>
              </el-col>
              
              <el-col :span="12">
                <el-form-item label="下次到期">
                  <el-date-picker
                    v-model="form.recurringInfo.nextDueDate"
                    type="date"
                    placeholder="下次到期日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    class="full-width"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="定期金额">
                  <el-input-number
                    v-model="form.recurringInfo.recurringAmount"
                    :precision="2"
                    :min="0"
                    placeholder="定期开支金额"
                    class="full-width"
                  />
                </el-form-item>
              </el-col>
              
              <el-col :span="12">
                <el-form-item label="自动审批">
                  <el-switch
                    v-model="form.recurringInfo.autoApprove"
                    active-text="启用"
                    inactive-text="禁用"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-card>

        <!-- 其他信息 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <span class="section-title">其他信息</span>
          </template>
          
          <el-form-item label="标签">
            <el-tag
              v-for="tag in form.tags"
              :key="tag"
              closable
              @close="removeTag(tag)"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="tagInputVisible"
              ref="tagInputRef"
              v-model="tagInputValue"
              size="small"
              style="width: 120px"
              @keyup.enter="addTag"
              @blur="addTag"
            />
            <el-button v-else size="small" @click="showTagInput">
              <el-icon><Plus /></el-icon>
              添加标签
            </el-button>
          </el-form-item>
          
          <el-form-item label="备注">
            <el-input
              v-model="form.remarks"
              type="textarea"
              :rows="3"
              placeholder="其他备注信息"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-card>

        <!-- 状态限制提示 -->
        <el-alert
          v-if="statusRestrictions"
          :title="statusRestrictions"
          type="warning"
          :closable="false"
          show-icon
          class="status-alert"
        />
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="handleSave" :loading="saving">
          保存修改
        </el-button>
        <el-button 
          v-if="expense?.status === 'draft'"
          type="primary" 
          @click="handleSubmitForApproval" 
          :loading="submitting"
        >
          提交审批
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { dailyExpenseApi } from '@/api/dailyExpense'
import { useUserStore } from '@/store/user'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  expense: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'updated'])

const userStore = useUserStore()

// 响应式数据
const formRef = ref()
const tagInputRef = ref()
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const saving = ref(false)
const submitting = ref(false)
const tagInputVisible = ref(false)
const tagInputValue = ref('')

// 表单数据
const form = reactive({
  expenseTitle: '',
  description: '',
  expenseCategory: '',
  subCategory: '',
  amount: null,
  expenseDate: '',
  urgency: 'routine',
  budgetType: 'budgeted',
  paymentMethod: 'cash',
  paymentAccount: '',
  beneficiary: 'village_committee',
  beneficiaryDetails: '',
  vendor: {
    vendorName: '',
    vendorType: 'company',
    vendorContact: '',
    vendorAddress: '',
    taxId: ''
  },
  items: [],
  recurringInfo: {
    isRecurring: false,
    frequency: 'monthly',
    nextDueDate: '',
    recurringAmount: null,
    autoApprove: false
  },
  tags: [],
  remarks: ''
})

// 表单验证规则
const rules = {
  expenseTitle: [
    { required: true, message: '请输入开支标题', trigger: 'blur' },
    { min: 2, max: 200, message: '标题长度在 2 到 200 个字符', trigger: 'blur' }
  ],
  expenseCategory: [
    { required: true, message: '请选择开支分类', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '请输入开支金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' }
  ],
  expenseDate: [
    { required: true, message: '请选择开支日期', trigger: 'change' }
  ]
}

// 计算属性
const statusRestrictions = computed(() => {
  if (!props.expense) return null
  
  switch (props.expense.status) {
    case 'approved':
      return '此开支已批准，只能修改部分信息'
    case 'paid':
      return '此开支已支付，无法修改'
    case 'rejected':
      return '此开支已被拒绝，建议重新创建'
    case 'cancelled':
      return '此开支已取消，无法修改'
    default:
      return null
  }
})

// 监听器
watch(visible, (newVal) => {
  if (newVal && props.expense) {
    initForm()
  } else if (!newVal) {
    resetForm()
  }
})

// 方法
const initForm = () => {
  if (props.expense) {
    // 深拷贝数据到表单
    Object.keys(form).forEach(key => {
      if (props.expense[key] !== undefined) {
        if (typeof form[key] === 'object' && form[key] !== null) {
          if (Array.isArray(form[key])) {
            form[key] = [...(props.expense[key] || [])]
          } else {
            form[key] = { ...form[key], ...(props.expense[key] || {}) }
          }
        } else {
          form[key] = props.expense[key]
        }
      }
    })

    // 确保必要字段有默认值
    if (!form.vendor) form.vendor = {}
    if (!form.recurringInfo) form.recurringInfo = {}
    if (!form.items) form.items = []
    if (!form.tags) form.tags = []
  }
}

const resetForm = () => {
  formRef.value?.resetFields()
  tagInputVisible.value = false
  tagInputValue.value = ''
}

const handleRecurringToggle = (value) => {
  if (value && !form.recurringInfo.nextDueDate) {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    form.recurringInfo.nextDueDate = nextMonth.toISOString().split('T')[0]
    form.recurringInfo.recurringAmount = form.amount
  }
}

const addItem = () => {
  form.items.push({
    itemName: '',
    specification: '',
    quantity: 1,
    unit: '',
    unitPrice: 0,
    totalPrice: 0,
    category: '',
    urgent: false,
    notes: ''
  })
}

const removeItem = (index) => {
  form.items.splice(index, 1)
}

const calculateItemTotal = (item) => {
  item.totalPrice = (item.quantity || 0) * (item.unitPrice || 0)
}

const showTagInput = () => {
  tagInputVisible.value = true
  nextTick(() => {
    tagInputRef.value?.focus()
  })
}

const addTag = () => {
  const tag = tagInputValue.value.trim()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
  }
  tagInputVisible.value = false
  tagInputValue.value = ''
}

const removeTag = (tag) => {
  const index = form.tags.indexOf(tag)
  if (index > -1) {
    form.tags.splice(index, 1)
  }
}

const validateForm = async () => {
  try {
    await formRef.value.validate()
    return true
  } catch (error) {
    ElMessage.error('请检查表单填写是否完整')
    return false
  }
}

const checkEditPermission = () => {
  if (!props.expense) return false
  
  // 检查状态限制
  if (!['draft', 'pending_approval'].includes(props.expense.status)) {
    ElMessage.error('当前状态不允许修改')
    return false
  }
  
  // 检查用户权限
  const canEdit = props.expense.handler?.handlerId === userStore.user._id || 
                  userStore.hasPermission('daily_expense_management', 'update')
  
  if (!canEdit) {
    ElMessage.error('只有经手人或管理员可以修改开支记录')
    return false
  }
  
  return true
}

const handleSave = async () => {
  if (!checkEditPermission()) return
  
  const isValid = await validateForm()
  if (!isValid) return
  
  try {
    saving.value = true
    
    const updateData = {
      ...form,
      status: props.expense.status // 保持原状态
    }
    
    const response = await dailyExpenseApi.updateExpense(props.expense._id, updateData)
    
    ElMessage.success('开支记录修改成功')
    emit('updated', response.data)
    handleClose()
  } catch (error) {
    ElMessage.error('修改失败：' + error.message)
  } finally {
    saving.value = false
  }
}

const handleSubmitForApproval = async () => {
  if (!checkEditPermission()) return
  
  const isValid = await validateForm()
  if (!isValid) return
  
  try {
    submitting.value = true
    
    const updateData = {
      ...form,
      status: 'pending_approval'
    }
    
    const response = await dailyExpenseApi.updateExpense(props.expense._id, updateData)
    
    ElMessage.success('开支记录已提交审批')
    emit('updated', response.data)
    handleClose()
  } catch (error) {
    ElMessage.error('提交审批失败：' + error.message)
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
.edit-expense-dialog {
  padding: 0;
}

.edit-alert {
  margin-bottom: 20px;
}

.status-alert {
  margin-top: 20px;
}

.form-section {
  margin-bottom: 20px;
  border: 1px solid #f0f2f5;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-weight: 600;
  color: #303133;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.full-width {
  width: 100%;
}

.empty-items {
  text-align: center;
  padding: 40px;
}

.items-list {
  max-height: 300px;
  overflow-y: auto;
}

.item-row {
  margin-bottom: 12px;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 6px;
}

.item-row:last-child {
  margin-bottom: 0;
}

.tag-item {
  margin-right: 8px;
  margin-bottom: 8px;
}

.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button {
  margin-left: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .edit-expense-dialog {
    padding: 0;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .item-row .el-col {
    margin-bottom: 8px;
  }
  
  .dialog-footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .dialog-footer .el-button {
    margin-left: 0;
    width: 100%;
  }
}
</style>