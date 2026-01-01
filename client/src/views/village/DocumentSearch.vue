<template>
  <div class="document-search">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="资料搜索"
      left-arrow
      @click-left="$router.go(-1)"
    />

    <!-- 搜索框 -->
    <div class="search-section">
      <van-search
        v-model="searchKeyword"
        placeholder="搜索资料标题、内容、标签..."
        @search="handleSearch"
        @clear="handleClear"
        @focus="showSearchHistory = true"
      />

      <!-- 搜索建议 -->
      <div v-if="searchSuggestions.length > 0" class="search-suggestions">
        <van-cell
          v-for="(suggestion, index) in searchSuggestions"
          :key="index"
          :title="suggestion"
          @click="selectSuggestion(suggestion)"
        />
      </div>

      <!-- 搜索历史 -->
      <div v-if="showSearchHistory && searchHistory.length > 0" class="search-history">
        <van-cell title="搜索历史" />
        <div class="history-tags">
          <van-tag
            v-for="(item, index) in searchHistory"
            :key="index"
            closeable
            @close="removeHistory(index)"
            @click="searchHistoryItem(item)"
            type="primary"
            plain
            size="medium"
            style="margin: 4px"
          >
            {{ item }}
          </van-tag>
        </div>
      </div>
    </div>

    <!-- 高级筛选 -->
    <van-cell-group inset title="高级筛选" v-if="showAdvancedFilters">
      <van-field
        name="category"
        label="资料类别"
        readonly
        clickable
        :value="getCategoryText(filters.category)"
        @click="showCategoryPicker = true"
      />
      <van-field
        name="dateRange"
        label="日期范围"
        readonly
        clickable
        :value="getDateRangeText(filters.dateRange)"
        @click="showDateRangePicker = true"
      />
      <van-field
        name="priority"
        label="优先级"
        readonly
        clickable
        :value="getPriorityText(filters.priority)"
        @click="showPriorityPicker = true"
      />
      <van-field
        name="status"
        label="状态"
        readonly
        clickable
        :value="getStatusText(filters.status)"
        @click="showStatusPicker = true"
      />
    </van-cell-group>

    <!-- 筛选切换按钮 -->
    <div class="filter-toggle">
      <van-button
        :type="showAdvancedFilters ? 'primary' : 'default'"
        size="small"
        icon="filter-o"
        @click="showAdvancedFilters = !showAdvancedFilters"
      >
        {{ showAdvancedFilters ? '隐藏筛选' : '高级筛选' }}
      </van-button>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results" v-if="searchResults.length > 0">
      <van-cell-group inset :title="`搜索结果 (${totalResults})`">
        <van-cell
          v-for="document in searchResults"
          :key="document._id"
          :title="document.title"
          :label="formatDocumentLabel(document)"
          is-link
          @click="viewDocument(document)"
        >
          <template #left-icon>
            <van-icon :name="getDocumentIcon(document.category)" />
          </template>
          <template #right-icon>
            <div class="result-meta">
              <van-tag :type="getPriorityType(document.priority)" size="small">
                {{ getPriorityText(document.priority) }}
              </van-tag>
              <div class="relevance-score">
                匹配度: {{ Math.round(document.relevance * 100) }}%
              </div>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 无结果状态 -->
    <div v-if="searched && searchResults.length === 0" class="no-results">
      <van-empty description="未找到相关资料">
        <van-button type="primary" @click="clearSearch">清空搜索</van-button>
      </van-empty>
    </div>

    <!-- 热门搜索 -->
    <div v-if="!searched && searchResults.length === 0" class="hot-searches">
      <van-cell-group inset title="热门搜索">
        <div class="hot-tags">
          <van-tag
            v-for="(tag, index) in hotSearches"
            :key="index"
            @click="searchHotTag(tag)"
            type="warning"
            plain
            size="medium"
            style="margin: 4px"
          >
            {{ tag }}
          </van-tag>
        </div>
      </van-cell-group>
    </div>

    <!-- 类别选择器 -->
    <van-popup v-model:show="showCategoryPicker" position="bottom">
      <van-picker
        :columns="categoryColumns"
        title="选择类别"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
      />
    </van-popup>

    <!-- 日期范围选择器 -->
    <van-popup v-model:show="showDateRangePicker" position="bottom">
      <van-calendar
        v-model="filters.dateRange"
        title="选择日期范围"
        type="range"
        @confirm="onDateRangeConfirm"
        @cancel="showDateRangePicker = false"
      />
    </van-popup>

    <!-- 优先级选择器 -->
    <van-popup v-model:show="showPriorityPicker" position="bottom">
      <van-picker
        :columns="priorityColumns"
        title="选择优先级"
        @confirm="onPriorityConfirm"
        @cancel="showPriorityPicker = false"
      />
    </van-popup>

    <!-- 状态选择器 -->
    <van-popup v-model:show="showStatusPicker" position="bottom">
      <van-picker
        :columns="statusColumns"
        title="选择状态"
        @confirm="onStatusConfirm"
        @cancel="showStatusPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import villageApi from '@/api/villageManagement'

const router = useRouter()

// 响应式数据
const searchKeyword = ref('')
const showSearchHistory = ref(false)
const showAdvancedFilters = ref(false)
const searched = ref(false)
const searchResults = ref([])
const searchSuggestions = ref([])
const searchHistory = ref([])
const totalResults = ref(0)

// 筛选器
const filters = reactive({
  category: '',
  dateRange: [],
  priority: '',
  status: ''
})

// 选择器状态
const showCategoryPicker = ref(false)
const showDateRangePicker = ref(false)
const showPriorityPicker = ref(false)
const showStatusPicker = ref(false)

// 选择器选项
const categoryColumns = [
  { text: '全部', value: '' },
  { text: '村务', value: 'village_affairs' },
  { text: '村民信息', value: 'resident_info' },
  { text: '财务', value: 'financial' },
  { text: '项目', value: 'project' },
  { text: '会议', value: 'meeting' },
  { text: '政策', value: 'policy' },
  { text: '应急', value: 'emergency' }
]

const priorityColumns = [
  { text: '全部', value: '' },
  { text: '低', value: 'low' },
  { text: '中', value: 'medium' },
  { text: '高', value: 'high' },
  { text: '紧急', value: 'urgent' }
]

const statusColumns = [
  { text: '全部', value: '' },
  { text: '收集中', value: 'collecting' },
  { text: '审核中', value: 'reviewing' },
  { text: '已完成', value: 'approved' },
  { text: '已拒绝', value: 'rejected' },
  { text: '已归档', value: 'archived' }
]

// 热门搜索
const hotSearches = ref([
  '财务报表',
  '会议记录',
  '村民档案',
  '项目申报',
  '政策文件',
  '应急预案'
])

// 方法
const getCategoryText = (value) => {
  const category = categoryColumns.find(item => item.value === value)
  return category ? category.text : '全部'
}

const getPriorityText = (value) => {
  const priority = priorityColumns.find(item => item.value === value)
  return priority ? priority.text : '全部'
}

const getStatusText = (value) => {
  const status = statusColumns.find(item => item.value === value)
  return status ? status.text : '全部'
}

const getDateRangeText = (dateRange) => {
  if (!dateRange || dateRange.length === 0) return '全部'
  if (dateRange.length === 1) return formatDate(dateRange[0])
  return `${formatDate(dateRange[0])} - ${formatDate(dateRange[1])}`
}

const getDocumentIcon = (category) => {
  const iconMap = {
    'village_affairs': 'description',
    'resident_info': 'user-o',
    'financial': 'gold-coin-o',
    'project': 'building-o',
    'meeting': 'chat-o',
    'policy': 'file-text-o',
    'emergency': 'warning-o'
  }
  return iconMap[category] || 'folder-o'
}

const getPriorityType = (priority) => {
  const typeMap = {
    'low': 'success',
    'medium': 'primary',
    'high': 'warning',
    'urgent': 'danger'
  }
  return typeMap[priority] || 'default'
}

const formatDocumentLabel = (document) => {
  const labels = []
  if (document.collector?.name) {
    labels.push(`收集人: ${document.collector.name}`)
  }
  if (document.category) {
    labels.push(`类别: ${getCategoryText(document.category)}`)
  }
  if (document.collectionDate) {
    labels.push(`时间: ${formatDate(document.collectionDate)}`)
  }
  if (document.files?.length) {
    labels.push(`文件数: ${document.files.length}`)
  }
  return labels.join(' • ')
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    showToast('请输入搜索关键词')
    return
  }

  // 添加到搜索历史
  addToHistory(searchKeyword.value.trim())

  searched.value = true
  showSearchHistory.value = false

  try {
    const params = {
      keyword: searchKeyword.value.trim(),
      category: filters.category,
      priority: filters.priority,
      status: filters.status
    }

    if (filters.dateRange && filters.dateRange.length > 0) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }

    const response = await villageApi.searchDocuments(params)
    searchResults.value = response.data.data.docs || []
    totalResults.value = response.data.data.total || 0
  } catch (error) {
    console.error('搜索失败:', error)
    showToast('搜索失败')
  }
}

const handleClear = () => {
  searchKeyword.value = ''
  searchResults.value = []
  totalResults.value = 0
  searched.value = false
  showSearchHistory.value = true
}

const clearSearch = () => {
  handleClear()
  // 重置筛选器
  Object.keys(filters).forEach(key => {
    filters[key] = key === 'dateRange' ? [] : ''
  })
}

const selectSuggestion = (suggestion) => {
  searchKeyword.value = suggestion
  handleSearch()
}

const searchHistoryItem = (item) => {
  searchKeyword.value = item
  handleSearch()
}

const searchHotTag = (tag) => {
  searchKeyword.value = tag
  handleSearch()
}

const viewDocument = (document) => {
  router.push(`/village/documents/${document._id}`)
}

const addToHistory = (keyword) => {
  // 移除重复项
  const index = searchHistory.value.indexOf(keyword)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
  }

  // 添加到最前面
  searchHistory.value.unshift(keyword)

  // 限制历史记录数量
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10)
  }

  // 保存到本地存储
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

const removeHistory = (index) => {
  searchHistory.value.splice(index, 1)
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

const onCategoryConfirm = ({ selectedOptions }) => {
  filters.category = selectedOptions[0].value
  showCategoryPicker.value = false
}

const onDateRangeConfirm = (dateRange) => {
  filters.dateRange = dateRange
  showDateRangePicker.value = false
}

const onPriorityConfirm = ({ selectedOptions }) => {
  filters.priority = selectedOptions[0].value
  showPriorityPicker.value = false
}

const onStatusConfirm = ({ selectedOptions }) => {
  filters.status = selectedOptions[0].value
  showStatusPicker.value = false
}

// 监听搜索关键词变化，生成搜索建议
watch(searchKeyword, (newKeyword) => {
  if (newKeyword.trim().length > 0) {
    // 模拟搜索建议
    searchSuggestions.value = [
      newKeyword + ' 财务',
      newKeyword + ' 报告',
      newKeyword + ' 申请',
      newKeyword + ' 记录'
    ].slice(0, 3)
  } else {
    searchSuggestions.value = []
  }
})

// 生命周期
onMounted(() => {
  // 加载搜索历史
  const history = localStorage.getItem('searchHistory')
  if (history) {
    try {
      searchHistory.value = JSON.parse(history)
    } catch (error) {
      console.error('加载搜索历史失败:', error)
    }
  }
})
</script>

<style scoped>
.document-search {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.search-section {
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-suggestions {
  background: white;
  border-bottom: 1px solid #eee;
}

.search-history {
  background: white;
  padding: 12px 16px;
  border-top: 1px solid #eee;
}

.history-tags,
.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.filter-toggle {
  padding: 12px 16px;
  text-align: center;
}

.search-results {
  margin-bottom: 16px;
}

.result-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.relevance-score {
  font-size: 12px;
  color: #666;
}

.no-results,
.hot-searches {
  margin-top: 32px;
}
</style>