/**
 * 公告详情页 - 重构版本
 * 使用独立的Store管理状态 + 可复用组件
 */
<template>
  <view class="announcement-detail-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-action" @click="handleBack" aria-label="返回">
        <SvgIcon name="arrow-left" :size="44" />
      </view>
      <view class="navbar-title">公告详情</view>
      <view class="navbar-actions">
        <view class="navbar-action" @click="handleShare" aria-label="分享">
          <SvgIcon name="share" :size="44" />
        </view>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 骨架屏加载 -->
      <view v-if="store.loading" class="skeleton-container">
        <view class="skeleton-tag" />
        <view class="skeleton-title-lg" />
        <view class="skeleton-meta" />
        <view class="skeleton-content" />
        <view class="skeleton-content" />
        <view class="skeleton-content-sm" />
      </view>

      <!-- 公告详情 -->
      <view v-else-if="detail" class="detail-container">
        <!-- 标签行 -->
        <view class="detail-tags">
          <AnnouncementTypeTag :type="detail.type" />
          <view v-if="detail.top" class="badge-top">置顶</view>
        </view>

        <!-- 标题 -->
        <view class="detail-title">{{ detail.title }}</view>

        <!-- 元信息 -->
        <view class="detail-meta">
          <view class="meta-item">
            <SvgIcon name="calendar" :size="32" />
            <text>{{ detail.publishDate }}</text>
          </view>
          <view class="meta-item">
            <SvgIcon name="eye" :size="32" />
            <text>{{ detail.viewCount }}次阅读</text>
          </view>
          <view class="meta-item">
            <SvgIcon name="tag" :size="32" />
            <text>{{ detail.category }}</text>
          </view>
        </view>

        <!-- 来源 -->
        <view class="detail-source">
          <text class="source-label">发布单位：</text>
          <text class="source-value">{{ detail.publisher }}</text>
        </view>

        <!-- 分隔线 -->
        <view class="detail-divider" />

        <!-- 正文内容 -->
        <view class="detail-content" @click="handleImageClick">
          <div v-html="detail.content" />
        </view>

        <!-- 附件列表 -->
        <AttachmentList
          v-if="hasAttachments"
          :attachments="detail.attachments || []"
          :show-header="true"
          action="download"
          @attachment-click="handleAttachmentClick"
        />

        <!-- 相关公告 -->
        <view v-if="relatedList.length > 0" class="detail-related">
          <view class="related-title">相关公告</view>
          <view
            v-for="item in relatedList"
            :key="item.id"
            class="related-item"
            @click="handleRelatedClick(item)"
            role="button"
            :aria-label="`查看${item.typeLabel}：${item.title}`"
            tabindex="0"
            @keydown.enter="handleRelatedClick(item)"
          >
            <AnnouncementTypeTag :type="item.type" />
            <view class="related-info">
              <text class="related-title-text">{{ item.title }}</text>
              <text class="related-date">{{ item.publishDate }}</text>
            </view>
            <SvgIcon name="chevron-right" :size="32" />
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <SvgIcon name="alert-circle" :size="120" color="#d9d9d9" />
        <text class="empty-title">公告不存在</text>
        <text class="empty-desc">请检查链接是否正确</text>
        <view
          class="empty-action"
          @click="handleBack"
          role="button"
          tabindex="0"
          @keydown.enter="handleBack"
        >
          <text>返回列表</text>
        </view>
      </view>
    </scroll-view>

    <!-- 浮动语音播报按钮 -->
    <view
      v-if="detail"
      class="floating-voice-btn"
      @click="toggleVoicePlayer"
      role="button"
      aria-label="语音播报"
    >
      <SvgIcon :name="voicePlayerVisible ? 'pause' : 'play-circle'" :size="56" />
    </view>

    <!-- 语音播报器 -->
    <VoicePlayer
      v-if="detail"
      v-show="voicePlayerVisible"
      :text="voiceText"
      :floating="true"
      @play="handleVoicePlay"
      @pause="handleVoicePause"
      @end="handleVoiceEnd"
      @error="handleVoiceError"
    />

    <!-- 图片预览 -->
    <ImagePreview
      v-model:visible="showImagePreview"
      :images="previewImages"
      :initial-index="previewInitialIndex"
    />

    <!-- 底部操作栏 -->
    <view v-if="detail" class="bottom-actions">
      <view
        class="action-item"
        :class="{ 'is-active': detail.liked }"
        @click="handleLike"
        role="button"
        :aria-label="detail.liked ? '取消点赞' : '点赞'"
        :aria-pressed="detail.liked"
      >
        <SvgIcon :name="detail.liked ? 'heart-filled' : 'heart'" :size="48" />
        <text class="action-text">{{ detail.likeCount || 0 }}</text>
      </view>
      <view
        class="action-item"
        @click="handleComment"
        role="button"
        aria-label="查看评论"
      >
        <SvgIcon name="message-circle" :size="48" />
        <text class="action-text">{{ detail.commentCount || 0 }}</text>
      </view>
      <view
        class="action-item"
        :class="{ 'is-active': detail.collected }"
        @click="handleCollect"
        role="button"
        :aria-label="detail.collected ? '取消收藏' : '收藏'"
        :aria-pressed="detail.collected"
      >
        <SvgIcon :name="detail.collected ? 'star-filled' : 'star'" :size="48" />
        <text class="action-text">{{ detail.collected ? '已收藏' : '收藏' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import { useNetworkStore } from '@/store/network'
import { useAnnouncementStore } from '@/store/announcement'
import SvgIcon from '@/components/icons/SvgIcon.vue'
import VoicePlayer from '@/components/common/VoicePlayer.vue'
import ImagePreview from '@/components/common/ImagePreview.vue'
import AnnouncementTypeTag from '@/components/announcement/AnnouncementTypeTag.vue'
import AttachmentList from '@/components/announcement/AttachmentList.vue'

/**
 * Store实例
 */
const elderlyStore = useElderlyStore()
const networkStore = useNetworkStore()
const store = useAnnouncementStore()

/**
 * 公告详情
 */
const detail = ref(null)

/**
 * 相关公告
 */
const relatedList = ref([])

/**
 * 图片预览
 */
const showImagePreview = ref(false)
const previewImages = ref([])
const previewInitialIndex = ref(0)

/**
 * 语音播报
 */
const voicePlayerVisible = ref(false)

/**
 * 语音播报文本
 */
const voiceText = computed(() => {
  if (!detail.value) return ''
  // 提取纯文本用于语音播报
  return `${detail.value.title}。${detail.value.publisher}发布于${detail.value.publishDate}。${stripHtmlTags(detail.value.content)}`
})

/**
 * 是否有附件
 */
const hasAttachments = computed(() => {
  return detail.value?.attachments && detail.value.attachments.length > 0
})

/**
 * 去除HTML标签，提取纯文本
 */
const stripHtmlTags = (html) => {
  // 在uni-app中，需要使用不同的方法
  // 简单实现：移除HTML标签
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * 提取内容中的所有图片URL
 */
const extractImages = () => {
  if (!detail.value?.content) return []

  const imgRegex = /<img[^>]+src="([^">]+)"/gi
  const images = []
  let match

  while ((match = imgRegex.exec(detail.value.content)) !== null) {
    images.push(match[1])
  }

  return images
}

/**
 * 获取公告详情
 */
const fetchDetail = async (id) => {
  try {
    // 如果离线，尝试从缓存读取
    if (!networkStore.isOnline) {
      const cached = networkStore.getCachedData(`announcement_${id}`)
      if (cached) {
        detail.value = cached
        return
      }
    }

    // 使用Store获取详情（带缓存）
    detail.value = await store.fetchAnnouncementDetail(id, true)

    // 缓存数据
    networkStore.cacheData(`announcement_${id}`, detail.value, 3600)

    // 标记已读
    store.markAsRead(id).catch(error => {
      console.error('标记已读失败:', error)
    })

    // 如果离线，添加到同步队列
    if (!networkStore.isOnline) {
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
  }
}

/**
 * 获取相关公告
 */
const fetchRelated = async (id) => {
  try {
    // TODO: 调用API获取相关公告
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

/**
 * 返回
 */
const handleBack = () => {
  elderlyStore.vibrate('short')
  uni.navigateBack()
}

/**
 * 分享
 */
const handleShare = () => {
  elderlyStore.vibrate('short')
  uni.showActionSheet({
    itemList: ['分享给微信好友', '分享到朋友圈', '复制链接'],
    success: (res) => {
      const actions = ['分享给微信好友', '分享到朋友圈', '复制链接']
      uni.showToast({
        title: actions[res.tapIndex] + '成功',
        icon: 'success'
      })
    }
  })
}

/**
 * 附件点击
 */
const handleAttachmentClick = (file) => {
  elderlyStore.vibrate('short')
  uni.showModal({
    title: file.name,
    content: `文件大小：${file.size}\n\n是否下载此附件？`,
    confirmText: '下载',
    cancelText: '取消',
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

/**
 * 相关公告点击
 */
const handleRelatedClick = (item) => {
  elderlyStore.vibrate('short')
  // 重新加载详情
  fetchDetail(item.id)
}

/**
 * 点赞
 */
const handleLike = async () => {
  elderlyStore.vibrate('short')
  try {
    const newState = await store.toggleLike(detail.value.id)
    uni.showToast({
      title: newState ? '已点赞' : '取消点赞',
      icon: 'success',
      duration: 1500
    })
  } catch (error) {
    console.error('点赞失败:', error)
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

/**
 * 评论
 */
const handleComment = () => {
  elderlyStore.vibrate('short')
  // TODO: 打开评论面板
  uni.showToast({
    title: '评论功能开发中',
    icon: 'none'
  })
}

/**
 * 收藏
 */
const handleCollect = async () => {
  elderlyStore.vibrate('short')
  try {
    const newState = await store.toggleCollect(detail.value.id)
    uni.showToast({
      title: newState ? '收藏成功' : '取消收藏',
      icon: 'success',
      duration: 1500
    })
  } catch (error) {
    console.error('收藏失败:', error)
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

/**
 * 图片点击 - 预览
 */
const handleImageClick = (e) => {
  const clickedImg = e.target
  if (clickedImg.tagName === 'IMG') {
    elderlyStore.vibrate('light')

    // 提取所有图片
    const images = extractImages()
    const clickedSrc = clickedImg.src

    // 找到点击图片的索引
    const index = images.findIndex(img => clickedSrc.includes(img))

    showImagePreview.value = true
    previewImages.value = images
    previewInitialIndex.value = index >= 0 ? index : 0
  }
}

/**
 * 切换语音播报
 */
const toggleVoicePlayer = () => {
  elderlyStore.vibrate('short')
  voicePlayerVisible.value = !voicePlayerVisible.value
}

/**
 * 语音播放器事件
 */
const handleVoicePlay = () => {
  console.log('开始播报')
}

const handleVoicePause = () => {
  console.log('暂停播报')
}

const handleVoiceEnd = () => {
  console.log('播报结束')
  voicePlayerVisible.value = false
}

const handleVoiceError = (error) => {
  console.error('语音播报错误:', error)
  uni.showToast({
    title: '播报失败',
    icon: 'none'
  })
  voicePlayerVisible.value = false
}

/**
 * 页面加载
 */
onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options
  const id = options.id

  if (id) {
    fetchDetail(id)
  } else {
    uni.showToast({
      title: '参数错误',
      icon: 'none'
    })
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.announcement-detail-page {
  min-height: 100vh;
  background-color: $bg-color;
}

// 导航栏
.custom-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 $spacing-lg;
  background-color: $bg-white;
  border-bottom: 1rpx solid $border-color;
  position: sticky;
  top: 0;
  z-index: $z-index-sticky;
}

.navbar-action {
  width: $touch-target-comfort;
  height: $touch-target-comfort;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: $border-radius-base;
  transition: background-color $transition-fast;

  &:active {
    background-color: $bg-hover;
  }
}

.navbar-actions {
  display: flex;
  gap: $spacing-sm;
}

.navbar-title {
  flex: 1;
  text-align: center;
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $text-primary;
}

// 页面内容
.page-content {
  height: calc(100vh - 96rpx - 144rpx);
  padding-bottom: env(safe-area-inset-bottom, 0);
}

// 骨架屏
.skeleton-container {
  padding: $spacing-xl;
}

.skeleton-tag {
  width: 80rpx;
  height: 40rpx;
  background: linear-gradient(90deg, $bg-disabled 25%, $border-color 50%, $bg-disabled 75%);
  background-size: 200% 100%;
  border-radius: $border-radius-sm;
  animation: skeleton-loading 1.5s infinite;
  margin-bottom: $spacing-md;
}

.skeleton-title-lg {
  width: 90%;
  height: 52rpx;
  background: linear-gradient(90deg, $bg-disabled 25%, $border-color 50%, $bg-disabled 75%);
  background-size: 200% 100%;
  border-radius: $border-radius-sm;
  animation: skeleton-loading 1.5s infinite;
  margin-bottom: $spacing-md;
}

.skeleton-meta {
  width: 70%;
  height: 36rpx;
  background: linear-gradient(90deg, $bg-disabled 25%, $border-color 50%, $bg-disabled 75%);
  background-size: 200% 100%;
  border-radius: $border-radius-sm;
  animation: skeleton-loading 1.5s infinite 0.1s;
  margin-bottom: $spacing-xl;
}

.skeleton-content {
  width: 100%;
  height: 40rpx;
  background: linear-gradient(90deg, $bg-disabled 25%, $border-color 50%, $bg-disabled 75%);
  background-size: 200% 100%;
  border-radius: $border-radius-sm;
  animation: skeleton-loading 1.5s infinite;
  margin-bottom: $spacing-md;
}

.skeleton-content-sm {
  width: 60%;
  height: 40rpx;
  background: linear-gradient(90deg, $bg-disabled 25%, $border-color 50%, $bg-disabled 75%);
  background-size: 200% 100%;
  border-radius: $border-radius-sm;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// 详情容器
.detail-container {
  padding: $spacing-xl;
}

.detail-tags {
  display: flex;
  gap: 12rpx;
  margin-bottom: $spacing-md;
  align-items: center;
}

.badge-top {
  padding: 4rpx 12rpx;
  background-color: $danger-color;
  color: $bg-white;
  border-radius: $border-radius-sm;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
}

.detail-title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $text-primary;
  line-height: $line-height-relaxed;
  margin-bottom: $spacing-md;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-md;
  padding: $spacing-md 0;
  border-top: 1rpx solid $border-color;
  border-bottom: 1rpx solid $border-color;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-base;
  color: $text-tertiary;
}

.detail-source {
  padding: $spacing-md 0;
  font-size: $font-size-base;
  color: $text-secondary;
  line-height: $line-height-normal;
}

.source-label {
  color: $text-tertiary;
}

.source-value {
  color: $text-primary;
  font-weight: $font-weight-semibold;
}

.detail-divider {
  height: 1rpx;
  background-color: $border-color;
  margin: $spacing-md 0 $spacing-xl 0;
}

.detail-content {
  font-size: $font-size-lg;
  line-height: $line-height-loose;
  color: $text-primary;
  overflow: hidden;

  // 图片样式 - 适老化优化
  :deep(img) {
    max-width: 100%;
    height: auto;
    display: block;
    border-radius: $border-radius-base;
    margin: $spacing-md 0;
    cursor: pointer;
    transition: transform $transition-fast, box-shadow $transition-fast;
    box-shadow: $shadow-xs;

    &:active {
      transform: scale(0.98);
      box-shadow: $shadow-sm;
    }
  }

  // 视频和音频
  :deep(video) {
    max-width: 100%;
    height: auto;
    border-radius: $border-radius-base;
    margin: $spacing-md 0;
  }

  :deep(audio) {
    width: 100%;
    margin: $spacing-md 0;
  }

  // 表格样式
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: $font-size-base;
    margin: $spacing-md 0;
    overflow-x: auto;
    display: block;

    td, th {
      padding: $spacing-sm;
      border: 1rpx solid $border-color;
      text-align: left;
    }

    th {
      background-color: $bg-color-light;
      font-weight: $font-weight-semibold;
    }

    tr:nth-child(even) {
      background-color: $bg-color-light;
    }
  }

  // 列表样式
  :deep(ul),
  :deep(ol) {
    padding-left: $spacing-xl;
    margin: $spacing-md 0;
  }

  :deep(li) {
    margin-bottom: $spacing-sm;
    line-height: $line-height-relaxed;
  }

  // 链接样式
  :deep(a) {
    color: $primary-color;
    text-decoration: underline;
    font-weight: $font-weight-medium;

    &:active {
      opacity: 0.7;
    }
  }

  // 段落
  :deep(p) {
    margin-bottom: $spacing-md;
    text-align: justify;
  }

  // 标题
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    font-weight: $font-weight-bold;
    margin: $spacing-lg 0 $spacing-md 0;
  }
}

// 相关公告
.detail-related {
  margin-top: $spacing-2xl;
  padding-top: $spacing-xl;
  border-top: 1rpx solid $border-color;
}

.related-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $text-primary;
  margin-bottom: $spacing-md;
}

.related-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  margin-bottom: $spacing-sm;
  background-color: $bg-white;
  border-radius: $border-radius-base;
  transition: background-color $transition-fast;

  &:active {
    background-color: $bg-hover;
  }

  .related-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    min-width: 0;
  }

  .related-title-text {
    font-size: $font-size-base;
    font-weight: $font-weight-medium;
    color: $text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .related-date {
    font-size: $font-size-sm;
    color: $text-tertiary;
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx $spacing-xl;
  text-align: center;

  .empty-title {
    margin-top: $spacing-lg;
    font-size: $font-size-lg;
    font-weight: $font-weight-medium;
    color: $text-primary;
  }

  .empty-desc {
    margin-top: $spacing-sm;
    font-size: $font-size-base;
    color: $text-secondary;
  }

  .empty-action {
    margin-top: $spacing-xl;
    padding: $spacing-md $spacing-xl;
    background-color: $primary-color;
    color: $bg-white;
    border-radius: $border-radius-full;
    font-size: $font-size-base;
    transition: opacity $transition-fast;

    &:active {
      opacity: 0.8;
    }
  }
}

// 浮动语音按钮
.floating-voice-btn {
  position: fixed;
  bottom: 240rpx;
  right: $spacing-lg;
  width: 112rpx;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $primary-color 0%, $primary-dark 100%);
  border-radius: 50%;
  box-shadow: $shadow-lg;
  z-index: $z-index-floating;
  transition: transform $transition-fast;

  &:active {
    transform: scale(0.95);
  }
}

// 底部操作栏
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: $spacing-md $spacing-lg;
  padding-bottom: calc($spacing-md + env(safe-area-inset-bottom, 0));
  background-color: $bg-white;
  border-top: 1rpx solid $border-color;
  z-index: $z-index-fixed;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  transition: opacity $transition-fast;

  &:active {
    opacity: 0.7;
  }

  &.is-active {
    color: $danger-color;
  }

  .action-text {
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  &.is-active .action-text {
    color: $danger-color;
  }
}

// 适老化模式
.elderly-mode {
  .detail-title {
    font-size: 48rpx;
  }

  .detail-content {
    font-size: 36rpx;
  }

  .related-title {
    font-size: 36rpx;
  }

  .related-item .related-title-text {
    font-size: 32rpx;
  }

  .floating-voice-btn {
    width: 140rpx;
    height: 140rpx;
    bottom: 200rpx;
  }

  .action-item {
    .action-text {
      font-size: 32rpx;
    }
  }
}

// 减少动画（适老化）
@media (prefers-reduced-motion: reduce) {
  .navbar-action,
  .floating-voice-btn,
  .action-item,
  .related-item {
    transition: none;
    &:active {
      transform: none;
    }
  }

  .skeleton-tag,
  .skeleton-title-lg,
  .skeleton-meta,
  .skeleton-content,
  .skeleton-content-sm {
    animation: none;
  }
}
</style>
