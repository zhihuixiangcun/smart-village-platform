<template>
  <view class="announcement-detail-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-back" @click="handleBack">
        <text class="icon">←</text>
      </view>
      <view class="navbar-title">公告详情</view>
      <view class="navbar-icon" @click="handleShare">
        <text class="icon">📤</text>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <uni-load-more status="loading" :contentText="{ contentdown: '加载中...' }" />
      </view>

      <!-- 公告详情 -->
      <view v-else-if="detail" class="detail-container">
        <!-- 标签 -->
        <view class="detail-tags">
          <view :class="['tag', `tag-${detail.type}`]">{{ detail.typeLabel }}</view>
          <view v-if="detail.top" class="tag tag-top">置顶</view>
        </view>

        <!-- 标题 -->
        <view class="detail-title">{{ detail.title }}</view>

        <!-- 元信息 -->
        <view class="detail-meta">
          <text class="meta-item">📅 {{ detail.publishDate }}</text>
          <text class="meta-item">👁️ {{ detail.viewCount }}次阅读</text>
          <text class="meta-item">📂 {{ detail.category }}</text>
        </view>

        <!-- 来源 -->
        <view class="detail-source">
          <text class="source-label">发布单位：</text>
          <text class="source-value">{{ detail.publisher }}</text>
        </view>

        <!-- 分隔线 -->
        <view class="detail-divider" />

        <!-- 正文内容 -->
        <view class="detail-content">
          <rich-text :nodes="detail.content" />
        </view>

        <!-- 附件 -->
        <view v-if="detail.attachments && detail.attachments.length > 0" class="detail-attachments">
          <view class="attachments-title">📎 相关附件</view>
          <view
            v-for="(file, index) in detail.attachments"
            :key="index"
            class="attachment-item"
            @click="handleAttachmentClick(file)"
          >
            <text class="file-icon">📄</text>
            <view class="file-info">
              <text class="file-name">{{ file.name }}</text>
              <text class="file-size">{{ file.size }}</text>
            </view>
            <text class="file-download">下载</text>
          </view>
        </view>

        <!-- 相关公告 -->
        <view v-if="relatedList.length > 0" class="detail-related">
          <view class="related-title">相关公告</view>
          <view
            v-for="item in relatedList"
            :key="item.id"
            class="related-item"
            @click="handleRelatedClick(item)"
          >
            <view class="related-tag" :class="`tag-${item.type}`">{{ item.typeLabel }}</view>
            <view class="related-info">
              <text class="related-title-text">{{ item.title }}</text>
              <text class="related-date">{{ item.publishDate }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <text class="empty-icon">📭</text>
        <text class="empty-text">公告不存在</text>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="detail" class="bottom-actions">
      <view class="action-item" @click="handleLike">
        <text class="action-icon">{{ detail.liked ? '❤️' : '🤍' }}</text>
        <text class="action-text">{{ detail.likeCount }}</text>
      </view>
      <view class="action-item" @click="handleComment">
        <text class="action-icon">💬</text>
        <text class="action-text">评论</text>
      </view>
      <view class="action-item" @click="handleCollect">
        <text class="action-icon">{{ detail.collected ? '⭐' : '☆' }}</text>
        <text class="action-text">收藏</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import { useNetworkStore } from '@/store/network'
import { api } from '@/api'

/**
 * 公告详情页面
 */

const elderlyStore = useElderlyStore()
const networkStore = useNetworkStore()

// 加载状态
const loading = ref(true)

// 公告详情
const detail = ref(null)

// 相关公告
const relatedList = ref([])

// 获取公告详情
const fetchDetail = async (id) => {
  loading.value = true

  try {
    // 如果离线，尝试从缓存读取
    if (!networkStore.isOnline) {
      const cached = networkStore.getCachedData(`announcement_${id}`)
      if (cached) {
        detail.value = cached
        loading.value = false
        return
      }
    }

    // 在线获取
    // const result = await api.village.announcement.getDetail(id)
    // detail.value = result.data

    // 模拟数据
    await new Promise(resolve => setTimeout(resolve, 500))
    detail.value = {
      id: id,
      type: 'important',
      typeLabel: '重要',
      title: '关于2024年度村财务收支情况的公示',
      publishDate: '2024-12-28 10:30',
      viewCount: 328,
      category: '财务公开',
      publisher: '东村村委会',
      top: true,
      liked: false,
      likeCount: 45,
      collected: false,
      content: '<p>为保障村民的知情权和监督权，现将2024年度村级财务收支情况公示如下：</p><p><strong>一、收入情况</strong></p><p>1. 村集体土地流转收入：568,000元<br>2. 厂房租金收入：480,000元<br>3. 特色种植项目补贴：200,000元<br>4. 其他收入：8,800元</p><p><strong>收入合计：1,256,800元</strong></p><p><strong>二、支出情况</strong></p><p>1. 道路维修工程款：128,000元<br>2. 村部电费：860元<br>3. 重阳节活动经费：15,000元<br>4. 宣传资料印刷费：3,200元<br>5. 信息化系统维护费：5,000元<br>6. 工资补贴：832,440元</p><p><strong>支出合计：983,500元</strong></p><p><strong>三、结余情况</strong></p><p>本年度结余：273,300元</p><p>公示期：2024年12月28日至2025年1月3日</p><p>如有疑问，请向村委会反映。</p>',
      attachments: [
        { name: '2024年度财务报表.pdf', size: '2.3MB', url: '' },
        { name: '12月收支明细.xlsx', size: '156KB', url: '' }
      ]
    }

    // 缓存数据
    networkStore.cacheData(`announcement_${id}`, detail.value, 3600)

    // 标记已读
    if (networkStore.isOnline) {
      // await api.village.announcement.markAsRead(id)
    } else {
      networkStore.addToOfflineQueue({
        type: 'announcement_read',
        data: { id }
      })
    }

    // 获取相关公告
    fetchRelated(id)

  } catch (error) {
    console.error('获取公告详情失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 获取相关公告
const fetchRelated = async (id) => {
  try {
    // const result = await api.village.announcement.getRelated(id)
    // relatedList.value = result.data

    // 模拟数据
    relatedList.value = [
      {
        id: 2,
        type: 'notice',
        typeLabel: '通知',
        title: '村内道路维修通知',
        publishDate: '2024-12-25'
      },
      {
        id: 3,
        type: 'public',
        typeLabel: '公示',
        title: '关于2025年度农业补贴发放的公示',
        publishDate: '2024-12-18'
      }
    ]
  } catch (error) {
    console.error('获取相关公告失败:', error)
  }
}

// 返回
const handleBack = () => {
  elderlyStore.vibrate('short')
  uni.navigateBack()
}

// 分享
const handleShare = () => {
  elderlyStore.vibrate('short')
  uni.showActionSheet({
    itemList: ['分享给微信好友', '分享到朋友圈', '复制链接'],
    success: (res) => {
      uni.showToast({
        title: '分享成功',
        icon: 'success'
      })
    }
  })
}

// 附件点击
const handleAttachmentClick = (file) => {
  elderlyStore.vibrate('short')
  uni.showModal({
    title: file.name,
    content: `文件大小：${file.size}\n\n是否下载此附件？`,
    success: (res) => {
      if (res.confirm) {
        uni.showLoading({
          title: '下载中...'
        })
        setTimeout(() => {
          uni.hideLoading()
          uni.showToast({
            title: '下载完成',
            icon: 'success'
          })
        }, 2000)
      }
    }
  })
}

// 相关公告点击
const handleRelatedClick = (item) => {
  elderlyStore.vibrate('short')
  // 重新加载详情
  fetchDetail(item.id)
}

// 点赞
const handleLike = () => {
  elderlyStore.vibrate('short')
  detail.value.liked = !detail.value.liked
  detail.value.likeCount += detail.value.liked ? 1 : -1
}

// 评论
const handleComment = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/village/announcement/comment?id=${detail.value.id}`
  })
}

// 收藏
const handleCollect = () => {
  elderlyStore.vibrate('short')
  detail.value.collected = !detail.value.collected
  uni.showToast({
    title: detail.value.collected ? '收藏成功' : '取消收藏',
    icon: 'success'
  })
}

// 页面加载
onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options
  const id = options.id

  if (id) {
    fetchDetail(id)
  } else {
    loading.value = false
    uni.showToast({
      title: '参数错误',
      icon: 'none'
    })
  }
})
</script>

<style lang="scss" scoped>
.announcement-detail-page {
  min-height: 100vh;
  background-color: var(--color-bg-page, #F7FAFC);
}

.custom-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
  background-color: #FFFFFF;
  border-bottom: 1rpx solid var(--color-border-primary, #E2E8F0);
}

.navbar-back,
.navbar-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
}

.navbar-title {
  flex: 1;
  text-align: center;
  font-size: 36rpx;
  font-weight: 700;
  color: var(--color-text-primary, #1A202C);
}

.page-content {
  height: calc(100vh - 88rpx - 120rpx);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-icon {
  font-size: 120rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 32rpx;
  color: var(--color-text-tertiary, #718096);
}

.detail-container {
  padding: 32rpx;
}

.detail-tags {
  display: flex;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.tag {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;

  &.tag-important {
    background-color: rgba(245, 101, 101, 0.1);
    color: #F56565;
  }

  &.tag-notice {
    background-color: rgba(66, 153, 225, 0.1);
    color: #4299E1;
  }

  &.tag-meeting {
    background-color: rgba(236, 201, 75, 0.1);
    color: #ECC94B;
  }

  &.tag-public {
    background-color: rgba(72, 187, 120, 0.1);
    color: #48BB78;
  }

  &.tag-top {
    background-color: rgba(245, 101, 101, 0.1);
    color: #F56565;
  }
}

.detail-title {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--color-text-primary, #1A202C);
  line-height: 1.5;
  margin-bottom: 24rpx;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  padding: 24rpx 0;
  border-top: 1rpx solid var(--color-border-primary, #E2E8F0);
  border-bottom: 1rpx solid var(--color-border-primary, #E2E8F0);
}

.meta-item {
  font-size: 28rpx;
  color: var(--color-text-tertiary, #718096);
}

.detail-source {
  padding: 24rpx 0;
  font-size: 28rpx;
  color: var(--color-text-secondary, #4A5568);
}

.source-label {
  color: var(--color-text-tertiary, #718096);
}

.source-value {
  color: var(--color-text-primary, #1A202C);
  font-weight: 600;
}

.detail-divider {
  height: 1rpx;
  background-color: var(--color-border-primary, #E2E8F0);
  margin: 16rpx 0;
}

.detail-content {
  padding: 32rpx 0;
  font-size: 32rpx;
  line-height: 2;
  color: var(--color-text-primary, #1A202C);

  :deep(p) {
    margin-bottom: 24rpx;
  }

  :deep(strong) {
    font-weight: 700;
    color: var(--color-text-primary, #1A202C);
  }
}

.detail-attachments {
  margin-top: 32rpx;
  padding: 32rpx;
  background-color: var(--color-bg-card, #F7FAFC);
  border-radius: 16rpx;
}

.attachments-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--color-text-primary, #1A202C);
  margin-bottom: 16rpx;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  margin-bottom: 12rpx;
  background-color: #FFFFFF;
  border-radius: 12rpx;

  &:last-child {
    margin-bottom: 0;
  }

  &:active {
    background-color: var(--color-bg-hover, #EDF2F7);
  }
}

.file-icon {
  font-size: 48rpx;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.file-name {
  font-size: 28rpx;
  color: var(--color-text-primary, #1A202C);
}

.file-size {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.file-download {
  padding: 12rpx 24rpx;
  background-color: var(--color-primary, #2F855A);
  color: #FFFFFF;
  border-radius: 8rpx;
  font-size: 28rpx;
  flex-shrink: 0;
}

.detail-related {
  margin-top: 32rpx;
}

.related-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--color-text-primary, #1A202C);
  margin-bottom: 16rpx;
}

.related-item {
  display: flex;
  gap: 16rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
  background-color: #FFFFFF;
  border-radius: 12rpx;

  &:active {
    background-color: var(--color-bg-hover, #EDF2F7);
  }
}

.related-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.related-title-text {
  font-size: 28rpx;
  color: var(--color-text-primary, #1A202C);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-date {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 120rpx;
  padding: 0 32rpx;
  padding-bottom: env(safe-area-inset-bottom, 0);
  background-color: #FFFFFF;
  border-top: 1rpx solid var(--color-border-primary, #E2E8F0);
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.action-icon {
  font-size: 48rpx;
}

.action-text {
  font-size: 24rpx;
  color: var(--color-text-secondary, #4A5568);
}

// 适老化模式
:global(.elderly-mode-large) {
  .detail-title {
    font-size: 44rpx;
  }

  .detail-content {
    font-size: 36rpx;
  }
}

:global(.elderly-mode-xl) {
  .detail-title {
    font-size: 52rpx;
  }

  .detail-content {
    font-size: 44rpx;
  }
}
</style>
