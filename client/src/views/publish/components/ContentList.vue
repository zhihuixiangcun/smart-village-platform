<template>
  <div class="content-list">
    <!-- 操作栏 -->
    <div class="action-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索标题或内容..."
        clearable
        @keyup.enter="handleSearch"
        @clear="handleSearch"
        style="width: 300px"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select v-model="statusFilter" placeholder="状态筛选" clearable @change="handleFilter" style="width: 150px">
        <el-option label="全部" value="" />
        <el-option label="草稿" value="draft" />
        <el-option label="待审核" value="pending" />
        <el-option label="已发布" value="published" />
        <el-option label="已下架" value="archived" />
      </el-select>

      <el-button @click="$emit('refresh')">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 内容列表 -->
    <el-table :data="filteredItems" v-loading="loading" stripe>
      <el-table-column prop="title" label="标题" min-width="200">
        <template #default="{ row }">
          <div class="title-cell">
            <span class="title-text">{{ row.title }}</span>
            <el-tag v-if="row.status" :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="content" label="内容摘要" min-width="250">
        <template #default="{ row }">
          <div class="content-cell">
            {{ (row.content || row.text || '').substring(0, 80) }}...
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="author.name" label="发布者" width="120">
        <template #default="{ row }">
          <div class="author-cell">
            <el-avatar :size="24" :src="row.author?.avatar">
              {{ row.author?.name?.charAt(0) }}
            </el-avatar>
            <span>{{ row.author?.name || '-' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="stats.views" label="浏览/点赞" width="120" align="center">
        <template #default="{ row }">
          <div class="stats-cell">
            <el-icon><View /></el-icon>
            {{ row.stats?.views || row.interactions?.views || 0 }}
            <el-icon style="margin-left: 8px"><Star /></el-icon>
            {{ row.stats?.likes || row.interactions?.likes || 0 }}
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="createdAt" label="发布时间" width="120">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="$emit('edit', row)">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button link type="success" @click="$emit('publish', row)" v-if="row.status !== 'published'">
            <el-icon><Promotion /></el-icon>
            发布
          </el-button>
          <el-button link type="danger" @click="$emit('delete', row)">
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next, jumper"
      class="pagination"
    />

    <!-- 空状态 -->
    <el-empty v-if="!filteredItems.length && !loading" description="暂无数据" />
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits, watch } from 'vue'
import { Search, Refresh, View, Star, Edit, Promotion, Delete } from '@element-plus/icons-vue'

defineProps({
  type: {
    type: String,
    default: ''
  },
  items: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['refresh', 'edit', 'delete', 'publish'])

const searchKeyword = ref('')
const statusFilter = ref('')

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

// 过滤后的列表
const filteredItems = computed(() => {
  let result = [...props.items]

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(item => {
      return (
        (item.title && item.title.toLowerCase().includes(keyword)) ||
        (item.content && item.content.toLowerCase().includes(keyword)) ||
        (item.text && item.text.toLowerCase().includes(keyword))
      )
    })
  }

  if (statusFilter.value) {
    result = result.filter(item => item.status === statusFilter.value)
  }

  return result
})

// 监听items变化，更新总数
watch(() => props.items, (newItems) => {
  pagination.value.total = newItems.length
}, { immediate: true })

const handleSearch = () => {
  pagination.value.page = 1
}

const handleFilter = () => {
  pagination.value.page = 1
}

const getStatusType = (status) => {
  const types = {
    draft: 'info',
    pending: 'warning',
    published: 'success',
    archived: 'danger'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    draft: '草稿',
    pending: '待审核',
    published: '已发布',
    archived: '已下架'
  }
  return labels[status] || status
}

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped lang="scss">
.content-list {
  .action-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .title-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .title-text {
      font-weight: 500;
    }
  }

  .content-cell {
    color: #909399;
    font-size: 13px;
    line-height: 1.5;
  }

  .author-cell {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .stats-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: #909399;
    font-size: 13px;
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }
}
</style>
