<template>
  <div class="activities">
    <div class="activities-header">
      <h1>活动广场</h1>
      <div class="header-actions">
        <el-button @click="showCalendar = true">
          <el-icon><Calendar /></el-icon>
          日历视图
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          发布活动
        </el-button>
      </div>
    </div>

    <div class="activities-filters">
      <el-row :gutter="16">
        <el-col :span="5">
          <el-select v-model="filters.type" @change="loadActivities" placeholder="活动类型">
            <el-option label="全部类型" value=""></el-option>
            <el-option label="文体活动" value="sports"></el-option>
            <el-option label="培训讲座" value="training"></el-option>
            <el-option label="志愿服务" value="volunteer"></el-option>
            <el-option label="节日庆典" value="festival"></el-option>
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filters.status" @change="loadActivities" placeholder="活动状态">
            <el-option label="全部状态" value=""></el-option>
            <el-option label="报名中" value="registering"></el-option>
            <el-option label="进行中" value="ongoing"></el-option>
            <el-option label="已结束" value="ended"></el-option>
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-input v-model="filters.keyword" @keyup.enter="loadActivities" placeholder="搜索活动..." clearable>
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </div>

    <div class="activities-content" v-loading="loading">
      <el-empty v-if="activities.length === 0 && !loading" description="暂无活动"></el-empty>

      <div class="activities-grid" v-else>
        <div v-for="activity in activities" :key="activity.id" class="activity-card">
          <div class="card-image" v-if="activity.images && activity.images.length > 0">
            <img :src="activity.images[0]" alt="activity image" />
            <el-tag :type="getStatusType(activity.status)" class="status-tag">{{ getStatusText(activity.status) }}</el-tag>
          </div>

          <div class="card-content">
            <h3 class="activity-title" @click="viewActivity(activity.id)">{{ activity.title }}</h3>

            <div class="activity-info">
              <div class="info-item">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDateTime(activity.startTime) }}</span>
              </div>
              <div class="info-item">
                <el-icon><Location /></el-icon>
                <span>{{ activity.location }}</span>
              </div>
              <div class="info-item">
                <el-icon><User /></el-icon>
                <span>{{ activity.currentParticipants }} / {{ activity.maxParticipants }}人</span>
              </div>
            </div>

            <p class="activity-description">{{ activity.description }}</p>

            <div class="card-footer">
              <div class="organizer">
                <el-avatar :size="24" :src="activity.organizerAvatar"></el-avatar>
                <span>{{ activity.organizerName }}</span>
              </div>
              <el-button
                v-if="activity.status === 'registering' && !activity.isJoined"
                type="primary"
                size="small"
                @click="handleJoin(activity)"
              >
                报名
              </el-button>
              <el-button
                v-if="activity.isJoined"
                type="danger"
                size="small"
                @click="handleLeave(activity)"
              >
                取消报名
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination" v-if="pagination.total > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[12, 24, 48]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <el-dialog v-model="showCalendar" title="活动日历" width="80%">
      <CalendarView />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Calendar, Location, User } from '@element-plus/icons-vue';
import { communityApi } from '@/api/community';
import CalendarView from './Calendar.vue';

const router = useRouter();
const loading = ref(false);
const showCalendar = ref(false);
const activities = ref([]);
const currentUserId = ref(localStorage.getItem('userId'));

const filters = reactive({
  type: '',
  status: '',
  keyword: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 12,
  total: 0,
});

const loadActivities = async () => {
  loading.value = true;
  try {
    const response = await communityApi.getActivities({
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters,
    });

    if (response.data.success) {
      activities.value = response.data.data.list || [];
      pagination.total = response.data.data.total || 0;
    }
  } catch (error) {
    ElMessage.error('加载活动失败');
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  router.push('/community/activities/create');
};

const viewActivity = (id) => {
  router.push(`/community/activities/${id}`);
};

const handleJoin = async (activity) => {
  try {
    await ElMessageBox.confirm(`确定要报名参加"${activity.title}"吗?`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await communityApi.joinActivity(activity.id, {});
    ElMessage.success('报名成功');
    loadActivities();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('报名失败');
    }
  }
};

const handleLeave = async (activity) => {
  try {
    await ElMessageBox.confirm('确定要取消报名吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await communityApi.leaveActivity(activity.id);
    ElMessage.success('已取消报名');
    loadActivities();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消失败');
    }
  }
};

const resetFilters = () => {
  filters.type = '';
  filters.status = '';
  filters.keyword = '';
  pagination.page = 1;
  loadActivities();
};

const handleSizeChange = (size) => {
  pagination.pageSize = size;
  pagination.page = 1;
  loadActivities();
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadActivities();
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('zh-CN');
};

const getStatusType = (status) => {
  const types = { registering: 'success', ongoing: 'primary', ended: 'info' };
  return types[status] || '';
};

const getStatusText = (status) => {
  const texts = { registering: '报名中', ongoing: '进行中', ended: '已结束' };
  return texts[status] || status;
};

loadActivities();
</script>

<style lang="scss" scoped>
.activities {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.activities-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: 32px;
    color: #0f172a;
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.activities-filters {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.activities-content {
  .activities-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
  }

  .activity-card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .card-image {
      position: relative;
      height: 200px;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .status-tag {
        position: absolute;
        top: 12px;
        right: 12px;
      }
    }

    .card-content {
      padding: 20px;

      .activity-title {
        margin: 0 0 12px 0;
        font-size: 18px;
        color: #0f172a;
        cursor: pointer;
        transition: color 0.3s ease;

        &:hover {
          color: #2563eb;
        }
      }

      .activity-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;

        .info-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #64748b;
        }
      }

      .activity-description {
        margin: 0 0 16px 0;
        color: #64748b;
        line-height: 1.6;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;

        .organizer {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #64748b;
        }
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
  .activities {
    padding: 16px;
  }

  .activities-header {
    flex-direction: column;
    gap: 12px;

    .header-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }

  .activities-content .activities-grid {
    grid-template-columns: 1fr;
  }
}
</style>
