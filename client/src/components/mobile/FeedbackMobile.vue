<template>
  <div class="feedback-mobile">
    <!-- 顶部统计卡片 -->
    <div class="feedback-stats">
      <div class="stats-header">
        <h2>用户反馈</h2>
        <div class="stats-tabs">
          <span
            v-for="tab in statsTabs"
            :key="tab.key"
            class="stats-tab"
            :class="{ active: activeStatsTab === tab.key }"
            @click="activeStatsTab = tab.key"
          >
            {{ tab.label }}
          </span>
        </div>
      </div>

      <div class="stats-cards">
        <div
          v-for="stat in statsData[activeStatsTab]"
          :key="stat.key"
          class="stat-card"
          :class="stat.type"
          @click="viewFeedbackList(stat.key)"
        >
          <div class="stat-icon">
            <el-icon>
              <component :is="stat.icon" />
            </el-icon>
          </div>
          <div class="stat-info">
            <p class="stat-value">{{ stat.value }}</p>
            <p class="stat-label">{{ stat.label }}</p>
          </div>
          <div class="stat-change" :class="stat.trend">
            <el-icon>
              <component :is="stat.trend === 'up' ? 'ArrowUp' : 'ArrowDown'" />
            </el-icon>
            <span>{{ stat.change }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速反馈入口 -->
    <div class="quick-feedback">
      <div class="feedback-types">
        <div
          v-for="type in feedbackTypes"
          :key="type.key"
          class="feedback-type"
          @click="quickFeedback(type)"
        >
          <div class="type-icon" :class="type.color">
            <el-icon>
              <component :is="type.icon" />
            </el-icon>
          </div>
          <span class="type-label">{{ type.label }}</span>
          <span class="type-count">({{ type.count }})</span>
        </div>
      </div>
    </div>

    <!-- 反馈列表 -->
    <div class="feedback-list">
      <div class="list-header">
        <h3>最新反馈</h3>
        <el-button type="text" @click="showFilter = true">
          <el-icon><Filter /></el-icon>
          筛选
        </el-button>
      </div>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索反馈内容、反馈人..."
          prefix-icon="Search"
          clearable
          @input="handleSearch"
        />
      </div>

      <!-- 反馈项 -->
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="loadFeedbacks"
        >
          <div
            v-for="feedback in feedbacks"
            :key="feedback.id"
            class="feedback-card"
            @click="viewFeedback(feedback)"
          >
            <!-- 反馈类型标记 -->
            <div class="feedback-type-tag" :class="feedback.type">
              <el-icon>
                <component :is="getTypeIcon(feedback.type)" />
              </el-icon>
            </div>

            <!-- 反馈内容 -->
            <div class="feedback-content">
              <div class="feedback-header">
                <h4 class="feedback-title">{{ feedback.title }}</h4>
                <el-tag :type="getStatusType(feedback.status)" size="small">
                  {{ getStatusText(feedback.status) }}
                </el-tag>
              </div>

              <p class="feedback-desc">{{ truncateText(feedback.content, 100) }}</p>

              <!-- 附件预览 -->
              <div class="feedback-attachments" v-if="feedback.attachments?.length">
                <div class="attachment-preview">
                  <el-icon><Picture /></el-icon>
                  <span>{{ feedback.attachments.length }}个附件</span>
                </div>
              </div>

              <!-- 位置信息 -->
              <div class="feedback-location" v-if="feedback.location">
                <el-icon><Location /></el-icon>
                <span>{{ feedback.location }}</span>
              </div>

              <!-- 底部信息 -->
              <div class="feedback-footer">
                <div class="feedback-user">
                  <el-avatar :size="24" :src="feedback.user.avatar">
                    {{ feedback.user.name.charAt(0) }}
                  </el-avatar>
                  <span>{{ feedback.user.name }}</span>
                </div>
                <span class="feedback-time">{{ formatTime(feedback.createTime) }}</span>
              </div>

              <!-- 评价星标 -->
              <div class="feedback-rating" v-if="feedback.rating">
                <el-rate v-model="feedback.rating" disabled show-score text-color="#ff9900" />
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="feedback-actions">
              <el-button
                v-if="feedback.status === 'pending'"
                type="primary"
                size="small"
                @click.stop="handleFeedback(feedback)"
              >
                处理
              </el-button>
              <el-button type="text" size="small" @click.stop="replyFeedback(feedback)">
                回复
              </el-button>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>

    <!-- 悬浮按钮 -->
    <div class="feedback-fab">
      <el-button type="primary" icon="Plus" circle size="large" @click="showFeedbackForm = true" />
    </div>

    <!-- 筛选弹窗 -->
    <van-popup v-model:show="showFilter" position="bottom" :style="{ height: '60%' }">
      <div class="filter-popup">
        <div class="popup-header">
          <h3>筛选条件</h3>
          <el-button type="text" @click="resetFilter">重置</el-button>
        </div>
        <div class="popup-content">
          <div class="filter-section">
            <h4>反馈类型</h4>
            <div class="filter-options">
              <el-checkbox-group v-model="filterTypes">
                <el-checkbox v-for="type in feedbackTypes" :key="type.key" :label="type.key">
                  {{ type.label }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
          </div>

          <div class="filter-section">
            <h4>处理状态</h4>
            <div class="filter-options">
              <el-radio-group v-model="filterStatus">
                <el-radio label="all">全部</el-radio>
                <el-radio label="pending">待处理</el-radio>
                <el-radio label="processing">处理中</el-radio>
                <el-radio label="resolved">已解决</el-radio>
                <el-radio label="closed">已关闭</el-radio>
              </el-radio-group>
            </div>
          </div>

          <div class="filter-section">
            <h4>时间范围</h4>
            <div class="filter-options">
              <el-date-picker
                v-model="filterDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                size="small"
              />
            </div>
          </div>

          <div class="filter-actions">
            <el-button @click="showFilter = false">取消</el-button>
            <el-button type="primary" @click="applyFilter">确定</el-button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 反馈表单 -->
    <van-popup v-model:show="showFeedbackForm" position="bottom" :style="{ height: '90%' }">
      <div class="feedback-form-popup">
        <div class="popup-header">
          <h3>提交反馈</h3>
          <el-button type="text" @click="showFeedbackForm = false">关闭</el-button>
        </div>
        <div class="popup-content">
          <FeedbackForm @success="handleFeedbackSuccess" @cancel="showFeedbackForm = false" />
        </div>
      </div>
    </van-popup>

    <!-- 快速反馈表单 -->
    <van-popup v-model:show="showQuickFeedbackForm" position="bottom" :style="{ height: '80%' }">
      <div class="quick-feedback-popup">
        <div class="popup-header">
          <h3>{{ quickFeedbackType?.label }}反馈</h3>
          <el-button type="text" @click="showQuickFeedbackForm = false">关闭</el-button>
        </div>
        <div class="popup-content">
          <QuickFeedbackForm
            :type="quickFeedbackType"
            @success="handleQuickFeedbackSuccess"
            @cancel="showQuickFeedbackForm = false"
          />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ChatDotRound,
  Warning,
  QuestionFilled,
  Trophy,
  Filter,
  Search,
  Picture,
  Location,
  Plus,
  ArrowUp,
  ArrowDown,
  Service,
  Tools,
  Food,
  Document,
  Star,
} from '@element-plus/icons-vue';
import { VanList, VanPullRefresh, VanPopup } from 'vant';
import FeedbackForm from './FeedbackForm.vue';
import QuickFeedbackForm from './QuickFeedbackForm.vue';

// 路由
const router = useRouter();

// 响应式数据
const activeStatsTab = ref('today');
const searchQuery = ref('');
const refreshing = ref(false);
const loading = ref(false);
const finished = ref(false);
const showFilter = ref(false);
const showFeedbackForm = ref(false);
const showQuickFeedbackForm = ref(false);
const quickFeedbackType = ref(null);

// 筛选条件
const filterTypes = ref([]);
const filterStatus = ref('all');
const filterDateRange = ref(null);

// 统计标签页
const statsTabs = ref([
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
]);

// 统计数据
const statsData = reactive({
  today: [
    {
      key: 'total',
      label: '总数',
      value: 23,
      change: '12%',
      trend: 'up',
      icon: 'ChatDotRound',
      type: 'primary',
    },
    {
      key: 'pending',
      label: '待处理',
      value: 8,
      change: '5%',
      trend: 'down',
      icon: 'Clock',
      type: 'warning',
    },
    {
      key: 'resolved',
      label: '已解决',
      value: 15,
      change: '20%',
      trend: 'up',
      icon: 'CircleCheck',
      type: 'success',
    },
    {
      key: 'rating',
      label: '满意度',
      value: '4.5',
      change: '0.3',
      trend: 'up',
      icon: 'Star',
      type: 'info',
    },
  ],
  week: [
    {
      key: 'total',
      label: '总数',
      value: 156,
      change: '8%',
      trend: 'up',
      icon: 'ChatDotRound',
      type: 'primary',
    },
    {
      key: 'pending',
      label: '待处理',
      value: 32,
      change: '3%',
      trend: 'down',
      icon: 'Clock',
      type: 'warning',
    },
    {
      key: 'resolved',
      label: '已解决',
      value: 124,
      change: '15%',
      trend: 'up',
      icon: 'CircleCheck',
      type: 'success',
    },
    {
      key: 'rating',
      label: '满意度',
      value: '4.3',
      change: '0.1',
      trend: 'up',
      icon: 'Star',
      type: 'info',
    },
  ],
  month: [
    {
      key: 'total',
      label: '总数',
      value: 680,
      change: '15%',
      trend: 'up',
      icon: 'ChatDotRound',
      type: 'primary',
    },
    {
      key: 'pending',
      label: '待处理',
      value: 125,
      change: '8%',
      trend: 'down',
      icon: 'Clock',
      type: 'warning',
    },
    {
      key: 'resolved',
      label: '已解决',
      value: 555,
      change: '22%',
      trend: 'up',
      icon: 'CircleCheck',
      type: 'success',
    },
    {
      key: 'rating',
      label: '满意度',
      value: '4.4',
      change: '0.2',
      trend: 'up',
      icon: 'Star',
      type: 'info',
    },
  ],
});

// 反馈类型
const feedbackTypes = ref([
  { key: 'suggestion', label: '建议', icon: 'ChatDotRound', color: 'primary', count: 45 },
  { key: 'complaint', label: '投诉', icon: 'Warning', color: 'danger', count: 12 },
  { key: 'question', label: '咨询', icon: 'QuestionFilled', color: 'warning', count: 38 },
  { key: 'praise', label: '表扬', icon: 'Trophy', color: 'success', count: 23 },
  { key: 'service', label: '服务', icon: 'Service', color: 'info', count: 56 },
  { key: 'facility', label: '设施', icon: 'Tools', color: 'primary', count: 34 },
  { key: 'environment', label: '环境', icon: 'Location', color: 'success', count: 28 },
  { key: 'other', label: '其他', icon: 'Document', color: 'info', count: 15 },
]);

// 反馈列表
const feedbacks = ref([]);

// 方法
const viewFeedbackList = key => {
  const typeMap = {
    total: '/feedback',
    pending: '/feedback?status=pending',
    resolved: '/feedback?status=resolved',
    rating: '/feedback?rating=true',
  };
  router.push(typeMap[key] || '/feedback');
};

const quickFeedback = type => {
  quickFeedbackType.value = type;
  showQuickFeedbackForm.value = true;
};

const handleSearch = value => {
  // 搜索逻辑
  if (!value) {
    onRefresh();
    return;
  }

  // 执行搜索
  feedbacks.value = [];
  loadFeedbacks();
};

const getTypeIcon = type => {
  const iconMap = {
    suggestion: 'ChatDotRound',
    complaint: 'Warning',
    question: 'QuestionFilled',
    praise: 'Trophy',
    service: 'Service',
    facility: 'Tools',
    environment: 'Location',
    other: 'Document',
  };
  return iconMap[type] || 'ChatDotRound';
};

const getStatusType = status => {
  const typeMap = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    closed: 'info',
  };
  return typeMap[status] || 'info';
};

const getStatusText = status => {
  const textMap = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭',
  };
  return textMap[status] || '未知';
};

const truncateText = (text, length) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

const formatTime = time => {
  const now = new Date();
  const diff = now - time;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return time.toLocaleDateString();
};

const onRefresh = async () => {
  refreshing.value = true;
  feedbacks.value = [];
  await loadFeedbacks();
  refreshing.value = false;
};

const loadFeedbacks = async () => {
  if (loading.value || finished.value) return;

  loading.value = true;

  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newFeedbacks = generateMockFeedbacks();

    if (newFeedbacks.length < 10) {
      finished.value = true;
    }

    feedbacks.value.push(...newFeedbacks);
  } catch (error) {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const generateMockFeedbacks = () => {
  const mockData = [
    {
      id: Date.now() + 1,
      title: '建议增加夜间照明设施',
      content:
        '村里主干道夜间比较黑，建议增加路灯数量，方便村民夜间出行。特别是老年人，晚上出门不安全。',
      type: 'suggestion',
      status: 'pending',
      user: {
        name: '张三',
        avatar: '',
      },
      attachments: ['image1.jpg', 'image2.jpg'],
      location: '幸福路主干道',
      createTime: new Date(),
      rating: null,
    },
    {
      id: Date.now() + 2,
      title: '垃圾桶清理不及时',
      content: '村口的垃圾桶已经两天没清理了，天气热容易产生异味，希望尽快处理。',
      type: 'complaint',
      status: 'processing',
      user: {
        name: '李四',
        avatar: '',
      },
      attachments: [],
      location: '村口',
      createTime: new Date(Date.now() - 3600000),
      rating: null,
    },
    {
      id: Date.now() + 3,
      title: '感谢村委会帮助',
      content: '上次家里水管漏水，村委会很快派人帮忙修理，非常感谢！服务态度很好！',
      type: 'praise',
      status: 'resolved',
      user: {
        name: '王五',
        avatar: '',
      },
      attachments: [],
      location: '和谐小区',
      createTime: new Date(Date.now() - 7200000),
      rating: 5,
    },
    {
      id: Date.now() + 4,
      title: '咨询社保办理流程',
      content: '想了解一下农村社保的具体办理流程和需要准备的材料。',
      type: 'question',
      status: 'resolved',
      user: {
        name: '赵六',
        avatar: '',
      },
      attachments: [],
      location: '',
      createTime: new Date(Date.now() - 86400000),
      rating: 4,
    },
  ];

  // 应用筛选条件
  let filtered = mockData;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      item =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        item.user.name.toLowerCase().includes(query)
    );
  }

  if (filterTypes.value.length > 0) {
    filtered = filtered.filter(item => filterTypes.value.includes(item.type));
  }

  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(item => item.status === filterStatus.value);
  }

  return filtered;
};

const viewFeedback = feedback => {
  router.push(`/feedback/${feedback.id}`);
};

const handleFeedback = feedback => {
  router.push(`/feedback/${feedback.id}/handle`);
};

const replyFeedback = feedback => {
  router.push(`/feedback/${feedback.id}/reply`);
};

const resetFilter = () => {
  filterTypes.value = [];
  filterStatus.value = 'all';
  filterDateRange.value = null;
};

const applyFilter = () => {
  showFilter.value = false;
  onRefresh();
  ElMessage.success('筛选条件已应用');
};

const handleFeedbackSuccess = () => {
  showFeedbackForm.value = false;
  onRefresh();
  ElMessage.success('反馈提交成功');
};

const handleQuickFeedbackSuccess = () => {
  showQuickFeedbackForm.value = false;
  quickFeedbackType.value = null;
  onRefresh();
  ElMessage.success('快速反馈提交成功');
};

// 生命周期
onMounted(() => {
  loadFeedbacks();
});
</script>

<style lang="scss" scoped>
.feedback-mobile {
  background: #f5f5f5;
  min-height: 100vh;

  // 统计卡片
  .feedback-stats {
    background: white;
    padding: 16px;
    margin-bottom: 12px;

    .stats-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }

      .stats-tabs {
        display: flex;
        gap: 16px;

        .stats-tab {
          font-size: 14px;
          color: #666;
          cursor: pointer;
          position: relative;

          &.active {
            color: #409eff;
            font-weight: 500;

            &::after {
              content: '';
              position: absolute;
              bottom: -4px;
              left: 0;
              right: 0;
              height: 2px;
              background: #409eff;
            }
          }
        }
      }
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;

      .stat-card {
        display: flex;
        align-items: center;
        padding: 12px;
        border-radius: 8px;
        background: #f8f9fa;
        cursor: pointer;
        transition: all 0.3s;

        &:active {
          transform: scale(0.98);
        }

        .stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;

          .el-icon {
            font-size: 20px;
            color: white;
          }
        }

        .stat-info {
          flex: 1;

          .stat-value {
            font-size: 20px;
            font-weight: 600;
            color: #333;
            margin: 0 0 2px 0;
          }

          .stat-label {
            font-size: 12px;
            color: #666;
            margin: 0;
          }
        }

        .stat-change {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 12px;

          .el-icon {
            font-size: 12px;
          }

          &.up {
            color: #67c23a;
          }

          &.down {
            color: #f56c6c;
          }
        }

        &.primary .stat-icon {
          background: linear-gradient(135deg, #409eff, #66b1ff);
        }

        &.success .stat-icon {
          background: linear-gradient(135deg, #67c23a, #85ce61);
        }

        &.warning .stat-icon {
          background: linear-gradient(135deg, #e6a23c, #ebb563);
        }

        &.info .stat-icon {
          background: linear-gradient(135deg, #909399, #b1b3b8);
        }
      }
    }
  }

  // 快速反馈
  .quick-feedback {
    background: white;
    padding: 16px;
    margin-bottom: 12px;

    .feedback-types {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;

      .feedback-type {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px 8px;
        border-radius: 8px;
        background: #f8f9fa;
        cursor: pointer;
        transition: all 0.3s;

        &:active {
          transform: scale(0.95);
          background: #e9ecef;
        }

        .type-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;

          .el-icon {
            font-size: 20px;
            color: white;
          }

          &.primary {
            background: linear-gradient(135deg, #409eff, #66b1ff);
          }

          &.success {
            background: linear-gradient(135deg, #67c23a, #85ce61);
          }

          &.warning {
            background: linear-gradient(135deg, #e6a23c, #ebb563);
          }

          &.danger {
            background: linear-gradient(135deg, #f56c6c, #f78989);
          }

          &.info {
            background: linear-gradient(135deg, #909399, #b1b3b8);
          }
        }

        .type-label {
          font-size: 13px;
          color: #333;
          margin-bottom: 2px;
        }

        .type-count {
          font-size: 11px;
          color: #999;
        }
      }
    }
  }

  // 反馈列表
  .feedback-list {
    background: white;

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;

      h3 {
        margin: 0;
        font-size: 16px;
      }
    }

    .search-bar {
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
    }

    .feedback-card {
      position: relative;
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      align-items: flex-start;
      gap: 12px;

      &:active {
        background: #f5f5f5;
      }

      .feedback-type-tag {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .el-icon {
          font-size: 16px;
          color: white;
        }

        &.suggestion {
          background: #409eff;
        }

        &.complaint {
          background: #f56c6c;
        }

        &.question {
          background: #e6a23c;
        }

        &.praise {
          background: #67c23a;
        }

        &.service {
          background: #909399;
        }

        &.facility {
          background: #409eff;
        }

        &.environment {
          background: #67c23a;
        }

        &.other {
          background: #909399;
        }
      }

      .feedback-content {
        flex: 1;
        min-width: 0;

        .feedback-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;

          .feedback-title {
            margin: 0;
            font-size: 15px;
            font-weight: 500;
            color: #333;
            flex: 1;
            margin-right: 8px;
          }
        }

        .feedback-desc {
          font-size: 14px;
          color: #666;
          line-height: 1.4;
          margin: 0 0 8px 0;
        }

        .feedback-attachments {
          margin-bottom: 8px;

          .attachment-preview {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #409eff;
            background: #ecf5ff;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
          }
        }

        .feedback-location {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;

          .el-icon {
            font-size: 12px;
          }
        }

        .feedback-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .feedback-user {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #333;
          }

          .feedback-time {
            font-size: 12px;
            color: #999;
          }
        }

        .feedback-rating {
          :deep(.el-rate) {
            height: 20px;

            .el-rate__text {
              font-size: 12px;
              vertical-align: middle;
            }
          }
        }
      }

      .feedback-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex-shrink: 0;
      }
    }
  }

  // 悬浮按钮
  .feedback-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 1000;

    .el-button {
      width: 56px;
      height: 56px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  // 弹窗样式
  .filter-popup,
  .feedback-form-popup,
  .quick-feedback-popup {
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
      padding: 16px 20px;

      .filter-section {
        margin-bottom: 24px;

        h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #333;
        }

        .filter-options {
          :deep(.el-checkbox-group),
          :deep(.el-radio-group) {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
        }
      }

      .filter-actions {
        display: flex;
        gap: 12px;
        margin-top: 32px;

        .el-button {
          flex: 1;
        }
      }
    }
  }
}

// Vant组件覆盖
:deep(.van-pull-refresh__track) {
  min-height: auto;
}
</style>
