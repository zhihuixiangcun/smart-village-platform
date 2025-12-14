<template>
  <div class="discussion-card" :class="{ 'pinned': discussion.metadata.pinned }">
    <el-card class="discussion-card-content" shadow="hover">
      <!-- 置顶标识 -->
      <div v-if="discussion.metadata.pinned" class="pinned-badge">
        <el-icon><Top /></el-icon>
        <span>置顶</span>
      </div>

      <!-- 卡片头部 -->
      <template #header>
        <div class="card-header">
          <div class="discussion-title">
            <h3 class="title-text" @click="handleViewDiscussion">
              {{ discussion.title }}
            </h3>
            <div class="title-meta">
              <el-tag :type="getTypeColor(discussion.type)" size="small">
                {{ getTypeName(discussion.type) }}
              </el-tag>
              <el-tag v-if="discussion.priority === 'urgent'"
                     type="danger"
                     size="small"
                     effect="dark">
                紧急
              </el-tag>
            </div>
          </div>
          <div class="discussion-actions">
            <el-dropdown trigger="click" @command="handleCommand">
              <el-button type="text" class="action-btn">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="view">查看详情</el-dropdown-item>
                  <el-dropdown-item command="share">分享</el-dropdown-item>
                  <el-dropdown-item command="subscribe" v-if="!isSubscribed">订阅</el-dropdown-item>
                  <el-dropdown-item command="unsubscribe" v-if="isSubscribed">取消订阅</el-dropdown-item>
                  <el-dropdown-item command="pin" v-if="canPin && !discussion.metadata.pinned">置顶</el-dropdown-item>
                  <el-dropdown-item command="unpin" v-if="canPin && discussion.metadata.pinned">取消置顶</el-dropdown-item>
                  <el-dropdown-item command="close" v-if="canManage" divided>关闭讨论</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </template>

      <!-- 卡片内容 -->
      <div class="card-body">
        <!-- 发起人信息 -->
        <div class="author-info">
          <el-avatar :size="32" :src="discussion.initiator.avatar">
            {{ discussion.initiator.userName.charAt(0) }}
          </el-avatar>
          <div class="author-details">
            <span class="author-name">{{ discussion.initiator.userName }}</span>
            <span class="author-role">{{ getRoleDisplayName(discussion.initiator.userRole) }}</span>
            <span class="post-time">{{ formatTime(discussion.metadata.createdAt) }}</span>
          </div>
        </div>

        <!-- 讨论内容预览 -->
        <div class="content-preview" @click="handleViewDiscussion">
          <p class="preview-text">{{ discussion.content }}</p>
        </div>

        <!-- 附件预览 -->
        <div class="attachments-preview" v-if="discussion.attachments && discussion.attachments.length > 0">
          <div class="attachment-count">
            <el-icon><Paperclip /></el-icon>
            <span>{{ discussion.attachments.length }}个附件</span>
          </div>
          <div class="attachment-list">
            <div v-for="attachment in discussion.attachments.slice(0, 3)"
                 :key="attachment.url"
                 class="attachment-item">
              <el-icon :class="getAttachmentIcon(attachment.type)">
                <component :is="getAttachmentIcon(attachment.type)" />
              </el-icon>
              <span class="attachment-name">{{ attachment.name }}</span>
            </div>
            <div v-if="discussion.attachments.length > 3" class="more-attachments">
              <span>+{{ discussion.attachments.length - 3 }}</span>
            </div>
          </div>
        </div>

        <!-- 标签 -->
        <div class="tags-container" v-if="discussion.tags && discussion.tags.length > 0">
          <el-tag v-for="tag in discussion.tags.slice(0, 5)"
                  :key="tag"
                  size="small"
                  effect="light"
                  class="discussion-tag">
            {{ tag }}
          </el-tag>
          <span v-if="discussion.tags.length > 5" class="more-tags">
            +{{ discussion.tags.length - 5 }}
          </span>
        </div>

        <!-- 投票信息 -->
        <div class="voting-info" v-if="discussion.voting && discussion.voting.enabled">
          <div class="voting-header">
            <el-icon><Vote /></el-icon>
            <span>投票: {{ discussion.voting.question }}</span>
            <el-tag size="small" type="info" v-if="!isVotingExpired">
              {{ getVotingDeadline() }}
            </el-tag>
            <el-tag size="small" type="danger" v-else>
              已结束
            </el-tag>
          </div>
          <div class="voting-progress">
            <div v-for="(option, index) in discussion.voting.options.slice(0, 2)"
                 :key="index"
                 class="voting-option">
              <span class="option-text">{{ option.text }}</span>
              <el-progress
                :percentage="getVotingPercentage(option.votes)"
                :show-text="false"
                :stroke-width="4"
                class="option-progress" />
              <span class="option-votes">{{ option.votes }}票</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 卡片底部统计 -->
      <template #footer>
        <div class="card-footer">
          <div class="stats-left">
            <div class="stat-item">
              <el-icon><View /></el-icon>
              <span>{{ formatNumber(discussion.statistics.viewCount) }}</span>
            </div>
            <div class="stat-item">
              <el-icon><ChatDotRound /></el-icon>
              <span>{{ formatNumber(discussion.statistics.replyCount) }}</span>
            </div>
            <div class="stat-item">
              <el-icon><User /></el-icon>
              <span>{{ formatNumber(discussion.statistics.participantCount) }}</span>
            </div>
            <div class="stat-item" v-if="discussion.voting && discussion.voting.enabled">
              <el-icon><Vote /></el-icon>
              <span>{{ getTotalVotes() }}</span>
            </div>
          </div>
          <div class="stats-right">
            <el-button type="text" @click="handleReply" size="small">
              <el-icon><ChatDotRound /></el-icon>
              回复
            </el-button>
            <el-button type="text" @click="handleLike" size="small">
              <el-icon><Star /></el-icon>
              {{ discussion.statistics.likeCount || 0 }}
            </el-button>
            <el-button type="text" @click="handleShare" size="small">
              <el-icon><Share /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
    </el-card>

    <!-- 快速回复弹窗 -->
    <QuickReplyDialog
      v-model="replyDialogVisible"
      :discussion="discussion"
      @replied="handleReplied" />

    <!-- 分享弹窗 -->
    <ShareDialog
      v-model="shareDialogVisible"
      :discussion="discussion" />
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Top, MoreFilled, View, ChatDotRound, User, Vote, Star, Share,
  Paperclip, Document, Picture, VideoPlay
} from '@element-plus/icons-vue'
import QuickReplyDialog from './QuickReplyDialog.vue'
import ShareDialog from './ShareDialog.vue'
import { useUserStore } from '@/stores/user'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// Props
const props = defineProps({
  discussion: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['view', 'reply', 'like', 'share', 'subscribe', 'unsubscribe', 'pin', 'unpin', 'close'])

// Store
const userStore = useUserStore()

// Refs
const replyDialogVisible = ref(false)
const shareDialogVisible = ref(false)

// Computed
const isSubscribed = computed(() => {
  return props.discussion.participants.some(p =>
    p.userId.toString() === userStore.userId &&
    p.notificationEnabled
  )
})

const canPin = computed(() => {
  return userStore.hasRole(['village_admin', 'department_head'])
})

const canManage = computed(() => {
  return userStore.hasRole(['village_admin', 'department_head']) ||
         props.discussion.initiator.userId.toString() === userStore.userId
})

const isVotingExpired = computed(() => {
  if (!props.discussion.voting || !props.discussion.voting.deadline) return false
  return new Date() > new Date(props.discussion.voting.deadline)
})

// Methods
const getTypeName = (type) => {
  const typeMap = {
    announcement: '公告',
    policy: '政策',
    project: '项目',
    complaint: '投诉',
    suggestion: '建议',
    emergency: '应急',
    daily_life: '日常'
  }
  return typeMap[type] || type
}

const getTypeColor = (type) => {
  const colorMap = {
    announcement: 'danger',
    policy: 'warning',
    project: 'primary',
    complaint: 'info',
    suggestion: 'success',
    emergency: 'danger',
    daily_life: ''
  }
  return colorMap[type] || ''
}

const getRoleDisplayName = (role) => {
  const roleMap = {
    super_admin: '超级管理员',
    village_admin: '村管理员',
    department_head: '部门负责人',
    staff: '工作人员',
    villager: '村民',
    guest: '访客'
  }
  return roleMap[role] || role
}

const formatTime = (time) => {
  try {
    return formatDistanceToNow(new Date(time), {
      addSuffix: true,
      locale: zhCN
    })
  } catch {
    return '时间未知'
  }
}

const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const getAttachmentIcon = (type) => {
  const iconMap = {
    image: Picture,
    document: Document,
    video: VideoPlay
  }
  return iconMap[type] || Document
}

const getVotingDeadline = () => {
  if (!props.discussion.voting.deadline) return ''
  try {
    return formatDistanceToNow(new Date(props.discussion.voting.deadline), {
      locale: zhCN
    })
  } catch {
    return ''
  }
}

const getVotingPercentage = (votes) => {
  const totalVotes = getTotalVotes()
  if (totalVotes === 0) return 0
  return Math.round((votes / totalVotes) * 100)
}

const getTotalVotes = () => {
  if (!props.discussion.voting || !props.discussion.voting.options) return 0
  return props.discussion.voting.options.reduce((sum, option) => sum + option.votes, 0)
}

const handleCommand = (command) => {
  switch (command) {
    case 'view':
      handleViewDiscussion()
      break
    case 'share':
      handleShare()
      break
    case 'subscribe':
      handleSubscribe()
      break
    case 'unsubscribe':
      handleUnsubscribe()
      break
    case 'pin':
      handlePin()
      break
    case 'unpin':
      handleUnpin()
      break
    case 'close':
      handleCloseDiscussion()
      break
  }
}

const handleViewDiscussion = () => {
  emit('view', props.discussion)
}

const handleReply = () => {
  replyDialogVisible.value = true
}

const handleLike = () => {
  emit('like', props.discussion)
}

const handleShare = () => {
  shareDialogVisible.value = true
}

const handleSubscribe = () => {
  emit('subscribe', props.discussion)
  ElMessage.success('订阅成功')
}

const handleUnsubscribe = () => {
  emit('unsubscribe', props.discussion)
  ElMessage.success('取消订阅成功')
}

const handlePin = () => {
  emit('pin', props.discussion)
  ElMessage.success('置顶成功')
}

const handleUnpin = () => {
  emit('unpin', props.discussion)
  ElMessage.success('取消置顶成功')
}

const handleCloseDiscussion = () => {
  ElMessageBox.confirm('确定要关闭这个讨论吗？关闭后将无法再回复。', '确认关闭', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(() => {
    emit('close', props.discussion)
    ElMessage.success('讨论已关闭')
  }).catch(() => {
    // 用户取消
  })
}

const handleReplied = (reply) => {
  emit('reply', reply)
  ElMessage.success('回复成功')
}

const handleShareSuccess = () => {
  ElMessage.success('分享成功')
}
</script>

<style scoped>
.discussion-card {
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.discussion-card.pinned {
  border-left: 4px solid #409eff;
}

.pinned-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #ff6b6b;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  z-index: 1;
}

.discussion-card-content {
  position: relative;
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-right: 8px;
}

.discussion-title {
  flex: 1;
  margin-right: 12px;
}

.title-text {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  cursor: pointer;
  line-height: 1.4;
  transition: color 0.3s;
}

.title-text:hover {
  color: #409eff;
}

.title-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.discussion-actions {
  flex-shrink: 0;
}

.action-btn {
  padding: 4px;
  color: #909399;
}

.action-btn:hover {
  color: #409eff;
  background-color: #f5f7fa;
}

.card-body {
  padding: 0;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.author-role {
  font-size: 12px;
  color: #909399;
}

.post-time {
  font-size: 12px;
  color: #c0c4cc;
}

.content-preview {
  margin-bottom: 16px;
}

.preview-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
  cursor: pointer;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-text:hover {
  color: #303133;
}

.attachments-preview {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.attachment-count {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #606266;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.attachment-item .el-icon {
  font-size: 14px;
  color: #909399;
}

.attachment-name {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-attachments {
  align-self: center;
  font-size: 12px;
  color: #909399;
}

.tags-container {
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.discussion-tag {
  font-size: 12px;
}

.more-tags {
  font-size: 12px;
  color: #909399;
  align-self: center;
}

.voting-info {
  margin-bottom: 16px;
  padding: 12px;
  background: #ecf5ff;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.voting-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.voting-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voting-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-text {
  min-width: 60px;
  font-size: 12px;
  color: #606266;
}

.option-progress {
  flex: 1;
  margin: 0;
}

.option-votes {
  min-width: 40px;
  font-size: 12px;
  color: #909399;
  text-align: right;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 0 0;
  border-top: 1px solid #f0f0f0;
}

.stats-left {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}

.stat-item .el-icon {
  font-size: 14px;
}

.stats-right {
  display: flex;
  gap: 8px;
}

.stats-right .el-button {
  font-size: 13px;
  color: #909399;
}

.stats-right .el-button:hover {
  color: #409eff;
}
</style>