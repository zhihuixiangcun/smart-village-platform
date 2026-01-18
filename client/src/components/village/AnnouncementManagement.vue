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
/* Root variables for green theme */
:deep(.announcement-management) {
  --primary-green: #67C23A;
  --primary-green-light: #95D475;
  --primary-green-lighter: #B3E19D;
  --primary-green-pale: #E1F3D8;
  --danger-red: #f56c6c;
  --text-primary: #303133;
  --text-secondary: #606266;
  --text-tertiary: #909399;
  --border-light: #EBEEF5;
  --shadow-sm: 0 2px 8px rgba(103, 194, 58, 0.08);
  --shadow-md: 0 4px 16px rgba(103, 194, 58, 0.12);
  --shadow-lg: 0 8px 24px rgba(103, 194, 58, 0.16);
}

.announcement-management {
  margin: -20px;
  background: linear-gradient(180deg, #f5fbf2 0%, #ffffff 100%);
  min-height: 100vh;
}

/* Toolbar Styling */
.toolbar {
  padding: 24px 20px;
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.03) 0%, rgba(255, 255, 255, 0.95) 100%);
  border-bottom: 2px solid rgba(103, 194, 58, 0.1);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 12px rgba(103, 194, 58, 0.06);
}

.toolbar :deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.toolbar :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.15);
  border-color: var(--primary-green-light);
}

.toolbar :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.1);
  border-color: var(--primary-green);
}

.toolbar :deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

.toolbar :deep(.el-button--primary) {
  background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-green-light) 100%);
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.25);
}

.toolbar :deep(.el-button--primary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.35);
  background: linear-gradient(135deg, var(--primary-green-light) 0%, var(--primary-green) 100%);
}

.toolbar :deep(.el-button--primary:active) {
  transform: translateY(0);
}

.toolbar :deep(.el-icon) {
  transition: transform 0.3s ease;
}

.toolbar :deep(.el-button:hover .el-icon) {
  transform: rotate(180deg);
}

.announcement-list {
  padding: 24px 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Announcement Card Styling */
.announcement-item {
  background: white;
  border: 1px solid rgba(103, 194, 58, 0.1);
  border-radius: 12px;
  margin-bottom: 20px;
  padding: 24px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.announcement-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary-green), var(--primary-green-lighter), var(--primary-green-light));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.announcement-item:hover {
  transform: translateY(-4px) translateX(4px);
  box-shadow: var(--shadow-lg);
  border-color: rgba(103, 194, 58, 0.2);
}

.announcement-item:hover::before {
  opacity: 1;
}

.announcement-item:active {
  transform: translateY(-2px) translateX(2px);
}

/* High Priority Card Special Styling */
.announcement-item.high-priority {
  border-left: 4px solid var(--danger-red);
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.02) 0%, white 100%);
}

.announcement-item.high-priority::before {
  background: linear-gradient(90deg, var(--danger-red), #f78989, #fab6b6);
  opacity: 1;
}

.announcement-item.high-priority:hover {
  box-shadow: 0 8px 24px rgba(245, 108, 108, 0.15);
  border-left-width: 6px;
}

/* Card Header */
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  position: relative;
}

.item-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  line-height: 1.5;
  letter-spacing: 0.2px;
}

.item-title span {
  transition: color 0.3s ease;
}

.announcement-item:hover .item-title span {
  color: var(--primary-green);
}

.priority-icon {
  margin-right: 2px;
  animation: pulse 2s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px rgba(245, 108, 108, 0.3));
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.item-time {
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  background: var(--primary-green-pale);
  border-radius: 20px;
  transition: all 0.3s ease;
}

.announcement-item:hover .item-time {
  background: var(--primary-green-lighter);
  color: var(--primary-green);
}

/* Enhanced Tag Styling */
.item-title :deep(.el-tag) {
  border-radius: 12px;
  font-weight: 500;
  padding: 4px 10px;
  font-size: 12px;
  border: none;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.item-title :deep(.el-tag--success) {
  background: linear-gradient(135deg, var(--primary-green-lighter) 0%, var(--primary-green-pale) 100%);
  color: var(--primary-green);
}

.item-title :deep(.el-tag--warning) {
  background: linear-gradient(135deg, #faecd8 0%, #fde6e0 100%);
  color: #e6a23c;
}

.item-title :deep(.el-tag--primary) {
  background: linear-gradient(135deg, #d9ecff 0%, #c6e2ff 100%);
  color: #409eff;
}

.item-title :deep(.el-tag--danger) {
  background: linear-gradient(135deg, #fde2e2 0%, #fbc4c4 100%);
  color: var(--danger-red);
}

.item-title :deep(.el-tag--info) {
  background: linear-gradient(135deg, #f4f4f5 0%, #e9e9eb 100%);
  color: #909399;
}

.item-title :deep(.el-tag:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

/* Card Content */
.item-content {
  margin-bottom: 18px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.03) 0%, rgba(103, 194, 58, 0.01) 100%);
  border-radius: 8px;
  border: 1px dashed rgba(103, 194, 58, 0.15);
  transition: all 0.3s ease;
}

.announcement-item:hover .item-content {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.05) 0%, rgba(103, 194, 58, 0.02) 100%);
  border-color: rgba(103, 194, 58, 0.25);
}

.content-preview {
  color: var(--text-secondary);
  line-height: 1.8;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}

/* Card Footer */
.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.item-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  background: white;
  border-radius: 20px;
  border: 1px solid var(--border-light);
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: var(--primary-green-pale);
  color: var(--primary-green);
  border-color: var(--primary-green-lighter);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.15);
}

.stat-item .el-icon {
  font-size: 15px;
  transition: transform 0.3s ease;
}

.stat-item:hover .el-icon {
  transform: scale(1.2);
}

/* Action Buttons */
.item-actions {
  display: flex;
  gap: 10px;
}

.item-actions :deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  padding: 8px 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-light);
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.item-actions :deep(.el-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.item-actions :deep(.el-button:active) {
  transform: translateY(0);
}

.item-actions :deep(.el-button--success) {
  background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-green-light) 100%);
  border: none;
  color: white;
}

.item-actions :deep(.el-button--success:hover) {
  background: linear-gradient(135deg, var(--primary-green-light) 0%, var(--primary-green) 100%);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
}

.item-actions :deep(.el-button--danger) {
  background: linear-gradient(135deg, var(--danger-red) 0%, #f78989 100%);
  border: none;
  color: white;
}

.item-actions :deep(.el-button--danger:hover) {
  background: linear-gradient(135deg, #f78989 0%, var(--danger-red) 100%);
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
}

.item-actions :deep(.el-button .el-icon) {
  margin-right: 4px;
  font-size: 14px;
  transition: transform 0.3s ease;
}

.item-actions :deep(.el-button:hover .el-icon) {
  transform: scale(1.1) rotate(5deg);
}

/* Empty State Enhancement */
.announcement-list :deep(.el-empty) {
  padding: 60px 20px;
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.02) 0%, white 100%);
  border-radius: 16px;
  border: 2px dashed rgba(103, 194, 58, 0.2);
}

.announcement-list :deep(.el-empty__description) {
  color: var(--text-tertiary);
  font-size: 15px;
  font-weight: 500;
}

.announcement-list :deep(.el-empty__image svg) {
  fill: rgba(103, 194, 58, 0.15);
}

/* Loading State Enhancement */
.announcement-list :deep(.el-loading-mask) {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  border-radius: 12px;
}

.announcement-list :deep(.el-loading-spinner .path) {
  stroke: var(--primary-green);
}

/* Responsive Design */
@media (max-width: 768px) {
  .announcement-management {
    background: white;
  }

  .toolbar {
    padding: 16px;
    position: relative;
  }

  .toolbar :deep(.el-row) {
    flex-direction: column;
    gap: 12px;
  }

  .toolbar :deep(.el-col) {
    width: 100% !important;
  }

  .announcement-list {
    padding: 16px;
  }

  .announcement-item {
    padding: 18px;
    margin-bottom: 16px;
    border-radius: 10px;
  }

  .announcement-item:hover {
    transform: translateY(-2px);
  }

  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .item-title {
    font-size: 15px;
    width: 100%;
  }

  .item-title :deep(.el-tag) {
    font-size: 11px;
    padding: 3px 8px;
  }

  .item-time {
    font-size: 12px;
    padding: 4px 10px;
  }

  .item-content {
    padding: 12px;
    margin-bottom: 14px;
  }

  .content-preview {
    font-size: 13px;
    line-height: 1.6;
    -webkit-line-clamp: 3;
  }

  .item-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    padding-top: 14px;
  }

  .item-stats {
    width: 100%;
    justify-content: flex-start;
    gap: 12px;
  }

  .stat-item {
    font-size: 12px;
    padding: 5px 10px;
  }

  .item-actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
  }

  .item-actions :deep(.el-button) {
    flex: 1;
    min-width: calc(33.333% - 6px);
    font-size: 13px;
    padding: 8px 10px;
  }

  .item-actions :deep(.el-button .el-icon) {
    display: none;
  }

  .item-actions :deep(.el-button) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .item-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .item-actions :deep(.el-button) {
    min-width: calc(50% - 4px);
  }
}

/* Print Styles */
@media print {
  .toolbar,
  .item-actions {
    display: none;
  }

  .announcement-item {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid #ccc;
  }
}
</style>
