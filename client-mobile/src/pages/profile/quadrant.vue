<template>
  <div class="quadrant-work-page">
    <!-- 顶部导航栏 -->
    <div class="navbar">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="title">四象限工作台</span>
      <button class="date-btn" @click="showDatePicker">
        {{ currentDate }}
      </button>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">全部任务</div>
      </div>
      <div class="stat-card urgent">
        <div class="stat-value">{{ stats.urgent }}</div>
        <div class="stat-label">紧急重要</div>
      </div>
      <div class="stat-card important">
        <div class="stat-value">{{ stats.important }}</div>
        <div class="stat-label">重要不紧急</div>
      </div>
      <div class="stat-card completed">
        <div class="stat-value">{{ stats.completed }}</div>
        <div class="stat-label">今日完成</div>
      </div>
    </div>

    <!-- 四象限任务 -->
    <div class="quadrant-grid">
      <!-- 第一象限：紧急重要 -->
      <div class="quadrant-item quadrant-1" @click="viewQuadrant('urgent-important')">
        <div class="quadrant-header">
          <span class="quadrant-icon">🔴</span>
          <span class="quadrant-title">紧急重要</span>
          <span class="quadrant-count">{{ tasks.urgentImportant.length }}</span>
        </div>
        <div class="task-preview">
          <div
            v-for="task in tasks.urgentImportant.slice(0, 3)"
            :key="task.id"
            class="task-item"
          >
            <span class="task-dot"></span>
            <span class="task-name">{{ task.title }}</span>
          </div>
          <div v-if="tasks.urgentImportant.length === 0" class="empty-tasks">
            暂无任务
          </div>
        </div>
      </div>

      <!-- 第二象限：重要不紧急 -->
      <div class="quadrant-item quadrant-2" @click="viewQuadrant('important')">
        <div class="quadrant-header">
          <span class="quadrant-icon">🟡</span>
          <span class="quadrant-title">重要不紧急</span>
          <span class="quadrant-count">{{ tasks.important.length }}</span>
        </div>
        <div class="task-preview">
          <div
            v-for="task in tasks.important.slice(0, 3)"
            :key="task.id"
            class="task-item"
          >
            <span class="task-dot"></span>
            <span class="task-name">{{ task.title }}</span>
          </div>
          <div v-if="tasks.important.length === 0" class="empty-tasks">
            暂无任务
          </div>
        </div>
      </div>

      <!-- 第三象限：紧急不重要 -->
      <div class="quadrant-item quadrant-3" @click="viewQuadrant('urgent')">
        <div class="quadrant-header">
          <span class="quadrant-icon">🟠</span>
          <span class="quadrant-title">紧急不重要</span>
          <span class="quadrant-count">{{ tasks.urgent.length }}</span>
        </div>
        <div class="task-preview">
          <div
            v-for="task in tasks.urgent.slice(0, 3)"
            :key="task.id"
            class="task-item"
          >
            <span class="task-dot"></span>
            <span class="task-name">{{ task.title }}</span>
          </div>
          <div v-if="tasks.urgent.length === 0" class="empty-tasks">
            暂无任务
          </div>
        </div>
      </div>

      <!-- 第四象限：不紧急不重要 -->
      <div class="quadrant-item quadrant-4" @click="viewQuadrant('normal')">
        <div class="quadrant-header">
          <span class="quadrant-icon">🟢</span>
          <span class="quadrant-title">不紧急不重要</span>
          <span class="quadrant-count">{{ tasks.normal.length }}</span>
        </div>
        <div class="task-preview">
          <div
            v-for="task in tasks.normal.slice(0, 3)"
            :key="task.id"
            class="task-item"
          >
            <span class="task-dot"></span>
            <span class="task-name">{{ task.title }}</span>
          </div>
          <div v-if="tasks.normal.length === 0" class="empty-tasks">
            暂无任务
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <button class="action-btn primary" @click="addTask">
        <span class="btn-icon">➕</span>
        <span class="btn-text">添加任务</span>
      </button>
      <button class="action-btn secondary" @click="viewCalendar">
        <span class="btn-icon">📅</span>
        <span class="btn-text">日历视图</span>
      </button>
      <button class="action-btn secondary" @click="viewReport">
        <span class="btn-icon">📊</span>
        <span class="btn-text">工作报告</span>
      </button>
    </div>

    <!-- 今日日程 -->
    <div class="schedule-section">
      <div class="section-header">
        <span class="section-title">今日日程</span>
        <button class="more-btn" @click="viewAllSchedule">查看全部</button>
      </div>
      <div class="schedule-list">
        <div
          v-for="item in todaySchedule"
          :key="item.id"
          class="schedule-item"
          @click="viewScheduleDetail(item)"
        >
          <div class="schedule-time">{{ item.time }}</div>
          <div class="schedule-content">
            <div class="schedule-title">{{ item.title }}</div>
            <div class="schedule-meta">
              <span class="schedule-type">{{ item.type }}</span>
              <span v-if="item.location" class="schedule-location">{{ item.location }}</span>
            </div>
          </div>
          <div class="schedule-status" :class="item.status">
            {{ item.status === 'completed' ? '✓' : '○' }}
          </div>
        </div>
        <div v-if="todaySchedule.length === 0" class="empty-schedule">
          <span class="empty-icon">📅</span>
          <span class="empty-text">今日暂无安排</span>
        </div>
      </div>
    </div>

    <!-- 任务列表弹窗 -->
    <div v-if="showTaskList" class="modal-overlay" @click="showTaskList = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <span class="modal-title">{{ quadrantTitle }}</span>
          <button class="modal-close" @click="showTaskList = false">×</button>
        </div>
        <div class="modal-body">
          <div
            v-for="task in currentTasks"
            :key="task.id"
            class="task-card"
            @click="viewTaskDetail(task)"
          >
            <div class="task-header">
              <span class="task-title">{{ task.title }}</span>
              <span class="task-priority" :class="task.priority">
                {{ getPriorityLabel(task.priority) }}
              </span>
            </div>
            <div class="task-meta">
              <span class="task-time">{{ task.deadline }}</span>
              <span class="task-type">{{ task.type }}</span>
            </div>
            <div class="task-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: task.progress + '%' }"></div>
              </div>
              <span class="progress-text">{{ task.progress }}%</span>
            </div>
          </div>
          <div v-if="currentTasks.length === 0" class="empty-tasks-full">
            <span class="empty-icon">📋</span>
            <span class="empty-text">暂无任务</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加任务弹窗 -->
    <div v-if="showAddTask" class="modal-overlay" @click="showAddTask = false">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <span class="modal-title">添加任务</span>
          <button class="modal-close" @click="showAddTask = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label class="form-label">任务标题</label>
            <input
              v-model="newTask.title"
              type="text"
              class="form-input"
              placeholder="请输入任务标题"
            />
          </div>

          <div class="form-item">
            <label class="form-label">任务类型</label>
            <div class="type-selector">
              <div
                v-for="type in taskTypes"
                :key="type.value"
                :class="['type-option', { 'type-option--selected': newTask.type === type.value }]"
                @click="newTask.type = type.value"
              >
                {{ type.label }}
              </div>
            </div>
          </div>

          <div class="form-item">
            <label class="form-label">优先级</label>
            <div class="priority-selector">
              <div
                v-for="priority in priorities"
                :key="priority.value"
                :class="['priority-option', { 'priority-option--selected': newTask.priority === priority.value }]"
                @click="newTask.priority = priority.value"
              >
                <span class="priority-dot" :style="{ background: priority.color }"></span>
                <span class="priority-label">{{ priority.label }}</span>
              </div>
            </div>
          </div>

          <div class="form-item">
            <label class="form-label">截止时间</label>
            <input
              v-model="newTask.deadline"
              type="datetime-local"
              class="form-input"
            />
          </div>

          <div class="form-item">
            <label class="form-label">任务描述</label>
            <textarea
              v-model="newTask.description"
              class="form-textarea"
              placeholder="请输入任务描述"
              rows="4"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="showAddTask = false">取消</button>
          <button class="modal-btn confirm" @click="submitTask">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 当前日期
const currentDate = ref('')

// UI状态
const showTaskList = ref(false)
const showAddTask = ref(false)
const currentQuadrant = ref('')

// 任务类型
const taskTypes = [
  { value: 'meeting', label: '会议' },
  { value: 'inspection', label: '巡查' },
  { value: 'document', label: '文件处理' },
  { value: 'visit', label: '走访' },
  { value: 'emergency', label: '应急处理' },
  { value: 'other', label: '其他' }
]

// 优先级
const priorities = [
  { value: 'urgent-important', label: '紧急重要', color: '#ff4d4f' },
  { value: 'important', label: '重要', color: '#faad14' },
  { value: 'urgent', label: '紧急', color: '#ff7a45' },
  { value: 'normal', label: '普通', color: '#52c41a' }
]

// 统计数据
const stats = ref({
  total: 24,
  urgent: 5,
  important: 8,
  completed: 6
})

// 任务列表（按象限分类）
const tasks = ref({
  urgentImportant: [
    { id: 1, title: '处理村民纠纷', type: '应急处理', deadline: '今天 14:00', progress: 60, priority: 'urgent-important' },
    { id: 2, title: '防汛设施检查', type: '巡查', deadline: '今天 16:00', progress: 30, priority: 'urgent-important' },
    { id: 3, title: '上级文件报送', type: '文件处理', deadline: '今天 18:00', progress: 0, priority: 'urgent-important' }
  ],
  important: [
    { id: 4, title: '制定本月工作计划', type: '会议', deadline: '明天 10:00', progress: 40, priority: 'important' },
    { id: 5, title: '乡村振兴项目推进', type: '其他', deadline: '本周五', progress: 25, priority: 'important' },
    { id: 6, title: '村民培训组织', type: '会议', deadline: '下周三', progress: 0, priority: 'important' }
  ],
  urgent: [
    { id: 7, title: '接听村民电话', type: '其他', deadline: '待处理', progress: 0, priority: 'urgent' },
    { id: 8, title: '整理文件资料', type: '文件处理', deadline: '今天', progress: 50, priority: 'urgent' }
  ],
  normal: [
    { id: 9, title: '学习政策文件', type: '文件处理', deadline: '本周', progress: 20, priority: 'normal' },
    { id: 10, title: '办公环境整理', type: '其他', deadline: '本周', progress: 0, priority: 'normal' }
  ]
})

// 今日日程
const todaySchedule = ref([
  { id: 1, time: '09:00', title: '村委工作例会', type: '会议', location: '会议室', status: 'completed' },
  { id: 2, time: '10:30', title: '走访困难群众', type: '走访', location: '东村一组', status: 'pending' },
  { id: 3, time: '14:00', title: '处理村民纠纷', type: '应急处理', location: '村委会', status: 'pending' },
  { id: 4, time: '16:00', title: '防汛设施检查', type: '巡查', location: '全村', status: 'pending' }
])

// 新任务表单
const newTask = ref({
  title: '',
  type: 'other',
  priority: 'normal',
  deadline: '',
  description: ''
})

// 当前象限标题
const quadrantTitle = computed(() => {
  const titles = {
    'urgent-important': '紧急重要',
    'important': '重要不紧急',
    'urgent': '紧急不重要',
    'normal': '不紧急不重要'
  }
  return titles[currentQuadrant.value] || '任务列表'
})

// 当前象限的任务
const currentTasks = computed(() => {
  const taskMap = {
    'urgent-important': tasks.value.urgentImportant,
    'important': tasks.value.important,
    'urgent': tasks.value.urgent,
    'normal': tasks.value.normal
  }
  return taskMap[currentQuadrant.value] || []
})

// 获取优先级标签
const getPriorityLabel = (priority) => {
  const item = priorities.find(p => p.value === priority)
  return item ? item.label : '普通'
}

// 显示日期选择器
const showDatePicker = () => {
  // TODO: 实现日期选择器
  console.log('选择日期')
}

// 查看象限任务
const viewQuadrant = (quadrant) => {
  currentQuadrant.value = quadrant
  showTaskList.value = true

  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 查看任务详情
const viewTaskDetail = (task) => {
  console.log('查看任务:', task)
  // TODO: 跳转到任务详情页
}

// 添加任务
const addTask = () => {
  showAddTask.value = true
}

// 提交任务
const submitTask = () => {
  if (!newTask.value.title.trim()) {
    alert('请输入任务标题')
    return
  }

  // 创建任务
  const task = {
    id: Date.now(),
    title: newTask.value.title,
    type: taskTypes.find(t => t.value === newTask.value.type)?.label || '其他',
    deadline: newTask.value.deadline || '待定',
    progress: 0,
    priority: newTask.value.priority
  }

  // 添加到对应象限
  const quadrantMap = {
    'urgent-important': 'urgentImportant',
    'important': 'important',
    'urgent': 'urgent',
    'normal': 'normal'
  }
  const key = quadrantMap[newTask.value.priority] || 'normal'
  tasks.value[key].unshift(task)

  // 更新统计
  stats.value.total++

  // 重置表单
  newTask.value = {
    title: '',
    type: 'other',
    priority: 'normal',
    deadline: '',
    description: ''
  }

  showAddTask.value = false

  alert('任务添加成功')
}

// 查看日历
const viewCalendar = () => {
  console.log('查看日历')
  // TODO: 跳转到日历视图
}

// 查看报告
const viewReport = () => {
  console.log('查看工作报告')
  // TODO: 跳转到报告页面
}

// 查看全部日程
const viewAllSchedule = () => {
  console.log('查看全部日程')
  // TODO: 跳转到日程列表
}

// 查看日程详情
const viewScheduleDetail = (item) => {
  console.log('查看日程:', item)
  // TODO: 显示日程详情
}

// 返回
const goBack = () => {
  router.back()
}

// 初始化
onMounted(() => {
  // 设置当前日期
  const now = new Date()
  currentDate.value = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
})
</script>

<style lang="scss" scoped>
.quadrant-work-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;

  .back-btn {
    background: none;
    border: none;
    font-size: 20px;
    padding: 8px;
    cursor: pointer;
  }

  .title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .date-btn {
    padding: 8px 16px;
    border: 1px solid #e8e8e8;
    background: #fff;
    border-radius: 8px;
    font-size: 14px;
    color: #666;
    cursor: pointer;
  }
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;

  .stat-card {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    text-align: center;

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 12px;
      color: #999;
    }

    &.urgent .stat-value {
      color: #ff4d4f;
    }

    &.important .stat-value {
      color: #faad14;
    }

    &.completed .stat-value {
      color: #52c41a;
    }
  }
}

.quadrant-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 0 16px 16px;

  .quadrant-item {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.3s;

    &:active {
      transform: scale(0.98);
    }

    .quadrant-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      .quadrant-icon {
        font-size: 18px;
      }

      .quadrant-title {
        flex: 1;
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }

      .quadrant-count {
        padding: 4px 8px;
        background: #f0f0f0;
        border-radius: 12px;
        font-size: 12px;
        color: #666;
      }
    }

    .task-preview {
      .task-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid #f5f5f5;

        &:last-child {
          border-bottom: none;
        }

        .task-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #1890ff;
          flex-shrink: 0;
        }

        .task-name {
          font-size: 13px;
          color: #666;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
      }

      .empty-tasks {
        text-align: center;
        padding: 20px 0;
        font-size: 12px;
        color: #ccc;
      }
    }
  }

  .quadrant-1 .quadrant-header .quadrant-count {
    background: #fff1f0;
    color: #ff4d4f;
  }

  .quadrant-2 .quadrant-header .quadrant-count {
    background: #fffbe6;
    color: #faad14;
  }

  .quadrant-3 .quadrant-header .quadrant-count {
    background: #fff7e6;
    color: #ff7a45;
  }

  .quadrant-4 .quadrant-header .quadrant-count {
    background: #f6ffed;
    color: #52c41a;
  }
}

.quick-actions {
  display: flex;
  gap: 12px;
  padding: 0 16px 16px;

  .action-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    border-radius: 12px;
    border: none;
    cursor: pointer;

    &.primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }

    &.secondary {
      background: #fff;
      color: #333;
    }

    .btn-icon {
      font-size: 24px;
    }

    .btn-text {
      font-size: 13px;
    }
  }
}

.schedule-section {
  background: #fff;
  margin: 0 16px 16px;
  border-radius: 12px;
  padding: 16px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .more-btn {
      border: none;
      background: none;
      color: #1890ff;
      font-size: 13px;
      cursor: pointer;
    }
  }

  .schedule-list {
    .schedule-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #f5f5f5;
      cursor: pointer;

      &:last-child {
        border-bottom: none;
      }

      .schedule-time {
        font-size: 14px;
        color: #1890ff;
        font-weight: 600;
        min-width: 50px;
      }

      .schedule-content {
        flex: 1;

        .schedule-title {
          font-size: 14px;
          color: #333;
          margin-bottom: 4px;
        }

        .schedule-meta {
          font-size: 12px;
          color: #999;

          .schedule-type {
            margin-right: 8px;
          }
        }
      }

      .schedule-status {
        font-size: 18px;

        &.completed {
          color: #52c41a;
        }

        &.pending {
          color: #d9d9d9;
        }
      }
    }

    .empty-schedule {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 0;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.3;
      }

      .empty-text {
        font-size: 14px;
        color: #ccc;
      }
    }
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;

  .modal-content {
    width: 100%;
    max-width: 500px;
    max-height: 80vh;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    &.large {
      max-width: 600px;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #eee;

      .modal-title {
        font-size: 16px;
        font-weight: 600;
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        padding: 4px;
        cursor: pointer;
      }
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;

      .task-card {
        background: #f9f9f9;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
        cursor: pointer;

        &:active {
          background: #f0f0f0;
        }

        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .task-title {
            font-size: 14px;
            font-weight: 600;
            color: #333;
          }

          .task-priority {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;

            &.urgent-important {
              background: #fff1f0;
              color: #ff4d4f;
            }

            &.important {
              background: #fffbe6;
              color: #faad14;
            }

            &.urgent {
              background: #fff7e6;
              color: #ff7a45;
            }

            &.normal {
              background: #f6ffed;
              color: #52c41a;
            }
          }
        }

        .task-meta {
          display: flex;
          gap: 12px;
          margin-bottom: 8px;
          font-size: 12px;
          color: #999;
        }

        .task-progress {
          display: flex;
          align-items: center;
          gap: 8px;

          .progress-bar {
            flex: 1;
            height: 4px;
            background: #e8e8e8;
            border-radius: 2px;
            overflow: hidden;

            .progress-fill {
              height: 100%;
              background: #1890ff;
              transition: width 0.3s;
            }
          }

          .progress-text {
            font-size: 12px;
            color: #666;
            min-width: 35px;
            text-align: right;
          }
        }
      }

      .empty-tasks-full {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 60px 0;

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.3;
        }

        .empty-text {
          font-size: 14px;
          color: #ccc;
        }
      }

      .form-item {
        margin-bottom: 16px;

        .form-label {
          display: block;
          font-size: 14px;
          color: #333;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;

          &:focus {
            border-color: #1890ff;
          }
        }

        .form-textarea {
          resize: none;
          font-family: inherit;
        }

        .type-selector,
        .priority-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;

          .type-option,
          .priority-option {
            padding: 8px 16px;
            background: #f5f5f5;
            border: 1px solid transparent;
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;

            &--selected {
              background: #e6f7ff;
              border-color: #1890ff;
              color: #1890ff;
            }
          }

          .priority-option {
            display: flex;
            align-items: center;
            gap: 4px;

            .priority-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
            }
          }
        }
      }
    }

    .modal-footer {
      display: flex;
      border-top: 1px solid #eee;

      .modal-btn {
        flex: 1;
        padding: 16px;
        border: none;
        font-size: 16px;
        cursor: pointer;

        &.cancel {
          background: #fff;
          color: #666;
          border-right: 1px solid #eee;
        }

        &.confirm {
          background: #fff;
          color: #1890ff;
        }
      }
    }
  }
}

// 适老化模式
:deep(.elderly-mode-large) {
  .navbar .title {
    font-size: 22px;
  }

  .stat-card .stat-value {
    font-size: 28px;
  }
}

:deep(.elderly-mode-xl) {
  .navbar .title {
    font-size: 28px;
  }

  .stat-card .stat-value {
    font-size: 32px;
  }
}
</style>
