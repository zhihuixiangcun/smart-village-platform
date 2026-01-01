<template>
  <div class="village-management">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      :title="pageTitle"
      left-arrow
      @click-left="$router.go(-1)"
      :right-text="showTodayDuty ? '呼叫值班' : ''"
      @click-right="handleCallDuty"
    />

    <!-- 今日值班卡片 -->
    <div v-if="showTodayDuty && todayDutyList.length > 0" class="today-duty-section">
      <van-cell-group inset>
        <van-cell>
          <template #title>
            <span class="section-title">📋 今日值班</span>
          </template>
        </van-cell>
        <van-cell
          v-for="duty in todayDutyList"
          :key="duty._id"
          :title="duty.userName"
          :label="`${duty.userRole} - ${duty.shift?.shiftName}`"
          is-link
          @click="handleCallOfficer(duty)"
        >
          <template #right-icon>
            <van-tag type="success">在岗</van-tag>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 功能菜单 -->
    <div class="function-menu">
      <van-grid :column-num="3" :gutter="12">
        <van-grid-item
          v-for="item in menuItems"
          :key="item.name"
          :icon="item.icon"
          :text="item.text"
          @click="handleMenuClick(item)"
        />
      </van-grid>
    </div>

    <!-- 我的任务概览 -->
    <van-cell-group inset class="task-overview">
      <van-cell>
        <template #title>
          <span class="section-title">📊 我的任务</span>
        </template>
        <template #right-icon>
          <span @click="refreshData" style="color: #1989fa;">
            <van-icon name="replay" />
          </span>
        </template>
      </van-cell>

      <!-- 统计卡片 -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-number">{{ myStats.totalCollections }}</div>
          <div class="stat-label">待收集</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ myStats.pendingReview }}</div>
          <div class="stat-label">待审核</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ myStats.approvedCollections }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
    </van-cell-group>

    <!-- 最近任务列表 -->
    <van-cell-group inset class="recent-tasks">
      <van-cell>
        <template #title>
          <span class="section-title">📝 最近任务</span>
        </template>
        <template #right-icon>
          <span @click="viewAllTasks" style="color: #1989fa; font-size: 14px;">
            查看全部
          </span>
        </template>
      </van-cell>

      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <van-cell
          v-for="task in recentTasks"
          :key="task._id"
          :title="task.title"
          :label="formatTaskLabel(task)"
          is-link
          @click="viewTaskDetail(task)"
        >
          <template #right-icon>
            <van-tag :type="getStatusType(task.status)">
              {{ getStatusText(task.status) }}
            </van-tag>
          </template>
        </van-cell>
      </van-list>
    </van-cell-group>

    <!-- 快速操作悬浮按钮 -->
    <van-floating-bubble
      axis="xy"
      icon="plus"
      @click="showQuickActions = true"
    />

    <!-- 快速操作弹窗 -->
    <van-action-sheet
      v-model:show="showQuickActions"
      :actions="quickActions"
      @select="handleQuickAction"
      cancel-text="取消"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '@/stores/user'
import villageApi from '@/api/villageManagement'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const finished = ref(false)
const showQuickActions = ref(false)
const todayDutyList = ref([])
const myStats = ref({
  totalCollections: 0,
  pendingReview: 0,
  approvedCollections: 0
})
const recentTasks = ref([])
const page = ref(1)
const pageSize = 10

// 计算属性
const pageTitle = computed(() => {
  return '村务管理'
})

const showTodayDuty = computed(() => {
  return userStore.userInfo?.villageId
})

const menuItems = ref([
  {
    name: 'document',
    text: '资料收集',
    icon: 'description',
    route: '/village/documents'
  },
  {
    name: 'search',
    text: '资料查找',
    icon: 'search',
    route: '/village/search'
  },
  {
    name: 'statistics',
    text: '工作统计',
    icon: 'chart-trending-o',
    route: '/village/statistics'
  },
  {
    name: 'duty',
    text: '值班管理',
    icon: 'calendar-o',
    route: '/village/duty'
  },
  {
    name: 'camera',
    text: '拍照上传',
    icon: 'photograph',
    action: 'camera'
  },
  {
    name: 'report',
    text: '生成报告',
    icon: 'bar-chart-o',
    route: '/village/reports'
  }
])

const quickActions = ref([
  {
    name: 'new_document',
    text: '新建资料收集',
    icon: 'add-o'
  },
  {
    name: 'upload_photo',
    text: '拍照上传',
    icon: 'photograph'
  },
  {
    name: 'quick_search',
    text: '快速搜索',
    icon: 'search'
  }
])

// 方法
const handleCallDuty = async () => {
  try {
    await showConfirmDialog({
      title: '呼叫值班人员',
      message: '确定要呼叫今日值班人员吗？',
    })

    const result = await villageApi.callDutyOfficer(userStore.userInfo.villageId, {
      emergency: false,
      message: '村委会需要您响应'
    })

    showToast('呼叫已发送')
  } catch (error) {
    console.error('呼叫失败:', error)
  }
}

const handleCallOfficer = (officer) => {
  showConfirmDialog({
    title: '联系值班人员',
    message: `确定要联系 ${officer.userName} (${officer.userPhone}) 吗？`,
  }).then(() => {
    // 调用电话功能
    window.location.href = `tel:${officer.userPhone}`
  }).catch(() => {
    // 取消操作
  })
}

const handleMenuClick = (item) => {
  if (item.route) {
    router.push(item.route)
  } else if (item.action) {
    handleQuickAction(item)
  }
}

const handleQuickAction = async (action) => {
  showQuickActions.value = false

  switch (action.name) {
    case 'new_document':
      router.push('/village/documents/new')
      break
    case 'upload_photo':
    case 'camera':
      // 调用相机
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = 'camera'
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (file) {
          // 上传到临时收集任务
          handlePhotoUpload(file)
        }
      }
      input.click()
      break
    case 'quick_search':
      router.push('/village/search')
      break
  }
}

const handlePhotoUpload = async (file) => {
  try {
    showToast('上传中...')

    const formData = new FormData()
    formData.append('files', file)
    formData.append('description', '手机快速上传')

    // 创建快速收集任务
    const collection = await villageApi.createDocumentCollection({
      title: `快速收集_${new Date().toLocaleString()}`,
      category: 'other',
      description: '手机快速上传的资料',
      collectionDate: new Date().toISOString()
    })

    // 上传文件
    await villageApi.uploadFiles(collection.data._id, formData)

    showToast('上传成功')
    refreshData()
  } catch (error) {
    console.error('上传失败:', error)
    showToast('上传失败')
  }
}

const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadTodayDuty(),
      loadMyStats(),
      loadRecentTasks()
    ])
  } catch (error) {
    console.error('刷新数据失败:', error)
  } finally {
    loading.value = false
  }
}

const loadTodayDuty = async () => {
  if (!userStore.userInfo?.villageId) return

  try {
    const response = await villageApi.getTodayDuty(userStore.userInfo.villageId)
    todayDutyList.value = response.data.data || []
  } catch (error) {
    console.error('获取值班信息失败:', error)
  }
}

const loadMyStats = async () => {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30) // 最近30天

    const response = await villageApi.getPersonalStatistics(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )

    const stats = response.data.data?.documentStatistics || {}
    myStats.value = {
      totalCollections: stats.totalCollections || 0,
      pendingReview: stats.totalCollections - stats.approvedCollections,
      approvedCollections: stats.approvedCollections || 0
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

const loadRecentTasks = async () => {
  try {
    const response = await villageApi.getMyDocuments({
      page: page.value,
      limit: pageSize.value
    })

    if (page.value === 1) {
      recentTasks.value = response.data.data.docs
    } else {
      recentTasks.value.push(...response.data.data.docs)
    }

    finished.value = response.data.data.docs.length < pageSize.value
    page.value++
  } catch (error) {
    console.error('获取任务列表失败:', error)
    finished.value = true
  }
}

const onLoad = () => {
  loadRecentTasks()
}

const viewAllTasks = () => {
  router.push('/village/documents')
}

const viewTaskDetail = (task) => {
  router.push(`/village/documents/${task._id}`)
}

const formatTaskLabel = (task) => {
  return `${task.category} - ${new Date(task.collectionDate).toLocaleDateString()}`
}

const getStatusType = (status) => {
  const statusMap = {
    'collecting': 'primary',
    'reviewing': 'warning',
    'approved': 'success',
    'rejected': 'danger',
    'archived': 'default'
  }
  return statusMap[status] || 'default'
}

const getStatusText = (status) => {
  const statusMap = {
    'collecting': '收集中',
    'reviewing': '审核中',
    'approved': '已完成',
    'rejected': '已拒绝',
    'archived': '已归档'
  }
  return statusMap[status] || status
}

// 生命周期
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.village-management {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 60px;
}

.today-duty-section {
  margin: 12px 0;
}

.section-title {
  font-weight: 600;
  font-size: 16px;
}

.function-menu {
  padding: 16px;
}

.task-overview {
  margin: 12px 0;
}

.stats-cards {
  display: flex;
  justify-content: space-around;
  padding: 16px;
}

.stat-card {
  text-align: center;
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #1989fa;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #969799;
}

.recent-tasks {
  margin: 12px 0;
}
</style>