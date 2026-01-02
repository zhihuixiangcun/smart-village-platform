<template>
  <div class="review-queue">
    <el-empty v-if="!items.length" description="暂无待审核内容" />

    <div v-else class="queue-list">
      <div
        v-for="item in items"
        :key="item._id"
        class="queue-item"
      >
        <div class="item-header">
          <div class="item-type">
            <el-tag :type="getTypeColor(item.type)" size="small">
              {{ getTypeLabel(item.type) }}
            </el-tag>
            <span class="item-title">{{ item.title }}</span>
          </div>
          <div class="item-time">
            {{ formatTime(item.createdAt) }}
          </div>
        </div>

        <div class="item-content">
          {{ item.content || item.text }}
        </div>

        <div class="item-author">
          <el-avatar :size="32" :src="item.author?.avatar">
            {{ item.author?.name?.charAt(0) }}
          </el-avatar>
          <span class="author-name">{{ item.author?.name }}</span>
        </div>

        <div class="item-actions">
          <el-button type="success" size="small" @click="$emit('approve', item)">
            <el-icon><Select /></el-icon>
            通过
          </el-button>
          <el-button type="danger" size="small" @click="$emit('reject', item)">
            <el-icon><Close /></el-icon>
            拒绝
          </el-button>
          <el-button size="small" @click="viewDetail(item)">
            <el-icon><View /></el-icon>
            详情
          </el-button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <el-pagination
      v-if="items.length > 10"
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      class="pagination"
    />
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { Select, Close, View } from '@element-plus/icons-vue'

defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

defineEmits(['approve', 'reject'])

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const getTypeLabel = (type) => {
  const labels = {
    agriculture: '农业知识',
    social: '朋友圈动态',
    announcement: '公告',
    governance: '村务公开',
    finance: '财务公开'
  }
  return labels[type] || type
}

const getTypeColor = (type) => {
  const colors = {
    agriculture: 'success',
    social: 'primary',
    announcement: 'warning',
    governance: 'info',
    finance: 'danger'
  }
  return colors[type] || 'info'
}

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

const viewDetail = (item) => {
  // TODO: 实现详情查看
  console.log('View detail:', item)
}
</script>

<style scoped lang="scss">
.review-queue {
  .queue-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .queue-item {
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;
    border: 1px solid #e4e7ed;
    transition: all 0.3s;

    &:hover {
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .item-type {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .item-title {
        font-size: 16px;
        font-weight: 500;
        color: #303133;
      }

      .item-time {
        font-size: 12px;
        color: #909399;
      }
    }

    .item-content {
      color: #606266;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 12px;
      padding: 12px;
      background: white;
      border-radius: 4px;
      max-height: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
    }

    .item-author {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: white;
      border-radius: 4px;
      width: fit-content;

      .author-name {
        font-size: 14px;
        color: #606266;
      }
    }

    .item-actions {
      display: flex;
      gap: 8px;
    }
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }
}
</style>
