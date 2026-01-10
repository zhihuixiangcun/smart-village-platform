<template>
  <div
    class="village-affairs-enhanced"
    :class="{ 'large-text-mode': accessibilityStore.largeTextMode }"
  >
    <!-- 智能导航头部 -->
    <header class="smart-header">
      <div class="header-pattern"></div>
      <div class="header-container">
        <!-- 用户信息卡片 -->
        <div class="user-card">
          <div class="user-avatar">
            <el-avatar :size="accessibilityStore.largeTextMode ? 80 : 60" :src="userInfo.avatar">
              {{ userInfo.name?.charAt(0) || '村' }}
            </el-avatar>
            <div class="status-indicator" :class="{ online: userInfo.online }"></div>
          </div>
          <div class="user-info">
            <h1 class="user-greeting">{{ getGreeting() }}，{{ userInfo.name || '村民' }}</h1>
            <div class="user-meta">
              <el-tag :type="getRoleType()" size="small" effect="light">
                {{ getRoleLabel() }}
              </el-tag>
              <span class="village-name">{{ userInfo.village }}</span>
            </div>
          </div>
          <div class="quick-actions">
            <el-button
              @click="showHouseholdQR"
              :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
              type="primary"
              round
              icon="User"
            >
              我的户码
            </el-button>
            <el-button
              @click="showVoiceAssistant"
              :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
              circle
              icon="Microphone"
              :class="{ 'voice-active': isListening }"
            />
          </div>
        </div>

        <!-- 智能积分仪表板 -->
        <div class="points-dashboard">
          <div class="points-main">
            <div class="points-value">{{ userPoints.total }}</div>
            <div class="points-label">我的积分</div>
            <div class="points-rank">全村排名 {{ userPoints.rank }}</div>
          </div>
          <div class="points-progress">
            <div class="progress-info">
              <span>距离下一等级还需 {{ userPoints.nextLevelPoints }} 积分</span>
              <el-progress
                :percentage="userPoints.progress"
                :stroke-width="accessibilityStore.largeTextMode ? 24 : 16"
                :show-text="false"
              />
            </div>
          </div>
          <div class="points-actions">
            <el-button @click="showPointsMall" size="small" icon="ShoppingBag">
              积分商城
            </el-button>
            <el-button @click="showPointsDetail" size="small" icon="TrendCharts">
              积分明细
            </el-button>
          </div>
        </div>
      </div>
    </header>

    <!-- 智能功能分区 -->
    <section class="smart-zones">
      <div class="zone-tabs-container">
        <el-tabs v-model="activeZone" @tab-change="handleZoneChange" class="zone-tabs">
          <el-tab-pane name="village" lazy>
            <template #label>
              <div class="smart-tab-label">
                <el-icon><Location /></el-icon>
                <span>村务管理</span>
                <el-badge v-if="villageNotifications > 0" :value="villageNotifications" />
              </div>
            </template>
          </el-tab-pane>
          <el-tab-pane name="services" lazy>
            <template #label>
              <div class="smart-tab-label">
                <el-icon><Service /></el-icon>
                <span>生活服务</span>
                <el-badge v-if="servicesNotifications > 0" :value="servicesNotifications" />
              </div>
            </template>
          </el-tab-pane>
          <el-tab-pane name="household" lazy>
            <template #label>
              <div class="smart-tab-label">
                <el-icon><House /></el-icon>
                <span>家庭档案</span>
              </div>
            </template>
          </el-tab-pane>
          <el-tab-pane name="community" lazy>
            <template #label>
              <div class="smart-tab-label">
                <el-icon><ChatDotRound /></el-icon>
                <span>邻里互助</span>
                <el-badge v-if="communityNotifications > 0" :value="communityNotifications" />
              </div>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 村务管理区域 -->
      <div v-show="activeZone === 'village'" class="zone-content village-zone">
        <!-- 智能快捷入口 -->
        <div class="smart-shortcuts">
          <h3 class="section-title">智能快捷功能</h3>
          <div class="shortcuts-grid">
            <div
              v-for="shortcut in smartShortcuts"
              :key="shortcut.id"
              class="shortcut-card"
              @click="handleShortcut(shortcut)"
              :class="{ featured: shortcut.featured }"
            >
              <div class="shortcut-icon" :style="{ backgroundColor: shortcut.color }">
                <el-icon :size="32"><component :is="shortcut.icon" /></el-icon>
              </div>
              <div class="shortcut-content">
                <h4 class="shortcut-title">{{ shortcut.title }}</h4>
                <p class="shortcut-desc">{{ shortcut.description }}</p>
              </div>
              <div class="shortcut-badge" v-if="shortcut.badge">
                <el-tag :type="shortcut.badge.type" size="small">{{ shortcut.badge.text }}</el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- 智能信息中心 -->
        <div class="smart-info-center">
          <div class="info-header">
            <h3 class="section-title">村务信息中心</h3>
            <div class="info-controls">
              <el-input
                v-model="searchQuery"
                placeholder="智能搜索村务信息..."
                :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
                clearable
                @keyup.enter="handleSearch"
                class="search-input"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-select
                v-model="aiFilter"
                placeholder="AI智能筛选"
                :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
                class="ai-filter"
              >
                <el-option label="重要通知优先" value="important" />
                <el-option label="与我相关" value="relevant" />
                <el-option label="最新发布" value="latest" />
                <el-option label="热门讨论" value="popular" />
              </el-select>
            </div>
          </div>

          <!-- 智能分类标签 -->
          <div class="smart-categories">
            <div
              v-for="category in smartCategories"
              :key="category.key"
              class="category-chip"
              :class="{ active: activeCategory === category.key }"
              @click="setActiveCategory(category.key)"
            >
              <span class="category-emoji">{{ category.emoji }}</span>
              <span class="category-label">{{ category.label }}</span>
              <el-badge
                v-if="category.count > 0"
                :value="category.count"
                :max="99"
                class="category-badge"
              />
            </div>
          </div>

          <!-- 智能信息列表 -->
          <div class="smart-content-list" v-loading="loading">
            <!-- AI推荐区域 -->
            <div v-if="aiRecommendations.length > 0" class="ai-recommendations">
              <div class="ai-header">
                <el-icon class="ai-icon"><MagicStick /></el-icon>
                <span class="ai-title">AI智能推荐</span>
                <el-tag type="primary" size="small">基于您的兴趣</el-tag>
              </div>
              <div class="recommendation-list">
                <div
                  v-for="item in aiRecommendations"
                  :key="item.id"
                  class="recommendation-item"
                  @click="viewDetail(item)"
                >
                  <div class="recommendation-content">
                    <h4 class="recommendation-title">{{ item.title }}</h4>
                    <p class="recommendation-reason">{{ item.reason }}</p>
                  </div>
                  <div class="recommendation-meta">
                    <el-tag size="small" :type="getCategoryType(item.category)">
                      {{ item.category }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>

            <!-- 重要信息置顶 -->
            <div
              v-for="item in importantItems"
              :key="'important-' + item.id"
              class="smart-item important"
              @click="viewDetail(item)"
            >
              <div class="item-priority">
                <el-icon class="priority-icon" color="#f56c6c"><Warning /></el-icon>
                <span class="priority-text">重要</span>
              </div>
              <div class="item-content">
                <h3 class="item-title">{{ item.title }}</h3>
                <p class="item-summary">{{ item.summary }}</p>
                <div class="item-meta">
                  <span class="meta-item">{{ item.publisher }}</span>
                  <span class="meta-item">{{ formatTime(item.publishTime) }}</span>
                  <span class="meta-item">
                    <el-icon><View /></el-icon> {{ item.readCount }}
                  </span>
                </div>
              </div>
              <div class="item-actions">
                <el-button type="text" size="small" @click.stop="markAsRead(item)">
                  标记已读
                </el-button>
              </div>
            </div>

            <!-- 常规信息流 -->
            <div
              v-for="item in filteredItems"
              :key="item.id"
              class="smart-item"
              @click="viewDetail(item)"
            >
              <div class="item-category">
                <span class="category-emoji">{{ getCategoryEmoji(item.category) }}</span>
              </div>
              <div class="item-content">
                <h3 class="item-title">{{ item.title }}</h3>
                <p class="item-summary">{{ item.summary }}</p>
                <div class="item-meta">
                  <el-tag size="small" :type="getCategoryType(item.category)">
                    {{ item.category }}
                  </el-tag>
                  <span class="meta-item">{{ item.publisher }}</span>
                  <span class="meta-item">{{ formatTime(item.publishTime) }}</span>
                </div>
              </div>
              <div class="item-stats">
                <div class="stat-item">
                  <el-icon><StarFilled /></el-icon>
                  <span>{{ item.likeCount }}</span>
                </div>
                <div class="stat-item">
                  <el-icon><ChatDotRound /></el-icon>
                  <span>{{ item.commentCount || 0 }}</span>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <el-empty
              v-if="!loading && filteredItems.length === 0 && importantItems.length === 0"
              description="暂无相关村务信息"
            >
              <template #image>
                <el-icon :size="80" color="#c0c4cc"><DocumentRemove /></el-icon>
              </template>
            </el-empty>

            <!-- 智能加载更多 -->
            <div class="smart-load-more" v-if="hasMore">
              <el-button
                @click="loadMore"
                :loading="loadingMore"
                :size="accessibilityStore.largeTextMode ? 'large' : 'default'"
              >
                {{ loadingMore ? '智能加载中...' : '加载更多' }}
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 生活服务区域 -->
      <div v-show="activeZone === 'services'" class="zone-content services-zone">
        <ServicesHub />
      </div>

      <!-- 家庭档案区域 -->
      <div v-show="activeZone === 'household'" class="zone-content household-zone">
        <HouseholdHub />
      </div>

      <!-- 邻里互助区域 -->
      <div v-show="activeZone === 'community'" class="zone-content community-zone">
        <el-empty description="社区功能模块开发中" :image-size="100" />
      </div>
    </section>

    <!-- 悬浮操作按钮 -->
    <div class="floating-actions">
      <el-button
        v-if="accessibilityStore.voiceEnabled"
        @click="toggleVoiceAssistant"
        :class="{ 'voice-active': isListening }"
        circle
        size="large"
        type="primary"
        class="voice-float-btn"
      >
        <el-icon><Microphone /></el-icon>
      </el-button>

      <el-button
        @click="scrollToTop"
        v-show="showScrollTop"
        circle
        size="large"
        class="scroll-top-btn"
      >
        <el-icon><Top /></el-icon>
      </el-button>
    </div>

    <!-- AI助手对话框 -->
    <AIAssistantDialog v-model:visible="aiAssistantVisible" @query="handleAIQuery" />

    <!-- 户码对话框 -->
    <HouseholdQRDialog v-model:visible="householdQRVisible" :user-info="userInfo" />

    <!-- 积分明细对话框 -->
    <PointsDetailDialog v-model:visible="pointsDetailVisible" :user-points="userPoints" />

    <!-- 积分商城对话框 -->
    <PointsMallDialog v-model:visible="pointsMallVisible" :user-points="userPoints" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { ElMessage, ElNotification } from 'element-plus';
import {
  Search,
  Location,
  Service,
  House,
  ChatDotRound,
  User,
  Microphone,
  ShoppingBag,
  TrendCharts,
  MagicStick,
  Warning,
  View,
  StarFilled,
  DocumentRemove,
  Top,
} from '@element-plus/icons-vue';

// 异步加载组件
const ServicesHub = defineAsyncComponent(() => import('./components/ServicesHub.vue'));
const AIAssistantDialog = defineAsyncComponent(() => import('./components/AIAssistantDialog.vue'));
const HouseholdQRDialog = defineAsyncComponent(() => import('./components/HouseholdQRDialog.vue'));
const PointsDetailDialog = defineAsyncComponent(
  () => import('./components/PointsDetailDialog.vue')
);
const PointsMallDialog = defineAsyncComponent(() => import('./components/PointsMallDialog.vue'));

const router = useRouter();
const userStore = useUserStore();
const accessibilityStore = useAccessibilityStore();

// ========== 响应式数据 ==========
const activeZone = ref('village');
const activeCategory = ref('all');
const searchQuery = ref('');
const aiFilter = ref('');
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(true);
const isListening = ref(false);
const showScrollTop = ref(false);

// 弹窗控制
const aiAssistantVisible = ref(false);
const householdQRVisible = ref(false);
const pointsDetailVisible = ref(false);
const pointsMallVisible = ref(false);

// 通知计数
const villageNotifications = ref(3);
const servicesNotifications = ref(5);
const communityNotifications = ref(2);

// 用户信息
const userInfo = computed(() => ({
  name: userStore.userInfo?.profile?.firstName || userStore.userInfo?.username || '村民',
  avatar: userStore.userInfo?.profile?.avatar,
  village: userStore.userInfo?.villageName || '智慧村',
  role: userStore.userInfo?.role || 'resident',
  online: true,
}));

// 用户积分
const userPoints = reactive({
  total: 1580,
  rank: 12,
  progress: 72,
  nextLevelPoints: 220,
});

// ========== 智能快捷功能 ==========
const smartShortcuts = reactive([
  {
    id: 'qrcode',
    title: '一户一码',
    description: '扫码查看家庭信息，数字化管理',
    icon: 'User',
    color: '#409eff',
    featured: true,
    badge: { type: 'success', text: '新功能' },
    action: () => showHouseholdQR(),
  },
  {
    id: 'policy',
    title: '政策计算器',
    description: 'AI智能计算补贴金额',
    icon: 'Calculator',
    color: '#67c23a',
    featured: true,
    action: () => showPolicyCalculator(),
  },
  {
    id: 'map',
    title: '村情地图',
    description: '智能地图导航，一键呼叫',
    icon: 'MapLocation',
    color: '#e6a23c',
    action: () => router.push('/village-map'),
  },
  {
    id: 'duty',
    title: '今日值班',
    description: '一键呼叫值班人员',
    icon: 'Phone',
    color: '#f56c6c',
    badge: { type: 'danger', text: '紧急' },
    action: () => callDutyPerson(),
  },
  {
    id: 'mall',
    title: '积分商城',
    description: '积分兑换商品',
    icon: 'ShoppingBag',
    color: '#909399',
    action: () => showPointsMall(),
  },
  {
    id: 'services',
    title: '在线办事',
    description: '证件办理，便民服务',
    icon: 'Document',
    color: '#606266',
    action: () => router.push('/online-services'),
  },
]);

// ========== 智能分类 ==========
const smartCategories = reactive([
  { key: 'all', label: '全部', emoji: '📋', count: 156 },
  { key: 'notice', label: '通知公告', emoji: '📢', count: 23 },
  { key: 'policy', label: '政策宣传', emoji: '📜', count: 18 },
  { key: 'activity', label: '村务活动', emoji: '🎉', count: 15 },
  { key: 'finance', label: '财务公开', emoji: '💰', count: 28 },
  { key: 'project', label: '项目进展', emoji: '🏗️', count: 12 },
  { key: 'meeting', label: '会议纪要', emoji: '👥', count: 35 },
  { key: 'emergency', label: '应急信息', emoji: '🚨', count: 8 },
]);

// ========== AI推荐数据 ==========
const aiRecommendations = reactive([
  {
    id: 'ai1',
    title: '2024年农业补贴政策最新调整',
    reason: '根据您的家庭情况，可能获得额外补贴',
    category: '政策宣传',
    publisher: '村委会',
    publishTime: '2024-01-16 10:00',
    readCount: 1256,
    likeCount: 89,
  },
  {
    id: 'ai2',
    title: '春节文化活动报名开启',
    reason: '您去年参与了类似活动',
    category: '村务活动',
    publisher: '文化站',
    publishTime: '2024-01-15 14:30',
    readCount: 856,
    likeCount: 67,
  },
]);

// ========== 重要信息 ==========
const importantItems = reactive([
  {
    id: 'important1',
    title: '关于加强疫情防控的紧急通知',
    summary: '根据上级部门要求，即日起加强村内疫情防控措施，请村民配合做好相关工作...',
    category: '应急信息',
    publisher: '村委会',
    publishTime: '2024-01-16 09:00',
    readCount: 2156,
    likeCount: 145,
    attachments: [{ id: '1', name: '疫情防控措施.pdf', size: 2457600 }],
  },
]);

// ========== 村务信息列表 ==========
const affairsList = reactive([
  {
    id: '1',
    title: '2024年第一季度财务收支公示',
    summary: '本季度村集体经济收入总计56.8万元，支出42.3万元，主要用于基础设施建设和村民福利...',
    category: '财务公开',
    publisher: '财务科',
    publishTime: '2024-01-15 14:30',
    readCount: 856,
    likeCount: 45,
    commentCount: 12,
    attachments: [{ id: '1', name: '2024年Q1财务报表.pdf', size: 2457600 }],
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
    commentCount: 8,
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
    commentCount: 23,
    attachments: [{ id: '2', name: '春节活动安排.docx', size: 532480 }],
  },
]);

// ========== 计算属性 ==========
const filteredItems = computed(() => {
  let filtered = affairsList;

  // 按分类筛选
  if (activeCategory.value !== 'all') {
    const categoryLabel = smartCategories.find(c => c.key === activeCategory.value)?.label;
    filtered = filtered.filter(item => item.category === categoryLabel);
  }

  // 按搜索关键词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      item => item.title.toLowerCase().includes(query) || item.summary.toLowerCase().includes(query)
    );
  }

  // AI智能筛选
  if (aiFilter.value) {
    switch (aiFilter.value) {
      case 'important':
        filtered = filtered.filter(item => item.readCount > 1000);
        break;
      case 'relevant':
        // 基于用户兴趣的智能推荐逻辑
        break;
      case 'latest':
        filtered = filtered.sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime));
        break;
      case 'popular':
        filtered = filtered.sort((a, b) => b.likeCount - a.likeCount);
        break;
    }
  }

  return filtered;
});

// ========== 方法定义 ==========

/**
 * 获取问候语
 */
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
};

/**
 * 获取用户角色类型
 */
const getRoleType = () => {
  const roleMap = {
    admin: 'danger',
    committee: 'warning',
    resident: 'success',
    volunteer: 'info',
  };
  return roleMap[userInfo.value.role] || 'info';
};

/**
 * 获取角色标签
 */
const getRoleLabel = () => {
  const roleMap = {
    admin: '管理员',
    committee: '村干部',
    resident: '村民',
    volunteer: '志愿者',
  };
  return roleMap[userInfo.value.role] || '村民';
};

/**
 * 处理分区切换
 */
const handleZoneChange = zone => {
  activeZone.value = zone;
  // 重置通知计数
  switch (zone) {
    case 'village':
      villageNotifications.value = 0;
      break;
    case 'services':
      servicesNotifications.value = 0;
      break;
    case 'community':
      communityNotifications.value = 0;
      break;
  }
};

/**
 * 处理快捷功能点击
 */
const handleShortcut = shortcut => {
  if (shortcut.action) {
    shortcut.action();
  }
};

/**
 * 显示户码
 */
const showHouseholdQR = () => {
  householdQRVisible.value = true;
};

/**
 * 显示语音助手
 */
const showVoiceAssistant = () => {
  aiAssistantVisible.value = true;
};

/**
 * 显示积分详情
 */
const showPointsDetail = () => {
  pointsDetailVisible.value = true;
};

/**
 * 显示积分商城
 */
const showPointsMall = () => {
  pointsMallVisible.value = true;
};

/**
 * 显示政策计算器
 */
const showPolicyCalculator = () => {
  router.push('/policy-calculator');
};

/**
 * 呼叫值班人员
 */
const callDutyPerson = () => {
  ElMessage.success('正在连接值班人员...');
  // 实现呼叫逻辑
};

/**
 * 设置活跃分类
 */
const setActiveCategory = category => {
  activeCategory.value = category;
};

/**
 * 处理搜索
 */
const handleSearch = () => {
  loading.value = true;
  // 模拟搜索延迟
  setTimeout(() => {
    loading.value = false;
    ElMessage.success('搜索完成');
  }, 500);
};

/**
 * 查看详情
 */
const viewDetail = item => {
  // 跳转到详情页
  router.push(`/village-affairs/${item.id}`);
};

/**
 * 标记为已读
 */
const markAsRead = item => {
  ElMessage.success('已标记为已读');
  // 更新已读状态
};

/**
 * 加载更多
 */
const loadMore = () => {
  loadingMore.value = true;
  // 模拟加载
  setTimeout(() => {
    loadingMore.value = false;
    hasMore.value = false;
    ElMessage.success('已加载全部内容');
  }, 1000);
};

/**
 * 切换语音助手
 */
const toggleVoiceAssistant = () => {
  isListening.value = !isListening.value;
  if (isListening.value) {
    ElMessage.info('语音助手已启动');
  } else {
    ElMessage.info('语音助手已关闭');
  }
};

/**
 * 处理AI查询
 */
const handleAIQuery = query => {
  console.log('AI查询:', query);
  // 实现AI查询逻辑
};

/**
 * 获取分类类型
 */
const getCategoryType = category => {
  const typeMap = {
    通知公告: 'primary',
    政策宣传: 'success',
    村务活动: 'warning',
    财务公开: 'danger',
    项目进展: 'info',
    会议纪要: '',
    应急信息: 'danger',
  };
  return typeMap[category] || '';
};

/**
 * 获取分类emoji
 */
const getCategoryEmoji = category => {
  const emojiMap = {
    通知公告: '📢',
    政策宣传: '📜',
    村务活动: '🎉',
    财务公开: '💰',
    项目进展: '🏗️',
    会议纪要: '👥',
    应急信息: '🚨',
  };
  return emojiMap[category] || '📋';
};

/**
 * 格式化时间
 */
const formatTime = time => {
  const date = new Date(time);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  return date.toLocaleDateString('zh-CN');
};

/**
 * 滚动到顶部
 */
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * 处理滚动事件
 */
const handleScroll = () => {
  showScrollTop.value = window.scrollY > 300;
};

// ========== 生命周期 ==========
onMounted(() => {
  window.addEventListener('scroll', handleScroll);

  // 初始化数据
  nextTick(() => {
    console.log('智慧村务页面已加载');
  });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.village-affairs-enhanced {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  position: relative;
}

/* ========== 智能头部样式 ========== */
.smart-header {
  position: relative;
  background: white;
  border-radius: 0 0 30px 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.header-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background:
    radial-gradient(circle at 20% 50%, rgba(64, 158, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgba(103, 194, 58, 0.1) 0%, transparent 50%);
  z-index: 0;
}

.header-container {
  position: relative;
  z-index: 1;
  padding: 30px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 30px;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.user-avatar {
  position: relative;
}

.status-indicator {
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #67c23a;
  border: 2px solid white;
}

.status-indicator.online {
  background-color: #67c23a;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.user-info {
  flex: 1;
}

.user-greeting {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.village-name {
  color: #606266;
  font-size: 14px;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.points-dashboard {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 25px;
  border-radius: 20px;
  min-width: 280px;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.points-main {
  text-align: center;
  margin-bottom: 20px;
}

.points-value {
  font-size: 48px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 8px;
}

.points-label {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.points-rank {
  font-size: 14px;
  opacity: 0.8;
}

.points-progress {
  margin-bottom: 20px;
}

.progress-info {
  margin-bottom: 12px;
}

.progress-info span {
  display: block;
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.points-actions {
  display: flex;
  gap: 8px;
}

.points-actions .el-button {
  flex: 1;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.points-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* ========== 智能功能区样式 ========== */
.smart-zones {
  max-width: 1400px;
  margin: 30px auto;
  padding: 0 30px;
}

.zone-tabs-container {
  background: white;
  border-radius: 15px;
  padding: 15px;
  margin-bottom: 30px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
}

.zone-tabs {
  margin: 0;
}

.zone-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.zone-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0;
}

.smart-tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 10px;
  transition: all 0.3s;
}

.smart-tab-label:hover {
  background: rgba(64, 158, 255, 0.1);
}

.zone-content {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 村务管理区域样式 ========== */
.village-zone {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.section-title {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  position: relative;
  padding-left: 15px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border-radius: 2px;
}

/* ========== 智能快捷入口样式 ========== */
.smart-shortcuts {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.shortcut-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: white;
  border: 2px solid #f0f2f5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.shortcut-card:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.15);
}

.shortcut-card.featured {
  border-color: #409eff;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(103, 194, 58, 0.05) 100%);
}

.shortcut-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.shortcut-content {
  flex: 1;
}

.shortcut-title {
  margin: 0 0 5px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.shortcut-desc {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
}

.shortcut-badge {
  position: absolute;
  top: 10px;
  right: 10px;
}

/* ========== 智能信息中心样式 ========== */
.smart-info-center {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 15px;
}

.info-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 300px;
}

.ai-filter {
  width: 150px;
}

/* ========== 智能分类标签样式 ========== */
.smart-categories {
  display: flex;
  gap: 12px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.category-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f5f7fa;
  border: 2px solid transparent;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.category-chip:hover {
  border-color: #409eff;
  transform: translateY(-1px);
}

.category-chip.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.category-emoji {
  font-size: 16px;
}

.category-label {
  font-size: 14px;
  font-weight: 500;
}

.category-badge {
  margin-left: 4px;
}

/* ========== AI推荐区域样式 ========== */
.ai-recommendations {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(103, 194, 58, 0.05) 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.ai-icon {
  color: #409eff;
  font-size: 20px;
}

.ai-title {
  font-weight: 600;
  color: #303133;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.recommendation-item:hover {
  transform: translateX(5px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.recommendation-content {
  flex: 1;
}

.recommendation-title {
  margin: 0 0 5px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.recommendation-reason {
  margin: 0;
  font-size: 13px;
  color: #409eff;
}

/* ========== 智能信息列表样式 ========== */
.smart-content-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.smart-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 20px;
  background: white;
  border: 1px solid #f0f2f5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.smart-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}

.smart-item.important {
  border-color: #f56c6c;
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.05) 0%, rgba(245, 108, 108, 0.02) 100%);
}

.item-priority {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px;
  background: #fef0f0;
  border-radius: 8px;
  color: #f56c6c;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}

.item-category {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 18px;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
}

.item-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.item-summary {
  margin: 0 0 12px;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.item-stats {
  display: flex;
  gap: 15px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}

.item-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ========== 加载更多样式 ========== */
.smart-load-more {
  text-align: center;
  padding: 20px;
}

/* ========== 悬浮按钮样式 ========== */
.floating-actions {
  position: fixed;
  right: 30px;
  bottom: 30px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.voice-float-btn {
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
  transition: all 0.3s;
}

.voice-float-btn.voice-active {
  background: #67c23a;
  animation: voicePulse 1.5s infinite;
}

@keyframes voicePulse {
  0% {
    box-shadow: 0 4px 15px rgba(103, 194, 58, 0.3);
  }
  50% {
    box-shadow: 0 4px 25px rgba(103, 194, 58, 0.6);
  }
  100% {
    box-shadow: 0 4px 15px rgba(103, 194, 58, 0.3);
  }
}

.scroll-top-btn {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

/* ========== 大字模式样式 ========== */
.large-text-mode .user-greeting {
  font-size: 28px;
}

.large-text-mode .points-value {
  font-size: 56px;
}

.large-text-mode .section-title {
  font-size: 24px;
}

.large-text-mode .shortcut-title {
  font-size: 18px;
}

.large-text-mode .item-title {
  font-size: 18px;
}

.large-text-mode .item-summary {
  font-size: 16px;
}

/* ========== 响应式设计 ========== */
@media (max-width: 1200px) {
  .header-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .points-dashboard {
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .header-container {
    padding: 20px;
  }

  .user-card {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }

  .user-meta {
    justify-content: center;
  }

  .quick-actions {
    justify-content: center;
    width: 100%;
  }

  .smart-zones {
    padding: 0 20px;
  }

  .shortcuts-grid {
    grid-template-columns: 1fr;
  }

  .info-header {
    flex-direction: column;
    align-items: stretch;
  }

  .info-controls {
    flex-direction: column;
    gap: 10px;
  }

  .search-input,
  .ai-filter {
    width: 100%;
  }

  .smart-categories {
    gap: 8px;
  }

  .category-chip {
    padding: 6px 12px;
    font-size: 13px;
  }

  .smart-item {
    flex-direction: column;
    gap: 12px;
  }

  .item-stats {
    width: 100%;
    justify-content: space-between;
  }

  .floating-actions {
    right: 20px;
    bottom: 20px;
  }
}

@media (max-width: 480px) {
  .header-container {
    padding: 15px;
  }

  .points-dashboard {
    padding: 20px;
  }

  .points-value {
    font-size: 36px;
  }

  .smart-zones {
    padding: 0 15px;
  }

  .smart-shortcuts,
  .smart-info-center {
    padding: 20px;
  }

  .smart-tab-label {
    padding: 6px 12px;
    font-size: 14px;
  }
}

/* ========== 无障碍设计 ========== */
.village-affairs-enhanced:focus-within .smart-item {
  outline: 2px solid #409eff;
  outline-offset: 2px;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .village-affairs-enhanced {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  }

  .smart-header {
    background: #1f1f1f;
    color: #ffffff;
  }

  .user-card {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .smart-shortcuts,
  .smart-info-center {
    background: #1f1f1f;
    color: #ffffff;
  }

  .smart-item {
    background: #2a2a2a;
    border-color: #3a3a3a;
    color: #ffffff;
  }

  .shortcut-card {
    background: #2a2a2a;
    border-color: #3a3a3a;
    color: #ffffff;
  }

  .category-chip {
    background: #3a3a3a;
    color: #ffffff;
  }
}
</style>
