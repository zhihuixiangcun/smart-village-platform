<template>
  <div class="resident-management">
    <!-- 页面标题 -->
    <div class="page-header mb-6">
      <h1 class="text-2xl font-bold text-gray-800">村民档案管理</h1>
      <p class="text-gray-600 mt-2">管理村民基本信息、家庭状况、健康档案等</p>
    </div>

    <!-- 数据统计卡片 -->
    <div class="stats-cards mb-6">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number text-blue-600">{{ statistics.total }}</div>
              <div class="stat-label">总人数</div>
            </div>
            <el-icon class="stat-icon text-blue-400"><User /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number text-green-600">{{ statistics.households }}</div>
              <div class="stat-label">家庭数</div>
            </div>
            <el-icon class="stat-icon text-green-400"><House /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number text-orange-600">{{ statistics.elderly }}</div>
              <div class="stat-label">老年人</div>
            </div>
            <el-icon class="stat-icon text-orange-400"><User /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number text-purple-600">{{ statistics.children }}</div>
              <div class="stat-label">儿童</div>
            </div>
            <el-icon class="stat-icon text-purple-400"><User /></el-icon>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 数据表格 -->
    <DataTable
      ref="tableRef"
      :data="residentList"
      :columns="tableColumns"
      :loading="loading"
      :total="pagination.total"
      :page-size="pagination.pageSize"
      :show-advanced-search="true"
      :advanced-search-fields="searchFields"
      search-placeholder="搜索姓名、身份证号、手机号"
      add-text="新增村民"
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

      <template #gender="{ row }">
        <el-tag :type="row.gender === '男' ? 'primary' : 'danger'" size="small">
          {{ row.gender }}
        </el-tag>
      </template>

      <template #age="{ row }">
        <span :class="{
          'text-red-500': row.age >= 60,
          'text-blue-500': row.age <= 18,
          'text-gray-700': row.age > 18 && row.age < 60
        }">
          {{ row.age }}岁
        </span>
      </template>

      <template #householdType="{ row }">
        <el-tag :type="getHouseholdTypeTag(row.householdType)" size="small">
          {{ row.householdType }}
        </el-tag>
      </template>

      <template #healthStatus="{ row }">
        <el-tag :type="getHealthStatusTag(row.healthStatus)" size="small">
          {{ row.healthStatus }}
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
              <el-dropdown-item command="family">家庭信息</el-dropdown-item>
              <el-dropdown-item command="health">健康档案</el-dropdown-item>
              <el-dropdown-item command="history">变更记录</el-dropdown-item>
              <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
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

    <!-- 村民详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="村民详情"
      width="900px"
      destroy-on-close
    >
      <ResidentDetail
        v-if="detailVisible"
        :resident="currentResident"
        @edit="handleEdit"
        @close="detailVisible = false"
      />
    </el-dialog>

    <!-- 家庭信息对话框 -->
    <el-dialog
      v-model="familyVisible"
      title="家庭信息"
      width="1000px"
      destroy-on-close
    >
      <FamilyInfo
        v-if="familyVisible"
        :resident="currentResident"
        @close="familyVisible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, House, ArrowDown } from '@element-plus/icons-vue'
import DataTable from '@/components/common/DataTable.vue'
import FormDialog from '@/components/common/FormDialog.vue'
import ResidentDetail from './components/ResidentDetail.vue'
import FamilyInfo from './components/FamilyInfo.vue'
import { residentApi } from '@/api/resident'
import { formatDate, validateIdCard, validatePhone } from '@/utils/common'
import { required, phone, idCard, length } from '@/utils/validation'

// 响应式数据
const tableRef = ref()
const loading = ref(false)
const formLoading = ref(false)
const dialogVisible = ref(false)
const detailVisible = ref(false)
const familyVisible = ref(false)
const isEdit = ref(false)
const currentResident = ref({})

// 列表数据
const residentList = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 统计数据
const statistics = reactive({
  total: 0,
  households: 0,
  elderly: 0,
  children: 0
})

// 搜索条件
const searchParams = reactive({
  keyword: '',
  gender: '',
  householdType: '',
  healthStatus: '',
  ageRange: []
})

// 表单数据
const formData = reactive({
  name: '',
  gender: '',
  birthday: '',
  idCard: '',
  phone: '',
  address: '',
  householdType: '',
  healthStatus: '',
  education: '',
  occupation: '',
  maritalStatus: '',
  politicalStatus: '',
  remarks: ''
})

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑村民信息' : '新增村民'
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
    prop: 'gender',
    label: '性别',
    width: 80,
    slot: 'gender'
  },
  {
    prop: 'age',
    label: '年龄',
    width: 80,
    slot: 'age',
    sortable: true
  },
  {
    prop: 'phone',
    label: '手机号',
    width: 130
  },
  {
    prop: 'idCard',
    label: '身份证号',
    width: 180,
    formatter: (row) => {
      const { formatted } = validateIdCard(row.idCard)
      return formatted
    }
  },
  {
    prop: 'address',
    label: '住址',
    minWidth: 200,
    showOverflowTooltip: true
  },
  {
    prop: 'householdType',
    label: '家庭类型',
    width: 100,
    slot: 'householdType'
  },
  {
    prop: 'healthStatus',
    label: '健康状态',
    width: 100,
    slot: 'healthStatus'
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 120,
    formatter: (row) => formatDate(row.createdAt)
  }
]

// 搜索字段定义
const searchFields = [
  {
    prop: 'gender',
    label: '性别',
    type: 'select',
    placeholder: '请选择性别',
    options: [
      { label: '男', value: '男' },
      { label: '女', value: '女' }
    ]
  },
  {
    prop: 'householdType',
    label: '家庭类型',
    type: 'select',
    placeholder: '请选择家庭类型',
    options: [
      { label: '普通户', value: '普通户' },
      { label: '低保户', value: '低保户' },
      { label: '五保户', value: '五保户' },
      { label: '残疾户', value: '残疾户' },
      { label: '贫困户', value: '贫困户' }
    ]
  },
  {
    prop: 'healthStatus',
    label: '健康状态',
    type: 'select',
    placeholder: '请选择健康状态',
    options: [
      { label: '健康', value: '健康' },
      { label: '一般', value: '一般' },
      { label: '慢性病', value: '慢性病' },
      { label: '残疾', value: '残疾' },
      { label: '其他', value: '其他' }
    ]
  },
  {
    prop: 'ageRange',
    label: '年龄范围',
    type: 'select',
    placeholder: '请选择年龄范围',
    options: [
      { label: '儿童 (0-18)', value: '0-18' },
      { label: '青年 (19-35)', value: '19-35' },
      { label: '中年 (36-59)', value: '36-59' },
      { label: '老年 (60+)', value: '60+' }
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
    label: '手机号',
    type: 'input',
    placeholder: '请输入手机号',
    span: 12,
    required: true
  },
  {
    prop: 'address',
    label: '住址',
    type: 'input',
    placeholder: '请输入详细住址',
    span: 12,
    required: true
  },
  {
    prop: 'householdType',
    label: '家庭类型',
    type: 'select',
    placeholder: '请选择家庭类型',
    span: 12,
    required: true,
    options: [
      { label: '普通户', value: '普通户' },
      { label: '低保户', value: '低保户' },
      { label: '五保户', value: '五保户' },
      { label: '残疾户', value: '残疾户' },
      { label: '贫困户', value: '贫困户' }
    ]
  },
  {
    prop: 'healthStatus',
    label: '健康状态',
    type: 'select',
    placeholder: '请选择健康状态',
    span: 12,
    required: true,
    options: [
      { label: '健康', value: '健康' },
      { label: '一般', value: '一般' },
      { label: '慢性病', value: '慢性病' },
      { label: '残疾', value: '残疾' },
      { label: '其他', value: '其他' }
    ]
  },
  {
    prop: 'education',
    label: '文化程度',
    type: 'select',
    placeholder: '请选择文化程度',
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
    prop: 'occupation',
    label: '职业',
    type: 'input',
    placeholder: '请输入职业',
    span: 12
  },
  {
    prop: 'maritalStatus',
    label: '婚姻状况',
    type: 'select',
    placeholder: '请选择婚姻状况',
    span: 12,
    options: [
      { label: '未婚', value: '未婚' },
      { label: '已婚', value: '已婚' },
      { label: '离异', value: '离异' },
      { label: '丧偶', value: '丧偶' }
    ]
  },
  {
    prop: 'politicalStatus',
    label: '政治面貌',
    type: 'select',
    placeholder: '请选择政治面貌',
    span: 12,
    options: [
      { label: '群众', value: '群众' },
      { label: '团员', value: '团员' },
      { label: '党员', value: '党员' },
      { label: '其他', value: '其他' }
    ]
  },
  {
    prop: 'remarks',
    label: '备注',
    type: 'textarea',
    placeholder: '请输入备注信息',
    span: 24,
    rows: 3
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
  householdType: required('请选择家庭类型'),
  healthStatus: required('请选择健康状态')
}

// 工具方法
const getHouseholdTypeTag = (type) => {
  const tagMap = {
    '普通户': '',
    '低保户': 'warning',
    '五保户': 'danger',
    '残疾户': 'info',
    '贫困户': 'danger'
  }
  return tagMap[type] || ''
}

const getHealthStatusTag = (status) => {
  const tagMap = {
    '健康': 'success',
    '一般': '',
    '慢性病': 'warning',
    '残疾': 'danger',
    '其他': 'info'
  }
  return tagMap[status] || ''
}

// 数据加载方法
const loadResidentList = async () => {
  try {
    loading.value = true

    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...searchParams
    }

    const response = await residentApi.getList(params)

    residentList.value = response.data.map(item => ({
      ...item,
      age: calculateAge(item.birthday)
    }))

    pagination.total = response.total

    // 更新统计数据
    updateStatistics()
  } catch (error) {
    ElMessage.error('获取村民列表失败')
  } finally {
    loading.value = false
  }
}

const loadStatistics = async () => {
  try {
    const response = await residentApi.getStatistics()
    Object.assign(statistics, response)
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

const updateStatistics = () => {
  statistics.total = residentList.value.length
  statistics.elderly = residentList.value.filter(r => r.age >= 60).length
  statistics.children = residentList.value.filter(r => r.age <= 18).length

  // 计算家庭数（简化计算）
  const addresses = new Set(residentList.value.map(r => r.address))
  statistics.households = addresses.size
}

const calculateAge = (birthday) => {
  if (!birthday) return 0
  const birth = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// 事件处理方法
const handleSearch = (params) => {
  if (typeof params === 'string') {
    searchParams.keyword = params
  } else {
    Object.assign(searchParams, params)
  }
  pagination.page = 1
  loadResidentList()
}

const handleReset = () => {
  Object.keys(searchParams).forEach(key => {
    searchParams[key] = ''
  })
  pagination.page = 1
  loadResidentList()
}

const handleAdd = () => {
  isEdit.value = false
  Object.keys(formData).forEach(key => {
    formData[key] = ''
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

const handleView = (row) => {
  currentResident.value = row
  detailVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除村民 "${row.name}" 的信息吗？`, '删除确认', {
    type: 'warning'
  }).then(async () => {
    try {
      await residentApi.delete(row.id)
      ElMessage.success('删除成功')
      loadResidentList()
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
      await residentApi.batchDelete(ids)
      ElMessage.success('批量删除成功')
      loadResidentList()
    } catch (error) {
      ElMessage.error('批量删除失败')
    }
  })
}

const handleExport = () => {
  // 导出功能
  ElMessage.info('导出功能开发中...')
}

const handleRefresh = () => {
  loadResidentList()
}

const handlePageChange = ({ page, size }) => {
  pagination.page = page
  pagination.pageSize = size
  loadResidentList()
}

const handleSubmit = async (data) => {
  try {
    formLoading.value = true

    if (isEdit.value) {
      await residentApi.update(data.id, data)
      ElMessage.success('更新成功')
    } else {
      await residentApi.create(data)
      ElMessage.success('新增成功')
    }

    dialogVisible.value = false
    loadResidentList()
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
  currentResident.value = row

  switch (command) {
    case 'family':
      familyVisible.value = true
      break
    case 'health':
      // 健康档案功能
      ElMessage.info('健康档案功能开发中...')
      break
    case 'history':
      // 变更记录功能
      ElMessage.info('变更记录功能开发中...')
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

// 生命周期
onMounted(() => {
  loadResidentList()
  loadStatistics()
})
</script>

<style scoped>
.resident-management {
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

.stats-cards .stat-card {
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
</style>