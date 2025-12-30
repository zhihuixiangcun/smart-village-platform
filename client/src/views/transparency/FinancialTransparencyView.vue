<template>
  <div class="financial-transparency-view">
    <div class="page-header">
      <h2>
        <el-icon><Money /></el-icon>
        财务透明化
      </h2>
      <div class="header-actions">
        <el-button type="primary" @click="showUploadDialog = true">
          <el-icon><Camera /></el-icon>
          拍照上传发票
        </el-button>
        <el-button @click="showBlockchainVerifyDialog = true">
          <el-icon><Lock /></el-icon>
          区块链验证
        </el-button>
      </div>
    </div>

    <!-- 财务统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="8">
        <el-card class="stat-card income">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">总收入</div>
              <div class="stat-value">{{ formatMoney(stats.totalIncome) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card expense">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">总支出</div>
              <div class="stat-value">{{ formatMoney(stats.totalExpense) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card" :class="stats.balance >= 0 ? 'income' : 'expense'">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Wallet /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">当前结余</div>
              <div class="stat-value">{{ formatMoney(stats.balance) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 收支流水 -->
    <el-card class="transactions-section">
      <template #header>
        <div class="section-header">
          <span>收支流水明细</span>
          <div class="header-filters">
            <el-select v-model="filters.type" placeholder="全部类型" clearable @change="fetchTransactions" style="width: 120px">
              <el-option label="收入" value="income" />
              <el-option label="支出" value="expense" />
            </el-select>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              @change="handleDateChange"
              style="width: 240px"
            />
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="transactions" stripe>
        <el-table-column prop="date" label="日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'income' ? 'success' : 'danger'">
              {{ row.type === 'income' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="description" label="说明" min-width="250" />
        <el-table-column prop="amount" label="金额" width="140" align="right">
          <template #default="{ row }">
            <span :class="row.type === 'income' ? 'text-success' : 'text-danger'">
              {{ row.type === 'income' ? '+' : '-' }}{{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="发票" width="100">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              link
              v-if="row.relatedInvoice"
              @click="viewInvoice(row.relatedInvoice)"
            >
              查看
            </el-button>
            <span v-else class="text-muted">无</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="viewTransaction(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchTransactions"
          @current-change="fetchTransactions"
        />
      </div>
    </el-card>

    <!-- 发票上传对话框 -->
    <el-dialog v-model="showUploadDialog" title="拍照上传发票" width="600px" @close="resetUploadForm">
      <el-alert
        title="AI智能识别功能"
        type="info"
        description="系统将自动识别发票金额、类型、商家等信息，提升财务入账效率80%"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />
      <el-form ref="uploadFormRef" :model="uploadForm" :rules="uploadRules" label-width="100px">
        <el-form-item label="发票照片">
          <el-upload
            class="invoice-uploader"
            :show-file-list="true"
            :auto-upload="false"
            :on-change="handleImageChange"
            accept="image/*"
            drag
          >
            <el-icon class="upload-icon"><Plus /></el-icon>
            <div class="upload-text">
              拖拽图片到此处或<em>点击上传</em>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input v-model="uploadForm.amount" placeholder="AI将自动识别" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="uploadForm.category" placeholder="请选择分类">
            <el-option label="办公费用" value="office" />
            <el-option label="基建支出" value="infrastructure" />
            <el-option label="公共服务" value="public_service" />
            <el-option label="福利发放" value="welfare" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="商家名称">
          <el-input v-model="uploadForm.vendor" placeholder="AI将自动识别" />
        </el-form-item>
        <el-form-item label="发票号码">
          <el-input v-model="uploadForm.invoiceNumber" placeholder="AI将自动识别" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="uploadForm.description" type="textarea" :rows="3" placeholder="请输入支出说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUploadDialog = false">取消</el-button>
        <el-button type="primary" @click="submitInvoice" :loading="uploading">提交</el-button>
      </template>
    </el-dialog>

    <!-- 区块链验证对话框 -->
    <el-dialog v-model="showBlockchainVerifyDialog" title="区块链存证验证" width="700px">
      <div class="blockchain-verify">
        <el-alert
          title="财务数据区块链存证"
          type="success"
          description="所有财务流水均已上链存证，确保数据不可篡改、可追溯"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />
        <el-form label-width="120px">
          <el-form-item label="选择记录">
            <el-select v-model="selectedTransactionId" placeholder="选择要验证的记录">
              <el-option
                v-for="t in transactions"
                :key="t._id"
                :label="`${t.category} - ${formatMoney(t.amount)}`"
                :value="t._id"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <div v-if="verifyResult" class="verify-result">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="验证状态">
              <el-tag :type="verifyResult.isValid ? 'success' : 'danger'">
                {{ verifyResult.isValid ? '数据未被篡改' : '数据已被篡改' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="存证时间">
              {{ verifyResult.record?.blockchainTimestamp ? formatDate(verifyResult.record.blockchainTimestamp) : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="区块哈希" :span="2">
              <code class="hash-code">{{ verifyResult.record?.blockchainHash || '-' }}</code>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <el-button @click="showBlockchainVerifyDialog = false">关闭</el-button>
        <el-button type="primary" @click="verifyRecord" :disabled="!selectedTransactionId">验证</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Money, Camera, Lock, TrendCharts, Wallet, Plus } from '@element-plus/icons-vue'
import transparencyApi from '@/api/transparency'

const loading = ref(false)
const uploading = ref(false)
const transactions = ref([])
const showUploadDialog = ref(false)
const showBlockchainVerifyDialog = ref(false)
const uploadFormRef = ref(null)
const selectedTransactionId = ref(null)
const verifyResult = ref(null)

const filters = reactive({
  type: '',
  startDate: '',
  endDate: ''
})

const dateRange = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const uploadForm = reactive({
  amount: '',
  category: '',
  vendor: '',
  invoiceNumber: '',
  description: '',
  image: null
})

const uploadRules = {
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

const stats = computed(() => {
  const totalIncome = transactions.value
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.value
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense
  }
})

const formatMoney = (amount) => {
  return `¥${amount.toFixed(2)}`
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const handleDateChange = (dates) => {
  if (dates && dates.length === 2) {
    filters.startDate = dates[0]
    filters.endDate = dates[1]
  } else {
    filters.startDate = ''
    filters.endDate = ''
  }
  fetchTransactions()
}

const fetchTransactions = async () => {
  loading.value = true
  try {
    const params = {
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const { data } = await transparencyApi.getTransactions(params)
    if (data.success) {
      transactions.value = data.data
      pagination.total = data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取收支流水失败')
  } finally {
    loading.value = false
  }
}

const viewInvoice = (invoice) => {
  ElMessage.info('查看发票详情')
}

const viewTransaction = (transaction) => {
  ElMessage.info('查看交易详情')
}

const handleImageChange = (file) => {
  uploadForm.image = file.raw
  // 模拟AI识别
  setTimeout(() => {
    uploadForm.amount = '1280.00'
    uploadForm.vendor = 'XX办公用品公司'
    uploadForm.invoiceNumber = '12345678'
    ElMessage.success('AI识别完成')
  }, 1000)
}

const submitInvoice = async () => {
  await uploadFormRef.value.validate(async (valid) => {
    if (valid) {
      uploading.value = true
      try {
        const formData = new FormData()
        Object.keys(uploadForm).forEach(key => {
          if (uploadForm[key]) {
            formData.append(key, uploadForm[key])
          }
        })
        const { data } = await transparencyApi.createInvoice(formData)
        if (data.success) {
          ElMessage.success('发票上传成功，等待审核')
          showUploadDialog.value = false
          resetUploadForm()
          fetchTransactions()
        }
      } catch (error) {
        ElMessage.error('上传发票失败')
      } finally {
        uploading.value = false
      }
    }
  })
}

const verifyRecord = async () => {
  try {
    const { data } = await transparencyApi.verifyBlockchainRecord(selectedTransactionId.value)
    if (data.success) {
      verifyResult.value = data.data
    }
  } catch (error) {
    ElMessage.error('验证失败')
  }
}

const resetUploadForm = () => {
  Object.assign(uploadForm, {
    amount: '',
    category: '',
    vendor: '',
    invoiceNumber: '',
    description: '',
    image: null
  })
  uploadFormRef.value?.resetFields()
}

onMounted(() => {
  fetchTransactions()
})
</script>

<style scoped>
.financial-transparency-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 120px;
}

.stat-card.income {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: white;
}

.stat-card.expense {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
  color: white;
}

.stat-card .stat-icon {
  opacity: 0.3;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
}

.transactions-section {
  min-height: 500px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-filters {
  display: flex;
  gap: 10px;
}

.text-success {
  color: #67c23a;
  font-weight: bold;
}

.text-danger {
  color: #f56c6c;
  font-weight: bold;
}

.text-muted {
  color: #909399;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.invoice-uploader {
  width: 100%;
}

.upload-icon {
  font-size: 48px;
  color: #409eff;
}

.upload-text {
  margin-top: 10px;
  color: #606266;
}

.upload-text em {
  color: #409eff;
  font-style: normal;
}

.hash-code {
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  word-break: break-all;
}

.blockchain-verify {
  padding: 10px 0;
}

.verify-result {
  margin-top: 20px;
}
</style>
