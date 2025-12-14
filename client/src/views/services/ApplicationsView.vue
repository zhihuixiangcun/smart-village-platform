<template>
  <div class="applications-view">
    <div class="page-header">
      <h2>服务申请</h2>
      <p>管理村民各类服务申请和办事流程</p>
    </div>

    <!-- 操作栏 -->
    <el-card class="operation-card">
      <el-row :gutter="20" justify="space-between">
        <el-col :span="16">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索申请人或申请事项"
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
          <el-button type="primary" @click="createApplication">
            <el-icon><Plus /></el-icon>
            新建申请
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 申请列表 -->
    <el-card class="list-card">
      <el-table
        :data="applications"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="applicationNo" label="申请编号" width="140" />

        <el-table-column prop="applicant" label="申请人" width="100" />

        <el-table-column prop="serviceType" label="服务类型" width="120">
          <template #default="scope">
            <el-tag :type="getServiceTypeColor(scope.row.serviceType)">
              {{ scope.row.serviceType }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="title" label="申请事项" min-width="200" />

        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusColor(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="submitTime" label="提交时间" width="160">
          <template #default="scope">
            {{ formatDate(scope.row.submitTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="handler" label="处理人" width="100" />

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewApplication(scope.row)">
              查看
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="processApplication(scope.row)"
              v-if="canProcess && scope.row.status === '待处理'"
            >
              处理
            </el-button>
            <el-button
              size="small"
              type="success"
              @click="approveApplication(scope.row)"
              v-if="canApprove && scope.row.status === '审核中'"
            >
              审核
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const applications = ref([])

const searchForm = reactive({
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 权限检查
const canProcess = computed(() => userStore.hasPermission('application:process'))
const canApprove = computed(() => userStore.hasPermission('application:approve'))

// 模拟数据
const mockData = [
  {
    id: 1,
    applicationNo: 'APP202401001',
    applicant: '张三',
    serviceType: '证明开具',
    title: '收入证明申请',
    status: '待处理',
    submitTime: '2024-01-15 09:30:00',
    handler: '王办事员',
    description: '申请开具收入证明用于银行贷款'
  },
  {
    id: 2,
    applicationNo: 'APP202401002',
    applicant: '李四',
    serviceType: '户籍变更',
    title: '户口迁移申请',
    status: '审核中',
    submitTime: '2024-01-14 14:20:00',
    handler: '赵主任',
    description: '因工作调动需要户口迁移'
  },
  {
    id: 3,
    applicationNo: 'APP202401003',
    applicant: '王五',
    serviceType: '社会保障',
    title: '低保申请',
    status: '已完成',
    submitTime: '2024-01-12 11:15:00',
    handler: '李主任',
    description: '家庭困难申请低保救助'
  }
]

const getServiceTypeColor = (type) => {
  const typeColors = {
    '证明开具': 'primary',
    '户籍变更': 'warning',
    '社会保障': 'success',
    '土地流转': 'info',
    '其他服务': 'default'
  }
  return typeColors[type] || 'default'
}

const getStatusColor = (status) => {
  const statusColors = {
    '待处理': 'warning',
    '审核中': 'primary',
    '已完成': 'success',
    '已拒绝': 'danger',
    '已撤销': 'info'
  }
  return statusColors[status] || 'info'
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const loadApplications = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    applications.value = mockData
    pagination.total = mockData.length
  } catch (error) {
    ElMessage.error('加载申请列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  console.log('搜索:', searchForm.keyword)
  loadApplications()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadApplications()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadApplications()
}

const createApplication = () => {
  console.log('新建申请')
}

const viewApplication = (row) => {
  console.log('查看申请:', row)
}

const processApplication = (row) => {
  console.log('处理申请:', row)
  ElMessage.success('申请处理功能开发中...')
}

const approveApplication = (row) => {
  console.log('审核申请:', row)
  ElMessage.success('申请审核功能开发中...')
}

onMounted(() => {
  loadApplications()
})
</script>

<style scoped>
.applications-view {
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
</style>