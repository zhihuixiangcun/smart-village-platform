<template>
  <div class="household-codes-view">
    <div class="page-header">
      <h2>一户一码管理</h2>
      <p>为每户村民生成唯一二维码，便于信息查询和管理</p>
    </div>

    <!-- 操作栏 -->
    <el-card class="operation-card">
      <el-row :gutter="20" justify="space-between">
        <el-col :span="16">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索户主姓名或户码"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="8" class="text-right">
          <el-button type="primary" @click="generateBatchCodes">
            <el-icon><QrCode /></el-icon>
            批量生成
          </el-button>
          <el-button type="success" @click="exportCodes">
            <el-icon><Download /></el-icon>
            导出二维码
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 户码列表 -->
    <el-card class="list-card">
      <el-table
        :data="householdCodes"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="householdCode" label="户码" width="120">
          <template #default="scope">
            <el-button type="text" @click="showQRCode(scope.row)">
              {{ scope.row.householdCode }}
            </el-button>
          </template>
        </el-table-column>

        <el-table-column prop="householder" label="户主" width="100" />

        <el-table-column prop="address" label="地址" min-width="200" />

        <el-table-column prop="memberCount" label="户籍人数" width="100" />

        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusColor(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="generateTime" label="生成时间" width="160">
          <template #default="scope">
            {{ formatDate(scope.row.generateTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="scanCount" label="扫描次数" width="100" />

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="showQRCode(scope.row)">
              查看码
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="regenerateCode(scope.row)"
              v-if="canGenerate"
            >
              重新生成
            </el-button>
            <el-button
              size="small"
              type="warning"
              @click="printCode(scope.row)"
            >
              打印
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 二维码预览对话框 -->
    <el-dialog
      v-model="qrDialogVisible"
      title="户码二维码"
      width="400px"
      align-center
    >
      <div class="qr-preview">
        <div class="qr-code">
          <!-- 这里应该放置生成的二维码图片 -->
          <div class="qr-placeholder">
            <el-icon size="100"><QrCode /></el-icon>
            <p>{{ currentHousehold?.householdCode }}</p>
          </div>
        </div>
        <div class="household-info">
          <p><strong>户主：</strong>{{ currentHousehold?.householder }}</p>
          <p><strong>地址：</strong>{{ currentHousehold?.address }}</p>
          <p><strong>人数：</strong>{{ currentHousehold?.memberCount }}人</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="qrDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="downloadQRCode">下载</el-button>
        <el-button type="success" @click="printQRCode">打印</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, QrCode, Download } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const householdCodes = ref([])
const qrDialogVisible = ref(false)
const currentHousehold = ref(null)

const searchForm = reactive({
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 权限检查
const canGenerate = computed(() => userStore.hasPermission('household:code:generate'))

// 模拟数据
const mockData = [
  {
    id: 1,
    householdCode: 'HC001',
    householder: '张三',
    address: '村组1号',
    memberCount: 4,
    status: '正常',
    generateTime: '2024-01-15 10:30:00',
    scanCount: 15
  },
  {
    id: 2,
    householdCode: 'HC002',
    householder: '李四',
    address: '村组2号',
    memberCount: 3,
    status: '正常',
    generateTime: '2024-01-14 14:20:00',
    scanCount: 8
  },
  {
    id: 3,
    householdCode: 'HC003',
    householder: '王五',
    address: '村组3号',
    memberCount: 2,
    status: '已失效',
    generateTime: '2024-01-10 09:15:00',
    scanCount: 3
  }
]

const getStatusColor = (status) => {
  const statusColors = {
    '正常': 'success',
    '已失效': 'danger',
    '待生成': 'warning'
  }
  return statusColors[status] || 'info'
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const loadHouseholdCodes = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    householdCodes.value = mockData
    pagination.total = mockData.length
  } catch (error) {
    ElMessage.error('加载户码列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  console.log('搜索:', searchForm.keyword)
  loadHouseholdCodes()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadHouseholdCodes()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadHouseholdCodes()
}

const generateBatchCodes = () => {
  console.log('批量生成户码')
  ElMessage.success('批量生成功能开发中...')
}

const exportCodes = () => {
  console.log('导出二维码')
  ElMessage.success('导出功能开发中...')
}

const showQRCode = (row) => {
  currentHousehold.value = row
  qrDialogVisible.value = true
}

const regenerateCode = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要重新生成户码"${row.householdCode}"吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟重新生成
    ElMessage.success('户码重新生成成功')
    loadHouseholdCodes()

  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重新生成失败')
    }
  }
}

const printCode = (row) => {
  console.log('打印户码:', row)
  ElMessage.success('打印功能开发中...')
}

const downloadQRCode = () => {
  console.log('下载二维码')
  ElMessage.success('下载功能开发中...')
}

const printQRCode = () => {
  console.log('打印二维码')
  ElMessage.success('打印功能开发中...')
}

onMounted(() => {
  loadHouseholdCodes()
})
</script>

<style scoped>
.household-codes-view {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 5px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.operation-card,
.list-card {
  margin-bottom: 20px;
}

.text-right {
  text-align: right;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.qr-preview {
  text-align: center;
}

.qr-code {
  margin-bottom: 20px;
}

.qr-placeholder {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 30px;
  background: #fafafa;
}

.qr-placeholder p {
  margin: 10px 0 0 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.household-info {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
  text-align: left;
}

.household-info p {
  margin: 5px 0;
  color: #606266;
}
</style>