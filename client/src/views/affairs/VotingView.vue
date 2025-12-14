<template>
  <div class="voting-view">
    <div class="page-header">
      <h2>投票管理</h2>
      <p>发起和管理村民投票活动</p>
    </div>

    <!-- 操作栏 -->
    <el-card class="operation-card">
      <el-row :gutter="20" justify="space-between">
        <el-col :span="16">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索投票标题"
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
          <el-button type="primary" @click="createVoting">
            <el-icon><Plus /></el-icon>
            发起投票
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 投票列表 -->
    <el-card class="list-card">
      <el-table
        :data="votingList"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="title" label="投票标题" min-width="200">
          <template #default="scope">
            <el-link @click="viewVoting(scope.row)" type="primary">
              {{ scope.row.title }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column prop="type" label="投票类型" width="120">
          <template #default="scope">
            <el-tag :type="getTypeColor(scope.row.type)">
              {{ scope.row.type }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="creator" label="发起人" width="120" />

        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusColor(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="totalVotes" label="投票数" width="100" />

        <el-table-column prop="endTime" label="截止时间" width="160">
          <template #default="scope">
            {{ formatDate(scope.row.endTime) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewVoting(scope.row)">
              查看
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="vote(scope.row)"
              v-if="scope.row.status === '进行中'"
            >
              投票
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteVoting(scope.row)"
              v-if="canDelete"
            >
              删除
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
const votingList = ref([])

const searchForm = reactive({
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 权限检查
const canDelete = computed(() => userStore.hasPermission('village:voting:delete'))

// 模拟数据
const mockData = [
  {
    id: 1,
    title: '村道修缮工程方案投票',
    type: '工程投票',
    creator: '村委会',
    status: '进行中',
    totalVotes: 48,
    endTime: '2024-01-25 18:00:00',
    description: '请大家对村道修缮工程方案进行投票...'
  },
  {
    id: 2,
    title: '春节活动预算表决',
    type: '财务投票',
    creator: '张主任',
    status: '已结束',
    totalVotes: 156,
    endTime: '2024-01-15 18:00:00',
    description: '春节活动预算分配方案投票...'
  }
]

const getTypeColor = (type) => {
  const typeColors = {
    '工程投票': 'warning',
    '财务投票': 'success',
    '人事投票': 'info',
    '政策投票': 'primary'
  }
  return typeColors[type] || 'info'
}

const getStatusColor = (status) => {
  const statusColors = {
    '进行中': 'success',
    '已结束': 'info',
    '已取消': 'danger'
  }
  return statusColors[status] || 'info'
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const loadVotingList = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    votingList.value = mockData
    pagination.total = mockData.length
  } catch (error) {
    ElMessage.error('加载投票列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  console.log('搜索:', searchForm.keyword)
  loadVotingList()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadVotingList()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadVotingList()
}

const createVoting = () => {
  console.log('发起投票')
}

const viewVoting = (row) => {
  console.log('查看投票:', row)
}

const vote = (row) => {
  console.log('参与投票:', row)
}

const deleteVoting = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除投票"${row.title}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟删除操作
    ElMessage.success('删除成功')
    loadVotingList()

  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadVotingList()
})
</script>

<style scoped>
.voting-view {
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