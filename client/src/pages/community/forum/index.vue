<template>
  <div class="forum-list">
    <div class="forum-header">
      <h1>社区论坛</h1>
      <el-button type="primary" @click="handleCreatePost">
        <el-icon><Plus /></el-icon>
        发帖
      </el-button>
    </div>

    <div class="forum-filters">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-select v-model="filters.category" @change="loadPosts" placeholder="全部分类">
            <el-option label="全部分类" value=""></el-option>
            <el-option label="乡村新闻" value="news"></el-option>
            <el-option label="生活经验" value="life"></el-option>
            <el-option label="农业知识" value="agriculture"></el-option>
            <el-option label="文化活动" value="culture"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filters.sort" @change="loadPosts" placeholder="排序方式">
            <el-option label="最新发布" value="newest"></el-option>
            <el-option label="最多浏览" value="views"></el-option>
            <el-option label="最多评论" value="comments"></el-option>
            <el-option label="最多点赞" value="likes"></el-option>
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-input v-model="filters.keyword" @keyup.enter="loadPosts" placeholder="搜索帖子..." clearable>
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </div>

    <div class="forum-content" v-loading="loading">
      <el-empty v-if="posts.length === 0 && !loading" description="暂无帖子"></el-empty>

      <div class="post-list" v-else>
        <div v-for="post in posts" :key="post.id" class="post-card">
          <div class="post-header">
            <el-avatar :size="48" :src="post.authorAvatar"></el-avatar>
            <div class="post-info">
              <div class="author-name">{{ post.authorName }}</div>
              <div class="post-meta">
                <span>{{ formatDate(post.createdAt) }}</span>
                <el-tag size="small">{{ getCategoryText(post.category) }}</el-tag>
              </div>
            </div>
            <div class="post-status">
              <el-tag v-if="post.isTop" type="danger" size="small">置顶</el-tag>
              <el-tag v-if="post.isHot" type="warning" size="small">热门</el-tag>
            </div>
          </div>

          <h3 class="post-title" @click="viewPost(post.id)">
            {{ post.title }}
          </h3>

          <p class="post-content">{{ post.content }}</p>

          <div v-if="post.images && post.images.length > 0" class="post-images">
            <div class="image-grid">
              <img v-for="(image, index) in post.images.slice(0, 4)" :key="index" :src="image" alt="post image" />
              <div v-if="post.images.length > 4" class="more-images">+{{ post.images.length - 4 }}</div>
            </div>
          </div>

          <div v-if="post.tags && post.tags.length > 0" class="post-tags">
            <el-tag v-for="tag in post.tags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
          </div>

          <div class="post-stats">
            <div class="stat-item" @click="viewPost(post.id)">
              <el-icon><View /></el-icon>
              <span>{{ post.views }} 浏览</span>
            </div>
            <div class="stat-item" @click="viewPost(post.id)">
              <el-icon><ChatLineRound /></el-icon>
              <span>{{ post.comments }} 评论</span>
            </div>
            <div class="stat-item" @click="handleLike(post)">
              <el-icon :class="{ 'is-liked': post.isLiked }"><Star /></el-icon>
              <span>{{ post.likes }} 点赞</span>
            </div>
            <div class="stat-item" @click="handleFavorite(post)">
              <el-icon :class="{ 'is-favorited': post.isFavorited }"><Collection /></el-icon>
              <span>{{ post.favorites }} 收藏</span>
            </div>
          </div>

          <div class="post-actions">
            <el-button link @click="viewPost(post.id)">查看详情</el-button>
            <el-dropdown v-if="post.authorId === currentUserId" trigger="click">
              <el-button link>
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleEdit(post)">编辑</el-dropdown-item>
                  <el-dropdown-item @click="handleDelete(post)" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <div class="pagination" v-if="pagination.total > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, View, ChatLineRound, Star, Collection, MoreFilled } from '@element-plus/icons-vue';
import { communityApi } from '@/api/community';

const router = useRouter();
const loading = ref(false);
const posts = ref([]);
const currentUserId = ref(localStorage.getItem('userId'));

const filters = reactive({
  category: '',
  sort: 'newest',
  keyword: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const loadPosts = async () => {
  loading.value = true;
  try {
    const response = await communityApi.getPosts({
      page: pagination.page,
      pageSize: pagination.pageSize,
      category: filters.category,
      sort: filters.sort,
      keyword: filters.keyword,
    });

    if (response.data.success) {
      posts.value = response.data.data.list || [];
      pagination.total = response.data.data.total || 0;
    }
  } catch (error) {
    ElMessage.error('加载帖子失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleCreatePost = () => {
  router.push('/community/forum/create');
};

const viewPost = (id) => {
  router.push(`/community/forum/${id}`);
};

const handleLike = async (post) => {
  try {
    if (post.isLiked) {
      await communityApi.unlikePost(post.id);
      post.isLiked = false;
      post.likes--;
    } else {
      await communityApi.likePost(post.id);
      post.isLiked = true;
      post.likes++;
    }
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleFavorite = async (post) => {
  try {
    if (post.isFavorited) {
      await communityApi.unfavoritePost(post.id);
      post.isFavorited = false;
      post.favorites--;
    } else {
      await communityApi.favoritePost(post.id);
      post.isFavorited = true;
      post.favorites++;
    }
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleEdit = (post) => {
  router.push(`/community/forum/${post.id}/edit`);
};

const handleDelete = async (post) => {
  try {
    await ElMessageBox.confirm('确定要删除这篇帖子吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await communityApi.deletePost(post.id);
    ElMessage.success('删除成功');
    loadPosts();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const resetFilters = () => {
  filters.category = '';
  filters.sort = 'newest';
  filters.keyword = '';
  pagination.page = 1;
  loadPosts();
};

const handleSizeChange = (size) => {
  pagination.pageSize = size;
  pagination.page = 1;
  loadPosts();
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadPosts();
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getCategoryText = (category) => {
  const categories = {
    news: '乡村新闻',
    life: '生活经验',
    agriculture: '农业知识',
    culture: '文化活动',
    other: '其他',
  };
  return categories[category] || category;
};

onMounted(() => {
  loadPosts();
});
</script>

<style lang="scss" scoped>
.forum-list {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.forum-header {
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

.forum-filters {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.forum-content {
  .post-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .post-card {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .post-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;

      .post-info {
        flex: 1;

        .author-name {
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .post-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #64748b;
        }
      }

      .post-status {
        display: flex;
        gap: 8px;
      }
    }

    .post-title {
      margin: 0 0 12px 0;
      font-size: 20px;
      color: #0f172a;
      cursor: pointer;
      transition: color 0.3s ease;

      &:hover {
        color: #2563eb;
      }
    }

    .post-content {
      margin: 0 0 16px 0;
      color: #64748b;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .post-images {
      margin-bottom: 16px;

      .image-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        height: 160px;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4px;
        }

        .more-images {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border-radius: 4px;
          font-size: 24px;
          font-weight: 600;
          color: #64748b;
        }
      }
    }

    .post-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .post-stats {
      display: flex;
      gap: 24px;
      padding: 12px 0;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 16px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        color: #64748b;
        cursor: pointer;
        transition: color 0.3s ease;

        &:hover {
          color: #2563eb;
        }

        .el-icon {
          font-size: 18px;

          &.is-liked,
          &.is-favorited {
            color: #e11d48;
          }
        }
      }
    }

    .post-actions {
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

@media (max-width: 768px) {
  .forum-list {
    padding: 16px;
  }

  .forum-header {
    h1 {
      font-size: 24px;
    }
  }

  .post-card {
    padding: 16px;

    .post-images .image-grid {
      grid-template-columns: repeat(2, 1fr);
      height: 200px;
    }

    .post-stats {
      flex-wrap: wrap;
      gap: 16px;
    }
  }
}
</style>
