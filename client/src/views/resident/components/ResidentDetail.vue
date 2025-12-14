<template>
  <div class="resident-detail">
    <!-- 基本信息卡片 -->
    <el-card class="mb-4">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold">基本信息</span>
          <el-button type="primary" size="small" @click="$emit('edit', resident)">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
        </div>
      </template>

      <div class="basic-info">
        <el-row :gutter="24">
          <el-col :span="6">
            <div class="text-center">
              <el-avatar :size="120" :src="resident.avatar">
                {{ resident.name?.charAt(0) }}
              </el-avatar>
              <div class="mt-4">
                <h3 class="text-xl font-bold">{{ resident.name }}</h3>
                <p class="text-gray-500 mt-1">{{ resident.gender }} · {{ calculateAge(resident.birthday) }}岁</p>
              </div>
            </div>
          </el-col>
          <el-col :span="18">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="身份证号">
                {{ formatIdCard(resident.idCard) }}
              </el-descriptions-item>
              <el-descriptions-item label="手机号">
                {{ formatPhone(resident.phone) }}
              </el-descriptions-item>
              <el-descriptions-item label="出生日期">
                {{ formatDate(resident.birthday) }}
              </el-descriptions-item>
              <el-descriptions-item label="年龄">
                {{ calculateAge(resident.birthday) }}岁
              </el-descriptions-item>
              <el-descriptions-item label="住址" :span="2">
                {{ resident.address }}
              </el-descriptions-item>
              <el-descriptions-item label="家庭类型">
                <el-tag :type="getHouseholdTypeTag(resident.householdType)" size="small">
                  {{ resident.householdType }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="健康状态">
                <el-tag :type="getHealthStatusTag(resident.healthStatus)" size="small">
                  {{ resident.healthStatus }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="文化程度">
                {{ resident.education || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="职业">
                {{ resident.occupation || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="婚姻状况">
                {{ resident.maritalStatus || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="政治面貌">
                {{ resident.politicalStatus || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">
                {{ resident.remarks || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 家庭成员信息 -->
    <el-card class="mb-4">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold">家庭成员</span>
          <el-button type="primary" size="small" @click="handleAddFamily">
            <el-icon><Plus /></el-icon>
            添加成员
          </el-button>
        </div>
      </template>

      <el-table :data="familyMembers" stripe>
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="relationship" label="关系" width="100" />
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="{ row }">
            <el-tag :type="row.gender === '男' ? 'primary' : 'danger'" size="small">
              {{ row.gender }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="80" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="occupation" label="职业" />
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEditFamily(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDeleteFamily(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!familyMembers.length" class="text-center text-gray-500 py-8">
        暂无家庭成员信息
      </div>
    </el-card>

    <!-- 健康档案 -->
    <el-card class="mb-4">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold">健康档案</span>
          <el-button type="primary" size="small" @click="handleAddHealth">
            <el-icon><Plus /></el-icon>
            添加记录
          </el-button>
        </div>
      </template>

      <el-timeline>
        <el-timeline-item
          v-for="record in healthRecords"
          :key="record.id"
          :timestamp="formatDate(record.checkDate)"
          placement="top"
        >
          <el-card>
            <h4 class="font-semibold mb-2">{{ record.type }}</h4>
            <p class="text-gray-600 mb-2">{{ record.description }}</p>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-500">医生：{{ record.doctor }}</span>
              <el-button type="text" size="small" @click="handleViewHealth(record)">
                查看详情
              </el-button>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <div v-if="!healthRecords.length" class="text-center text-gray-500 py-8">
        暂无健康档案记录
      </div>
    </el-card>

    <!-- 参与活动记录 -->
    <el-card class="mb-4">
      <template #header>
        <span class="text-lg font-semibold">参与活动记录</span>
      </template>

      <el-table :data="activityRecords" stripe>
        <el-table-column prop="activityName" label="活动名称" />
        <el-table-column prop="activityType" label="活动类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.activityType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="participateDate" label="参与时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.participateDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '已完成' ? 'success' : 'warning'" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remarks" label="备注" show-overflow-tooltip />
      </el-table>

      <div v-if="!activityRecords.length" class="text-center text-gray-500 py-8">
        暂无活动参与记录
      </div>
    </el-card>

    <!-- 变更记录 -->
    <el-card>
      <template #header>
        <span class="text-lg font-semibold">变更记录</span>
      </template>

      <el-timeline>
        <el-timeline-item
          v-for="change in changeRecords"
          :key="change.id"
          :timestamp="formatDate(change.changeDate, 'YYYY-MM-DD HH:mm:ss')"
          placement="top"
        >
          <el-card>
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-semibold mb-1">{{ change.changeType }}</h4>
                <p class="text-gray-600 text-sm">{{ change.description }}</p>
              </div>
              <el-tag size="small">{{ change.operator }}</el-tag>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <div v-if="!changeRecords.length" class="text-center text-gray-500 py-8">
        暂无变更记录
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Plus } from '@element-plus/icons-vue'
import { formatDate, validateIdCard, validatePhone } from '@/utils/common'

// Props定义
const props = defineProps({
  resident: {
    type: Object,
    required: true
  }
})

// Emits定义
const emit = defineEmits(['edit', 'close'])

// 响应式数据
const familyMembers = ref([])
const healthRecords = ref([])
const activityRecords = ref([])
const changeRecords = ref([])

// 计算属性
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

const formatIdCard = (idCard) => {
  const { formatted } = validateIdCard(idCard)
  return formatted
}

const formatPhone = (phone) => {
  const { formatted } = validatePhone(phone)
  return formatted
}

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
const loadFamilyMembers = async () => {
  try {
    // 模拟数据
    familyMembers.value = [
      {
        id: 1,
        name: '张明',
        relationship: '配偶',
        gender: '女',
        age: 45,
        phone: '13987654321',
        occupation: '务农'
      },
      {
        id: 2,
        name: '张小明',
        relationship: '儿子',
        gender: '男',
        age: 20,
        phone: '13876543210',
        occupation: '学生'
      }
    ]
  } catch (error) {
    console.error('加载家庭成员失败:', error)
  }
}

const loadHealthRecords = async () => {
  try {
    // 模拟数据
    healthRecords.value = [
      {
        id: 1,
        type: '年度体检',
        description: '血压正常，血糖偏高，建议控制饮食',
        doctor: '李医生',
        checkDate: '2024-03-15'
      },
      {
        id: 2,
        type: '慢病随访',
        description: '糖尿病随访，血糖控制良好',
        doctor: '王医生',
        checkDate: '2024-06-20'
      }
    ]
  } catch (error) {
    console.error('加载健康记录失败:', error)
  }
}

const loadActivityRecords = async () => {
  try {
    // 模拟数据
    activityRecords.value = [
      {
        id: 1,
        activityName: '村民大会',
        activityType: '会议',
        participateDate: '2024-08-15',
        role: '参与者',
        status: '已完成',
        remarks: '全程参与'
      },
      {
        id: 2,
        activityName: '环境整治活动',
        activityType: '劳动',
        participateDate: '2024-09-01',
        role: '志愿者',
        status: '已完成',
        remarks: '积极参与清理工作'
      }
    ]
  } catch (error) {
    console.error('加载活动记录失败:', error)
  }
}

const loadChangeRecords = async () => {
  try {
    // 模拟数据
    changeRecords.value = [
      {
        id: 1,
        changeType: '信息更新',
        description: '更新手机号码',
        operator: '村委会',
        changeDate: '2024-07-10 14:30:00'
      },
      {
        id: 2,
        changeType: '地址变更',
        description: '搬迁到新住址',
        operator: '张三',
        changeDate: '2024-05-20 09:15:00'
      }
    ]
  } catch (error) {
    console.error('加载变更记录失败:', error)
  }
}

// 事件处理方法
const handleAddFamily = () => {
  ElMessage.info('添加家庭成员功能开发中...')
}

const handleEditFamily = (row) => {
  ElMessage.info(`编辑家庭成员 ${row.name} 功能开发中...`)
}

const handleDeleteFamily = (row) => {
  ElMessage.info(`删除家庭成员 ${row.name} 功能开发中...`)
}

const handleAddHealth = () => {
  ElMessage.info('添加健康记录功能开发中...')
}

const handleViewHealth = (record) => {
  ElMessage.info(`查看健康记录详情功能开发中...`)
}

// 生命周期
onMounted(() => {
  loadFamilyMembers()
  loadHealthRecords()
  loadActivityRecords()
  loadChangeRecords()
})
</script>

<style scoped>
.resident-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.basic-info {
  padding: 16px 0;
}

.el-descriptions {
  margin-top: 20px;
}

.el-timeline {
  padding-left: 0;
}

.el-timeline-item {
  padding-bottom: 20px;
}
</style>