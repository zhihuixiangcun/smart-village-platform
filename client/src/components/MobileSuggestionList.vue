<template>
  <div class="mobile-suggestion-list">
    <!-- 移动端头部 -->
    <div class="mobile-header">
      <div class="mobile-header-back" @click="$router.go(-1)">
        <el-icon><ArrowLeft /></el-icon>
      </div>
      <div class="mobile-header-title">建议征集</div>
      <div class="mobile-header-action" @click="showFilters = !showFilters">
        筛选
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="mobile-search">
      <input
        v-model="searchKeyword"
        class="mobile-search-input"
        placeholder="搜索建议标题或内容..."
        @input="debounceSearch"
      >
    </div>

    <!-- 筛选标签 -->
    <div v-show="showFilters" class="mobile-filters">
      <div class="mobile-filter-section">
        <div class="filter-title">状态筛选</div>
        <div class="mobile-tags">
          <button
            v-for="status in statusOptions"
            :key="status.value"
            :class="['mobile-tag', { active: filterStatus === status.value }]"
            @click="filterStatus = status.value; loadSuggestions()"
          >
            {{ status.label }}
          </button>
        </div>
      </div>

      <div class="mobile-filter-section">
        <div class="filter-title">分类筛选</div>
        <div class="mobile-tags">
          <button
            v-for="category in categories"
            :key="category.nameEn"
            :class="['mobile-tag', { active: filterCategory === category.nameEn }]"
            @click="filterCategory = category.nameEn; loadSuggestions()"
          >
            {{ category.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="mobile-stats-grid">
      <div class="mobile-stats-card">
        <div class="stats-number">{{ stats.total }}</div>
        <div class="stats-label">总建议</div>
      </div>
      <div class="mobile-stats-card">
        <div class="stats-number">{{ stats.pending }}</div>
        <div class="stats-label">待处理</div>
      </div>
      <div class="mobile-stats-card">
        <div class="stats-number">{{ stats.inProgress }}</div>
        <div class="stats-label">处理中</div>
      </div>
      <div class="mobile-stats-card">
        <div class="stats-number">{{ stats.completed }}</div>
        <div class="stats-label">已完成</div>
      </div>
    </div>

    <!-- 建议列表 -->
    <div class="mobile-suggestion-cards">
      <div
        v-for="suggestion in suggestions"
        :key="suggestion._id"
        class="mobile-suggestion-card"
        @click="showDetail(suggestion)"
      >
        <!-- 卡片头部 -->
        <div class="card-header">
          <div class="suggestion-title">{{ suggestion.title }}</div>
          <div class="suggestion-status">
            <span :class="['mobile-status', `mobile-status-${getStatusType(suggestion.status)}`]">
              {{ getStatusText(suggestion.status) }}
            </span>
          </div>
        </div>

        <!-- 卡片内容 -->
        <div class="card-content">
          <div class="suggestion-content">{{ suggestion.content }}</div>

          <!-- 标签和分类 -->
          <div class="suggestion-meta">
            <span class="category-tag">{{ getCategoryName(suggestion.category) }}</span>
            <span class="priority-tag" :class="getPriorityClass(suggestion.priority)">
              {{ getPriorityText(suggestion.priority) }}
            </span>
          </div>

          <!-- 投票信息 -->
          <div class="vote-section">
            <div class="vote-stats">
              <span class="vote-item support">
                👍 {{ suggestion.votes?.support || 0 }}
              </span>
              <span class="vote-item oppose">
                👎 {{ suggestion.votes?.oppose || 0 }}
              </span>
            </div>
            <div class="vote-actions">
              <button
                class="vote-btn support"
                :class="{ active: userVote === 'support' }"
                @click.stop="vote(suggestion._id, 'support')"
              >
                支持
              </button>
              <button
                class="vote-btn oppose"
                :class="{ active: userVote === 'oppose' }"
                @click.stop="vote(suggestion._id, 'oppose')"
              >
                反对
              </button>
            </div>
          </div>

          <!-- 底部信息 -->
          <div class="card-footer">
            <div class="submitter-info">
              <span class="submitter-name">
                {{ suggestion.submitter?.isAnonymous ? '匿名用户' : suggestion.submitter?.name }}
              </span>
              <span class="submit-time">{{ formatTime(suggestion.createdAt) }}</span>
            </div>
            <div class="progress-info" v-if="suggestion.status !== 'submitted'">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: getProgressPercentage(suggestion.status) + '%' }"
                ></div>
              </div>
              <span class="progress-text">{{ getProgressText(suggestion.status) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div
        v-if="hasMore && !loading"
        class="load-more-btn"
        @click="loadMore"
      >
        加载更多
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="mobile-loading">
        <div class="mobile-loading-spinner"></div>
        加载中...
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && suggestions.length === 0" class="mobile-empty">
        <div class="mobile-empty-icon">📝</div>
        <div class="mobile-empty-text">暂无建议</div>
        <div class="mobile-empty-desc">
          {{ searchKeyword ? '未找到匹配的建议' : '还没有人提交建议，来提交第一个吧' }}
        </div>
      </div>
    </div>

    <!-- 浮动操作按钮 -->
    <div class="mobile-fab" @click="$router.push('/suggestions/submit')">
      <el-icon><Plus /></el-icon>
    </div>

    <!-- 建议详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="建议详情"
      :width="isMobile ? '95%' : '60%'"
      class="mobile-dialog"
    >
      <div v-if="currentSuggestion" class="suggestion-detail-mobile">
        <!-- 详情内容 -->
        <div class="detail-section">
          <h3>{{ currentSuggestion.title }}</h3>
          <div class="detail-meta">
            <span class="detail-status" :class="getStatusClass(currentSuggestion.status)">
              {{ getStatusText(currentSuggestion.status) }}
            </span>
            <span class="detail-priority" :class="getPriorityClass(currentSuggestion.priority)">
              {{ getPriorityText(currentSuggestion.priority) }}
            </span>
          </div>
          <p class="detail-content">{{ currentSuggestion.content }}</p>
        </div>

        <!-- 投票统计 -->
        <div class="detail-section">
          <h4>支持度</h4>
          <div class="vote-chart">
            <div class="vote-bar">
              <div
                class="vote-bar-support"
                :style="{ width: getVotePercentage(currentSuggestion, 'support') + '%' }"
              ></div>
              <div
                class="vote-bar-oppose"
                :style="{ width: getVotePercentage(currentSuggestion, 'oppose') + '%' }"
              ></div>
            </div>
            <div class="vote-numbers">
              <span class="support-count">支持 {{ currentSuggestion.votes?.support || 0 }}</span>
              <span class="oppose-count">反对 {{ currentSuggestion.votes?.oppose || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- 处理记录 -->
        <div v-if="currentSuggestion.reviewNotes?.length" class="detail-section">
          <h4>处理记录</h4>
          <div class="review-timeline">
            <div
              v-for="note in currentSuggestion.reviewNotes"
              :key="note._id"
              class="timeline-item"
            >
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-title">{{ getActionText(note.action) }}</div>
                <div class="timeline-desc">{{ note.note }}</div>
                <div class="timeline-time">{{ formatTime(note.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- AI分析结果 -->
        <div v-if="aiAnalysis" class="detail-section">
          <h4>AI智能分析</h4>
          <div class="ai-analysis">
            <div class="analysis-item">
              <span class="analysis-label">情感倾向:</span>
              <span :class="['analysis-value', `sentiment-${aiAnalysis.sentiment}`]">
                {{ getSentimentText(aiAnalysis.sentiment) }}
              </span>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">紧急程度:</span>
              <span :class="['analysis-value', `urgency-${aiAnalysis.urgency}`]">
                {{ getUrgencyText(aiAnalysis.urgency) }}
              </span>
            </div>
            <div v-if="aiAnalysis.keywords?.length" class="analysis-item">
              <span class="analysis-label">关键词:</span>
              <div class="keywords">
                <span
                  v-for="keyword in aiAnalysis.keywords"
                  :key="keyword"
                  class="keyword-tag"
                >
                  {{ keyword }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer-mobile">
          <button class="mobile-btn mobile-btn-secondary" @click="detailVisible = false">
            关闭
          </button>
          <button
            v-if="currentSuggestion?.status === 'submitted'"
            class="mobile-btn mobile-btn-primary"
            @click="startReview"
          >
            开始评估
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { useResponsive } from '@/composables/useResponsive'
import { suggestionApi } from '@/api/suggestion'

export default {
  name: 'MobileSuggestionList',
  components: {
    ArrowLeft,
    Plus
  },
  setup() {
    const { isMobile } = useResponsive()

    const suggestions = ref([])
    const categories = ref([])
    const loading = ref(false)
    const hasMore = ref(true)
    const currentPage = ref(1)
    const pageSize = ref(10)
    const showFilters = ref(false)
    const detailVisible = ref(false)
    const currentSuggestion = ref(null)
    const aiAnalysis = ref(null)

    const searchKeyword = ref('')
    const filterStatus = ref('')
    const filterCategory = ref('')

    const stats = reactive({
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0
    })

    const statusOptions = [
      { label: '全部', value: '' },
      { label: '待审核', value: 'submitted' },
      { label: '审核中', value: 'under_review' },
      { label: '进行中', value: 'in_progress' },
      { label: '已完成', value: 'completed' },
      { label: '已拒绝', value: 'rejected' }
    ]

    const loadSuggestions = async (reset = true) => {
      try {
        if (reset) {
          currentPage.value = 1
          suggestions.value = []
        }

        loading.value = true

        const params = {
          village: 'default_village',
          page: currentPage.value,
          limit: pageSize.value,
          status: filterStatus.value,
          category: filterCategory.value,
          search: searchKeyword.value
        }

        const response = await suggestionApi.getList(params)
        const newSuggestions = response.data.suggestions

        if (reset) {
          suggestions.value = newSuggestions
        } else {
          suggestions.value.push(...newSuggestions)
        }

        hasMore.value = newSuggestions.length === pageSize.value

      } catch (error) {
        ElMessage.error('加载建议列表失败：' + error.message)
      } finally {
        loading.value = false
      }
    }

    const loadMore = () => {
      if (!hasMore.value || loading.value) return
      currentPage.value++
      loadSuggestions(false)
    }

    const loadStats = async () => {
      try {
        const response = await suggestionApi.getStats('default_village')
        const data = response.data.totalStats
        Object.assign(stats, {
          total: data.total || 0,
          pending: data.submitted || 0,
          inProgress: data.inProgress || 0,
          completed: data.completed || 0
        })
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    }

    const loadCategories = async () => {
      try {
        const response = await suggestionApi.getCategories('default_village')
        categories.value = [{ name: '全部', nameEn: '' }, ...response.data]
      } catch (error) {
        console.error('加载分类失败:', error)
      }
    }

    const debounceSearch = (() => {
      let timer = null
      return () => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          loadSuggestions()
        }, 500)
      }
    })()

    const showDetail = async (suggestion) => {
      currentSuggestion.value = suggestion
      detailVisible.value = true

      // 加载AI分析结果
      try {
        const response = await fetch('/api/ai-analysis/analyze-sentiment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: suggestion.content })
        })
        const result = await response.json()
        if (result.success) {
          aiAnalysis.value = result.data
        }
      } catch (error) {
        console.error('AI分析失败:', error)
      }
    }

    const vote = async (suggestionId, voteType) => {
      try {
        // 这里应该集成区块链投票
        const response = await suggestionApi.vote(suggestionId, {
          userId: 'current_user_id',
          voteType
        })

        ElMessage.success('投票成功')
        await loadSuggestions()

      } catch (error) {
        ElMessage.error('投票失败：' + error.message)
      }
    }

    // 辅助函数
    const getCategoryName = (categoryEn) => {
      const category = categories.value.find(c => c.nameEn === categoryEn)
      return category ? category.name : categoryEn
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

    const getStatusType = (status) => {
      const types = {
        submitted: 'info',
        under_review: 'warning',
        in_progress: 'info',
        completed: 'success',
        rejected: 'error'
      }
      return types[status] || 'info'
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

    const getPriorityClass = (priority) => {
      return `priority-${priority}`
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

    const getProgressText = (status) => {
      return `${getProgressPercentage(status)}%`
    }

    const formatTime = (dateString) => {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (days === 0) return '今天'
      if (days === 1) return '昨天'
      if (days < 7) return `${days}天前`
      return date.toLocaleDateString('zh-CN')
    }

    const getVotePercentage = (suggestion, type) => {
      const total = (suggestion.votes?.support || 0) + (suggestion.votes?.oppose || 0)
      if (total === 0) return 0
      return Math.round(((suggestion.votes?.[type] || 0) / total) * 100)
    }

    const getSentimentText = (sentiment) => {
      const texts = {
        positive: '积极',
        negative: '消极',
        neutral: '中性'
      }
      return texts[sentiment] || sentiment
    }

    const getUrgencyText = (urgency) => {
      const texts = {
        high: '高',
        medium: '中',
        low: '低'
      }
      return texts[urgency] || urgency
    }

    const getActionText = (action) => {
      const texts = {
        approved: '审核通过',
        rejected: '拒绝处理',
        needs_more_info: '需要更多信息',
        in_progress: '开始处理',
        completed: '处理完成'
      }
      return texts[action] || action
    }

    onMounted(() => {
      loadSuggestions()
      loadStats()
      loadCategories()
    })

    return {
      isMobile,
      suggestions,
      categories,
      loading,
      hasMore,
      showFilters,
      detailVisible,
      currentSuggestion,
      aiAnalysis,
      searchKeyword,
      filterStatus,
      filterCategory,
      stats,
      statusOptions,
      loadSuggestions,
      loadMore,
      debounceSearch,
      showDetail,
      vote,
      getCategoryName,
      getStatusText,
      getStatusType,
      getPriorityText,
      getPriorityClass,
      getProgressPercentage,
      getProgressText,
      formatTime,
      getVotePercentage,
      getSentimentText,
      getUrgencyText,
      getActionText
    }
  }
}
</script>

<style scoped>
.mobile-suggestion-list {
  min-height: 100vh;
  background: #f8f9fa;
  padding-bottom: 80px;
}

.mobile-filters {
  background: white;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.mobile-filter-section {
  margin-bottom: 16px;
}

.mobile-filter-section:last-child {
  margin-bottom: 0;
}

.filter-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.mobile-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
  background: white;
  margin-bottom: 8px;
}

.mobile-stats-card {
  text-align: center;
  padding: 12px 8px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stats-number {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 12px;
  color: #606266;
}

.mobile-suggestion-cards {
  padding: 0 16px;
}

.mobile-suggestion-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.mobile-suggestion-card:active {
  transform: translateY(1px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.suggestion-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  flex: 1;
  margin-right: 12px;
}

.suggestion-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.suggestion-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.category-tag {
  background: #e6f7ff;
  color: #1890ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.priority-tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.priority-urgent {
  background: #fff2f0;
  color: #ff4d4f;
}

.priority-high {
  background: #fff7e6;
  color: #fa8c16;
}

.priority-medium {
  background: #e6f7ff;
  color: #1890ff;
}

.priority-low {
  background: #f6ffed;
  color: #52c41a;
}

.vote-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

.vote-stats {
  display: flex;
  gap: 16px;
}

.vote-item {
  font-size: 14px;
  color: #606266;
}

.vote-item.support {
  color: #52c41a;
}

.vote-item.oppose {
  color: #ff4d4f;
}

.vote-actions {
  display: flex;
  gap: 8px;
}

.vote-btn {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vote-btn.support {
  border-color: #52c41a;
  color: #52c41a;
}

.vote-btn.support.active {
  background: #52c41a;
  color: white;
}

.vote-btn.oppose {
  border-color: #ff4d4f;
  color: #ff4d4f;
}

.vote-btn.oppose.active {
  background: #ff4d4f;
  color: white;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.submitter-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.submitter-name {
  font-weight: 500;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  width: 60px;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a 0%, #1890ff 100%);
  transition: width 0.3s ease;
}

.load-more-btn {
  text-align: center;
  padding: 16px;
  color: #409eff;
  font-size: 14px;
  cursor: pointer;
  background: white;
  border-radius: 8px;
  margin: 16px 0;
}

.mobile-fab {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #409eff 0%, #66b3ff 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
  cursor: pointer;
  z-index: 999;
  transition: transform 0.2s ease;
}

.mobile-fab:active {
  transform: scale(0.95);
}

.suggestion-detail-mobile {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-section:last-child {
  border-bottom: none;
}

.detail-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.detail-section h4 {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12px;
}

.detail-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.detail-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
}

.vote-chart {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

.vote-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
  display: flex;
}

.vote-bar-support {
  background: #52c41a;
  transition: width 0.3s ease;
}

.vote-bar-oppose {
  background: #ff4d4f;
  transition: width 0.3s ease;
}

.vote-numbers {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.support-count {
  color: #52c41a;
}

.oppose-count {
  color: #ff4d4f;
}

.review-timeline {
  position: relative;
}

.timeline-item {
  display: flex;
  margin-bottom: 16px;
  position: relative;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  background: #409eff;
  border-radius: 50%;
  margin-right: 12px;
  margin-top: 6px;
  flex-shrink: 0;
}

.timeline-content {
  flex: 1;
}

.timeline-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.timeline-desc {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.timeline-time {
  font-size: 12px;
  color: #909399;
}

.ai-analysis {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

.analysis-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.analysis-item:last-child {
  margin-bottom: 0;
}

.analysis-label {
  color: #606266;
  margin-right: 8px;
  flex-shrink: 0;
}

.analysis-value {
  font-weight: 500;
}

.sentiment-positive {
  color: #52c41a;
}

.sentiment-negative {
  color: #ff4d4f;
}

.sentiment-neutral {
  color: #1890ff;
}

.urgency-high {
  color: #ff4d4f;
}

.urgency-medium {
  color: #fa8c16;
}

.urgency-low {
  color: #52c41a;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.keyword-tag {
  background: #e6f7ff;
  color: #1890ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.dialog-footer-mobile {
  display: flex;
  gap: 12px;
}

.dialog-footer-mobile .mobile-btn {
  flex: 1;
}
</style>