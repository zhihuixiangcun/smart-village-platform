<template>
  <div class="agriculture-page">
    <!-- 自定义导航栏 -->
    <div class="custom-navbar">
      <div class="navbar-content">
        <div class="navbar-title">农技社区</div>
        <div class="navbar-icon" @click="handleSearch">
          <span class="icon">🔍</span>
        </div>
      </div>
    </div>

    <!-- 页面内容 -->
    <div class="page-content">
      <!-- 快捷入口 -->
      <div class="quick-entry">
        <div class="entry-item" @click="handleEntryClick('knowledge')">
          <span class="entry-icon">📚</span>
          <span class="entry-name">知识库</span>
        </div>
        <div class="entry-item" @click="handleEntryClick('ask')">
          <span class="entry-icon">👨‍🌾</span>
          <span class="entry-name">专家问答</span>
        </div>
        <div class="entry-item" @click="handleEntryClick('disease')">
          <span class="entry-icon">🐛</span>
          <span class="entry-name">病虫害识别</span>
        </div>
        <div class="entry-item" @click="handleEntryClick('community')">
          <span class="entry-icon">👥</span>
          <span class="entry-name">农友圈</span>
        </div>
      </div>

      <!-- 今日推荐 -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">🌟 今日推荐</span>
        </div>
        <div class="recommend-scroll">
          <div
            v-for="item in recommendList"
            :key="item.id"
            class="recommend-item"
            @click="handleRecommendClick(item)"
          >
            <div class="recommend-image">{{ item.image }}</div>
            <div class="recommend-title">{{ item.title }}</div>
          </div>
        </div>
      </div>

      <!-- 农技知识 -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">📖 农技知识</span>
          <span class="section-more" @click="handleMore('knowledge')">更多 ></span>
        </div>
        <div class="knowledge-list">
          <div
            v-for="knowledge in knowledgeList"
            :key="knowledge.id"
            class="knowledge-item"
            @click="handleKnowledgeClick(knowledge)"
          >
            <div class="knowledge-icon">{{ knowledge.icon }}</div>
            <div class="knowledge-content">
              <div class="knowledge-title">{{ knowledge.title }}</div>
              <div class="knowledge-desc">{{ knowledge.description }}</div>
              <div class="knowledge-meta">
                <span class="meta-item">👁️ {{ knowledge.viewCount }}</span>
                <span class="meta-item">👍 {{ knowledge.likeCount }}</span>
                <span class="meta-item">💬 {{ knowledge.commentCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 专家问答 -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">💬 专家问答</span>
          <span class="section-more" @click="handleMore('ask')">更多 ></span>
        </div>
        <div class="ask-list">
          <div
            v-for="question in questionList"
            :key="question.id"
            class="question-item"
            @click="handleQuestionClick(question)"
          >
            <div class="question-header">
              <div class="question-icon">Q</div>
              <div class="question-title">{{ question.title }}</div>
              <div v-if="question.solved" class="solved-badge">已解决</div>
            </div>
            <div class="question-content">
              {{ question.content }}
            </div>
            <div class="question-footer">
              <div class="expert-info">
                <span class="expert-icon">👨‍🌾</span>
                <span class="expert-name">{{ question.expertName }}</span>
                <span class="expert-title">{{ question.expertTitle }}</span>
              </div>
              <span class="question-time">{{ question.publishTime }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 农友圈动态 -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">🌾 农友圈</span>
          <div class="publish-btn" @click="handlePublishPost">
            <span>+ 发布</span>
          </div>
        </div>
        <div class="post-list">
          <div
            v-for="post in postList"
            :key="post.id"
            class="post-item"
            @click="handlePostClick(post)"
          >
            <!-- 用户信息 -->
            <div class="post-user">
              <div class="user-avatar">{{ post.avatar }}</div>
              <div class="user-info">
                <div class="user-name">{{ post.userName }}</div>
                <div class="post-time">{{ post.publishTime }}</div>
              </div>
              <div class="user-location">{{ post.location }}</div>
            </div>

            <!-- 内容 -->
            <div class="post-content">
              <span class="post-text">{{ post.content }}</span>
            </div>

            <!-- 图片 -->
            <div v-if="post.images && post.images.length > 0" class="post-images">
              <div
                v-for="(image, index) in post.images"
                :key="index"
                class="post-image"
              >
                {{ image }}
              </div>
            </div>

            <!-- 互动 -->
            <div class="post-actions">
              <div class="action-item" @click.stop="handleLikePost(post)">
                <span class="action-icon">{{ post.liked ? '❤️' : '🤍' }}</span>
                <span class="action-text">{{ post.likeCount }}</span>
              </div>
              <div class="action-item" @click.stop="handleCommentPost(post)">
                <span class="action-icon">💬</span>
                <span class="action-text">{{ post.commentCount }}</span>
              </div>
              <div class="action-item" @click.stop="handleSharePost(post)">
                <span class="action-icon">🔄</span>
                <span class="action-text">分享</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <TabBar :current="3" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useElderlyStore } from '@/store/elderly'
import TabBar from '@/components/common/TabBar.vue'

/**
 * 农技社区首页
 */

const router = useRouter()
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
  router.push('/agriculture/search')
}

// 快捷入口点击
const handleEntryClick = (type) => {
  elderlyStore.vibrate('short')
  console.log('快捷入口:', type)
}

// 推荐点击
const handleRecommendClick = (item) => {
  elderlyStore.vibrate('short')
  console.log('推荐点击:', item.title)
}

// 知识点击
const handleKnowledgeClick = (knowledge) => {
  elderlyStore.vibrate('short')
  console.log('知识点击:', knowledge.title)
}

// 问题点击
const handleQuestionClick = (question) => {
  elderlyStore.vibrate('short')
  console.log('问题点击:', question.title)
}

// 动态点击
const handlePostClick = (post) => {
  elderlyStore.vibrate('short')
  console.log('动态点击:', post.content)
}

// 点赞动态
const handleLikePost = (post) => {
  elderlyStore.vibrate('short')
  post.liked = !post.liked
  post.likeCount += post.liked ? 1 : -1

  if (post.liked) {
    alert('点赞成功')
  }
}

// 评论动态
const handleCommentPost = (post) => {
  elderlyStore.vibrate('short')
  console.log('评论动态:', post.id)
}

// 分享动态
const handleSharePost = (post) => {
  elderlyStore.vibrate('short')
  alert('分享功能开发中')
}

// 发布动态
const handlePublishPost = () => {
  elderlyStore.vibrate('short')
  console.log('发布动态')
}

// 查看更多
const handleMore = (type) => {
  elderlyStore.vibrate('short')
  console.log('查看更多:', type)
}

// 页面加载
onMounted(() => {
  console.log('农技社区页面加载')
})
</script>

<style lang="scss" scoped>
.agriculture-page {
  min-height: 100vh;
  background-color: #F7FAFC;
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
    height: 44px;
    padding: 0 16px;
  }

  .navbar-title {
    font-size: 18px;
    font-weight: 700;
    color: #FFFFFF;
  }

  .navbar-icon {
    font-size: 24px;
  }
}

.page-content {
  height: 100vh;
  padding-top: calc(44px + env(safe-area-inset-top, 0));
  padding-bottom: calc(50px + env(safe-area-inset-bottom, 0));
  overflow-y: auto;
}

.quick-entry {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 16px;
  background-color: #FFFFFF;
  margin-bottom: 8px;
}

.entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(56, 161, 105, 0.1) 100%);
  border-radius: 8px;

  &:active {
    transform: scale(0.95);
  }
}

.entry-icon {
  font-size: 28px;
}

.entry-name {
  font-size: 12px;
  color: #1A202C;
}

.section {
  padding: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A202C;
}

.section-more {
  font-size: 14px;
  color: #718096;
  cursor: pointer;
}

.publish-btn {
  padding: 6px 12px;
  background: linear-gradient(135deg, #48BB78 0%, #38A169 100%);
  color: #FFFFFF;
  border-radius: 12px;
  font-size: 14px;
}

.recommend-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.recommend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
}

.recommend-image {
  font-size: 40px;
}

.recommend-title {
  font-size: 14px;
  color: #1A202C;
  text-align: center;
}

.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.knowledge-item {
  display: flex;
  gap: 8px;
  padding: 12px;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.knowledge-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.knowledge-content {
  flex: 1;
  min-width: 0;
}

.knowledge-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A202C;
  margin-bottom: 4px;
}

.knowledge-desc {
  font-size: 14px;
  color: #4A5568;
  line-height: 1.6;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-meta {
  display: flex;
  gap: 8px;
}

.meta-item {
  font-size: 12px;
  color: #718096;
}

.ask-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-item {
  padding: 12px;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.question-header {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
}

.question-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  color: #FFFFFF;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.question-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #1A202C;
}

.solved-badge {
  padding: 2px 6px;
  background-color: rgba(72, 187, 120, 0.1);
  color: #48BB78;
  border-radius: 4px;
  font-size: 12px;
}

.question-content {
  font-size: 14px;
  color: #4A5568;
  line-height: 1.6;
  margin-bottom: 8px;
}

.question-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid #E2E8F0;
}

.expert-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.expert-icon {
  font-size: 16px;
}

.expert-name {
  font-size: 14px;
  color: #1A202C;
}

.expert-title {
  font-size: 12px;
  color: #718096;
}

.question-time {
  font-size: 12px;
  color: #718096;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-item {
  padding: 12px;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.post-user {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F7FAFC;
  border-radius: 50%;
  font-size: 24px;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A202C;
}

.post-time {
  font-size: 12px;
  color: #718096;
}

.user-location {
  font-size: 12px;
  color: #718096;
}

.post-content {
  margin-bottom: 8px;
}

.post-text {
  font-size: 14px;
  color: #1A202C;
  line-height: 1.8;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.post-image {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F7FAFC;
  border-radius: 4px;
  font-size: 32px;
}

.post-actions {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-top: 6px;
  border-top: 1px solid #E2E8F0;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-icon {
  font-size: 16px;
}

.action-text {
  font-size: 14px;
  color: #4A5568;
}

// 适老化模式
[data-elderly-mode="large"] {
  .entry-name {
    font-size: 14px;
  }

  .knowledge-title {
    font-size: 18px;
  }

  .question-title {
    font-size: 18px;
  }

  .post-text {
    font-size: 16px;
  }
}

[data-elderly-mode="xl"] {
  .quick-entry {
    grid-template-columns: repeat(2, 1fr);
  }

  .entry-name {
    font-size: 16px;
  }

  .knowledge-title {
    font-size: 22px;
  }

  .knowledge-desc {
    font-size: 18px;
  }

  .question-title {
    font-size: 22px;
  }

  .post-text {
    font-size: 20px;
  }
}
</style>
