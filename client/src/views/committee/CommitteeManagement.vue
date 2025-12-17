<template>
  <div class="committee-management">
    <!-- 页面标题 -->
    <div class="page-header mb-6">
      <h1 class="text-2xl font-bold text-gray-800">村委会管理</h1>
      <p class="text-gray-600 mt-2">管理村委会成员、职务分工、工作职责等信息</p>
    </div>

    <!-- 村委会概况 -->
    <el-row :gutter="16" class="mb-6">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number text-blue-600">{{ statistics.totalMembers }}</div>
            <div class="stat-label">村委成员</div>
          </div>
          <el-icon class="stat-icon text-blue-400"><User /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number text-green-600">{{ statistics.departments }}</div>
            <div class="stat-label">部门数量</div>
          </div>
          <el-icon class="stat-icon text-green-400"><OfficeBuilding /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number text-orange-600">{{ statistics.onDuty }}</div>
            <div class="stat-label">在职人员</div>
          </div>
          <el-icon class="stat-icon text-orange-400"><UserFilled /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number text-purple-600">{{ statistics.partyMembers }}</div>
            <div class="stat-label">党员人数</div>
          </div>
          <el-icon class="stat-icon text-purple-400"><Star /></el-icon>
        </el-card>
      </el-col>
    </el-row>

    <!-- 组织架构图 -->
    <el-card class="mb-6">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold">组织架构</span>
          <el-button type="primary" size="small" @click="editOrganization">
            <el-icon><Edit /></el-icon>
            编辑架构
          </el-button>
        </div>
      </template>

      <div class="organization-chart">
        <div class="org-level level-1">
          <div class="org-node primary">
            <div class="node-title">村党支部</div>
            <div class="node-members">
              <span v-for="member in partyCommittee" :key="member.id" class="member-tag">
                {{ member.name }}({{ member.position }})
              </span>
            </div>
          </div>
        </div>

        <div class="org-level level-2">
          <div class="org-node success">
            <div class="node-title">村委会</div>
            <div class="node-members">
              <span v-for="member in villageCommittee" :key="member.id" class="member-tag">
                {{ member.name }}({{ member.position }})
              </span>
            </div>
          </div>

          <div class="org-node warning">
            <div class="node-title">监督委员会</div>
            <div class="node-members">
              <span v-for="member in supervisoryCommittee" :key="member.id" class="member-tag">
                {{ member.name }}({{ member.position }})
              </span>
            </div>
          </div>
        </div>

        <div class="org-level level-3">
          <div v-for="dept in departments" :key="dept.id" class="org-node info">
            <div class="node-title">{{ dept.name }}</div>
            <div class="node-members">
              <span v-for="member in dept.members" :key="member.id" class="member-tag">
                {{ member.name }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 成员管理表格 -->
    <DataTable
      ref="tableRef"
      :data="memberList"
      :columns="tableColumns"
      :loading="loading"
      :total="pagination.total"
      :page-size="pagination.pageSize"
      :show-advanced-search="true"
      :advanced-search-fields="searchFields"
      search-placeholder="搜索姓名、职务、联系方式"
      add-text="新增成员"
      @search="handleSearch"
      @reset="handleReset"
      @add="handleAdd"
      @edit="handleEdit"
      @delete="handleDelete"
      @batch-delete="handleBatchDelete"
      @export="handleExport"
      @refresh="handleRefresh"
      @page-change="handlePageChange"
    >
      <!-- 自定义列插槽 -->
      <template #avatar="{ row }">
        <el-avatar :size="40" :src="row.avatar">
          {{ row.name?.charAt(0) }}
        </el-avatar>
      </template>

      <template #position="{ row }">
        <el-tag :type="getPositionTag(row.position)" size="small">
          {{ row.position }}
        </el-tag>
      </template>

      <template #department="{ row }">
        <el-tag type="info" size="small">
          {{ row.department }}
        </el-tag>
      </template>

      <template #status="{ row }">
        <el-tag :type="row.status === '在职' ? 'success' : 'danger'" size="small">
          {{ row.status }}
        </el-tag>
      </template>

      <template #politicalStatus="{ row }">
        <el-tag :type="row.politicalStatus === '党员' ? 'danger' : 'info'" size="small">
          {{ row.politicalStatus }}
        </el-tag>
      </template>

      <template #actions="{ row }">
        <el-button type="primary" size="small" @click="handleView(row)">
          查看
        </el-button>
        <el-button type="success" size="small" @click="handleEdit(row)">
          编辑
        </el-button>
        <el-dropdown @command="(command) => handleMenuAction(command, row)">
          <el-button type="info" size="small">
            更多<el-icon class="ml-1"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="duties">工作职责</el-dropdown-item>
              <el-dropdown-item command="performance">工作表现</el-dropdown-item>
              <el-dropdown-item command="transfer">职务调动</el-dropdown-item>
              <el-dropdown-item command="retire" divided>离职</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
    </DataTable>

    <!-- 表单对话框 -->
    <FormDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      :fields="formFields"
      :form-data="formData"
      :rules="formRules"
      :loading="formLoading"
      :is-edit="isEdit"
      width="800px"
      @submit="handleSubmit"
      @close="handleDialogClose"
    />

    <!-- 成员详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="成员详情"
      width="900px"
      destroy-on-close
    >
      <MemberDetail
        v-if="detailVisible"
        :member="currentMember"
        @edit="handleEdit"
        @close="detailVisible = false"
      />
    </el-dialog>

    <!-- 工作职责对话框 -->
    <el-dialog
      v-model="dutiesVisible"
      title="工作职责"
      width="800px"
      destroy-on-close
    >
      <WorkDuties
        v-if="dutiesVisible"
        :member="currentMember"
        @close="dutiesVisible = false"
      />
    </el-dialog>

    <!-- 职务调动对话框 -->
    <el-dialog
      v-model="transferVisible"
      title="职务调动"
      width="600px"
      destroy-on-close
    >
      <PositionTransfer
        v-if="transferVisible"
        :member="currentMember"
        @success="handleTransferSuccess"
        @close="transferVisible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  OfficeBuilding,
  UserFilled,
  Star,
  Edit,
  ArrowDown
} from '@element-plus/icons-vue'
import DataTable from '@/components/common/DataTable.vue'
import FormDialog from '@/components/common/FormDialog.vue'
import MemberDetail from './components/MemberDetail.vue'
import WorkDuties from './components/WorkDuties.vue'
import PositionTransfer from './components/PositionTransfer.vue'
import { committeeApi } from '@/api/committee'
import { formatDate } from '@/utils/common'
import { required, phone, idCard, length } from '@/utils/validation'

// 响应式数据
const tableRef = ref()
const loading = ref(false)
const formLoading = ref(false)
const dialogVisible = ref(false)
const detailVisible = ref(false)
const dutiesVisible = ref(false)
const transferVisible = ref(false)
const isEdit = ref(false)
const currentMember = ref({})

// 列表数据
const memberList = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 统计数据
const statistics = reactive({
  totalMembers: 0,
  departments: 0,
  onDuty: 0,
  partyMembers: 0
})

// 组织架构数据
const partyCommittee = ref([])
const villageCommittee = ref([])
const supervisoryCommittee = ref([])
const departments = ref([])

// 搜索条件
const searchParams = reactive({
  keyword: '',
  position: '',
  department: '',
  status: '',
  politicalStatus: ''
})

// 表单数据
const formData = reactive({
  name: '',
  gender: '',
  birthday: '',
  idCard: '',
  phone: '',
  address: '',
  position: '',
  department: '',
  status: '在职',
  appointmentDate: '',
  education: '',
  politicalStatus: '',
  workExperience: '',
  specialties: '',
  remarks: ''
})

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑村委成员' : '新增村委成员'
})

// 表格列定义
const tableColumns = [
  {
    prop: 'avatar',
    label: '头像',
    width: 80,
    slot: 'avatar'
  },
  {
    prop: 'name',
    label: '姓名',
    width: 100,
    sortable: true
  },
  {
    prop: 'position',
    label: '职务',
    width: 120,
    slot: 'position'
  },
  {
    prop: 'department',
    label: '部门',
    width: 120,
    slot: 'department'
  },
  {
    prop: 'phone',
    label: '联系电话',
    width: 130
  },
  {
    prop: 'appointmentDate',
    label: '任职时间',
    width: 120,
    formatter: (row) => formatDate(row.appointmentDate)
  },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    slot: 'status'
  },
  {
    prop: 'politicalStatus',
    label: '政治面貌',
    width: 100,
    slot: 'politicalStatus'
  },
  {
    prop: 'education',
    label: '学历',
    width: 100
  },
  {
    prop: 'workExperience',
    label: '工作经验',
    minWidth: 150,
    showOverflowTooltip: true
  }
]

// 搜索字段定义
const searchFields = [
  {
    prop: 'position',
    label: '职务',
    type: 'select',
    placeholder: '请选择职务',
    options: [
      { label: '村支书', value: '村支书' },
      { label: '村主任', value: '村主任' },
      { label: '副主任', value: '副主任' },
      { label: '委员', value: '委员' },
      { label: '会计', value: '会计' },
      { label: '出纳', value: '出纳' },
      { label: '文书', value: '文书' }
    ]
  },
  {
    prop: 'department',
    label: '部门',
    type: 'select',
    placeholder: '请选择部门',
    options: [
      { label: '党支部', value: '党支部' },
      { label: '村委会', value: '村委会' },
      { label: '监督委员会', value: '监督委员会' },
      { label: '妇联', value: '妇联' },
      { label: '团支部', value: '团支部' }
    ]
  },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '在职', value: '在职' },
      { label: '离职', value: '离职' },
      { label: '调动', value: '调动' }
    ]
  },
  {
    prop: 'politicalStatus',
    label: '政治面貌',
    type: 'select',
    placeholder: '请选择政治面貌',
    options: [
      { label: '党员', value: '党员' },
      { label: '团员', value: '团员' },
      { label: '群众', value: '群众' }
    ]
  }
]

// 表单字段定义
const formFields = [
  {
    prop: 'name',
    label: '姓名',
    type: 'input',
    placeholder: '请输入姓名',
    span: 12,
    required: true
  },
  {
    prop: 'gender',
    label: '性别',
    type: 'radio',
    span: 12,
    required: true,
    options: [
      { label: '男', value: '男' },
      { label: '女', value: '女' }
    ]
  },
  {
    prop: 'birthday',
    label: '出生日期',
    type: 'date',
    placeholder: '请选择出生日期',
    span: 12,
    required: true
  },
  {
    prop: 'idCard',
    label: '身份证号',
    type: 'input',
    placeholder: '请输入身份证号',
    span: 12,
    required: true
  },
  {
    prop: 'phone',
    label: '联系电话',
    type: 'input',
    placeholder: '请输入联系电话',
    span: 12,
    required: true
  },
  {
    prop: 'address',
    label: '住址',
    type: 'input',
    placeholder: '请输入住址',
    span: 12,
    required: true
  },
  {
    prop: 'position',
    label: '职务',
    type: 'select',
    placeholder: '请选择职务',
    span: 12,
    required: true,
    options: [
      { label: '村支书', value: '村支书' },
      { label: '村主任', value: '村主任' },
      { label: '副主任', value: '副主任' },
      { label: '委员', value: '委员' },
      { label: '会计', value: '会计' },
      { label: '出纳', value: '出纳' },
      { label: '文书', value: '文书' }
    ]
  },
  {
    prop: 'department',
    label: '所属部门',
    type: 'select',
    placeholder: '请选择部门',
    span: 12,
    required: true,
    options: [
      { label: '党支部', value: '党支部' },
      { label: '村委会', value: '村委会' },
      { label: '监督委员会', value: '监督委员会' },
      { label: '妇联', value: '妇联' },
      { label: '团支部', value: '团支部' }
    ]
  },
  {
    prop: 'appointmentDate',
    label: '任职时间',
    type: 'date',
    placeholder: '请选择任职时间',
    span: 12,
    required: true
  },
  {
    prop: 'education',
    label: '学历',
    type: 'select',
    placeholder: '请选择学历',
    span: 12,
    options: [
      { label: '小学', value: '小学' },
      { label: '初中', value: '初中' },
      { label: '高中', value: '高中' },
      { label: '大专', value: '大专' },
      { label: '本科', value: '本科' },
      { label: '研究生', value: '研究生' }
    ]
  },
  {
    prop: 'politicalStatus',
    label: '政治面貌',
    type: 'select',
    placeholder: '请选择政治面貌',
    span: 12,
    required: true,
    options: [
      { label: '党员', value: '党员' },
      { label: '团员', value: '团员' },
      { label: '群众', value: '群众' }
    ]
  },
  {
    prop: 'workExperience',
    label: '工作经验',
    type: 'textarea',
    placeholder: '请输入工作经验',
    span: 24,
    rows: 3
  },
  {
    prop: 'specialties',
    label: '专业特长',
    type: 'textarea',
    placeholder: '请输入专业特长',
    span: 24,
    rows: 2
  },
  {
    prop: 'remarks',
    label: '备注',
    type: 'textarea',
    placeholder: '请输入备注信息',
    span: 24,
    rows: 2
  }
]

// 表单验证规则
const formRules = {
  name: required('请输入姓名'),
  gender: required('请选择性别'),
  birthday: required('请选择出生日期'),
  idCard: idCard(),
  phone: phone(),
  address: required('请输入住址'),
  position: required('请选择职务'),
  department: required('请选择部门'),
  appointmentDate: required('请选择任职时间'),
  politicalStatus: required('请选择政治面貌')
}

// 工具方法
const getPositionTag = (position) => {
  const tagMap = {
    '村支书': 'danger',
    '村主任': 'success',
    '副主任': 'warning',
    '委员': 'info',
    '会计': 'primary',
    '出纳': 'primary',
    '文书': ''
  }
  return tagMap[position] || ''
}

// 数据加载方法
const loadMemberList = async () => {
  try {
    loading.value = true

    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...searchParams
    }

    const response = await committeeApi.getMembers(params)

    memberList.value = response.data
    pagination.total = response.total

    // 更新统计数据
    updateStatistics()
  } catch (error) {
    ElMessage.error('获取成员列表失败')
  } finally {
    loading.value = false
  }
}

const loadStatistics = async () => {
  try {
    const response = await committeeApi.getStatistics()
    Object.assign(statistics, response)
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

const loadOrganization = async () => {
  try {
    const response = await committeeApi.getOrganization()

    partyCommittee.value = response.partyCommittee || []
    villageCommittee.value = response.villageCommittee || []
    supervisoryCommittee.value = response.supervisoryCommittee || []
    departments.value = response.departments || []
  } catch (error) {
    console.error('获取组织架构失败:', error)

    // 使用模拟数据
    partyCommittee.value = [
      { id: 1, name: '张书记', position: '书记' },
      { id: 2, name: '李副书记', position: '副书记' }
    ]

    villageCommittee.value = [
      { id: 3, name: '王主任', position: '主任' },
      { id: 4, name: '刘副主任', position: '副主任' },
      { id: 5, name: '陈委员', position: '委员' }
    ]

    supervisoryCommittee.value = [
      { id: 6, name: '赵主任', position: '主任' },
      { id: 7, name: '钱委员', position: '委员' }
    ]

    departments.value = [
      {
        id: 1,
        name: '妇联',
        members: [
          { id: 8, name: '孙主任' },
          { id: 9, name: '周委员' }
        ]
      },
      {
        id: 2,
        name: '团支部',
        members: [
          { id: 10, name: '吴书记' },
          { id: 11, name: '郑委员' }
        ]
      }
    ]
  }
}

const updateStatistics = () => {
  statistics.totalMembers = memberList.value.length
  statistics.onDuty = memberList.value.filter(m => m.status === '在职').length
  statistics.partyMembers = memberList.value.filter(m => m.politicalStatus === '党员').length

  // 计算部门数量
  const depts = new Set(memberList.value.map(m => m.department))
  statistics.departments = depts.size
}

// 事件处理方法
const handleSearch = (params) => {
  if (typeof params === 'string') {
    searchParams.keyword = params
  } else {
    Object.assign(searchParams, params)
  }
  pagination.page = 1
  loadMemberList()
}

const handleReset = () => {
  Object.keys(searchParams).forEach(key => {
    searchParams[key] = ''
  })
  pagination.page = 1
  loadMemberList()
}

const handleAdd = () => {
  isEdit.value = false
  Object.keys(formData).forEach(key => {
    formData[key] = ''
  })
  formData.status = '在职'
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

const handleView = (row) => {
  currentMember.value = row
  detailVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除成员 "${row.name}" 的信息吗？`, '删除确认', {
    type: 'warning'
  }).then(async () => {
    try {
      await committeeApi.deleteMember(row.id)
      ElMessage.success('删除成功')
      loadMemberList()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

const handleBatchDelete = (rows) => {
  const ids = rows.map(row => row.id)
  ElMessageBox.confirm(`确定要删除选中的 ${rows.length} 条记录吗？`, '批量删除', {
    type: 'warning'
  }).then(async () => {
    try {
      await committeeApi.batchDeleteMembers(ids)
      ElMessage.success('批量删除成功')
      loadMemberList()
    } catch (error) {
      ElMessage.error('批量删除失败')
    }
  })
}

const handleExport = () => {
  ElMessage.info('导出功能开发中...')
}

const handleRefresh = () => {
  loadMemberList()
  loadOrganization()
}

const handlePageChange = ({ page, size }) => {
  pagination.page = page
  pagination.pageSize = size
  loadMemberList()
}

const handleSubmit = async (data) => {
  try {
    formLoading.value = true

    if (isEdit.value) {
      await committeeApi.updateMember(data.id, data)
      ElMessage.success('更新成功')
    } else {
      await committeeApi.createMember(data)
      ElMessage.success('新增成功')
    }

    dialogVisible.value = false
    loadMemberList()
    loadOrganization()
  } catch (error) {
    ElMessage.error(isEdit.value ? '更新失败' : '新增失败')
  } finally {
    formLoading.value = false
  }
}

const handleDialogClose = () => {
  dialogVisible.value = false
}

const handleMenuAction = (command, row) => {
  currentMember.value = row

  switch (command) {
    case 'duties':
      dutiesVisible.value = true
      break
    case 'performance':
      ElMessage.info('工作表现功能开发中...')
      break
    case 'transfer':
      transferVisible.value = true
      break
    case 'retire':
      handleRetire(row)
      break
  }
}

const handleRetire = (row) => {
  ElMessageBox.confirm(`确定要为 "${row.name}" 办理离职手续吗？`, '离职确认', {
    type: 'warning'
  }).then(async () => {
    try {
      await committeeApi.retireMember(row.id)
      ElMessage.success('离职手续办理成功')
      loadMemberList()
    } catch (error) {
      ElMessage.error('离职手续办理失败')
    }
  })
}

const handleTransferSuccess = () => {
  transferVisible.value = false
  loadMemberList()
  loadOrganization()
}

const editOrganization = () => {
  ElMessage.info('编辑组织架构功能开发中...')
}

// 生命周期
onMounted(() => {
  loadMemberList()
  loadStatistics()
  loadOrganization()
})
</script>

<style scoped>
.committee-management {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-content {
  position: relative;
  z-index: 2;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  line-height: 1;
}

.stat-label {
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}

.stat-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 2.5rem;
  opacity: 0.3;
  z-index: 1;
}

.organization-chart {
  padding: 20px;
}

.org-level {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 40px;
}

.org-node {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  min-width: 200px;
  text-align: center;
  border: 2px solid #e9ecef;
  position: relative;
}

.org-node.primary {
  border-color: #409eff;
  background: #ecf5ff;
}

.org-node.success {
  border-color: #67c23a;
  background: #f0f9ff;
}

.org-node.warning {
  border-color: #e6a23c;
  background: #fdf6ec;
}

.org-node.info {
  border-color: #909399;
  background: #f4f4f5;
}

.node-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #333;
}

.node-members {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.member-tag {
  background: rgba(0, 0, 0, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

/* 连接线 */
.org-level:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -20px;
  width: 2px;
  height: 20px;
  background: #ddd;
  transform: translateX(-50%);
}
</style>