<template>
  <div class="task-card" :class="{ 'is-overdue': task.isOverdue, 'is-completed': task.status === 'completed' }" @click="handleClick">
    <div class="task-header">
      <div class="task-title">{{ task.title }}</div>
      <el-dropdown trigger="click" @command="handleCommand" @click.stop>
        <el-icon class="more-btn"><MoreFilled /></el-icon>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="edit">编辑</el-dropdown-item>
            <el-dropdown-item command="status">变更状态</el-dropdown-item>
            <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="task-body">
      <div class="task-description" v-if="task.description">
        {{ task.description }}
      </div>

      <div class="task-meta">
        <div class="meta-item">
          <el-icon><User /></el-icon>
          <span>{{ task.assigneeName || '未分配' }}</span>
        </div>

        <div class="meta-item" v-if="task.dueDate">
          <el-icon><Calendar /></el-icon>
          <span :class="{ 'overdue': task.isOverdue }">
            {{ formatDate(task.dueDate) }}
          </span>
        </div>

        <div class="meta-item">
          <el-tag :type="getCategoryType(task.category)" size="small">
            {{ getCategoryLabel(task.category) }}
          </el-tag>
        </div>
      </div>

      <div class="task-progress" v-if="task.progress > 0">
        <el-progress :percentage="task.progress" :stroke-width="4" :show-text="false" />
      </div>

      <div class="task-subtasks" v-if="task.subtasks && task.subtasks.length">
        <span class="subtasks-text">
          <el-icon><List /></el-icon>
          {{ completedSubtasks }}/{{ task.subtasks.length }} 子任务
        </span>
      </div>
    </div>

    <div class="task-footer">
      <div class="task-status">
        <el-tag :type="getStatusType(task.status)" size="small">
          {{ getStatusLabel(task.status) }}
        </el-tag>
      </div>

      <div class="task-priority">
        <el-rate v-model="task.priority" disabled size="small" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MoreFilled, User, Calendar, List } from '@element-plus/icons-vue'

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click', 'status-change'])

const completedSubtasks = computed(() => {
  return props.task.subtasks?.filter(st => st.completed).length || 0
})

const handleClick = () => {
  emit('click', props.task)
}

const handleCommand = (command) => {
  if (command === 'status') {
    emit('status-change', props.task._id)
  }
  // Other commands handled by parent
}

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
  const d = new Date(date)
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${month}-${day}`
}
</script>

<style scoped>
.task-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.task-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.task-card.is-overdue {
  border-left: 3px solid #f56c6c;
}

.task-card.is-completed {
  opacity: 0.7;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.task-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  word-break: break-word;
}

.more-btn {
  color: #909399;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.more-btn:hover {
  background: #f5f7fa;
  color: #409eff;
}

.task-body {
  margin-bottom: 12px;
}

.task-description {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.meta-item .el-icon {
  font-size: 14px;
}

.meta-item span.overdue {
  color: #f56c6c;
  font-weight: 600;
}

.task-progress {
  margin: 8px 0;
}

.task-subtasks {
  margin-top: 8px;
}

.subtasks-text {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #f5f7fa;
}

.task-priority {
  display: flex;
  align-items: center;
}

.task-priority :deep(.el-rate) {
  display: flex;
  align-items: center;
}

.task-priority :deep(.el-rate__icon) {
  font-size: 14px;
  margin-right: 2px;
}
</style>
