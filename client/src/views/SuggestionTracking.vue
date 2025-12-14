<template>
  <div class="suggestion-tracking-page">
    <div class="header">
      <h2>建议进度跟踪</h2>
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索建议标题或提交人"
          style="width: 300px; margin-right: 10px"
          @keyup.enter="searchSuggestions"
        >
          <template #suffix>
            <el-icon @click="searchSuggestions" style="cursor: pointer">
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-button @click="searchSuggestions">搜索</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon total">📋</div>
            <div class="stats-info">
              <div class="stats-number">{{ stats.total }}</div>
              <div class="stats-label">总建议数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon pending">⏳</div>
            <div class="stats-info">
              <div class="stats-number">{{ stats.pending }}</div>
              <div class="stats-label">待处理</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon progress">🔄</div>
            <div class="stats-info">
              <div class="stats-number">{{ stats.inProgress }}</div>
              <div class="stats-label">处理中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon completed">✅</div>
            <div class="stats-info">
              <div class="stats-number">{{ stats.completed }}</div>
              <div class="stats-label">已完成</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 建议列表 -->
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span>建议跟踪列表</span>
          <div class="header-actions">
            <el-select
              v-model="filterStatus"
              placeholder="状态筛选"
              style="width: 150px; margin-right: 10px"
              @change="loadSuggestions"
            >
              <el-option label="全部" value="" />
              <el-option label="待审核" value="submitted" />
              <el-option label="审核中" value="under_review" />
              <el-option label="进行中" value="in_progress" />
              <el-option label="已完成" value="completed" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
            <el-button @click="loadSuggestions" :icon="Refresh">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="suggestions"
        v-loading="loading"
        style="width: 100%"
        @row-click="showTimeline"
        row-key="_id"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-content">
              <div class="suggestion-content">
                <h4>建议内容</h4>
                <p>{{ row.content }}</p>
              </div>
              <div class="progress-timeline" v-if="row.reviewNotes.length">
                <h4>处理时间线</h4>
                <el-timeline>
                  <el-timeline-item
                    v-for="note in row.reviewNotes"
                    :key="note._id"
                    :timestamp="formatDate(note.createdAt)"
                    :type="getTimelineType(note.action)"
                  >
                    <div class="timeline-content">
                      <div class="action-title">{{ getActionText(note.action) }}</div>
                      <div class="reviewer">处理人：{{ note.reviewer?.name || '系统' }}</div>
                      <div class="note-text">{{ note.note }}</div>
                    </div>
                  </el-timeline-item>
                  <el-timeline-item
                    :timestamp="formatDate(row.createdAt)"
                    type="primary"
                  >
                    <div class="timeline-content">
                      <div class="action-title">建议提交</div>
                      <div class="reviewer">提交人：{{ row.submitter.isAnonymous ? '匿名用户' : row.submitter.name }}</div>
                    </div>
                  </el-timeline-item>
                </el-timeline>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          label="建议标题"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ getCategoryName(row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="150">
          <template #default="{ row }">
            <div class="progress-info">
              <el-progress
                :percentage="getProgressPercentage(row.status)"
                :color="getProgressColor(row.status)"
                :stroke-width="8"
                text-inside
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="submitter.name"
          label="提交人"
          width="100"
        >
          <template #default="{ row }">
            {{ row.submitter.isAnonymous ? '匿名用户' : row.submitter.name }}
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="100">
          <template #default="{ row }">
            {{ row.assignedTo?.name || '未分配' }}
          </template>
        </el-table-column>
        <el-table-column label="处理天数" width="100">
          <template #default="{ row }">
            {{ getProcessingDays(row.createdAt, row.status) }}天
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="提交时间"
          width="150"
          :formatter="formatDateColumn"
        />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              @click.stop="showDetail(row)"
            >
              详情
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click.stop="showTimeline(row)"
            >
              时间线
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadSuggestions"
        @current-change="loadSuggestions"
        style="margin-top: 20px; text-align: right"
      />
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="建议详情"
      width="800px"
    >
      <div v-if="currentSuggestion" class="suggestion-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="标题" :span="2">
            {{ currentSuggestion.title }}
          </el-descriptions-item>
          <el-descriptions-item label="分类">
            {{ getCategoryName(currentSuggestion.category) }}
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityType(currentSuggestion.priority)">
              {{ getPriorityText(currentSuggestion.priority) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentSuggestion.status)">
              {{ getStatusText(currentSuggestion.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="处理进度">
            <el-progress
              :percentage="getProgressPercentage(currentSuggestion.status)"
              :color="getProgressColor(currentSuggestion.status)"
            />
          </el-descriptions-item>
          <el-descriptions-item label="提交人">
            {{ currentSuggestion.submitter.isAnonymous ? '匿名用户' : currentSuggestion.submitter.name }}
          </el-descriptions-item>
          <el-descriptions-item label="负责人">
            {{ currentSuggestion.assignedTo?.name || '未分配' }}
          </el-descriptions-item>
          <el-descriptions-item label="处理时长">
            {{ getProcessingDays(currentSuggestion.createdAt, currentSuggestion.status) }}天
          </el-descriptions-item>
          <el-descriptions-item label="预估成本" v-if="currentSuggestion.estimatedCost > 0">
            ¥{{ currentSuggestion.estimatedCost }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="content-section">
          <h4>详细内容</h4>
          <div class="content-text">{{ currentSuggestion.content }}</div>
        </div>

        <div class="tags-section" v-if="currentSuggestion.tags && currentSuggestion.tags.length">
          <h4>相关标签</h4>
          <el-tag
            v-for="tag in currentSuggestion.tags"
            :key="tag"
            style="margin-right: 8px"
          >
            {{ tag }}
          </el-tag>
        </div>

        <div class="votes-section">
          <h4>支持度统计</h4>
          <div class="vote-stats">
            <div class="vote-item support">
              <span class="icon">👍</span>
              <span class="count">{{ currentSuggestion.votes.support }}</span>
              <span class="label">支持</span>
            </div>
            <div class="vote-item oppose">
              <span class="icon">👎</span>
              <span class="count">{{ currentSuggestion.votes.oppose }}</span>
              <span class="label">反对</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 时间线对话框 -->
    <el-dialog
      v-model="timelineVisible"
      title="处理时间线"
      width="700px"
    >
      <div v-if="currentSuggestion" class="timeline-dialog">
        <div class="suggestion-info">
          <h3>{{ currentSuggestion.title }}</h3>
          <p>{{ currentSuggestion.content }}</p>
        </div>

        <el-divider />

        <div class="progress-section">
          <h4>当前进度</h4>
          <el-progress
            :percentage="getProgressPercentage(currentSuggestion.status)"
            :color="getProgressColor(currentSuggestion.status)"
            :stroke-width="12"
            text-inside
          />
        </div>

        <el-divider />

        <div class="timeline-section">
          <h4>处理记录</h4>
          <el-timeline>
            <el-timeline-item
              v-for="note in [...currentSuggestion.reviewNotes].reverse()"
              :key="note._id"
              :timestamp="formatDate(note.createdAt)"
              :type="getTimelineType(note.action)"
              :icon="getTimelineIcon(note.action)"
            >
              <div class="timeline-item-content">
                <div class="action-header">
                  <span class="action-title">{{ getActionText(note.action) }}</span>
                  <span class="reviewer">{{ note.reviewer?.name || '系统' }}</span>
                </div>
                <div class="note-content">{{ note.note }}</div>
              </div>
            </el-timeline-item>
            <el-timeline-item
              :timestamp="formatDate(currentSuggestion.createdAt)"
              type="primary"
              icon="Plus"
            >
              <div class="timeline-item-content">
                <div class="action-header">
                  <span class="action-title">建议提交</span>
                  <span class="reviewer">{{ currentSuggestion.submitter.isAnonymous ? '匿名用户' : currentSuggestion.submitter.name }}</span>
                </div>
                <div class="note-content">提交了新的建议</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { suggestionApi } from '../api/suggestion'

export default {
  name: 'SuggestionTracking',
  components: {
    Search,
    Refresh,
    Plus
  },
  setup() {
    const suggestions = ref([])
    const categories = ref([])
    const loading = ref(false)
    const detailVisible = ref(false)
    const timelineVisible = ref(false)
    const currentSuggestion = ref(null)

    const searchKeyword = ref('')
    const filterStatus = ref('')
    const currentPage = ref(1)
    const pageSize = ref(10)
    const total = ref(0)

    const stats = reactive({
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0
    })

    const loadSuggestions = async () => {
      try {
        loading.value = true
        const params = {
          village: 'default_village',
          status: filterStatus.value,
          page: currentPage.value,
          limit: pageSize.value
        }

        if (searchKeyword.value) {
          params.search = searchKeyword.value
        }

        const response = await suggestionApi.getList(params)
        suggestions.value = response.data.suggestions
        total.value = response.data.pagination.totalCount

      } catch (error) {
        ElMessage.error('加载建议列表失败：' + error.message)
      } finally {
        loading.value = false
      }
    }

    const loadStats = async () => {
      try {
        const response = await suggestionApi.getStats('default_village')
        const statsData = response.data.totalStats

        stats.total = statsData.total || 0
        stats.pending = statsData.submitted || 0
        stats.inProgress = statsData.inProgress || 0
        stats.completed = statsData.completed || 0

      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    }

    const loadCategories = async () => {
      try {
        const response = await suggestionApi.getCategories('default_village')
        categories.value = response.data
      } catch (error) {
        console.error('加载分类失败:', error)
      }
    }

    const searchSuggestions = () => {
      currentPage.value = 1
      loadSuggestions()
    }

    const showDetail = (suggestion) => {
      currentSuggestion.value = suggestion
      detailVisible.value = true
    }

    const showTimeline = (suggestion) => {
      currentSuggestion.value = suggestion
      timelineVisible.value = true
    }

    // 辅助函数
    const getCategoryName = (categoryEn) => {
      const category = categories.value.find(c => c.nameEn === categoryEn)
      return category ? category.name : categoryEn
    }

    const getStatusType = (status) => {
      const types = {
        submitted: 'info',
        under_review: 'warning',
        in_progress: 'primary',
        completed: 'success',
        rejected: 'danger'
      }
      return types[status] || 'info'
    }

    const getStatusText = (status) => {
      const texts = {
        submitted: '待审核',
        under_review: '审核中',
        in_progress: '进行中',
        completed: '已完成',
        rejected: '已拒绝'
      }
      return texts[status] || status
    }

    const getPriorityType = (priority) => {
      const types = {
        urgent: 'danger',
        high: 'warning',
        medium: 'primary',
        low: 'info'
      }
      return types[priority] || 'info'
    }

    const getPriorityText = (priority) => {
      const texts = {
        urgent: '特急',
        high: '紧急',
        medium: '重要',
        low: '一般'
      }
      return texts[priority] || priority
    }

    const getProgressPercentage = (status) => {
      const percentages = {
        submitted: 10,
        under_review: 30,
        in_progress: 70,
        completed: 100,
        rejected: 0
      }
      return percentages[status] || 0
    }

    const getProgressColor = (status) => {
      const colors = {
        submitted: '#909399',
        under_review: '#e6a23c',
        in_progress: '#409eff',
        completed: '#67c23a',
        rejected: '#f56c6c'
      }
      return colors[status] || '#909399'
    }

    const getActionText = (action) => {
      const texts = {
        approved: '审核通过',
        rejected: '拒绝处理',
        needs_more_info: '需要更多信息',
        in_progress: '开始处理',
        completed: '处理完成',
        under_review: '开始审核'
      }
      return texts[action] || action
    }

    const getTimelineType = (action) => {
      const types = {
        approved: 'success',
        rejected: 'danger',
        needs_more_info: 'warning',
        in_progress: 'primary',
        completed: 'success',
        under_review: 'info'
      }
      return types[action] || 'primary'
    }

    const getTimelineIcon = (action) => {
      const icons = {
        approved: 'Check',
        rejected: 'Close',
        needs_more_info: 'QuestionFilled',
        in_progress: 'Loading',
        completed: 'CircleCheck',
        under_review: 'View'
      }
      return icons[action] || 'InfoFilled'
    }

    const getProcessingDays = (createdAt, status) => {
      const created = new Date(createdAt)
      const now = new Date()
      const diffTime = Math.abs(now - created)
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('zh-CN')
    }

    const formatDateColumn = (row, column, cellValue) => {
      return new Date(cellValue).toLocaleDateString('zh-CN')
    }

    onMounted(() => {
      loadSuggestions()
      loadStats()
      loadCategories()
    })

    return {
      suggestions,
      categories,
      loading,
      detailVisible,
      timelineVisible,
      currentSuggestion,
      searchKeyword,
      filterStatus,
      currentPage,
      pageSize,
      total,
      stats,
      Search,
      Refresh,
      loadSuggestions,
      searchSuggestions,
      showDetail,
      showTimeline,
      getCategoryName,
      getStatusType,
      getStatusText,
      getPriorityType,
      getPriorityText,
      getProgressPercentage,
      getProgressColor,
      getActionText,
      getTimelineType,
      getTimelineIcon,
      getProcessingDays,
      formatDate,
      formatDateColumn
    }
  }
}
</script>

<style scoped>
.suggestion-tracking-page {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #2c3e50;
}

.search-bar {
  display: flex;
  align-items: center;
}

.stats-row {
  margin-bottom: 20px;
}

.stats-card {
  height: 100px;
}

.stats-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stats-icon {
  font-size: 32px;
  margin-right: 16px;
  width: 50px;
  text-align: center;
}

.stats-info {
  flex: 1;
}

.stats-number {
  font-size: 28px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.main-card {
  min-height: 500px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.expand-content {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 4px;
  margin: 10px 0;
}

.suggestion-content h4,
.progress-timeline h4 {
  margin-bottom: 10px;
  color: #2c3e50;
}

.suggestion-content p {
  line-height: 1.6;
  margin-bottom: 20px;
}

.timeline-content {
  background: white;
  padding: 10px;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.action-title {
  font-weight: bold;
  color: #2c3e50;
}

.reviewer {
  font-size: 12px;
  color: #909399;
  margin: 4px 0;
}

.note-text {
  line-height: 1.6;
}

.progress-info {
  padding: 0 10px;
}

.suggestion-detail {
  max-height: 600px;
  overflow-y: auto;
}

.content-section,
.tags-section,
.votes-section {
  margin-top: 20px;
}

.content-section h4,
.tags-section h4,
.votes-section h4 {
  margin-bottom: 10px;
  color: #2c3e50;
}

.content-text {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.vote-stats {
  display: flex;
  gap: 40px;
}

.vote-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vote-item .icon {
  font-size: 24px;
}

.vote-item .count {
  font-size: 20px;
  font-weight: bold;
}

.vote-item.support .count {
  color: #67c23a;
}

.vote-item.oppose .count {
  color: #f56c6c;
}

.timeline-dialog {
  max-height: 600px;
  overflow-y: auto;
}

.suggestion-info h3 {
  margin-bottom: 10px;
  color: #2c3e50;
}

.progress-section,
.timeline-section {
  margin: 20px 0;
}

.progress-section h4,
.timeline-section h4 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.timeline-item-content {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #409eff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.action-title {
  font-weight: bold;
  color: #2c3e50;
  font-size: 16px;
}

.reviewer {
  font-size: 12px;
  color: #909399;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 12px;
}

.note-content {
  line-height: 1.6;
  color: #666;
}
</style>