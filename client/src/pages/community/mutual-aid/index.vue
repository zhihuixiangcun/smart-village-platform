<template>
  <div class="mutual-aid">
    <div class="aid-header">
      <h1>邻里互助</h1>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        发布需求
      </el-button>
    </div>

    <div class="aid-filters">
      <el-row :gutter="16">
        <el-col :span="5">
          <el-select v-model="filters.type" @change="loadRequests" placeholder="全部分类">
            <el-option label="全部分类" value=""></el-option>
            <el-option label="劳务帮助" value="labor"></el-option>
            <el-option label="物品借用" value="borrow"></el-option>
            <el-option label="信息咨询" value="consult"></el-option>
            <el-option label="紧急求助" value="emergency"></el-option>
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filters.urgency" @change="loadRequests" placeholder="紧急程度">
            <el-option label="全部" value=""></el-option>
            <el-option label="紧急" value="urgent"></el-option>
            <el-option label="一般" value="normal"></el-option>
            <el-option label="不急" value="low"></el-option>
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filters.status" @change="loadRequests" placeholder="状态">
            <el-option label="全部状态" value=""></el-option>
            <el-option label="待帮助" value="pending"></el-option>
            <el-option label="进行中" value="helping"></el-option>
            <el-option label="已完成" value="completed"></el-option>
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-input v-model="filters.keyword" @keyup.enter="loadRequests" placeholder="搜索..." clearable>
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="2">
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </div>

    <div class="aid-content" v-loading="loading">
      <el-empty v-if="requests.length === 0 && !loading" description="暂无互助需求"></el-empty>

      <div class="request-list" v-else>
        <div v-for="request in requests" :key="request.id" class="request-card">
          <div class="card-header">
            <div class="requester-info">
              <el-avatar :size="40" :src="request.requesterAvatar"></el-avatar>
              <div class="info">
                <span class="name">{{ request.requesterName }}</span>
                <span class="time">{{ formatTime(request.createdAt) }}</span>
              </div>
            </div>
            <div class="status-tags">
              <el-tag :type="getUrgencyType(request.urgency)" size="small">{{ getUrgencyText(request.urgency) }}</el-tag>
              <el-tag :type="getStatusType(request.status)" size="small">{{ getStatusText(request.status) }}</el-tag>
            </div>
          </div>

          <h3 class="request-title" @click="viewDetail(request.id)">{{ request.title }}</h3>
          <p class="request-description">{{ request.description }}</p>

          <div class="request-info">
            <div class="info-item">
              <el-icon><Location /></el-icon>
              <span>{{ request.location }}</span>
            </div>
            <div class="info-item">
              <el-icon><User /></el-icon>
              <span>{{ request.helpersCount }} 人提供帮助</span>
            </div>
          </div>

          <div class="card-footer">
            <div class="deadline" v-if="request.deadline">
              <el-icon><Clock /></el-icon>
              <span>截止: {{ formatDateTime(request.deadline) }}</span>
            </div>
            <div class="actions">
              <el-button link @click="viewDetail(request.id)">查看详情</el-button>
              <el-button
                v-if="request.status === 'pending' && request.requesterId !== currentUserId"
                type="primary"
                size="small"
                @click="handleOfferHelp(request)"
              >
                提供帮助
              </el-button>
            </div>
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
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Search, Location, User, Clock } from '@element-plus/icons-vue';
import { communityApi } from '@/api/community';

const router = useRouter();
const loading = ref(false);
const requests = ref([]);
const currentUserId = ref(localStorage.getItem('userId'));

const filters = reactive({
  type: '',
  urgency: '',
  status: '',
  keyword: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const loadRequests = async () => {
  loading.value = true;
  try {
    const response = await communityApi.getAidRequests({
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters,
    });

    if (response.data.success) {
      requests.value = response.data.data.list || [];
      pagination.total = response.data.data.total || 0;
    }
  } catch (error) {
    ElMessage.error('加载互助需求失败');
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  router.push('/community/mutual-aid/create');
};

const viewDetail = (id) => {
  router.push(`/community/mutual-aid/${id}`);
};

const handleOfferHelp = async (request) => {
  try {
    await communityApi.offerHelp(request.id, {
      message: '我可以提供帮助',
    });
    ElMessage.success('已提交帮助申请');
    loadRequests();
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const resetFilters = () => {
  filters.type = '';
  filters.urgency = '';
  filters.status = '';
  filters.keyword = '';
  pagination.page = 1;
  loadRequests();
};

const handleSizeChange = (size) => {
  pagination.pageSize = size;
  pagination.page = 1;
  loadRequests();
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadRequests();
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

onMounted(() => {
  loadRequests();
});
</script>

<style lang="scss" scoped>
.mutual-aid {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.aid-header {
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

.aid-filters {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.aid-content {
  .request-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
  }

  .request-card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;

      .requester-info {
        display: flex;
        align-items: center;
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

      .status-tags {
        display: flex;
        gap: 8px;
      }
    }

    .request-title {
      margin: 0 0 12px 0;
      font-size: 18px;
      color: #0f172a;
      cursor: pointer;
      transition: color 0.3s ease;

      &:hover {
        color: #2563eb;
      }
    }

    .request-description {
      margin: 0 0 16px 0;
      color: #64748b;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .request-info {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 4px;

      .info-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        color: #64748b;
      }
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;

      .deadline {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #94a3b8;
      }

      .actions {
        display: flex;
        gap: 8px;
      }
    }
  }

  .pagination {
    display: flex;
    justify-content: center;
    margin-top: 32px;
  }
}

@media (max-width: 768px) {
  .mutual-aid {
    padding: 16px;
  }

  .aid-content .request-list {
    grid-template-columns: 1fr;
  }
}
</style>
