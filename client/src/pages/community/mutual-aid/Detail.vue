<template>
  <div class="aid-detail">
    <div v-loading="loading" class="detail-container">
      <div v-if="request" class="aid-content">
        <div class="aid-header">
          <div class="requester-section">
            <el-avatar :size="60" :src="request.requesterAvatar"></el-avatar>
            <div class="requester-info">
              <h2>{{ request.requesterName }}</h2>
              <p>{{ formatTime(request.createdAt) }}</p>
            </div>
          </div>
          <div class="status-section">
            <el-tag :type="getUrgencyType(request.urgency)" size="large">
              {{ getUrgencyText(request.urgency) }}
            </el-tag>
            <el-tag :type="getStatusType(request.status)" size="large">
              {{ getStatusText(request.status) }}
            </el-tag>
          </div>
        </div>

        <h1 class="aid-title">{{ request.title }}</h1>

        <div class="aid-description" v-html="request.description"></div>

        <div class="aid-info">
          <div class="info-row">
            <span class="label">类型:</span>
            <span class="value">{{ getTypeText(request.type) }}</span>
          </div>
          <div class="info-row">
            <span class="label">地点:</span>
            <span class="value">{{ request.location }}</span>
          </div>
          <div class="info-row">
            <span class="label">截止时间:</span>
            <span class="value">{{ formatDateTime(request.deadline) }}</span>
          </div>
          <div class="info-row">
            <span class="label">帮助人数:</span>
            <span class="value">{{ request.helpersCount }} 人</span>
          </div>
        </div>

        <div class="aid-actions">
          <el-button v-if="request.status === 'pending' && request.requesterId !== currentUserId" type="primary" @click="handleOfferHelp">
            提供帮助
          </el-button>
          <el-button v-if="request.requesterId === currentUserId" type="success" @click="handleComplete" :disabled="request.status !== 'helping'">
            完成互助
          </el-button>
        </div>

        <div class="helpers-section">
          <h3>提供帮助的人 ({{ request.helpers?.length || 0 }})</h3>
          <div class="helpers-list">
            <div v-for="helper in request.helpers" :key="helper.id" class="helper-item">
              <el-avatar :size="40" :src="helper.avatar"></el-avatar>
              <div class="helper-info">
                <span class="name">{{ helper.name }}</span>
                <span class="message">{{ helper.message }}</span>
              </div>
              <el-button
                v-if="request.requesterId === currentUserId && request.status === 'pending'"
                size="small"
                type="primary"
                @click="handleAcceptHelper(helper)"
              >
                接受
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { communityApi } from '@/api/community';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const request = ref(null);
const currentUserId = ref(localStorage.getItem('userId'));

const loadRequest = async () => {
  loading.value = true;
  try {
    const response = await communityApi.getAidRequestById(route.params.id);
    if (response.data.success) {
      request.value = response.data.data;
    }
  } catch (error) {
    ElMessage.error('加载互助详情失败');
  } finally {
    loading.value = false;
  }
};

const handleOfferHelp = async () => {
  try {
    await ElMessageBox.prompt('请输入您的帮助信息', '提供帮助', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });

    await communityApi.offerHelp(request.value.id, {
      message: '我可以提供帮助',
    });
    ElMessage.success('已提交帮助申请');
    loadRequest();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  }
};

const handleAcceptHelper = async (helper) => {
  try {
    await ElMessageBox.confirm(`确定接受 ${helper.name} 的帮助吗?`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await communityApi.acceptHelper(request.value.id, helper.id);
    ElMessage.success('已接受帮助');
    loadRequest();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  }
};

const handleComplete = async () => {
  try {
    await ElMessageBox.confirm('确定完成此次互助吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await communityApi.completeAidRequest(request.value.id, {});
    ElMessage.success('互助已完成');
    loadRequest();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  }
};

const formatTime = (date) => {
  return new Date(date).toLocaleDateString('zh-CN');
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('zh-CN');
};

const getUrgencyType = (urgency) => {
  const types = { urgent: 'danger', normal: 'warning', low: 'info' };
  return types[urgency] || '';
};

const getUrgencyText = (urgency) => {
  const texts = { urgent: '紧急', normal: '一般', low: '不急' };
  return texts[urgency] || urgency;
};

const getStatusType = (status) => {
  const types = { pending: 'info', helping: 'warning', completed: 'success' };
  return types[status] || '';
};

const getStatusText = (status) => {
  const texts = { pending: '待帮助', helping: '进行中', completed: '已完成' };
  return texts[status] || status;
};

const getTypeText = (type) => {
  const types = { labor: '劳务帮助', borrow: '物品借用', consult: '信息咨询', emergency: '紧急求助' };
  return types[type] || type;
};

onMounted(() => {
  loadRequest();
});
</script>

<style lang="scss" scoped>
.aid-detail {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.detail-container {
  background: white;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .aid-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 20px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 24px;

    .requester-section {
      display: flex;
      gap: 16px;

      .requester-info {
        h2 {
          margin: 0 0 4px 0;
          font-size: 18px;
          color: #0f172a;
        }

        p {
          margin: 0;
          font-size: 14px;
          color: #64748b;
        }
      }
    }

    .status-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  }

  .aid-title {
    font-size: 28px;
    color: #0f172a;
    margin: 0 0 24px 0;
  }

  .aid-description {
    line-height: 1.8;
    color: #334155;
    font-size: 16px;
    margin-bottom: 24px;
  }

  .aid-info {
    background: #f8fafc;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 24px;

    .info-row {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }

      .label {
        font-weight: 600;
        color: #64748b;
        min-width: 80px;
      }

      .value {
        color: #0f172a;
      }
    }
  }

  .aid-actions {
    display: flex;
    gap: 12px;
    padding: 20px 0;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 32px;
  }

  .helpers-section {
    h3 {
      margin: 0 0 16px 0;
      font-size: 20px;
      color: #0f172a;
    }

    .helpers-list {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .helper-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;

        .helper-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;

          .name {
            font-weight: 600;
            color: #0f172a;
          }

          .message {
            font-size: 14px;
            color: #64748b;
          }
        }
      }
    }
  }
}
</style>
