<template>
  <view class="agriculture-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-title">农技社区</view>
        <view class="navbar-icon" @click="handleSearch">
          <text class="icon">🔍</text>
        </view>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 快捷入口 -->
      <view class="quick-entry">
        <view class="entry-item" @click="handleEntryClick('knowledge')">
          <text class="entry-icon">📚</text>
          <text class="entry-name">知识库</text>
        </view>
        <view class="entry-item" @click="handleEntryClick('ask')">
          <text class="entry-icon">👨‍🌾</text>
          <text class="entry-name">专家问答</text>
        </view>
        <view class="entry-item" @click="handleEntryClick('disease')">
          <text class="entry-icon">🐛</text>
          <text class="entry-name">病虫害识别</text>
        </view>
        <view class="entry-item" @click="handleEntryClick('community')">
          <text class="entry-icon">👥</text>
          <text class="entry-name">农友圈</text>
        </view>
      </view>

      <!-- 今日推荐 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">🌟 今日推荐</text>
        </view>
        <scroll-view class="recommend-scroll" scroll-x>
          <view
            v-for="item in recommendList"
            :key="item.id"
            class="recommend-item"
            @click="handleRecommendClick(item)"
          >
            <view class="recommend-image">{{ item.image }}</view>
            <view class="recommend-title">{{ item.title }}</view>
          </view>
        </scroll-view>
      </view>

      <!-- 农技知识 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">📖 农技知识</text>
          <text class="section-more" @click="handleMore('knowledge')">更多 ></text>
        </view>
        <view class="knowledge-list">
          <view
            v-for="knowledge in knowledgeList"
            :key="knowledge.id"
            class="knowledge-item"
            @click="handleKnowledgeClick(knowledge)"
          >
            <view class="knowledge-icon">{{ knowledge.icon }}</view>
            <view class="knowledge-content">
              <view class="knowledge-title">{{ knowledge.title }}</view>
              <view class="knowledge-desc">{{ knowledge.description }}</view>
              <view class="knowledge-meta">
                <text class="meta-item">👁️ {{ knowledge.viewCount }}</text>
                <text class="meta-item">👍 {{ knowledge.likeCount }}</text>
                <text class="meta-item">💬 {{ knowledge.commentCount }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 专家问答 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">💬 专家问答</text>
          <text class="section-more" @click="handleMore('ask')">更多 ></text>
        </view>
        <view class="ask-list">
          <view
            v-for="question in questionList"
            :key="question.id"
            class="question-item"
            @click="handleQuestionClick(question)"
          >
            <view class="question-header">
              <view class="question-icon">Q</view>
              <view class="question-title">{{ question.title }}</view>
              <view v-if="question.solved" class="solved-badge">已解决</view>
            </view>
            <view class="question-content">
              {{ question.content }}
            </view>
            <view class="question-footer">
              <view class="expert-info">
                <text class="expert-icon">👨‍🌾</text>
                <text class="expert-name">{{ question.expertName }}</text>
                <text class="expert-title">{{ question.expertTitle }}</text>
              </view>
              <text class="question-time">{{ question.publishTime }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 农友圈动态 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">🌾 农友圈</text>
          <view class="publish-btn" @click="handlePublishPost">
            <text>+ 发布</text>
          </view>
        </view>
        <view class="post-list">
          <view
            v-for="post in postList"
            :key="post.id"
            class="post-item"
            @click="handlePostClick(post)"
          >
            <!-- 用户信息 -->
            <view class="post-user">
              <view class="user-avatar">{{ post.avatar }}</view>
              <view class="user-info">
                <view class="user-name">{{ post.userName }}</view>
                <view class="post-time">{{ post.publishTime }}</view>
              </view>
              <view class="user-location">{{ post.location }}</view>
            </view>

            <!-- 内容 -->
            <view class="post-content">
              <text class="post-text">{{ post.content }}</text>
            </view>

            <!-- 图片 -->
            <view v-if="post.images && post.images.length > 0" class="post-images">
              <view
                v-for="(image, index) in post.images"
                :key="index"
                class="post-image"
              >
                {{ image }}
              </view>
            </view>

            <!-- 互动 -->
            <view class="post-actions">
              <view class="action-item" @click.stop="handleLikePost(post)">
                <text class="action-icon">{{ post.liked ? '❤️' : '🤍' }}</text>
                <text class="action-text">{{ post.likeCount }}</text>
              </view>
              <view class="action-item" @click.stop="handleCommentPost(post)">
                <text class="action-icon">💬</text>
                <text class="action-text">{{ post.commentCount }}</text>
              </view>
              <view class="action-item" @click.stop="handleSharePost(post)">
                <text class="action-icon">🔄</text>
                <text class="action-text">分享</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部导航 -->
    <TabBar :current="3" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import TabBar from '@/components/common/TabBar.vue'

/**
 * 农技社区首页
 */

const elderlyStore = useElderlyStore()

// 今日推荐
const recommendList = ref([
  { id: 1, image: '🌾', title: '小麦春季管理要点' },
  { id: 2, image: '🍅', title: '西红柿种植技术' },
  { id: 3, image: '🌽', title: '玉米病虫害防治' },
  { id: 4, image: '🍚', title: '水稻育秧指南' }
])

// 农技知识
const knowledgeList = ref([
  {
    id: 1,
    icon: '🌾',
    title: '小麦返青期管理技术',
    description: '春季是小麦生长的关键时期，重点做好水肥管理...',
    viewCount: 1234,
    likeCount: 89,
    commentCount: 23
  },
  {
    id: 2,
    icon: '🍅',
    title: '大棚西红柿整枝打杈技巧',
    description: '正确的整枝打杈能有效提高产量和品质...',
    viewCount: 856,
    likeCount: 67,
    commentCount: 15
  },
  {
    id: 3,
    icon: '🌽',
    title: '玉米大斑病识别与防治',
    description: '大斑病是玉米常见病害，及时识别很重要...',
    viewCount: 678,
    likeCount: 45,
    commentCount: 8
  }
])

// 专家问答
const questionList = ref([
  {
    id: 1,
    title: '小麦叶子发黄是怎么回事？',
    content: '我的小麦最近发现叶子发黄，不知道是什么原因，应该如何处理？',
    expertName: '王教授',
    expertTitle: '农学专家',
    solved: true,
    publishTime: '2天前'
  },
  {
    id: 2,
    title: '西红柿什么时候追肥最合适？',
    content: '西红柿种植过程中，追肥的时间点和肥料选择有什么讲究？',
    expertName: '李农艺师',
    expertTitle: '蔬菜专家',
    solved: false,
    publishTime: '5天前'
  }
])

// 农友圈动态
const postList = ref([
  {
    id: 1,
    avatar: '👨',
    userName: '张种植',
    publishTime: '1小时前',
    location: '东村',
    content: '今年的小麦长势不错，预计能有个好收成！大家觉得什么时候收割合适？',
    images: ['🌾', '🌾', '🌾'],
    liked: false,
    likeCount: 23,
    commentCount: 8
  },
  {
    id: 2,
    avatar: '👩',
    userName: '李大棚',
    publishTime: '3小时前',
    location: '西村',
    content: '西红柿开始红了，第一批马上可以上市了！有需要的邻居可以联系。',
    images: ['🍅', '🍅'],
    liked: true,
    likeCount: 45,
    commentCount: 12
  }
])

// 搜索
const handleSearch = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: '/pages/agriculture/search'
  })
}

// 快捷入口点击
const handleEntryClick = (type) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/agriculture/${type}/index`
  })
}

// 推荐点击
const handleRecommendClick = (item) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/agriculture/knowledge/detail?id=${item.id}`
  })
}

// 知识点击
const handleKnowledgeClick = (knowledge) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/agriculture/knowledge/detail?id=${knowledge.id}`
  })
}

// 问题点击
const handleQuestionClick = (question) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/agriculture/ask/detail?id=${question.id}`
  })
}

// 动态点击
const handlePostClick = (post) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/agriculture/community/detail?id=${post.id}`
  })
}

// 点赞动态
const handleLikePost = (post) => {
  elderlyStore.vibrate('short')
  post.liked = !post.liked
  post.likeCount += post.liked ? 1 : -1

  if (post.liked) {
    uni.showToast({
      title: '点赞成功',
      icon: 'success',
      duration: 1000
    })
  }
}

// 评论动态
const handleCommentPost = (post) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/agriculture/community/detail?id=${post.id}&focus=comment`
  })
}

// 分享动态
const handleSharePost = (post) => {
  elderlyStore.vibrate('short')
  uni.showActionSheet({
    itemList: ['分享给好友', '生成海报'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.showToast({
          title: '分享成功',
          icon: 'success'
        })
      }
    }
  })
}

// 发布动态
const handlePublishPost = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: '/pages/agriculture/community/publish'
  })
}

// 查看更多
const handleMore = (type) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/agriculture/${type}/list`
  })
}

// 页面加载
onMounted(() => {
  console.log('农技社区页面加载')
})
</script>

<style lang="scss" scoped>
.agriculture-page {
  min-height: 100vh;
  background-color: var(--color-bg-page, #F7FAFC);
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #48BB78 0%, #38A169 100%);
  padding-top: env(safe-area-inset-top, 0);

  .navbar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
    padding: 0 32rpx;
  }

  .navbar-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #FFFFFF;
  }

  .navbar-icon {
    font-size: 48rpx;
  }
}

.page-content {
  height: 100vh;
  padding-top: calc(88rpx + env(safe-area-inset-top, 0));
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom, 0));
}

.quick-entry {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  padding: 32rpx;
  background-color: #FFFFFF;
  margin-bottom: 16rpx;
}

.entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 16rpx;
  background: linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(56, 161, 105, 0.1) 100%);
  border-radius: 16rpx;

  &:active {
    transform: scale(0.95);
  }
}

.entry-icon {
  font-size: 56rpx;
}

.entry-name {
  font-size: 24rpx;
  color: var(--color-text-primary, #1A202C);
}

.section {
  padding: 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--color-text-primary, #1A202C);
}

.section-more {
  font-size: 28rpx;
  color: var(--color-text-tertiary, #718096);
}

.publish-btn {
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #48BB78 0%, #38A169 100%);
  color: #FFFFFF;
  border-radius: 24rpx;
  font-size: 28rpx;
}

.recommend-scroll {
  white-space: nowrap;
}

.recommend-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-right: 16rpx;
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.recommend-image {
  font-size: 80rpx;
}

.recommend-title {
  font-size: 28rpx;
  color: var(--color-text-primary, #1A202C);
  text-align: center;
}

.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.knowledge-item {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.knowledge-icon {
  font-size: 64rpx;
  flex-shrink: 0;
}

.knowledge-content {
  flex: 1;
  min-width: 0;
}

.knowledge-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary, #1A202C);
  margin-bottom: 8rpx;
}

.knowledge-desc {
  font-size: 28rpx;
  color: var(--color-text-secondary, #4A5568);
  line-height: 1.6;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-meta {
  display: flex;
  gap: 16rpx;
}

.meta-item {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.ask-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.question-item {
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.question-header {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.question-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  color: #FFFFFF;
  border-radius: 50%;
  font-size: 28rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.question-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary, #1A202C);
}

.solved-badge {
  padding: 4rpx 12rpx;
  background-color: rgba(72, 187, 120, 0.1);
  color: #48BB78;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.question-content {
  font-size: 28rpx;
  color: var(--color-text-secondary, #4A5568);
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.question-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12rpx;
  border-top: 1rpx solid var(--color-border-primary, #E2E8F0);
}

.expert-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.expert-icon {
  font-size: 32rpx;
}

.expert-name {
  font-size: 28rpx;
  color: var(--color-text-primary, #1A202C);
}

.expert-title {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.question-time {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.post-item {
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.post-user {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-card, #F7FAFC);
  border-radius: 50%;
  font-size: 48rpx;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.user-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-primary, #1A202C);
}

.post-time {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.user-location {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.post-content {
  margin-bottom: 16rpx;
}

.post-text {
  font-size: 28rpx;
  color: var(--color-text-primary, #1A202C);
  line-height: 1.8;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.post-image {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-card, #F7FAFC);
  border-radius: 8rpx;
  font-size: 64rpx;
}

.post-actions {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-top: 12rpx;
  border-top: 1rpx solid var(--color-border-primary, #E2E8F0);
}

.action-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.action-icon {
  font-size: 32rpx;
}

.action-text {
  font-size: 28rpx;
  color: var(--color-text-secondary, #4A5568);
}

// 适老化模式
:global(.elderly-mode-large) {
  .entry-name {
    font-size: 28rpx;
  }

  .knowledge-title {
    font-size: 36rpx;
  }

  .question-title {
    font-size: 36rpx;
  }

  .post-text {
    font-size: 32rpx;
  }
}

:global(.elderly-mode-xl) {
  .quick-entry {
    grid-template-columns: repeat(2, 1fr);
  }

  .entry-name {
    font-size: 32rpx;
  }

  .knowledge-title {
    font-size: 44rpx;
  }

  .knowledge-desc {
    font-size: 36rpx;
  }

  .question-title {
    font-size: 44rpx;
  }

  .post-text {
    font-size: 40rpx;
  }
}
</style>
