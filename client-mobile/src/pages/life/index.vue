<template>
  <div class="life-page">
    <!-- 自定义导航栏 -->
    <div class="custom-navbar">
      <div class="navbar-content">
        <div class="navbar-title">生活服务</div>
        <div class="navbar-icon" @click="handleNotification">
          <span class="icon">🔔</span>
          <div v-if="unreadCount > 0" class="badge">{{ unreadCount }}</div>
        </div>
      </div>
    </div>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 服务分类 -->
      <div class="service-categories">
        <div
          v-for="category in categories"
          :key="category.id"
          :class="['category-item', { 'category-item--active': currentCategory === category.id }]"
          @click="handleCategoryChange(category.id)"
        >
          <span class="category-icon">{{ category.icon }}</span>
          <span class="category-name">{{ category.name }}</span>
        </div>
      </div>

      <!-- 乡村电商 -->
      <div v-show="currentCategory === 'ecommerce'" class="section">
        <div class="section-header">
          <span class="section-title">🛒 乡村电商</span>
          <span class="section-more" @click="handleMore('ecommerce')">更多 ></span>
        </div>
        <div class="product-grid">
          <div
            v-for="product in products"
            :key="product.id"
            class="product-item"
            @click="handleProductClick(product)"
          >
            <div class="product-image">{{ product.image }}</div>
            <div class="product-info">
              <div class="product-name">{{ product.name }}</div>
              <div class="product-origin">{{ product.origin }}</div>
              <div class="product-price-row">
                <span class="product-price">¥{{ product.price }}</span>
                <span class="product-sales">{{ product.sales }}已售</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 邻里拼车 -->
      <div v-show="currentCategory === 'carpooling'" class="section">
        <div class="section-header">
          <span class="section-title">🚗 邻里拼车</span>
          <div class="publish-btn" @click="handlePublishCarpool">
            <span>+ 我要拼车</span>
          </div>
        </div>
        <div class="carpool-list">
          <div
            v-for="carpool in carpools"
            :key="carpool.id"
            class="carpool-item"
            @click="handleCarpoolClick(carpool)"
          >
            <div class="carpool-header">
              <div class="route-info">
                <span class="origin">{{ carpool.origin }}</span>
                <span class="arrow">→</span>
                <span class="destination">{{ carpool.destination }}</span>
              </div>
              <div :class="['status-badge', `status-${carpool.status}`]">
                {{ carpool.statusText }}
              </div>
            </div>
            <div class="carpool-info">
              <span class="info-item">📅 {{ carpool.date }}</span>
              <span class="info-item">🕐 {{ carpool.time }}</span>
              <span class="info-item">👥 {{ carpool.seats }}座</span>
              <span class="info-item">💰 ¥{{ carpool.price }}/人</span>
            </div>
            <div class="carpool-user">
              <span class="user-icon">👤</span>
              <span class="user-name">{{ carpool.userName }}</span>
              <span class="publish-time">{{ carpool.publishTime }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 邻里互助 -->
      <div v-show="currentCategory === 'help'" class="section">
        <div class="section-header">
          <span class="section-title">🤝 邻里互助</span>
          <div class="publish-btn" @click="handlePublishHelp">
            <span>+ 我要求助</span>
          </div>
        </div>
        <div class="help-list">
          <div
            v-for="help in helpList"
            :key="help.id"
            class="help-item"
            @click="handleHelpClick(help)"
          >
            <div class="help-icon">{{ help.icon }}</div>
            <div class="help-content">
              <div class="help-title">{{ help.title }}</div>
              <div class="help-desc">{{ help.description }}</div>
              <div class="help-meta">
                <span class="meta-item">📍 {{ help.location }}</span>
                <span class="meta-item">⏰ {{ help.publishTime }}</span>
                <div class="help-reward" v-if="help.reward">
                  <span class="reward-icon">💝</span>
                  <span>{{ help.reward }}</span>
                </div>
              </div>
            </div>
            <div class="help-status">
              <span class="status-text">{{ help.statusText }}</span>
              <span class="response-count">{{ help.responseCount }}人响应</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 农资集采 -->
      <div v-show="currentCategory === 'supply'" class="section">
        <div class="section-header">
          <span class="section-title">🌾 农资集采</span>
          <span class="section-more" @click="handleMore('supply')">更多 ></span>
        </div>
        <div class="supply-list">
          <div
            v-for="supply in supplies"
            :key="supply.id"
            class="supply-item"
            @click="handleSupplyClick(supply)"
          >
            <div class="supply-header">
              <div class="supply-name">{{ supply.name }}</div>
              <div class="supply-tag">集采中</div>
            </div>
            <div class="supply-info">
              <span class="info-item">📦 数量: {{ supply.currentCount }}/{{ supply.targetCount }}</span>
              <span class="info-item">💰 原价: ¥{{ supply.originalPrice }}</span>
              <span class="info-item price-highlight">🎉 集采价: ¥{{ supply.groupPrice }}</span>
            </div>
            <div class="supply-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: (supply.currentCount / supply.targetCount * 100) + '%' }"
                />
              </div>
              <span class="progress-text">{{ supply.currentCount }}/{{ supply.targetCount }}</span>
            </div>
            <div class="supply-footer">
              <span class="deadline">⏰ 截止: {{ supply.deadline }}</span>
              <div class="join-btn" @click.stop="handleJoinSupply(supply)">
                <span>参与集采</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </scroll-view>

    <!-- 底部导航 -->
    <TabBar :current="2" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useElderlyStore } from '@/store/elderly'
import TabBar from '@/components/common/TabBar.vue'

/**
 * 生活服务首页
 */

const router = useRouter()
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
    deadline: '2024-12-31'
  },
  {
    id: 2,
    name: '玉米种子10kg',
    currentCount: 35,
    targetCount: 100,
    originalPrice: 280,
    groupPrice: 220,
    deadline: '2025-01-15'
  }
])

// 通知点击
const handleNotification = () => {
  elderlyStore.vibrate('short')
  router.push('/profile/notification')
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
  console.log('点击商品:', product.name)
}

// 拼车点击
const handleCarpoolClick = (carpool) => {
  elderlyStore.vibrate('short')
  alert(`拼车详情\n从${carpool.origin}到${carpool.destination}\n时间: ${carpool.date} ${carpool.time}\n座位: ${carpool.seats}座\n价格: ¥${carpool.price}/人`)
}

// 发布拼车
const handlePublishCarpool = () => {
  elderlyStore.vibrate('short')
  console.log('发布拼车')
}

// 互助点击
const handleHelpClick = (help) => {
  elderlyStore.vibrate('short')
  console.log('点击互助:', help.title)
}

// 发布求助
const handlePublishHelp = () => {
  elderlyStore.vibrate('short')
  console.log('发布求助')
}

// 集采点击
const handleSupplyClick = (supply) => {
  elderlyStore.vibrate('short')
  console.log('点击集采:', supply.name)
}

// 参与集采
const handleJoinSupply = (supply) => {
  elderlyStore.vibrate('short')
  if (confirm(`确定要参与${supply.name}的集采吗？`)) {
    elderlyStore.vibrate('long')
    supply.currentCount += 1
    alert('参与成功')
  }
}

// 查看更多
const handleMore = (type) => {
  elderlyStore.vibrate('short')
  console.log('查看更多:', type)
}

// 页面加载
onMounted(() => {
  console.log('生活服务页面加载')
})
</script>

<style lang="scss" scoped>
.life-page {
  min-height: 100vh;
  background-color: #F7FAFC;
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
    height: 44px;
    padding: 0 16px;
  }

  .navbar-title {
    font-size: 18px;
    font-weight: 700;
    color: #1A202C;
  }

  .navbar-icon {
    position: relative;
    font-size: 24px;

    .badge {
      position: absolute;
      top: -2px;
      right: -2px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background-color: #F56565;
      border-radius: 8px;
      font-size: 10px;
      color: #FFFFFF;
      text-align: center;
      line-height: 16px;
    }
  }
}

.page-content {
  height: 100vh;
  padding-top: calc(44px + env(safe-area-inset-top, 0));
  padding-bottom: calc(50px + env(safe-area-inset-bottom, 0));
}

.service-categories {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16px;
  background-color: #FFFFFF;
  margin-bottom: 8px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;

  &--active {
    background-color: rgba(246, 224, 94, 0.2);
  }
}

.category-icon {
  font-size: 28px;
}

.category-name {
  font-size: 14px;
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
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  color: #FFFFFF;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.product-item {
  padding: 8px;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  cursor: pointer;

  &:active {
    transform: scale(0.98);
  }
}

.product-image {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F7FAFC;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 60px;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A202C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-origin {
  font-size: 12px;
  color: #718096;
}

.product-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  font-size: 16px;
  font-weight: 700;
  color: #F56565;
}

.product-sales {
  font-size: 12px;
  color: #718096;
}

.carpool-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.carpool-item {
  padding: 12px;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.carpool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.route-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
}

.origin,
.destination {
  color: #1A202C;
}

.arrow {
  color: #718096;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;

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
  gap: 8px;
  margin-bottom: 6px;
}

.info-item {
  font-size: 12px;
  color: #4A5568;
}

.carpool-user {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 6px;
  border-top: 1px solid #E2E8F0;
}

.user-icon {
  font-size: 16px;
}

.user-name {
  font-size: 14px;
  color: #1A202C;
}

.publish-time {
  margin-left: auto;
  font-size: 12px;
  color: #718096;
}

.help-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.help-item {
  display: flex;
  gap: 8px;
  padding: 12px;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.help-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.help-content {
  flex: 1;
  min-width: 0;
}

.help-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A202C;
  margin-bottom: 4px;
}

.help-desc {
  font-size: 14px;
  color: #4A5568;
  line-height: 1.6;
  margin-bottom: 6px;
}

.help-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.help-reward {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background-color: rgba(246, 224, 94, 0.2);
  border-radius: 6px;
  font-size: 12px;
  color: #D69E2E;
}

.help-status {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.status-text {
  font-size: 12px;
  color: #718096;
}

.response-count {
  font-size: 14px;
  font-weight: 600;
  color: #2F855A;
}

.supply-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.supply-item {
  padding: 12px;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.supply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.supply-name {
  font-size: 16px;
  font-weight: 700;
  color: #1A202C;
}

.supply-tag {
  padding: 4px 8px;
  background-color: rgba(72, 187, 120, 0.1);
  color: #48BB78;
  border-radius: 4px;
  font-size: 12px;
}

.supply-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.price-highlight {
  color: #F56565 !important;
  font-weight: 700 !important;
}

.supply-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: #F1F5F9;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #48BB78 0%, #38A169 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #4A5568;
  min-width: 40px;
  text-align: right;
}

.supply-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #E2E8F0;
}

.deadline {
  font-size: 12px;
  color: #718096;
}

.join-btn {
  padding: 6px 12px;
  background-color: #2F855A;
  color: #FFFFFF;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

// 适老化模式
[data-elderly-mode="large"] {
  .product-name {
    font-size: 16px;
  }

  .help-title {
    font-size: 18px;
  }
}

[data-elderly-mode="xl"] {
  .product-name {
    font-size: 20px;
  }

  .help-title {
    font-size: 22px;
  }

  .help-desc {
    font-size: 18px;
  }
}
</style>
