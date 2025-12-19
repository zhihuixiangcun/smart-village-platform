<template>
  <div class="village-committee-container">
    <!-- 顶部导航栏 -->
    <el-card class="header-card" shadow="never">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">村委管理</h1>
          <p class="page-subtitle">智慧乡村综合管理平台</p>
        </div>
        <div class="action-section">
          <el-button type="primary" @click="showEmergencyDialog = true">
            <el-icon><Bell /></el-icon>
            紧急通知
          </el-button>
          <el-button @click="exportData">
            <el-icon><Download /></el-icon>
            导出数据
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 快捷入口卡片 -->
    <el-row :gutter="20" class="quick-access-row">
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6" v-for="item in quickAccessItems" :key="item.path">
        <el-card
          class="quick-access-card"
          shadow="hover"
          @click="$router.push(item.path)"
        >
          <div class="card-content">
            <el-icon class="card-icon" :size="40">
              <component :is="item.icon" />
            </el-icon>
            <h3 class="card-title">{{ item.title }}</h3>
            <p class="card-desc">{{ item.description }}</p>
            <div class="card-badge" v-if="item.badge">
              <el-badge :value="item.badge" type="danger" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 统计数据概览 -->
    <el-card class="stats-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>数据概览</span>
          <el-button text @click="refreshStats">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :xs="12" :sm="6" :md="6" :lg="6" :xl="6" v-for="stat in statistics" :key="stat.key">
          <div class="stat-item">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-change" :class="stat.trend">
              <el-icon><ArrowUp v-if="stat.trend === 'up'" /><ArrowDown v-else /></el-icon>
              {{ stat.change }}
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 今日值班信息 -->
    <el-card class="duty-card" shadow="never" v-if="onDutyToday.length">
      <template #header>
        <div class="card-header">
          <span>今日值班</span>
          <el-tag type="success">{{ currentDate }}</el-tag>
        </div>
      </template>
      <el-table :data="onDutyToday" style="width: 100%">
        <el-table-column prop="period" label="时段" width="100" />
        <el-table-column prop="memberName" label="值班人员" />
        <el-table-column prop="contact" label="联系电话" />
        <el-table-column prop="responsibilities" label="主要职责" />
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button type="primary" size="small" @click="callDutyPerson(scope.row)">
              <el-icon><Phone /></el-icon>
              呼叫
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 紧急通知对话框 -->
    <el-dialog
      v-model="showEmergencyDialog"
      title="发送紧急通知"
      width="500px"
      :fullscreen="isMobile"
    >
      <el-form :model="emergencyForm" label-width="100px">
        <el-form-item label="通知类型">
          <el-select v-model="emergencyForm.type" placeholder="请选择通知类型">
            <el-option label="紧急事件" value="emergency" />
            <el-option label="自然灾害" value="disaster" />
            <el-option label="公共卫生" value="health" />
            <el-option label="安全事故" value="safety" />
          </el-select>
        </el-form-item>
        <el-form-item label="通知标题">
          <el-input v-model="emergencyForm.title" placeholder="请输入通知标题" />
        </el-form-item>
        <el-form-item label="通知内容">
          <el-input
            v-model="emergencyForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入通知内容"
          />
        </el-form-item>
        <el-form-item label="通知范围">
          <el-checkbox-group v-model="emergencyForm.targets">
            <el-checkbox label="all">全体村民</el-checkbox>
            <el-checkbox label="members">村委人员</el-checkbox>
            <el-checkbox label="party">党员同志</el-checkbox>
            <el-checkbox label="volunteers">志愿者</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEmergencyDialog = false">取消</el-button>
        <el-button type="primary" @click="sendEmergencyNotification">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCommitteeStore } from '@/stores/villageCommittee/committeeStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Bell,
  Download,
  Refresh,
  ArrowUp,
  ArrowDown,
  Phone,
  User,
  UserFilled,
  Calendar,
  MapLocation,
  House,
  Switch
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()
const committeeStore = useCommitteeStore()

// 响应式数据
const showEmergencyDialog = ref(false)
const currentDate = dayjs().format('YYYY年MM月DD日')
const isMobile = computed(() => window.innerWidth < 768)

// 紧急通知表单
const emergencyForm = ref({
  type: '',
  title: '',
  content: '',
  targets: []
})

// 快捷入口数据
const quickAccessItems = ref([
  {
    title: '人员管理',
    description: '村委人员信息管理',
    icon: 'User',
    path: '/village-committee/members',
    badge: null
  },
  {
    title: '党员信息',
    description: '党员档案管理',
    icon: 'UserFilled',
    path: '/village-committee/party-members',
    badge: null
  },
  {
    title: '值班表',
    description: '智能排班管理',
    icon: 'Calendar',
    path: '/village-committee/duty-schedule',
    badge: committeeStore.onDutyToday.length
  },
  {
    title: '村情地图',
    description: '村民位置分布',
    icon: 'MapLocation',
    path: '/village-committee/village-map',
    badge: null
  },
  {
    title: '一户一码',
    description: '住户二维码管理',
    icon: 'House',
    path: '/village-committee/household-code',
    badge: null
  },
  {
    title: '人员调任',
    description: '调任流程管理',
    icon: 'Switch',
    path: '/village-committee/transfer',
    badge: null
  }
])

// 统计数据
const statistics = ref([
  {
    key: 'totalMembers',
    label: '村委人员',
    value: '12',
    change: '2',
    trend: 'up'
  },
  {
    key: 'partyMembers',
    label: '党员人数',
    value: '156',
    change: '5',
    trend: 'up'
  },
  {
    key: 'households',
    label: '住户总数',
    value: '486',
    change: '3',
    trend: 'up'
  },
  {
    key: 'emergencyEvents',
    label: '本月事件',
    value: '8',
    change: '2',
    trend: 'down'
  }
])

// 计算属性
const onDutyToday = computed(() => committeeStore.onDutyToday)

// 方法
const refreshStats = async () => {
  try {
    // 刷新统计数据
    ElMessage.success('数据已刷新')
  } catch (error) {
    console.error('刷新统计数据失败:', error)
  }
}

const exportData = () => {
  ElMessageBox.confirm(
    '确定要导出村委管理数据吗？',
    '导出确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(async () => {
    try {
      await committeeStore.exportMembers()
      ElMessage.success('数据导出成功')
    } catch (error) {
      ElMessage.error('数据导出失败')
    }
  })
}

const callDutyPerson = (person) => {
  ElMessageBox.confirm(
    `确定要呼叫 ${person.memberName} 吗？\n电话：${person.contact}`,
    '呼叫确认',
    {
      confirmButtonText: '呼叫',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    // 实现呼叫功能
    window.location.href = `tel:${person.contact}`
    ElMessage.success(`正在呼叫 ${person.memberName}`)
  })
}

const sendEmergencyNotification = async () => {
  try {
    await committeeStore.sendEmergencyNotification(emergencyForm.value)
    ElMessage.success('紧急通知发送成功')
    showEmergencyDialog.value = false
    emergencyForm.value = {
      type: '',
      title: '',
      content: '',
      targets: []
    }
  } catch (error) {
    ElMessage.error('通知发送失败')
  }
}

// 生命周期
onMounted(async () => {
  try {
    await Promise.all([
      committeeStore.fetchDutySchedule(),
      committeeStore.fetchMembers()
    ])
  } catch (error) {
    console.error('初始化数据失败:', error)
  }
})
</script>

<style lang="scss" scoped>
.village-committee-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

.header-card {
  margin-bottom: 20px;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .title-section {
    .page-title {
      margin: 0;
      font-size: 28px;
      color: #303133;
      font-weight: 600;

      @media (max-width: 768px) {
        font-size: 24px;
      }
    }

    .page-subtitle {
      margin: 5px 0 0 0;
      color: #909399;
      font-size: 14px;
    }
  }

  .action-section {
    display: flex;
    gap: 10px;
  }
}

.quick-access-row {
  margin-bottom: 20px;
}

.quick-access-card {
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 20px;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }

  .card-content {
    text-align: center;
    position: relative;

    .card-icon {
      color: #409eff;
      margin-bottom: 15px;
    }

    .card-title {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 500;
      color: #303133;
    }

    .card-desc {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }

    .card-badge {
      position: absolute;
      top: 0;
      right: 10px;
    }
  }
}

.stats-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-item {
    text-align: center;
    padding: 20px 0;

    .stat-value {
      font-size: 32px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 14px;
      color: #909399;
      margin-bottom: 8px;
    }

    .stat-change {
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;

      &.up {
        color: #67c23a;
      }

      &.down {
        color: #f56c6c;
      }
    }
  }
}

.duty-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

// 响应式调整
@media (max-width: 768px) {
  .quick-access-row {
    .el-col {
      width: 100% !important;
      flex: 0 0 100%;
      max-width: 100%;
    }
  }

  .stats-card {
    .el-col {
      width: 50% !important;
      flex: 0 0 50%;
      max-width: 50%;
    }

    .stat-item {
      padding: 15px 0;

      .stat-value {
        font-size: 24px;
      }
    }
  }
}
</style>