<template>
  <div class="party-members-container">
    <!-- 搜索和操作栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="姓名">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入姓名"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="党龄">
          <el-select v-model="searchForm.partyAge" placeholder="请选择党龄" clearable>
            <el-option label="1-5年" value="1-5" />
            <el-option label="6-10年" value="6-10" />
            <el-option label="11-20年" value="11-20" />
            <el-option label="20年以上" value="20+" />
          </el-select>
        </el-form-item>
        <el-form-item label="党员类型">
          <el-select v-model="searchForm.memberType" placeholder="请选择类型" clearable>
            <el-option label="正式党员" value="formal" />
            <el-option label="预备党员" value="probationary" />
            <el-option label="流动党员" value="floating" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <div class="action-bar">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加党员
        </el-button>
        <el-button @click="showStatsDialog = true">
          <el-icon><DataAnalysis /></el-icon>
          党员统计
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </el-card>

    <!-- 党员列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="committeeStore.loading"
        :data="filteredMembers"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="gender" label="性别" width="60" />
        <el-table-column prop="birthDate" label="出生年月" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.birthDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="joinPartyDate" label="入党时间" width="120" sortable>
          <template #default="scope">
            {{ formatDate(scope.row.joinPartyDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="partyAge" label="党龄" width="80" sortable>
          <template #default="scope">
            {{ calculatePartyAge(scope.row.joinPartyDate) }}年
          </template>
        </el-table-column>
        <el-table-column prop="memberType" label="党员类型" width="100">
          <template #default="scope">
            <el-tag :type="getMemberTypeTagType(scope.row.memberType)">
              {{ getMemberTypeText(scope.row.memberType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="position" label="党内职务" width="120" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="education" label="学历" width="100" />
        <el-table-column prop="activity" label="参与活动" width="100">
          <template #default="scope">
            <el-progress
              :percentage="scope.row.activity || 0"
              :color="getActivityColor(scope.row.activity)"
              :stroke-width="6"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleView(scope.row)">
              查看
            </el-button>
            <el-button type="warning" size="small" @click="handleEdit(scope.row)">
              编辑
            </el-button>
            <el-dropdown @command="(command) => handleAction(command, scope.row)">
              <el-button type="info" size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="activities">活动记录</el-dropdown-item>
                  <el-dropdown-item command="donations">党费缴纳</el-dropdown-item>
                  <el-dropdown-item command="awards">表彰奖励</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑党员对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="isEdit ? '编辑党员信息' : '添加党员'"
      width="700px"
      :fullscreen="isMobile"
    >
      <el-form
        ref="memberFormRef"
        :model="memberForm"
        :rules="memberRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="memberForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="memberForm.gender">
                <el-radio label="男">男</el-radio>
                <el-radio label="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出生年月" prop="birthDate">
              <el-date-picker
                v-model="memberForm.birthDate"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证号" prop="idCard">
              <el-input v-model="memberForm.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入党时间" prop="joinPartyDate">
              <el-date-picker
                v-model="memberForm.joinPartyDate"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="党员类型" prop="memberType">
              <el-select v-model="memberForm.memberType" placeholder="请选择类型">
                <el-option label="正式党员" value="formal" />
                <el-option label="预备党员" value="probationary" />
                <el-option label="流动党员" value="floating" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="党内职务" prop="position">
              <el-select v-model="memberForm.position" placeholder="请选择职务" allow-clear>
                <el-option label="支部书记" value="secretary" />
                <el-option label="支部副书记" value="deputy_secretary" />
                <el-option label="组织委员" value="organization" />
                <el-option label="宣传委员" value="propaganda" />
                <el-option label="纪检委员" value="discipline" />
                <el-option label="普通党员" value="member" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="memberForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="学历" prop="education">
              <el-select v-model="memberForm.education" placeholder="请选择学历">
                <el-option label="初中" value="junior" />
                <el-option label="高中" value="high" />
                <el-option label="大专" value="college" />
                <el-option label="本科" value="bachelor" />
                <el-option label="研究生" value="master" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工作单位" prop="workUnit">
              <el-input v-model="memberForm.workUnit" placeholder="请输入工作单位" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="家庭住址" prop="address">
          <el-input
            v-model="memberForm.address"
            type="textarea"
            :rows="2"
            placeholder="请输入家庭住址"
          />
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="memberForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '更新' : '添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 党员详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="党员详情"
      width="800px"
      :fullscreen="isMobile"
    >
      <div class="detail-content" v-if="currentMember">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ currentMember.name }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ currentMember.gender }}</el-descriptions-item>
          <el-descriptions-item label="出生年月">{{ formatDate(currentMember.birthDate) }}</el-descriptions-item>
          <el-descriptions-item label="身份证号">{{ maskIdCard(currentMember.idCard) }}</el-descriptions-item>
          <el-descriptions-item label="入党时间">{{ formatDate(currentMember.joinPartyDate) }}</el-descriptions-item>
          <el-descriptions-item label="党龄">{{ calculatePartyAge(currentMember.joinPartyDate) }}年</el-descriptions-item>
          <el-descriptions-item label="党员类型">
            <el-tag :type="getMemberTypeTagType(currentMember.memberType)">
              {{ getMemberTypeText(currentMember.memberType) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="党内职务">{{ currentMember.position || '普通党员' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentMember.phone }}</el-descriptions-item>
          <el-descriptions-item label="学历">{{ getEducationText(currentMember.education) }}</el-descriptions-item>
          <el-descriptions-item label="工作单位">{{ currentMember.workUnit || '无' }}</el-descriptions-item>
          <el-descriptions-item label="家庭住址" :span="2">{{ currentMember.address }}</el-descriptions-item>
          <el-descriptions-item label="活动参与度" :span="2">
            <el-progress
              :percentage="currentMember.activity || 0"
              :color="getActivityColor(currentMember.activity)"
            />
          </el-descriptions-item>
        </el-descriptions>

        <!-- 党员活动记录 -->
        <div class="activity-records" v-if="currentMember.activities?.length">
          <h4>近期活动记录</h4>
          <el-timeline>
            <el-timeline-item
              v-for="activity in currentMember.activities"
              :key="activity.id"
              :timestamp="formatDate(activity.date)"
              :type="activity.type"
            >
              {{ activity.title }}
            </el-timeline-item>
          </el-timeline>
        </div>

        <div class="detail-actions">
          <el-button type="primary" @click="handleEdit(currentMember)">编辑信息</el-button>
          <el-button type="success" @click="handleAddActivity">添加活动记录</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 党员统计对话框 -->
    <el-dialog
      v-model="showStatsDialog"
      title="党员统计分析"
      width="900px"
      :fullscreen="isMobile"
    >
      <div class="stats-content">
        <el-row :gutter="20">
          <el-col :span="6" v-for="stat in partyStats" :key="stat.label">
            <div class="stat-card">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </el-col>
        </el-row>

        <!-- 党员年龄分布图表 -->
        <div class="chart-container" ref="ageChartRef" style="height: 300px; margin-top: 20px;"></div>

        <!-- 党员学历分布图表 -->
        <div class="chart-container" ref="educationChartRef" style="height: 300px; margin-top: 20px;"></div>
      </div>
    </el-dialog>

    <!-- 活动记录对话框 -->
    <el-dialog
      v-model="showActivityDialog"
      title="添加活动记录"
      width="500px"
      :fullscreen="isMobile"
    >
      <el-form ref="activityFormRef" :model="activityForm" :rules="activityRules" label-width="100px">
        <el-form-item label="活动名称" prop="title">
          <el-input v-model="activityForm.title" placeholder="请输入活动名称" />
        </el-form-item>
        <el-form-item label="活动日期" prop="date">
          <el-date-picker
            v-model="activityForm.date"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="活动类型" prop="type">
          <el-select v-model="activityForm.type" placeholder="请选择类型">
            <el-option label="党组织活动" value="primary" />
            <el-option label="志愿服务" value="success" />
            <el-option label="教育培训" value="warning" />
            <el-option label="其他活动" value="info" />
          </el-select>
        </el-form-item>
        <el-form-item label="活动描述" prop="description">
          <el-input
            v-model="activityForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入活动描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showActivityDialog = false">取消</el-button>
        <el-button type="primary" @click="handleActivitySubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useCommitteeStore } from '@/stores/villageCommittee/committeeStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Plus,
  Download,
  ArrowDown,
  DataAnalysis
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

const committeeStore = useCommitteeStore()

// 响应式数据
const searchForm = ref({
  name: '',
  partyAge: '',
  memberType: ''
})

const showAddDialog = ref(false)
const showDetailDialog = ref(false)
const showStatsDialog = ref(false)
const showActivityDialog = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const isMobile = ref(false)

const memberFormRef = ref()
const activityFormRef = ref()
const ageChartRef = ref()
const educationChartRef = ref()

const currentMember = ref(null)
const selectedMembers = ref([])

const pagination = ref({
  page: 1,
  size: 20,
  total: 0
})

const memberForm = ref({
  name: '',
  gender: '男',
  birthDate: '',
  idCard: '',
  joinPartyDate: '',
  memberType: 'formal',
  position: '',
  phone: '',
  education: '',
  workUnit: '',
  address: '',
  remark: ''
})

const activityForm = ref({
  title: '',
  date: '',
  type: '',
  description: ''
})

// 党员统计数据
const partyStats = ref([
  { label: '党员总数', value: '156' },
  { label: '正式党员', value: '142' },
  { label: '预备党员', value: '8' },
  { label: '流动党员', value: '6' }
])

// 表单验证规则
const memberRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 10, message: '长度在 2 到 10 个字符', trigger: 'blur' }
  ],
  birthDate: [
    { required: true, message: '请选择出生日期', trigger: 'change' }
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '请输入正确的身份证号', trigger: 'blur' }
  ],
  joinPartyDate: [
    { required: true, message: '请选择入党时间', trigger: 'change' }
  ],
  memberType: [
    { required: true, message: '请选择党员类型', trigger: 'change' }
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

const activityRules = {
  title: [
    { required: true, message: '请输入活动名称', trigger: 'blur' }
  ],
  date: [
    { required: true, message: '请选择活动日期', trigger: 'change' }
  ],
  type: [
    { required: true, message: '请选择活动类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入活动描述', trigger: 'blur' }
  ]
}

// 计算属性
const filteredMembers = computed(() => {
  let result = committeeStore.partyMembers

  if (searchForm.value.name) {
    result = result.filter(m => m.name.includes(searchForm.value.name))
  }

  if (searchForm.value.partyAge) {
    result = result.filter(m => {
      const age = calculatePartyAge(m.joinPartyDate)
      if (searchForm.value.partyAge === '1-5') return age >= 1 && age <= 5
      if (searchForm.value.partyAge === '6-10') return age >= 6 && age <= 10
      if (searchForm.value.partyAge === '11-20') return age >= 11 && age <= 20
      if (searchForm.value.partyAge === '20+') return age > 20
      return true
    })
  }

  if (searchForm.value.memberType) {
    result = result.filter(m => m.memberType === searchForm.value.memberType)
  }

  pagination.value.total = result.length
  const start = (pagination.value.page - 1) * pagination.value.size
  const end = start + pagination.value.size
  return result.slice(start, end)
})

// 方法
const handleSearch = () => {
  pagination.value.page = 1
}

const handleReset = () => {
  searchForm.value = {
    name: '',
    partyAge: '',
    memberType: ''
  }
  pagination.value.page = 1
}

const handleSelectionChange = (selection) => {
  selectedMembers.value = selection
}

const handleSizeChange = (size) => {
  pagination.value.size = size
  pagination.value.page = 1
}

const handleCurrentChange = (page) => {
  pagination.value.page = page
}

const handleView = (row) => {
  currentMember.value = {
    ...row,
    activities: [
      { id: 1, title: '党组织生活会', date: '2024-12-10', type: 'primary' },
      { id: 2, title: '志愿服务活动', date: '2024-12-05', type: 'success' },
      { id: 3, title: '主题党日活动', date: '2024-11-25', type: 'warning' }
    ]
  }
  showDetailDialog.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  memberForm.value = { ...row }
  showAddDialog.value = true
  showDetailDialog.value = false
}

const handleAction = (command, row) => {
  currentMember.value = row

  switch (command) {
    case 'activities':
      handleViewActivities(row)
      break
    case 'donations':
      handleDonations(row)
      break
    case 'awards':
      handleAwards(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

const handleViewActivities = (row) => {
  ElMessage.info(`查看 ${row.name} 的活动记录`)
}

const handleDonations = (row) => {
  ElMessage.info(`查看 ${row.name} 的党费缴纳记录`)
}

const handleAwards = (row) => {
  ElMessage.info(`查看 ${row.name} 的表彰奖励`)
}

const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除党员 ${row.name} 的信息吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await committeeStore.deletePartyMember(row.id)
      ElMessage.success('删除成功')
      await committeeStore.fetchPartyMembers()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

const handleSubmit = async () => {
  if (!memberFormRef.value) return

  await memberFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value) {
          await committeeStore.updatePartyMember(currentMember.value.id, memberForm.value)
          ElMessage.success('更新成功')
        } else {
          await committeeStore.createPartyMember(memberForm.value)
          ElMessage.success('添加成功')
        }
        showAddDialog.value = false
        await committeeStore.fetchPartyMembers()
      } catch (error) {
        ElMessage.error('操作失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleAddActivity = () => {
  activityForm.value = {
    title: '',
    date: '',
    type: '',
    description: ''
  }
  showActivityDialog.value = true
  showDetailDialog.value = false
}

const handleActivitySubmit = async () => {
  if (!activityFormRef.value) return

  await activityFormRef.value.validate(async (valid) => {
    if (valid) {
      ElMessage.success('活动记录已添加')
      showActivityDialog.value = false
    }
  })
}

const handleExport = async () => {
  try {
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

const initCharts = async () => {
  await nextTick()

  // 年龄分布图表
  if (ageChartRef.value) {
    const ageChart = echarts.init(ageChartRef.value)
    const ageOption = {
      title: {
        text: '党员年龄分布'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: ['20-30岁', '31-40岁', '41-50岁', '51-60岁', '60岁以上']
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        data: [12, 45, 68, 25, 6],
        type: 'bar',
        itemStyle: {
          color: '#409eff'
        }
      }]
    }
    ageChart.setOption(ageOption)
  }

  // 学历分布图表
  if (educationChartRef.value) {
    const educationChart = echarts.init(educationChartRef.value)
    const educationOption = {
      title: {
        text: '党员学历分布'
      },
      tooltip: {
        trigger: 'item'
      },
      series: [{
        type: 'pie',
        radius: '60%',
        data: [
          { value: 25, name: '初中' },
          { value: 68, name: '高中' },
          { value: 42, name: '大专' },
          { value: 18, name: '本科' },
          { value: 3, name: '研究生' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    }
    educationChart.setOption(educationOption)
  }
}

// 辅助函数
const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD') : ''
}

const calculatePartyAge = (joinDate) => {
  if (!joinDate) return 0
  return dayjs().diff(dayjs(joinDate), 'year')
}

const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

const getMemberTypeTagType = (type) => {
  const typeMap = {
    formal: 'success',
    probationary: 'warning',
    floating: 'info'
  }
  return typeMap[type] || ''
}

const getMemberTypeText = (type) => {
  const textMap = {
    formal: '正式党员',
    probationary: '预备党员',
    floating: '流动党员'
  }
  return textMap[type] || type
}

const getEducationText = (education) => {
  const textMap = {
    junior: '初中',
    high: '高中',
    college: '大专',
    bachelor: '本科',
    master: '研究生'
  }
  return textMap[education] || ''
}

const getActivityColor = (percentage) => {
  if (percentage >= 80) return '#67c23a'
  if (percentage >= 60) return '#e6a23c'
  return '#f56c6c'
}

// 生命周期
onMounted(async () => {
  isMobile.value = window.innerWidth < 768

  try {
    await committeeStore.fetchPartyMembers()
  } catch (error) {
    console.error('加载数据失败:', error)
  }

  // 监听统计对话框打开事件，初始化图表
  if (showStatsDialog.value) {
    initCharts()
  }
})
</script>

<style lang="scss" scoped>
.party-members-container {
  padding: 20px;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

.search-card {
  margin-bottom: 20px;

  .search-form {
    margin-bottom: 20px;
  }

  .action-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
}

.table-card {
  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}

.detail-content {
  .activity-records {
    margin-top: 20px;

    h4 {
      margin-bottom: 15px;
      color: #303133;
    }
  }

  .detail-actions {
    margin-top: 20px;
    text-align: center;

    .el-button {
      margin: 0 10px;
    }
  }
}

.stats-content {
  .stat-card {
    background: #f5f7fa;
    padding: 20px;
    text-align: center;
    border-radius: 4px;

    .stat-value {
      font-size: 32px;
      font-weight: 600;
      color: #409eff;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 14px;
      color: #909399;
    }
  }

  .chart-container {
    background: #fff;
    border-radius: 4px;
    padding: 20px;
    border: 1px solid #ebeef5;
  }
}

// 响应式调整
@media (max-width: 768px) {
  .search-form {
    .el-form-item {
      margin-right: 0;
      width: 100%;

      .el-input,
      .el-select {
        width: 100%;
      }
    }
  }

  .action-bar {
    .el-button {
      flex: 1;
      margin: 5px 0;
    }
  }

  .stats-content {
    .el-col {
      margin-bottom: 10px;
    }
  }
}
</style>