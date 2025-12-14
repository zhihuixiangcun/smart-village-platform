<template>
  <div class="meetings-view">
    <div class="page-header">
      <h2>会议管理</h2>
      <p>组织和管理村民会议及委员会议</p>
    </div>

    <!-- 操作栏 -->
    <el-card class="operation-card">
      <el-row :gutter="20" justify="space-between">
        <el-col :span="16">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索会议标题或内容"
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
          <el-button type="primary" @click="createMeeting">
            <el-icon><Plus /></el-icon>
            创建会议
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 会议列表 -->
    <el-card class="list-card">
      <el-table
        :data="meetings"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="title" label="会议标题" min-width="200">
          <template #default="scope">
            <el-link @click="viewMeeting(scope.row)" type="primary">
              {{ scope.row.title }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column prop="type" label="会议类型" width="120">
          <template #default="scope">
            <el-tag :type="getTypeColor(scope.row.type)">
              {{ scope.row.type }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="organizer" label="组织者" width="120" />

        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusColor(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="attendeeCount" label="参与人数" width="100" />

        <el-table-column prop="meetingTime" label="会议时间" width="160">
          <template #default="scope">
            {{ formatDate(scope.row.meetingTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="location" label="会议地点" width="150" />

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewMeeting(scope.row)">
              查看
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="editMeeting(scope.row)"
              v-if="canEdit"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteMeeting(scope.row)"
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
const meetings = ref([])

const searchForm = reactive({
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 权限检查
const canEdit = computed(() => userStore.hasPermission('meeting:write'))
const canDelete = computed(() => userStore.hasPermission('meeting:delete'))

// 模拟数据
const mockData = [
  {
    id: 1,
    title: '村民代表大会',
    type: '村民大会',
    organizer: '村委会',
    status: '已结束',
    attendeeCount: 45,
    meetingTime: '2024-01-15 14:00:00',
    location: '村委会议室',
    description: '讨论村道修缮工程方案'
  },
  {
    id: 2,
    title: '党支部会议',
    type: '党员会议',
    organizer: '党支部',
    status: '进行中',
    attendeeCount: 12,
    meetingTime: '2024-01-16 10:00:00',
    location: '党员活动室',
    description: '学习最新党的政策'
  },
  {
    id: 3,
    title: '财务工作会议',
    type: '工作会议',
    organizer: '财务小组',
    status: '待开始',
    attendeeCount: 8,
    meetingTime: '2024-01-18 09:00:00',
    location: '财务办公室',
    description: '年度财务预算讨论'
  }
]

const getTypeColor = (type) => {
  const typeColors = {
    '村民大会': 'primary',
    '党员会议': 'danger',
    '工作会议': 'success',
    '临时会议': 'warning'
  }
  return typeColors[type] || 'info'
}

const getStatusColor = (status) => {
  const statusColors = {
    '待开始': 'warning',
    '进行中': 'success',
    '已结束': 'info',
    '已取消': 'danger'
  }
  return statusColors[status] || 'info'
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const loadMeetings = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    meetings.value = mockData
    pagination.total = mockData.length
  } catch (error) {
    ElMessage.error('加载会议列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  console.log('搜索:', searchForm.keyword)
  loadMeetings()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadMeetings()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadMeetings()
}

const createMeeting = () => {
  console.log('创建会议')
}

const viewMeeting = (row) => {
  console.log('查看会议:', row)
}

const editMeeting = (row) => {
  console.log('编辑会议:', row)
}

const deleteMeeting = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除会议"${row.title}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟删除操作
    ElMessage.success('删除成功')
    loadMeetings()

  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadMeetings()
})
</script>

<style scoped>
.meetings-view {
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