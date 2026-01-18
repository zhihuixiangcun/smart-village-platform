<template>
  <div class="suggestions">
    <div class="suggestions-header">
      <h1>意见箱</h1>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        提交建议
      </el-button>
    </div>

    <div class="suggestions-content" v-loading="loading">
      <el-empty v-if="suggestions.length === 0 && !loading" description="暂无建议"></el-empty>

      <div class="suggestions-list" v-else>
        <div v-for="suggestion in suggestions" :key="suggestion.id" class="suggestion-card">
          <div class="card-header">
            <div class="suggester-info">
              <el-avatar :size="40" :src="suggestion.suggesterAvatar"></el-avatar>
              <div class="info">
                <span class="name">{{ suggestion.suggesterName }}</span>
                <span class="time">{{ formatTime(suggestion.createdAt) }}</span>
              </div>
            </div>
            <el-tag :type="getStatusType(suggestion.status)">{{ getStatusText(suggestion.status) }}</el-tag>
          </div>

          <h3 class="suggestion-title" @click="viewDetail(suggestion.id)">{{ suggestion.title }}</h3>
          <p class="suggestion-description">{{ suggestion.description }}</p>

          <div class="votes-section">
            <el-button :type="suggestion.hasVoted === 'up' ? 'success' : ''" @click="handleVote(suggestion, 'up')">
              <el-icon><Top /></el-icon>
              {{ suggestion.votes.up }} 赞同
            </el-button>
            <el-button :type="suggestion.hasVoted === 'down' ? 'danger' : ''" @click="handleVote(suggestion, 'down')">
              <el-icon><Bottom /></el-icon>
              {{ suggestion.votes.down }} 反对
            </el-button>
          </div>

          <div v-if="suggestion.officialReply && suggestion.officialReply.length > 0" class="official-reply">
            <div class="reply-badge">官方回复</div>
            <div class="reply-content">
              <div class="reply-text">{{ suggestion.officialReply[0].content }}</div>
              <div class="reply-time">{{ formatDateTime(suggestion.officialReply[0].createdAt) }}</div>
            </div>
          </div>

          <div class="card-footer">
            <el-button link @click="viewDetail(suggestion.id)">查看详情</el-button>
          </div>
        </div>
      </div>

      <div class="pagination" v-if="pagination.total > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Top, Bottom } from '@element-plus/icons-vue';
import { communityApi } from '@/api/community';

const router = useRouter();
const loading = ref(false);
const suggestions = ref([]);
const currentUserId = ref(localStorage.getItem('userId'));

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const loadSuggestions = async () => {
  loading.value = true;
  try {
    const response = await communityApi.getSuggestions({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    if (response.data.success) {
      suggestions.value = response.data.data.list || [];
      pagination.total = response.data.data.total || 0;
    }
  } catch (error) {
    ElMessage.error('加载建议失败');
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  router.push('/community/suggestions/create');
};

const viewDetail = (id) => {
  router.push(`/community/suggestions/${id}`);
};

const handleVote = async (suggestion, type) => {
  try {
    await communityApi.voteSuggestion(suggestion.id, { type });
    suggestion.hasVoted = type;
    suggestion.votes[type]++;
    ElMessage.success(type === 'up' ? '已赞同' : '已反对');
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleSizeChange = (size) => {
  pagination.pageSize = size;
  pagination.page = 1;
  loadSuggestions();
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadSuggestions();
};

const formatTime = (date) => {
  return new Date(date).toLocaleDateString('zh-CN');
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('zh-CN');
};

const getStatusType = (status) => {
  const types = { pending: 'info', processing: 'warning', completed: 'success', rejected: 'danger' };
  return types[status] || '';
};

const getStatusText = (status) => {
  const texts = { pending: '待处理', processing: '处理中', completed: '已完成', rejected: '已驳回' };
  return texts[status] || status;
};

loadSuggestions();
</script>

<style lang="scss" scoped>
.suggestions {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: 32px;
    color: #0f172a;
  }
}

.suggestions-content {
  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .suggestion-card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;

      .suggester-info {
        display: flex;
        gap: 12px;

        .info {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .name {
            font-weight: 600;
            color: #0f172a;
          }

          .time {
            font-size: 12px;
            color: #94a3b8;
          }
        }
      }
    }

    .suggestion-title {
      margin: 0 0 12px 0;
      font-size: 18px;
      color: #0f172a;
      cursor: pointer;

      &:hover {
        color: #2563eb;
      }
    }

    .suggestion-description {
      margin: 0 0 16px 0;
      color: #64748b;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .votes-section {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      padding: 16px 0;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }

    .official-reply {
      background: #f0f9ff;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;

      .reply-badge {
        display: inline-block;
        padding: 2px 8px;
        background: #67c23a;
        color: white;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 8px;
      }

      .reply-content {
        .reply-text {
          color: #0f172a;
          line-height: 1.6;
          margin-bottom: 8px;
        }

        .reply-time {
          font-size: 12px;
          color: #64748b;
        }
      }
    }

    .card-footer {
      display: flex;
      justify-content: flex-end;
    }
  }

  .pagination {
    display: flex;
    justify-content: center;
    margin-top: 32px;
  }
}
</style>
