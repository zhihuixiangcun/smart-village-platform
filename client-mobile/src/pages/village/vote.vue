<template>
  <view class="vote-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-back" @click="handleBack">
        <text class="icon">←</text>
      </view>
      <view class="navbar-title">在线投票</view>
      <view class="navbar-icon" @click="handleHistory">
        <text class="icon">📋</text>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 投票卡片 -->
      <view class="vote-list">
        <view
          v-for="item in voteList"
          :key="item.id"
          :class="['vote-card', `vote-card--${item.status}`]"
        >
          <!-- 投票头部 -->
          <view class="card-header">
            <view class="header-left">
              <text class="card-title">{{ item.title }}</text>
              <view :class="['status-badge', `status-${item.status}`]">
                {{ item.statusText }}
              </view>
            </view>
          </view>

          <!-- 投票描述 -->
          <view class="card-desc">{{ item.description }}</view>

          <!-- 投票选项 -->
          <view class="card-options">
            <view
              v-for="(option, index) in item.options"
              :key="index"
              :class="[
                'option-item',
                {
                  'option-item--selected': isOptionSelected(item, index),
                  'option-item--voted': item.hasVoted,
                  'option-item--multiple': item.type === 'multiple'
                }
              ]"
              @click="handleOptionClick(item, index)"
            >
              <!-- 选择框 -->
              <view class="option-check">
                <text v-if="item.type === 'single'">
                  {{ isOptionSelected(item, index) ? '🔘' : '⚪' }}
                </text>
                <text v-else>
                  {{ isOptionSelected(item, index) ? '☑️' : '☐' }}
                </text>
              </view>

              <!-- 选项内容 -->
              <view class="option-content">
                <text class="option-text">{{ option.text }}</text>

                <!-- 已投票显示进度 -->
                <view v-if="item.hasVoted" class="option-progress">
                  <view class="progress-bar">
                    <view
                      class="progress-fill"
                      :style="{ width: option.percent + '%' }"
                    />
                  </view>
                  <text class="option-percent">{{ option.percent }}%</text>
                </view>

                <!-- 投票数 -->
                <text v-if="item.hasVoted" class="option-count">
                  {{ option.count }}票
                </text>
              </view>
            </view>
          </view>

          <!-- 投票信息 -->
          <view class="card-info">
            <text class="info-item">📅 {{ item.startDate }} 至 {{ item.endDate }}</text>
            <text class="info-item">👥 已参与：{{ item.participantCount }}人</text>
          </view>

          <!-- 投票按钮 -->
          <view class="card-actions">
            <template v-if="!item.hasVoted && item.status === 'active'">
              <elderly-button
                type="primary"
                size="large"
                :block="true"
                :disabled="!hasSelection(item)"
                :loading="item.voting"
                @click="handleVote(item)"
              >
                提交投票
              </elderly-button>
            </template>
            <template v-else-if="item.hasVoted">
              <view class="voted-tip">✅ 您已参与投票</view>
            </template>
            <template v-else-if="item.status === 'ended'">
              <view class="ended-tip">⏰ 投票已结束</view>
            </template>
            <template v-else>
              <view class="pending-tip">⏳ 投票尚未开始</view>
            </template>
          </view>

          <!-- 查看详情 -->
          <view class="card-footer" @click="handleViewDetail(item)">
            <text class="footer-text">查看详情</text>
            <text class="footer-icon">→</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="voteList.length === 0" class="empty-state">
        <text class="empty-icon">🗳️</text>
        <text class="empty-text">暂无投票</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import { useNetworkStore } from '@/store/network'
import ElderlyButton from '@/components/elderly/ElderlyButton.vue'

/**
 * 在线投票页面
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

// 选项点击
const handleOptionClick = (vote, index) => {
  if (vote.hasVoted || vote.status !== 'active') {
    return
  }

  elderlyStore.vibrate('short')

  if (vote.type === 'single') {
    // 单选：只能选一个
    vote.selectedOptions = [index]
  } else {
    // 多选：可以选多个
    const selectedIndex = vote.selectedOptions.indexOf(index)
    if (selectedIndex > -1) {
      vote.selectedOptions.splice(selectedIndex, 1)
    } else {
      vote.selectedOptions.push(index)
    }
  }
}

// 提交投票
const handleVote = async (vote) => {
  if (!hasSelection(vote)) {
    uni.showToast({
      title: '请选择选项',
      icon: 'none'
    })
    return
  }

  // 确认
  const confirm = await new Promise((resolve) => {
    uni.showModal({
      title: '确认投票',
      content: '确定要提交投票吗？提交后不可修改',
      success: (res) => resolve(res.confirm)
    })
  })

  if (!confirm) return

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
      await new Promise(resolve => setTimeout(resolve, 1000))
    } else {
      // 在线提交
      // await api.village.vote.submit(vote.id, vote.selectedOptions)
      await new Promise(resolve => setTimeout(resolve, 1000))
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

    uni.showToast({
      title: '投票成功',
      icon: 'success'
    })

    // 语音播报（适老化模式）
    if (elderlyStore.isElderlyMode) {
      elderlyStore.speak('投票成功')
    }

  } catch (error) {
    console.error('投票失败:', error)
    uni.showToast({
      title: '投票失败，请重试',
      icon: 'none'
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
})
</script>

<style lang="scss" scoped>
.vote-page {
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
}

.page-content {
  height: calc(100vh - 88rpx);
  padding: 32rpx;
}

.vote-list {
  .vote-card {
    padding: 32rpx;
    margin-bottom: 32rpx;
    background-color: #FFFFFF;
    border-radius: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  }

  .card-header {
    margin-bottom: 16rpx;
  }

  .header-left {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16rpx;
  }

  .card-title {
    flex: 1;
    font-size: 36rpx;
    font-weight: 700;
    color: var(--color-text-primary, #1A202C);
    line-height: 1.5;
  }

  .status-badge {
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    font-size: 24rpx;
    white-space: nowrap;

    &.status-active {
      background-color: rgba(72, 187, 120, 0.1);
      color: #48BB78;
    }

    &.status-ended {
      background-color: rgba(74, 85, 104, 0.1);
      color: #4A5568;
    }

    &.status-pending {
      background-color: rgba(236, 201, 75, 0.1);
      color: #ECC94B;
    }
  }

  .card-desc {
    font-size: 28rpx;
    color: var(--color-text-secondary, #4A5568);
    line-height: 1.6;
    margin-bottom: 24rpx;
  }

  .card-options {
    margin-bottom: 24rpx;
  }

  .option-item {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    padding: 20rpx;
    margin-bottom: 16rpx;
    background-color: var(--color-bg-card, #F7FAFC);
    border-radius: 12rpx;
    border: 2rpx solid transparent;
    transition: all 0.3s ease;

    &--selected {
      border-color: var(--color-primary, #2F855A);
      background-color: rgba(47, 133, 90, 0.05);
    }

    &--voted {
      pointer-events: none;
    }

    &:active:not(.option-item--voted) {
      background-color: var(--color-bg-hover, #EDF2F7);
    }
  }

  .option-check {
    font-size: 40rpx;
    flex-shrink: 0;
    padding-top: 4rpx;
  }

  .option-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  .option-text {
    font-size: 32rpx;
    color: var(--color-text-primary, #1A202C);
  }

  .option-progress {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  .progress-bar {
    flex: 1;
    height: 16rpx;
    background-color: var(--color-bg-disabled, #F1F5F9);
    border-radius: 8rpx;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #2F855A 0%, #38A169 100%);
    border-radius: 8rpx;
    transition: width 0.3s ease;
  }

  .option-percent {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--color-primary, #2F855A);
    min-width: 80rpx;
    text-align: right;
  }

  .option-count {
    font-size: 24rpx;
    color: var(--color-text-tertiary, #718096);
  }

  .card-info {
    display: flex;
    flex-wrap: wrap;
    gap: 24rpx;
    padding: 16rpx 0;
    border-top: 1rpx solid var(--color-border-primary, #E2E8F0);
    border-bottom: 1rpx solid var(--color-border-primary, #E2E8F0);
  }

  .info-item {
    font-size: 24rpx;
    color: var(--color-text-tertiary, #718096);
  }

  .card-actions {
    padding: 16rpx 0;
  }

  .voted-tip,
  .ended-tip,
  .pending-tip {
    text-align: center;
    font-size: 32rpx;
    color: var(--color-text-secondary, #4A5568);
    padding: 16rpx;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    padding-top: 16rpx;
  }

  .footer-text {
    font-size: 28rpx;
    color: var(--color-primary, #2F855A);
  }

  .footer-icon {
    font-size: 24rpx;
    color: var(--color-primary, #2F855A);
  }
}

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

// 适老化模式
:global(.elderly-mode-large) {
  .option-text {
    font-size: 36rpx;
  }
}

:global(.elderly-mode-xl) {
  .option-text {
    font-size: 44rpx;
  }
}
</style>