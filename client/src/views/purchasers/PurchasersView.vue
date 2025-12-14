<template>
  <div class="purchasers-view">
    <div class="page-header">
      <h2>采购商管理</h2>
      <p>管理农产品采购商信息和合作关系</p>
    </div>

    <!-- 操作栏 -->
    <el-card class="operation-card">
      <el-row :gutter="20" justify="space-between">
        <el-col :span="16">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索采购商名称或联系人"
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
          <el-button type="primary" @click="addPurchaser">
            <el-icon><Plus /></el-icon>
            添加采购商
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 采购商列表 -->
    <el-card class="list-card">
      <el-table
        :data="purchasers"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="companyName" label="公司名称" min-width="200" />

        <el-table-column prop="contactPerson" label="联系人" width="100" />

        <el-table-column prop="phone" label="联系电话" width="140">
          <template #default="scope">
            {{ maskPhone(scope.row.phone) }}
          </template>
        </el-table-column>

        <el-table-column prop="business" label="主营业务" width="150" />

        <el-table-column prop="cooperationStatus" label="合作状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusColor(scope.row.cooperationStatus)">
              {{ scope.row.cooperationStatus }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="registrationTime" label="注册时间" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.registrationTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="lastOrderTime" label="最近订单" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.lastOrderTime) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewPurchaser(scope.row)">
              查看
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="editPurchaser(scope.row)"
              v-if="canEdit"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="success"
              @click="viewOrders(scope.row)"
            >
              订单
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
const purchasers = ref([])

const searchForm = reactive({
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 权限检查
const canEdit = computed(() => userStore.hasPermission('purchaser:write'))

// 模拟数据
const mockData = [
  {
    id: 1,
    companyName: '绿源农业有限公司',
    contactPerson: '王经理',
    phone: '13800138001',
    business: '有机蔬菜采购',
    cooperationStatus: '正常合作',
    registrationTime: '2023-03-15',
    lastOrderTime: '2024-01-10',
    email: 'wang@luyuan.com',
    address: '市区农贸大厦8楼'
  },
  {
    id: 2,
    companyName: '丰收粮油贸易公司',
    contactPerson: '李总',
    phone: '13800138002',
    business: '粮食收购',
    cooperationStatus: '暂停合作',
    registrationTime: '2023-01-20',
    lastOrderTime: '2023-12-15',
    email: 'li@fengshou.com',
    address: '工业园区B区12号'
  },
  {
    id: 3,
    companyName: '田园果业批发中心',
    contactPerson: '张主任',
    phone: '13800138003',
    business: '水果批发',
    cooperationStatus: '正常合作',
    registrationTime: '2023-08-10',
    lastOrderTime: '2024-01-12',
    email: 'zhang@tianyuan.com',
    address: '果蔬批发市场3号厅'
  }
]

const getStatusColor = (status) => {
  const statusColors = {
    '正常合作': 'success',
    '暂停合作': 'warning',
    '终止合作': 'danger'
  }
  return statusColors[status] || 'info'
}

const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const loadPurchasers = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    purchasers.value = mockData
    pagination.total = mockData.length
  } catch (error) {
    ElMessage.error('加载采购商列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  console.log('搜索:', searchForm.keyword)
  loadPurchasers()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadPurchasers()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadPurchasers()
}

const addPurchaser = () => {
  console.log('添加采购商')
}

const viewPurchaser = (row) => {
  console.log('查看采购商:', row)
}

const editPurchaser = (row) => {
  console.log('编辑采购商:', row)
}

const viewOrders = (row) => {
  console.log('查看订单:', row)
  ElMessage.success('订单管理功能开发中...')
}

onMounted(() => {
  loadPurchasers()
})
</script>

<style scoped>
.purchasers-view {
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