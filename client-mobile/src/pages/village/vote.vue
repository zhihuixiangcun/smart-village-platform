<template>
  <view class="vote-page">
    <!-- 优化的导航栏 - 带渐变和阴影 -->
    <view class="custom-navbar">
      <view class="navbar-back" @click="handleBack" :active-class="'navbar-back--active'">
        <text class="icon">←</text>
      </view>
      <view class="navbar-title">在线投票</view>
      <view class="navbar-icon" @click="handleHistory" :active-class="'navbar-icon--active'">
        <text class="icon">📋</text>
      </view>
    </view>

    <!-- 页面内容 - 改进间距和布局 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 投票卡片 - 增强视觉层次 -->
      <view class="vote-list">
        <view
          v-for="item in voteList"
          :key="item.id"
          :class="['vote-card', `vote-card--${item.status}`, { 'vote-card--elderly': elderlyStore.isElderlyMode }]"
        >
          <!-- 投票头部 - 优化状态标签 -->
          <view class="card-header">
            <view class="header-left">
              <text class="card-title">{{ item.title }}</text>
              <view :class="['status-badge', `status-${item.status}`]">
                <text class="status-icon">{{ getStatusIcon(item.status) }}</text>
                <text class="status-text">{{ item.statusText }}</text>
              </view>
            </view>
            <view class="priority-badge" v-if="item.priority === 'high'">
              <text class="priority-text">重要</text>
            </view>
          </view>

          <!-- 投票描述 - 改进可读性 -->
          <view class="card-desc">{{ item.description }}</view>

          <!-- 投票选项 - 更大的触控区域 -->
          <view class="card-options">
            <view
              v-for="(option, index) in item.options"
              :key="index"
              :class="[
                'option-item',
                {
                  'option-item--selected': isOptionSelected(item, index),
                  'option-item--voted': item.hasVoted,
                  'option-item--multiple': item.type === 'multiple',
                  'option-item--elderly': elderlyStore.isElderlyMode
                }
              ]"
              @click="handleOptionClick(item, index)"
              :active-class="'option-item--active'"
            >
              <!-- 选择框 - 使用SVG图标 -->
              <view class="option-check">
                <template v-if="item.type === 'single'">
                  <text class="check-radio" v-if="isOptionSelected(item, index)">●</text>
                  <text class="check-radio" v-else>○</text>
                </template>
                <template v-else>
                  <text class="check-checkbox" v-if="isOptionSelected(item, index)">☑</text>
                  <text class="check-checkbox" v-else>☐</text>
                </template>
              </view>

              <!-- 选项内容 - 优化布局 -->
              <view class="option-content">
                <text class="option-text">{{ option.text }}</text>

                <!-- 已投票显示进度 - 增强视觉效果 -->
                <view v-if="item.hasVoted" class="option-progress">
                  <view class="progress-bar">
                    <view
                      class="progress-fill"
                      :style="{ width: option.percent + '%' }"
                    >
                      <view class="progress-shine"></view>
                    </view>
                  </view>
                  <view class="option-stats">
                    <text class="option-percent">{{ option.percent }}%</text>
                    <text class="option-count">{{ option.count }}票</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 投票信息 - 改进卡片设计 -->
          <view class="card-info">
            <view class="info-item">
              <text class="info-icon">📅</text>
              <text class="info-text">{{ item.startDate }} 至 {{ item.endDate }}</text>
            </view>
            <view class="info-item">
              <text class="info-icon">👥</text>
              <text class="info-text">已参与：{{ item.participantCount }}人</text>
            </view>
          </view>

          <!-- 投票按钮 - 优化样式和状态 -->
          <view class="card-actions">
            <template v-if="!item.hasVoted && item.status === 'active'">
              <elderly-button
                type="primary"
                size="large"
                :block="true"
                :disabled="!hasSelection(item)"
                :loading="item.voting"
                @click="handleVote(item)"
                class="vote-submit-btn"
                :class="{ 'vote-submit-btn--disabled': !hasSelection(item) }"
              >
                <text class="btn-icon">🗳️</text>
                <text class="btn-text">提交投票</text>
              </elderly-button>
            </template>
            <template v-else-if="item.hasVoted">
              <view class="voted-tip">
                <text class="voted-icon">✓</text>
                <text class="voted-text">您已参与投票</text>
              </view>
            </template>
            <template v-else-if="item.status === 'ended'">
              <view class="ended-tip">
                <text class="ended-icon">⏰</text>
                <text class="ended-text">投票已结束</text>
              </view>
            </template>
            <template v-else>
              <view class="pending-tip">
                <text class="pending-icon">⏳</text>
                <text class="pending-text">投票尚未开始</text>
              </view>
            </template>
          </view>

          <!-- 查看详情 - 优化交互 -->
          <view class="card-footer" @click="handleViewDetail(item)" :active-class="'card-footer--active'">
            <text class="footer-text">查看详情</text>
            <text class="footer-icon">→</text>
          </view>
        </view>
      </view>

      <!-- 空状态 - 优化设计 -->
      <view v-if="voteList.length === 0" class="empty-state">
        <view class="empty-icon-wrapper">
          <text class="empty-icon">🗳️</text>
        </view>
        <text class="empty-title">暂无投票</text>
        <text class="empty-desc">当前没有进行中的投票活动</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import { useNetworkStore } from '@/store/network'
import ElderlyButton from '@/components/elderly/ElderlyButton.vue'

/**
 * 在线投票页面
 * 优化版本：增强UI/UX、适老化设计、流畅交互
 */

const elderlyStore = useElderlyStore()
const networkStore = useNetworkStore()

// 投票列表
const voteList = ref([
  {
    id: 1,
    title: '关于村内基础设施建设的意见征集',
    description: '为改善村民生活环境，村委会计划对村内基础设施进行升级改造，现向广大村民征求意见建议。',
    type: 'multiple',
    status: 'active',
    statusText: '进行中',
    priority: 'high',
    startDate: '2024-12-20',
    endDate: '2024-12-31',
    participantCount: 156,
    hasVoted: false,
    voting: false,
    selectedOptions: [],
    options: [
      { text: '道路硬化及拓宽', count: 89, percent: 57 },
      { text: '路灯安装', count: 67, percent: 43 },
      { text: '排水系统改造', count: 72, percent: 46 },
      { text: '文化活动广场建设', count: 95, percent: 61 },
      { text: '健身器材安装', count: 58, percent: 37 }
    ]
  },
  {
    id: 2,
    title: '村规民约修订意见征集',
    description: '为进一步完善村规民约，促进乡村治理规范化，现公开征求修订意见。',
    type: 'single',
    status: 'active',
    statusText: '进行中',
    priority: 'normal',
    startDate: '2024-12-15',
    endDate: '2024-12-30',
    participantCount: 203,
    hasVoted: false,
    voting: false,
    selectedOptions: [],
    options: [
      { text: '同意修订方案', count: 145, percent: 71 },
      { text: '部分修改', count: 42, percent: 21 },
      { text: '暂不修订', count: 16, percent: 8 }
    ]
  },
  {
    id: 3,
    title: '2025年度村集体经济发展方向投票',
    description: '经村委会议研究，拟定了以下村集体经济发展方向，请村民投票选择。',
    type: 'single',
    status: 'ended',
    statusText: '已结束',
    priority: 'normal',
    startDate: '2024-12-01',
    endDate: '2024-12-15',
    participantCount: 312,
    hasVoted: true,
    voting: false,
    selectedOptions: [0],
    options: [
      { text: '发展特色种植', count: 128, percent: 41 },
      { text: '发展乡村旅游', count: 95, percent: 30 },
      { text: '发展农产品加工', count: 89, percent: 29 }
    ]
  }
])

// 获取状态图标
const getStatusIcon = (status) => {
  const icons = {
    active: '🟢',
    ended: '🔴',
    pending: '🟡'
  }
  return icons[status] || '⚪'
}

// 返回
const handleBack = () => {
  elderlyStore.vibrate('short')
  uni.navigateBack()
}

// 查看历史
const handleHistory = () => {
  elderlyStore.vibrate('short')
  uni.showToast({
    title: '查看投票历史',
    icon: 'none'
  })
}

// 判断选项是否被选中
const isOptionSelected = (vote, index) => {
  return vote.selectedOptions.includes(index)
}

// 判断是否有选择
const hasSelection = (vote) => {
  return vote.selectedOptions.length > 0
}

// 选项点击 - 增强触觉反馈
const handleOptionClick = (vote, index) => {
  if (vote.hasVoted || vote.status !== 'active') {
    elderlyStore.vibrate('warning')
    uni.showToast({
      title: vote.hasVoted ? '您已投票' : '投票未开始',
      icon: 'none',
      duration: 1500
    })
    return
  }

  elderlyStore.vibrate('light')

  if (vote.type === 'single') {
    // 单选：只能选一个
    vote.selectedOptions = [index]
  } else {
    // 多选：可以选多个
    const selectedIndex = vote.selectedOptions.indexOf(index)
    if (selectedIndex > -1) {
      vote.selectedOptions.splice(selectedIndex, 1)
      elderlyStore.vibrate('short') // 取消选择时的震动
    } else {
      vote.selectedOptions.push(index)
    }
  }
}

// 提交投票 - 优化确认流程
const handleVote = async (vote) => {
  if (!hasSelection(vote)) {
    elderlyStore.vibrate('warning')
    uni.showToast({
      title: '请选择选项',
      icon: 'none',
      duration: 2000
    })
    return
  }

  // 优化的确认对话框
  const selectedText = vote.selectedOptions
    .map(idx => vote.options[idx].text)
    .join('、')

  const confirm = await new Promise((resolve) => {
    uni.showModal({
      title: '确认投票',
      content: `您选择了：\n${selectedText}\n\n确定要提交吗？提交后不可修改`,
      confirmText: '确认提交',
      cancelText: '再想想',
      success: (res) => resolve(res.confirm)
    })
  })

  if (!confirm) {
    elderlyStore.vibrate('short')
    return
  }

  vote.voting = true

  try {
    // 如果离线，添加到同步队列
    if (!networkStore.isOnline) {
      networkStore.addToOfflineQueue({
        type: 'vote_submit',
        data: {
          voteId: vote.id,
          options: vote.selectedOptions
        }
      })

      // 模拟提交成功
      await new Promise(resolve => setTimeout(resolve, 1500))
    } else {
      // 在线提交
      // await api.village.vote.submit(vote.id, vote.selectedOptions)
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    // 更新状态
    vote.hasVoted = true
    vote.participantCount += 1

    // 更新选项投票数（模拟）
    vote.selectedOptions.forEach(index => {
      vote.options[index].count += 1
    })

    // 重新计算百分比
    const total = vote.options.reduce((sum, opt) => sum + opt.count, 0)
    vote.options.forEach(opt => {
      opt.percent = Math.round((opt.count / total) * 100)
    })

    // 成功反馈
    elderlyStore.vibrate('success')
    uni.showToast({
      title: '投票成功',
      icon: 'success',
      duration: 2000
    })

    // 语音播报（适老化模式）
    if (elderlyStore.isElderlyMode) {
      setTimeout(() => {
        elderlyStore.speak('投票成功，感谢您的参与')
      }, 500)
    }

  } catch (error) {
    console.error('投票失败:', error)
    elderlyStore.vibrate('error')
    uni.showToast({
      title: '投票失败，请重试',
      icon: 'none',
      duration: 2000
    })
  } finally {
    vote.voting = false
  }
}

// 查看详情
const handleViewDetail = (vote) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/village/vote/detail?id=${vote.id}`
  })
}

// 页面加载
onMounted(() => {
  console.log('投票页面加载')
  // 适老化模式下自动语音提示
  if (elderlyStore.isElderlyMode) {
    setTimeout(() => {
      const activeVotes = voteList.value.filter(v => v.status === 'active' && !v.hasVoted).length
      if (activeVotes > 0) {
        elderlyStore.speak(`您有${activeVotes}个投票可以参与`)
      }
    }, 1000)
  }
})
</script>

<style lang="scss" scoped>
/* ========== 基础样式 ========== */
.vote-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #F7FAFC 0%, #EDF2F7 100%);
}

/* ========== 优化的导航栏 ========== */
.custom-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04),
              0 1rpx 3rpx rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(10rpx);
  border-bottom: 1rpx solid rgba(226, 232, 240, 0.8);

  .navbar-back,
  .navbar-icon {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;

    &:active,
    &--active {
      background-color: rgba(47, 133, 90, 0.1);
      transform: scale(0.95);
    }
  }

  .icon {
    font-size: 40rpx;
    color: #1A202C;
  }

  .navbar-title {
    flex: 1;
    text-align: center;
    font-size: 36rpx;
    font-weight: 700;
    background: linear-gradient(135deg, #1A202C 0%, #2D3748 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

/* ========== 页面内容区域 ========== */
.page-content {
  height: calc(100vh - 88rpx);
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* ========== 投票列表 ========== */
.vote-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;

  .vote-card {
    position: relative;
    padding: 32rpx;
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06),
                0 2rpx 8rpx rgba(0, 0, 0, 0.04);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1rpx solid rgba(226, 232, 240, 0.6);
    overflow: hidden;

    &:active {
      transform: translateY(-2rpx);
      box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08),
                  0 4rpx 12rpx rgba(0, 0, 0, 0.06);
    }

    /* 适老化模式下的卡片 */
    &--elderly {
      padding: 40rpx;
      border-radius: 28rpx;
      box-shadow: 0 6rpx 28rpx rgba(0, 0, 0, 0.08),
                  0 3rpx 10rpx rgba(0, 0, 0, 0.06);
    }

    /* 状态样式 */
    &--active {
      border-left: 6rpx solid #48BB78;
    }

    &--ended {
      opacity: 0.8;
      border-left: 6rpx solid #A0AEC0;
    }

    &--pending {
      border-left: 6rpx solid #ECC94B;
    }
  }

  /* ========== 卡片头部 ========== */
  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20rpx;
    gap: 16rpx;
  }

  .header-left {
    flex: 1;
    display: flex;
    align-items: flex-start;
    gap: 12rpx;
  }

  .card-title {
    flex: 1;
    font-size: 36rpx;
    font-weight: 700;
    color: #1A202C;
    line-height: 1.5;
    letter-spacing: -0.5rpx;
  }

  /* 优化的状态标签 */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6rpx;
    padding: 8rpx 16rpx;
    border-radius: 12rpx;
    font-size: 24rpx;
    white-space: nowrap;
    font-weight: 600;
    transition: all 0.3s ease;

    .status-icon {
      font-size: 28rpx;
    }

    .status-text {
      font-size: 24rpx;
    }

    &.status-active {
      background: linear-gradient(135deg, rgba(72, 187, 120, 0.15) 0%, rgba(56, 161, 105, 0.1) 100%);
      color: #38A169;
      border: 1rpx solid rgba(72, 187, 120, 0.3);
    }

    &.status-ended {
      background: linear-gradient(135deg, rgba(160, 174, 192, 0.15) 0%, rgba(148, 163, 184, 0.1) 100%);
      color: #718096;
      border: 1rpx solid rgba(160, 174, 192, 0.3);
    }

    &.status-pending {
      background: linear-gradient(135deg, rgba(236, 201, 75, 0.15) 0%, rgba(237, 137, 54, 0.1) 100%);
      color: #D69E2E;
      border: 1rpx solid rgba(236, 201, 75, 0.3);
    }
  }

  /* 重要标签 */
  .priority-badge {
    padding: 6rpx 12rpx;
    background: linear-gradient(135deg, rgba(245, 101, 101, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%);
    border-radius: 8rpx;
    border: 1rpx solid rgba(245, 101, 101, 0.3);

    .priority-text {
      font-size: 22rpx;
      color: #EF4444;
      font-weight: 600;
    }
  }

  /* ========== 卡片描述 ========== */
  .card-desc {
    font-size: 28rpx;
    color: #4A5568;
    line-height: 1.6;
    margin-bottom: 28rpx;
    padding: 16rpx;
    background: rgba(247, 250, 252, 0.6);
    border-radius: 12rpx;
    border-left: 4rpx solid rgba(47, 133, 90, 0.3);
  }

  /* ========== 投票选项 ========== */
  .card-options {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-bottom: 28rpx;
  }

  .option-item {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    padding: 24rpx;
    background: linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%);
    border-radius: 16rpx;
    border: 2rpx solid transparent;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;

    /* 选中状态 */
    &--selected {
      background: linear-gradient(135deg, rgba(47, 133, 90, 0.08) 0%, rgba(47, 133, 90, 0.04) 100%);
      border-color: #48BB78;
      box-shadow: 0 4rpx 12rpx rgba(72, 187, 120, 0.15);
    }

    /* 已投票状态 */
    &--voted {
      pointer-events: none;
      opacity: 0.9;
    }

    /* 触摸状态 */
    &:active:not(.option-item--voted) {
      transform: scale(0.98);
      background: linear-gradient(135deg, rgba(47, 133, 90, 0.12) 0%, rgba(47, 133, 90, 0.06) 100%);
    }

    /* 适老化模式 */
    &--elderly {
      padding: 32rpx;
      gap: 20rpx;
      border-radius: 20rpx;
      min-height: 120rpx;
    }
  }

  .option-check {
    flex-shrink: 0;
    padding-top: 2rpx;

    .check-radio,
    .check-checkbox {
      font-size: 48rpx;
      color: #718096;
      transition: all 0.3s ease;
    }

    .check-radio {
      &::before {
        content: '';
        display: inline-block;
        width: 40rpx;
        height: 40rpx;
        border: 3rpx solid #CBD5E0;
        border-radius: 50%;
        transition: all 0.3s ease;
      }
    }

    .option-item--selected & .check-radio {
      color: #48BB78;

      &::before {
        border-color: #48BB78;
        background: #48BB78;
        box-shadow: 0 0 0 6rpx rgba(72, 187, 120, 0.2);
      }
    }

    .check-checkbox {
      &::before {
        content: '';
        display: inline-block;
        width: 40rpx;
        height: 40rpx;
        border: 3rpx solid #CBD5E0;
        border-radius: 8rpx;
        transition: all 0.3s ease;
      }
    }

    .option-item--selected & .check-checkbox {
      color: #48BB78;

      &::before {
        border-color: #48BB78;
        background: #48BB78;
        box-shadow: 0 0 0 6rpx rgba(72, 187, 120, 0.2);
      }
    }
  }

  .option-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }

  .option-text {
    font-size: 32rpx;
    color: #1A202C;
    line-height: 1.5;
    font-weight: 500;
  }

  /* ========== 进度条 ========== */
  .option-progress {
    display: flex;
    flex-direction: column;
    gap: 10rpx;
  }

  .progress-bar {
    width: 100%;
    height: 20rpx;
    background: #E2E8F0;
    border-radius: 10rpx;
    overflow: hidden;
    box-shadow: inset 0 2rpx 4rpx rgba(0, 0, 0, 0.06);
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #48BB78 0%, #38A169 50%, #48BB78 100%);
    background-size: 200% 100%;
    border-radius: 10rpx;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    /* 光泽效果 */
    .progress-shine {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.4) 50%,
        transparent 100%);
      animation: shimmer 2s infinite;
    }
  }

  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }

  .option-stats {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  .option-percent {
    font-size: 28rpx;
    font-weight: 700;
    color: #48BB78;
    min-width: 80rpx;
  }

  .option-count {
    font-size: 24rpx;
    color: #718096;
    font-weight: 500;
  }

  /* ========== 卡片信息 ========== */
  .card-info {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
    padding: 20rpx;
    background: rgba(247, 250, 252, 0.6);
    border-radius: 12rpx;
    border: 1rpx solid rgba(226, 232, 240, 0.6);
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 24rpx;
    color: #4A5568;
  }

  .info-icon {
    font-size: 28rpx;
  }

  .info-text {
    font-size: 24rpx;
    color: #718096;
  }

  /* ========== 卡片操作区 ========== */
  .card-actions {
    padding: 20rpx 0;
  }

  .vote-submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;

    &--disabled {
      opacity: 0.6;
    }

    .btn-icon {
      font-size: 36rpx;
    }

    .btn-text {
      font-size: 32rpx;
      font-weight: 600;
    }
  }

  /* 状态提示 */
  .voted-tip,
  .ended-tip,
  .pending-tip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    padding: 24rpx;
    border-radius: 16rpx;
    text-align: center;
  }

  .voted-tip {
    background: linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(56, 161, 105, 0.05) 100%);
    border: 1rpx solid rgba(72, 187, 120, 0.3);

    .voted-icon {
      font-size: 48rpx;
    }

    .voted-text {
      font-size: 32rpx;
      color: #48BB78;
      font-weight: 600;
    }
  }

  .ended-tip {
    background: linear-gradient(135deg, rgba(160, 174, 192, 0.1) 0%, rgba(148, 163, 184, 0.05) 100%);
    border: 1rpx solid rgba(160, 174, 192, 0.3);

    .ended-icon {
      font-size: 48rpx;
    }

    .ended-text {
      font-size: 32rpx;
      color: #718096;
      font-weight: 600;
    }
  }

  .pending-tip {
    background: linear-gradient(135deg, rgba(236, 201, 75, 0.1) 0%, rgba(237, 137, 54, 0.05) 100%);
    border: 1rpx solid rgba(236, 201, 75, 0.3);

    .pending-icon {
      font-size: 48rpx;
    }

    .pending-text {
      font-size: 32rpx;
      color: #D69E2E;
      font-weight: 600;
    }
  }

  /* ========== 卡片底部 ========== */
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    padding: 20rpx;
    margin-top: 8rpx;
    border-top: 1rpx solid rgba(226, 232, 240, 0.6);
    transition: all 0.3s ease;
    cursor: pointer;

    &:active,
    &--active {
      background-color: rgba(47, 133, 90, 0.05);
      transform: scale(0.98);
    }
  }

  .footer-text {
    font-size: 28rpx;
    color: #48BB78;
    font-weight: 600;
  }

  .footer-icon {
    font-size: 28rpx;
    color: #48BB78;
    transition: transform 0.3s ease;

    .card-footer:active & {
      transform: translateX(4rpx);
    }
  }
}

/* ========== 空状态 ========== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
  gap: 32rpx;
}

.empty-icon-wrapper {
  width: 200rpx;
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(226, 232, 240, 0.5) 0%, rgba(203, 213, 225, 0.3) 100%);
  border-radius: 50%;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10rpx); }
}

.empty-icon {
  font-size: 120rpx;
  opacity: 0.6;
}

.empty-title {
  font-size: 36rpx;
  color: #4A5568;
  font-weight: 600;
}

.empty-desc {
  font-size: 28rpx;
  color: #718096;
  text-align: center;
  max-width: 400rpx;
}

/* ========== 适老化模式 ========== */
:global(.elderly-mode-large) {
  .vote-page {
    background: linear-gradient(180deg, #FFFFFF 0%, #F7FAFC 100%);
  }

  .option-text {
    font-size: 40rpx;
  }

  .card-title {
    font-size: 42rpx;
  }

  .card-desc {
    font-size: 32rpx;
  }

  .status-badge,
  .priority-badge {
    padding: 12rpx 20rpx;
    border-radius: 16rpx;

    .status-text,
    .priority-text {
      font-size: 28rpx;
    }
  }
}

:global(.elderly-mode-xl) {
  .vote-page {
    background: linear-gradient(180deg, #FFFFFF 0%, #F0FFF4 100%);
  }

  .option-text {
    font-size: 48rpx;
    line-height: 1.6;
  }

  .card-title {
    font-size: 48rpx;
  }

  .card-desc {
    font-size: 36rpx;
    line-height: 1.8;
  }

  .status-badge,
  .priority-badge {
    padding: 16rpx 24rpx;
    border-radius: 20rpx;

    .status-text,
    .priority-text {
      font-size: 32rpx;
    }
  }

  .voted-tip,
  .ended-tip,
  .pending-tip {
    padding: 32rpx;

    .voted-text,
    .ended-text,
    .pending-text {
      font-size: 36rpx;
    }
  }
}

/* ========== 深色模式适配 ========== */
@media (prefers-color-scheme: dark) {
  .vote-page {
    background: linear-gradient(180deg, #1A202C 0%, #2D3748 100%);
  }

  .custom-navbar {
    background: linear-gradient(135deg, #2D3748 0%, #1A202C 100%);
    border-bottom: 1rpx solid rgba(74, 85, 104, 0.5);
  }

  .navbar-title {
    background: linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .vote-list {
    .vote-card {
      background: linear-gradient(135deg, #2D3748 0%, #1A202C 100%);
      border-color: rgba(74, 85, 104, 0.5);
    }

    .card-title {
      color: #F7FAFC;
    }

    .card-desc {
      color: #CBD5E0;
      background: rgba(26, 32, 44, 0.4);
      border-left-color: rgba(72, 187, 120, 0.5);
    }

    .option-item {
      background: linear-gradient(135deg, #374151 0%, #2D3748 100%);

      &--selected {
        background: linear-gradient(135deg, rgba(72, 187, 120, 0.15) 0%, rgba(72, 187, 120, 0.08) 100%);
      }

      &:active:not(.option-item--voted) {
        background: linear-gradient(135deg, rgba(72, 187, 120, 0.2) 0%, rgba(72, 187, 120, 0.12) 100%);
      }
    }

    .option-text {
      color: #F7FAFC;
    }

    .card-info {
      background: rgba(26, 32, 44, 0.4);
      border-color: rgba(74, 85, 104, 0.5);
    }

    .info-text {
      color: #CBD5E0;
    }
  }

  .footer-text {
    color: #68D391;
  }

  .footer-icon {
    color: #68D391;
  }
}

/* ========== 响应式断点 ========== */
@media screen and (min-width: 768rpx) {
  .vote-list {
    max-width: 1200rpx;
    margin: 0 auto;
  }
}
</style>