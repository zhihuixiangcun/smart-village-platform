<template>
  <div class="permission-inheritance-config">
    <!-- 继承关系概览 -->
    <el-card class="overview-card">
      <template #header>
        <div class="card-header">
          <h3>权限继承关系概览</h3>
          <el-button type="primary" @click="showInheritanceGuide">
            <el-icon><QuestionFilled /></el-icon>
            继承指南
          </el-button>
        </div>
      </template>

      <!-- 继承关系图 -->
      <div class="inheritance-diagram">
        <div ref="inheritanceChart" class="chart-container"></div>
      </div>

      <!-- 继承统计 -->
      <el-row :gutter="24" class="inheritance-stats">
        <el-col :span="6" v-for="stat in inheritanceStats" :key="stat.key">
          <div class="stat-item">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 角色继承配置 -->
    <el-row :gutter="24" class="config-section">
      <el-col :span="12">
        <el-card class="role-inheritance-card">
          <template #header>
            <div class="card-header">
              <h3>角色继承配置</h3>
              <el-button type="primary" @click="showAddInheritanceDialog">
                添加继承关系
              </el-button>
            </div>
          </template>

          <div class="inheritance-list">
            <div
              v-for="inheritance in roleInheritances"
              :key="inheritance.id"
              class="inheritance-item"
            >
              <div class="inheritance-roles">
                <div class="role-box child">
                  <span class="role-name">{{ inheritance.childRole.name }}</span>
                  <el-tag size="small" type="primary">子角色</el-tag>
                </div>
                <div class="inheritance-arrow">
                  <el-icon><ArrowRight /></el-icon>
                </div>
                <div class="role-box parent">
                  <span class="role-name">{{ inheritance.parentRole.name }}</span>
                  <el-tag size="small" type="success">父角色</el-tag>
                </div>
              </div>
              <div class="inheritance-details">
                <div class="detail-item">
                  <span class="label">继承权限数:</span>
                  <span class="value">{{ inheritance.inheritedPermissionCount }} 项</span>
                </div>
                <div class="detail-item">
                  <span class="label">额外权限:</span>
                  <span class="value">{{ inheritance.additionalPermissions.length }} 项</span>
                </div>
                <div class="detail-item">
                  <span class="label">状态:</span>
                  <el-switch
                    v-model="inheritance.enabled"
                    @change="toggleInheritance(inheritance)"
                    size="small"
                  />
                </div>
              </div>
              <div class="inheritance-actions">
                <el-button
                  type="text"
                  size="small"
                  @click="editInheritance(inheritance)"
                >
                  编辑
                </el-button>
                <el-button
                  type="text"
                  size="small"
                  @click="previewInheritance(inheritance)"
                >
                  预览
                </el-button>
                <el-button
                  type="text"
                  size="small"
                  class="danger-text"
                  @click="deleteInheritance(inheritance)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="additional-permissions-card">
          <template #header>
            <div class="card-header">
              <h3>额外权限配置</h3>
              <el-select
                v-model="selectedRoleForAdditional"
                placeholder="选择角色"
                style="width: 150px"
                @change="loadAdditionalPermissions"
              >
                <el-option
                  v-for="role in roles"
                  :key="role.id"
                  :label="role.name"
                  :value="role.id"
                />
              </el-select>
            </div>
          </template>

          <div v-if="selectedRoleForAdditional" class="additional-permissions">
            <div class="permission-section">
              <h4>基础额外权限</h4>
              <el-transfer
                v-model="selectedBasePermissions"
                :data="basePermissionOptions"
                :titles="['可选权限', '已选权限']"
                :props="transferProps"
              />
            </div>

            <div class="permission-section">
              <h4>动态权限规则</h4>
              <el-checkbox-group v-model="selectedDynamicRules">
                <el-checkbox
                  v-for="rule in dynamicRuleOptions"
                  :key="rule.id"
                  :label="rule.id"
                >
                  <div class="rule-option">
                    <span class="rule-name">{{ rule.name }}</span>
                    <span class="rule-description">{{ rule.description }}</span>
                  </div>
                </el-checkbox>
              </el-checkbox-group>
            </div>

            <div class="permission-section">
              <h4>权限约束</h4>
              <el-form :model="constraintForm" label-width="100px" size="small">
                <el-form-item label="时间约束">
                  <el-checkbox v-model="constraintForm.timeConstraint">
                    启用时间约束
                  </el-checkbox>
                  <div v-if="constraintForm.timeConstraint" class="constraint-detail">
                    <el-time-picker
                      v-model="constraintForm.startTime"
                      placeholder="开始时间"
                      format="HH:mm"
                      value-format="HH:mm"
                      size="small"
                    />
                    <span>至</span>
                    <el-time-picker
                      v-model="constraintForm.endTime"
                      placeholder="结束时间"
                      format="HH:mm"
                      value-format="HH:mm"
                      size="small"
                    />
                  </div>
                </el-form-item>

                <el-form-item label="网络约束">
                  <el-checkbox v-model="constraintForm.networkConstraint">
                    仅允许内网访问
                  </el-checkbox>
                </el-form-item>

                <el-form-item label="设备约束">
                  <el-checkbox v-model="constraintForm.deviceConstraint">
                    仅允许可信设备
                  </el-checkbox>
                </el-form-item>
              </el-form>
            </div>

            <div class="permission-actions">
              <el-button type="primary" @click="saveAdditionalPermissions">
                保存配置
              </el-button>
              <el-button @click="resetAdditionalPermissions">
                重置
              </el-button>
            </div>
          </div>

          <div v-else class="no-role-selected">
            <el-empty description="请选择一个角色配置额外权限" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 继承冲突检测 -->
    <el-card class="conflict-detection-card">
      <template #header>
        <div class="card-header">
          <h3>继承冲突检测</h3>
          <el-button @click="runConflictDetection">
            <el-icon><Refresh /></el-icon>
            检测冲突
          </el-button>
        </div>
      </template>

      <div v-if="conflicts.length > 0" class="conflict-list">
        <el-alert
          v-for="conflict in conflicts"
          :key="conflict.id"
          :title="conflict.title"
          :description="conflict.description"
          :type="conflict.severity"
          show-icon
          :closable="false"
          class="conflict-item"
        >
          <template #default>
            <div class="conflict-content">
              <p>{{ conflict.description }}</p>
              <div class="conflict-actions">
                <el-button size="small" @click="resolveConflict(conflict)">
                  解决冲突
                </el-button>
                <el-button size="small" type="text" @click="ignoreConflict(conflict)">
                  忽略
                </el-button>
              </div>
            </div>
          </template>
        </el-alert>
      </div>

      <div v-else class="no-conflicts">
        <el-result
          icon="success"
          title="无继承冲突"
          sub-title="当前权限继承配置正常，没有检测到冲突"
        />
      </div>
    </el-card>

    <!-- 添加继承关系对话框 -->
    <el-dialog
      v-model="inheritanceDialogVisible"
      title="添加继承关系"
      width="600px"
      :destroy-on-close="true"
    >
      <el-form
        ref="inheritanceFormRef"
        :model="inheritanceForm"
        :rules="inheritanceRules"
        label-width="100px"
      >
        <el-form-item label="子角色" prop="childRole">
          <el-select
            v-model="inheritanceForm.childRole"
            placeholder="选择子角色"
            style="width: 100%"
          >
            <el-option
              v-for="role in availableChildRoles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="父角色" prop="parentRole">
          <el-select
            v-model="inheritanceForm.parentRole"
            placeholder="选择父角色"
            style="width: 100%"
          >
            <el-option
              v-for="role in availableParentRoles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="继承条件">
          <el-checkbox-group v-model="inheritanceForm.conditions">
            <el-checkbox label="working_hours">仅工作时间</el-checkbox>
            <el-checkbox label="network_secure">安全网络环境</el-checkbox>
            <el-checkbox label="device_trusted">可信设备</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="优先级">
          <el-radio-group v-model="inheritanceForm.priority">
            <el-radio label="high">高</el-radio>
            <el-radio label="medium">中</el-radio>
            <el-radio label="low">低</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="inheritanceForm.description"
            type="textarea"
            :rows="2"
            placeholder="描述此继承关系的用途"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="inheritanceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveInheritance">确定</el-button>
      </template>
    </el-dialog>

    <!-- 继承预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="继承权限预览"
      width="800px"
      :destroy-on-close="true"
    >
      <div v-if="previewInheritance" class="inheritance-preview">
        <h4>{{ previewInheritance.childRole.name }} 继承权限详情</h4>

        <el-tabs>
          <el-tab-pane label="继承权限" name="inherited">
            <div class="permission-table">
              <el-table :data="previewInheritedPermissions" style="width: 100%">
                <el-table-column prop="module" label="模块" />
                <el-table-column prop="permission" label="权限" />
                <el-table-column prop="source" label="来源" />
                <el-table-column prop="type" label="类型">
                  <template #default="{ row }">
                    <el-tag :type="row.type === 'direct' ? 'primary' : 'success'">
                      {{ row.type === 'direct' ? '直接继承' : '间接继承' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="额外权限" name="additional">
            <div class="additional-list">
              <div
                v-for="permission in previewAdditionalPermissions"
                :key="permission.key"
                class="additional-item"
              >
                <el-icon><Key /></el-icon>
                <span class="permission-name">{{ permission.name }}</span>
                <span class="permission-description">{{ permission.description }}</span>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="权限冲突" name="conflicts">
            <div v-if="previewConflicts.length > 0" class="conflict-preview">
              <el-alert
                v-for="conflict in previewConflicts"
                :key="conflict.id"
                :title="conflict.title"
                :description="conflict.description"
                type="warning"
                show-icon
                :closable="false"
                class="conflict-item"
              />
            </div>
            <div v-else class="no-preview-conflicts">
              <el-empty description="无权限冲突" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  QuestionFilled, ArrowRight, Key, Refresh
} from '@element-plus/icons-vite'
import * as echarts from 'echarts'
import enhancedPermissionService from '@/services/enhancedPermissionService'

// 响应式数据
const inheritanceDialogVisible = ref(false)
const previewDialogVisible = ref(false)
const selectedRoleForAdditional = ref('')
const previewInheritance = ref(null)

// 统计数据
const inheritanceStats = ref([
  { key: 'total', label: '总继承关系', value: 12 },
  { key: 'active', label: '活跃继承', value: 10 },
  { key: 'conflicts', label: '冲突数量', value: 2 },
  { key: 'avgDepth', label: '平均继承深度', value: 2.5 }
])

// 角色数据
const roles = ref([
  { id: '1', name: '村级管理员', level: 4 },
  { id: '2', name: '部门主管', level: 3 },
  { id: '3', name: '工作人员', level: 2 },
  { id: '4', name: '村民', level: 1 }
])

// 继承关系数据
const roleInheritances = ref([
  {
    id: '1',
    childRole: { id: '1', name: '村级管理员' },
    parentRole: { id: '2', name: '部门主管' },
    inheritedPermissionCount: 45,
    additionalPermissions: ['village:*', 'system:config'],
    enabled: true,
    conditions: ['network_secure']
  },
  {
    id: '2',
    childRole: { id: '2', name: '部门主管' },
    parentRole: { id: '3', name: '工作人员' },
    inheritedPermissionCount: 28,
    additionalPermissions: ['staff:*', 'report:view'],
    enabled: true,
    conditions: []
  },
  {
    id: '3',
    childRole: { id: '3', name: '工作人员' },
    parentRole: { id: '4', name: '村民' },
    inheritedPermissionCount: 15,
    additionalPermissions: ['service:*', 'announcement:read'],
    enabled: true,
    conditions: []
  }
])

// 权限选项
const basePermissionOptions = ref([
  { key: 'user:read', label: '查看用户' },
  { key: 'user:write', label: '编辑用户' },
  { key: 'resident:read', label: '查看村民' },
  { key: 'resident:write', label: '编辑村民' },
  { key: 'finance:read', label: '查看财务' },
  { key: 'finance:approve', label: '审批财务' },
  { key: 'system:config', label: '系统配置' },
  { key: 'emergency:dispatch', label: '应急调度' }
])

const dynamicRuleOptions = ref([
  { id: '1', name: '工作时间限制', description: '仅在工作时间生效' },
  { id: '2', name: '位置限制', description: '限制访问位置' },
  { id: '3', name: '设备信任', description: '需要可信设备' },
  { id: '4', name: '频率限制', description: '限制操作频率' }
])

// 冲突数据
const conflicts = ref([
  {
    id: '1',
    title: '循环继承检测',
    description: '发现潜在的循环继承路径：村民 -> 工作人员 -> 部门主管 -> 村民',
    severity: 'error'
  },
  {
    id: '2',
    title: '权限重复',
    description: '角色"部门主管"通过多条继承路径获得了相同的权限',
    severity: 'warning'
  }
])

// 表单数据
const inheritanceFormRef = ref(null)
const inheritanceForm = reactive({
  childRole: '',
  parentRole: '',
  conditions: [],
  priority: 'medium',
  description: ''
})

const inheritanceRules = {
  childRole: [
    { required: true, message: '请选择子角色', trigger: 'change' }
  ],
  parentRole: [
    { required: true, message: '请选择父角色', trigger: 'change' }
  ]
}

const constraintForm = reactive({
  timeConstraint: false,
  startTime: '',
  endTime: '',
  networkConstraint: false,
  deviceConstraint: false
})

const selectedBasePermissions = ref([])
const selectedDynamicRules = ref([])

// 预览数据
const previewInheritedPermissions = ref([
  { module: '用户管理', permission: 'user:read', source: '村民角色', type: 'direct' },
  { module: '村民管理', permission: 'resident:read', source: '村民角色', type: 'direct' },
  { module: '财务管理', permission: 'finance:read', source: '部门主管', type: 'indirect' }
])

const previewAdditionalPermissions = ref([
  { key: 'staff:manage', name: '员工管理', description: '管理下属员工' },
  { key: 'task:assign', name: '任务分配', description: '分配工作任务' }
])

const previewConflicts = ref([
  {
    id: '1',
    title: '权限重复',
    description: '通过多条路径获得了相同的权限'
  }
])

// 图表实例
let inheritanceChart = null

// 计算属性
const availableChildRoles = computed(() => {
  return roles.value.filter(role => role.level > 1)
})

const availableParentRoles = computed(() => {
  return roles.value.filter(role => role.level < 4)
})

const transferProps = {
  key: 'key',
  label: 'label'
}

// 方法
const initInheritanceChart = () => {
  const chartDom = document.querySelector('[ref="inheritanceChart"]')
  if (!chartDom) return

  inheritanceChart = echarts.init(chartDom)

  const option = {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove'
    },
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'tree',
        data: [
          {
            name: '村级管理员',
            children: [
              {
                name: '部门主管',
                children: [
                  {
                    name: '工作人员',
                    children: [
                      { name: '村民' }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        top: '10%',
        left: '8%',
        bottom: '8%',
        right: '8%',
        symbolSize: 100,
        orient: 'vertical',
        label: {
          position: 'top',
          rotate: 0,
          verticalAlign: 'middle',
          align: 'center',
          fontSize: 14
        },
        leaves: {
          label: {
            position: 'bottom',
            rotate: 0,
            verticalAlign: 'middle',
            align: 'center'
          }
        },
        emphasis: {
          focus: 'descendant'
        },
        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750
      }
    ]
  }

  inheritanceChart.setOption(option)

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    inheritanceChart?.resize()
  })
}

const showInheritanceGuide = () => {
  ElMessageBox.alert(
    '权限继承允许子角色自动获得父角色的所有权限，同时可以配置额外的权限。合理的继承关系可以简化权限管理，但需要注意避免循环继承。',
    '权限继承指南',
    {
      confirmButtonText: '了解了'
    }
  )
}

const showAddInheritanceDialog = () => {
  Object.assign(inheritanceForm, {
    childRole: '',
    parentRole: '',
    conditions: [],
    priority: 'medium',
    description: ''
  })
  inheritanceDialogVisible.value = true
}

const saveInheritance = async () => {
  try {
    await inheritanceFormRef.value.validate()

    const childRole = roles.value.find(r => r.id === inheritanceForm.childRole)
    const parentRole = roles.value.find(r => r.id === inheritanceForm.parentRole)

    const newInheritance = {
      id: Date.now().toString(),
      childRole,
      parentRole,
      inheritedPermissionCount: Math.floor(Math.random() * 50) + 10,
      additionalPermissions: [],
      enabled: true,
      conditions: inheritanceForm.conditions
    }

    roleInheritances.value.push(newInheritance)
    inheritanceDialogVisible.value = false

    ElMessage.success('继承关系添加成功')
    updateInheritanceChart()
  } catch (error) {
    console.error('保存继承关系失败:', error)
  }
}

const toggleInheritance = async (inheritance) => {
  try {
    ElMessage.success(`继承关系已${inheritance.enabled ? '启用' : '禁用'}`)
  } catch (error) {
    inheritance.enabled = !inheritance.enabled
    ElMessage.error('更新继承状态失败')
  }
}

const editInheritance = (inheritance) => {
  Object.assign(inheritanceForm, {
    childRole: inheritance.childRole.id,
    parentRole: inheritance.parentRole.id,
    conditions: inheritance.conditions,
    priority: 'medium',
    description: ''
  })
  inheritanceDialogVisible.value = true
}

const previewInheritance = (inheritance) => {
  previewInheritance.value = inheritance
  previewDialogVisible.value = true
}

const deleteInheritance = async (inheritance) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${inheritance.childRole.name}"到"${inheritance.parentRole.name}"的继承关系吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const index = roleInheritances.value.findIndex(i => i.id === inheritance.id)
    roleInheritances.value.splice(index, 1)

    ElMessage.success('继承关系删除成功')
    updateInheritanceChart()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除继承关系失败')
    }
  }
}

const loadAdditionalPermissions = () => {
  // 加载选中角色的额外权限
  console.log('加载角色额外权限:', selectedRoleForAdditional.value)
}

const saveAdditionalPermissions = async () => {
  try {
    ElMessage.success('额外权限配置保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const resetAdditionalPermissions = () => {
  selectedBasePermissions.value = []
  selectedDynamicRules.value = []
  Object.assign(constraintForm, {
    timeConstraint: false,
    startTime: '',
    endTime: '',
    networkConstraint: false,
    deviceConstraint: false
  })
}

const runConflictDetection = async () => {
  try {
    ElMessage.info('正在检测权限继承冲突...')

    // 模拟检测过程
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (conflicts.value.length > 0) {
      ElMessage.warning(`检测到 ${conflicts.value.length} 个冲突`)
    } else {
      ElMessage.success('未检测到冲突')
    }
  } catch (error) {
    ElMessage.error('冲突检测失败')
  }
}

const resolveConflict = (conflict) => {
  ElMessage.info(`解决冲突: ${conflict.title}`)
  const index = conflicts.value.findIndex(c => c.id === conflict.id)
  conflicts.value.splice(index, 1)
}

const ignoreConflict = (conflict) => {
  const index = conflicts.value.findIndex(c => c.id === conflict.id)
  conflicts.value.splice(index, 1)
}

const updateInheritanceChart = () => {
  // 更新图表数据
  if (inheritanceChart) {
    const chartData = buildChartData()
    inheritanceChart.setOption({
      series: [{
        data: [chartData]
      }]
    })
  }
}

const buildChartData = () => {
  // 根据继承关系构建图表数据
  const roleMap = new Map()
  roles.value.forEach(role => {
    roleMap.set(role.id, { name: role.name, children: [] })
  })

  // 构建继承树
  roleInheritances.value
    .filter(inheritance => inheritance.enabled)
    .forEach(inheritance => {
      const child = roleMap.get(inheritance.childRole.id)
      const parent = roleMap.get(inheritance.parentRole.id)

      if (child && parent && !parent.children.find(c => c.name === child.name)) {
        parent.children.push(child)
      }
    })

  // 找到根节点
  const rootRoles = Array.from(roleMap.values()).filter(role =>
    !roleInheritances.value.some(inheritance =>
      inheritance.enabled && inheritance.parentRole.id === role.name
    )
  )

  return rootRoles[0] || { name: '村级管理员', children: [] }
}

// 生命周期
onMounted(async () => {
  await nextTick()
  initInheritanceChart()
})
</script>

<style lang="scss" scoped>
.permission-inheritance-config {
  .overview-card {
    margin-bottom: 24px;

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

    .inheritance-diagram {
      margin-bottom: 24px;

      .chart-container {
        height: 400px;
      }
    }

    .inheritance-stats {
      .stat-item {
        text-align: center;
        padding: 16px;
        background: #f5f7fa;
        border-radius: 6px;

        .stat-value {
          font-size: 32px;
          font-weight: 600;
          color: #2c3e50;
          line-height: 1;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          color: #606266;
        }
      }
    }
  }

  .config-section {
    margin-bottom: 24px;

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

    .inheritance-list {
      .inheritance-item {
        padding: 16px;
        margin-bottom: 12px;
        background: #f5f7fa;
        border-radius: 6px;
        transition: all 0.3s ease;

        &:hover {
          background: #e6e8eb;
        }

        .inheritance-roles {
          display: flex;
          align-items: center;
          margin-bottom: 12px;

          .role-box {
            flex: 1;
            text-align: center;
            padding: 12px;
            background: white;
            border-radius: 4px;
            border: 2px solid #e4e7ed;

            &.child {
              border-color: #409eff;
            }

            &.parent {
              border-color: #67c23a;
            }

            .role-name {
              display: block;
              font-weight: 500;
              margin-bottom: 4px;
            }
          }

          .inheritance-arrow {
            margin: 0 16px;
            font-size: 24px;
            color: #909399;
          }
        }

        .inheritance-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 12px;

          .detail-item {
            .label {
              font-size: 12px;
              color: #909399;
            }

            .value {
              font-weight: 500;
              color: #2c3e50;
            }
          }
        }

        .inheritance-actions {
          text-align: right;

          .danger-text {
            color: #f56c6c;
          }
        }
      }
    }

    .additional-permissions {
      .permission-section {
        margin-bottom: 24px;

        h4 {
          margin-bottom: 12px;
          color: #2c3e50;
        }

        .rule-option {
          .rule-name {
            display: block;
            font-weight: 500;
            color: #2c3e50;
          }

          .rule-description {
            display: block;
            font-size: 12px;
            color: #909399;
          }
        }

        .constraint-detail {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
      }

      .permission-actions {
        text-align: center;
        padding-top: 24px;
        border-top: 1px solid #e4e7ed;
      }
    }

    .no-role-selected {
      padding: 40px;
      text-align: center;
    }
  }

  .conflict-detection-card {
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

    .conflict-list {
      .conflict-item {
        margin-bottom: 12px;

        .conflict-content {
          .conflict-actions {
            margin-top: 12px;
          }
        }
      }
    }

    .no-conflicts {
      padding: 40px;
      text-align: center;
    }
  }

  .inheritance-preview {
    h4 {
      margin-bottom: 24px;
      color: #2c3e50;
    }

    .permission-table {
      margin-bottom: 24px;
    }

    .additional-list {
      .additional-item {
        display: flex;
        align-items: center;
        padding: 12px;
        margin-bottom: 8px;
        background: #f5f7fa;
        border-radius: 4px;

        .el-icon {
          margin-right: 12px;
          color: #409eff;
        }

        .permission-name {
          font-weight: 500;
          color: #2c3e50;
          margin-right: 12px;
        }

        .permission-description {
          font-size: 14px;
          color: #606266;
        }
      }
    }

    .conflict-preview {
      .conflict-item {
        margin-bottom: 12px;
      }
    }

    .no-preview-conflicts {
      padding: 40px;
      text-align: center;
    }
  }
}
</style>