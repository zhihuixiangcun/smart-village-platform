<template>
  <div class="resident-mobile-list">
    <!-- 移动端搜索栏 -->
    <div class="mobile-search-bar">
      <div class="search-input-wrapper">
        <el-input
          v-model="searchQuery"
          placeholder="搜索村民姓名、身份证号..."
          prefix-icon="Search"
          clearable
          @input="handleSearch"
          @focus="showSearchHistory = true"
        >
          <template #suffix>
            <el-button
              type="text"
              icon="Microphone"
              @click="startVoiceSearch"
              :class="{ 'recording': isRecording }"
            />
          </template>
        </el-input>
      </div>

      <!-- 语音识别按钮 -->
      <el-button
        type="primary"
        icon="Plus"
        circle
        @click="showAddDialog = true"
        class="add-button"
      />
    </div>

    <!-- 快速筛选标签 -->
    <div class="quick-filters" v-if="!searchQuery">
      <div class="filter-scroll">
        <span
          v-for="filter in quickFilters"
          :key="filter.key"
          class="filter-tag"
          :class="{ active: activeFilters.includes(filter.key) }"
          @click="toggleFilter(filter.key)"
        >
          {{ filter.label }}
        </span>
      </div>
    </div>

    <!-- 搜索历史 -->
    <div class="search-history" v-if="showSearchHistory && searchHistory.length">
      <div class="history-header">
        <span>搜索历史</span>
        <el-button type="text" size="small" @click="clearHistory">清空</el-button>
      </div>
      <div class="history-list">
        <div
          v-for="item in searchHistory"
          :key="item.id"
          class="history-item"
          @click="selectHistory(item.query)"
        >
          <el-icon><Clock /></el-icon>
          <span>{{ item.query }}</span>
          <el-button
            type="text"
            icon="Close"
            size="small"
            @click.stop="removeHistory(item.id)"
          />
        </div>
      </div>
    </div>

    <!-- 村民列表 -->
    <div class="resident-list" ref="listContainer">
      <!-- 下拉刷新 -->
      <div class="pull-refresh" :class="{ 'refreshing': isRefreshing }">
        <div class="refresh-icon">
          <el-icon :class="{ 'rotating': isRefreshing }"><Refresh /></el-icon>
        </div>
        <span>{{ isRefreshing ? '正在刷新...' : '下拉刷新' }}</span>
      </div>

      <!-- 列表项 -->
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="loadMore"
        :immediate-check="false"
      >
        <div
          v-for="resident in residentList"
          :key="resident.id"
          class="resident-card"
          @click="viewDetail(resident)"
          @touchstart="handleTouchStart($event, resident)"
          @touchend="handleTouchEnd"
          @touchmove="handleTouchMove"
        >
          <!-- 左滑操作 -->
          <div class="swipe-actions" :style="{ transform: `translateX(${swipeAmount}px)` }">
            <el-button type="primary" @click.stop="editResident(resident)">编辑</el-button>
            <el-button type="success" @click.stop="callResident(resident)">呼叫</el-button>
            <el-button type="danger" @click.stop="deleteResident(resident)">删除</el-button>
          </div>

          <!-- 卡片内容 -->
          <div class="card-content">
            <div class="resident-avatar">
              <el-avatar :size="50" :src="resident.avatar">
                {{ resident.name.charAt(0) }}
              </el-avatar>
              <div class="status-dot" :class="resident.status"></div>
            </div>

            <div class="resident-info">
              <div class="info-header">
                <h3 class="resident-name">{{ resident.name }}</h3>
                <div class="info-badges">
                  <el-tag size="small" :type="resident.gender === 'male' ? 'primary' : 'danger'">
                    {{ resident.gender === 'male' ? '男' : '女' }}
                  </el-tag>
                  <el-tag size="small" type="info">{{ resident.age }}岁</el-tag>
                </div>
              </div>

              <div class="info-details">
                <div class="detail-item">
                  <el-icon><House /></el-icon>
                  <span>{{ resident.address || '暂无地址' }}</span>
                </div>
                <div class="detail-item">
                  <el-icon><Phone /></el-icon>
                  <span>{{ maskPhone(resident.phone) }}</span>
                </div>
              </div>

              <div class="resident-tags" v-if="resident.tags?.length">
                <el-tag
                  v-for="tag in resident.tags.slice(0, 3)"
                  :key="tag"
                  size="small"
                  effect="plain"
                >
                  {{ tag }}
                </el-tag>
                <span v-if="resident.tags.length > 3" class="more-tags">
                  +{{ resident.tags.length - 3 }}
                </span>
              </div>
            </div>

            <div class="resident-actions">
              <el-button
                type="text"
                icon="More"
                @click.stop="showActionSheet(resident)"
              />
            </div>
          </div>
        </div>
      </van-list>

      <!-- 加载更多 -->
      <div class="load-more" v-if="!finished && !loading">
        <el-button text @click="loadMore">加载更多</el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-if="!loading && residentList.length === 0">
      <el-empty description="暂无数据">
        <el-button type="primary" @click="showAddDialog = true">
          添加村民
        </el-button>
      </el-empty>
    </div>

    <!-- 快速操作面板 -->
    <van-action-sheet
      v-model:show="actionSheetVisible"
      :actions="actionSheetActions"
      @select="handleActionSelect"
      cancel-text="取消"
      close-on-click-action
    />

    <!-- 语音识别弹窗 -->
    <van-popup v-model:show="voiceSearchVisible" position="bottom" :style="{ height: '40%' }">
      <div class="voice-search">
        <div class="voice-header">
          <h3>语音搜索</h3>
          <el-button type="text" @click="closeVoiceSearch">关闭</el-button>
        </div>
        <div class="voice-content">
          <div class="voice-animation" :class="{ 'recording': isRecording }">
            <div class="wave"></div>
            <div class="wave"></div>
            <div class="wave"></div>
          </div>
          <p class="voice-text">{{ voiceText || '请说出要搜索的内容' }}</p>
        </div>
        <div class="voice-actions">
          <el-button
            :type="isRecording ? 'danger' : 'primary'"
            :icon="isRecording ? 'Microphone' : 'Microphone'"
            @click="toggleVoiceRecording"
            round
          >
            {{ isRecording ? '停止录音' : '开始录音' }}
          </el-button>
        </div>
      </div>
    </van-popup>

    <!-- 添加村民弹窗 -->
    <van-popup v-model:show="showAddDialog" position="bottom" :style="{ height: '80%' }">
      <div class="add-resident-popup">
        <div class="popup-header">
          <h3>添加村民</h3>
          <el-button type="text" @click="showAddDialog = false">关闭</el-button>
        </div>
        <div class="popup-content">
          <ResidentQuickForm @success="handleAddSuccess" @cancel="showAddDialog = false" />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Clock, Close, Refresh, House, Phone, More, Microphone, Plus } from '@element-plus/icons-vue'
import { VanList, VanActionSheet, VanPopup } from 'vant'
import ResidentQuickForm from './ResidentQuickForm.vue'

// 路由
const router = useRouter()

// 响应式数据
const searchQuery = ref('')
const residentList = ref([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = 20
const isRefreshing = ref(false)
const showSearchHistory = ref(false)
const searchHistory = ref([])
const activeFilters = ref([])
const actionSheetVisible = ref(false)
const currentResident = ref(null)
const showAddDialog = ref(false)
const voiceSearchVisible = ref(false)
const isRecording = ref(false)
const voiceText = ref('')

// 手势相关
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchStartTime = ref(0)
const swipeAmount = ref(0)
const swipeResident = ref(null)

// 快速筛选选项
const quickFilters = ref([
  { key: 'elderly', label: '老年人' },
  { key: 'lowIncome', label: '低保户' },
  { key: 'disabled', label: '残疾人' },
  { key: 'veteran', label: '退伍军人' },
  { key: 'party', label: '党员' },
  { key: 'youth', label: '青年' }
])

// 操作面板选项
const actionSheetActions = computed(() => {
  if (!currentResident.value) return []

  return [
    { name: '查看详情', icon: 'eye' },
    { name: '编辑信息', icon: 'edit' },
    { name: '拨打电话', icon: 'phone' },
    { name: '发送短信', icon: 'chat' },
    { name: '查看家庭', icon: 'friends' },
    { name: '添加备注', icon: 'comment' },
    { name: '复制信息', icon: 'link' }
  ]
})

// 方法
const loadResidents = async (isRefresh = false) => {
  if (isRefresh) {
    page.value = 1
    finished.value = false
    residentList.value = []
  }

  if (loading.value || finished.value) return

  loading.value = true

  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newResidents = generateMockResidents()

    if (newResidents.length < pageSize) {
      finished.value = true
    }

    residentList.value.push(...newResidents)
    page.value++
  } catch (error) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
    isRefreshing.value = false
  }
}

const generateMockResidents = () => {
  const residents = []
  const start = (page.value - 1) * pageSize
  const end = start + pageSize

  for (let i = start; i < end && i < 100; i++) {
    residents.push({
      id: i + 1,
      name: `村民${i + 1}`,
      gender: Math.random() > 0.5 ? 'male' : 'female',
      age: Math.floor(Math.random() * 60) + 20,
      phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      address: `幸福路${i + 1}号`,
      avatar: '',
      status: Math.random() > 0.2 ? 'normal' : 'away',
      tags: generateRandomTags()
    })
  }

  return residents
}

const generateRandomTags = () => {
  const allTags = ['老年人', '低保户', '党员', '退伍军人', '残疾人', '独居', '慢性病']
  const count = Math.floor(Math.random() * 3)
  const tags = []

  for (let i = 0; i < count; i++) {
    const tag = allTags[Math.floor(Math.random() * allTags.length)]
    if (!tags.includes(tag)) {
      tags.push(tag)
    }
  }

  return tags
}

const handleSearch = (value) => {
  if (!value) {
    loadResidents(true)
    return
  }

  // 搜索逻辑
  page.value = 1
  finished.value = false
  residentList.value = []
  loadResidents()
}

const toggleFilter = (filterKey) => {
  const index = activeFilters.value.indexOf(filterKey)
  if (index > -1) {
    activeFilters.value.splice(index, 1)
  } else {
    activeFilters.value.push(filterKey)
  }

  loadResidents(true)
}

const viewDetail = (resident) => {
  if (Math.abs(swipeAmount.value) < 50) {
    router.push(`/resident/${resident.id}`)
  }
}

const editResident = (resident) => {
  swipeAmount.value = 0
  router.push(`/resident/${resident.id}/edit`)
}

const callResident = (resident) => {
  swipeAmount.value = 0
  window.location.href = `tel:${resident.phone}`
}

const deleteResident = async (resident) => {
  swipeAmount.value = 0

  try {
    await ElMessageBox.confirm(
      `确定要删除村民"${resident.name}"吗？`,
      '确认删除',
      { type: 'warning' }
    )

    // 执行删除
    ElMessage.success('删除成功')
    loadResidents(true)
  } catch {
    // 用户取消
  }
}

const showActionSheet = (resident) => {
  currentResident.value = resident
  actionSheetVisible.value = true
}

const handleActionSelect = (action) => {
  const resident = currentResident.value

  switch (action.name) {
    case '查看详情':
      viewDetail(resident)
      break
    case '编辑信息':
      editResident(resident)
      break
    case '拨打电话':
      callResident(resident)
      break
    case '发送短信':
      window.location.href = `sms:${resident.phone}`
      break
    case '查看家庭':
      router.push(`/resident/${resident.id}/family`)
      break
    case '添加备注':
      // 打开备注弹窗
      break
    case '复制信息':
      copyResidentInfo(resident)
      break
  }
}

const copyResidentInfo = (resident) => {
  const info = `姓名：${resident.name}\n电话：${resident.phone}\n地址：${resident.address}`
  navigator.clipboard.writeText(info)
  ElMessage.success('信息已复制到剪贴板')
}

const startVoiceSearch = () => {
  voiceSearchVisible.value = true
}

const closeVoiceSearch = () => {
  voiceSearchVisible.value = false
  isRecording.value = false
  voiceText.value = ''
}

const toggleVoiceRecording = () => {
  if (isRecording.value) {
    // 停止录音
    isRecording.value = false
    if (voiceText.value) {
      searchQuery.value = voiceText.value
      handleSearch(voiceText.value)
      voiceSearchVisible.value = false
    }
  } else {
    // 开始录音
    isRecording.value = true
    // 模拟语音识别
    setTimeout(() => {
      voiceText.value = '张三'
      isRecording.value = false
    }, 2000)
  }
}

const handleAddSuccess = () => {
  showAddDialog.value = false
  loadResidents(true)
  ElMessage.success('添加成功')
}

// 手势处理
const handleTouchStart = (e, resident) => {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
  touchStartTime.value = Date.now()
  swipeResident.value = resident
  swipeAmount.value = 0
}

const handleTouchMove = (e) => {
  if (!touchStartX.value) return

  const currentX = e.touches[0].clientX
  const deltaX = currentX - touchStartX.value

  // 限制滑动范围
  if (deltaX < -150) {
    swipeAmount.value = -150
  } else if (deltaX > 0) {
    swipeAmount.value = 0
  } else {
    swipeAmount.value = deltaX
  }
}

const handleTouchEnd = () => {
  if (Math.abs(swipeAmount.value) < 50) {
    swipeAmount.value = 0
    return
  }

  // 自动回弹或完全展开
  if (swipeAmount.value < -75) {
    swipeAmount.value = -150
  } else {
    swipeAmount.value = 0
  }

  // 重置
  touchStartX.value = 0
  touchStartY.value = 0
  swipeResident.value = null

  setTimeout(() => {
    swipeAmount.value = 0
  }, 3000)
}

const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const loadMore = () => {
  loadResidents()
}

// 下拉刷新
const setupPullRefresh = () => {
  const listContainer = document.querySelector('.resident-list')
  if (!listContainer) return

  let startY = 0
  let currentY = 0

  listContainer.addEventListener('touchstart', (e) => {
    if (listContainer.scrollTop === 0) {
      startY = e.touches[0].clientY
    }
  })

  listContainer.addEventListener('touchmove', (e) => {
    if (listContainer.scrollTop === 0) {
      currentY = e.touches[0].clientY
      const distance = currentY - startY

      if (distance > 0 && distance < 100) {
        e.preventDefault()
        listContainer.style.transform = `translateY(${distance * 0.5}px)`
      }
    }
  })

  listContainer.addEventListener('touchend', () => {
    listContainer.style.transform = ''
    listContainer.style.transition = 'transform 0.3s'

    setTimeout(() => {
      listContainer.style.transition = ''
    }, 300)

    if (currentY - startY > 50) {
      isRefreshing.value = true
      loadResidents(true)
    }
  })
}

// 搜索历史
const selectHistory = (query) => {
  searchQuery.value = query
  handleSearch(query)
  showSearchHistory.value = false
}

const removeHistory = (id) => {
  const index = searchHistory.value.findIndex(item => item.id === id)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
  }
}

const clearHistory = () => {
  searchHistory.value = []
}

// 生命周期
onMounted(() => {
  loadResidents()
  setupPullRefresh()

  // 加载搜索历史
  const saved = localStorage.getItem('resident-search-history')
  if (saved) {
    searchHistory.value = JSON.parse(saved)
  }
})

onUnmounted(() => {
  // 保存搜索历史
  localStorage.setItem('resident-search-history', JSON.stringify(searchHistory.value))
})
</script>

<style lang="scss" scoped>
.resident-mobile-list {
  background: #f5f5f5;
  min-height: 100vh;

  // 搜索栏
  .mobile-search-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: white;
    padding: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    .search-input-wrapper {
      position: relative;
      margin-right: 12px;

      .el-input {
        :deep(.el-input__inner) {
          height: 44px;
          font-size: 16px;
        }
      }
    }

    .add-button {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
  }

  // 快速筛选
  .quick-filters {
    background: white;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;

    .filter-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .filter-tag {
      flex-shrink: 0;
      padding: 6px 16px;
      background: #f5f5f5;
      border-radius: 16px;
      font-size: 14px;
      color: #666;
      white-space: nowrap;

      &.active {
        background: #409eff;
        color: white;
      }
    }
  }

  // 搜索历史
  .search-history {
    background: white;
    border-bottom: 1px solid #f0f0f0;

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px 8px;
      font-size: 14px;
      color: #666;
    }

    .history-list {
      .history-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;

        &:hover {
          background: #f5f5f5;
        }

        .el-icon {
          color: #999;
        }

        span {
          flex: 1;
          color: #333;
        }
      }
    }
  }

  // 村民列表
  .resident-list {
    padding: 8px 12px 80px;

    // 下拉刷新
    .pull-refresh {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0;
      color: #999;

      &.refreshing {
        .refresh-icon {
          animation: rotate 1s linear infinite;
        }
      }

      .refresh-icon {
        margin-bottom: 8px;

        .rotating {
          animation: rotate 1s linear infinite;
        }
      }
    }

    // 村民卡片
    .resident-card {
      position: relative;
      background: white;
      border-radius: 12px;
      margin-bottom: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

      .swipe-actions {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        transform: translateX(100%);
        transition: transform 0.3s;
        z-index: 1;

        .el-button {
          height: 100%;
          border-radius: 0;
          font-size: 14px;
        }
      }

      .card-content {
        display: flex;
        align-items: center;
        padding: 16px;
        position: relative;
        z-index: 2;
        transition: transform 0.3s;
      }

      .resident-avatar {
        position: relative;
        margin-right: 12px;

        .status-dot {
          position: absolute;
          right: -4px;
          bottom: 0;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid white;

          &.normal {
            background: #67c23a;
          }

          &.away {
            background: #e6a23c;
          }
        }
      }

      .resident-info {
        flex: 1;
        min-width: 0;

        .info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .resident-name {
            font-size: 16px;
            font-weight: 500;
            color: #333;
            margin: 0;
          }

          .info-badges {
            display: flex;
            gap: 4px;
          }
        }

        .info-details {
          margin-bottom: 8px;

          .detail-item {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #666;
            font-size: 13px;
            margin-bottom: 4px;

            .el-icon {
              font-size: 14px;
            }
          }
        }

        .resident-tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;

          .more-tags {
            font-size: 12px;
            color: #999;
          }
        }
      }

      .resident-actions {
        margin-left: 12px;
      }
    }
  }

  // 加载更多
  .load-more {
    text-align: center;
    padding: 20px 0;
  }

  // 空状态
  .empty-state {
    padding: 60px 20px;
    text-align: center;
  }

  // 语音搜索
  .voice-search {
    height: 100%;
    display: flex;
    flex-direction: column;

    .voice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;

      h3 {
        margin: 0;
        font-size: 16px;
      }
    }

    .voice-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;

      .voice-animation {
        display: flex;
        gap: 4px;
        margin-bottom: 20px;

        .wave {
          width: 4px;
          height: 40px;
          background: #409eff;
          border-radius: 2px;
          animation: wave 1s ease-in-out infinite;

          &:nth-child(2) {
            animation-delay: 0.2s;
          }

          &:nth-child(3) {
            animation-delay: 0.4s;
          }
        }

        &.recording .wave {
          animation-duration: 0.5s;
        }
      }

      .voice-text {
        font-size: 16px;
        color: #333;
      }
    }

    .voice-actions {
      padding: 20px;
      text-align: center;
    }
  }

  // 添加村民弹窗
  .add-resident-popup {
    height: 100%;
    display: flex;
    flex-direction: column;

    .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;

      h3 {
        margin: 0;
        font-size: 16px;
      }
    }

    .popup-content {
      flex: 1;
      overflow-y: auto;
    }
  }
}

// 动画
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes wave {
  0%, 100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(0.5);
  }
}

// Vant组件样式覆盖
:deep(.van-action-sheet__item) {
  padding: 14px 16px;
  font-size: 14px;
}

:deep(.van-list__loading) {
  padding: 16px 0;
}

:deep(.van-list__finished-text) {
  padding: 16px 0;
  color: #999;
  font-size: 14px;
}
</style>