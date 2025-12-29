<template>
  <div class="work-plan-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">📋</span>
          每日工作规划
        </h1>
        <div class="header-info">
          <span class="date-display">{{ currentDate }}</span>
          <span class="status-badge" :class="planStatusClass">{{ statusText }}</span>
        </div>
      </div>
      <div class="header-actions">
        <el-button v-if="workPlan && workPlan.planStatus === 'draft'" type="primary" @click="confirmPlan" :loading="confirming">
          确认规划
        </el-button>
        <el-button v-if="workPlan && workPlan.planStatus === 'confirmed'" type="success" @click="startPlan" :loading="starting">
          开始执行
        </el-button>
        <el-button v-if="workPlan && workPlan.planStatus === 'in_progress'" type="warning" @click="showSummaryDialog" :loading="summarizing">
          生成汇总
        </el-button>
        <el-button @click="showAddTaskDialog">添加任务</el-button>
        <el-button @click="showStatisticsDialog">数据统计</el-button>
      </div>
    </div>

    <!-- 四象限工作规划 -->
    <div class="quadrant-grid" v-loading="loading">
      <!-- 第一象限：重要且紧急 -->
      <div class="quadrant-card q1">
        <div class="quadrant-header">
          <h3>第一象限</h3>
          <span class="quadrant-subtitle">重要且紧急 - 立即处理</span>
        </div>
        <div class="task-list">
          <div v-for="task in workPlan?.tasks?.Q1 || []" :key="task._id" class="task-item"
               :class="{ 'task-completed': task.status === 'completed', 'task-in-progress': task.status === 'in_progress' }">
            <div class="task-header">
              <span class="task-title">{{ task.title }}</span>
              <el-dropdown @command="(cmd) => handleTaskAction(cmd, task, 'Q1')">
                <el-icon class="task-more"><MoreFilled /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="start" v-if="task.status === 'not_started'">开始任务</el-dropdown-item>
                    <el-dropdown-item command="update">更新进度</el-dropdown-item>
                    <el-dropdown-item command="complete" v-if="task.status !== 'completed'">完成任务</el-dropdown-item>
                    <el-dropdown-item command="postpone">延期任务</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除任务</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="task-meta">
              <span class="task-time">⏱️ {{ task.estimatedTime }}分钟</span>
              <span class="task-progress">{{ task.progress }}%</span>
            </div>
          </div>
          <el-empty v-if="!workPlan?.tasks?.Q1?.length" description="暂无任务" :image-size="60" />
        </div>
      </div>

      <!-- 第二象限：重要不紧急 -->
      <div class="quadrant-card q2">
        <div class="quadrant-header">
          <h3>第二象限</h3>
          <span class="quadrant-subtitle">重要不紧急 - 规划安排</span>
        </div>
        <div class="task-list">
          <div v-for="task in workPlan?.tasks?.Q2 || []" :key="task._id" class="task-item"
               :class="{ 'task-completed': task.status === 'completed', 'task-in-progress': task.status === 'in_progress' }">
            <div class="task-header">
              <span class="task-title">{{ task.title }}</span>
              <el-dropdown @command="(cmd) => handleTaskAction(cmd, task, 'Q2')">
                <el-icon class="task-more"><MoreFilled /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="start" v-if="task.status === 'not_started'">开始任务</el-dropdown-item>
                    <el-dropdown-item command="update">更新进度</el-dropdown-item>
                    <el-dropdown-item command="complete" v-if="task.status !== 'completed'">完成任务</el-dropdown-item>
                    <el-dropdown-item command="postpone">延期任务</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除任务</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="task-meta">
              <span class="task-time">⏱️ {{ task.estimatedTime }}分钟</span>
              <span class="task-progress">{{ task.progress }}%</span>
            </div>
          </div>
          <el-empty v-if="!workPlan?.tasks?.Q2?.length" description="暂无任务" :image-size="60" />
        </div>
      </div>

      <!-- 第三象限：紧急不重要 -->
      <div class="quadrant-card q3">
        <div class="quadrant-header">
          <h3>第三象限</h3>
          <span class="quadrant-subtitle">紧急不重要 - 委托他人</span>
        </div>
        <div class="task-list">
          <div v-for="task in workPlan?.tasks?.Q3 || []" :key="task._id" class="task-item"
               :class="{ 'task-completed': task.status === 'completed', 'task-in-progress': task.status === 'in_progress' }">
            <div class="task-header">
              <span class="task-title">{{ task.title }}</span>
              <el-dropdown @command="(cmd) => handleTaskAction(cmd, task, 'Q3')">
                <el-icon class="task-more"><MoreFilled /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="start" v-if="task.status === 'not_started'">开始任务</el-dropdown-item>
                    <el-dropdown-item command="update">更新进度</el-dropdown-item>
                    <el-dropdown-item command="complete" v-if="task.status !== 'completed'">完成任务</el-dropdown-item>
                    <el-dropdown-item command="postpone">延期任务</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除任务</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="task-meta">
              <span class="task-time">⏱️ {{ task.estimatedTime }}分钟</span>
              <span class="task-progress">{{ task.progress }}%</span>
            </div>
          </div>
          <el-empty v-if="!workPlan?.tasks?.Q3?.length" description="暂无任务" :image-size="60" />
        </div>
      </div>

      <!-- 第四象限：不重要不紧急 -->
      <div class="quadrant-card q4">
        <div class="quadrant-header">
          <h3>第四象限</h3>
          <span class="quadrant-subtitle">不重要不紧急 - 减少取消</span>
        </div>
        <div class="task-list">
          <div v-for="task in workPlan?.tasks?.Q4 || []" :key="task._id" class="task-item"
               :class="{ 'task-completed': task.status === 'completed', 'task-in-progress': task.status === 'in_progress' }">
            <div class="task-header">
              <span class="task-title">{{ task.title }}</span>
              <el-dropdown @command="(cmd) => handleTaskAction(cmd, task, 'Q4')">
                <el-icon class="task-more"><MoreFilled /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="start" v-if="task.status === 'not_started'">开始任务</el-dropdown-item>
                    <el-dropdown-item command="update">更新进度</el-dropdown-item>
                    <el-dropdown-item command="complete" v-if="task.status !== 'completed'">完成任务</el-dropdown-item>
                    <el-dropdown-item command="postpone">延期任务</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除任务</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="task-meta">
              <span class="task-time">⏱️ {{ task.estimatedTime }}分钟</span>
              <span class="task-progress">{{ task.progress }}%</span>
            </div>
          </div>
          <el-empty v-if="!workPlan?.tasks?.Q4?.length" description="暂无任务" :image-size="60" />
        </div>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="statistics-summary" v-if="workPlan">
      <div class="stat-card">
        <div class="stat-label">总任务数</div>
        <div class="stat-value">{{ workPlan.statistics?.totalTasks || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已完成</div>
        <div class="stat-value completed">{{ workPlan.statistics?.completedTasks || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">完成率</div>
        <div class="stat-value">{{ workPlan.statistics?.completionRate || 0 }}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">预估耗时</div>
        <div class="stat-value">{{ formatTime(workPlan.statistics?.totalEstimatedTime || 0) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">实际耗时</div>
        <div class="stat-value">{{ formatTime(workPlan.statistics?.totalActualTime || 0) }}</div>
      </div>
    </div>

    <!-- 添加任务对话框 -->
    <el-dialog v-model="addTaskDialogVisible" title="添加任务" width="500px">
      <el-form :model="newTask" :rules="taskRules" ref="taskFormRef" label-width="100px">
        <el-form-item label="任务标题" prop="title">
          <el-input v-model="newTask.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="任务描述">
          <el-input v-model="newTask.description" type="textarea" :rows="3" placeholder="请输入任务描述（可选）" />
        </el-form-item>
        <el-form-item label="象限分类" prop="quadrant">
          <el-select v-model="newTask.quadrant" placeholder="选择象限">
            <el-option label="第一象限 - 重要且紧急" value="Q1" />
            <el-option label="第二象限 - 重要不紧急" value="Q2" />
            <el-option label="第三象限 - 紧急不重要" value="Q3" />
            <el-option label="第四象限 - 不重要不紧急" value="Q4" />
          </el-select>
        </el-form-item>
        <el-form-item label="预估耗时">
          <el-input-number v-model="newTask.estimatedTime" :min="5" :max="480" :step="5" />
          <span style="margin-left: 8px">分钟</span>
        </el-form-item>
        <el-form-item label="任务标签">
          <el-input v-model="newTask.tags" placeholder="用逗号分隔，如：紧急,村民" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addTaskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddTask" :loading="addingTask">确定</el-button>
      </template>
    </el-dialog>

    <!-- 更新进度对话框 -->
    <el-dialog v-model="updateProgressDialogVisible" title="更新任务进度" width="500px">
      <el-form :model="progressUpdate" label-width="100px">
        <el-form-item label="当前进度">
          <el-slider v-model="progressUpdate.progress" :marks="{ 0: '0%', 50: '50%', 100: '100%'" />
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input v-model="progressUpdate.note" type="textarea" :rows="3" placeholder="记录当前工作情况..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="updateProgressDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateProgress" :loading="updatingProgress">更新</el-button>
      </template>
    </el-dialog>

    <!-- 完成任务对话框 -->
    <el-dialog v-model="completeTaskDialogVisible" title="完成任务" width="500px">
      <el-form :model="completionData" label-width="100px">
        <el-form-item label="完成总结">
          <el-input v-model="completionData.summary" type="textarea" :rows="5"
                    placeholder="总结任务完成情况、成果、遇到的问题等..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeTaskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCompleteTask" :loading="completingTask">完成</el-button>
      </template>
    </el-dialog>

    <!-- 工作汇总对话框 -->
    <el-dialog v-model="summaryDialogVisible" title="今日工作汇总" width="700px">
      <div v-if="generatedSummary" class="summary-content">
        <div class="summary-section">
          <h3>✅ 已完成任务 ({{ completedTaskCount }})</h3>
          <div v-for="(tasks, quadrant) in generatedSummary.completedTasks" :key="quadrant">
            <div v-if="tasks.length > 0">
              <h4>{{ quadrantName(quadrant) }}</h4>
              <ul>
                <li v-for="taskId in tasks" :key="taskId">{{ getTaskTitle(taskId) }}</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="summary-section" v-if="incompleteTasks.length > 0">
          <h3>⏳ 未完成任务 ({{ incompleteTasks.length }})</h3>
          <ul>
            <li v-for="task in incompleteTasks" :key="task.taskId">
              {{ getTaskTitle(task.taskId) }} - {{ task.reason }}
            </li>
          </ul>
        </div>

        <div class="summary-section" v-if="generatedSummary.statistics">
          <h3>📊 今日统计</h3>
          <p>任务总数: {{ generatedSummary.statistics.totalTasks }}</p>
          <p>已完成: {{ generatedSummary.statistics.completedTasks }}</p>
          <p>完成率: {{ generatedSummary.statistics.completionRate }}%</p>
          <p>总耗时: {{ formatTime(generatedSummary.statistics.totalTime) }}</p>
        </div>

        <div class="summary-section">
          <h3>💡 工作感悟</h3>
          <el-input v-model="summaryInsights" type="textarea" :rows="4"
                    placeholder="记录今日工作感悟、发现的问题、改进建议等..." />
        </div>

        <div class="summary-section" v-if="aiSuggestions.length > 0">
          <h3>🤖 AI建议</h3>
          <ul>
            <li v-for="(suggestion, index) in aiSuggestions" :key="index">{{ suggestion }}</li>
          </ul>
        </div>

        <div class="summary-section">
          <h3>📅 明日计划</h3>
          <el-input v-model="nextDayNotes" type="textarea" :rows="3"
                    placeholder="简述明日工作计划..." />
        </div>
      </div>
      <template #footer>
        <el-button @click="summaryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitSummary" :loading="submittingSummary">提交汇总</el-button>
      </template>
    </el-dialog>

    <!-- 数据统计对话框 -->
    <el-dialog v-model="statisticsDialogVisible" title="工作数据统计" width="800px">
      <div v-if="statistics" class="statistics-content">
        <el-tabs v-model="activeStatisticsTab">
          <el-tab-pane label="概览" name="overview">
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-label">总规划数</div>
                <div class="stat-value">{{ statistics.totalPlans || 0 }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">已完成规划</div>
                <div class="stat-value">{{ statistics.completedPlans || 0 }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">总任务数</div>
                <div class="stat-value">{{ statistics.totalTasks || 0 }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">已完成任务</div>
                <div class="stat-value">{{ statistics.completedTasks || 0 }}</div>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="象限分布" name="quadrant">
            <div class="quadrant-stats">
              <div v-for="(count, quadrant) in statistics.quadrantDistribution" :key="quadrant" class="quadrant-stat-item">
                <span>{{ quadrantName(quadrant) }}:</span>
                <span class="count">{{ Math.round(count) || 0 }}个</span>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="时间分布" name="time">
            <div class="time-stats">
              <div v-for="(time, quadrant) in statistics.timeByQuadrant" :key="quadrant" class="time-stat-item">
                <span>{{ quadrantName(quadrant) }}:</span>
                <span class="time">{{ formatTime(time) }}</span>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MoreFilled } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()

// 数据状态
const loading = ref(false)
const workPlan = ref(null)
const statistics = ref(null)

// 对话框状态
const addTaskDialogVisible = ref(false)
const updateProgressDialogVisible = ref(false)
const completeTaskDialogVisible = ref(false)
const summaryDialogVisible = ref(false)
const statisticsDialogVisible = ref(false)

// 加载状态
const confirming = ref(false)
const starting = ref(false)
const summarizing = ref(false)
const addingTask = ref(false)
const updatingProgress = ref(false)
const completingTask = ref(false)
const submittingSummary = ref(false)

// 表单数据
const newTask = ref({
  title: '',
  description: '',
  quadrant: '',
  estimatedTime: 30,
  tags: ''
})

const progressUpdate = ref({
  progress: 0,
  note: ''
})

const completionData = ref({
  summary: ''
})

const summaryInsights = ref('')
const nextDayNotes = ref('')
const generatedSummary = ref(null)
const aiSuggestions = ref([])

const activeStatisticsTab = ref('overview')
const currentTask = ref(null)
const currentQuadrant = ref('')

// 表单验证规则
const taskRules = {
  title: [{ required: true, message: '请输入任务标题', trigger: 'blur' }],
  quadrant: [{ required: true, message: '请选择象限分类', trigger: 'change' }]
}

// 计算属性
const currentDate = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
})

const statusText = computed(() => {
  if (!workPlan.value) return '未创建'
  const statusMap = {
    draft: '草稿',
    confirmed: '已确认',
    in_progress: '执行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[workPlan.value.planStatus] || '未知'
})

const planStatusClass = computed(() => {
  if (!workPlan.value) return ''
  return `status-${workPlan.value.planStatus}`
})

const completedTaskCount = computed(() => {
  if (!generatedSummary.value?.completedTasks) return 0
  return Object.values(generatedSummary.value.completedTasks).flat().length
})

const incompleteTasks = computed(() => {
  return generatedSummary.value?.incompleteTasks || []
})

// 方法
const loadTodayWorkPlan = async () => {
  loading.value = true
  try {
    const villageId = localStorage.getItem('currentVillageId') || 'default-village-id'
    const response = await axios.get('/api/v1/work-plans/today', {
      params: { villageId }
    })
    workPlan.value = response.data.data
  } catch (error) {
    console.error('加载工作规划失败:', error)
    ElMessage.error('加载工作规划失败')
  } finally {
    loading.value = false
  }
}

const confirmPlan = async () => {
  confirming.value = true
  try {
    await axios.post(`/api/v1/work-plans/${workPlan.value._id}/confirm`)
    workPlan.value.planStatus = 'confirmed'
    ElMessage.success('工作规划已确认')
  } catch (error) {
    console.error('确认规划失败:', error)
    ElMessage.error('确认规划失败')
  } finally {
    confirming.value = false
  }
}

const startPlan = async () => {
  starting.value = true
  try {
    await axios.post(`/api/v1/work-plans/${workPlan.value._id}/confirm`)
    workPlan.value.planStatus = 'in_progress'
    workPlan.value.workStartTime = new Date()
    ElMessage.success('开始执行工作规划')
  } catch (error) {
    console.error('开始执行失败:', error)
    ElMessage.error('开始执行失败')
  } finally {
    starting.value = false
  }
}

const showAddTaskDialog = () => {
  newTask.value = {
    title: '',
    description: '',
    quadrant: '',
    estimatedTime: 30,
    tags: ''
  }
  addTaskDialogVisible.value = true
}

const handleAddTask = async () => {
  addingTask.value = true
  try {
    const taskData = {
      ...newTask.value,
      tags: newTask.value.tags ? newTask.value.tags.split(',').map(t => t.trim()) : []
    }

    await axios.post(`/api/v1/work-plans/${workPlan.value._id}/tasks`, taskData)

    ElMessage.success('任务添加成功')
    addTaskDialogVisible.value = false
    await loadTodayWorkPlan()
  } catch (error) {
    console.error('添加任务失败:', error)
    ElMessage.error(error.response?.data?.message || '添加任务失败')
  } finally {
    addingTask.value = false
  }
}

const handleTaskAction = (command, task, quadrant) => {
  currentTask.value = task
  currentQuadrant.value = quadrant

  switch (command) {
    case 'start':
      startTask()
      break
    case 'update':
      progressUpdate.value = {
        progress: task.progress,
        note: ''
      }
      updateProgressDialogVisible.value = true
      break
    case 'complete':
      completionData.value = {
        summary: ''
      }
      completeTaskDialogVisible.value = true
      break
    case 'postpone':
      postponeTask()
      break
    case 'delete':
      deleteTask()
      break
  }
}

const startTask = async () => {
  try {
    await axios.post(`/api/v1/work-plans/${workPlan.value._id}/tasks/${currentQuadrant.value}/${currentTask.value._id}/start`)
    ElMessage.success('任务已开始')
    await loadTodayWorkPlan()
  } catch (error) {
    console.error('开始任务失败:', error)
    ElMessage.error('开始任务失败')
  }
}

const handleUpdateProgress = async () => {
  updatingProgress.value = true
  try {
    await axios.post(`/api/v1/work-plans/${workPlan.value._id}/tasks/${currentQuadrant.value}/${currentTask.value._id}/progress`, {
      progress: progressUpdate.value.progress,
      note: progressUpdate.value.note
    })
    ElMessage.success('进度已更新')
    updateProgressDialogVisible.value = false
    await loadTodayWorkPlan()
  } catch (error) {
    console.error('更新进度失败:', error)
    ElMessage.error('更新进度失败')
  } finally {
    updatingProgress.value = false
  }
}

const handleCompleteTask = async () => {
  completingTask.value = true
  try {
    await axios.post(`/api/v1/work-plans/${workPlan.value._id}/tasks/${currentQuadrant.value}/${currentTask.value._id}/complete`, {
      summary: completionData.value.summary
    })
    ElMessage.success('任务已完成')
    completeTaskDialogVisible.value = false
    await loadTodayWorkPlan()
  } catch (error) {
    console.error('完成任务失败:', error)
    ElMessage.error('完成任务失败')
  } finally {
    completingTask.value = false
  }
}

const postponeTask = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入延期原因', '延期任务', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '延期原因不能为空'
    })

    await axios.post(`/api/v1/work-plans/${workPlan.value._id}/tasks/${currentQuadrant.value}/${currentTask.value._id}/postpone`, {
      reason: value,
      plannedTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })
    ElMessage.success('任务已延期')
    await loadTodayWorkPlan()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('延期任务失败:', error)
      ElMessage.error('延期任务失败')
    }
  }
}

const deleteTask = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个任务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await axios.delete(`/api/v1/work-plans/${workPlan.value._id}/tasks/${currentQuadrant.value}/${currentTask.value._id}`)
    ElMessage.success('任务已删除')
    await loadTodayWorkPlan()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除任务失败:', error)
      ElMessage.error('删除任务失败')
    }
  }
}

const showSummaryDialog = async () => {
  summarizing.value = true
  try {
    const response = await axios.post(`/api/v1/work-plans/${workPlan.value._id}/summary`)
    generatedSummary.value = response.data.data.dailySummary
    summaryInsights.value = ''
    nextDayNotes.value = ''
    aiSuggestions.value = response.data.data.aiAnalysis?.suggestions || []
    summaryDialogVisible.value = true
  } catch (error) {
    console.error('生成汇总失败:', error)
    ElMessage.error('生成汇总失败')
  } finally {
    summarizing.value = false
  }
}

const handleSubmitSummary = async () => {
  submittingSummary.value = true
  try {
    const insights = summaryInsights.value ? summaryInsights.value.split('\n').filter(i => i.trim()) : []

    await axios.post(`/api/v1/work-plans/${workPlan.value._id}/summary`, {
      insights
    })

    // 如果有明日计划，也保存
    if (nextDayNotes.value.trim()) {
      await axios.post(`/api/v1/work-plans/${workPlan.value._id}/next-day`, {
        tasks: [],
        notes: nextDayNotes.value
      })
    }

    ElMessage.success('工作汇总已提交')
    summaryDialogVisible.value = false
    await loadTodayWorkPlan()
  } catch (error) {
    console.error('提交汇总失败:', error)
    ElMessage.error('提交汇总失败')
  } finally {
    submittingSummary.value = false
  }
}

const showStatisticsDialog = async () => {
  try {
    const response = await axios.get('/api/v1/work-plans/statistics', {
      params: {
        villageId: localStorage.getItem('currentVillageId')
      }
    })
    statistics.value = response.data.data
    statisticsDialogVisible.value = true
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  }
}

// 辅助方法
const quadrantName = (quadrant) => {
  const names = {
    Q1: '第一象限',
    Q2: '第二象限',
    Q3: '第三象限',
    Q4: '第四象限'
  }
  return names[quadrant] || quadrant
}

const getTaskTitle = (taskId) => {
  if (!workPlan.value) return ''
  for (const quadrant of ['Q1', 'Q2', 'Q3', 'Q4']) {
    const task = workPlan.value.tasks[quadrant]?.find(t => t._id === taskId)
    if (task) return task.title
  }
  return '未知任务'
}

const formatTime = (minutes) => {
  if (!minutes) return '0分钟'
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
}

onMounted(() => {
  loadTodayWorkPlan()
})
</script>

<style scoped>
.work-plan-container {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 28px;
}

.header-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.date-display {
  color: #666;
  font-size: 14px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-draft {
  background: #f0f0f0;
  color: #666;
}

.status-confirmed {
  background: #e1f3ff;
  color: #1890ff;
}

.status-in_progress {
  background: #fff7e6;
  color: #fa8c16;
}

.status-completed {
  background: #f6ffed;
  color: #52c41a;
}

.quadrant-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.quadrant-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 300px;
}

.quadrant-card.q1 {
  border-top: 4px solid #ff4d4f;
}

.quadrant-card.q2 {
  border-top: 4px solid #1890ff;
}

.quadrant-card.q3 {
  border-top: 4px solid #faad14;
}

.quadrant-card.q4 {
  border-top: 4px solid #d9d9d9;
}

.quadrant-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.quadrant-header h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
}

.quadrant-subtitle {
  font-size: 12px;
  color: #999;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border-left: 3px solid #d9d9d9;
  transition: all 0.3s;
}

.task-item:hover {
  background: #f5f5f5;
}

.task-item.task-completed {
  opacity: 0.6;
  text-decoration: line-through;
}

.task-item.task-in-progress {
  border-left-color: #1890ff;
  background: #e1f3ff;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-title {
  font-weight: 500;
}

.task-more {
  cursor: pointer;
  color: #999;
}

.task-more:hover {
  color: #333;
}

.task-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.statistics-summary {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-card {
  flex: 1;
  text-align: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stat-value.completed {
  color: #52c41a;
}

.summary-content {
  max-height: 600px;
  overflow-y: auto;
}

.summary-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.summary-section:last-child {
  border-bottom: none;
}

.summary-section h3 {
  margin-bottom: 12px;
  font-size: 16px;
}

.summary-section h4 {
  margin: 8px 0;
  font-size: 14px;
  color: #666;
}

.summary-section ul {
  margin: 0;
  padding-left: 20px;
}

.summary-section li {
  margin-bottom: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
  text-align: center;
}

.quadrant-stats,
.time-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quadrant-stat-item,
.time-stat-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.count,
.time {
  font-weight: bold;
  color: #1890ff;
}
</style>
