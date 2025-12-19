<template>
  <div class="permission-dashboard">
    <!-- 权限概览图表 -->
    <el-row :gutter="24" class="dashboard-row">
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <h3>权限检查趋势</h3>
              <el-radio-group v-model="chartTimeRange" size="small">
                <el-radio-button label="7d">7天</el-radio-button>
                <el-radio-button label="30d">30天</el-radio-button>
                <el-radio-button label="90d">90天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="permissionTrendChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <h3>权限分布</h3>
          </template>
          <div ref="permissionDistributionChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 实时权限活动 -->
    <el-row :gutter="24" class="dashboard-row">
      <el-col :span="12">
        <el-card class="activity-card">
          <template #header>
            <div class="card-header">
              <h3>实时权限活动</h3>
              <el-tag :type="isRealTimeActive ? 'success' : 'info'">
                {{ isRealTimeActive ? '实时监控中' : '已暂停' }}
              </el-tag>
            </div>
          </template>
          <div class="activity-list" ref="activityList">
            <div
              v-for="activity in permissionActivities"
              :key="activity.id"
              class="activity-item"
              :class="activity.result.toLowerCase()"
            >
              <div class="activity-icon">
                <el-icon>
                  <CircleCheck v-if="activity.result === 'ALLOWED'" />
                  <CircleClose v-else />
                </el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-user">{{ activity.user }}</div>
                <div class="activity-action">{{ activity.resource }}:{{ activity.action }}</div>
                <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
              </div>
              <div class="activity-result">
                <el-tag
                  :type="activity.result === 'ALLOWED' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ activity.result === 'ALLOWED' ? '允许' : '拒绝' }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="policy-card">
          <template #header>
            <div class="card-header">
              <h3>动态权限策略</h3>
              <el-button type="primary" size="small" @click="showAddPolicyDialog">
                添加策略
              </el-button>
            </div>
          </template>
          <div class="policy-list">
            <div
              v-for="policy in dynamicPolicies"
              :key="policy.id"
              class="policy-item"
              :class="{ active: policy.enabled }"
            >
              <div class="policy-info">
                <div class="policy-name">{{ policy.name }}</div>
                <div class="policy-description">{{ policy.description }}</div>
                <div class="policy-meta">
                  <el-tag size="small" :type="policy.priority === 'high' ? 'danger' :
                                     policy.priority === 'medium' ? 'warning' : 'info'">
                    {{ policy.priority }}优先级
                  </el-tag>
                  <span class="policy-target">作用于: {{ policy.targetRoles.join(', ') }}</span>
                </div>
              </div>
              <div class="policy-actions">
                <el-switch
                  v-model="policy.enabled"
                  @change="togglePolicy(policy)"
                  size="small"
                />
                <el-button
                  type="text"
                  size="small"
                  @click="editPolicy(policy)"
                >
                  编辑
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 权限热力图 -->
    <el-row class="dashboard-row">
      <el-col :span="24">
        <el-card class="heatmap-card">
          <template #header>
            <div class="card-header">
              <h3>权限使用热力图</h3>
              <el-select v-model="heatmapView" size="small" style="width: 150px">
                <el-option label="按用户" value="user" />
                <el-option label="按资源" value="resource" />
                <el-option label="按时间" value="time" />
              </el-select>
            </div>
          </template>
          <div ref="permissionHeatmap" class="heatmap-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加策略对话框 -->
    <el-dialog
      v-model="policyDialogVisible"
      title="添加权限策略"
      width="600px"
      :destroy-on-close="true"
    >
      <el-form
        ref="policyFormRef"
        :model="policyForm"
        :rules="policyRules"
        label-width="100px"
      >
        <el-form-item label="策略名称" prop="name">
          <el-input v-model="policyForm.name" placeholder="输入策略名称" />
        </el-form-item>

        <el-form-item label="策略描述" prop="description">
          <el-input
            v-model="policyForm.description"
            type="textarea"
            :rows="2"
            placeholder="描述策略用途"
          />
        </el-form-item>

        <el-form-item label="规则类型" prop="rules">
          <el-checkbox-group v-model="policyForm.rules">
            <el-checkbox label="time_based">时间访问控制</el-checkbox>
            <el-checkbox label="location_based">位置访问控制</el-checkbox>
            <el-checkbox label="device_trust">设备信任控制</el-checkbox>
            <el-checkbox label="rate_limit">操作频率限制</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="目标角色" prop="targetRoles">
          <el-select
            v-model="policyForm.targetRoles"
            multiple
            placeholder="选择目标角色"
            style="width: 100%"
          >
            <el-option
              v-for="role in availableRoles"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="policyForm.priority">
            <el-radio label="high">高</el-radio>
            <el-radio label="medium">中</el-radio>
            <el-radio label="low">低</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="policyForm.enabled" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="policyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPolicy">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  CircleCheck, CircleClose
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import enhancedPermissionService from '@/services/enhancedPermissionService'

// 响应式数据
const chartTimeRange = ref('7d')
const isRealTimeActive = ref(true)
const heatmapView = ref('user')
const policyDialogVisible = ref(false)
const permissionActivities = ref([])
const dynamicPolicies = ref([])
const availableRoles = ref([
  { label: '村级管理员', value: 'village_admin' },
  { label: '部门主管', value: 'department_head' },
  { label: '工作人员', value: 'staff' },
  { label: '村民', value: 'villager' }
])

// 图表实例
let trendChart = null
let distributionChart = null
let heatmapChart = null

// 表单数据
const policyFormRef = ref(null)
const policyForm = reactive({
  name: '',
  description: '',
  rules: [],
  targetRoles: [],
  priority: 'medium',
  enabled: true
})

const policyRules = {
  name: [
    { required: true, message: '请输入策略名称', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入策略描述', trigger: 'blur' }
  ],
  rules: [
    { type: 'array', required: true, message: '请选择至少一个规则类型', trigger: 'change' }
  ],
  targetRoles: [
    { type: 'array', required: true, message: '请选择目标角色', trigger: 'change' }
  ]
}

// 获取权限活动数据
const fetchPermissionActivities = async () => {
  try {
    const report = await enhancedPermissionService.generatePermissionAuditReport({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 最近24小时
      endDate: new Date()
    })

    if (report.success) {
      // 模拟实时活动数据
      permissionActivities.value = [
        {
          id: '1',
          user: '张管理员',
          resource: 'finance',
          action: 'approve',
          result: 'ALLOWED',
          timestamp: new Date(Date.now() - 1000 * 60 * 5)
        },
        {
          id: '2',
          user: '李工作人员',
          resource: 'resident',
          action: 'delete',
          result: 'DENIED',
          timestamp: new Date(Date.now() - 1000 * 60 * 10)
        },
        {
          id: '3',
          user: '王村委',
          resource: 'village',
          action: 'announcement',
          result: 'ALLOWED',
          timestamp: new Date(Date.now() - 1000 * 60 * 15)
        },
        {
          id: '4',
          user: '赵村民',
          resource: 'service',
          action: 'apply',
          result: 'ALLOWED',
          timestamp: new Date(Date.now() - 1000 * 60 * 20)
        },
        {
          id: '5',
          user: '陈部门主管',
          resource: 'emergency',
          action: 'dispatch',
          result: 'ALLOWED',
          timestamp: new Date(Date.now() - 1000 * 60 * 25)
        }
      ]
    }
  } catch (error) {
    console.error('获取权限活动失败:', error)
  }
}

// 获取动态策略数据
const fetchDynamicPolicies = async () => {
  try {
    const policies = await enhancedPermissionService.getPermissionPolicies()
    dynamicPolicies.value = policies || [
      {
        id: '1',
        name: '工作时间限制',
        description: '财务审批仅在工作时间允许',
        priority: 'high',
        enabled: true,
        targetRoles: ['village_admin', 'department_head']
      },
      {
        id: '2',
        name: '设备信任验证',
        description: '敏感操作需要可信设备',
        priority: 'high',
        enabled: true,
        targetRoles: ['village_admin']
      },
      {
        id: '3',
        name: '操作频率限制',
        description: '防止频繁操作',
        priority: 'medium',
        enabled: false,
        targetRoles: ['staff', 'villager']
      }
    ]
  } catch (error) {
    console.error('获取动态策略失败:', error)
  }
}

// 初始化趋势图表
const initTrendChart = () => {
  const chartDom = document.querySelector('[ref="permissionTrendChart"]')
  if (!chartDom) return

  trendChart = echarts.init(chartDom)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['允许', '拒绝', '总检查次数']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: generateTimeLabels()
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '允许',
        type: 'line',
        stack: 'Total',
        smooth: true,
        itemStyle: {
          color: '#67c23a'
        },
        data: generateRandomData(7, 100, 500)
      },
      {
        name: '拒绝',
        type: 'line',
        stack: 'Total',
        smooth: true,
        itemStyle: {
          color: '#f56c6c'
        },
        data: generateRandomData(7, 10, 50)
      },
      {
        name: '总检查次数',
        type: 'line',
        smooth: true,
        itemStyle: {
          color: '#409eff'
        },
        data: generateRandomData(7, 200, 600)
      }
    ]
  }

  trendChart.setOption(option)
}

// 初始化分布图表
const initDistributionChart = () => {
  const chartDom = document.querySelector('[ref="permissionDistributionChart"]')
  if (!chartDom) return

  distributionChart = echarts.init(chartDom)

  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '权限分布',
        type: 'pie',
        radius: '50%',
        data: [
          { value: 335, name: '读取权限' },
          { value: 310, name: '写入权限' },
          { value: 234, name: '删除权限' },
          { value: 135, name: '审批权限' },
          { value: 148, name: '管理权限' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  distributionChart.setOption(option)
}

// 初始化热力图
const initHeatmap = () => {
  const chartDom = document.querySelector('[ref="permissionHeatmap"]')
  if (!chartDom) return

  heatmapChart = echarts.init(chartDom)

  const option = {
    tooltip: {
      position: 'top'
    },
    grid: {
      height: '50%',
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: ['村民管理', '财务管理', '村务治理', '应急管理', '系统管理'],
      splitArea: {
        show: true
      }
    },
    yAxis: {
      type: 'category',
      data: ['读取', '写入', '删除', '审批', '管理'],
      splitArea: {
        show: true
      }
    },
    visualMap: {
      min: 0,
      max: 10,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '15%'
    },
    series: [{
      name: '权限使用频率',
      type: 'heatmap',
      data: generateHeatmapData(),
      label: {
        show: true
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }

  heatmapChart.setOption(option)
}

// 生成时间标签
const generateTimeLabels = () => {
  const labels = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000)
    labels.push(date.toLocaleDateString())
  }
  return labels
}

// 生成随机数据
const generateRandomData = (count, min, max) => {
  const data = []
  for (let i = 0; i < count; i++) {
    data.push(Math.floor(Math.random() * (max - min + 1)) + min)
  }
  return data
}

// 生成热力图数据
const generateHeatmapData = () => {
  const data = []
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      data.push([i, j, Math.floor(Math.random() * 10)])
    }
  }
  return data
}

// 格式化时间
const formatTime = (timestamp) => {
  const now = new Date()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else {
    const hours = Math.floor(minutes / 60)
    return `${hours}小时前`
  }
}

// 显示添加策略对话框
const showAddPolicyDialog = () => {
  Object.assign(policyForm, {
    name: '',
    description: '',
    rules: [],
    targetRoles: [],
    priority: 'medium',
    enabled: true
  })
  policyDialogVisible.value = true
}

// 编辑策略
const editPolicy = (policy) => {
  Object.assign(policyForm, policy)
  policyDialogVisible.value = true
}

// 切换策略状态
const togglePolicy = async (policy) => {
  try {
    // 调用API更新策略状态
    ElMessage.success(`策略"${policy.name}"已${policy.enabled ? '启用' : '禁用'}`)
  } catch (error) {
    policy.enabled = !policy.enabled
    ElMessage.error('更新策略状态失败')
  }
}

// 提交策略
const submitPolicy = async () => {
  try {
    await policyFormRef.value.validate()

    const result = await enhancedPermissionService.createPermissionPolicy(policyForm)
    if (result.success) {
      ElMessage.success('策略创建成功')
      policyDialogVisible.value = false
      await fetchDynamicPolicies()
    }
  } catch (error) {
    console.error('创建策略失败:', error)
  }
}

// 定时刷新活动数据
let activityTimer = null
const startActivityRefresh = () => {
  if (isRealTimeActive.value) {
    activityTimer = setInterval(() => {
      fetchPermissionActivities()
    }, 5000) // 每5秒刷新一次
  }
}

const stopActivityRefresh = () => {
  if (activityTimer) {
    clearInterval(activityTimer)
    activityTimer = null
  }
}

// 生命周期
onMounted(async () => {
  await nextTick()

  // 初始化图表
  initTrendChart()
  initDistributionChart()
  initHeatmap()

  // 获取数据
  await fetchPermissionActivities()
  await fetchDynamicPolicies()

  // 启动实时刷新
  startActivityRefresh()

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    trendChart?.resize()
    distributionChart?.resize()
    heatmapChart?.resize()
  })
})

onUnmounted(() => {
  // 清理定时器
  stopActivityRefresh()

  // 销毁图表实例
  trendChart?.dispose()
  distributionChart?.dispose()
  heatmapChart?.dispose()

  // 移除事件监听
  window.removeEventListener('resize', () => {})
})
</script>

<style lang="scss" scoped>
.permission-dashboard {
  .dashboard-row {
    margin-bottom: 24px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 16px;
      color: #2c3e50;
    }
  }

  .chart-card {
    height: 400px;

    .chart-container {
      height: 320px;
    }
  }

  .activity-card {
    height: 400px;

    .activity-list {
      height: 320px;
      overflow-y: auto;
    }

    .activity-item {
      display: flex;
      align-items: center;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 6px;
      background: #f5f7fa;
      transition: all 0.3s ease;

      &:hover {
        background: #e6e8eb;
      }

      &.allowed {
        border-left: 4px solid #67c23a;
      }

      &.denied {
        border-left: 4px solid #f56c6c;
      }

      .activity-icon {
        margin-right: 12px;

        .el-icon {
          font-size: 20px;
        }

        .allowed {
          color: #67c23a;
        }

        .denied {
          color: #f56c6c;
        }
      }

      .activity-content {
        flex: 1;

        .activity-user {
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .activity-action {
          font-size: 14px;
          color: #606266;
          margin-bottom: 4px;
        }

        .activity-time {
          font-size: 12px;
          color: #909399;
        }
      }

      .activity-result {
        margin-left: 12px;
      }
    }
  }

  .policy-card {
    height: 400px;

    .policy-list {
      height: 320px;
      overflow-y: auto;
    }

    .policy-item {
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 6px;
      background: #f5f7fa;
      border: 1px solid #e4e7ed;
      transition: all 0.3s ease;

      &.active {
        border-color: #409eff;
        background: #ecf5ff;
      }

      &:hover {
        border-color: #409eff;
      }

      .policy-info {
        margin-bottom: 12px;

        .policy-name {
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .policy-description {
          font-size: 14px;
          color: #606266;
          margin-bottom: 8px;
        }

        .policy-meta {
          display: flex;
          align-items: center;
          gap: 12px;

          .policy-target {
            font-size: 12px;
            color: #909399;
          }
        }
      }

      .policy-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        justify-content: flex-end;
      }
    }
  }

  .heatmap-card {
    .heatmap-container {
      height: 400px;
    }
  }
}
</style>