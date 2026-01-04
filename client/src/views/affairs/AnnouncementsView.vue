<template>
  <div class="affairs-management">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">村务协同管理</h1>
        <p class="page-description">公告发布、会议管理、投票系统、政策宣传</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showPublishDialog" icon="Plus">发布公告</el-button>
        <el-button @click="showMeetingDialog" icon="Calendar">发起会议</el-button>
        <el-button @click="showVoteDialog" icon="Vote">发起投票</el-button>
      </div>
    </div>

    <!-- 功能选项卡 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="affairs-tabs">
      <el-tab-pane label="公告管理" name="announcements">
        <div class="tab-content">
          <!-- 搜索筛选 -->
          <el-card class="search-card">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-input
                  v-model="searchQuery.announcement"
                  placeholder="搜索公告标题或内容"
                  clearable
                  @keyup.enter="searchAnnouncements"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-col>
              <el-col :span="4">
                <el-select v-model="filterQuery.type" placeholder="公告类型" clearable>
                  <el-option label="全部" value="" />
                  <el-option label="通知公告" value="notice" />
                  <el-option label="政策宣传" value="policy" />
                  <el-option label="活动通知" value="activity" />
                  <el-option label="应急通知" value="emergency" />
                </el-select>
              </el-col>
              <el-col :span="4">
                <el-select v-model="filterQuery.status" placeholder="发布状态" clearable>
                  <el-option label="全部" value="" />
                  <el-option label="已发布" value="published" />
                  <el-option label="草稿" value="draft" />
                  <el-option label="已撤回" value="withdrawn" />
                </el-select>
              </el-col>
              <el-col :span="4">
                <el-button type="primary" @click="searchAnnouncements" icon="Search">搜索</el-button>
              </el-col>
            </el-row>
          </el-card>

          <!-- 公告列表 -->
          <el-card class="list-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">公告列表</span>
                <div class="header-actions">
                  <el-button size="small" @click="batchPublish" :disabled="!selectedAnnouncements.length">
                    批量发布
                  </el-button>
                  <el-button size="small" @click="batchWithdraw" :disabled="!selectedAnnouncements.length">
                    批量撤回
                  </el-button>
                </div>
              </div>
            </template>

            <el-table
              :data="paginatedAnnouncements"
              stripe
              @selection-change="handleSelectionChange"
              style="width: 100%"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column prop="title" label="标题" min-width="200">
                <template #default="scope">
                  <div class="announcement-title" @click="viewAnnouncement(scope.row)">
                    {{ scope.row.title }}
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="type" label="类型" width="100">
                <template #default="scope">
                  <el-tag :type="getAnnouncementTypeColor(scope.row.type)">
                    {{ getAnnouncementTypeText(scope.row.type) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="author" label="发布人" width="100" />

              <el-table-column prop="publishTime" label="发布时间" width="160">
                <template #default="scope">
                  <span v-if="scope.row.publishTime">
                    {{ formatDateTime(scope.row.publishTime) }}
                  </span>
                  <span v-else class="text-gray">-</span>
                </template>
              </el-table-column>

              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getStatusColor(scope.row.status)">
                    {{ getStatusText(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="views" label="阅读量" width="80" />

              <el-table-column label="操作" width="200" fixed="right">
                <template #default="scope">
                  <el-button link type="primary" @click="viewAnnouncement(scope.row)">
                    详情
                  </el-button>
                  <el-button link type="warning" @click="editAnnouncement(scope.row)">
                    编辑
                  </el-button>
                  <el-button
                    v-if="scope.row.status === 'published'"
                    link
                    type="danger"
                    @click="withdrawAnnouncement(scope.row)"
                  >
                    撤回
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-container">
              <el-pagination
                v-model:current-page="currentPage.announcements"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="filteredAnnouncements.length"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="会议管理" name="meetings">
        <div class="tab-content">
          <!-- 会议列表 -->
          <el-card class="list-card">
            <template #header>
              <span class="card-title">会议安排</span>
            </template>

            <el-table :data="meetings" stripe style="width: 100%">
              <el-table-column prop="title" label="会议主题" min-width="200" />
              <el-table-column prop="dateTime" label="会议时间" width="180">
                <template #default="scope">
                  {{ formatDateTime(scope.row.dateTime) }}
                </template>
              </el-table-column>
              <el-table-column prop="location" label="地点" width="120" />
              <el-table-column prop="organizer" label="组织者" width="100" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getMeetingStatusColor(scope.row.status)">
                    {{ getMeetingStatusText(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="participants" label="参与人数" width="100" />
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="scope">
                  <el-button link type="primary" @click="viewMeeting(scope.row)">详情</el-button>
                  <el-button link type="warning" @click="editMeeting(scope.row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="投票系统" name="voting">
        <div class="tab-content">
          <!-- 投票列表 -->
          <el-card class="list-card">
            <template #header>
              <span class="card-title">投票活动</span>
            </template>

            <el-table :data="votes" stripe style="width: 100%">
              <el-table-column prop="title" label="投票主题" min-width="200" />
              <el-table-column prop="endTime" label="截止时间" width="180">
                <template #default="scope">
                  {{ formatDateTime(scope.row.endTime) }}
                </template>
              </el-table-column>
              <el-table-column prop="creator" label="发起人" width="100" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getVoteStatusColor(scope.row.status)">
                    {{ getVoteStatusText(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="participation" label="参与率" width="100">
                <template #default="scope">
                  {{ scope.row.participation }}%
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="scope">
                  <el-button link type="primary" @click="viewVote(scope.row)">查看</el-button>
                  <el-button link type="success" @click="publishVote(scope.row)" v-if="scope.row.status === 'draft'">
                    发布
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 发布公告对话框 -->
    <el-dialog v-model="publishDialogVisible" title="发布公告" width="800px">
      <el-form :model="announcementForm" :rules="announcementRules" ref="announcementFormRef" label-width="100px">
        <el-form-item label="公告标题" prop="title">
          <el-input v-model="announcementForm.title" placeholder="请输入公告标题" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="公告类型" prop="type">
              <el-select v-model="announcementForm.type" placeholder="请选择类型">
                <el-option label="通知公告" value="notice" />
                <el-option label="政策宣传" value="policy" />
                <el-option label="活动通知" value="activity" />
                <el-option label="应急通知" value="emergency" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级">
              <el-select v-model="announcementForm.priority" placeholder="请选择优先级">
                <el-option label="普通" value="normal" />
                <el-option label="重要" value="important" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="公告内容" prop="content">
          <el-input
            v-model="announcementForm.content"
            type="textarea"
            :rows="8"
            placeholder="请输入公告内容"
          />
        </el-form-item>

        <el-form-item label="附件上传">
          <el-upload
            class="upload-demo"
            action="#"
            multiple
            :auto-upload="false"
            :file-list="announcementForm.attachments"
            @change="handleFileChange"
          >
            <el-button icon="Upload">点击上传</el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持jpg/png/pdf文件，单个文件不超过10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="发布时间">
              <el-date-picker
                v-model="announcementForm.publishTime"
                type="datetime"
                placeholder="选择发布时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="撤回时间">
              <el-date-picker
                v-model="announcementForm.withdrawTime"
                type="datetime"
                placeholder="选择撤回时间（可选）"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="推送设置">
          <el-checkbox-group v-model="announcementForm.channels">
            <el-checkbox label="app">APP推送</el-checkbox>
            <el-checkbox label="sms">短信通知</el-checkbox>
            <el-checkbox label="wechat">微信群</el-checkbox>
            <el-checkbox label="phone">电话通知</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button @click="saveDraft" :loading="saving">保存草稿</el-button>
        <el-button type="primary" @click="publishAnnouncement" :loading="saving">立即发布</el-button>
      </template>
    </el-dialog>

    <!-- 公告详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="公告详情" width="800px">
      <div v-if="currentAnnouncement" class="announcement-detail">
        <div class="detail-header">
          <h2>{{ currentAnnouncement.title }}</h2>
          <div class="detail-meta">
            <el-tag :type="getAnnouncementTypeColor(currentAnnouncement.type)">
              {{ getAnnouncementTypeText(currentAnnouncement.type) }}
            </el-tag>
            <span class="meta-item">发布人：{{ currentAnnouncement.author }}</span>
            <span class="meta-item">发布时间：{{ formatDateTime(currentAnnouncement.publishTime) }}</span>
            <span class="meta-item">阅读量：{{ currentAnnouncement.views }}</span>
          </div>
        </div>

        <div class="detail-content">
          <div class="content-text">{{ currentAnnouncement.content }}</div>

          <div v-if="currentAnnouncement.attachments && currentAnnouncement.attachments.length" class="attachments">
            <h4>附件下载</h4>
            <div class="attachment-list">
              <el-link
                v-for="(file, index) in currentAnnouncement.attachments"
                :key="index"
                type="primary"
                :href="file.url"
                target="_blank"
                class="attachment-item"
              >
                <el-icon><Download /></el-icon>
                {{ file.name }}
              </el-link>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { axiosInstance as api } from '@/api'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()

// 从数据库加载公告数据
const loadAnnouncements = async () => {
  try {
    const response = await api.get('/api/v1/announcements')
    if (response.success) {
      announcements.value = response.data || []
    }
  } catch (error) {
    console.error('加载公告数据失败:', error)
    ElMessage.warning('加载数据失败，显示模拟数据')
  }
}

// 响应式数据
const activeTab = ref('announcements')
const publishDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const saving = ref(false)
const currentAnnouncement = ref(null)
const announcementFormRef = ref()
const selectedAnnouncements = ref([])

// 搜索和筛选
const searchQuery = reactive({
  announcement: ''
})

const filterQuery = reactive({
  type: '',
  status: ''
})

// 分页
const currentPage = reactive({
  announcements: 1,
  meetings: 1,
  voting: 1
})
const pageSize = ref(20)

// 公告表单
const announcementForm = reactive({
  title: '',
  type: 'notice',
  priority: 'normal',
  content: '',
  attachments: [],
  publishTime: '',
  withdrawTime: '',
  channels: ['app']
})

// 表单验证规则
const announcementRules = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择公告类型', trigger: 'change' }],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }]
}

// 模拟数据
const announcements = ref([
  {
    id: 1,
    title: '关于2025年春节放假安排的通知',
    type: 'notice',
    content: '根据上级通知精神，结合我村实际情况，现将2025年春节放假安排通知如下...',
    author: '村办公室',
    publishTime: '2024-12-10T09:00:00',
    status: 'published',
    priority: 'important',
    views: 156,
    attachments: [
      { name: '春节放假安排.pdf', url: '#' },
      { name: '值班表.xlsx', url: '#' }
    ]
  },
  {
    id: 2,
    title: '智慧村庄建设项目启动仪式',
    type: 'activity',
    content: '为推进乡村振兴战略实施，我村将举行智慧村庄建设项目启动仪式...',
    author: '村主任',
    publishTime: '2024-12-08T14:30:00',
    status: 'published',
    priority: 'normal',
    views: 89,
    attachments: []
  },
  {
    id: 3,
    title: '疫情防控应急响应预案',
    type: 'emergency',
    content: '为做好新冠肺炎疫情防控工作，保障村民身体健康和生命安全...',
    author: '村委',
    publishTime: '2024-12-05T08:00:00',
    status: 'draft',
    priority: 'urgent',
    views: 0,
    attachments: []
  }
])

const meetings = ref([
  {
    id: 1,
    title: '第四季度村委工作会议',
    dateTime: '2024-12-20T14:00:00',
    location: '村委会议室',
    organizer: '村支书',
    status: 'scheduled',
    participants: 8,
    agenda: ['总结四季度工作', '部署明年计划', '讨论重点项目']
  },
  {
    id: 2,
    title: '村民代表会议',
    dateTime: '2024-12-25T09:00:00',
    location: '文化礼堂',
    organizer: '村主任',
    status: 'scheduled',
    participants: 35,
    agenda: ['村务公开', '财务报告', '项目表决']
  }
])

const votes = ref([
  {
    id: 1,
    title: '关于修建村文化广场的投票',
    endTime: '2024-12-31T23:59:59',
    creator: '村委',
    status: 'active',
    participation: 65,
    options: ['支持', '反对', '弃权'],
    results: { '支持': 156, '反对': 12, '弃权': 8 }
  },
  {
    id: 2,
    title: '2025年村规民约修订草案',
    endTime: '2024-12-28T18:00:00',
    creator: '村委',
    status: 'draft',
    participation: 0,
    options: ['同意', '反对'],
    results: {}
  }
])

// 计算属性
const filteredAnnouncements = computed(() => {
  return announcements.value.filter(item => {
    const matchSearch = !searchQuery.announcement ||
      item.title.includes(searchQuery.announcement) ||
      item.content.includes(searchQuery.announcement)
    const matchType = !filterQuery.type || item.type === filterQuery.type
    const matchStatus = !filterQuery.status || item.status === filterQuery.status
    return matchSearch && matchType && matchStatus
  })
})

const paginatedAnnouncements = computed(() => {
  const start = (currentPage.announcements - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredAnnouncements.value.slice(start, end)
})

// 方法
const handleTabChange = (tabName) => {
  console.log('切换到标签页:', tabName)
}

const getAnnouncementTypeColor = (type) => {
  const colorMap = {
    'notice': 'primary',
    'policy': 'success',
    'activity': 'warning',
    'emergency': 'danger'
  }
  return colorMap[type] || 'info'
}

const getAnnouncementTypeText = (type) => {
  const textMap = {
    'notice': '通知公告',
    'policy': '政策宣传',
    'activity': '活动通知',
    'emergency': '应急通知'
  }
  return textMap[type] || '未知'
}

const getStatusColor = (status) => {
  const colorMap = {
    'published': 'success',
    'draft': 'info',
    'withdrawn': 'danger'
  }
  return colorMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'published': '已发布',
    'draft': '草稿',
    'withdrawn': '已撤回'
  }
  return textMap[status] || '未知'
}

const getMeetingStatusColor = (status) => {
  const colorMap = {
    'scheduled': 'primary',
    'ongoing': 'success',
    'completed': 'info',
    'cancelled': 'danger'
  }
  return colorMap[status] || 'info'
}

const getMeetingStatusText = (status) => {
  const textMap = {
    'scheduled': '已安排',
    'ongoing': '进行中',
    'completed': '已结束',
    'cancelled': '已取消'
  }
  return textMap[status] || '未知'
}

const getVoteStatusColor = (status) => {
  const colorMap = {
    'active': 'success',
    'draft': 'info',
    'completed': 'info',
    'cancelled': 'danger'
  }
  return colorMap[status] || 'info'
}

const getVoteStatusText = (status) => {
  const textMap = {
    'active': '进行中',
    'draft': '草稿',
    'completed': '已结束',
    'cancelled': '已取消'
  }
  return textMap[status] || '未知'
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

const searchAnnouncements = () => {
  currentPage.announcements = 1
}

const handleSelectionChange = (selection) => {
  selectedAnnouncements.value = selection
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.announcements = 1
}

const handleCurrentChange = (page) => {
  currentPage.announcements = page
}

const showPublishDialog = () => {
  resetAnnouncementForm()
  publishDialogVisible.value = true
}

const resetAnnouncementForm = () => {
  Object.assign(announcementForm, {
    title: '',
    type: 'notice',
    priority: 'normal',
    content: '',
    attachments: [],
    publishTime: '',
    withdrawTime: '',
    channels: ['app']
  })
}

const handleFileChange = (file, fileList) => {
  announcementForm.attachments = fileList
}

const saveDraft = async () => {
  if (!announcementFormRef.value) return

  try {
    await announcementFormRef.value.validate()
    saving.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newAnnouncement = {
      ...announcementForm,
      id: Date.now(),
      author: '当前用户',
      status: 'draft',
      views: 0,
      publishTime: announcementForm.publishTime || null
    }

    announcements.value.push(newAnnouncement)
    ElMessage.success('保存草稿成功')
    publishDialogVisible.value = false
  } catch (error) {
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

const publishAnnouncement = async () => {
  if (!announcementFormRef.value) return

  try {
    await announcementFormRef.value.validate()
    saving.value = true

    // 调用API发布公告
    const response = await api.post('/api/v1/announcements', {
      ...announcementForm,
      publisher: userStore.userInfo?.name || '系统管理员',
      villageId: userStore.userInfo?.villageId || null
    })

    if (response.success) {
      announcements.value.unshift(response.data)
      ElMessage.success('公告发布成功')
      publishDialogVisible.value = false
      resetAnnouncementForm()
    } else {
      ElMessage.error(response.message || '发布失败')
    }
  } catch (error) {
    console.error('发布公告失败:', error)
    ElMessage.error(error.response?.data?.error || error.message || '发布失败')
  } finally {
    saving.value = false
  }
}

const viewAnnouncement = (announcement) => {
  currentAnnouncement.value = announcement
  detailDialogVisible.value = true

  // 增加阅读量
  announcement.views++
}

const editAnnouncement = (announcement) => {
  Object.assign(announcementForm, announcement)
  publishDialogVisible.value = true
}

const withdrawAnnouncement = async (announcement) => {
  try {
    await ElMessageBox.confirm(
      `确定要撤回公告"${announcement.title}"吗？`,
      '确认撤回',
      { type: 'warning' }
    )

    // 调用API撤回公告
    const response = await api.put(`/api/v1/announcements/${announcement.id}/withdraw`)
    if (response.success) {
      announcement.status = 'withdrawn'
      ElMessage.success('公告已撤回')
    } else {
      ElMessage.error(response.message || '撤回失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('撤回公告失败:', error)
      ElMessage.error(error.response?.data?.error || error.message || '撤回失败')
    }
  }
}

const batchPublish = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要发布选中的 ${selectedAnnouncements.value.length} 个公告吗？`,
      '确认发布',
      { type: 'warning' }
    )

    selectedAnnouncements.value.forEach(item => {
      if (item.status === 'draft') {
        item.status = 'published'
        item.publishTime = new Date().toISOString()
      }
    })

    ElMessage.success(`已成功发布 ${selectedAnnouncements.value.length} 个公告`)
    selectedAnnouncements.value = []
  } catch {
    // 用户取消
  }
}

const batchWithdraw = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要撤回选中的 ${selectedAnnouncements.value.length} 个公告吗？`,
      '确认撤回',
      { type: 'warning' }
    )

    selectedAnnouncements.value.forEach(item => {
      if (item.status === 'published') {
        item.status = 'withdrawn'
      }
    })

    ElMessage.success(`已成功撤回 ${selectedAnnouncements.value.length} 个公告`)
    selectedAnnouncements.value = []
  } catch {
    // 用户取消
  }
}

const showMeetingDialog = () => {
  ElMessage.info('会议管理功能开发中...')
}

const showVoteDialog = () => {
  ElMessage.info('投票管理功能开发中...')
}

const viewMeeting = (meeting) => {
  ElMessage.info(`查看会议：${meeting.title}`)
}

const editMeeting = (meeting) => {
  ElMessage.info(`编辑会议：${meeting.title}`)
}

const viewVote = (vote) => {
  ElMessage.info(`查看投票：${vote.title}`)
}

const publishVote = (vote) => {
  ElMessage.info(`发布投票：${vote.title}`)
}

onMounted(() => {
  console.log('村务协同管理模块加载完成')
  // 加载公告数据
  loadAnnouncements()
})
</script>

<style lang="scss" scoped>
.affairs-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;

  .header-left {
    .page-title {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    .page-description {
      margin: 0;
      color: #606266;
      font-size: 14px;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

.affairs-tabs {
  :deep(.el-tabs__content) {
    padding: 0;
  }

  .tab-content {
    .search-card {
      margin-bottom: 20px;
    }

    .list-card {
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .card-title {
          font-weight: 600;
          color: #303133;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }
      }

      .announcement-title {
        color: #409EFF;
        cursor: pointer;

        &:hover {
          text-decoration: underline;
        }
      }

      .pagination-container {
        margin-top: 20px;
        display: flex;
        justify-content: center;
      }
    }
  }
}

.text-gray {
  color: #909399;
}

.announcement-detail {
  .detail-header {
    border-bottom: 1px solid #ebeef5;
    padding-bottom: 16px;
    margin-bottom: 20px;

    h2 {
      margin: 0 0 12px 0;
      color: #303133;
    }

    .detail-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;

      .meta-item {
        color: #606266;
        font-size: 14px;
      }
    }
  }

  .detail-content {
    .content-text {
      line-height: 1.6;
      color: #303133;
      margin-bottom: 20px;
      white-space: pre-wrap;
    }

    .attachments {
      h4 {
        margin: 0 0 12px 0;
        color: #303133;
      }

      .attachment-list {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .attachment-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }
    }
  }
}
</style>