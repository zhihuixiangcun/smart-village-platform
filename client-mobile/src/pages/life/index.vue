<template>
  <view class="life-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-title">生活服务</view>
        <view class="navbar-icon" @click="handleNotification">
          <text class="icon">🔔</text>
          <view v-if="unreadCount > 0" class="badge">{{ unreadCount }}</view>
        </view>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 轮播图 -->
      <view class="banner-swiper">
        <swiper
          :indicator-dots="true"
          :autoplay="true"
          :interval="5000"
          :duration="500"
          indicator-color="rgba(255,255,255,0.5)"
          indicator-active-color="#FFFFFF"
        >
          <swiper-item v-for="(banner, index) in banners" :key="index">
            <view class="banner-item" :style="{ background: banner.gradient }">
              <view class="banner-content">
                <text class="banner-title">{{ banner.title }}</text>
                <text class="banner-desc">{{ banner.desc }}</text>
              </view>
            </view>
          </swiper-item>
        </swiper>
      </view>

      <!-- 服务分类 -->
      <view class="service-categories">
        <view
          v-for="category in categories"
          :key="category.id"
          :class="['category-item', { 'category-item--active': currentCategory === category.id }]"
          @click="handleCategoryChange(category.id)"
        >
          <text class="category-icon">{{ category.icon }}</text>
          <text class="category-name">{{ category.name }}</text>
        </view>
      </view>

      <!-- 乡村电商 -->
      <view v-show="currentCategory === 'ecommerce'" class="section">
        <view class="section-header">
          <text class="section-title">🛒 乡村电商</text>
          <text class="section-more" @click="handleMore('ecommerce')">更多 ></text>
        </view>
        <view class="product-grid">
          <view
            v-for="product in products"
            :key="product.id"
            class="product-item"
            @click="handleProductClick(product)"
          >
            <view class="product-image">{{ product.image }}</view>
            <view class="product-info">
              <view class="product-name">{{ product.name }}</view>
              <view class="product-origin">{{ product.origin }}</view>
              <view class="product-price-row">
                <text class="product-price">¥{{ product.price }}</text>
                <text class="product-sales">{{ product.sales }}已售</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 邻里拼车 -->
      <view v-show="currentCategory === 'carpooling'" class="section">
        <view class="section-header">
          <text class="section-title">🚗 邻里拼车</text>
          <view class="publish-btn" @click="handlePublishCarpool">
            <text>+ 我要拼车</text>
          </view>
        </view>
        <view class="carpool-list">
          <view
            v-for="carpool in carpools"
            :key="carpool.id"
            class="carpool-item"
            @click="handleCarpoolClick(carpool)"
          >
            <view class="carpool-header">
              <view class="route-info">
                <text class="origin">{{ carpool.origin }}</text>
                <text class="arrow">→</text>
                <text class="destination">{{ carpool.destination }}</text>
              </view>
              <view :class="['status-badge', `status-${carpool.status}`]">
                {{ carpool.statusText }}
              </view>
            </view>
            <view class="carpool-info">
              <text class="info-item">📅 {{ carpool.date }}</text>
              <text class="info-item">🕐 {{ carpool.time }}</text>
              <text class="info-item">👥 {{ carpool.seats }}座</text>
              <text class="info-item">💰 ¥{{ carpool.price }}/人</text>
            </view>
            <view class="carpool-user">
              <text class="user-icon">👤</text>
              <text class="user-name">{{ carpool.userName }}</text>
              <text class="publish-time">{{ carpool.publishTime }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 邻里互助 -->
      <view v-show="currentCategory === 'help'" class="section">
        <view class="section-header">
          <text class="section-title">🤝 邻里互助</text>
          <view class="publish-btn" @click="handlePublishHelp">
            <text>+ 我要求助</text>
          </view>
        </view>
        <view class="help-list">
          <view
            v-for="help in helpList"
            :key="help.id"
            class="help-item"
            @click="handleHelpClick(help)"
          >
            <view class="help-icon">{{ help.icon }}</view>
            <view class="help-content">
              <view class="help-title">{{ help.title }}</view>
              <view class="help-desc">{{ help.description }}</view>
              <view class="help-meta">
                <text class="meta-item">📍 {{ help.location }}</text>
                <text class="meta-item">⏰ {{ help.publishTime }}</text>
                <view class="help-reward" v-if="help.reward">
                  <text class="reward-icon">💝</text>
                  <text>{{ help.reward }}</text>
                </view>
              </view>
            </view>
            <view class="help-status">
              <text class="status-text">{{ help.statusText }}</text>
              <text class="response-count">{{ help.responseCount }}人响应</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 农资集采 -->
      <view v-show="currentCategory === 'supply'" class="section">
        <view class="section-header">
          <text class="section-title">🌾 农资集采</text>
          <text class="section-more" @click="handleMore('supply')">更多 ></text>
        </view>
        <view class="supply-list">
          <view
            v-for="supply in supplies"
            :key="supply.id"
            class="supply-item"
            @click="handleSupplyClick(supply)"
          >
            <view class="supply-header">
              <view class="supply-name">{{ supply.name }}</view>
              <view class="supply-tag">集采中</view>
            </view>
            <view class="supply-info">
              <text class="info-item">📦 数量: {{ supply.currentCount }}/{{ supply.targetCount }}</text>
              <text class="info-item">💰 原价: ¥{{ supply.originalPrice }}</text>
              <text class="info-item price-highlight">🎉 集采价: ¥{{ supply.groupPrice }}</text>
            </view>
            <view class="supply-progress">
              <view class="progress-bar">
                <view
                  class="progress-fill"
                  :style="{ width: (supply.currentCount / supply.targetCount * 100) + '%' }"
                />
              </view>
              <text class="progress-text">{{ supply.currentCount }}/{{ supply.targetCount }}</text>
            </view>
            <view class="supply-footer">
              <text class="deadline">⏰ 截止: {{ supply.deadline }}</text>
              <view class="join-btn" @click.stop="handleJoinSupply(supply)">
                <text>参与集采</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部导航 -->
    <TabBar :current="2" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import TabBar from '@/components/common/TabBar.vue'

/**
 * 生活服务首页
 */

const elderlyStore = useElderlyStore()

// 未读数量
const unreadCount = ref(2)

// 当前分类
const currentCategory = ref('ecommerce')

// 分类列表
const categories = [
  { id: 'ecommerce', icon: '🛒', name: '电商' },
  { id: 'carpooling', icon: '🚗', name: '拼车' },
  { id: 'help', icon: '🤝', name: '互助' },
  { id: 'supply', icon: '🌾', name: '集采' }
]

// 轮播图
const banners = [
  {
    title: '农产品直通车',
    desc: '新鲜直达，优惠多多',
    gradient: 'linear-gradient(135deg, #F6E05E 0%, #ECC94B 100%)'
  },
  {
    title: '邻里拼车',
    desc: '绿色出行，共享便利',
    gradient: 'linear-gradient(135deg, #4299E1 0%, #3182CE 100%)'
  },
  {
    title: '农资集采',
    desc: '集体采购，省钱实惠',
    gradient: 'linear-gradient(135deg, #48BB78 0%, #38A169 100%)'
  }
]

// 商品列表
const products = ref([
  { id: 1, image: '🍎', name: '烟台红富士苹果', origin: '山东烟台', price: 29.9, sales: 1234 },
  { id: 2, image: '🍚', name: '东北大米5kg', origin: '黑龙江五常', price: 45, sales: 856 },
  { id: 3, image: '🥬', name: '有机蔬菜礼盒', origin: '本地农场', price: 68, sales: 423 },
  { id: 4, image: '🍯', name: '土蜂蜜500g', origin: '秦岭深山', price: 88, sales: 678 },
  { id: 5, image: '🥚', name: '散养土鸡蛋30枚', origin: '农家散养', price: 35, sales: 2345 },
  { id: 6, image: '🌽', name: '新鲜甜玉米10根', origin: '本地种植', price: 25, sales: 1567 }
])

// 拼车列表
const carpools = ref([
  {
    id: 1,
    origin: '东村',
    destination: '县城',
    date: '2024-12-30',
    time: '08:00',
    seats: 4,
    price: 15,
    status: 'available',
    statusText: '可拼',
    userName: '张大哥',
    publishTime: '2小时前'
  },
  {
    id: 2,
    origin: '西村',
    destination: '市里',
    date: '2024-12-30',
    time: '14:00',
    seats: 3,
    price: 30,
    status: 'full',
    statusText: '已满',
    userName: '李大姐',
    publishTime: '5小时前'
  }
])

// 互助列表
const helpList = ref([
  {
    id: 1,
    icon: '🚜',
    title: '需要拖拉机帮忙耕地',
    description: '家有5亩地需要翻耕，希望能借用或租用拖拉机',
    location: '东村三组',
    publishTime: '1小时前',
    reward: '50元',
    status: 'pending',
    statusText: '进行中',
    responseCount: 2
  },
  {
    id: 2,
    icon: '👶',
    title: '临时照看孩子',
    description: '明天上午需要有人帮忙照看3岁孩子2小时',
    location: '西村二组',
    publishTime: '3小时前',
    reward: '',
    status: 'completed',
    statusText: '已完成',
    responseCount: 5
  }
])

// 集采列表
const supplies = ref([
  {
    id: 1,
    name: '复合肥50kg',
    currentCount: 28,
    targetCount: 50,
    originalPrice: 180,
    groupPrice: 150,
    deadline: '2024-12-31',
    discount: 17
  },
  {
    id: 2,
    name: '玉米种子10kg',
    currentCount: 35,
    targetCount: 100,
    originalPrice: 280,
    groupPrice: 220,
    deadline: '2025-01-15',
    discount: 21
  }
])

// 通知点击
const handleNotification = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: '/pages/profile/notification'
  })
}

// 分类切换
const handleCategoryChange = (id) => {
  elderlyStore.vibrate('short')
  currentCategory.value = id

  // 语音播报
  if (elderlyStore.isElderlyMode) {
    const category = categories.find(c => c.id === id)
    elderlyStore.speak(category.name)
  }
}

// 商品点击
const handleProductClick = (product) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/life/ecommerce/detail?id=${product.id}`
  })
}

// 拼车点击
const handleCarpoolClick = (carpool) => {
  elderlyStore.vibrate('short')
  uni.showModal({
    title: '拼车详情',
    content: `从${carpool.origin}到${carpool.destination}\n时间: ${carpool.date} ${carpool.time}\n座位: ${carpool.seats}座\n价格: ¥${carpool.price}/人\n联系人: ${carpool.userName}`,
    confirmText: '参与拼车',
    cancelText: '联系',
    success: (res) => {
      if (res.confirm) {
        // 参与拼车
        elderlyStore.vibrate('long')
        uni.showToast({
          title: '已申请参与',
          icon: 'success'
        })
      } else {
        // 联系
        uni.makePhoneCall({
          phoneNumber: '13800138000'
        })
      }
    }
  })
}

// 发布拼车
const handlePublishCarpool = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: '/pages/life/carpooling/publish'
  })
}

// 互助点击
const handleHelpClick = (help) => {
  elderlyStore.vibrate('short')
  uni.showModal({
    title: help.title,
    content: `${help.description}\n地点: ${help.location}\n发布时间: ${help.publishTime}\n${help.reward ? '酬谢: ' + help.reward : ''}`,
    confirmText: '响应',
    success: (res) => {
      if (res.confirm) {
        elderlyStore.vibrate('long')
        uni.showToast({
          title: '已响应',
          icon: 'success'
        })
      }
    }
  })
}

// 发布求助
const handlePublishHelp = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: '/pages/life/neighborhood/publish'
  })
}

// 集采点击
const handleSupplyClick = (supply) => {
  elderlyStore.vibrate('short')
  uni.showModal({
    title: supply.name,
    content: `目标数量: ${supply.targetCount}\n当前数量: ${supply.currentCount}\n原价: ¥${supply.originalPrice}\n集采价: ¥${supply.groupPrice}\n截止时间: ${supply.deadline}`,
    showCancel: false
  })
}

// 参与集采
const handleJoinSupply = (supply) => {
  elderlyStore.vibrate('short')
  uni.showModal({
    title: '参与集采',
    content: `确定要参与${supply.name}的集采吗？`,
    success: (res) => {
      if (res.confirm) {
        elderlyStore.vibrate('long')
        supply.currentCount += 1
        uni.showToast({
          title: '参与成功',
          icon: 'success'
        })

        // 语音播报
        if (elderlyStore.isElderlyMode) {
          elderlyStore.speak('参与成功')
        }
      }
    }
  })
}

// 查看更多
const handleMore = (type) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/life/${type}/list`
  })
}

// 页面加载
onMounted(() => {
  console.log('生活服务页面加载')
})
</script>

<style lang="scss" scoped>
.life-page {
  min-height: 100vh;
  background-color: var(--color-bg-page, #F7FAFC);
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #F6E05E 0%, #ECC94B 100%);
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
    color: #1A202C;
  }

  .navbar-icon {
    position: relative;
    font-size: 48rpx;

    .badge {
      position: absolute;
      top: -4rpx;
      right: -4rpx;
      min-width: 32rpx;
      height: 32rpx;
      padding: 0 8rpx;
      background-color: #F56565;
      border-radius: 16rpx;
      font-size: 20rpx;
      color: #FFFFFF;
      text-align: center;
      line-height: 32rpx;
    }
  }
}

.page-content {
  height: 100vh;
  padding-top: calc(88rpx + env(safe-area-inset-top, 0));
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom, 0));
}

.banner-swiper {
  height: 360rpx;
}

.banner-item {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 32rpx;
}

.banner-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.banner-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #1A202C;
}

.banner-desc {
  font-size: 32rpx;
  color: rgba(26, 32, 44, 0.8);
}

.service-categories {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 32rpx;
  background-color: #FFFFFF;
  margin-bottom: 16rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  transition: all 0.3s ease;

  &--active {
    background-color: rgba(246, 224, 94, 0.2);
  }
}

.category-icon {
  font-size: 56rpx;
}

.category-name {
  font-size: 28rpx;
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
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  color: #FFFFFF;
  border-radius: 24rpx;
  font-size: 28rpx;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.product-item {
  padding: 16rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  &:active {
    transform: scale(0.98);
  }
}

.product-image {
  width: 100%;
  height: 280rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-card, #F7FAFC);
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  font-size: 120rpx;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-primary, #1A202C);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-origin {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.product-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  font-size: 32rpx;
  font-weight: 700;
  color: #F56565;
}

.product-sales {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.carpool-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.carpool-item {
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.carpool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.route-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.origin,
.destination {
  color: var(--color-text-primary, #1A202C);
}

.arrow {
  color: var(--color-text-tertiary, #718096);
}

.status-badge {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;

  &.status-available {
    background-color: rgba(72, 187, 120, 0.1);
    color: #48BB78;
  }

  &.status-full {
    background-color: rgba(74, 85, 104, 0.1);
    color: #4A5568;
  }
}

.carpool-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.info-item {
  font-size: 24rpx;
  color: var(--color-text-secondary, #4A5568);
}

.carpool-user {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid var(--color-border-primary, #E2E8F0);
}

.user-icon {
  font-size: 32rpx;
}

.user-name {
  font-size: 28rpx;
  color: var(--color-text-primary, #1A202C);
}

.publish-time {
  margin-left: auto;
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.help-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.help-item {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.help-icon {
  font-size: 64rpx;
  flex-shrink: 0;
}

.help-content {
  flex: 1;
  min-width: 0;
}

.help-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary, #1A202C);
  margin-bottom: 8rpx;
}

.help-desc {
  font-size: 28rpx;
  color: var(--color-text-secondary, #4A5568);
  line-height: 1.6;
  margin-bottom: 12rpx;
}

.help-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16rpx;
}

.help-reward {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  background-color: rgba(246, 224, 94, 0.2);
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #D69E2E;
}

.help-status {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.status-text {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.response-count {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-primary, #2F855A);
}

.supply-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.supply-item {
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.supply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.supply-name {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--color-text-primary, #1A202C);
}

.supply-tag {
  padding: 8rpx 16rpx;
  background-color: rgba(72, 187, 120, 0.1);
  color: #48BB78;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.supply-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.price-highlight {
  color: #F56565 !important;
  font-weight: 700 !important;
}

.supply-progress {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
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
  background: linear-gradient(90deg, #48BB78 0%, #38A169 100%);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 24rpx;
  color: var(--color-text-secondary, #4A5568);
  min-width: 80rpx;
  text-align: right;
}

.supply-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--color-border-primary, #E2E8F0);
}

.deadline {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.join-btn {
  padding: 12rpx 24rpx;
  background-color: var(--color-primary, #2F855A);
  color: #FFFFFF;
  border-radius: 8rpx;
  font-size: 28rpx;
}

// 适老化模式
:global(.elderly-mode-large) {
  .banner-title {
    font-size: 56rpx;
  }

  .product-name {
    font-size: 32rpx;
  }

  .help-title {
    font-size: 36rpx;
  }
}

:global(.elderly-mode-xl) {
  .banner-title {
    font-size: 64rpx;
  }

  .product-name {
    font-size: 40rpx;
  }

  .help-title {
    font-size: 44rpx;
  }

  .help-desc {
    font-size: 36rpx;
  }
}
</style>
