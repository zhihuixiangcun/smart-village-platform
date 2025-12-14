<template>
  <div class="affairs-announcements-view">
    <div class="page-header">
      <h2>公告管理</h2>
      <p>发布和管理村务公告信息</p>
    </div>

    <!-- 操作栏 -->
    <el-card class="operation-card">
      <el-row :gutter="20" justify="space-between">
        <el-col :span="16">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索公告标题或内容"
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
          <el-button type="primary" @click="addAnnouncement">
            <el-icon><Plus /></el-icon>
            发布公告
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 公告列表 -->
    <el-card class="list-card">
      <el-table
        :data="announcements"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="scope">
            <el-link @click="viewAnnouncement(scope.row)" type="primary">
              {{ scope.row.title }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column prop="type" label="类型" width="120">
          <template #default="scope">
            <el-tag :type="getTypeColor(scope.row.type)">
              {{ scope.row.type }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="author" label="发布人" width="120" />

        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === '已发布' ? 'success' : 'warning'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="publishTime" label="发布时间" width="160">
          <template #default="scope">
            {{ formatDate(scope.row.publishTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="views" label="浏览量" width="100" />

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewAnnouncement(scope.row)">
              查看
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="editAnnouncement(scope.row)"
              v-if="canEdit"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteAnnouncement(scope.row)"
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
const announcements = ref([])

const searchForm = reactive({
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 权限检查
const canEdit = computed(() => userStore.hasPermission('village:announcement:write'))
const canDelete = computed(() => userStore.hasPermission('village:announcement:delete'))

// 模拟数据
const mockData = [
  {
    id: 1,
    title: '关于村道修缮工程的公告',
    type: '工程公告',
    author: '村委会',
    status: '已发布',
    publishTime: '2024-01-15 10:00:00',
    views: 156,
    content: '村道修缮工程将于本月底开始...'
  },
  {
    id: 2,
    title: '春节慰问活动通知',
    type: '活动通知',
    author: '村委会',
    status: '已发布',
    publishTime: '2024-01-10 14:30:00',
    views: 89,
    content: '春节期间将组织慰问困难户...'
  }
]

const getTypeColor = (type) => {
  const typeColors = {
    '工程公告': 'warning',
    '活动通知': 'success',
    '政策宣传': 'info',
    '紧急通知': 'danger'
  }
  return typeColors[type] || 'info'
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const loadAnnouncements = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    announcements.value = mockData
    pagination.total = mockData.length
  } catch (error) {
    ElMessage.error('加载公告列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  console.log('搜索:', searchForm.keyword)
  loadAnnouncements()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadAnnouncements()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadAnnouncements()
}

const addAnnouncement = () => {
  console.log('新增公告')
}

const viewAnnouncement = (row) => {
  console.log('查看公告:', row)
}

const editAnnouncement = (row) => {
  console.log('编辑公告:', row)
}

const deleteAnnouncement = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除公告"${row.title}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟删除操作
    ElMessage.success('删除成功')
    loadAnnouncements()

  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadAnnouncements()
})
</script>

<style scoped>
.affairs-announcements-view {
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