<template>
  <div class="announcement-management">
    <div class="toolbar">
      <el-row :gutter="16">
        <el-col :span="8">
          <el-input
            v-model="searchQuery"
            placeholder="搜索公告标题..."
            :size="largeTextMode ? 'large' : 'default'"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="statusFilter"
            placeholder="状态筛选"
            :size="largeTextMode ? 'large' : 'default'"
            clearable
          >
            <el-option label="全部" value="" />
            <el-option label="已发布" value="published" />
            <el-option label="草稿" value="draft" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="categoryFilter"
            placeholder="分类筛选"
            :size="largeTextMode ? 'large' : 'default'"
            clearable
          >
            <el-option label="全部分类" value="" />
            <el-option label="政策通知" value="policy" />
            <el-option label="村务公告" value="village" />
            <el-option label="紧急通知" value="emergency" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="$emit('refresh')" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </el-col>
      </el-row>
    </div>

    <div class="announcement-list" v-loading="loading">
      <div
        v-for="announcement in filteredAnnouncements"
        :key="announcement.id"
        class="announcement-item"
        :class="{ 'high-priority': announcement.priority === 'high' }"
      >
        <div class="item-header">
          <div class="item-title">
            <el-icon v-if="announcement.priority === 'high'" color="#f56c6c" class="priority-icon">
              <Warning />
            </el-icon>
            <span>{{ announcement.title }}</span>
            <el-tag :type="getStatusType(announcement.status)" size="small">
              {{ getStatusLabel(announcement.status) }}
            </el-tag>
            <el-tag :type="getCategoryType(announcement.category)" size="small">
              {{ announcement.category }}
            </el-tag>
          </div>
          <div class="item-time">{{ announcement.publishTime }}</div>
        </div>

        <div class="item-content">
          <div class="content-preview">{{ announcement.content }}</div>
        </div>

        <div class="item-footer">
          <div class="item-stats">
            <span class="stat-item">
              <el-icon><View /></el-icon>
              阅读 {{ announcement.readCount }}
            </span>
            <span v-if="announcement.attachments?.length > 0" class="stat-item">
              <el-icon><Paperclip /></el-icon>
              {{ announcement.attachments.length }}个附件
            </span>
          </div>

          <div class="item-actions">
            <el-button size="small" @click="$emit('edit', announcement)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              v-if="announcement.status === 'draft'"
              size="small"
              type="success"
              @click="$emit('publish', announcement.id)"
            >
              <el-icon><Promotion /></el-icon>
              发布
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(announcement)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
      </div>

      <el-empty v-if="filteredAnnouncements.length === 0" description="暂无公告" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessageBox } from 'element-plus';
import {
  Search,
  Refresh,
  Warning,
  View,
  Paperclip,
  Edit,
  Delete,
  Promotion,
} from '@element-plus/icons-vue';

const props = defineProps({
  announcements: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['refresh', 'edit', 'delete', 'publish']);

const largeTextMode = ref(false);
const searchQuery = ref('');
const statusFilter = ref('');
const categoryFilter = ref('');

const filteredAnnouncements = computed(() => {
  let filtered = props.announcements;

  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      item => item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query)
    );
  }

  // 状态筛选
  if (statusFilter.value) {
    filtered = filtered.filter(item => item.status === statusFilter.value);
  }

  // 分类筛选
  if (categoryFilter.value) {
    filtered = filtered.filter(item =>
      item.category.toLowerCase().includes(categoryFilter.value.toLowerCase())
    );
  }

  return filtered;
});

const getStatusType = status => {
  switch (status) {
    case 'published':
      return 'success';
    case 'draft':
      return 'warning';
    default:
      return 'info';
  }
};

const getStatusLabel = status => {
  switch (status) {
    case 'published':
      return '已发布';
    case 'draft':
      return '草稿';
    default:
      return '未知';
  }
};

const getCategoryType = category => {
  switch (category) {
    case '政策通知':
      return 'primary';
    case '村务公告':
      return 'success';
    case '紧急通知':
      return 'danger';
    default:
      return 'info';
  }
};

const handleDelete = announcement => {
  ElMessageBox.confirm(`确定要删除公告 "${announcement.title}" 吗？`, '确认删除', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  })
    .then(() => {
      emit('delete', announcement.id);
    })
    .catch(() => {
      // 用户取消删除
    });
};
</script>

<style scoped>
.announcement-management {
  margin: -20px;
}

.toolbar {
  padding: 20px;
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.announcement-list {
  padding: 20px;
}

.announcement-item {
  background: white;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 20px;
  transition: all 0.3s ease;
}

.announcement-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.announcement-item.high-priority {
  border-left: 4px solid #f56c6c;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.item-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  flex: 1;
}

.priority-icon {
  margin-right: 4px;
}

.item-time {
  color: #909399;
  font-size: 14px;
}

.item-content {
  margin-bottom: 16px;
}

.content-preview {
  color: #606266;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 14px;
}

.item-actions {
  display: flex;
  gap: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .item-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .item-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
