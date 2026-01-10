<template>
  <div class="smart-document-search">
    <!-- 搜索头部 -->
    <div class="search-header">
      <van-search
        v-model="searchForm.keyword"
        placeholder="搜索文档、资料、收集记录..."
        @search="handleSearch"
        @clear="handleClear"
        @focus="showSearchHistory = true"
        background="white"
        show-action
      >
        <template #action>
          <div @click="showFilter = true">
            <van-icon name="filter-o" />
          </div>
        </template>
      </van-search>

      <!-- 快捷标签 -->
      <div class="quick-tags" v-if="!searchForm.keyword">
        <van-tag
          v-for="tag in quickTags"
          :key="tag"
          plain
          type="primary"
          size="medium"
          @click="searchByTag(tag)"
        >
          {{ tag }}
        </van-tag>
      </div>
    </div>

    <!-- 搜索历史 -->
    <div class="search-history" v-if="showSearchHistory && searchHistory.length > 0">
      <van-cell-group inset>
        <van-cell>
          <template #title>
            <span class="history-title">搜索历史</span>
          </template>
          <template #right-icon>
            <van-icon name="delete-o" @click="clearSearchHistory" />
          </template>
        </van-cell>
        <van-cell
          v-for="(item, index) in searchHistory"
          :key="index"
          :title="item"
          is-link
          @click="searchByHistory(item)"
        />
      </van-cell-group>
    </div>

    <!-- 高级筛选 -->
    <van-popup v-model:show="showFilter" position="bottom" class="filter-popup">
      <div class="filter-content">
        <div class="filter-header">
          <h3>高级筛选</h3>
          <van-icon name="cross" @click="showFilter = false" />
        </div>

        <van-cell-group inset>
          <van-field label="文档类别">
            <template #input>
              <van-radio-group v-model="searchForm.category" direction="horizontal">
                <van-radio name="">全部</van-radio>
                <van-radio name="village_affairs">村务</van-radio>
                <van-radio name="resident_info">村民信息</van-radio>
                <van-radio name="financial">财务</van-radio>
              </van-radio-group>
            </template>
          </van-field>

          <van-field label="时间范围">
            <template #input>
              <van-radio-group v-model="searchForm.timeRange" direction="horizontal">
                <van-radio name="">全部</van-radio>
                <van-radio name="today">今天</van-radio>
                <van-radio name="week">本周</van-radio>
                <van-radio name="month">本月</van-radio>
              </van-radio-group>
            </template>
          </van-field>

          <van-field label="文件类型">
            <template #input>
              <van-checkbox-group v-model="searchForm.fileTypes" direction="horizontal">
                <van-checkbox name="pdf">PDF</van-checkbox>
                <van-checkbox name="image">图片</van-checkbox>
                <van-checkbox name="doc">文档</van-checkbox>
                <van-checkbox name="other">其他</van-checkbox>
              </van-checkbox-group>
            </template>
          </van-field>

          <van-field label="负责人">
            <template #input>
              <van-button size="small" @click="showCollectorPicker = true">
                {{ selectedCollector.name || '选择负责人' }}
              </van-button>
            </template>
          </van-field>

          <van-field label="状态">
            <template #input>
              <van-radio-group v-model="searchForm.status" direction="horizontal">
                <van-radio name="">全部</van-radio>
                <van-radio name="collecting">收集中</van-radio>
                <van-radio name="reviewing">审核中</van-radio>
                <van-radio name="approved">已完成</van-radio>
              </van-radio-group>
            </template>
          </van-field>
        </van-cell-group>

        <div class="filter-buttons">
          <van-button @click="resetFilter">重置</van-button>
          <van-button type="primary" @click="applyFilter">确定筛选</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 负责人选择器 -->
    <van-popup v-model:show="showCollectorPicker" position="bottom">
      <van-picker
        :columns="collectorOptions"
        title="选择负责人"
        @confirm="onCollectorConfirm"
        @cancel="showCollectorPicker = false"
      />
    </van-popup>

    <!-- 搜索结果 -->
    <div class="search-results" v-if="searchResults.length > 0 || isSearching">
      <van-cell-group inset>
        <van-cell>
          <template #title>
            <span class="result-title">搜索结果</span>
            <span class="result-count" v-if="!isSearching"> ({{ totalCount }}条) </span>
          </template>
          <template #right-icon>
            <van-icon name="sort" @click="showSortPicker = true" />
          </template>
        </van-cell>

        <!-- 搜索中状态 -->
        <van-cell v-if="isSearching">
          <template #default>
            <div class="searching">
              <van-loading size="16px" />
              <span>搜索中...</span>
            </div>
          </template>
        </van-cell>

        <!-- 搜索结果列表 -->
        <van-cell
          v-for="result in searchResults"
          :key="result._id"
          :title="result.title"
          :label="formatResultLabel(result)"
          is-link
          @click="openDocument(result)"
        >
          <template #left-icon>
            <van-icon :name="getFileIcon(result)" :color="getFileColor(result)" />
          </template>
          <template #right-icon>
            <div class="result-meta">
              <van-tag :type="getStatusType(result.status)" size="small">
                {{ getStatusText(result.status) }}
              </van-tag>
              <span class="result-time">{{ formatTime(result.collectionDate) }}</span>
            </div>
          </template>
        </van-cell>

        <!-- 加载更多 -->
        <van-cell v-if="hasMore && !isSearching" title="加载更多" is-link @click="loadMore">
          <template #right-icon>
            <van-icon name="arrow-down" />
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-if="!isSearching && searchResults.length === 0 && hasSearched">
      <van-empty description="没有找到相关文档" />
      <van-button plain type="primary" @click="handleClear">清除筛选</van-button>
    </div>

    <!-- AI推荐 -->
    <div class="ai-recommendations" v-if="!hasSearched && recommendations.length > 0">
      <van-cell-group inset>
        <van-cell>
          <template #title>
            <span class="recommendation-title">🤖 AI推荐</span>
          </template>
        </van-cell>
        <van-cell
          v-for="item in recommendations"
          :key="item._id"
          :title="item.title"
          :label="`推荐理由: ${item.reason}`"
          is-link
          @click="openDocument(item)"
        >
          <template #left-icon>
            <van-icon name="fire" color="#ff6b35" />
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 排序选择器 -->
    <van-action-sheet
      v-model:show="showSortPicker"
      :actions="sortOptions"
      @select="handleSort"
      cancel-text="取消"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import villageApi from '@/api/villageManagement';

const router = useRouter();

// 响应式数据
const searchForm = reactive({
  keyword: '',
  category: '',
  timeRange: '',
  fileTypes: [],
  collectorId: '',
  status: '',
  sortBy: 'relevance',
  page: 1,
  limit: 20,
});

const showFilter = ref(false);
const showSearchHistory = ref(false);
const showCollectorPicker = ref(false);
const showSortPicker = ref(false);
const isSearching = ref(false);
const hasSearched = ref(false);
const hasMore = ref(true);
const totalCount = ref(0);

const searchResults = ref([]);
const searchHistory = ref([]);
const recommendations = ref([]);
const collectors = ref([]);
const selectedCollector = ref({});

const quickTags = ref(['重要文件', '会议纪要', '财务报表', '村民档案', '应急预案', '工作计划']);

const sortOptions = ref([
  { name: '相关度排序', value: 'relevance' },
  { name: '时间排序', value: 'time' },
  { name: '热度排序', value: 'popularity' },
  { name: '按类别分组', value: 'category' },
]);

const collectorOptions = computed(() => {
  return collectors.value.map(c => ({
    text: `${c.name} - ${c.position}`,
    value: c.userId,
  }));
});

// 方法
const loadCollectors = async () => {
  try {
    // 获取收集人员列表
    const response = await villageApi.getVillageUsers('village_id_here', { role: 'staff' });
    collectors.value = response.data.data.docs || [];
  } catch (error) {
    console.error('获取收集人员失败:', error);
  }
};

const loadRecommendations = async () => {
  try {
    // 模拟AI推荐数据
    recommendations.value = [
      {
        _id: '1',
        title: '2024年村委会工作计划',
        reason: '基于您最近的工作内容推荐',
        collectionDate: new Date(),
      },
      {
        _id: '2',
        title: '村民信息统计表',
        reason: '这是本月最常访问的文档',
        collectionDate: new Date(),
      },
    ];
  } catch (error) {
    console.error('获取推荐失败:', error);
  }
};

const handleSearch = async () => {
  if (!searchForm.keyword.trim() && !hasActiveFilters()) {
    showToast('请输入搜索关键词或选择筛选条件');
    return;
  }

  isSearching.value = true;
  hasSearched.value = true;
  searchResults.value = [];
  searchForm.page = 1;

  try {
    const response = await villageApi.searchDocuments(buildSearchParams());
    searchResults.value = response.data.data || [];
    totalCount.value = response.data.data?.length || 0;
    hasMore.value = searchResults.value.length >= searchForm.limit;

    // 添加到搜索历史
    addToSearchHistory(searchForm.keyword);
  } catch (error) {
    console.error('搜索失败:', error);
    showToast('搜索失败');
  } finally {
    isSearching.value = false;
    showSearchHistory.value = false;
  }
};

const loadMore = async () => {
  if (!hasMore.value || isSearching.value) return;

  isSearching.value = true;
  searchForm.page++;

  try {
    const response = await villageApi.searchDocuments(buildSearchParams());
    const newResults = response.data.data || [];
    searchResults.value.push(...newResults);
    hasMore.value = newResults.length >= searchForm.limit;
  } catch (error) {
    console.error('加载更多失败:', error);
    showToast('加载失败');
  } finally {
    isSearching.value = false;
  }
};

const buildSearchParams = () => {
  const params = {
    searchTerm: searchForm.keyword,
    page: searchForm.page,
    limit: searchForm.limit,
    sortBy: searchForm.sortBy,
  };

  if (searchForm.category) params.category = searchForm.category;
  if (searchForm.collectorId) params.collectorId = searchForm.collectorId;
  if (searchForm.status) params.status = searchForm.status;

  // 处理时间范围
  if (searchForm.timeRange) {
    const now = new Date();
    const startDate = new Date();

    switch (searchForm.timeRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    params.dateFrom = startDate.toISOString().split('T')[0];
    params.dateTo = now.toISOString().split('T')[0];
  }

  return params;
};

const hasActiveFilters = () => {
  return (
    searchForm.category ||
    searchForm.timeRange ||
    searchForm.fileTypes.length > 0 ||
    searchForm.collectorId ||
    searchForm.status
  );
};

const handleClear = () => {
  searchForm.keyword = '';
  searchForm.category = '';
  searchForm.timeRange = '';
  searchForm.fileTypes = [];
  searchForm.collectorId = '';
  searchForm.status = '';
  searchForm.page = 1;
  selectedCollector.value = {};

  searchResults.value = [];
  hasSearched.value = false;
  hasMore.value = true;
  totalCount.value = 0;
};

const handleSort = action => {
  searchForm.sortBy = action.value;
  showSortPicker.value = false;

  if (hasSearched) {
    handleSearch();
  }
};

const searchByTag = tag => {
  searchForm.keyword = tag;
  handleSearch();
};

const searchByHistory = keyword => {
  searchForm.keyword = keyword;
  showSearchHistory.value = false;
  handleSearch();
};

const onCollectorConfirm = option => {
  const collector = collectors.value.find(c => c.userId === option.value);
  selectedCollector.value = collector || {};
  searchForm.collectorId = option.value;
  showCollectorPicker.value = false;
};

const applyFilter = () => {
  showFilter.value = false;
  handleSearch();
};

const resetFilter = () => {
  searchForm.category = '';
  searchForm.timeRange = '';
  searchForm.fileTypes = [];
  searchForm.collectorId = '';
  searchForm.status = '';
  selectedCollector.value = {};
};

const openDocument = document => {
  router.push(`/village/documents/${document._id}`);
};

const addToSearchHistory = keyword => {
  if (!keyword.trim()) return;

  const history = [...searchHistory.value];
  const index = history.indexOf(keyword);

  if (index > -1) {
    history.splice(index, 1);
  }

  history.unshift(keyword);
  searchHistory.value = history.slice(0, 10);

  // 保存到本地存储
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value));
};

const clearSearchHistory = () => {
  searchHistory.value = [];
  localStorage.removeItem('searchHistory');
};

// 格式化方法
const formatResultLabel = result => {
  const labels = [];

  if (result.collector?.name) {
    labels.push(`收集人: ${result.collector.name}`);
  }

  if (result.category) {
    labels.push(`类别: ${getCategoryText(result.category)}`);
  }

  if (result.files?.length) {
    labels.push(`文件数: ${result.files.length}`);
  }

  return labels.join(' • ');
};

const formatTime = time => {
  const date = new Date(time);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    return date.toLocaleDateString();
  }
};

const getFileIcon = result => {
  if (result.files?.length > 0) {
    const firstFile = result.files[0];
    if (firstFile.mimeType?.startsWith('image/')) {
      return 'photo-o';
    } else if (firstFile.mimeType?.includes('pdf')) {
      return 'description';
    } else if (firstFile.mimeType?.includes('word')) {
      return 'edit';
    } else if (firstFile.mimeType?.includes('excel')) {
      return 'chart-trending-o';
    }
  }
  return 'folder-o';
};

const getFileColor = result => {
  if (result.status === 'approved') {
    return '#52c41a';
  } else if (result.status === 'reviewing') {
    return '#faad14';
  } else {
    return '#1890ff';
  }
};

const getStatusType = status => {
  const statusMap = {
    collecting: 'primary',
    reviewing: 'warning',
    approved: 'success',
    rejected: 'danger',
    archived: 'default',
  };
  return statusMap[status] || 'default';
};

const getStatusText = status => {
  const statusMap = {
    collecting: '收集中',
    reviewing: '审核中',
    approved: '已完成',
    rejected: '已拒绝',
    archived: '已归档',
  };
  return statusMap[status] || status;
};

const getCategoryText = category => {
  const categoryMap = {
    village_affairs: '村务',
    resident_info: '村民信息',
    financial: '财务',
    project: '项目',
    meeting: '会议',
    policy: '政策',
    emergency: '应急',
    statistics: '统计',
    other: '其他',
  };
  return categoryMap[category] || category;
};

// 生命周期
onMounted(async () => {
  // 加载搜索历史
  const history = localStorage.getItem('searchHistory');
  if (history) {
    searchHistory.value = JSON.parse(history);
  }

  // 加载收集人员
  await loadCollectors();

  // 加载推荐
  await loadRecommendations();
});
</script>

<style scoped>
.smart-document-search {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.search-header {
  background: white;
  padding: 0 0 16px 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.quick-tags {
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search-history {
  margin-bottom: 16px;
}

.history-title {
  font-weight: 600;
  color: #333;
}

.filter-popup {
  height: 80vh;
}

.filter-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.filter-header h3 {
  margin: 0;
  font-size: 18px;
}

.filter-buttons {
  display: flex;
  gap: 12px;
  padding: 16px;
  margin-top: auto;
}

.filter-buttons .van-button {
  flex: 1;
}

.search-results {
  margin-bottom: 16px;
}

.result-title {
  font-weight: 600;
  color: #333;
}

.result-count {
  color: #999;
  font-size: 14px;
  margin-left: 8px;
}

.searching {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #999;
}

.result-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.result-time {
  font-size: 12px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.ai-recommendations {
  margin-bottom: 16px;
}

.recommendation-title {
  font-weight: 600;
  color: #333;
}
</style>
