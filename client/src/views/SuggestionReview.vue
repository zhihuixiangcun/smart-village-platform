<template>
  <div class="suggestion-review-page">
    <div class="header">
      <h2>建议评估流程</h2>
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
        <el-select
          v-model="filterPriority"
          placeholder="优先级筛选"
          style="width: 150px"
          @change="loadSuggestions"
        >
          <el-option label="全部" value="" />
          <el-option label="特急" value="urgent" />
          <el-option label="紧急" value="high" />
          <el-option label="重要" value="medium" />
          <el-option label="一般" value="low" />
        </el-select>
      </div>
    </div>

    <el-card>
      <el-table
        :data="suggestions"
        v-loading="loading"
        style="width: 100%"
        @row-click="showDetail"
        row-key="id"
      >
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
        <el-table-column label="优先级" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getPriorityType(row.priority)"
              size="small"
            >
              {{ getPriorityText(row.priority) }}
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
        <el-table-column
          prop="submitter.name"
          label="提交人"
          width="100"
        >
          <template #default="{ row }">
            {{ row.submitter.isAnonymous ? '匿名用户' : row.submitter.name }}
          </template>
        </el-table-column>
        <el-table-column label="支持度" width="100">
          <template #default="{ row }">
            <div class="vote-info">
              <span class="support">👍 {{ row.votes.support }}</span>
              <span class="oppose">👎 {{ row.votes.oppose }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="提交时间"
          width="150"
          :formatter="formatDate"
        />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              @click.stop="reviewSuggestion(row)"
              :disabled="row.status === 'completed'"
            >
              {{ getActionText(row.status) }}
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click.stop="assignSuggestion(row)"
              v-if="row.status !== 'rejected' && row.status !== 'completed'"
            >
              分配
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

    <!-- 建议详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="建议详情"
      width="800px"
      :before-close="handleDetailClose"
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
          <el-descriptions-item label="提交人">
            {{ currentSuggestion.submitter.isAnonymous ? '匿名用户' : currentSuggestion.submitter.name }}
          </el-descriptions-item>
          <el-descriptions-item label="联系方式" v-if="!currentSuggestion.submitter.isAnonymous">
            {{ currentSuggestion.submitter.phone }}
          </el-descriptions-item>
          <el-descriptions-item label="预估成本" v-if="currentSuggestion.estimatedCost > 0">
            ¥{{ currentSuggestion.estimatedCost }}
          </el-descriptions-item>
          <el-descriptions-item label="预估时间" v-if="currentSuggestion.estimatedTimeframe">
            {{ currentSuggestion.estimatedTimeframe }}
          </el-descriptions-item>
          <el-descriptions-item label="负责人" v-if="currentSuggestion.assignedTo">
            {{ currentSuggestion.assignedTo.name }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="content-section">
          <h4>详细内容</h4>
          <div class="content-text">{{ currentSuggestion.content }}</div>
        </div>

        <div class="tags-section" v-if="currentSuggestion.tags.length">
          <h4>相关标签</h4>
          <el-tag
            v-for="tag in currentSuggestion.tags"
            :key="tag"
            style="margin-right: 8px"
          >
            {{ tag }}
          </el-tag>
        </div>

        <div class="attachments-section" v-if="currentSuggestion.attachments.length">
          <h4>相关附件</h4>
          <div class="attachment-list">
            <div
              v-for="attachment in currentSuggestion.attachments"
              :key="attachment._id"
              class="attachment-item"
            >
              <el-link :href="getAttachmentUrl(attachment)" target="_blank">
                {{ attachment.filename }}
              </el-link>
              <span class="file-size">({{ formatFileSize(attachment.size) }})</span>
            </div>
          </div>
        </div>

        <div class="review-history" v-if="currentSuggestion.reviewNotes.length">
          <h4>处理记录</h4>
          <el-timeline>
            <el-timeline-item
              v-for="note in currentSuggestion.reviewNotes"
              :key="note._id"
              :timestamp="formatDate(note.createdAt)"
              :type="getActionType(note.action)"
            >
              <div class="review-note">
                <div class="reviewer">{{ note.reviewer.name }}</div>
                <div class="action">{{ getActionText(note.action) }}</div>
                <div class="note-content">{{ note.note }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
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

    <!-- 评估操作对话框 -->
    <el-dialog
      v-model="reviewVisible"
      title="建议评估"
      width="600px"
    >
      <el-form
        ref="reviewForm"
        :model="reviewFormData"
        :rules="reviewRules"
        label-width="100px"
      >
        <el-form-item label="评估结果" prop="action">
          <el-radio-group v-model="reviewFormData.action">
            <el-radio label="approved">通过审核</el-radio>
            <el-radio label="rejected">拒绝</el-radio>
            <el-radio label="needs_more_info">需要更多信息</el-radio>
            <el-radio label="in_progress">开始处理</el-radio>
            <el-radio label="completed">标记完成</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="评估意见" prop="note">
          <el-input
            v-model="reviewFormData.note"
            type="textarea"
            :rows="4"
            placeholder="请输入评估意见或处理说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reviewVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="submitReview"
            :loading="reviewing"
          >
            {{ reviewing ? '提交中...' : '提交' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分配对话框 -->
    <el-dialog
      v-model="assignVisible"
      title="分配建议"
      width="400px"
    >
      <el-form
        :model="assignFormData"
        label-width="100px"
      >
        <el-form-item label="负责人">
          <el-select
            v-model="assignFormData.assignedTo"
            placeholder="请选择负责人"
            style="width: 100%"
          >
            <el-option
              v-for="user in users"
              :key="user._id"
              :label="user.name"
              :value="user._id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="assignVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="submitAssign"
            :loading="assigning"
          >
            {{ assigning ? '分配中...' : '确定分配' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { suggestionApi } from '../api/suggestion'
import { userApi } from '../api/user'

export default {
  name: 'SuggestionReview',
  setup() {
    const reviewForm = ref(null)
    const suggestions = ref([])
    const categories = ref([])
    const users = ref([])
    const loading = ref(false)
    const reviewing = ref(false)
    const assigning = ref(false)
    const detailVisible = ref(false)
    const reviewVisible = ref(false)
    const assignVisible = ref(false)
    const currentSuggestion = ref(null)

    // 筛选参数
    const filterStatus = ref('')
    const filterPriority = ref('')
    const currentPage = ref(1)
    const pageSize = ref(10)
    const total = ref(0)

    const reviewFormData = reactive({
      action: '',
      note: '',
      reviewerId: ''
    })

    const assignFormData = reactive({
      assignedTo: ''
    })

    const reviewRules = reactive({
      action: [
        { required: true, message: '请选择评估结果', trigger: 'change' }
      ],
      note: [
        { required: true, message: '请输入评估意见', trigger: 'blur' }
      ]
    })

    const loadSuggestions = async () => {
      try {
        loading.value = true
        const params = {
          village: 'default_village',
          status: filterStatus.value,
          priority: filterPriority.value,
          page: currentPage.value,
          limit: pageSize.value
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

    const loadCategories = async () => {
      try {
        const response = await suggestionApi.getCategories('default_village')
        categories.value = response.data
      } catch (error) {
        console.error('加载分类失败:', error)
      }
    }

    const loadUsers = async () => {
      try {
        const response = await userApi.getList()
        users.value = response.data
      } catch (error) {
        console.error('加载用户列表失败:', error)
      }
    }

    const showDetail = (suggestion) => {
      currentSuggestion.value = suggestion
      detailVisible.value = true
    }

    const handleDetailClose = () => {
      detailVisible.value = false
      currentSuggestion.value = null
    }

    const reviewSuggestion = (suggestion) => {
      currentSuggestion.value = suggestion
      reviewFormData.action = ''
      reviewFormData.note = ''
      reviewFormData.reviewerId = 'current_user_id' // 实际应用中应从当前用户获取
      reviewVisible.value = true
    }

    const submitReview = async () => {
      try {
        const valid = await reviewForm.value.validate()
        if (!valid) return

        reviewing.value = true

        await suggestionApi.updateStatus(currentSuggestion.value._id, {
          status: reviewFormData.action,
          reviewNote: reviewFormData.note,
          reviewerId: reviewFormData.reviewerId
        })

        ElMessage.success('评估提交成功')
        reviewVisible.value = false
        await loadSuggestions()

      } catch (error) {
        ElMessage.error('评估提交失败：' + error.message)
      } finally {
        reviewing.value = false
      }
    }

    const assignSuggestion = (suggestion) => {
      currentSuggestion.value = suggestion
      assignFormData.assignedTo = suggestion.assignedTo?._id || ''
      assignVisible.value = true
    }

    const submitAssign = async () => {
      try {
        if (!assignFormData.assignedTo) {
          ElMessage.error('请选择负责人')
          return
        }

        assigning.value = true

        await suggestionApi.assign(currentSuggestion.value._id, {
          assignedTo: assignFormData.assignedTo
        })

        ElMessage.success('分配成功')
        assignVisible.value = false
        await loadSuggestions()

      } catch (error) {
        ElMessage.error('分配失败：' + error.message)
      } finally {
        assigning.value = false
      }
    }

    // 辅助函数
    const getCategoryName = (categoryEn) => {
      const category = categories.value.find(c => c.nameEn === categoryEn)
      return category ? category.name : categoryEn
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

    const getActionText = (action) => {
      const texts = {
        submitted: '开始审核',
        under_review: '继续审核',
        in_progress: '更新进度',
        completed: '已完成',
        rejected: '已拒绝',
        approved: '通过',
        needs_more_info: '需要更多信息'
      }
      return texts[action] || '处理'
    }

    const getActionType = (action) => {
      const types = {
        approved: 'success',
        rejected: 'danger',
        needs_more_info: 'warning',
        in_progress: 'primary',
        completed: 'success'
      }
      return types[action] || 'primary'
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('zh-CN')
    }

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getAttachmentUrl = (attachment) => {
      return `/uploads/suggestions/${attachment.path}`
    }

    onMounted(() => {
      loadSuggestions()
      loadCategories()
      loadUsers()
    })

    return {
      suggestions,
      categories,
      users,
      loading,
      reviewing,
      assigning,
      detailVisible,
      reviewVisible,
      assignVisible,
      currentSuggestion,
      filterStatus,
      filterPriority,
      currentPage,
      pageSize,
      total,
      reviewFormData,
      assignFormData,
      reviewRules,
      reviewForm,
      loadSuggestions,
      showDetail,
      handleDetailClose,
      reviewSuggestion,
      submitReview,
      assignSuggestion,
      submitAssign,
      getCategoryName,
      getPriorityType,
      getPriorityText,
      getStatusType,
      getStatusText,
      getActionText,
      getActionType,
      formatDate,
      formatFileSize,
      getAttachmentUrl
    }
  }
}
</script>

<style scoped>
.suggestion-review-page {
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

.header-actions {
  display: flex;
  align-items: center;
}

.vote-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vote-info .support {
  color: #67c23a;
}

.vote-info .oppose {
  color: #f56c6c;
}

.suggestion-detail {
  max-height: 600px;
  overflow-y: auto;
}

.content-section,
.tags-section,
.attachments-section,
.review-history,
.votes-section {
  margin-top: 20px;
}

.content-section h4,
.tags-section h4,
.attachments-section h4,
.review-history h4,
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

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-size {
  color: #909399;
  font-size: 12px;
}

.review-note {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
}

.reviewer {
  font-weight: bold;
  color: #2c3e50;
}

.action {
  color: #409eff;
  font-size: 12px;
  margin: 4px 0;
}

.note-content {
  line-height: 1.6;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>