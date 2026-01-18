<template>
  <div class="forum-detail">
    <div v-loading="loading" class="post-container">
      <div v-if="post" class="post-content">
        <div class="post-header">
          <h1 class="post-title">{{ post.title }}</h1>
          <div class="post-meta">
            <el-avatar :size="40" :src="post.authorAvatar"></el-avatar>
            <div class="meta-info">
              <div class="author-name">{{ post.authorName }}</div>
              <div class="post-time">{{ formatDateTime(post.createdAt) }}</div>
            </div>
            <el-tag>{{ getCategoryText(post.category) }}</el-tag>
          </div>
        </div>

        <div class="post-body" v-html="post.content"></div>

        <div v-if="post.images && post.images.length > 0" class="post-images">
          <el-image v-for="(image, index) in post.images" :key="index" :src="image" :preview-src-list="post.images" :initial-index="index" fit="cover" />
        </div>

        <div v-if="post.tags && post.tags.length > 0" class="post-tags">
          <el-tag v-for="tag in post.tags" :key="tag" type="info">{{ tag }}</el-tag>
        </div>

        <div class="post-actions">
          <el-button :type="post.isLiked ? 'primary' : ''" @click="handleLike">
            <el-icon><Star /></el-icon>
            {{ post.likes }} 点赞
          </el-button>
          <el-button :type="post.isFavorited ? 'success' : ''" @click="handleFavorite">
            <el-icon><Collection /></el-icon>
            {{ post.favorites }} 收藏
          </el-button>
          <el-button @click="handleShare">
            <el-icon><Share /></el-icon>
            分享
          </el-button>
        </div>

        <div class="post-stats">
          <span><el-icon><View /></el-icon> {{ post.views }} 浏览</span>
          <span><el-icon><ChatLineRound /></el-icon> {{ post.comments }} 评论</span>
        </div>
      </div>
    </div>

    <div class="comments-section">
      <h2>评论 ({{ comments.length }})</h2>

      <div class="comment-input">
        <el-input
          v-model="newComment"
          type="textarea"
          :rows="4"
          placeholder="发表您的看法..."
          @keyup.ctrl.enter="submitComment"
        ></el-input>
        <div class="input-actions">
          <span class="hint">Ctrl + Enter 发送</span>
          <el-button type="primary" @click="submitComment" :loading="submitting">发表评论</el-button>
        </div>
      </div>

      <div class="comments-list" v-loading="commentsLoading">
        <div v-if="comments.length === 0" class="empty-comments">暂无评论</div>

        <div v-else class="comment-item" v-for="comment in comments" :key="comment.id">
          <el-avatar :size="40" :src="comment.authorAvatar"></el-avatar>
          <div class="comment-content">
            <div class="comment-header">
              <span class="author-name">{{ comment.authorName }}</span>
              <span class="comment-time">{{ formatDateTime(comment.createdAt) }}</span>
            </div>
            <p class="comment-text">{{ comment.content }}</p>
            <div class="comment-actions">
              <el-button link size="small" @click="replyComment(comment)">回复</el-button>
              <el-button link size="small" v-if="comment.authorId === currentUserId" @click="deleteComment(comment.id)" type="danger">删除</el-button>
            </div>

            <div v-if="comment.replies && comment.replies.length > 0" class="replies-list">
              <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                <el-avatar :size="32" :src="reply.authorAvatar"></el-avatar>
                <div class="reply-content">
                  <div class="reply-header">
                    <span class="author-name">{{ reply.authorName }}</span>
                    <span class="reply-time">{{ formatDateTime(reply.createdAt) }}</span>
                  </div>
                  <p class="reply-text">{{ reply.content }}</p>
                </div>
              </div>
            </div>

            <div v-if="replyTo === comment.id" class="reply-input">
              <el-input
                v-model="replyContent"
                placeholder="回复..."
                @keyup.ctrl.enter="submitReply"
              ></el-input>
              <div class="reply-actions">
                <el-button size="small" @click="replyTo = null">取消</el-button>
                <el-button type="primary" size="small" @click="submitReply" :loading="submitting">回复</el-button>
              </div>
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
import { Star, Collection, Share, View, ChatLineRound } from '@element-plus/icons-vue';
import { communityApi } from '@/api/community';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const commentsLoading = ref(false);
const submitting = ref(false);

const post = ref(null);
const comments = ref([]);
const currentUserId = ref(localStorage.getItem('userId'));
const newComment = ref('');
const replyTo = ref(null);
const replyContent = ref('');

const loadPost = async () => {
  loading.value = true;
  try {
    const response = await communityApi.getPostById(route.params.id);
    if (response.data.success) {
      post.value = response.data.data;
    }
  } catch (error) {
    ElMessage.error('加载帖子失败');
  } finally {
    loading.value = false;
  }
};

const loadComments = async () => {
  commentsLoading.value = true;
  try {
    const response = await communityApi.getPostComments(route.params.id);
    if (response.data.success) {
      comments.value = response.data.data || [];
    }
  } catch (error) {
    console.error('加载评论失败:', error);
  } finally {
    commentsLoading.value = false;
  }
};

const handleLike = async () => {
  try {
    if (post.value.isLiked) {
      await communityApi.unlikePost(post.value.id);
      post.value.isLiked = false;
      post.value.likes--;
    } else {
      await communityApi.likePost(post.value.id);
      post.value.isLiked = true;
      post.value.likes++;
    }
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleFavorite = async () => {
  try {
    if (post.value.isFavorited) {
      await communityApi.unfavoritePost(post.value.id);
      post.value.isFavorited = false;
      post.value.favorites--;
    } else {
      await communityApi.favoritePost(post.value.id);
      post.value.isFavorited = true;
      post.value.favorites++;
    }
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleShare = () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url);
  ElMessage.success('链接已复制到剪贴板');
};

const submitComment = async () => {
  if (!newComment.value.trim()) {
    ElMessage.warning('请输入评论内容');
    return;
  }

  submitting.value = true;
  try {
    const response = await communityApi.addPostComment(post.value.id, {
      content: newComment.value,
    });
    if (response.data.success) {
      ElMessage.success('评论成功');
      newComment.value = '';
      loadComments();
    }
  } catch (error) {
    ElMessage.error('评论失败');
  } finally {
    submitting.value = false;
  }
};

const replyComment = (comment) => {
  replyTo.value = comment.id;
  replyContent.value = `@${comment.authorName} `;
};

const submitReply = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容');
    return;
  }

  submitting.value = true;
  try {
    const response = await communityApi.addPostComment(post.value.id, {
      content: replyContent.value,
      parentId: replyTo.value,
    });
    if (response.data.success) {
      ElMessage.success('回复成功');
      replyTo.value = null;
      replyContent.value = '';
      loadComments();
    }
  } catch (error) {
    ElMessage.error('回复失败');
  } finally {
    submitting.value = false;
  }
};

const deleteComment = async (commentId) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await communityApi.deletePostComment(post.value.id, commentId);
    ElMessage.success('删除成功');
    loadComments();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('zh-CN');
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
  loadPost();
  loadComments();
});
</script>

<style lang="scss" scoped>
.forum-detail {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.post-container {
  background: white;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;

  .post-header {
    margin-bottom: 24px;

    .post-title {
      margin: 0 0 16px 0;
      font-size: 28px;
      color: #0f172a;
      line-height: 1.4;
    }

    .post-meta {
      display: flex;
      align-items: center;
      gap: 12px;

      .meta-info {
        flex: 1;

        .author-name {
          font-weight: 600;
          color: #0f172a;
        }

        .post-time {
          font-size: 12px;
          color: #64748b;
        }
      }
    }
  }

  .post-body {
    margin-bottom: 24px;
    line-height: 1.8;
    color: #334155;
    font-size: 16px;
  }

  .post-images {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 20px;

    :deep(.el-image) {
      width: 100%;
      height: 200px;
      border-radius: 8px;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }

  .post-tags {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  .post-actions {
    display: flex;
    gap: 12px;
    padding: 16px 0;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 16px;
  }

  .post-stats {
    display: flex;
    gap: 24px;
    font-size: 14px;
    color: #64748b;

    span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.comments-section {
  background: white;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h2 {
    margin: 0 0 24px 0;
    font-size: 20px;
    color: #0f172a;
  }

  .comment-input {
    margin-bottom: 32px;

    .input-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;

      .hint {
        font-size: 12px;
        color: #94a3b8;
      }
    }
  }

  .comments-list {
    .empty-comments {
      text-align: center;
      padding: 40px;
      color: #94a3b8;
    }

    .comment-item {
      display: flex;
      gap: 16px;
      padding: 20px 0;
      border-bottom: 1px solid #e2e8f0;

      &:last-child {
        border-bottom: none;
      }

      .comment-content {
        flex: 1;

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .author-name {
            font-weight: 600;
            color: #0f172a;
          }

          .comment-time {
            font-size: 12px;
            color: #94a3b8;
          }
        }

        .comment-text {
          margin: 0 0 12px 0;
          color: #334155;
          line-height: 1.6;
        }

        .comment-actions {
          display: flex;
          gap: 8px;
        }

        .replies-list {
          margin-top: 16px;
          padding-left: 16px;
          border-left: 2px solid #e2e8f0;

          .reply-item {
            display: flex;
            gap: 12px;
            padding: 12px 0;

            .reply-content {
              flex: 1;

              .reply-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;

                .author-name {
                  font-weight: 600;
                  color: #0f172a;
                }

                .reply-time {
                  font-size: 12px;
                  color: #94a3b8;
                }
              }

              .reply-text {
                margin: 0;
                color: #334155;
                line-height: 1.5;
              }
            }
          }
        }

        .reply-input {
          margin-top: 12px;

          .reply-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 8px;
          }
        }
      }
    }
  }
}
</style>
