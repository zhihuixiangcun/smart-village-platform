<template>
  <el-card class="post-card" shadow="hover">
    <!-- 帖子头部 -->
    <div class="post-header">
      <div class="author-info">
        <el-avatar 
          :src="post.author.avatar" 
          :size="40"
          class="author-avatar"
        >
          {{ post.author.realName?.[0] }}
        </el-avatar>
        <div class="author-details">
          <div class="author-name">{{ post.author.realName }}</div>
          <div class="post-meta">
            <span class="village-name">{{ post.author.villageName }}</span>
            <span class="post-time">{{ formatTime(post.createdAt) }}</span>
          </div>
        </div>
      </div>
      
      <div class="post-badges">
        <!-- 置顶标识 -->
        <el-tag v-if="post.isPinned" type="danger" size="mini">置顶</el-tag>
        <!-- 精选标识 -->
        <el-tag v-if="post.isFeatured" type="warning" size="mini">精选</el-tag>
        <!-- 专家认证标识 -->
        <el-tag 
          v-if="post.knowledgeValue.verificationStatus === 'expert_verified'" 
          type="success" 
          size="mini"
        >
          专家认证
        </el-tag>
        <!-- 问题标识 -->
        <el-tag v-if="post.isQuestion" type="info" size="mini">求助</el-tag>
        <!-- 已解决标识 -->
        <el-tag v-if="post.isResolved" type="success" size="mini">已解决</el-tag>
      </div>
    </div>

    <!-- 帖子内容 -->
    <div class="post-content" @click="$emit('view-detail', post._id)">
      <h3 class="post-title">{{ post.title }}</h3>
      
      <!-- 标签 -->
      <div class="post-tags" v-if="post.tags && post.tags.length > 0">
        <el-tag 
          v-for="tag in post.tags.slice(0, 5)" 
          :key="tag" 
          size="mini" 
          effect="plain"
        >
          {{ tag }}
        </el-tag>
        <span v-if="post.tags.length > 5" class="more-tags">+{{ post.tags.length - 5 }}</span>
      </div>
      
      <!-- 内容摘要 -->
      <div class="post-summary" v-if="post.summary">
        {{ post.summary }}
      </div>
      
      <!-- 媒体内容预览 -->
      <div class="media-preview" v-if="hasMedia">
        <div class="image-preview" v-if="post.media.images && post.media.images.length > 0">
          <el-image
            v-for="(image, index) in post.media.images.slice(0, 3)"
            :key="index"
            :src="image.url"
            class="preview-image"
            fit="cover"
            :preview-src-list="post.media.images.map(img => img.url)"
          >
            <div slot="error" class="image-slot">
              <i class="el-icon-picture-outline"></i>
            </div>
          </el-image>
          <div 
            v-if="post.media.images.length > 3" 
            class="more-images"
          >
            +{{ post.media.images.length - 3 }}
          </div>
        </div>
        
        <div class="video-preview" v-if="post.media.videos && post.media.videos.length > 0">
          <div class="video-item" v-for="video in post.media.videos.slice(0, 1)" :key="video.url">
            <el-image 
              :src="video.thumbnail" 
              class="video-thumbnail"
              fit="cover"
            >
              <div slot="error" class="image-slot">
                <i class="el-icon-video-camera"></i>
              </div>
            </el-image>
            <div class="video-overlay">
              <i class="el-icon-video-play"></i>
              <span v-if="video.duration">{{ formatDuration(video.duration) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 分类信息 -->
      <div class="post-categories">
        <span class="category-item" v-if="post.postType">
          <i class="el-icon-folder"></i>
          {{ getPostTypeLabel(post.postType) }}
        </span>
        <span class="category-item" v-if="post.cropCategory">
          <i class="el-icon-orange"></i>
          {{ getCropCategoryLabel(post.cropCategory) }}
        </span>
        <span class="category-item" v-if="post.cropName">
          <i class="el-icon-grape"></i>
          {{ post.cropName }}
        </span>
      </div>
    </div>

    <!-- 互动统计和操作 -->
    <div class="post-actions">
      <div class="engagement-stats">
        <span class="stat-item">
          <i class="el-icon-view"></i>
          {{ post.engagement.views || 0 }}
        </span>
        <span class="stat-item">
          <i class="el-icon-chat-dot-round"></i>
          {{ post.engagement.comments || 0 }}
        </span>
        <span class="stat-item" v-if="post.engagement.helpfulVotes > 0">
          <i class="el-icon-thumb"></i>
          {{ post.engagement.helpfulVotes }}
        </span>
      </div>
      
      <div class="action-buttons">
        <!-- 点赞 -->
        <el-button 
          :type="userHasLiked ? 'primary' : 'text'"
          size="mini"
          @click.stop="$emit('like', post._id)"
          :disabled="!isLoggedIn"
        >
          <i class="el-icon-thumb"></i>
          {{ post.engagement.likes || 0 }}
        </el-button>
        
        <!-- 收藏 -->
        <el-button 
          :type="userHasBookmarked ? 'warning' : 'text'"
          size="mini"
          @click.stop="$emit('bookmark', post._id)"
          :disabled="!isLoggedIn"
        >
          <i class="el-icon-star-off"></i>
          {{ post.engagement.bookmarks || 0 }}
        </el-button>
        
        <!-- 有用投票 -->
        <el-button 
          :type="userVote === 'helpful' ? 'success' : 'text'"
          size="mini"
          @click.stop="$emit('vote', post._id, 'helpful')"
          :disabled="!isLoggedIn"
        >
          <i class="el-icon-check"></i>
          有用
        </el-button>
        
        <!-- 分享 -->
        <el-button 
          type="text" 
          size="mini"
          @click.stop="sharePost"
        >
          <i class="el-icon-share"></i>
          分享
        </el-button>
      </div>
    </div>

    <!-- 最佳答案预览 -->
    <div class="best-answer-preview" v-if="post.bestAnswer && post.isResolved">
      <div class="best-answer-header">
        <i class="el-icon-medal"></i>
        <span>最佳答案</span>
      </div>
      <div class="best-answer-content">
        {{ post.bestAnswer.content.substring(0, 100) }}...
      </div>
    </div>

    <!-- 专家评论预览 -->
    <div class="expert-comment-preview" v-if="post.expertComments && post.expertComments.length > 0">
      <div class="expert-comment-header">
        <i class="el-icon-user"></i>
        <span>专家点评</span>
      </div>
      <div class="expert-comment-content">
        {{ post.expertComments[0].content.substring(0, 100) }}...
      </div>
    </div>
  </el-card>
</template>

<script>
export default {
  name: 'AgriculturalPostCard',
  props: {
    post: {
      type: Object,
      required: true
    }
  },
  computed: {
    isLoggedIn() {
      return this.$store.getters['auth/isLoggedIn']
    },
    
    userHasLiked() {
      return this.post.userInteractions?.hasLiked || false
    },
    
    userHasBookmarked() {
      return this.post.userInteractions?.hasBookmarked || false
    },
    
    userVote() {
      return this.post.userInteractions?.userVote
    },
    
    hasMedia() {
      return (this.post.media?.images?.length > 0) || (this.post.media?.videos?.length > 0)
    }
  },
  methods: {
    formatTime(time) {
      const now = new Date()
      const postTime = new Date(time)
      const diffTime = now - postTime
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
      const diffMinutes = Math.floor(diffTime / (1000 * 60))
      
      if (diffDays > 30) {
        return postTime.toLocaleDateString()
      } else if (diffDays > 0) {
        return `${diffDays}天前`
      } else if (diffHours > 0) {
        return `${diffHours}小时前`
      } else if (diffMinutes > 0) {
        return `${diffMinutes}分钟前`
      } else {
        return '刚刚'
      }
    },
    
    formatDuration(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    },
    
    getPostTypeLabel(type) {
      const labels = {
        agricultural_tutorial: '农技教程',
        crop_record: '作物记录',
        pest_disease: '病虫害防治',
        machinery_operation: '农机操作',
        rural_life: '农村生活',
        market_info: '市场信息',
        policy_interpretation: '政策解读',
        experience_sharing: '经验分享'
      }
      return labels[type] || type
    },
    
    getCropCategoryLabel(category) {
      const labels = {
        grain_crops: '粮食作物',
        cash_crops: '经济作物',
        vegetables: '蔬菜类',
        fruits: '水果类',
        medicinal_herbs: '药材类',
        forestry: '林业',
        livestock: '畜牧业',
        aquaculture: '水产养殖',
        other: '其他'
      }
      return labels[category] || category
    },
    
    sharePost() {
      // 复制链接到剪贴板
      const url = `${window.location.origin}/agricultural/posts/${this.post._id}`
      
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          this.$message.success('链接已复制到剪贴板')
        }).catch(() => {
          this.fallbackCopyText(url)
        })
      } else {
        this.fallbackCopyText(url)
      }
    },
    
    fallbackCopyText(text) {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
        this.$message.success('链接已复制到剪贴板')
      } catch (err) {
        this.$message.error('复制失败，请手动复制链接')
        console.error('复制失败:', err)
      } finally {
        document.body.removeChild(textArea)
      }
    }
  }
}
</script>

<style scoped>
.post-card {
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 16px;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  flex-shrink: 0;
}

.author-details {
  flex: 1;
}

.author-name {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.post-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.village-name::after {
  content: '·';
  margin-left: 8px;
}

.post-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.post-content {
  margin-bottom: 16px;
}

.post-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-tags {
  margin-bottom: 12px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.more-tags {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.post-summary {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.media-preview {
  margin-bottom: 12px;
}

.image-preview {
  display: flex;
  gap: 8px;
  position: relative;
}

.preview-image {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
}

.more-images {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: #f5f7fa;
  border-radius: 6px;
  color: #909399;
  font-size: 14px;
}

.video-preview {
  display: flex;
  gap: 8px;
}

.video-item {
  position: relative;
  width: 120px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
}

.video-thumbnail {
  width: 100%;
  height: 100%;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.video-overlay span {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 12px;
  background: rgba(0,0,0,0.6);
  padding: 2px 4px;
  border-radius: 2px;
}

.post-categories {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.post-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f0f2f6;
  padding-top: 12px;
}

.engagement-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-buttons .el-button {
  padding: 4px 8px;
  font-size: 12px;
}

.best-answer-preview,
.expert-comment-preview {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #67C23A;
}

.best-answer-header,
.expert-comment-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #67C23A;
  margin-bottom: 6px;
  font-size: 13px;
}

.best-answer-content,
.expert-comment-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .post-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .post-badges {
    align-self: flex-start;
  }
  
  .post-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .engagement-stats,
  .action-buttons {
    width: 100%;
    justify-content: space-around;
  }
  
  .post-categories {
    flex-direction: column;
    gap: 8px;
  }
  
  .image-preview {
    flex-wrap: wrap;
  }
  
  .preview-image,
  .more-images {
    width: 60px;
    height: 60px;
  }
}
</style>