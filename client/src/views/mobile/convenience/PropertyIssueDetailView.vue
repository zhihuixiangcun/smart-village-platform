<template>
  <div class="property-detail">
    <van-nav-bar title="问题详情" fixed left-arrow @click-left="onClickLeft" />

    <div v-if="issue" class="detail-card">
      <div class="card-header">
        <div class="header-info">
          <van-tag :type="getPriorityType(issue.priority)" size="large">{{ getPriorityLabel(issue.priority) }}</van-tag>
          <span class="issue-time">{{ formatTime(issue.createdAt) }}</span>
          <van-tag :type="getStatusType(issue.status)" size="large">{{ getStatusLabel(issue.status) }}</van-tag>
        </div>
        <van-button v-if="issue.userId === currentUserId" type="default" size="small" @click="showMoreMenu">更多操作</van-button>
      </div>

      <div class="card-body">
        <h2 class="detail-title">{{ issue.title }}</h2>
        <div class="type-info">
          <van-tag type="primary" plain>{{ getTypeLabel(issue.issueType) }}</van-tag>
          <span v-if="issue.location">{{ issue.location }}</span>
        </div>

        <div class="description-section">
          <h3 class="section-title">问题描述</h3>
          <p class="description-text">{{ issue.description }}</p>
        </div>

        <div v-if="issue.photos && issue.photos.length > 0" class="photos-section">
          <h3 class="section-title">问题照片</h3>
          <van-image
            v-for="(photo, index) in issue.photos"
            :key="index"
            :src="photo.url"
            :width="300"
            :height="300"
            fit="cover"
            @click="showImagePreview(index)"
            class="photo-img"
          />
        </div>

        <div v-if="issue.assigneeName" class="assignee-section">
          <h3 class="section-title">处理信息</h3>
          <div class="info-row">
            <span class="info-label">处理人：</span>
            <span class="info-value">{{ issue.assigneeName }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">处理时间：</span>
            <span class="info-value">{{ formatDateTime(issue.assignedAt) }}</span>
          </div>
        </div>

        <div v-if="issue.responseText" class="response-section">
          <h3 class="section-title">处理结果</h3>
          <p class="response-text">{{ issue.responseText }}</p>
        </div>

        <div v-if="issue.resolutionPhotos && issue.resolutionPhotos.length > 0" class="photos-section">
          <h3 class="section-title">处理结果照片</h3>
          <van-image
            v-for="(photo, index) in issue.resolutionPhotos"
            :key="index"
            :src="photo.url"
            :width="300"
            :height="300"
            fit="cover"
            class="photo-img"
          />
        </div>

        <div v-if="issue.status === 'resolved'" class="evaluation-section">
          <h3 class="section-title">服务评价</h3>
          <van-rate v-model="rating" :size="25" color="#F59E0B" readonly />
        <van-field
            v-model="feedback"
            type="textarea"
            placeholder="请输入您的评价"
            rows="3"
            maxlength="200"
          />
          <van-button type="primary" size="small" :loading="evaluating" @click="submitEvaluation">提交评价</van-button>
        </div>
      </div>

      <div v-if="issue.status === 'resolved'" class="card-footer">
        <van-button type="default" size="large" @click="goToList">查看我的问题</van-button>
      </div>

      <van-popup v-model="showMoreMenu" position="bottom" :style="{ height: 'auto' }">
        <div class="more-actions">
          <van-button block @click="editIssue">编辑问题</van-button>
          <van-button v-if="issue.userId === currentUserId" type="danger" block @click="deleteIssue">删除问题</van-button>
        </div>
      </van-popup>

      <van-image-preview
        v-model="showImagePreview"
        :images="issue.photos"
        :start-position="previewIndex"
        closeable
      />
    </div>

    <van-loading v-else size="24px" vertical>加载中...</van-loading>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Toast, showDialog } from 'vant';
import propertyApi from '@/api/propertyApi';

const router = useRouter();
const route = useRoute();

const issue = ref(null);
const loading = ref(false);
const showMoreMenu = ref(false);
const showImagePreview = ref(false);
const previewIndex = ref(0);
const rating = ref(0);
const feedback = ref('');
const evaluating = ref(false);

const currentUserId = 'mock_user_id';

const onClickLeft = () => router.back();

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
    closed: 'default',
  };
  return statusMap[status] || 'default';
};

const getStatusLabel = (status) => {
  const statusMap = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭',
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

const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const showImagePreview = (index) => {
  previewIndex.value = index;
  showImagePreview.value = true;
};

const editIssue = () => {
  router.push(`/mobile/convenience/property/edit/${route.params.id}`);
};

const deleteIssue = async () => {
  showDialog({
    title: '确认删除',
    message: '确定要删除这个问题吗？',
    showCancelButton: true,
  }).then(async (action) => {
    if (action === 'confirm') {
      try {
        await propertyApi.deleteIssue(route.params.id);
        Toast.success('删除成功');
        router.back();
      } catch (error) {
        Toast.fail('删除失败');
      }
    }
  });
};

const submitEvaluation = async () => {
  if (!rating.value) {
    Toast('请选择评分');
    return;
  }
  evaluating.value = true;
  try {
    await propertyApi.evaluateIssue(route.params.id, {
      rating: rating.value,
      feedback: feedback.value,
    });
    Toast.success('评价成功');
    issue.value.rating = rating.value;
    issue.value.feedback = feedback.value;
  } catch (error) {
    Toast.fail('评价失败');
  } finally {
    evaluating.value = false;
  }
};

const goToList = () => {
  router.push('/mobile/convenience/property');
};

const loadIssue = async () => {
  loading.value = true;
  try {
    const res = await propertyApi.getIssueById(route.params.id);
    if (res.success) {
      issue.value = res.data;
    }
  } catch (error) {
    console.error('加载问题详情失败:', error);
    Toast.fail('加载失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadIssue();
});
</script>

<style scoped>
.property-detail {
  min-height: 100vh;
  background: #E3F2FD;
  padding-top: 46px;
}

.detail-card {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(25, 118, 210, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.issue-time {
  font-size: 12px;
  color: #718096;
}

.detail-title {
  font-size: 20px;
  font-weight: 600;
  color: #1A237E;
  margin: 0 0 16px 0;
}

.type-info {
  margin: 16px 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A237E;
  margin: 0 0 16px 0;
}

.description-text {
  font-size: 14px;
  color: #4A5568;
  line-height: 1.6;
  margin: 0;
}

.photos-section {
  margin: 24px 0;
}

.photo-img {
  border-radius: 8px;
}

.assignee-section {
  margin: 24px 0;
  border-top: 1px solid #E0E7FF;
  padding-top: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: #718096;
}

.info-label {
  color: #94A3B8;
}

.info-value {
  color: #1A237E;
  font-weight: 500;
}

.response-section {
  margin: 24px 0;
  border-top: 1px solid #E0E7FF;
  padding-top: 16px;
}

.response-text {
  font-size: 14px;
  color: #4A5568;
  line-height: 1.6;
}

.evaluation-section {
  margin: 24px 0;
  border-top: 1px solid #E0E7FF;
  padding-top: 16px;
}

.card-footer {
  display: flex;
  justify-content: center;
  border-top: 1px solid #E0E7FF;
  padding-top: 24px;
}

.more-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}
</style>
