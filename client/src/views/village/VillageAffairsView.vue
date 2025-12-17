<template>
  <div class="village-affairs" :class="{ 'large-text-mode': largeTextMode }">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-bg"></div>
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">村务公开</h1>
          <p class="page-description">了解村务信息，参与村庄治理</p>
        </div>
        <div class="header-actions">
          <el-button @click="showSettings" :size="largeTextMode ? 'large' : 'default'" icon="Setting">
            设置
          </el-button>
          <el-button type="primary" @click="subscribeNotifications" :size="largeTextMode ? 'large' : 'default'" icon="Bell">
            订阅通知
          </el-button>
        </div>
      </div>
    </div>

    <!-- 信息分类导航 -->
    <div class="category-nav">
      <div class="nav-container">
        <div
          v-for="category in categories"
          :key="category.key"
          class="nav-item"
          :class="{ active: activeCategory === category.key }"
          @click="setActiveCategory(category.key)"
        >
          <div class="nav-icon">{{ category.icon }}</div>
          <span class="nav-label">{{ category.label }}</span>
          <el-badge
            v-if="category.count > 0"
            :value="category.count"
            class="nav-badge"
          />
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <el-row :gutter="24">
        <!-- 左侧信息列表 -->
        <el-col :xs="24" :lg="16">
          <!-- 搜索和筛选 -->
          <el-card class="search-card">
            <div class="search-container">
              <el-input
                v-model="searchQuery"
                placeholder="搜索村务信息..."
                :size="largeTextMode ? 'large' : 'default'"
                clearable
                @keyup.enter="handleSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>

              <el-select
                v-model="timeFilter"
                placeholder="时间范围"
                :size="largeTextMode ? 'large' : 'default'"
                @change="handleTimeFilter"
              >
                <el-option label="全部时间" value="" />
                <el-option label="今天" value="today" />
                <el-option label="本周" value="week" />
                <el-option label="本月" value="month" />
                <el-option label="最近三月" value="quarter" />
              </el-select>

              <el-button
                type="primary"
                @click="handleSearch"
                :size="largeTextMode ? 'large' : 'default'"
                icon="Search"
              >
                搜索
              </el-button>
            </div>
          </el-card>

          <!-- 信息列表 -->
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">{{ getCurrentCategoryTitle() }}</span>
                <div class="header-actions">
                  <el-button size="small" @click="refreshContent" icon="Refresh">
                    刷新
                  </el-button>
                </div>
              </div>
            </template>

            <div class="affairs-list" v-loading="loading">
              <!-- 重要通知置顶 -->
              <div
                v-for="item in importantNotices"
                :key="'important-' + item.id"
                class="affair-item important"
                @click="viewDetail(item)"
              >
                <div class="item-header">
                  <div class="item-title">
                    <el-icon class="important-icon" color="#f56c6c"><Warning /></el-icon>
                    <span class="title-text">{{ item.title }}</span>
                    <el-tag type="danger" size="small">重要</el-tag>
                  </div>
                  <div class="item-time">{{ formatTime(item.publishTime) }}</div>
                </div>
                <div class="item-summary">{{ item.summary }}</div>
                <div class="item-footer">
                  <div class="item-meta">
                    <span class="meta-item">{{ item.category }}</span>
                    <span class="meta-item">阅读 {{ item.readCount }}</span>
                  </div>
                  <el-button type="text" size="small">查看详情</el-button>
                </div>
              </div>

              <!-- 普通信息 -->
              <div
                v-for="item in filteredAffairs"
                :key="item.id"
                class="affair-item"
                @click="viewDetail(item)"
              >
                <div class="item-header">
                  <div class="item-title">
                    <span class="title-text">{{ item.title }}</span>
                    <el-tag
                      :type="getCategoryType(item.category)"
                      size="small"
                    >
                      {{ item.category }}
                    </el-tag>
                  </div>
                  <div class="item-time">{{ formatTime(item.publishTime) }}</div>
                </div>
                <div class="item-summary">{{ item.summary }}</div>
                <div class="item-footer">
                  <div class="item-meta">
                    <span class="meta-item">{{ item.publisher }}</span>
                    <span class="meta-item">阅读 {{ item.readCount }}</span>
                    <span class="meta-item" v-if="item.attachments.length > 0">
                      <el-icon><Paperclip /></el-icon> {{ item.attachments.length }}个附件
                    </span>
                  </div>
                  <div class="item-actions">
                    <el-button type="text" size="small" @click.stop="likeItem(item)">
                      <el-icon><StarFilled /></el-icon> {{ item.likeCount }}
                    </el-button>
                    <el-button type="text" size="small" @click.stop="shareItem(item)">
                      <el-icon><Share /></el-icon> 分享
                    </el-button>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <el-empty
                v-if="!loading && filteredAffairs.length === 0 && importantNotices.length === 0"
                description="暂无相关村务信息"
              />

              <!-- 加载更多 -->
              <div class="load-more" v-if="hasMore">
                <el-button @click="loadMore" :loading="loadingMore">
                  {{ loadingMore ? '加载中...' : '加载更多' }}
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧边栏 -->
        <el-col :xs="24" :lg="8">
          <!-- 热门话题 -->
          <el-card class="hot-topics-card">
            <template #header>
              <div class="card-header">
                <el-icon><TrendCharts /></el-icon>
                <span>热门话题</span>
              </div>
            </template>

            <div class="hot-topics">
              <div
                v-for="(topic, index) in hotTopics"
                :key="topic.id"
                class="topic-item"
                @click="viewTopic(topic)"
              >
                <div class="topic-rank" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
                <div class="topic-content">
                  <div class="topic-title">{{ topic.title }}</div>
                  <div class="topic-meta">
                    <span>{{ topic.discussCount }} 讨论</span>
                    <span>{{ topic.viewCount }} 浏览</span>
                  </div>
                </div>
                <div class="topic-trend" :class="topic.trend">
                  <el-icon v-if="topic.trend === 'up'"><TrendCharts /></el-icon>
                  <el-icon v-else-if="topic.trend === 'down'"><TrendCharts /></el-icon>
                  <el-icon v-else><Minus /></el-icon>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 政策解读 -->
          <el-card class="policy-card">
            <template #header>
              <div class="card-header">
                <el-icon><Document /></el-icon>
                <span>政策解读</span>
              </div>
            </template>

            <div class="policy-list">
              <div
                v-for="policy in policyInterpretations"
                :key="policy.id"
                class="policy-item"
                @click="viewPolicy(policy)"
              >
                <div class="policy-icon">📋</div>
                <div class="policy-content">
                  <div class="policy-title">{{ policy.title }}</div>
                  <div class="policy-desc">{{ policy.description }}</div>
                  <div class="policy-time">{{ formatTime(policy.publishTime) }}</div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 意见反馈 -->
          <el-card class="feedback-card">
            <template #header>
              <div class="card-header">
                <el-icon><ChatDotRound /></el-icon>
                <span>意见反馈</span>
              </div>
            </template>

            <div class="feedback-section">
              <div class="feedback-stats">
                <div class="stat-item">
                  <span class="stat-number">{{ feedbackStats.total }}</span>
                  <span class="stat-label">总反馈</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">{{ feedbackStats.replied }}</span>
                  <span class="stat-label">已回复</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">{{ feedbackStats.pending }}</span>
                  <span class="stat-label">待处理</span>
                </div>
              </div>

              <el-button
                type="primary"
                @click="showFeedbackDialog"
                :size="largeTextMode ? 'large' : 'default'"
                style="width: 100%; margin-top: 16px;"
              >
                我要反馈
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="currentItem?.title"
      :width="largeTextMode ? '90%' : '80%'"
      :close-on-click-modal="false"
      custom-class="affair-detail-dialog"
    >
      <div class="detail-content" v-if="currentItem">
        <div class="detail-header">
          <div class="detail-meta">
            <el-tag :type="getCategoryType(currentItem.category)">
              {{ currentItem.category }}
            </el-tag>
            <span class="publish-info">
              发布者：{{ currentItem.publisher }}
            </span>
            <span class="publish-time">
              {{ formatTime(currentItem.publishTime) }}
            </span>
          </div>
          <div class="detail-stats">
            <span class="stat-item">
              <el-icon><View /></el-icon> {{ currentItem.readCount }}
            </span>
            <span class="stat-item">
              <el-icon><StarFilled /></el-icon> {{ currentItem.likeCount }}
            </span>
          </div>
        </div>

        <div class="detail-body" v-html="currentItem.content"></div>

        <!-- 附件列表 -->
        <div class="detail-attachments" v-if="currentItem.attachments?.length > 0">
          <h4>附件下载</h4>
          <div class="attachment-list">
            <div
              v-for="attachment in currentItem.attachments"
              :key="attachment.id"
              class="attachment-item"
              @click="downloadAttachment(attachment)"
            >
              <el-icon><Document /></el-icon>
              <span class="attachment-name">{{ attachment.name }}</span>
              <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
              <el-button type="text" size="small">下载</el-button>
            </div>
          </div>
        </div>

        <!-- 评论区 -->
        <div class="detail-comments">
          <h4>评论区 ({{ currentItem.comments?.length || 0 }})</h4>

          <div class="comment-input">
            <el-input
              v-model="newComment"
              type="textarea"
              :rows="3"
              placeholder="发表您的看法..."
              :size="largeTextMode ? 'large' : 'default'"
            />
            <el-button
              type="primary"
              @click="submitComment"
              :size="largeTextMode ? 'large' : 'default'"
              style="margin-top: 12px;"
            >
              发表评论
            </el-button>
          </div>

          <div class="comment-list">
            <div
              v-for="comment in currentItem.comments"
              :key="comment.id"
              class="comment-item"
            >
              <el-avatar :size="32" :src="comment.avatar">
                {{ comment.author?.charAt(0) }}
              </el-avatar>
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-author">{{ comment.author }}</span>
                  <span class="comment-time">{{ formatTime(comment.time) }}</span>
                </div>
                <div class="comment-text">{{ comment.content }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 意见反馈对话框 -->
    <el-dialog
      v-model="feedbackDialogVisible"
      title="意见反馈"
      :width="largeTextMode ? '800px' : '600px'"
      :close-on-click-modal="false"
    >
      <el-form :model="feedbackForm" :rules="feedbackRules" ref="feedbackFormRef" label-width="80px">
        <el-form-item label="反馈类型" prop="type">
          <el-select v-model="feedbackForm.type" :size="largeTextMode ? 'large' : 'default'">
            <el-option label="建议" value="suggestion" />
            <el-option label="投诉" value="complaint" />
            <el-option label="咨询" value="inquiry" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="标题" prop="title">
          <el-input
            v-model="feedbackForm.title"
            placeholder="请输入反馈标题"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </el-form-item>

        <el-form-item label="内容" prop="content">
          <el-input
            v-model="feedbackForm.content"
            type="textarea"
            :rows="6"
            placeholder="请详细描述您的反馈内容..."
            :size="largeTextMode ? 'large' : 'default'"
          />
        </el-form-item>

        <el-form-item label="联系方式">
          <el-input
            v-model="feedbackForm.contact"
            placeholder="手机号或邮箱（可选）"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="feedbackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFeedback" :loading="submitting">
          提交反馈
        </el-button>
      </template>
    </el-dialog>

    <!-- 设置对话框 -->
    <el-dialog
      v-model="settingsDialogVisible"
      title="设置"
      :width="largeTextMode ? '800px' : '600px'"
    >
      <div class="settings-content">
        <div class="setting-item">
          <div class="setting-info">
            <h4>大字模式</h4>
            <p>适合老年用户，放大字体和按钮</p>
          </div>
          <el-switch
            v-model="largeTextMode"
            @change="toggleLargeTextMode"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h4>自动朗读</h4>
            <p>自动朗读村务信息内容</p>
          </div>
          <el-switch
            v-model="autoRead"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h4>消息推送</h4>
            <p>接收新村务信息推送通知</p>
          </div>
          <el-switch
            v-model="notificationEnabled"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h4>仅显示WiFi下图片</h4>
            <p>节省流量，WiFi环境下才显示图片</p>
          </div>
          <el-switch
            v-model="wifiOnly"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="settingsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Setting,
  Bell,
  Refresh,
  Warning,
  Paperclip,
  StarFilled,
  Share,
  TrendCharts,
  Document,
  ChatDotRound,
  View,
  Minus
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const largeTextMode = ref(false)
const autoRead = ref(false)
const notificationEnabled = ref(true)
const wifiOnly = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const detailDialogVisible = ref(false)
const feedbackDialogVisible = ref(false)
const settingsDialogVisible = ref(false)
const submitting = ref(false)

// 搜索和筛选
const searchQuery = ref('')
const timeFilter = ref('')
const activeCategory = ref('all')

// 当前查看的项目
const currentItem = ref(null)
const newComment = ref('')

// 表单引用
const feedbackFormRef = ref(null)

// 信息分类
const categories = reactive([
  { key: 'all', label: '全部', icon: '📋', count: 156 },
  { key: 'notice', label: '通知公告', icon: '📢', count: 23 },
  { key: 'policy', label: '政策宣传', icon: '📜', count: 18 },
  { key: 'activity', label: '村务活动', icon: '🎉', count: 15 },
  { key: 'finance', label: '财务公开', icon: '💰', count: 28 },
  { key: 'project', label: '项目进展', icon: '🏗️', count: 12 },
  { key: 'meeting', label: '会议纪要', icon: '👥', count: 35 },
  { key: 'emergency', label: '应急信息', icon: '🚨', count: 8 }
])

// 重要通知
const importantNotices = reactive([
  {
    id: '1',
    title: '关于加强新冠疫情防控的紧急通知',
    summary: '根据上级部门要求，即日起加强村内疫情防控措施，请村民配合做好相关工作...',
    category: '应急信息',
    publisher: '村委会',
    publishTime: '2024-01-16 09:00',
    readCount: 1256,
    content: '详细内容...'
  }
])

// 村务信息列表
const affairsList = reactive([
  {
    id: '1',
    title: '2024年第一季度财务收支公示',
    summary: '本季度村集体经济收入总计56.8万元，支出42.3万元，主要用于基础设施建设...',
    category: '财务公开',
    publisher: '财务科',
    publishTime: '2024-01-15 14:30',
    readCount: 856,
    likeCount: 45,
    attachments: [
      { id: '1', name: '2024年Q1财务报表.pdf', size: 2457600 }
    ],
    comments: [
      {
        id: '1',
        author: '张三',
        content: '公开透明，做得很好！',
        time: '2024-01-15 15:00',
        avatar: ''
      }
    ],
    content: '<p>详细财务内容...</p>'
  },
  {
    id: '2',
    title: '村内道路硬化工程进展通报',
    summary: '目前主要道路硬化工程已完成80%，预计本月底全部完工，请村民注意出行安全...',
    category: '项目进展',
    publisher: '项目办',
    publishTime: '2024-01-14 10:15',
    readCount: 623,
    likeCount: 28,
    attachments: [],
    comments: [],
    content: '<p>工程详细进展...</p>'
  },
  {
    id: '3',
    title: '关于开展春节期间文化活动的通知',
    summary: '为丰富村民文化生活，村委会决定在春节期间举办系列文化活动，欢迎村民积极参与...',
    category: '村务活动',
    publisher: '文化站',
    publishTime: '2024-01-13 16:45',
    readCount: 445,
    likeCount: 67,
    attachments: [
      { id: '2', name: '春节活动安排.docx', size: 532480 }
    ],
    comments: [],
    content: '<p>活动详细安排...</p>'
  }
])

// 热门话题
const hotTopics = reactive([
  {
    id: '1',
    title: '村口道路建设何时完工？',
    discussCount: 23,
    viewCount: 1456,
    trend: 'up'
  },
  {
    id: '2',
    title: '农村医保报销比例提高',
    discussCount: 18,
    viewCount: 987,
    trend: 'up'
  },
  {
    id: '3',
    title: '春季农作物种植补贴政策',
    discussCount: 15,
    viewCount: 765,
    trend: 'stable'
  }
])

// 政策解读
const policyInterpretations = reactive([
  {
    id: '1',
    title: '2024年农业补贴政策解读',
    description: '详解各类农业补贴的申请条件和流程',
    publishTime: '2024-01-12 09:00'
  },
  {
    id: '2',
    title: '农村宅基地政策新变化',
    description: '最新宅基地管理政策要点说明',
    publishTime: '2024-01-10 14:30'
  }
])

// 反馈统计
const feedbackStats = reactive({
  total: 156,
  replied: 128,
  pending: 28
})

// 反馈表单
const feedbackForm = reactive({
  type: '',
  title: '',
  content: '',
  contact: ''
})

const feedbackRules = {
  type: [
    { required: true, message: '请选择反馈类型', trigger: 'change' }
  ],
  title: [
    { required: true, message: '请输入反馈标题', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入反馈内容', trigger: 'blur' }
  ]
}

// 计算属性
const filteredAffairs = computed(() => {
  let filtered = affairsList

  // 按分类筛选
  if (activeCategory.value !== 'all') {
    filtered = filtered.filter(item => item.category === getCategoryLabel(activeCategory.value))
  }

  // 按搜索关键词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query)
    )
  }

  // 按时间筛选
  if (timeFilter.value) {
    const now = new Date()
    filtered = filtered.filter(item => {
      const itemTime = new Date(item.publishTime)
      switch (timeFilter.value) {
        case 'today':
          return itemTime.toDateString() === now.toDateString()
        case 'week':
          return (now - itemTime) <= 7 * 24 * 60 * 60 * 1000
        case 'month':
          return itemTime.getMonth() === now.getMonth() && itemTime.getFullYear() === now.getFullYear()
        case 'quarter':
          return (now - itemTime) <= 3 * 30 * 24 * 60 * 60 * 1000
        default:
          return true
      }
    })
  }

  return filtered
})

// 方法
const getCurrentCategoryTitle = () => {
  const category = categories.find(cat => cat.key === activeCategory.value)
  return category ? category.label : '全部信息'
}

const getCategoryLabel = (key) => {
  const category = categories.find(cat => cat.key === key)
  return category ? category.label : key
}

const getCategoryType = (category) => {
  const types = {
    '通知公告': 'primary',
    '政策宣传': 'success',
    '村务活动': 'warning',
    '财务公开': 'danger',
    '项目进展': 'info',
    '会议纪要': '',
    '应急信息': 'danger'
  }
  return types[category] || ''
}

const setActiveCategory = (key) => {
  activeCategory.value = key
}

const handleSearch = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const handleTimeFilter = () => {
  handleSearch()
}

const refreshContent = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('内容已刷新')
  }, 1000)
}

const loadMore = () => {
  loadingMore.value = true
  setTimeout(() => {
    loadingMore.value = false
    // 模拟没有更多数据
    hasMore.value = false
  }, 1000)
}

const viewDetail = (item) => {
  currentItem.value = item
  detailDialogVisible.value = true

  // 增加阅读计数
  item.readCount++

  // 自动朗读
  if (autoRead.value) {
    startTextToSpeech(item.title + '。' + item.summary)
  }
}

const likeItem = (item) => {
  item.likeCount++
  ElMessage.success('点赞成功')
}

const shareItem = (item) => {
  // 模拟分享功能
  ElMessage.success('分享链接已复制到剪贴板')
}

const viewTopic = (topic) => {
  ElMessage.info(`查看话题: ${topic.title}`)
}

const viewPolicy = (policy) => {
  ElMessage.info(`查看政策: ${policy.title}`)
}

const submitComment = () => {
  if (!newComment.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  const comment = {
    id: Date.now().toString(),
    author: userStore.userInfo?.name || '村民',
    content: newComment.value,
    time: new Date().toISOString(),
    avatar: ''
  }

  if (!currentItem.value.comments) {
    currentItem.value.comments = []
  }
  currentItem.value.comments.push(comment)
  newComment.value = ''
  ElMessage.success('评论发表成功')
}

const downloadAttachment = (attachment) => {
  ElMessage.info(`下载附件: ${attachment.name}`)
}

const showFeedbackDialog = () => {
  feedbackDialogVisible.value = true
}

const submitFeedback = async () => {
  if (!feedbackFormRef.value) return

  try {
    await feedbackFormRef.value.validate()

    submitting.value = true

    // 模拟提交
    setTimeout(() => {
      submitting.value = false
      feedbackDialogVisible.value = false
      ElMessage.success('反馈提交成功，我们会尽快处理')

      // 重置表单
      Object.assign(feedbackForm, {
        type: '',
        title: '',
        content: '',
        contact: ''
      })
    }, 1500)
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const subscribeNotifications = () => {
  ElMessage.success('已订阅村务信息通知')
}

const showSettings = () => {
  settingsDialogVisible.value = true
}

const toggleLargeTextMode = (value) => {
  if (value) {
    document.body.classList.add('large-text-mode')
    ElMessage.success('已开启大字模式')
  } else {
    document.body.classList.remove('large-text-mode')
    ElMessage.info('已关闭大字模式')
  }
}

const startTextToSpeech = (text) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    speechSynthesis.speak(utterance)
  }
}

const formatTime = (timeString) => {
  const date = new Date(timeString)
  const now = new Date()
  const diff = now - date

  if (diff < 60 * 1000) {
    return '刚刚'
  } else if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`
  } else if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  } else if (diff < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`
  } else {
    return date.toLocaleDateString()
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

onMounted(() => {
  console.log('村务公开页面加载完成')
})
</script>

<style lang="scss" scoped>
.village-affairs {
  min-height: 100vh;
  background-color: #f5f7fa;

  &.large-text-mode {
    font-size: 18px;

    .el-button {
      font-size: 16px;
      padding: 12px 24px;
    }

    .nav-item {
      padding: 16px 12px;

      .nav-label {
        font-size: 16px;
      }
    }

    .affair-item {
      padding: 20px;

      .title-text {
        font-size: 18px;
      }

      .item-summary {
        font-size: 16px;
      }
    }
  }
}

.page-header {
  position: relative;
  margin-bottom: 24px;

  .header-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 180px;
    background: linear-gradient(135deg, #4a90e2 0%, #7b68ee 100%);
    border-radius: 0 0 20px 20px;
  }

  .header-content {
    position: relative;
    z-index: 2;
    padding: 40px 24px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-info {
    .page-title {
      margin: 0 0 8px 0;
      color: white;
      font-size: 32px;
      font-weight: bold;
    }

    .page-description {
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.category-nav {
  background: white;
  border-radius: 12px;
  margin: 0 24px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .nav-container {
    display: flex;
    padding: 16px 24px;
    gap: 8px;
    overflow-x: auto;
  }

  .nav-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 80px;
    background: transparent;
    border: 2px solid transparent;

    &:hover {
      background: #f8f9fa;
    }

    &.active {
      background: #e8f4fd;
      border-color: #4a90e2;
      color: #4a90e2;
    }

    .nav-icon {
      font-size: 24px;
    }

    .nav-label {
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      line-height: 1.2;
    }

    .nav-badge {
      position: absolute;
      top: 8px;
      right: 8px;
    }
  }
}

.main-content {
  padding: 0 24px 24px;
}

.search-card {
  margin-bottom: 16px;

  .search-container {
    display: flex;
    gap: 12px;
    align-items: center;

    .el-input {
      flex: 1;
    }

    .el-select {
      width: 120px;
    }
  }
}

.content-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .card-title {
      font-weight: bold;
      font-size: 16px;
    }
  }
}

.affairs-list {
  .affair-item {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #f8f9fa;
    }

    &.important {
      background: #fef2f2;
      border-left: 4px solid #f56c6c;
    }

    &:last-child {
      border-bottom: none;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;

      .item-title {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;

        .title-text {
          font-weight: 500;
          color: #333;
          font-size: 16px;
          line-height: 1.4;
        }

        .important-icon {
          color: #f56c6c;
        }
      }

      .item-time {
        color: #999;
        font-size: 14px;
        white-space: nowrap;
      }
    }

    .item-summary {
      color: #666;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .item-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .item-meta {
        display: flex;
        gap: 16px;

        .meta-item {
          color: #999;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }

      .item-actions {
        display: flex;
        gap: 8px;
      }
    }
  }
}

.load-more {
  text-align: center;
  padding: 20px 0;
}

.hot-topics-card, .policy-card, .feedback-card {
  margin-bottom: 16px;

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
  }
}

.hot-topics {
  .topic-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #f8f9fa;
    }

    &:last-child {
      border-bottom: none;
    }

    .topic-rank {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      color: white;

      &.rank-1 {
        background: #f56c6c;
      }

      &.rank-2 {
        background: #e6a23c;
      }

      &.rank-3 {
        background: #f39c12;
      }

      &:not(.rank-1):not(.rank-2):not(.rank-3) {
        background: #909399;
      }
    }

    .topic-content {
      flex: 1;

      .topic-title {
        font-size: 14px;
        color: #333;
        margin-bottom: 4px;
      }

      .topic-meta {
        font-size: 12px;
        color: #999;

        span {
          margin-right: 12px;
        }
      }
    }

    .topic-trend {
      &.up {
        color: #67c23a;
      }

      &.down {
        color: #f56c6c;
        transform: rotate(180deg);
      }

      &.stable {
        color: #909399;
      }
    }
  }
}

.policy-list {
  .policy-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #f8f9fa;
    }

    &:last-child {
      border-bottom: none;
    }

    .policy-icon {
      font-size: 20px;
      margin-top: 2px;
    }

    .policy-content {
      flex: 1;

      .policy-title {
        font-size: 14px;
        color: #333;
        margin-bottom: 4px;
        font-weight: 500;
      }

      .policy-desc {
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
        line-height: 1.4;
      }

      .policy-time {
        font-size: 12px;
        color: #999;
      }
    }
  }
}

.feedback-section {
  .feedback-stats {
    display: flex;
    justify-content: space-around;
    padding: 16px 0;
    background: #f8f9fa;
    border-radius: 8px;

    .stat-item {
      text-align: center;

      .stat-number {
        display: block;
        font-size: 24px;
        font-weight: bold;
        color: #4a90e2;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: #666;
      }
    }
  }
}

// 详情对话框样式
:deep(.affair-detail-dialog) {
  .el-dialog__body {
    padding: 0 24px 24px;
  }
}

.detail-content {
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 16px;

    .detail-meta {
      display: flex;
      align-items: center;
      gap: 12px;

      .publish-info, .publish-time {
        color: #666;
        font-size: 14px;
      }
    }

    .detail-stats {
      display: flex;
      gap: 16px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #666;
        font-size: 14px;
      }
    }
  }

  .detail-body {
    line-height: 1.6;
    color: #333;
    margin-bottom: 24px;
  }

  .detail-attachments {
    margin-bottom: 24px;

    h4 {
      margin-bottom: 12px;
      color: #333;
    }

    .attachment-list {
      .attachment-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f8f9fa;
        border-radius: 4px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          background: #e8f4fd;
        }

        .attachment-name {
          flex: 1;
          font-size: 14px;
        }

        .attachment-size {
          color: #999;
          font-size: 12px;
        }
      }
    }
  }

  .detail-comments {
    h4 {
      margin-bottom: 16px;
      color: #333;
    }

    .comment-input {
      margin-bottom: 24px;
    }

    .comment-list {
      .comment-item {
        display: flex;
        gap: 12px;
        padding: 16px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .comment-content {
          flex: 1;

          .comment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;

            .comment-author {
              font-weight: 500;
              color: #333;
            }

            .comment-time {
              color: #999;
              font-size: 12px;
            }
          }

          .comment-text {
            color: #666;
            line-height: 1.5;
          }
        }
      }
    }
  }
}

.settings-content {
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .setting-info {
      h4 {
        margin: 0 0 4px 0;
        color: #333;
        font-size: 16px;
      }

      p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }
    }
  }
}

@media (max-width: 768px) {
  .page-header {
    .header-content {
      flex-direction: column;
      gap: 16px;
      text-align: center;
    }
  }

  .category-nav {
    margin: 0 16px 16px;

    .nav-container {
      padding: 12px 16px;
    }
  }

  .main-content {
    padding: 0 16px 16px;
  }

  .search-container {
    flex-direction: column;
    gap: 8px;

    .el-input,
    .el-select,
    .el-button {
      width: 100%;
    }
  }

  .affair-item {
    .item-header {
      flex-direction: column;
      gap: 8px;
    }

    .item-footer {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
  }
}
</style>