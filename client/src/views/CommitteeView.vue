<template>
  <div class="committee-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">🏛️ 村委管理系统</h1>
          <p class="page-subtitle">分级权限体系 • 智能值班调度 • 审计追踪系统</p>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="showAddDialog" icon="Plus">
            添加村委成员
          </el-button>
          <el-button type="success" @click="showDutySchedule" icon="Calendar">
            值班安排
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.totalMembers }}</div>
              <div class="stat-label">总成员数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.partyMembers }}</div>
              <div class="stat-label">党员数量</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.onDutyToday }}</div>
              <div class="stat-label">今日值班</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.activeRoles }}</div>
              <div class="stat-label">活跃岗位</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 功能选项卡 -->
    <el-tabs v-model="activeTab" type="card" class="committee-tabs">
      <!-- 人员管理 -->
      <el-tab-pane label="人员管理" name="members">
        <div class="members-section">
          <!-- 搜索筛选 -->
          <div class="search-filters">
            <el-row :gutter="20">
              <el-col :span="6">
                <el-input
                  v-model="searchQuery"
                  placeholder="搜索姓名、职务或电话"
                  prefix-icon="Search"
                  clearable
                />
              </el-col>
              <el-col :span="4">
                <el-select v-model="filterRole" placeholder="职务筛选" clearable>
                  <el-option label="全部" value="" />
                  <el-option label="村支书" value="secretary" />
                  <el-option label="村主任" value="director" />
                  <el-option label="会计" value="accountant" />
                  <el-option label="人口主任" value="population_manager" />
                  <el-option label="妇女主任" value="women_director" />
                </el-select>
              </el-col>
              <el-col :span="4">
                <el-select v-model="filterStatus" placeholder="状态筛选" clearable>
                  <el-option label="全部" value="" />
                  <el-option label="在职" value="active" />
                  <el-option label="离职" value="inactive" />
                  <el-option label="调任" value="transferred" />
                </el-select>
              </el-col>
              <el-col :span="4">
                <el-select v-model="filterPartyMember" placeholder="党员筛选" clearable>
                  <el-option label="全部" value="" />
                  <el-option label="党员" value="true" />
                  <el-option label="非党员" value="false" />
                </el-select>
              </el-col>
              <el-col :span="6">
                <el-button type="primary" @click="searchMembers" icon="Search">
                  搜索
                </el-button>
                <el-button @click="resetFilters" icon="Refresh">
                  重置
                </el-button>
                <el-button type="success" @click="exportMembers" icon="Download">
                  导出
                </el-button>
              </el-col>
            </el-row>
          </div>

          <!-- 成员列表 -->
          <div class="members-table">
            <el-table
              :data="filteredMembers"
              v-loading="loading"
              stripe
              border
              style="width: 100%"
            >
              <el-table-column prop="id" label="编号" width="80" />
              <el-table-column prop="name" label="姓名" width="100" />
              <el-table-column prop="position" label="职务" width="120">
                <template #default="scope">
                  <el-tag :type="getPositionTagType(scope.row.position)">
                    {{ getPositionName(scope.row.position) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="phone" label="联系电话" width="130">
                <template #default="scope">
                  <span v-if="scope.row.phoneVisible">{{ scope.row.phone }}</span>
                  <span v-else>{{ maskPhone(scope.row.phone) }}</span>
                  <el-button
                    type="text"
                    size="small"
                    @click="togglePhoneVisibility(scope.row)"
                    icon="View"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="isPartyMember" label="党员" width="80">
                <template #default="scope">
                  <el-icon v-if="scope.row.isPartyMember" color="#f56c6c">
                    <Star />
                  </el-icon>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column prop="dutyStatus" label="值班状态" width="100">
                <template #default="scope">
                  <el-tag v-if="scope.row.dutyStatus === 'on_duty'" type="success">
                    值班中
                  </el-tag>
                  <el-tag v-else-if="scope.row.dutyStatus === 'scheduled'" type="warning">
                    已排班
                  </el-tag>
                  <el-tag v-else type="info">
                    空闲
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="在职状态" width="100">
                <template #default="scope">
                  <el-tag :type="getStatusTagType(scope.row.status)">
                    {{ getStatusName(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="joinDate" label="任职时间" width="120" />
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="scope">
                  <el-button
                    type="primary"
                    size="small"
                    @click="editMember(scope.row)"
                    icon="Edit"
                  >
                    编辑
                  </el-button>
                  <el-button
                    type="warning"
                    size="small"
                    @click="assignDuty(scope.row)"
                    icon="Calendar"
                  >
                    排班
                  </el-button>
                  <el-dropdown @command="handleMemberAction">
                    <el-button type="info" size="small" icon="More" />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item :command="{action: 'transfer', member: scope.row}">
                          调任
                        </el-dropdown-item>
                        <el-dropdown-item :command="{action: 'retire', member: scope.row}">
                          离职
                        </el-dropdown-item>
                        <el-dropdown-item :command="{action: 'audit', member: scope.row}">
                          审计日志
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 分页 -->
          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="totalMembers"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 权限管理 -->
      <el-tab-pane label="权限管理" name="permissions">
        <div class="permissions-section">
          <div class="permission-roles">
            <h3>角色权限配置</h3>
            <el-table :data="rolePermissions" border>
              <el-table-column prop="roleName" label="角色名称" width="150" />
              <el-table-column prop="description" label="角色描述" width="200" />
              <el-table-column label="权限列表">
                <template #default="scope">
                  <el-tag
                    v-for="permission in scope.row.permissions"
                    :key="permission"
                    size="small"
                    style="margin: 2px"
                  >
                    {{ getPermissionName(permission) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="scope">
                  <el-button
                    type="primary"
                    size="small"
                    @click="editRolePermissions(scope.row)"
                  >
                    编辑权限
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <!-- 值班管理 -->
      <el-tab-pane label="值班管理" name="duty">
        <div class="duty-section">
          <!-- 值班日历 -->
          <div class="duty-calendar">
            <h3>值班安排表</h3>
            <el-calendar v-model="dutyCalendarDate">
              <template #date-cell="{ data }">
                <div class="duty-cell">
                  <div class="date">{{ data.day.split('-').slice(2).join('-') }}</div>
                  <div v-if="getDutyInfo(data.day)" class="duty-info">
                    <el-tag size="small" type="success">
                      {{ getDutyInfo(data.day).name }}
                    </el-tag>
                  </div>
                </div>
              </template>
            </el-calendar>
          </div>

          <!-- 值班设置 -->
          <div class="duty-settings">
            <h3>快速排班</h3>
            <el-form :model="dutyForm" label-width="100px">
              <el-form-item label="值班人员">
                <el-select v-model="dutyForm.memberId" placeholder="选择值班人员">
                  <el-option
                    v-for="member in activeMembers"
                    :key="member.id"
                    :label="member.name"
                    :value="member.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="值班日期">
                <el-date-picker
                  v-model="dutyForm.dutyDate"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                />
              </el-form-item>
              <el-form-item label="值班类型">
                <el-select v-model="dutyForm.dutyType" placeholder="选择值班类型">
                  <el-option label="日常值班" value="daily" />
                  <el-option label="夜间值班" value="night" />
                  <el-option label="节假日值班" value="holiday" />
                  <el-option label="应急值班" value="emergency" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="scheduleDuty">安排值班</el-button>
                <el-button @click="autoSchedule">自动排班</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </el-tab-pane>

      <!-- 审计日志 -->
      <el-tab-pane label="审计日志" name="audit">
        <div class="audit-section">
          <!-- 审计筛选 -->
          <div class="audit-filters">
            <el-row :gutter="20">
              <el-col :span="6">
                <el-date-picker
                  v-model="auditDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                />
              </el-col>
              <el-col :span="4">
                <el-select v-model="auditActionFilter" placeholder="操作类型">
                  <el-option label="全部" value="" />
                  <el-option label="添加成员" value="add_member" />
                  <el-option label="编辑信息" value="edit_member" />
                  <el-option label="权限变更" value="permission_change" />
                  <el-option label="排班操作" value="duty_schedule" />
                </el-select>
              </el-col>
              <el-col :span="4">
                <el-button type="primary" @click="searchAuditLogs">搜索</el-button>
              </el-col>
            </el-row>
          </div>

          <!-- 审计日志表 -->
          <div class="audit-table">
            <el-table :data="auditLogs" border stripe>
              <el-table-column prop="timestamp" label="操作时间" width="180" />
              <el-table-column prop="operator" label="操作人" width="100" />
              <el-table-column prop="action" label="操作类型" width="120">
                <template #default="scope">
                  <el-tag :type="getAuditActionType(scope.row.action)">
                    {{ getAuditActionName(scope.row.action) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="target" label="操作对象" width="100" />
              <el-table-column prop="details" label="操作详情" />
              <el-table-column prop="ip" label="IP地址" width="120" />
              <el-table-column label="操作" width="100">
                <template #default="scope">
                  <el-button
                    type="text"
                    @click="viewAuditDetail(scope.row)"
                  >
                    详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加成员对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加村委成员"
      width="600px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addFormRules"
        label-width="100px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="addForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="addForm.idCard" placeholder="请输入身份证号" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="addForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="职务" prop="position">
          <el-select v-model="addForm.position" placeholder="选择职务">
            <el-option label="村支书" value="secretary" />
            <el-option label="村主任" value="director" />
            <el-option label="会计" value="accountant" />
            <el-option label="人口主任" value="population_manager" />
            <el-option label="妇女主任" value="women_director" />
            <el-option label="治安主任" value="security_manager" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否党员">
          <el-switch v-model="addForm.isPartyMember" />
        </el-form-item>
        <el-form-item label="任职文件" prop="appointmentDoc">
          <el-upload
            class="upload-demo"
            drag
            action="/api/upload"
            :on-preview="handlePreview"
            :on-remove="handleRemove"
            :file-list="addForm.fileList"
            :before-upload="beforeUpload"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                只能上传jpg/png/pdf文件，且不超过5MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAddForm" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 其他对话框... -->
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Edit, Calendar, Plus, More, Star, View, Refresh, Download, UploadFilled } from '@element-plus/icons-vue'
import { axiosInstance as api } from '@/api'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()

// 从数据库加载数据
const loadMembers = async () => {
  try {
    const response = await api.get('/api/v1/committee/members')
    if (response.success) {
      members.value = response.data || []
      // 更新统计
      stats.value.total = members.value.length
      stats.value.partyMembers = members.value.filter(m => m.isPartyMember).length
      stats.value.onDuty = members.value.filter(m => m.dutyStatus === 'onduty').length
    }
  } catch (error) {
    console.error('加载村委数据失败:', error)
    ElMessage.warning('加载数据失败，显示模拟数据')
  }
}

// 响应式数据
const activeTab = ref('members')
const loading = ref(false)
const submitting = ref(false)

// 统计数据
const statistics = reactive({
  totalMembers: 12,
  partyMembers: 8,
  onDutyToday: 2,
  activeRoles: 6
})

// 搜索和筛选
const searchQuery = ref('')
const filterRole = ref('')
const filterStatus = ref('')
const filterPartyMember = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalMembers = ref(0)

// 成员数据
const members = ref([
  {
    id: 1,
    name: '张村长',
    position: 'director',
    phone: '13800138001',
    phoneVisible: false,
    isPartyMember: true,
    dutyStatus: 'on_duty',
    status: 'active',
    joinDate: '2020-01-15'
  },
  {
    id: 2,
    name: '李支书',
    position: 'secretary',
    phone: '13800138002',
    phoneVisible: false,
    isPartyMember: true,
    dutyStatus: 'scheduled',
    status: 'active',
    joinDate: '2019-03-10'
  },
  {
    id: 3,
    name: '王会计',
    position: 'accountant',
    phone: '13800138003',
    phoneVisible: false,
    isPartyMember: false,
    dutyStatus: 'free',
    status: 'active',
    joinDate: '2021-06-20'
  }
])

// 计算属性
const filteredMembers = computed(() => {
  let result = members.value

  if (searchQuery.value) {
    result = result.filter(member =>
      member.name.includes(searchQuery.value) ||
      member.phone.includes(searchQuery.value) ||
      getPositionName(member.position).includes(searchQuery.value)
    )
  }

  if (filterRole.value) {
    result = result.filter(member => member.position === filterRole.value)
  }

  if (filterStatus.value) {
    result = result.filter(member => member.status === filterStatus.value)
  }

  if (filterPartyMember.value !== '') {
    result = result.filter(member =>
      member.isPartyMember === (filterPartyMember.value === 'true')
    )
  }

  return result
})

const activeMembers = computed(() => {
  return members.value.filter(member => member.status === 'active')
})

// 添加成员表单
const addDialogVisible = ref(false)
const addFormRef = ref()
const addForm = reactive({
  name: '',
  idCard: '',
  phone: '',
  position: '',
  isPartyMember: false,
  fileList: []
})

const addFormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, message: '身份证号格式不正确', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  position: [
    { required: true, message: '请选择职务', trigger: 'change' }
  ]
}

// 值班管理
const dutyCalendarDate = ref(new Date())
const dutyForm = reactive({
  memberId: '',
  dutyDate: [],
  dutyType: ''
})

const dutySchedule = ref([
  {
    date: '2024-01-15',
    name: '张村长',
    type: 'daily'
  },
  {
    date: '2024-01-16',
    name: '李支书',
    type: 'daily'
  }
])

// 权限管理
const rolePermissions = ref([
  {
    roleName: '村支书',
    description: '村党支部书记',
    permissions: ['all_permissions']
  },
  {
    roleName: '村主任',
    description: '村民委员会主任',
    permissions: ['village_management', 'project_approval', 'finance_view']
  },
  {
    roleName: '会计',
    description: '财务管理人员',
    permissions: ['finance_management', 'budget_create', 'report_generate']
  },
  {
    roleName: '人口主任',
    description: '人口管理人员',
    permissions: ['resident_management', 'household_change', 'statistics_report']
  }
])

// 审计日志
const auditDateRange = ref([])
const auditActionFilter = ref('')
const auditLogs = ref([
  {
    timestamp: '2024-01-15 14:30:22',
    operator: '系统管理员',
    action: 'add_member',
    target: '张村长',
    details: '添加新的村委成员，职务：村主任',
    ip: '192.168.1.100'
  },
  {
    timestamp: '2024-01-15 10:15:33',
    operator: '李支书',
    action: 'duty_schedule',
    target: '王会计',
    details: '安排值班：2024-01-16 至 2024-01-18',
    ip: '192.168.1.101'
  }
])

// 方法
const getPositionName = (position) => {
  const positions = {
    secretary: '村支书',
    director: '村主任',
    accountant: '会计',
    population_manager: '人口主任',
    women_director: '妇女主任',
    security_manager: '治安主任'
  }
  return positions[position] || position
}

const getPositionTagType = (position) => {
  const types = {
    secretary: 'danger',
    director: 'warning',
    accountant: 'success',
    population_manager: 'info',
    women_director: 'primary',
    security_manager: 'warning'
  }
  return types[position] || 'info'
}

const getStatusName = (status) => {
  const statuses = {
    active: '在职',
    inactive: '离职',
    transferred: '调任'
  }
  return statuses[status] || status
}

const getStatusTagType = (status) => {
  const types = {
    active: 'success',
    inactive: 'danger',
    transferred: 'warning'
  }
  return types[status] || 'info'
}

const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const togglePhoneVisibility = (member) => {
  member.phoneVisible = !member.phoneVisible
}

const showAddDialog = () => {
  addDialogVisible.value = true
}

const showDutySchedule = () => {
  activeTab.value = 'duty'
}

const searchMembers = () => {
  console.log('搜索成员')
  // 实现搜索逻辑
}

const resetFilters = () => {
  searchQuery.value = ''
  filterRole.value = ''
  filterStatus.value = ''
  filterPartyMember.value = ''
}

const exportMembers = () => {
  ElMessage.success('导出功能开发中...')
}

const editMember = (member) => {
  console.log('编辑成员:', member)
  ElMessage.info('编辑功能开发中...')
}

const assignDuty = (member) => {
  console.log('分配值班:', member)
  activeTab.value = 'duty'
  dutyForm.memberId = member.id
}

const handleMemberAction = (command) => {
  const { action, member } = command

  switch (action) {
    case 'transfer':
      ElMessage.info('调任功能开发中...')
      break
    case 'retire':
      ElMessageBox.confirm(
        `确认要将 ${member.name} 设置为离职状态吗？`,
        '确认操作',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        member.status = 'inactive'
        ElMessage.success('操作成功')
      })
      break
    case 'audit':
      activeTab.value = 'audit'
      break
  }
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

const getDutyInfo = (date) => {
  return dutySchedule.value.find(duty => duty.date === date)
}

const scheduleDuty = () => {
  if (!dutyForm.memberId || !dutyForm.dutyDate.length || !dutyForm.dutyType) {
    ElMessage.warning('请填写完整的值班信息')
    return
  }

  ElMessage.success('值班安排成功')

  // 重置表单
  Object.assign(dutyForm, {
    memberId: '',
    dutyDate: [],
    dutyType: ''
  })
}

const autoSchedule = () => {
  ElMessage.success('自动排班完成')
}

const searchAuditLogs = () => {
  console.log('搜索审计日志')
}

const viewAuditDetail = (log) => {
  console.log('查看审计详情:', log)
  ElMessage.info('详情功能开发中...')
}

const getAuditActionName = (action) => {
  const actions = {
    add_member: '添加成员',
    edit_member: '编辑信息',
    permission_change: '权限变更',
    duty_schedule: '排班操作'
  }
  return actions[action] || action
}

const getAuditActionType = (action) => {
  const types = {
    add_member: 'success',
    edit_member: 'warning',
    permission_change: 'danger',
    duty_schedule: 'info'
  }
  return types[action] || 'info'
}

const getPermissionName = (permission) => {
  const permissions = {
    all_permissions: '所有权限',
    village_management: '村务管理',
    project_approval: '项目审批',
    finance_view: '财务查看',
    finance_management: '财务管理',
    budget_create: '预算编制',
    report_generate: '报表生成',
    resident_management: '村民管理',
    household_change: '户籍变更',
    statistics_report: '统计上报'
  }
  return permissions[permission] || permission
}

const editRolePermissions = (role) => {
  console.log('编辑角色权限:', role)
  ElMessage.info('权限编辑功能开发中...')
}

const handleDialogClose = (done) => {
  ElMessageBox.confirm('确认关闭？')
    .then(() => {
      done()
    })
    .catch(() => {
      // catch error
    })
}

const submitAddForm = () => {
  addFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true

      try {
        // 调用API添加村委成员
        const response = await api.post('/api/v1/committee/members', {
          name: addForm.name,
          position: addForm.position,
          phone: addForm.phone,
          isPartyMember: addForm.isPartyMember,
          villageId: userStore.userInfo?.villageId || null
        })

        if (response.success) {
          members.value.push(response.data)
          stats.value.total++
          if (response.data.isPartyMember) {
            stats.value.partyMembers++
          }
          ElMessage.success('添加成功')
          addDialogVisible.value = false

          // 重置表单
          addFormRef.value.resetFields()
          addForm.fileList = []
        } else {
          ElMessage.error(response.message || '添加失败')
        }
      } catch (error) {
        console.error('添加村委成员失败:', error)
        ElMessage.error(error.response?.data?.error || error.message || '添加失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const handlePreview = (file) => {
  console.log('预览文件:', file)
}

const handleRemove = (file) => {
  console.log('删除文件:', file)
}

const beforeUpload = (file) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'application/pdf'
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isJPG) {
    ElMessage.error('上传文件只能是 JPG/PNG/PDF 格式!')
  }
  if (!isLt5M) {
    ElMessage.error('上传文件大小不能超过 5MB!')
  }
  return isJPG && isLt5M
}

// 生命周期
onMounted(() => {
  console.log('村委管理模块已加载')
  // 加载数据
  loadMembers()
})
</script>

<style scoped lang="scss">
.committee-management {
  padding: 20px;

  .page-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 20px;
    color: white;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        .page-title {
          font-size: 28px;
          margin: 0 0 8px 0;
          font-weight: bold;
        }

        .page-subtitle {
          font-size: 16px;
          margin: 0;
          opacity: 0.9;
        }
      }

      .header-right {
        display: flex;
        gap: 12px;
      }
    }
  }

  .stats-overview {
    margin-bottom: 20px;

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

      .stat-icon {
        font-size: 40px;
        margin-right: 16px;
      }

      .stat-content {
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #409EFF;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
        }
      }
    }
  }

  .committee-tabs {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .search-filters {
      margin-bottom: 20px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .members-table {
      margin-bottom: 20px;
    }

    .pagination {
      display: flex;
      justify-content: center;
      margin-top: 20px;
    }

    .duty-calendar {
      margin-bottom: 30px;

      .duty-cell {
        height: 100%;
        padding: 4px;

        .date {
          font-size: 12px;
          color: #666;
        }

        .duty-info {
          margin-top: 4px;
        }
      }
    }

    .duty-settings {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }

    .audit-filters {
      margin-bottom: 20px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .audit-table {
      margin-bottom: 20px;
    }

    .permissions-section {
      .permission-roles {
        h3 {
          margin-bottom: 20px;
          color: #333;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .committee-management {
    padding: 10px;

    .page-header {
      .header-content {
        flex-direction: column;
        gap: 20px;
        text-align: center;

        .header-right {
          justify-content: center;
        }
      }
    }

    .stats-overview {
      .stat-card {
        .stat-icon {
          font-size: 30px;
        }

        .stat-content .stat-value {
          font-size: 20px;
        }
      }
    }
  }
}
</style>