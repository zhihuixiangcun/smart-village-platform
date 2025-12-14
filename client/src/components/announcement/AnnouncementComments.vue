<template>
  <div class="announcement-comments">
    <!-- 评论统计 -->
    <div class="comments-header">
      <h3 class="comments-title">
        <el-icon><ChatLineSquare /></el-icon>
        评论 ({{ totalComments }})
      </h3>
      <div class="comments-actions">
        <el-button
          @click="refreshComments"
          :icon="Refresh"
          size="small"
          circle
          :loading="loading"
        />
        <el-dropdown @command="handleSortChange" trigger="click">
          <el-button size="small">
            {{ sortOptions[currentSort] }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="newest">最新回复</el-dropdown-item>
              <el-dropdown-item command="oldest">最早回复</el-dropdown-item>
              <el-dropdown-item command="hottest">最热评论</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 评论输入框 -->
    <div class="comment-input-section" v-if="canComment">
      <div class="input-header">
        <el-avatar :size="40" :src="userStore.user?.avatar">
          {{ userStore.user?.name?.charAt(0) }}
        </el-avatar>
        <div class="input-meta">
          <span class="user-name">{{ userStore.user?.name }}</span>
          <span class="user-role">{{ userStore.user?.role }}</span>
        </div>
      </div>

      <div class="input-body">
        <el-input
          v-model="newComment.content"
          type="textarea"
          :rows="3"
          placeholder="写下您的评论..."
          maxlength="1000"
          show-word-limit
          @keydown.ctrl.enter="submitComment"
        />

        <!-- 图片上传 -->
        <div class="input-attachments" v-if="newComment.images.length > 0">
          <div
            v-for="(image, index) in newComment.images"
            :key="index"
            class="attachment-item"
          >
            <img :src="image.url" :alt="image.name" />
            <el-button
              @click="removeImage(index)"
              :icon="Close"
              size="small"
              circle
              class="remove-btn"
            />
          </div>
        </div>

        <div class="input-actions">
          <div class="left-actions">
            <el-upload
              :action="uploadUrl"
              :show-file-list="false"
              :before-upload="beforeImageUpload"
              :on-success="handleImageSuccess"
              accept="image/*"
              multiple
            >
              <el-button :icon="Picture" size="small">添加图片</el-button>
            </el-upload>

            <el-checkbox v-model="newComment.isAnonymous" size="small">
              匿名评论
            </el-checkbox>
          </div>

          <div class="right-actions">
            <el-button @click="clearComment" size="small">清空</el-button>
            <el-button
              @click="submitComment"
              type="primary"
              size="small"
              :loading="submitting"
              :disabled="!newComment.content.trim()"
            >
              发表评论
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 评论列表 -->
    <div class="comments-list" v-loading="loading">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="comment-item"
        :class="{ 'is-top': comment.isTop }"
      >
        <div class="comment-avatar">
          <el-avatar :size="36" :src="comment.author.avatar">
            {{ comment.author.name?.charAt(0) }}
          </el-avatar>
        </div>

        <div class="comment-content">
          <div class="comment-header">
            <div class="author-info">
              <span class="author-name">
                {{ comment.author.isAnonymous ? '匿名用户' : comment.author.name }}
              </span>
              <el-tag
                v-if="!comment.author.isAnonymous && comment.author.role"
                :type="getRoleType(comment.author.role)"
                size="small"
              >
                {{ getRoleLabel(comment.author.role) }}
              </el-tag>
              <el-icon v-if="comment.isTop" class="top-icon"><Top /></el-icon>
            </div>

            <div class="comment-meta">
              <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
              <el-dropdown
                @command="(command) => handleCommentAction(command, comment)"
                trigger="click"
                v-if="canManageComment(comment)"
              >
                <el-button :icon="MoreFilled" size="small" text />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="`top_${comment.id}`" v-if="!comment.isTop">
                      <el-icon><Top /></el-icon>
                      置顶
                    </el-dropdown-item>
                    <el-dropdown-item :command="`untop_${comment.id}`" v-if="comment.isTop">
                      <el-icon><Top /></el-icon>
                      取消置顶
                    </el-dropdown-item>
                    <el-dropdown-item :command="`delete_${comment.id}`" divided>
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <div class="comment-body">
            <div class="comment-text">{{ comment.content }}</div>

            <!-- 评论图片 -->
            <div class="comment-images" v-if="comment.images && comment.images.length > 0">
              <el-image
                v-for="(image, index) in comment.images"
                :key="index"
                :src="image.url"
                :alt="image.name"
                class="comment-image"
                fit="cover"
                :preview-src-list="comment.images.map(img => img.url)"
                :initial-index="index"
              />
            </div>
          </div>

          <div class="comment-actions">
            <el-button
              @click="toggleLike(comment)"
              :type="comment.isLiked ? 'primary' : 'default'"
              size="small"
              text
            >
              <el-icon><StarFilled v-if="comment.isLiked" /><Star v-else /></el-icon>
              <span>{{ comment.stats.likes || 0 }}</span>
            </el-button>

            <el-button @click="showReplyInput(comment)" size="small" text>
              <el-icon><ChatDotSquare /></el-icon>
              回复
            </el-button>

            <el-button @click="reportComment(comment)" size="small" text>
              <el-icon><Flag /></el-icon>
              举报
            </el-button>
          </div>

          <!-- 回复输入框 -->
          <div
            v-if="replyingTo === comment.id"
            class="reply-input"
          >
            <el-input
              v-model="replyContent"
              type="textarea"
              :rows="2"
              :placeholder="`回复 ${comment.author.isAnonymous ? '匿名用户' : comment.author.name}...`"
              maxlength="500"
              show-word-limit
            />
            <div class="reply-actions">
              <el-button @click="cancelReply" size="small">取消</el-button>
              <el-button
                @click="submitReply(comment)"
                type="primary"
                size="small"
                :loading="replySubmitting"
                :disabled="!replyContent.trim()"
              >
                回复
              </el-button>
            </div>
          </div>

          <!-- 子评论 -->
          <div class="replies" v-if="comment.replies && comment.replies.length > 0">
            <div
              v-for="reply in comment.replies"
              :key="reply.id"
              class="reply-item"
            >
              <div class="reply-avatar">
                <el-avatar :size="28" :src="reply.author.avatar">
                  {{ reply.author.name?.charAt(0) }}
                </el-avatar>
              </div>

              <div class="reply-content">
                <div class="reply-header">
                  <span class="reply-author">
                    {{ reply.author.isAnonymous ? '匿名用户' : reply.author.name }}
                  </span>
                  <span v-if="reply.replyTo" class="reply-target">
                    回复 @{{ reply.replyTo.name }}
                  </span>
                  <span class="reply-time">{{ formatTime(reply.createdAt) }}</span>
                </div>
                <div class="reply-text">{{ reply.content }}</div>
                <div class="reply-actions">
                  <el-button
                    @click="toggleLike(reply)"
                    :type="reply.isLiked ? 'primary' : 'default'"
                    size="small"
                    text
                  >
                    <el-icon><StarFilled v-if="reply.isLiked" /><Star v-else /></el-icon>
                    <span>{{ reply.stats.likes || 0 }}</span>
                  </el-button>
                  <el-button @click="showReplyInput(comment, reply)" size="small" text>
                    <el-icon><ChatDotSquare /></el-icon>
                    回复
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 加载更多回复 -->
            <div
              v-if="comment.stats.replies > comment.replies.length"
              class="load-more-replies"
            >
              <el-button
                @click="loadMoreReplies(comment)"
                size="small"
                text
                :loading="loadingReplies[comment.id]"
              >
                查看更多回复 ({{ comment.stats.replies - comment.replies.length }})
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多评论 -->
      <div class="load-more" v-if="hasMore">
        <el-button
          @click="loadMoreComments"
          :loading="loadingMore"
          size="large"
          style="width: 100%"
        >
          加载更多评论
        </el-button>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && comments.length === 0" class="empty-comments">
        <el-empty description="暂无评论">
          <el-button @click="focusCommentInput" type="primary" v-if="canComment">
            写下第一条评论
          </el-button>
        </el-empty>
      </div>
    </div>

    <!-- 举报对话框 -->
    <el-dialog v-model="reportDialogVisible" title="举报评论" width="400px">
      <el-form :model="reportForm" label-width="80px">
        <el-form-item label="举报原因">
          <el-radio-group v-model="reportForm.reason">
            <el-radio label="spam">垃圾信息</el-radio>
            <el-radio label="abuse">恶意辱骂</el-radio>
            <el-radio label="inappropriate">内容不当</el-radio>
            <el-radio label="false">虚假信息</el-radio>
            <el-radio label="other">其他</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="详细说明" v-if="reportForm.reason === 'other'">
          <el-input
            v-model="reportForm.description"
            type="textarea"
            :rows="3"
            placeholder="请详细说明举报原因..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportDialogVisible = false">取消</el-button>
        <el-button @click="submitReport" type="primary" :loading="reportSubmitting">
          提交举报
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ChatLineSquare, Refresh, ArrowDown, Picture, Close,
  Top, MoreFilled, Delete, Star, StarFilled,
  ChatDotSquare, Flag
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useCommentStore } from '@/stores/comment'
import { formatTime } from '@/utils/time'

// Props
const props = defineProps({
  announcementId: {
    type: String,
    required: true
  },
  allowComment: {
    type: Boolean,
    default: true
  }
})

// Store
const userStore = useUserStore()
const commentStore = useCommentStore()

// 响应式数据
const loading = ref(false)
const loadingMore = ref(false)
const submitting = ref(false)
const replySubmitting = ref(false)
const reportSubmitting = ref(false)
const loadingReplies = ref({})

const comments = ref([])
const hasMore = ref(true)
const totalComments = ref(0)
const currentSort = ref('newest')
const replyingTo = ref(null)
const replyContent = ref('')
const reportDialogVisible = ref(false)
const reportingComment = ref(null)

const uploadUrl = '/api/announcements/upload'

// 排序选项
const sortOptions = {
  newest: '最新回复',
  oldest: '最早回复',
  hottest: '最热评论'
}

// 新评论数据
const newComment = reactive({
  content: '',
  images: [],
  isAnonymous: false
})

// 举报表单
const reportForm = reactive({
  reason: '',
  description: ''
})

// 计算属性
const canComment = computed(() => {
  return props.allowComment && userStore.isLoggedIn
})

// 方法
const loadComments = async (reset = true) => {
  if (reset) {
    loading.value = true
    comments.value = []
  } else {
    loadingMore.value = true
  }

  try {
    const params = {
      announcementId: props.announcementId,
      page: reset ? 1 : Math.floor(comments.value.length / 20) + 1,
      limit: 20,
      sort: currentSort.value
    }

    const result = await commentStore.getComments(params)

    if (reset) {
      comments.value = result.data.comments
    } else {
      comments.value.push(...result.data.comments)
    }

    totalComments.value = result.data.pagination.total
    hasMore.value = result.data.pagination.page < result.data.pagination.pages

  } catch (error) {
    ElMessage.error('加载评论失败')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const refreshComments = () => {
  loadComments(true)
}

const loadMoreComments = () => {
  loadComments(false)
}

const handleSortChange = (command) => {
  currentSort.value = command
  loadComments(true)
}

// 评论提交
const submitComment = async () => {
  if (!newComment.content.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  submitting.value = true

  try {
    const commentData = {
      announcementId: props.announcementId,
      content: newComment.content.trim(),
      images: newComment.images,
      isAnonymous: newComment.isAnonymous
    }

    const result = await commentStore.createComment(commentData)

    // 添加到评论列表顶部
    comments.value.unshift(result)
    totalComments.value += 1

    // 清空输入
    clearComment()

    ElMessage.success('评论发表成功')

  } catch (error) {
    ElMessage.error('评论发表失败')
  } finally {
    submitting.value = false
  }
}

const clearComment = () => {
  newComment.content = ''
  newComment.images = []
  newComment.isAnonymous = false
}

// 图片上传
const beforeImageUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过2MB')
    return false
  }
  return true
}

const handleImageSuccess = (response, file) => {
  if (response.success) {
    newComment.images.push({
      name: file.name,
      url: response.data.url,
      size: file.size
    })
  } else {
    ElMessage.error('图片上传失败')
  }
}

const removeImage = (index) => {
  newComment.images.splice(index, 1)
}

// 回复功能
const showReplyInput = (comment, reply = null) => {
  replyingTo.value = comment.id
  replyContent.value = ''

  if (reply) {
    replyContent.value = `@${reply.author.name} `
  }

  nextTick(() => {
    // 聚焦到回复输入框
  })
}

const cancelReply = () => {
  replyingTo.value = null
  replyContent.value = ''
}

const submitReply = async (comment) => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }

  replySubmitting.value = true

  try {
    const replyData = {
      announcementId: props.announcementId,
      parentId: comment.id,
      content: replyContent.value.trim()
    }

    const result = await commentStore.createComment(replyData)

    // 添加到回复列表
    if (!comment.replies) {
      comment.replies = []
    }
    comment.replies.push(result)
    comment.stats.replies = (comment.stats.replies || 0) + 1

    cancelReply()
    ElMessage.success('回复发表成功')

  } catch (error) {
    ElMessage.error('回复发表失败')
  } finally {
    replySubmitting.value = false
  }
}

const loadMoreReplies = async (comment) => {
  loadingReplies.value[comment.id] = true

  try {
    const params = {
      parentId: comment.id,
      page: Math.floor(comment.replies.length / 10) + 1,
      limit: 10
    }

    const result = await commentStore.getComments(params)
    comment.replies.push(...result.data.comments)

  } catch (error) {
    ElMessage.error('加载回复失败')
  } finally {
    loadingReplies.value[comment.id] = false
  }
}

// 点赞功能
const toggleLike = async (comment) => {
  try {
    if (comment.isLiked) {
      await commentStore.unlikeComment(comment.id)
      comment.isLiked = false
      comment.stats.likes = Math.max(0, (comment.stats.likes || 0) - 1)
    } else {
      await commentStore.likeComment(comment.id)
      comment.isLiked = true
      comment.stats.likes = (comment.stats.likes || 0) + 1
    }
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 评论管理
const canManageComment = (comment) => {
  if (!userStore.user) return false

  // 管理员或作者可以管理
  if (['admin', 'village_admin'].includes(userStore.user.role)) return true
  if (comment.author.id === userStore.user.id) return true

  return false
}

const handleCommentAction = async (command, comment) => {
  const [action, id] = command.split('_')

  switch (action) {
    case 'top':
      await toggleTopComment(id, true)
      break
    case 'untop':
      await toggleTopComment(id, false)
      break
    case 'delete':
      await deleteComment(id)
      break
  }
}

const toggleTopComment = async (id, isTop) => {
  try {
    await commentStore.toggleTop(id)
    const comment = comments.value.find(c => c.id === id)
    if (comment) {
      comment.isTop = isTop
    }
    ElMessage.success(isTop ? '置顶成功' : '取消置顶成功')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const deleteComment = async (id) => {
  const confirmed = await ElMessageBox.confirm(
    '确定要删除这条评论吗？',
    '删除评论',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )

  if (confirmed) {
    try {
      await commentStore.deleteComment(id)
      const index = comments.value.findIndex(c => c.id === id)
      if (index !== -1) {
        comments.value.splice(index, 1)
        totalComments.value -= 1
      }
      ElMessage.success('删除成功')
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }
}

// 举报功能
const reportComment = (comment) => {
  reportingComment.value = comment
  reportForm.reason = ''
  reportForm.description = ''
  reportDialogVisible.value = true
}

const submitReport = async () => {
  if (!reportForm.reason) {
    ElMessage.warning('请选择举报原因')
    return
  }

  if (reportForm.reason === 'other' && !reportForm.description.trim()) {
    ElMessage.warning('请填写详细说明')
    return
  }

  reportSubmitting.value = true

  try {
    await commentStore.reportComment(reportingComment.value.id, reportForm)
    ElMessage.success('举报提交成功，我们会尽快处理')
    reportDialogVisible.value = false
  } catch (error) {
    ElMessage.error('举报提交失败')
  } finally {
    reportSubmitting.value = false
  }
}

// 工具函数
const getRoleType = (role) => {
  const types = {
    village_admin: 'danger',
    committee_member: 'warning',
    secretary: 'success',
    resident: 'info'
  }
  return types[role] || 'info'
}

const getRoleLabel = (role) => {
  const labels = {
    village_admin: '村主任',
    committee_member: '委员',
    secretary: '书记',
    resident: '村民'
  }
  return labels[role] || '用户'
}

const focusCommentInput = () => {
  // 聚焦到评论输入框
}

// 生命周期
onMounted(() => {
  loadComments()
})
</script>

<style lang="scss" scoped>
.announcement-comments {
  .comments-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color-light);

    .comments-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-color-primary);
      margin: 0;
    }

    .comments-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .comment-input-section {
    margin-bottom: 24px;
    padding: 16px;
    background: var(--fill-color-light);
    border-radius: 8px;

    .input-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;

      .input-meta {
        .user-name {
          font-weight: 500;
          color: var(--text-color-primary);
        }

        .user-role {
          font-size: 12px;
          color: var(--text-color-secondary);
          margin-left: 8px;
        }
      }
    }

    .input-body {
      .input-attachments {
        display: flex;
        gap: 8px;
        margin: 12px 0;

        .attachment-item {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 6px;
          overflow: hidden;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .remove-btn {
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(0, 0, 0, 0.5);
            color: white;
            border: none;
          }
        }
      }

      .input-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 12px;

        .left-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .right-actions {
          display: flex;
          gap: 8px;
        }
      }
    }
  }

  .comments-list {
    .comment-item {
      display: flex;
      gap: 12px;
      padding: 16px 0;
      border-bottom: 1px solid var(--border-color-lighter);

      &.is-top {
        background: var(--warning-color-light);
        margin: -8px;
        padding: 16px 8px;
        border-radius: 6px;
        border-color: var(--warning-color);
      }

      .comment-avatar {
        flex-shrink: 0;
      }

      .comment-content {
        flex: 1;
        min-width: 0;

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .author-info {
            display: flex;
            align-items: center;
            gap: 8px;

            .author-name {
              font-weight: 500;
              color: var(--text-color-primary);
            }

            .top-icon {
              color: var(--warning-color);
            }
          }

          .comment-meta {
            display: flex;
            align-items: center;
            gap: 8px;

            .comment-time {
              font-size: 12px;
              color: var(--text-color-secondary);
            }
          }
        }

        .comment-body {
          margin-bottom: 12px;

          .comment-text {
            line-height: 1.6;
            color: var(--text-color-primary);
            word-break: break-word;
          }

          .comment-images {
            display: flex;
            gap: 8px;
            margin-top: 8px;

            .comment-image {
              width: 80px;
              height: 80px;
              border-radius: 4px;
              cursor: pointer;
            }
          }
        }

        .comment-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;

          .el-button {
            padding: 0;
            font-size: 12px;
            color: var(--text-color-secondary);

            &:hover {
              color: var(--primary-color);
            }

            &.is-type-primary {
              color: var(--primary-color);
            }

            .el-icon {
              margin-right: 4px;
            }
          }
        }

        .reply-input {
          margin-top: 12px;
          padding: 12px;
          background: var(--fill-color-lighter);
          border-radius: 6px;

          .reply-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 8px;
          }
        }

        .replies {
          margin-top: 12px;
          padding-left: 12px;
          border-left: 2px solid var(--border-color-lighter);

          .reply-item {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;

            .reply-avatar {
              flex-shrink: 0;
            }

            .reply-content {
              flex: 1;

              .reply-header {
                margin-bottom: 4px;
                font-size: 12px;

                .reply-author {
                  font-weight: 500;
                  color: var(--text-color-primary);
                }

                .reply-target {
                  color: var(--primary-color);
                  margin: 0 8px;
                }

                .reply-time {
                  color: var(--text-color-secondary);
                }
              }

              .reply-text {
                font-size: 14px;
                line-height: 1.6;
                color: var(--text-color-primary);
                margin-bottom: 8px;
              }

              .reply-actions {
                display: flex;
                gap: 12px;

                .el-button {
                  padding: 0;
                  font-size: 12px;
                  color: var(--text-color-secondary);
                }
              }
            }
          }

          .load-more-replies {
            text-align: center;
            margin-top: 8px;
          }
        }
      }
    }

    .load-more {
      margin: 20px 0;
    }

    .empty-comments {
      text-align: center;
      padding: 40px 0;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .announcement-comments {
    .comments-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;

      .comments-actions {
        justify-content: flex-end;
      }
    }

    .comment-input-section {
      .input-body {
        .input-actions {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;

          .left-actions,
          .right-actions {
            justify-content: center;
          }
        }
      }
    }

    .comment-item {
      .comment-content {
        .comment-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .comment-actions {
          flex-wrap: wrap;
          gap: 8px;
        }
      }
    }
  }
}
</style>