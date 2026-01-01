<template>
  <div class="information-bulletin">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>信息公示</h1>
        <p>政策法规发布、村务通知、便民信息公开</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showPublishDialog">
          <el-icon><EditPen /></el-icon>
          发布公告
        </el-button>
        <el-button @click="showPolicyCalculator">
          <el-icon><Calculator /></el-icon>
          政策计算器
        </el-button>
        <el-button @click="showVoiceSettings">
          <el-icon><Microphone /></el-icon>
          语音设置
        </el-button>
      </div>
    </header>

    <!-- 统计概览 -->
    <section class="stats-section">
      <div class="stats-grid">
        <div class="stat-card announcements">
          <div class="stat-icon">
            <el-icon><Bell /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.announcements }}</div>
            <div class="stat-label">发布公告</div>
          </div>
        </div>
        <div class="stat-card policies">
          <div class="stat-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.policies }}</div>
            <div class="stat-label">政策文件</div>
          </div>
        </div>
        <div class="stat-card today">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.todayPublished }}</div>
            <div class="stat-label">今日发布</div>
          </div>
        </div>
        <div class="stat-card unread">
          <div class="stat-icon">
            <el-icon><Message /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.unreadCount }}</div>
            <div class="stat-label">待读消息</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 信息分类标签 -->
    <section class="category-section">
      <div class="category-header">
        <h3>信息分类</h3>
      </div>
      <div class="category-tags">
        <el-tag
          v-for="category in categories"
          :key="category.value"
          :type="selectedCategory === category.value ? 'primary' : 'info'"
          :effect="selectedCategory === category.value ? 'dark' : 'plain'"
          @click="selectCategory(category.value)"
          class="category-tag"
        >
          {{ category.label }}
        </el-tag>
      </div>
    </section>

    <!-- 快捷搜索 -->
    <section class="search-section">
      <div class="search-content">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索公告标题、内容、关键词..."
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <div class="search-filters">
          <el-select v-model="filterType" placeholder="信息类型" clearable @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option label="公告通知" value="announcement" />
            <el-option label="政策文件" value="policy" />
            <el-option label="村务公开" value="village" />
            <el-option label="财务公示" value="finance" />
            <el-option label="项目公示" value="project" />
          </el-select>
          <el-select v-model="filterPriority" placeholder="优先级" clearable @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option label="紧急" value="urgent" />
            <el-option label="重要" value="important" />
            <el-option label="普通" value="normal" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleSearch"
          />
        </div>
      </div>
    </section>

    <!-- 信息列表 -->
    <section class="bulletin-section">
      <div class="bulletin-list">
        <div
          v-for="item in filteredBulletins"
          :key="item.id"
          class="bulletin-card"
          :class="{ 'urgent': item.priority === 'urgent', 'unread': !item.isRead }"
        >
          <div class="bulletin-header">
            <div class="bulletin-meta">
              <el-tag :type="getTypeColor(item.type)" size="small">
                {{ getTypeText(item.type) }}
              </el-tag>
              <el-tag v-if="item.priority === 'urgent'" type="danger" size="small">
                <el-icon><Warning /></el-icon>
                紧急
              </el-tag>
              <span class="category">{{ getCategoryText(item.category) }}</span>
            </div>
            <div class="bulletin-actions">
              <el-button v-if="item.isRead" type="text" size="small" @click="markAsUnread(item)">
                <el-icon><View /></el-icon>
                标记未读
              </el-button>
              <el-dropdown @command="(command) => handleItemAction(command, item)">
                <el-button type="text" size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">
                      <el-icon><Edit /></el-icon> 编辑
                    </el-dropdown-item>
                    <el-dropdown-item command="share">
                      <el-icon><Share /></el-icon> 分享
                    </el-dropdown-item>
                    <el-dropdown-item command="voice">
                      <el-icon><Microphone /></el-icon> 语音播报
                    </el-dropdown-item>
                    <el-dropdown-item command="top">
                      <el-icon><Top /></el-icon> 置顶
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <el-icon><Delete /></el-icon> 删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <div class="bulletin-content">
            <h3 class="bulletin-title" @click="viewBulletin(item)">
              {{ item.title }}
              <el-icon v-if="item.isTop" class="top-icon"><Top /></el-icon>
            </h3>
            <p class="bulletin-summary">{{ item.summary }}</p>
            <div class="bulletin-footer">
              <div class="publish-info">
                <span class="author">{{ item.author }}</span>
                <span class="time">{{ formatDate(item.publishTime) }}</span>
                <span class="views">阅读 {{ item.readCount }}</span>
              </div>
              <div class="attachments" v-if="item.attachments && item.attachments.length > 0">
                <el-icon><Paperclip /></el-icon>
                <span>{{ item.attachments.length }}个附件</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </section>

    <!-- 发布公告对话框 -->
    <el-dialog
      v-model="publishDialogVisible"
      title="发布公告"
      width="800px"
      @close="resetPublishForm"
    >
      <el-form :model="publishForm" :rules="publishRules" ref="publishFormRef" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="publishForm.title" placeholder="请输入公告标题" />
        </el-form-item>

        <el-form-item label="类型" prop="type">
          <el-select v-model="publishForm.type" placeholder="请选择信息类型">
            <el-option label="公告通知" value="announcement" />
            <el-option label="政策文件" value="policy" />
            <el-option label="村务公开" value="village" />
            <el-option label="财务公示" value="finance" />
            <el-option label="项目公示" value="project" />
          </el-select>
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select v-model="publishForm.category" placeholder="请选择分类">
            <el-option label="村务通知" value="village_notice" />
            <el-option label="政策法规" value="policy_regulation" />
            <el-option label="财务公开" value="finance_disclosure" />
            <el-option label="项目进展" value="project_progress" />
            <el-option label="便民服务" value="service_info" />
            <el-option label="应急通知" value="emergency_notice" />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="publishForm.priority">
            <el-radio label="normal">普通</el-radio>
            <el-radio label="important">重要</el-radio>
            <el-radio label="urgent">紧急</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="内容" prop="content">
          <el-input
            v-model="publishForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入公告内容"
          />
        </el-form-item>

        <el-form-item label="附件上传">
          <el-upload
            action="#"
            multiple
            :file-list="publishForm.attachments"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :before-upload="beforeUpload"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持jpg/png/pdf/doc/docx格式，单个文件不超过10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item label="语音播报">
          <el-switch
            v-model="publishForm.enableVoice"
            active-text="开启"
            inactive-text="关闭"
          />
          <el-select v-if="publishForm.enableVoice" v-model="publishForm.voiceStyle" style="margin-left: 1rem">
            <el-option label="标准播报" value="standard" />
            <el-option label="方言播报" value="dialect" />
          </el-select>
        </el-form-item>

        <el-form-item label="发布设置">
          <el-checkbox-group v-model="publishForm.settings">
            <el-checkbox label="立即发布">立即发布</el-checkbox>
            <el-checkbox label="短信通知">短信通知</el-checkbox>
            <el-checkbox label="微信推送">微信推送</el-checkbox>
            <el-checkbox label="村广播">村广播</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="publishBulletin">发布</el-button>
      </template>
    </el-dialog>

    <!-- 政策计算器对话框 -->
    <el-dialog
      v-model="calculatorDialogVisible"
      title="政策计算器"
      width="700px"
    >
      <div class="calculator-content">
        <el-form :model="calculatorForm" label-width="120px">
          <el-form-item label="政策类型">
            <el-select v-model="calculatorForm.policyType" placeholder="请选择政策类型">
              <el-option label="耕地保护补贴" value="land_subsidy" />
              <el-option label="农业补贴" value="agricultural_subsidy" />
              <el-option label="低保补助" value="low_income_subsidy" />
              <el-option label="养老保险" value="pension_insurance" />
              <el-option label="医保补助" value="medical_insurance" />
            </el-select>
          </el-form-item>

          <el-form-item v-if="calculatorForm.policyType === 'land_subsidy'" label="耕地面积">
            <el-input-number v-model="calculatorForm.landArea" placeholder="请输入耕地面积" :min="0" />
            <span style="margin-left: 10px;">亩</span>
          </el-form-item>

          <el-form-item v-if="calculatorForm.policyType === 'agricultural_subsidy'" label="农业人口">
            <el-input-number v-model="calculatorForm.agriculturalPopulation" placeholder="请输入农业人口数" :min="0" />
            <span style="margin-left: 10px;">人</span>
          </el-form-item>

          <el-form-item v-if="calculatorForm.policyType === 'low_income_subsidy'" label="家庭人口">
            <el-input-number v-model="calculatorForm.familySize" placeholder="请输入家庭人口数" :min="1" />
            <span style="margin-left: 10px;">人</span>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="calculateSubsidy">计算补助金额</el-button>
          </el-form-item>

          <div v-if="calculatorResult.amount" class="calculation-result">
            <h3>计算结果</h3>
            <div class="result-item">
              <span class="label">补助标准:</span>
              <span class="value">{{ calculatorResult.standard }} 元</span>
            </div>
            <div class="result-item">
              <span class="label">计算基数:</span>
              <span class="value">{{ calculatorResult.base }}</span>
            </div>
            <div class="result-item total">
              <span class="label">预计补助金额:</span>
              <span class="value">{{ calculatorResult.amount }} 元</span>
            </div>
            <div class="result-note">
              <el-tag type="info">实际金额以官方审核为准</el-tag>
            </div>
          </div>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  EditPen,
  Calculator,
  Microphone,
  Bell,
  Document,
  Clock,
  Message,
  Search,
  Warning,
  View,
  MoreFilled,
  Edit,
  Share,
  Top,
  Delete,
  Paperclip
} from '@element-plus/icons-vue'

// 响应式数据
const selectedCategory = ref('')
const searchKeyword = ref('')
const filterType = ref('')
const filterPriority = ref('')
const dateRange = ref([])
const publishDialogVisible = ref(false)
const calculatorDialogVisible = ref(false)

const statistics = reactive({
  announcements: 156,
  policies: 89,
  todayPublished: 5,
  unreadCount: 23
})

const categories = [
  { label: '全部', value: '' },
  { label: '村务通知', value: 'village_notice' },
  { label: '政策法规', value: 'policy_regulation' },
  { label: '财务公开', value: 'finance_disclosure' },
  { label: '项目进展', value: 'project_progress' },
  { label: '便民服务', value: 'service_info' },
  { label: '应急通知', value: 'emergency_notice' }
]

const bulletins = ref([
  {
    id: 1,
    title: '关于开展2024年春耕生产工作的通知',
    summary: '为保障春耕生产顺利进行，现就有关事项通知如下...',
    type: 'announcement',
    category: 'village_notice',
    priority: 'important',
    author: '村委办公室',
    publishTime: new Date('2024-01-20 09:30'),
    readCount: 156,
    isRead: true,
    isTop: true,
    attachments: [
      { name: '春耕生产方案.pdf', size: '2.3MB' },
      { name: '农业补贴标准.docx', size: '156KB' }
    ]
  },
  {
    id: 2,
    title: '2024年度耕地地力保护补贴政策实施方案',
    summary: '根据上级文件精神，结合我村实际，制定本实施方案...',
    type: 'policy',
    category: 'policy_regulation',
    priority: 'normal',
    author: '村支书',
    publishTime: new Date('2024-01-19 14:20'),
    readCount: 89,
    isRead: false,
    isTop: false,
    attachments: []
  },
  {
    id: 3,
    title: '紧急通知：今晚暴雨预警，请做好防汛准备',
    summary: '气象部门发布暴雨橙色预警，预计今晚将有强降雨...',
    type: 'announcement',
    category: 'emergency_notice',
    priority: 'urgent',
    author: '应急管理办公室',
    publishTime: new Date('2024-01-20 16:45'),
    readCount: 234,
    isRead: false,
    isTop: true,
    attachments: []
  }
])

const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 发布表单
const publishForm = reactive({
  title: '',
  type: '',
  category: '',
  priority: 'normal',
  content: '',
  attachments: [],
  enableVoice: false,
  voiceStyle: 'standard',
  settings: ['立即发布']
})

const publishRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const publishFormRef = ref(null)

// 政策计算器表单
const calculatorForm = reactive({
  policyType: '',
  landArea: 0,
  agriculturalPopulation: 0,
  familySize: 0
})

const calculatorResult = reactive({
  standard: 0,
  base: '',
  amount: 0
})

// 计算属性
const filteredBulletins = computed(() => {
  return bulletins.value.filter(bulletin => {
    const matchCategory = !selectedCategory.value || bulletin.category === selectedCategory.value
    const matchKeyword = !searchKeyword.value ||
      bulletin.title.includes(searchKeyword.value) ||
      bulletin.summary.includes(searchKeyword.value)
    const matchType = !filterType.value || bulletin.type === filterType.value
    const matchPriority = !filterPriority.value || bulletin.priority === filterPriority.value

    return matchCategory && matchKeyword && matchType && matchPriority
  })
})

// 方法
const selectCategory = (category) => {
  selectedCategory.value = category
}

const getTypeColor = (type) => {
  const colorMap = {
    'announcement': 'primary',
    'policy': 'success',
    'village': 'info',
    'finance': 'warning',
    'project': 'danger'
  }
  return colorMap[type] || 'info'
}

const getTypeText = (type) => {
  const textMap = {
    'announcement': '公告通知',
    'policy': '政策文件',
    'village': '村务公开',
    'finance': '财务公示',
    'project': '项目公示'
  }
  return textMap[type] || type
}

const getCategoryText = (category) => {
  const textMap = {
    'village_notice': '村务通知',
    'policy_regulation': '政策法规',
    'finance_disclosure': '财务公开',
    'project_progress': '项目进展',
    'service_info': '便民服务',
    'emergency_notice': '应急通知'
  }
  return textMap[category] || category
}

const formatDate = (date) => {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString().slice(0, 5)
}

const handleSearch = () => {
  pagination.currentPage = 1
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  handleSearch()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
}

const viewBulletin = (bulletin) => {
  bulletin.isRead = true
  ElMessage.success(`正在查看: ${bulletin.title}`)
}

const markAsUnread = (bulletin) => {
  bulletin.isRead = false
  ElMessage.success('已标记为未读')
}

const handleItemAction = (command, bulletin) => {
  switch (command) {
    case 'edit':
      editBulletin(bulletin)
      break
    case 'share':
      shareBulletin(bulletin)
      break
    case 'voice':
      voiceBroadcast(bulletin)
      break
    case 'top':
      setTopBulletin(bulletin)
      break
    case 'delete':
      deleteBulletin(bulletin)
      break
  }
}

const editBulletin = (bulletin) => {
  Object.assign(publishForm, {
    title: bulletin.title,
    type: bulletin.type,
    category: bulletin.category,
    priority: bulletin.priority,
    content: bulletin.summary
  })
  publishDialogVisible.value = true
}

const shareBulletin = (bulletin) => {
  ElMessage.success(`已分享: ${bulletin.title}`)
}

const voiceBroadcast = (bulletin) => {
  ElMessage.success(`开始语音播报: ${bulletin.title}`)
}

const setTopBulletin = (bulletin) => {
  bulletin.isTop = !bulletin.isTop
  ElMessage.success(bulletin.isTop ? '已置顶' : '已取消置顶')
}

const deleteBulletin = (bulletin) => {
  ElMessageBox.confirm(
    `确定要删除"${bulletin.title}"吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const index = bulletins.value.findIndex(b => b.id === bulletin.id)
    if (index !== -1) {
      bulletins.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  }).catch(() => {})
}

const showPublishDialog = () => {
  publishDialogVisible.value = true
  resetPublishForm()
}

const showPolicyCalculator = () => {
  calculatorDialogVisible.value = true
  resetCalculatorForm()
}

const showVoiceSettings = () => {
  ElMessage.info('语音设置功能开发中...')
}

const resetPublishForm = () => {
  Object.assign(publishForm, {
    title: '',
    type: '',
    category: '',
    priority: 'normal',
    content: '',
    attachments: [],
    enableVoice: false,
    voiceStyle: 'standard',
    settings: ['立即发布']
  })
  if (publishFormRef.value) {
    publishFormRef.value.resetFields()
  }
}

const publishBulletin = async () => {
  if (!publishFormRef.value) return

  try {
    await publishFormRef.value.validate()

    const newBulletin = {
      id: Date.now(),
      ...publishForm,
      author: '当前用户',
      publishTime: new Date(),
      readCount: 0,
      isRead: false,
      isTop: false
    }

    bulletins.value.unshift(newBulletin)
    publishDialogVisible.value = false
    ElMessage.success('公告发布成功')

    if (publishForm.settings.includes('短信通知')) {
      ElMessage.info('短信通知已发送')
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const handleFileChange = (file, fileList) => {
  publishForm.attachments = fileList
}

const handleFileRemove = (file, fileList) => {
  publishForm.attachments = fileList
}

const beforeUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isValidType) {
    ElMessage.error('只能上传jpg/png/pdf/doc/docx格式的文件!')
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过10MB!')
  }
  return isValidType && isLt10M
}

const resetCalculatorForm = () => {
  Object.assign(calculatorForm, {
    policyType: '',
    landArea: 0,
    agriculturalPopulation: 0,
    familySize: 0
  })
  Object.assign(calculatorResult, {
    standard: 0,
    base: '',
    amount: 0
  })
}

const calculateSubsidy = () => {
  switch (calculatorForm.policyType) {
    case 'land_subsidy':
      calculatorResult.standard = 120
      calculatorResult.base = `${calculatorForm.landArea} 亩`
      calculatorResult.amount = calculatorForm.landArea * 120
      break
    case 'agricultural_subsidy':
      calculatorResult.standard = 200
      calculatorResult.base = `${calculatorForm.agriculturalPopulation} 人`
      calculatorResult.amount = calculatorForm.agriculturalPopulation * 200
      break
    case 'low_income_subsidy':
      calculatorResult.standard = 350
      calculatorResult.base = `${calculatorForm.familySize} 人家庭`
      calculatorResult.amount = calculatorForm.familySize * 350
      break
    default:
      ElMessage.warning('请先选择政策类型')
      return
  }

  ElMessage.success('计算完成')
}

// 生命周期
onMounted(() => {
  pagination.total = filteredBulletins.value.length
})
</script>

<style scoped>
.information-bulletin {
  padding: 2rem;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.75rem;
}

.header-content p {
  margin: 0;
  color: #7f8c8d;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.stats-section {
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-card.announcements {
  border-left: 4px solid #3498db;
}

.stat-card.policies {
  border-left: 4px solid #2ecc71;
}

.stat-card.today {
  border-left: 4px solid #f39c12;
}

.stat-card.unread {
  border-left: 4px solid #e74c3c;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.stat-card.announcements .stat-icon {
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.stat-card.policies .stat-icon {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.stat-card.today .stat-icon {
  background: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.stat-card.unread .stat-icon {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
}

.stat-label {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.category-section {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.category-header h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.category-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.category-tag {
  cursor: pointer;
}

.search-section {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.search-content {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  flex: 1;
  min-width: 300px;
}

.search-filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.bulletin-section {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.bulletin-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bulletin-card {
  border: 1px solid #ecf0f1;
  border-radius: 0.5rem;
  padding: 1rem;
  transition: all 0.3s ease;
}

.bulletin-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.bulletin-card.urgent {
  border-left: 4px solid #e74c3c;
  background: rgba(231, 76, 60, 0.05);
}

.bulletin-card.unread {
  border-left: 4px solid #3498db;
}

.bulletin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.bulletin-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.category {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.bulletin-actions {
  display: flex;
  gap: 0.5rem;
}

.bulletin-title {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.top-icon {
  color: #f39c12;
}

.bulletin-summary {
  color: #7f8c8d;
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.bulletin-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: #95a5a6;
}

.publish-info {
  display: flex;
  gap: 1rem;
}

.attachments {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pagination-container {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
}

.calculator-content {
  max-height: 500px;
  overflow-y: auto;
}

.calculation-result {
  background: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 1rem;
}

.calculation-result h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.result-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.result-item.total {
  font-weight: 700;
  font-size: 1.125rem;
  color: #e74c3c;
}

.result-note {
  margin-top: 1rem;
  text-align: center;
}

@media (max-width: 768px) {
  .information-bulletin {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .search-content {
    flex-direction: column;
  }

  .search-filters {
    width: 100%;
    flex-direction: column;
  }

  .bulletin-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .bulletin-footer {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>