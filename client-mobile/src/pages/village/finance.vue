<template>
  <view class="finance-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-back" @click="handleBack">
        <text class="icon">←</text>
      </view>
      <view class="navbar-title">财务公示</view>
      <view class="navbar-filter" @click="handleFilter">
        <text class="icon">📅</text>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item">
        <text class="filter-label">年份</text>
        <view class="filter-value" @click="handleYearSelect">
          <text>{{ selectedYear }}年</text>
          <text class="arrow">▼</text>
        </view>
      </view>
      <view class="filter-item">
        <text class="filter-label">月份</text>
        <view class="filter-value" @click="handleMonthSelect">
          <text>{{ selectedMonth || '全部' }}</text>
          <text class="arrow">▼</text>
        </view>
      </view>
      <view class="filter-item">
        <text class="filter-label">类型</text>
        <view class="filter-value" @click="handleTypeSelect">
          <text>{{ selectedTypeLabel }}</text>
          <text class="arrow">▼</text>
        </view>
      </view>
    </view>

    <!-- 财务概览 -->
    <view class="finance-overview">
      <view class="overview-card income">
        <text class="overview-icon">💰</text>
        <view class="overview-content">
          <text class="overview-label">总收入</text>
          <text class="overview-value">¥{{ overview.income.toLocaleString() }}</text>
        </view>
      </view>
      <view class="overview-card expense">
        <text class="overview-icon">💸</text>
        <view class="overview-content">
          <text class="overview-label">总支出</text>
          <text class="overview-value">¥{{ overview.expense.toLocaleString() }}</text>
        </view>
      </view>
      <view class="overview-card balance">
        <text class="overview-icon">📊</text>
        <view class="overview-content">
          <text class="overview-label">结余</text>
          <text class="overview-value">¥{{ overview.balance.toLocaleString() }}</text>
        </view>
      </view>
    </view>

    <!-- 财务明细 -->
    <scroll-view class="page-content" scroll-y @scrolltolower="handleLoadMore">
      <view class="section-title">财务明细</view>

      <view class="finance-list">
        <view
          v-for="item in financeList"
          :key="item.id"
          :class="['finance-item', `finance-item--${item.type}`]"
          @click="handleItemClick(item)"
        >
          <!-- 左侧图标和金额 -->
          <view class="item-left">
            <view class="item-icon">{{ item.icon }}</view>
            <view class="item-amount" :class="`amount--${item.type}`">
              <text class="amount-symbol">{{ item.type === 'income' ? '+' : '-' }}</text>
              <text>¥{{ item.amount.toLocaleString() }}</text>
            </view>
          </view>

          <!-- 右侧信息 -->
          <view class="item-right">
            <view class="item-title">{{ item.title }}</view>
            <view class="item-category">{{ item.category }}</view>
            <view class="item-meta">
              <text class="meta-item">📅 {{ item.date }}</text>
              <text class="meta-item" v-if="item.approver">✍️ {{ item.approver }}</text>
            </view>
          </view>

          <!-- 详情箭头 -->
          <view class="item-arrow">→</view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view class="load-more">
        <uni-load-more :status="loadStatus" />
      </view>

      <!-- 空状态 -->
      <view v-if="financeList.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无财务记录</text>
      </view>
    </scroll-view>

    <!-- 下载报表 -->
    <view class="download-bar">
      <elderly-button type="primary" size="large" :block="true" @click="handleDownload">
        📥 下载财务报表
      </elderly-button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import ElderlyButton from '@/components/elderly/ElderlyButton.vue'

/**
 * 财务公示页面
 */

const elderlyStore = useElderlyStore()

// 筛选条件
const selectedYear = ref(2024)
const selectedMonth = ref('')
const selectedType = ref('')

// 年份选项
const yearOptions = [2024, 2023, 2022]

// 月份选项
const monthOptions = ['全部', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

// 类型选项
const typeOptions = [
  { label: '全部', value: '' },
  { label: '收入', value: 'income' },
  { label: '支出', value: 'expense' }
]

// 选中的类型标签
const selectedTypeLabel = computed(() => {
  return typeOptions.find(t => t.value === selectedType.value)?.label || '全部'
})

// 财务概览
const overview = ref({
  income: 1256800,
  expense: 983500,
  balance: 273300
})

// 财务列表
const financeList = ref([
  {
    id: 1,
    type: 'income',
    icon: '💰',
    title: '村集体土地流转收入',
    category: '土地流转',
    amount: 568000,
    date: '2024-12-15',
    approver: '张书记'
  },
  {
    id: 2,
    type: 'expense',
    icon: '🏗️',
    title: '村内道路维修工程款',
    category: '基础设施',
    amount: 128000,
    date: '2024-12-10',
    approver: '李主任'
  },
  {
    id: 3,
    type: 'expense',
    icon: '💡',
    title: '村部电费',
    category: '办公费用',
    amount: 860,
    date: '2024-12-05',
    approver: '王会计'
  },
  {
    id: 4,
    type: 'income',
    icon: '🌾',
    title: '特色种植项目补贴',
    category: '项目补贴',
    amount: 200000,
    date: '2024-12-01',
    approver: '张书记'
  },
  {
    id: 5,
    type: 'expense',
    icon: '🎉',
    title: '重阳节活动经费',
    category: '文体活动',
    amount: 15000,
    date: '2024-11-20',
    approver: '李主任'
  },
  {
    id: 6,
    type: 'expense',
    icon: '🖨️',
    title: '宣传资料印刷费',
    category: '宣传费用',
    amount: 3200,
    date: '2024-11-15',
    approver: '王会计'
  },
  {
    id: 7,
    type: 'income',
    icon: '🏢',
    title: '厂房租金收入',
    category: '资产租赁',
    amount: 480000,
    date: '2024-11-01',
    approver: '张书记'
  },
  {
    id: 8,
    type: 'expense',
    icon: '💻',
    title: '信息化系统维护费',
    category: '技术服务',
    amount: 5000,
    date: '2024-10-25',
    approver: '李主任'
  }
])

// 加载状态
const loading = ref(false)
const loadStatus = ref('more')

// 返回
const handleBack = () => {
  elderlyStore.vibrate('short')
  uni.navigateBack()
}

// 筛选
const handleFilter = () => {
  elderlyStore.vibrate('short')
  // 打开筛选面板
  uni.showActionSheet({
    itemList: ['本月', '近三个月', '近半年', '全年'],
    success: (res) => {
      console.log('选择筛选:', res.tapIndex)
    }
  })
}

// 选择年份
const handleYearSelect = () => {
  elderlyStore.vibrate('short')
  const items = yearOptions.map(y => `${y}年`)
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      selectedYear.value = yearOptions[res.tapIndex]
    }
  })
}

// 选择月份
const handleMonthSelect = () => {
  elderlyStore.vibrate('short')
  uni.showActionSheet({
    itemList: monthOptions,
    success: (res) => {
      selectedMonth.value = res.tapIndex === 0 ? '' : monthOptions[res.tapIndex]
    }
  })
}

// 选择类型
const handleTypeSelect = () => {
  elderlyStore.vibrate('short')
  uni.showActionSheet({
    itemList: typeOptions.map(t => t.label),
    success: (res) => {
      selectedType.value = typeOptions[res.tapIndex].value
    }
  })
}

// 财务项点击
const handleItemClick = (item) => {
  elderlyStore.vibrate('short')
  uni.showModal({
    title: item.title,
    content: `金额：¥${item.amount.toLocaleString()}\n类别：${item.category}\n日期：${item.date}\n审批人：${item.approver}`,
    showCancel: false
  })
}

// 加载更多
const handleLoadMore = () => {
  if (loadStatus.value === 'loading' || loadStatus.value === 'noMore') return

  loadStatus.value = 'loading'

  // 模拟加载
  setTimeout(() => {
    loadStatus.value = 'noMore'
  }, 1000)
}

// 下载报表
const handleDownload = () => {
  elderlyStore.vibrate('long')

  uni.showActionSheet({
    itemList: ['下载Excel报表', '下载PDF报表'],
    success: (res) => {
      const format = res.tapIndex === 0 ? 'Excel' : 'PDF'
      uni.showLoading({
        title: '正在生成...'
      })

      // 模拟下载
      setTimeout(() => {
        uni.hideLoading()
        uni.showToast({
          title: `${format}报表已生成`,
          icon: 'success'
        })
      }, 2000)
    }
  })
}

// 页面加载
onMounted(() => {
  console.log('财务公示页面加载')
})
</script>

<style lang="scss" scoped>
.finance-page {
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
  .navbar-filter {
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

.filter-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  background-color: #FFFFFF;
  border-bottom: 1rpx solid var(--color-border-primary, #E2E8F0);
  overflow-x: auto;
  white-space: nowrap;

  &::-webkit-scrollbar {
    display: none;
  }

  .filter-item {
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 20rpx;
    background-color: var(--color-bg-card, #F7FAFC);
    border-radius: 24rpx;
  }

  .filter-label {
    font-size: 24rpx;
    color: var(--color-text-tertiary, #718096);
  }

  .filter-value {
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: 28rpx;
    color: var(--color-text-primary, #1A202C);
  }

  .arrow {
    font-size: 20rpx;
    color: var(--color-text-tertiary, #718096);
  }
}

.finance-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  padding: 32rpx;
}

.overview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 16rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);

  .overview-icon {
    font-size: 48rpx;
  }

  .overview-label {
    font-size: 24rpx;
    color: var(--color-text-tertiary, #718096);
  }

  .overview-value {
    font-size: 32rpx;
    font-weight: 700;
  }

  &.income .overview-value {
    color: #48BB78;
  }

  &.expense .overview-value {
    color: #F56565;
  }

  &.balance .overview-value {
    color: #4299E1;
  }
}

.page-content {
  height: calc(100vh - 88rpx - 120rpx - 120rpx);
  padding: 0 32rpx 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--color-text-primary, #1A202C);
  margin-bottom: 16rpx;
}

.finance-list {
  .finance-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    background-color: #FFFFFF;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

    &:active {
      background-color: var(--color-bg-hover, #EDF2F7);
    }
  }

  .item-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    flex-shrink: 0;
  }

  .item-icon {
    font-size: 56rpx;
  }

  .item-amount {
    font-size: 28rpx;
    font-weight: 700;

    &.amount--income {
      color: #48BB78;
    }

    &.amount--expense {
      color: #F56565;
    }
  }

  .item-right {
    flex: 1;
    min-width: 0;
  }

  .item-title {
    font-size: 32rpx;
    font-weight: 600;
    color: var(--color-text-primary, #1A202C);
    margin-bottom: 8rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-category {
    font-size: 24rpx;
    color: var(--color-text-tertiary, #718096);
    margin-bottom: 8rpx;
  }

  .item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }

  .meta-item {
    font-size: 24rpx;
    color: var(--color-text-tertiary, #718096);
  }

  .item-arrow {
    font-size: 32rpx;
    color: var(--color-text-tertiary, #718096);
    flex-shrink: 0;
  }
}

.load-more {
  padding: 32rpx 0;
}

.download-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom, 0));
  background-color: #FFFFFF;
  border-top: 1rpx solid var(--color-border-primary, #E2E8F0);
  z-index: 100;
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
  .finance-overview {
    grid-template-columns: 1fr;
    gap: 16rpx;
  }

  .overview-card {
    flex-direction: row;
    justify-content: flex-start;
    padding: 24rpx 32rpx;
  }

  .overview-value {
    font-size: 36rpx;
  }
}

:global(.elderly-mode-xl) {
  .finance-overview {
    grid-template-columns: 1fr;
  }

  .overview-value {
    font-size: 44rpx;
  }

  .item-title {
    font-size: 40rpx;
  }
}
</style>