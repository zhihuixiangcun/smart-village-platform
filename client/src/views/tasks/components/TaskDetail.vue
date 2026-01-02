<template>
  <el-drawer
    v-model="visible"
    :title="task?.title || '任务详情'"
    size="600px"
    @close="handleClose"
  >
    <div v-if="task" class="task-detail">
      <!-- 基本信息区域 -->
      <div class="detail-section">
        <h3 class="section-title">基本信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务类别">
            <el-tag :type="getCategoryType(task.category)">
              {{ getCategoryLabel(task.category) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-rate v-model="task.priority" disabled />
          </el-descriptions-item>
          <el-descriptions-item label="象限">
            <el-tag :type="getQuadrantType(task.quadrant)">
              {{ getQuadrantLabel(task.quadrant) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(task.status)">
              {{ getStatusLabel(task.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="负责人">
            {{ task.assigneeName || '未分配' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建人">
            {{ task.creatorName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="开始日期">
            {{ task.startDate ? formatDate(task.startDate) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="截止日期">
            <span :class="{ 'overdue': task.isOverdue }">
              {{ task.dueDate ? formatDate(task.dueDate) : '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="预估工时" span="2">
            {{ task.estimatedHours ? `${task.estimatedHours} 小时` : '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 任务描述 -->
      <div class="detail-section" v-if="task.description">
        <h3 class="section-title">任务描述</h3>
        <div class="description-content">{{ task.description }}</div>
      </div>

      <!-- 进度信息 -->
      <div class="detail-section">
        <h3 class="section-title">完成进度</h3>
        <div class="progress-info">
          <el-progress :percentage="task.progress" :stroke-width="20">
            <span class="percentage-value">{{ task.progress }}%</span>
          </el-progress>
        </div>

        <div class="progress-actions">
          <el-input-number
            v-model="newProgress"
            :min="0"
            :max="100"
            :step="5"
            placeholder="新进度"
            style="width: 150px"
          />
          <el-button type="primary" @click="updateProgress" :loading="updating">
            更新进度
          </el-button>
        </div>
      </div>

      <!-- 完成标准 -->
      <div class="detail-section" v-if="task.completionCriteria">
        <h3 class="section-title">完成标准</h3>
        <div class="criteria-content">{{ task.completionCriteria }}</div>
      </div>

      <!-- 子任务 -->
      <div class="detail-section" v-if="task.subtasks && task.subtasks.length">
        <h3 class="section-title">子任务</h3>
        <div class="subtasks-list">
          <div
            v-for="(subtask, index) in task.subtasks"
            :key="index"
            class="subtask-item"
          >
            <el-checkbox
              :model-value="subtask.completed"
              @change="toggleSubtask(index)"
            >
              <span :class="{ 'completed': subtask.completed }">
                {{ subtask.title }}
              </span>
            </el-checkbox>
            <span v-if="subtask.dueDate" class="subtask-due">
              截止: {{ formatDate(subtask.dueDate) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 标签 -->
      <div class="detail-section" v-if="task.tags && task.tags.length">
        <h3 class="section-title">标签</h3>
        <div class="tags-list">
          <el-tag
            v-for="tag in task.tags"
            :key="tag"
            style="margin-right: 8px; margin-bottom: 8px"
          >
            {{ tag }}
          </el-tag>
        </div>
      </div>

      <!-- 评论区域 -->
      <div class="detail-section">
        <h3 class="section-title">评论与讨论</h3>
        <div class="comments-list">
          <div
            v-for="(comment, index) in task.comments"
            :key="index"
            class="comment-item"
          >
            <div class="comment-header">
              <span class="comment-user">{{ comment.userName }}</span>
              <span class="comment-time">{{ formatDateTime(comment.createdAt) }}</span>
            </div>
            <div class="comment-content">{{ comment.content }}</div>
          </div>
          <el-empty v-if="!task.comments?.length" description="暂无评论" :image-size="60" />
        </div>

        <div class="comment-input">
          <el-input
            v-model="newComment"
            type="textarea"
            :rows="2"
            placeholder="添加评论..."
            @keyup.ctrl.enter="addComment"
          />
          <el-button
            type="primary"
            size="small"
            @click="addComment"
            :loading="addingComment"
            style="margin-top: 8px"
          >
            发送评论
          </el-button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="detail-actions">
        <el-button @click="handleEdit" :icon="Edit">编辑</el-button>
        <el-button
          v-if="task.status !== 'completed'"
          type="success"
          @click="completeTask"
          :loading="updating"
        >
          标记完成
        </el-button>
        <el-button
          v-if="task.status === 'in-progress'"
          type="warning"
          @click="pauseTask"
          :loading="updating"
        >
          暂停任务
        </el-button>
        <el-popconfirm
          title="确定删除此任务吗？"
          @confirm="deleteTask"
        >
          <template #reference>
            <el-button type="danger" :icon="Delete">删除</el-button>
          </template>
        </el-popconfirm>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { cadreTaskApi } from '@/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  task: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'updated'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const updating = ref(false)
const addingComment = ref(false)
const newProgress = ref(0)
const newComment = ref('')

// 监听任务变化
watch(() => props.task, (newTask) => {
  if (newTask) {
    newProgress.value = newTask.progress || 0
  }
}, { immediate: true })

const handleClose = () => {
  visible.value = false
}

const handleEdit = () => {
  // 触发编辑事件，由父组件处理
  emit('edit', props.task)
}

const updateProgress = async () => {
  try {
    updating.value = true
    const { data } = await cadreTaskApi.updateTask(props.task._id, {
      progress: newProgress.value
    })
    if (data.success) {
      ElMessage.success('进度更新成功')
      emit('updated')
    }
  } catch (error) {
    console.error('Update progress error:', error)
    ElMessage.error('更新失败')
  } finally {
    updating.value = false
  }
}

const toggleSubtask = async (index) => {
  try {
    updating.value = true
    const subtask = props.task.subtasks[index]
    const { data } = await cadreTaskApi.completeSubtask(
      props.task._id,
      subtask._id || index,
      { completed: !subtask.completed }
    )
    if (data.success) {
      ElMessage.success('子任务状态更新成功')
      emit('updated')
    }
  } catch (error) {
    console.error('Toggle subtask error:', error)
    ElMessage.error('更新失败')
  } finally {
    updating.value = false
  }
}

const completeTask = async () => {
  try {
    updating.value = true
    const { data } = await cadreTaskApi.updateTaskStatus(props.task._id, {
      status: 'completed',
      progress: 100
    })
    if (data.success) {
      ElMessage.success('任务已完成')
      emit('updated')
      handleClose()
    }
  } catch (error) {
    console.error('Complete task error:', error)
    ElMessage.error('操作失败')
  } finally {
    updating.value = false
  }
}

const pauseTask = async () => {
  try {
    updating.value = true
    const { data } = await cadreTaskApi.updateTaskStatus(props.task._id, {
      status: 'on-hold'
    })
    if (data.success) {
      ElMessage.success('任务已暂停')
      emit('updated')
    }
  } catch (error) {
    console.error('Pause task error:', error)
    ElMessage.error('操作失败')
  } finally {
    updating.value = false
  }
}

const deleteTask = async () => {
  try {
    updating.value = true
    const { data } = await cadreTaskApi.deleteTask(props.task._id)
    if (data.success) {
      ElMessage.success('删除成功')
      emit('updated')
      handleClose()
    }
  } catch (error) {
    console.error('Delete task error:', error)
    ElMessage.error('删除失败')
  } finally {
    updating.value = false
  }
}

const addComment = async () => {
  if (!newComment.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  try {
    addingComment.value = true
    const { data } = await cadreTaskApi.addComment(props.task._id, {
      content: newComment.value
    })
    if (data.success) {
      ElMessage.success('评论添加成功')
      newComment.value = ''
      emit('updated')
    }
  } catch (error) {
    console.error('Add comment error:', error)
    ElMessage.error('添加失败')
  } finally {
    addingComment.value = false
  }
}

// 工具函数
const getCategoryType = (category) => {
  const types = {
    governance: 'primary',
    emergency: 'danger',
    finance: 'success',
    service: 'info',
    infrastructure: 'warning',
    agriculture: 'success',
    other: 'info'
  }
  return types[category] || 'info'
}

const getCategoryLabel = (category) => {
  const labels = {
    governance: '村务',
    emergency: '应急',
    finance: '财务',
    service: '服务',
    infrastructure: '基建',
    agriculture: '农业',
    other: '其他'
  }
  return labels[category] || category
}

const getQuadrantType = (quadrant) => {
  const types = {
    'urgent-important': 'danger',
    'important-not-urgent': 'warning',
    'urgent-not-important': 'info',
    'not-urgent-not-important': 'info'
  }
  return types[quadrant] || 'info'
}

const getQuadrantLabel = (quadrant) => {
  const labels = {
    'urgent-important': '重要且紧急',
    'important-not-urgent': '重要不紧急',
    'urgent-not-important': '紧急不重要',
    'not-urgent-not-important': '不重要不紧急'
  }
  return labels[quadrant] || quadrant
}

const getStatusType = (status) => {
  const types = {
    pending: 'info',
    'in-progress': 'primary',
    completed: 'success',
    cancelled: 'danger',
    'on-hold': 'warning'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    pending: '待处理',
    'in-progress': '进行中',
    completed: '已完成',
    cancelled: '已取消',
    'on-hold': '暂停'
  }
  return labels[status] || status
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.task-detail {
  padding: 0 20px 20px;
}

.detail-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e4e7ed;
}

.description-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
}

.progress-info {
  margin-bottom: 16px;
}

.percentage-value {
  font-weight: 600;
  color: #409eff;
}

.progress-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.criteria-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subtask-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.subtask-item .completed {
  text-decoration: line-through;
  color: #909399;
}

.subtask-due {
  font-size: 12px;
  color: #909399;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
}

.comments-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.comment-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 12px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.comment-user {
  font-weight: 600;
  color: #303133;
}

.comment-time {
  font-size: 12px;
  color: #909399;
}

.comment-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

.overdue {
  color: #f56c6c;
  font-weight: 600;
}

.detail-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}
</style>
