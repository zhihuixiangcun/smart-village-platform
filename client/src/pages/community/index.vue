<template>
  <div class="community-home">
    <div class="community-header">
      <h1>社区互动</h1>
      <p class="subtitle">共建和谐乡村,共享美好家园</p>
    </div>

    <div class="community-tabs">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all"></el-tab-pane>
        <el-tab-pane label="论坛" name="forum"></el-tab-pane>
        <el-tab-pane label="邻里互助" name="mutual-aid"></el-tab-pane>
        <el-tab-pane label="活动广场" name="activities"></el-tab-pane>
        <el-tab-pane label="意见箱" name="suggestions"></el-tab-pane>
        <el-tab-pane label="二手市场" name="marketplace"></el-tab-pane>
      </el-tabs>
    </div>

    <div class="community-content" v-loading="loading">
      <el-row :gutter="20">
        <el-col :span="18">
          <div class="content-area">
            <div v-if="activeTab === 'all'" class="all-content">
              <div class="section-title">
                <h2>最新动态</h2>
                <el-button link @click="activeTab = 'forum'">查看更多</el-button>
              </div>
              <div class="post-list">
                <div v-for="item in recentPosts" :key="item.id" class="post-card" @click="navigateToDetail(item)">
                  <div class="post-header">
                    <el-avatar :size="40" :src="item.authorAvatar"></el-avatar>
                    <div class="post-info">
                      <span class="author-name">{{ item.authorName }}</span>
                      <span class="post-time">{{ formatTime(item.createdAt) }}</span>
                    </div>
                    <el-tag :type="getTabType(item.type)" size="small">{{ getTabLabel(item.type) }}</el-tag>
                  </div>
                  <h3 class="post-title">{{ item.title }}</h3>
                  <p class="post-preview">{{ item.preview }}</p>
                  <div class="post-stats">
                    <span><el-icon><View /></el-icon> {{ item.views }}</span>
                    <span><el-icon><ChatLineRound /></el-icon> {{ item.comments }}</span>
                    <span><el-icon><Star /></el-icon> {{ item.likes }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab !== 'all'" class="tab-content">
              <div class="quick-actions">
                <el-button type="primary" @click="handleCreate">
                  <el-icon><Plus /></el-icon>
                  发布{{ getTabLabel(activeTab) }}
                </el-button>
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索..."
                  clearable
                  style="width: 300px"
                  @keyup.enter="handleSearch"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </div>

              <div class="content-list">
                <el-empty v-if="filteredItems.length === 0 && !loading" description="暂无内容"></el-empty>

                <div v-for="item in filteredItems" :key="item.id" class="content-card">
                  <div class="card-header">
                    <el-avatar :size="40" :src="item.authorAvatar"></el-avatar>
                    <div class="header-info">
                      <span class="author-name">{{ item.authorName }}</span>
                      <span class="post-time">{{ formatTime(item.createdAt) }}</span>
                    </div>
                    <el-tag v-if="item.status" :type="getStatusType(item.status)" size="small">
                      {{ item.status }}
                    </el-tag>
                  </div>

                  <h3 class="card-title" @click="navigateToDetail(item)">{{ item.title }}</h3>
                  <p class="card-preview">{{ item.preview || item.description }}</p>

                  <div v-if="activeTab === 'marketplace'" class="marketplace-info">
                    <span class="price">¥{{ item.price }}</span>
                    <el-tag size="small">{{ item.category }}</el-tag>
                  </div>

                  <div v-if="activeTab === 'activities'" class="activity-info">
                    <el-icon><Calendar /></el-icon>
                    <span>{{ formatDateTime(item.startTime) }}</span>
                    <el-icon><Location /></el-icon>
                    <span>{{ item.location }}</span>
                  </div>

                  <div v-if="activeTab === 'mutual-aid'" class="aid-info">
                    <el-tag :type="getUrgencyType(item.urgency)" size="small">{{ item.urgency }}</el-tag>
                    <span class="helpers-count">{{ item.helpersCount }}人已提供帮助</span>
                  </div>

                  <div class="card-footer">
                    <div class="card-stats">
                      <span><el-icon><View /></el-icon> {{ item.views }}</span>
                      <span><el-icon><ChatLineRound /></el-icon> {{ item.comments }}</span>
                      <span><el-icon><Star /></el-icon> {{ item.likes }}</span>
                    </div>
                    <el-button link @click="navigateToDetail(item)">查看详情</el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>

        <el-col :span="6">
          <div class="sidebar">
            <div class="sidebar-card statistics">
              <h3>社区数据</h3>
              <el-row :gutter="10">
                <el-col :span="12">
                  <div class="stat-item">
                    <div class="stat-value">{{ statistics.posts }}</div>
                    <div class="stat-label">帖子</div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="stat-item">
                    <div class="stat-value">{{ statistics.activities }}</div>
                    <div class="stat-label">活动</div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="stat-item">
                    <div class="stat-value">{{ statistics.aidRequests }}</div>
                    <div class="stat-label">互助</div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="stat-item">
                    <div class="stat-value">{{ statistics.marketplaceItems }}</div>
                    <div class="stat-label">物品</div>
                  </div>
                </el-col>
              </el-row>
            </div>

            <div class="sidebar-card hot-topics">
              <h3>热门话题</h3>
              <div class="topic-list">
                <div v-for="topic in hotTopics" :key="topic.id" class="topic-item" @click="searchTopic(topic.name)">
                  <span class="topic-rank">{{ topic.rank }}</span>
                  <span class="topic-name">{{ topic.name }}</span>
                  <span class="topic-count">{{ topic.count }}条</span>
                </div>
              </div>
            </div>

            <div class="sidebar-card my-actions">
              <h3>我的互动</h3>
              <el-menu :default-active="activeMenu" @select="handleMenuSelect">
                <el-menu-item index="my-posts">
                  <el-icon><Document /></el-icon>
                  <span>我的帖子</span>
                </el-menu-item>
                <el-menu-item index="my-favorites">
                  <el-icon><Star /></el-icon>
                  <span>我的收藏</span>
                </el-menu-item>
                <el-menu-item index="my-comments">
                  <el-icon><ChatLineRound /></el-icon>
                  <span>我的评论</span>
                </el-menu-item>
                <el-menu-item index="my-activities">
                  <el-icon><Calendar /></el-icon>
                  <span>我的活动</span>
                </el-menu-item>
              </el-menu>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { View, ChatLineRound, Star, Plus, Search, Document, Calendar, Location } from '@element-plus/icons-vue';
import { communityApi } from '@/api/community';

const router = useRouter();
const loading = ref(false);
const activeTab = ref('all');
const activeMenu = ref('');
const searchKeyword = ref('');

const recentPosts = ref([]);
const allItems = ref([]);
const statistics = reactive({
  posts: 0,
  activities: 0,
  aidRequests: 0,
  marketplaceItems: 0,
});

const hotTopics = ref([
  { id: 1, rank: 1, name: '乡村振兴', count: 128 },
  { id: 2, rank: 2, name: '便民服务', count: 96 },
  { id: 3, rank: 3, name: '文化活动', count: 85 },
  { id: 4, rank: 4, name: '环境整治', count: 72 },
  { id: 5, rank: 5, name: '邻里互助', count: 68 },
]);

const filteredItems = computed(() => {
  if (!searchKeyword.value) return allItems.value;
  const keyword = searchKeyword.value.toLowerCase();
  return allItems.value.filter(item =>
    item.title.toLowerCase().includes(keyword) || (item.description && item.description.toLowerCase().includes(keyword))
  );
});

const loadRecentPosts = async () => {
  try {
    loading.value = true;
    const response = await communityApi.getPosts({ limit: 10 });
    recentPosts.value = response.data.data || [];
  } catch (error) {
    console.error('加载帖子失败:', error);
  } finally {
    loading.value = false;
  }
};

const loadStatistics = async () => {
  try {
    const response = await communityApi.getStatistics();
    if (response.data.success) {
      Object.assign(statistics, response.data.data);
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

const loadTabContent = async (tab) => {
  if (tab === 'all') return;

  loading.value = true;
  try {
    let response;
    switch (tab) {
      case 'forum':
        response = await communityApi.getPosts();
        break;
      case 'mutual-aid':
        response = await communityApi.getAidRequests();
        break;
      case 'activities':
        response = await communityApi.getActivities();
        break;
      case 'suggestions':
        response = await communityApi.getSuggestions();
        break;
      case 'marketplace':
        response = await communityApi.getMarketplaceItems();
        break;
    }

    if (response.data.success) {
      allItems.value = response.data.data || [];
    }
  } catch (error) {
    ElMessage.error('加载内容失败');
  } finally {
    loading.value = false;
  }
};

const handleTabChange = (tab) => {
  loadTabContent(tab);
};

const handleSearch = () => {
};

const handleCreate = () => {
  const routes = {
    forum: '/community/forum/create',
    'mutual-aid': '/community/mutual-aid/create',
    activities: '/community/activities/create',
    suggestions: '/community/suggestions/create',
    marketplace: '/community/marketplace/create',
  };
  router.push(routes[activeTab.value]);
};

const navigateToDetail = (item) => {
  const routes = {
    forum: `/community/forum/${item.id}`,
    'mutual-aid': `/community/mutual-aid/${item.id}`,
    activities: `/community/activities/${item.id}`,
    suggestions: `/community/suggestions/${item.id}`,
    marketplace: `/community/marketplace/${item.id}`,
  };
  router.push(routes[item.type]);
};

const handleMenuSelect = (index) => {
  ElMessage.info(`功能开发中: ${index}`);
};

const searchTopic = (topic) => {
  searchKeyword.value = topic;
  handleSearch();
};

const formatTime = (date) => {
  return new Date(date).toLocaleDateString();
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString();
};

const getTabType = (type) => {
  const types = {
    forum: '',
    'mutual-aid': 'warning',
    activities: 'success',
    suggestions: 'info',
    marketplace: 'danger',
  };
  return types[type] || '';
};

const getTabLabel = (type) => {
  const labels = {
    forum: '帖子',
    'mutual-aid': '互助',
    activities: '活动',
    suggestions: '建议',
    marketplace: '物品',
  };
  return labels[type] || '内容';
};

const getStatusType = (status) => {
  const types = {
    available: 'success',
    sold: 'info',
    completed: 'success',
    pending: 'warning',
    rejected: 'danger',
  };
  return types[status] || '';
};

const getUrgencyType = (urgency) => {
  const types = {
    urgent: 'danger',
    normal: 'warning',
    low: 'info',
  };
  return types[urgency] || '';
};

onMounted(() => {
  loadRecentPosts();
  loadStatistics();
});
</script>

<style lang="scss" scoped>
.community-home {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.community-header {
  text-align: center;
  margin-bottom: 32px;

  h1 {
    font-size: 36px;
    color: #0f172a;
    margin: 0 0 8px 0;
  }

  .subtitle {
    font-size: 16px;
    color: #64748b;
    margin: 0;
  }
}

.community-tabs {
  margin-bottom: 24px;
  background: white;
  border-radius: 8px;
  padding: 0 16px;
}

.community-content {
  .content-area {
    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h2 {
        margin: 0;
        font-size: 20px;
        color: #0f172a;
      }
    }

    .post-list,
    .content-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .post-card,
    .content-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      cursor: pointer;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }

      .post-header,
      .card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;

        .post-info,
        .header-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;

          .author-name {
            font-weight: 600;
            color: #0f172a;
          }

          .post-time {
            font-size: 12px;
            color: #64748b;
          }
        }
      }

      .post-title,
      .card-title {
        margin: 0 0 8px 0;
        font-size: 18px;
        color: #0f172a;
        line-height: 1.5;
      }

      .post-preview,
      .card-preview {
        margin: 0 0 12px 0;
        color: #64748b;
        line-height: 1.6;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .post-stats,
      .card-stats {
        display: flex;
        gap: 16px;
        font-size: 14px;
        color: #64748b;

        span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }

      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
      }

      .marketplace-info,
      .activity-info,
      .aid-info {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 12px 0;
        font-size: 14px;
        color: #0f172a;

        .price {
          font-size: 20px;
          font-weight: 700;
          color: #e11d48;
        }

        .helpers-count {
          color: #64748b;
        }
      }
    }

    .quick-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
  }

  .sidebar {
    .sidebar-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        color: #0f172a;
      }

      &.statistics {
        .stat-item {
          text-align: center;
          padding: 16px 8px;
          background: #f8fafc;
          border-radius: 8px;

          .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 12px;
            color: #64748b;
          }
        }
      }

      &.hot-topics {
        .topic-list {
          display: flex;
          flex-direction: column;
          gap: 12px;

          .topic-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;

            &:hover {
              background: #f1f5f9;
            }

            .topic-rank {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: #e11d48;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 600;
            }

            .topic-name {
              flex: 1;
              color: #0f172a;
            }

            .topic-count {
              font-size: 12px;
              color: #64748b;
            }
          }
        }
      }

      &.my-actions {
        :deep(.el-menu) {
          border: none;
          background: transparent;

          .el-menu-item {
            height: 44px;
            line-height: 44px;
            margin-bottom: 4px;
            border-radius: 4px;

            &:hover {
              background: #f1f5f9;
            }

            &.is-active {
              background: #eff6ff;
              color: #2563eb;
            }
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .community-home {
    padding: 16px;
  }

  .community-header {
    h1 {
      font-size: 28px;
    }
  }
}
</style>
