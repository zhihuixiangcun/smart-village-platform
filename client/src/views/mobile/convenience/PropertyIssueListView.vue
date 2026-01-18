<template>
  <div class="property-issues">
    <van-nav-bar title="物业报修" fixed left-arrow @click-left="onClickLeft">
      <template #right>
        <van-icon name="plus" size="20" @click="goToCreate" />
      </template>
    </van-nav-bar>

    <div class="filter-bar">
      <van-dropdown-menu>
        <van-dropdown-item v-model="statusFilter" :options="statusOptions" @change="onFilterChange" />
        <van-dropdown-item v-model="typeFilter" :options="typeOptions" @change="onFilterChange" />
      </van-dropdown-menu>
    </div>

    <van-pull-refresh v-model="loading" @refresh="onRefresh">
      <van-list v-model:loading="listLoading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div v-for="issue in issueList" :key="issue._id" class="issue-card" @click="goToDetail(issue._id)">
          <div class="card-header">
            <van-tag :type="getPriorityType(issue.priority)" size="small">{{ getPriorityLabel(issue.priority) }}</van-tag>
            <span class="issue-date">{{ formatTime(issue.createdAt) }}</span>
          </div>
          <div class="card-body">
            <h3 class="issue-title">{{ issue.title }}</h3>
            <p class="issue-desc">{{ issue.description }}</p>
            <div v-if="issue.photos && issue.photos.length > 0" class="issue-photos">
              <van-image v-for="(photo, index) in issue.photos.slice(0, 3)" :key="index" :src="photo.url" class="photo-img" />
              <div v-if="issue.photos.length > 3" class="photo-more">
                +{{ issue.photos.length - 3 }}
              </div>
            </div>
          </div>
          <div class="card-footer">
            <div class="issue-info">
              <span class="info-label">类型</span>
              <span class="info-value">{{ getTypeLabel(issue.issueType) }}</span>
            </div>
            <div class="issue-info">
              <span class="info-label">位置</span>
              <span class="info-value">{{ issue.location }}</span>
            </div>
            <div class="issue-status">
              <van-tag :type="getStatusType(issue.status)" size="small">{{ getStatusLabel(issue.status) }}</van-tag>
            </div>
            <div class="issue-actions">
              <van-icon name="like-o" :color="issue.isLiked ? '#F59E0B' : '#999'" @click.stop="toggleLike(issue)" />
              <van-icon name="comment-o" :color="issue.commentCount > 0 ? '#F59E0B' : '#999'" />
              <span class="comment-count">{{ issue.commentCount }}</span>
            </div>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <van-empty v-if="issueList.length === 0 && !loading" description="暂无报修问题" />

    <van-tabbar v-model="activeTab" :fixed="true" :placeholder="true">
      <van-tabbar-item>问题列表</van-tabbar-item>
      <van-tabbar-item>我的问题</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Toast } from 'vant';
import propertyApi from '@/api/propertyApi';

const router = useRouter();
const activeFilter = ref('');
const statusFilter = ref('');
const typeFilter = ref('');
const issueList = ref([]);
const loading = ref(false);
const listLoading = ref(false);
const finished = ref(false);
const page = ref(1);
const activeTab = ref(0);

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '待处理', value: 'pending' },
  { text: '处理中', value: 'processing' },
  { text: '已解决', value: 'resolved' },
];

const typeOptions = [
  { text: '全部类型', value: '' },
  { text: '公共设施', value: 'facility' },
  { text: '物业维修', value: 'repair' },
  { text: '建议意见', value: 'suggestion' },
  { text: '投诉建议', value: 'complaint' },
];

const onClickLeft = () => router.back();

const goToCreate = () => {
  router.push('/mobile/convenience/property/submit');
};

const getPriorityType = (priority) => {
  const priorityMap = {
    low: 'default',
    medium: 'warning',
    high: 'warning',
    urgent: 'danger',
  };
  return priorityMap[priority] || 'default';
};

const getPriorityLabel = (priority) => {
  const labels = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  };
  return labels[priority] || '普通';
};

const getTypeLabel = (type) => {
  const labels = {
    facility: '公共设施',
    repair: '物业维修',
    suggestion: '建议意见',
    complaint: '投诉建议',
  };
  return labels[type] || type;
};

const getStatusType = (status) => {
  const statusMap = {
    pending: 'default',
    processing: 'warning',
    resolved: 'success',
  };
  return statusMap[status] || 'default';
};

const getStatusLabel = (status) => {
  const statusMap = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
  };
  return statusMap[status] || status;
};

const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
};

const onFilterChange = () => {
  page.value = 1;
  issueList.value = [];
  finished.value = false;
  loadIssues();
};

const onRefresh = async () => {
  page.value = 1;
  finished.value = false;
  await loadIssues();
  loading.value = false;
};

const onLoad = async () => {
  if (!finished.value) {
    page.value += 1;
    await loadIssues();
  }
};

const loadIssues = async () => {
  listLoading.value = true;
  try {
    const params = { 
      page: page.value, 
      limit: 10,
      ...(activeTab.value === 1 && { issueType: typeFilter.value }),
      ...(statusFilter.value && { status: statusFilter.value }),
    };
    const res = await propertyApi.getIssues(params);
    if (res.success) {
      issueList.value = [...issueList.value, ...res.data];
      if (res.data.length < 10) finished.value = true;
    }
  } catch (error) {
    console.error('加载问题列表失败:', error);
    Toast.fail('加载失败');
  } finally {
    listLoading.value = false;
  }
};

const toggleLike = async (issue) => {
  if (issue.isLiked) {
    issue.isLiked = false;
    issue.likesCount -= 1;
    await propertyApi.removeLike(issue._id);
  } else {
    issue.isLiked = true;
    issue.likesCount += 1;
    await propertyApi.addLike(issue._id);
  }
};

onMounted(() => {
  loadIssues();
});
</script>

<style scoped>
.property-issues {
  min-height: 100vh;
  background: #E3F2FD;
  padding-top: 46px;
  padding-bottom: 60px;
}

.filter-bar {
  padding: 12px;
  background: #fff;
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.issue-card {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
  cursor: pointer;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.issue-date {
  font-size: 12px;
  color: #718096;
}

.card-body {
  margin-bottom: 12px;
}

.issue-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A237E;
  margin: 0 0 8px 0;
}

.issue-desc {
  font-size: 14px;
  color: #4A5568;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.issue-photos {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.photo-img {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
}

.photo-more {
  align-self: center;
  color: #F59E0B;
  font-size: 14px;
}

.card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  border-top: 1px solid #E0E7FF;
  padding-top: 12px;
}

.issue-info {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #718096;
  margin-right: 12px;
}

.issue-info:last-child {
  margin-right: 0;
}

.info-label {
  color: #94A3B8;
  margin-right: 4px;
}

.info-value {
  color: #1A237E;
  font-weight: 500;
}

.issue-status {
  margin-left: auto;
}

.issue-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
}

.comment-count {
  font-size: 12px;
  color: #999;
}
</style>
