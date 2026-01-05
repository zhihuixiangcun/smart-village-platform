<template>
  <div class="purchasers-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">采购商管理</h1>
          <el-button type="primary" @click="handleAddPurchaser">
            <el-icon><Plus /></el-icon>
            添加采购商
          </el-button>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-card>
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <el-input
              v-model="searchText"
              placeholder="搜索采购商姓名/手机号"
              style="width: 240px"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="filterType" placeholder="采购商类型" style="width: 150px" clearable>
              <el-option label="个人采购商" value="individual" />
              <el-option label="商家采购商" value="business" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="账户状态" style="width: 140px" clearable>
              <el-option label="待审核" value="pending" />
              <el-option label="已激活" value="active" />
              <el-option label="已暂停" value="suspended" />
            </el-select>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>

          <!-- 采购商列表 -->
          <el-table :data="purchaserList" stripe v-loading="loading">
            <el-table-column prop="basicInfo.name" label="姓名" width="140" />
            <el-table-column prop="basicInfo.phone" label="手机号" width="140" />
            <el-table-column prop="purchaserType" label="类型" width="120">
              <template #default="{ row }">
                <el-tag :type="row.purchaserType === 'individual' ? 'success' : 'warning'" size="small">
                  {{ row.purchaserType === 'individual' ? '个人' : '商家' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="认证状态" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.verification?.isVerified" type="success" size="small">
                  <el-icon><CircleCheck /></el-icon>
                  已认证
                </el-tag>
                <el-tag v-else type="info" size="small">未认证</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="statistics.totalOrders" label="订单数" width="100" />
            <el-table-column prop="createdAt" label="注册时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="viewProfile(row)">查看详情</el-button>
                <el-button size="small" type="primary" @click="editPurchaser(row)">编辑</el-button>
                <el-button
                  v-if="row.status === 'pending'"
                  size="small"
                  type="success"
                  @click="approvePurchaser(row)"
                >
                  审核
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, CircleCheck } from '@element-plus/icons-vue'
import api from '@/api'

const router = useRouter()

const loading = ref(false)
const searchText = ref('')
const filterType = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const purchaserList = ref([])

// 获取采购商列表
const fetchPurchaserList = async () => {
  loading.value = true
  try {
    // 这里暂时使用模拟数据，实际应该调用API
    purchaserList.value = [
      {
        _id: '1',
        basicInfo: { name: '张三', phone: '138****1234' },
        purchaserType: 'individual',
        status: 'active',
        verification: { isVerified: true },
        statistics: { totalOrders: 15 },
        createdAt: new Date('2024-01-15')
      },
      {
        _id: '2',
        basicInfo: { name: '李四农产品公司', phone: '139****5678' },
        purchaserType: 'business',
        status: 'pending',
        verification: { isVerified: false },
        statistics: { totalOrders: 0 },
        createdAt: new Date('2024-03-20')
      }
    ]
    total.value = 2
  } catch (error) {
    console.error('获取采购商列表失败', error)
    ElMessage.error('获取采购商列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchPurchaserList()
}

// 重置
const handleReset = () => {
  searchText.value = ''
  filterType.value = ''
  filterStatus.value = ''
  currentPage.value = 1
  fetchPurchaserList()
}

// 分页
const handleSizeChange = (size) => {
  pageSize.value = size
  fetchPurchaserList()
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchPurchaserList()
}

// 获取状态类型
const getStatusType = (status) => {
  const types = { pending: 'info', active: 'success', suspended: 'warning', deleted: 'danger' }
  return types[status] || 'info'
}

// 获取状态标签
const getStatusLabel = (status) => {
  const labels = { pending: '待审核', active: '已激活', suspended: '已暂停', deleted: '已删除' }
  return labels[status] || status
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

// 查看个人中心
const viewProfile = (row) => {
  router.push(`/purchaser/profile`)
}

// 添加采购商
const handleAddPurchaser = () => {
  router.push('/auth/registration-wizard')
}

// 编辑采购商
const editPurchaser = (row) => {
  ElMessage.info('编辑功能开发中')
}

// 审核采购商
const approvePurchaser = async (row) => {
  try {
    await ElMessageBox.confirm(`确认审核通过 ${row.basicInfo.name}？`, '审核确认', {
      type: 'warning'
    })
    ElMessage.success('审核通过')
    await fetchPurchaserList()
  } catch (error) {
    // 用户取消
  }
}

onMounted(() => {
  fetchPurchaserList()
})
</script>

<style lang="scss" scoped>
.purchasers-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.page-main {
  padding: 24px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>